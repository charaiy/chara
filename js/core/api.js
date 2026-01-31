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
            // 使用原始模型名称（某些反代服务需要特定的模型名称格式，包括特殊字符）
            // 不再自动清理模型名称，因为反代服务可能需要完整的模型名称
            const cleanModel = this.config.model;
            
            // 记录请求信息用于调试（特别是反代服务）
            if (!silent) {
                console.log(`[API] Model: ${cleanModel}, URL: ${url}`);
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: cleanModel,
                    messages: messages,
                    stream: false
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 错误处理升级: 尝试读取服务器返回的具体错误信息
            if (!response.ok) {
                let errorDetails = '';
                let errorJson = null;
                try {
                    const responseText = await response.clone().text();
                    console.error('[API] Error response body:', responseText);
                    try {
                        errorJson = JSON.parse(responseText);
                        // 改进错误信息提取：正确处理嵌套的错误对象
                        if (errorJson.error) {
                            if (typeof errorJson.error === 'string') {
                                errorDetails = errorJson.error;
                            } else if (errorJson.error.message) {
                                errorDetails = errorJson.error.message;
                            } else if (errorJson.error.code) {
                                errorDetails = `${errorJson.error.code}: ${errorJson.error.message || JSON.stringify(errorJson.error)}`;
                            } else {
                                errorDetails = JSON.stringify(errorJson.error);
                            }
                        } else if (errorJson.message) {
                            errorDetails = errorJson.message;
                        } else {
                            errorDetails = JSON.stringify(errorJson);
                        }
                    } catch (parseErr) {
                        // 如果不是 JSON，直接使用文本
                        errorDetails = responseText || response.statusText;
                    }
                } catch (e) {
                    errorDetails = response.statusText || '未知错误';
                }

                // 记录详细的错误信息用于调试
                console.error('[API] API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                    model: this.config.model,
                    errorDetails: errorDetails,
                    errorJson: errorJson
                });

                // 如果是 5xx 错误或特定的限流错误，且还有重试次数，则重试
                if ((response.status >= 500 || response.status === 429) && currentTry < retries) {
                    console.warn(`[API] Server busy (${response.status}), retrying...`);
                    return this.chat(messages, { ...options, _currentTry: currentTry + 1 });
                }

                // 构造更友好的错误信息
                let errorMsg = `API错误 (${response.status})`;
                if (errorDetails && errorDetails !== response.statusText && errorDetails !== 'openai_error') {
                    errorMsg += `: ${errorDetails}`;
                } else if (errorDetails === 'openai_error' && errorJson && errorJson.error) {
                    // 如果错误信息是 "openai_error"，尝试从 errorJson.error 对象中提取详细信息
                    const errorObj = errorJson.error;
                    if (typeof errorObj === 'object' && errorObj !== null) {
                        // 优先使用 code 或 type，因为它们通常比 message 更有用
                        const detailedMsg = errorObj.code || errorObj.type || errorObj.message || JSON.stringify(errorObj);
                        if (detailedMsg && detailedMsg !== 'openai_error') {
                            errorMsg += `: ${detailedMsg}`;
                            // 如果有 message 且不是 openai_error，也加上
                            if (errorObj.message && errorObj.message !== 'openai_error' && errorObj.message !== detailedMsg) {
                                errorMsg += ` (${errorObj.message})`;
                            }
                        } else {
                            errorMsg += `: ${errorDetails} (代理服务返回错误，请检查 API 配置)`;
                        }
                    } else {
                        errorMsg += `: ${errorDetails} (请检查 API 配置和网络连接)`;
                    }
                } else if (response.statusText) {
                    errorMsg += `: ${response.statusText}`;
                } else {
                    errorMsg += ': 服务器内部错误';
                }
                
                // 如果是 Gemini 模型，添加特殊提示
                if (this.config.model && this.config.model.toLowerCase().includes('gemini')) {
                    console.warn('[API] Gemini API 错误，请确认：');
                    console.warn('  1. API URL 是否正确（应该是完整的端点 URL）');
                    console.warn('  2. API Key 格式是否正确');
                    console.warn('  3. 是否使用了兼容 OpenAI 格式的代理服务');
                }
                
                throw new Error(errorMsg);
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
                
                // 检查 token 使用情况，判断是否因为提示词过长导致问题
                const usage = data.usage || {};
                const promptTokens = usage.prompt_tokens || usage.input_tokens || 0;
                const completionTokens = usage.completion_tokens || usage.output_tokens || 0;
                
                // 如果 prompt_tokens 很大但 completion_tokens 为 0，可能是提示词过长或内容过滤
                if (promptTokens > 8000 && completionTokens === 0) {
                    console.warn(`[API] 警告: 提示词过长 (${promptTokens} tokens)，可能导致模型无法生成响应`);
                    console.warn('[API] 建议: 1) 减少历史消息数量 2) 简化系统提示词 3) 检查内容是否触发安全过滤');
                    
                    // [Fix] 对于 gemini 模型，可能需要特殊处理
                    if (this.config.model && this.config.model.includes('gemini')) {
                        console.warn('[API] Gemini 模型可能对长提示词有更严格的限制，建议将提示词控制在 10000 tokens 以内');
                    }
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
                
                // 如果都没有，抛出详细错误，包含 token 使用信息
                let errorDetail = `API 返回格式异常: 没有 choices。`;
                if (promptTokens > 0) {
                    errorDetail += ` 提示词 tokens: ${promptTokens}，生成 tokens: ${completionTokens}。`;
                }
                
                // [Fix] 检查是否是因为提示词太长导致的问题
                if (promptTokens > 15000) {
                    errorDetail += ` 提示词过长（${promptTokens} tokens），可能超过了模型的上下文限制。建议减少历史消息数量或使用更短的提示词。`;
                }
                
                // [Fix] 检查响应中是否有错误信息
                if (data.error) {
                    errorDetail += ` API错误信息: ${JSON.stringify(data.error)}`;
                }
                
                errorDetail += ` 响应预览: ${responsePreview}`;
                
                throw new Error(errorDetail);
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
