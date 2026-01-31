/**
 * js/utils/error_handler.js
 * 统一错误处理服务
 * 
 * 职责：
 * - 统一错误日志记录
 * - 统一用户提示
 * - 错误分类和严重程度管理
 * - 错误上下文收集
 * - 错误恢复建议
 * 
 * 错误级别：
 * - fatal: 致命错误，导致功能完全无法使用
 * - error: 一般错误，功能受影响但可继续使用
 * - warning: 警告，功能可能受影响
 * - info: 信息提示，不影响功能
 */

window.ErrorHandler = window.ErrorHandler || {};

window.ErrorHandler = {
    /**
     * 错误级别枚举
     */
    Level: {
        FATAL: 'fatal',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    /**
     * 错误类型枚举
     */
    Type: {
        NETWORK: 'network',
        API: 'api',
        PARSE: 'parse',
        VALIDATION: 'validation',
        PERMISSION: 'permission',
        STORAGE: 'storage',
        UNKNOWN: 'unknown'
    },

    /**
     * 错误上下文
     */
    _context: {
        sessionId: null,
        userId: null,
        action: null,
        timestamp: null
    },

    /**
     * 设置错误上下文
     * @param {Object} context - 上下文信息
     */
    setContext(context) {
        this._context = {
            ...this._context,
            ...context,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * 清除错误上下文
     */
    clearContext() {
        this._context = {
            sessionId: null,
            userId: null,
            action: null,
            timestamp: null
        };
    },

    /**
     * 统一错误处理
     * @param {Error|string} error - 错误对象或错误消息
     * @param {Object} options - 处理选项
     * @param {string} options.level - 错误级别 (fatal|error|warning|info)
     * @param {string} options.type - 错误类型 (network|api|parse|validation|permission|storage|unknown)
     * @param {string} options.message - 用户友好的错误消息
     * @param {boolean} options.showToast - 是否显示Toast提示
     * @param {boolean} options.logToConsole - 是否记录到控制台
     * @param {Function} options.onError - 错误回调函数
     * @param {Object} options.metadata - 额外的元数据
     */
    handle(error, options = {}) {
        const {
            level = this.Level.ERROR,
            type = this.Type.UNKNOWN,
            message = null,
            showToast = true,
            logToConsole = true,
            onError = null,
            metadata = {}
        } = options;

        // 提取错误信息
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : null;
        const userMessage = message || this._getUserFriendlyMessage(errorMessage, type);

        // 构建错误对象
        const errorInfo = {
            level,
            type,
            message: errorMessage,
            userMessage,
            stack: errorStack,
            context: { ...this._context },
            metadata,
            timestamp: new Date().toISOString()
        };

        // 记录到控制台
        if (logToConsole) {
            this._logToConsole(errorInfo);
        }

        // 显示Toast提示
        if (showToast && userMessage) {
            this._showToast(userMessage, level);
        }

        // 执行错误回调
        if (onError && typeof onError === 'function') {
            try {
                onError(errorInfo);
            } catch (e) {
                console.error('[ErrorHandler] Error callback failed:', e);
            }
        }

        // 致命错误可能需要特殊处理
        if (level === this.Level.FATAL) {
            this._handleFatalError(errorInfo);
        }

        return errorInfo;
    },

    /**
     * 处理致命错误
     * @param {Object} errorInfo - 错误信息
     */
    _handleFatalError(errorInfo) {
        // 可以在这里添加致命错误的特殊处理
        // 例如：上报错误、保存错误日志、显示错误页面等
        console.error('[ErrorHandler] Fatal error occurred:', errorInfo);
    },

    /**
     * 记录到控制台
     * @param {Object} errorInfo - 错误信息
     */
    _logToConsole(errorInfo) {
        const { level, type, message, context, stack } = errorInfo;
        const prefix = `[${type.toUpperCase()}]`;
        const contextStr = context.sessionId ? ` [Session: ${context.sessionId}]` : '';

        switch (level) {
            case this.Level.FATAL:
            case this.Level.ERROR:
                console.error(`${prefix}${contextStr}`, message, errorInfo);
                if (stack) console.error('Stack:', stack);
                break;
            case this.Level.WARNING:
                console.warn(`${prefix}${contextStr}`, message, errorInfo);
                break;
            case this.Level.INFO:
                console.info(`${prefix}${contextStr}`, message, errorInfo);
                break;
            default:
                console.log(`${prefix}${contextStr}`, message, errorInfo);
        }
    },

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     * @param {string} level - 错误级别
     */
    _showToast(message, level) {
        if (!window.os || !window.os.showToast) {
            // Fallback: 使用alert（不推荐，但至少能提示用户）
            if (level === this.Level.FATAL || level === this.Level.ERROR) {
                console.warn('[ErrorHandler] window.os.showToast not available, using console:', message);
            }
            return;
        }

        // 根据错误级别选择Toast类型
        let toastType = 'error';
        if (level === this.Level.WARNING) {
            toastType = 'warning';
        } else if (level === this.Level.INFO) {
            toastType = 'info';
        }

        window.os.showToast(message, toastType, 3000);
    },

    /**
     * 获取用户友好的错误消息
     * @param {string} errorMessage - 原始错误消息
     * @param {string} type - 错误类型
     * @returns {string} 用户友好的消息
     */
    _getUserFriendlyMessage(errorMessage, type) {
        // 错误消息映射
        const messageMap = {
            [this.Type.NETWORK]: {
                'Failed to fetch': '网络连接失败，请检查网络设置',
                'NetworkError': '网络错误，请稍后重试',
                'timeout': '请求超时，请稍后重试',
                'Network request failed': '网络请求失败，请检查网络连接'
            },
            [this.Type.API]: {
                'API': 'API调用失败，请检查配置',
                '401': '认证失败，请重新登录',
                '403': '权限不足',
                '404': '资源未找到',
                '500': '服务器错误，请稍后重试'
            },
            [this.Type.PARSE]: {
                'JSON': '数据解析失败',
                'parse': '数据格式错误'
            },
            [this.Type.PERMISSION]: {
                'permission': '权限不足，请检查设置',
                'denied': '权限被拒绝',
                'camera': '无法访问摄像头，请检查权限设置',
                'microphone': '无法访问麦克风，请检查权限设置'
            },
            [this.Type.STORAGE]: {
                'storage': '存储操作失败',
                'quota': '存储空间不足',
                'IndexedDB': '数据库操作失败'
            },
            [this.Type.VALIDATION]: {
                'invalid': '数据验证失败',
                'required': '必填项不能为空',
                'format': '数据格式不正确'
            }
        };

        // 尝试匹配错误消息
        const typeMap = messageMap[type] || {};
        for (const [key, value] of Object.entries(typeMap)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        // 通用错误消息
        const genericMessages = {
            [this.Type.NETWORK]: '网络连接失败，请稍后重试',
            [this.Type.API]: '服务暂时不可用，请稍后重试',
            [this.Type.PARSE]: '数据解析失败',
            [this.Type.PERMISSION]: '权限不足，请检查设置',
            [this.Type.STORAGE]: '存储操作失败',
            [this.Type.VALIDATION]: '数据验证失败',
            [this.Type.UNKNOWN]: '发生错误，请稍后重试'
        };

        return genericMessages[type] || genericMessages[this.Type.UNKNOWN];
    },

    /**
     * 包装异步函数，自动捕获错误
     * @param {Function} asyncFn - 异步函数
     * @param {Object} options - 错误处理选项
     * @returns {Function} 包装后的函数
     */
    wrapAsync(asyncFn, options = {}) {
        return async (...args) => {
            try {
                return await asyncFn(...args);
            } catch (error) {
                this.handle(error, {
                    ...options,
                    context: {
                        ...this._context,
                        action: asyncFn.name || 'unknown',
                        args: args.length > 0 ? 'provided' : 'none'
                    }
                });
                throw error; // 重新抛出，让调用者决定如何处理
            }
        };
    },

    /**
     * 包装同步函数，自动捕获错误
     * @param {Function} syncFn - 同步函数
     * @param {Object} options - 错误处理选项
     * @returns {Function} 包装后的函数
     */
    wrapSync(syncFn, options = {}) {
        return (...args) => {
            try {
                return syncFn(...args);
            } catch (error) {
                this.handle(error, {
                    ...options,
                    context: {
                        ...this._context,
                        action: syncFn.name || 'unknown',
                        args: args.length > 0 ? 'provided' : 'none'
                    }
                });
                throw error;
            }
        };
    },

    /**
     * 快速错误处理（简化版）
     * @param {Error|string} error - 错误对象或消息
     * @param {string} userMessage - 用户友好的消息
     * @param {string} type - 错误类型
     */
    quick(error, userMessage = null, type = this.Type.UNKNOWN) {
        return this.handle(error, {
            level: this.Level.ERROR,
            type,
            message: userMessage,
            showToast: true,
            logToConsole: true
        });
    },

    /**
     * 快速警告处理
     * @param {Error|string} warning - 警告对象或消息
     * @param {string} userMessage - 用户友好的消息
     */
    warn(warning, userMessage = null) {
        return this.handle(warning, {
            level: this.Level.WARNING,
            type: this.Type.UNKNOWN,
            message: userMessage,
            showToast: true,
            logToConsole: true
        });
    },

    /**
     * 快速信息提示
     * @param {string} message - 信息消息
     */
    info(message) {
        return this.handle(message, {
            level: this.Level.INFO,
            type: this.Type.UNKNOWN,
            showToast: true,
            logToConsole: false
        });
    }
};
