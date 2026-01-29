/**
 * js/core/api.js
 * LLM API 核心模块 (Smart Fix Edition)
 * 增强了 URL 容错能力和错误调试信息
 */

const API = {
    config: {
        baseUrl: '',
        apiKey: '',
        model: 'gpt-3.5-turbo'
    },

    /**
     * 初始化配置 (每次请求前都会调用，确保拿到最新 Store 数据)
     * @param {boolean} useSub - 是否使用从属/子模型配置 (针对后台任务)
     */
    init(useSub = false) {
        const s = window.sysStore;
        if (!s) return;

        const prefix = useSub ? 'sub_' : 'main_';

        // 优先读取指定前缀的配置
        let savedKey = s.get(`${prefix}api_key`);
        let savedUrl = s.get(`${prefix}api_url`);
        let savedModel = s.get(`${prefix}model`);

        // 如果没找到指定前缀的，回退到 legacy 或 main
        if (!useSub) {
            if (!savedKey) savedKey = s.get('api_key');
            if (!savedUrl) savedUrl = s.get('api_url');
            if (!savedModel) savedModel = s.get('api_model');
        } else {
            if (!savedKey) savedKey = s.get('main_api_key') || s.get('api_key');
            if (!savedUrl) savedUrl = s.get('main_api_url') || s.get('api_url');
            if (!savedModel) savedModel = s.get('main_model') || s.get('api_model');
        }

        if (savedKey) this.config.apiKey = String(savedKey).trim();
        if (savedUrl) this.config.baseUrl = String(savedUrl).trim();
        if (savedModel) this.config.model = String(savedModel).trim();
    },

    /**
     * 智能构造 Endpoint (核心修复)
     * 无论用户填什么格式，都试图修正为标准的 /v1/chat/completions
     */
    _getEndpoint() {
        let url = this.config.baseUrl;
        if (!url) return '';

        // 1. 如果用户直接填了完整的 chat 接口地址，直接用
        if (url.endsWith('/chat/completions')) {
            return url;
        }

        // 2. 移除末尾斜杠
        url = url.replace(/\/+$/, '');

        // 3. 如果用户填了 /v1 结尾，追加 /chat/completions
        if (url.endsWith('/v1')) {
            return `${url}/chat/completions`;
        }

        // 4. 如果没填 /v1，默认补上 /v1/chat/completions
        // (适用于 OpenAI, DeepSeek, Moonshot 等标准接口)
        return `${url}/v1/chat/completions`;
    },

    /**
     * 发送聊天请求 (带重试和超时逻辑，优化手机端稳定性)
     */
    async chat(messages, options = {}) {
        const {
            retries = 2,
            timeout = 180000, // 增加到 180 秒，人设补全任务需要较长时间才能完整输出
            silent = false,
            useSub = false
        } = options;

        this.init(useSub); // 确保配置最新

        if (!this.config.apiKey) {
            throw new Error('API Key 未配置，请在设置中填写');
        }

        const url = this._getEndpoint();
        const currentTry = options._currentTry || 0;

        if (!silent) console.log(`[API] Requesting (${currentTry + 1}/${retries + 1}):`, url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    stream: false
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 错误处理升级: 尝试读取服务器返回的具体错误信息
            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorJson = await response.json();
                    errorDetails = errorJson.error?.message || JSON.stringify(errorJson);
                } catch (e) {
                    errorDetails = response.statusText;
                }

                // 如果是 5xx 错误或特定的限流错误，且还有重试次数，则重试
                if ((response.status >= 500 || response.status === 429) && currentTry < retries) {
                    console.warn(`[API] Server busy (${response.status}), retrying...`);
                    return this.chat(messages, { ...options, _currentTry: currentTry + 1 });
                }

                throw new Error(`API错误 (${response.status}): ${errorDetails}`);
            }

            // [FIX] 安全解析 JSON，处理可能的解析错误
            let data;
            let responseText = '';
            try {
                responseText = await response.text();
                if (!responseText || responseText.trim() === '') {
                    throw new Error('API 返回空响应');
                }
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[API] JSON 解析失败:', parseError);
                // 使用已读取的响应文本
                const preview = responseText ? responseText.substring(0, 200) : '无法读取响应内容';
                throw new Error(`API 响应解析失败: ${parseError.message}。原始响应: ${preview}`);
            }

            // [FIX] 增强错误处理：记录实际响应内容以便调试
            if (!data.choices || data.choices.length === 0) {
                // 记录实际响应内容（限制长度避免日志过长）
                const responsePreview = JSON.stringify(data).substring(0, 500);
                console.error('[API] 响应格式异常，实际响应内容:', responsePreview);
                
                // 检查是否是错误响应但状态码是 200
                if (data.error) {
                    const errorMsg = data.error.message || data.error.code || JSON.stringify(data.error);
                    throw new Error(`API 返回错误: ${errorMsg}`);
                }
                
                // 检查是否有其他格式的响应（某些 API 可能使用不同的字段名）
                if (data.content) {
                    // 某些 API 可能直接返回 content 而不是 choices
                    console.warn('[API] 检测到非标准响应格式，尝试使用 content 字段');
                    return String(data.content || '');
                }
                
                if (data.text) {
                    // 某些 API 可能使用 text 字段
                    console.warn('[API] 检测到非标准响应格式，尝试使用 text 字段');
                    return String(data.text || '');
                }
                
                // 如果都没有，抛出详细错误
                throw new Error(`API 返回格式异常: 没有 choices。响应预览: ${responsePreview}`);
            }

            return data.choices[0].message.content || '';

        } catch (error) {
            clearTimeout(timeoutId);

            const isTimeout = error.name === 'AbortError';
            const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';

            // 针对网络波动导致的“Failed to fetch”或超时进行重试
            if ((isNetworkError || isTimeout) && currentTry < retries) {
                const reason = isTimeout ? 'Timeout' : 'Network Error';
                console.warn(`[API] ${reason}, retrying ${currentTry + 1}/${retries}...`);
                // 延迟一秒重试，增加成功率
                await new Promise(r => setTimeout(r, 1000));
                return this.chat(messages, { ...options, _currentTry: currentTry + 1 });
            }

            console.error('[API Error]', error);
            throw error;
        }
    }
};

// 挂载
if (typeof window !== 'undefined') {
    window.API = API;
    // 兼容旧代码引用 Core.Api 的情况
    window.Core = window.Core || {};
    window.Core.Api = API;
}
