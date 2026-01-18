/**
 * js/api.js
 * LLM API 封装模块
 * 用于处理与 AI 服务的通信
 */

const API = {
    // 默认配置
    config: {
        baseUrl: '',
        apiKey: '',
        model: 'gpt-3.5-turbo'
    },

    /**
     * 初始化 API 配置
     * @param {Object} options 
     */
    init(options = {}) {
        this.config = { ...this.config, ...options };

        // 从存储加载 (Prioritize 'main_' keys used by Settings App)
        const s = window.sysStore;
        if (!s) return;

        // 加载并去除首尾空格
        let savedKey = s.get('main_api_key') || s.get('api_key');
        let savedUrl = s.get('main_api_url') || s.get('api_url');
        const savedModel = s.get('main_model') || s.get('api_model');

        if (savedKey) this.config.apiKey = String(savedKey).trim();
        if (savedUrl) this.config.baseUrl = String(savedUrl).trim().replace(/\/+$/, ''); // 去除末尾斜杠
        if (savedModel) this.config.model = String(savedModel).trim();
    },

    /**
     * 构造完整的 API Endpoint URL (核心修复)
     */
    _getEndpoint() {
        let url = this.config.baseUrl;
        // 如果 URL 已经包含 /v1 (用户手误输入)，尝试智能处理
        // 但最安全的做法是：如果包含 /chat/completions 直接用，否则...
        if (url.endsWith('/chat/completions')) {
            return url;
        }

        // 标准化: 移除末尾的 /v1 (因为我们下面会加) 
        // 或者是如果用户输入了 v1 结尾，我们就不重复加了... 
        // 策略: 总是移除末尾的 /, 如果没 v1 且不是 azure，加上 /v1

        // 简单策略: 检测 endWith /v1
        if (url.endsWith('/v1')) {
            return `${url}/chat/completions`;
        }

        return `${url}/v1/chat/completions`;
    },

    /**
     * 设置 API Key
     * @param {string} key 
     */
    setApiKey(key) {
        this.config.apiKey = String(key).trim();
        window.sysStore?.set('main_api_key', this.config.apiKey);
    },

    /**
     * 设置 Base URL
     * @param {string} url 
     */
    setBaseUrl(url) {
        this.config.baseUrl = String(url).trim().replace(/\/+$/, '');
        window.sysStore?.set('main_api_url', this.config.baseUrl);
    },

    /**
     * 发送聊天请求 (非流式)
     * @param {Array} messages 
     * @returns {Promise<string>}
     */
    async chat(messages) {
        // Ensure we have the latest config
        this.init();

        if (!this.config.apiKey) {
            throw new Error('API Key 未配置');
        }

        const url = this._getEndpoint();

        console.log('[API] Chat Req:', url); // Debug Log

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
            })
        });

        if (!response.ok) {
            // Include status text for better debugging
            throw new Error(`API 请求失败: ${response.status} (${response.statusText})`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    },

    /**
     * 发送流式聊天请求
     * @param {Array} messages 
     * @param {Function} onChunk - 每接收一个 chunk 调用
     * @returns {Promise<string>} - 完整响应
     */
    async chatStream(messages, onChunk) {
        // Ensure we have the latest config
        this.init();

        if (!this.config.apiKey) {
            throw new Error('API Key 未配置');
        }

        const url = this._getEndpoint();
        console.log('[API] Stream Req:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

            for (const line of lines) {
                const jsonStr = line.slice(5).trim();
                if (jsonStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices[0]?.delta?.content || '';
                    if (content) {
                        fullContent += content;
                        if (onChunk) onChunk(content);
                    }
                } catch (e) {
                    // 解析错误忽略
                }
            }
        }

        return fullContent;
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    window.API = API;
    // 延迟初始化等待 store 加载
    setTimeout(() => API.init(), 100);
}
