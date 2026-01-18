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
     */
    init() {
        const s = window.sysStore;
        if (!s) return;

        // 优先读取 main_ 前缀的配置 (Settings App 新标准)
        // 如果没有，才读取旧的 api_ 前缀
        const savedKey = s.get('main_api_key') || s.get('api_key');
        const savedUrl = s.get('main_api_url') || s.get('api_url');
        const savedModel = s.get('main_model') || s.get('api_model');

        if (savedKey) this.config.apiKey = String(savedKey).trim();
        if (savedUrl) this.config.baseUrl = String(savedUrl).trim(); // 暂时不去尾，交给 _getEndpoint 处理
        if (savedModel) this.config.model = String(savedModel).trim();

        // Debug: 可以在控制台看到当前用的到底是哪套配置
        // console.log('[API Init] Using:', { 
        //    url: this.config.baseUrl, 
        //    model: this.config.model, 
        //    keyMask: this.config.apiKey ? this.config.apiKey.slice(0, 4) + '***' : 'NONE' 
        // });
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
     * 发送聊天请求
     */
    async chat(messages) {
        this.init(); // 确保配置最新

        if (!this.config.apiKey) {
            throw new Error('API Key 未配置，请在设置中填写');
        }

        const url = this._getEndpoint();
        console.log('[API] Requesting:', url);

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
                    stream: false // 暂时关闭流式，先跑通逻辑
                })
            });

            // 错误处理升级: 尝试读取服务器返回的具体错误信息
            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errorJson = await response.json();
                    errorDetails = errorJson.error?.message || JSON.stringify(errorJson);
                } catch (e) {
                    errorDetails = response.statusText;
                }

                // 抛出详细错误，让 ChatService 显示给用户
                throw new Error(`API错误 (${response.status}): ${errorDetails}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('API 返回格式异常: 没有 choices');
            }

            return data.choices[0].message.content || '';

        } catch (error) {
            console.error('[API Error]', error);
            throw error; // 继续抛出，让上层处理
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
