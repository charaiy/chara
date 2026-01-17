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

        // 从存储加载
        const savedKey = window.sysStore?.get('api_key');
        const savedUrl = window.sysStore?.get('api_url');
        const savedModel = window.sysStore?.get('api_model');

        if (savedKey) this.config.apiKey = savedKey;
        if (savedUrl) this.config.baseUrl = savedUrl;
        if (savedModel) this.config.model = savedModel;
    },

    /**
     * 设置 API Key
     * @param {string} key 
     */
    setApiKey(key) {
        this.config.apiKey = key;
        window.sysStore?.set('api_key', key);
    },

    /**
     * 设置 Base URL
     * @param {string} url 
     */
    setBaseUrl(url) {
        this.config.baseUrl = url;
        window.sysStore?.set('api_url', url);
    },

    /**
     * 发送聊天请求 (非流式)
     * @param {Array} messages 
     * @returns {Promise<string>}
     */
    async chat(messages) {
        if (!this.config.apiKey) {
            throw new Error('API Key 未配置');
        }

        const url = `${this.config.baseUrl}/v1/chat/completions`;

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
            throw new Error(`API 请求失败: ${response.status}`);
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
        if (!this.config.apiKey) {
            throw new Error('API Key 未配置');
        }

        const url = `${this.config.baseUrl}/v1/chat/completions`;

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
