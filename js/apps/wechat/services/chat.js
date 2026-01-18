/**
 * js/apps/wechat/services/chat.js
 * 负责消息管理、发送、接收逻辑
 * Refactored for Real AI Integration
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Chat = {
    _activeSession: null,

    /**
     * 进入会话
     */
    openSession(sessionId) {
        console.log('Open Session:', sessionId);
        this._activeSession = sessionId;
        // UI 跳转逻辑通常由 View 层处理，此处仅更新状态
    },

    /**
     * A. 发送消息 (Send User Message)
     * 1. 接收输入
     * 2. 存入 Store
     * 3. 更新 UI
     * 4. 触发 AI
     */
    sendMessage(text, type = 'text') {
        if (!this._activeSession) return;

        // 2. 保存到 Store
        // 假设当前用户 ID 为 'user'
        const msg = window.sysStore.addMessage({
            sender_id: 'user',
            receiver_id: this._activeSession,
            content: text,
            type: type
        });

        // 3. UI 更新 (上屏)
        // 注意：index.js 可能也会尝试更新 UI，但为满足 Service 独立性要求，此处必须实现
        this.updateUI(msg);

        // 4. 触发 AI 回复
        // 排除自我对话或文件助手
        if (this._activeSession !== 'me' && this._activeSession !== 'file_helper') {
            this.triggerAIReply();
            this.checkAutoSummary(this._activeSession);
        }
    },

    /**
     * B. 触发 AI 回复 (Trigger AI Reply)
     * 异步方法
     */
    async triggerAIReply() {
        const targetId = this._activeSession;
        if (!targetId) return;

        // UI 状态: 对方正在输入...
        this.setTypingState(true);

        try {
            // 1. 获取人设 (System Prompt)
            let character = window.sysStore.getCharacter(targetId);

            // 紧急修复：如果 store 里竟然没有这个人（可能是Contacts加载慢了），我们现场手动查表
            if (!character) {
                const contacts = window.WeChat?.Services?.Contacts?._contacts || [];
                const found = contacts.find(c => c.id === targetId);
                if (found) {
                    character = {
                        main_persona: found.settings?.persona || "You are a helpful assistant."
                    };
                }
            }

            // 优先使用 settings.persona, 其次 main_persona, 最后默认
            const persona = character?.settings?.persona || character?.main_persona || "你是一个乐于助人的 AI 助手。";

            // 2. 构建上下文 (Context)
            // TODO: 未来在此处接入 Memory System (自动总结、向量检索、记忆簿)
            const contextMessages = this.buildContext(targetId, persona);

            // 3. 调用 API
            // 兼容 Core.Api 或全局 API
            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('Core API module not found');

            const replyText = await Api.chat(contextMessages);

            // 4. 接收回复 & 存入 Store
            const aiMsg = window.sysStore.addMessage({
                sender_id: targetId,
                receiver_id: 'user',
                content: replyText,
                type: 'text'
            });

            // UI 更新
            this.updateUI(aiMsg);

        } catch (e) {
            console.error('[ChatService] AI Reply Failed:', e);

            // 直接显示 API 返回的具体错误信息，方便调试
            let errorHint = e.message || '未知错误';

            const errorMsg = window.sysStore.addMessage({
                sender_id: 'system',
                receiver_id: 'user',
                content: `*(系统提示: ${errorHint})*`,
                type: 'system'
            });
            this.updateUI(errorMsg);
        } finally {
            // 恢复 UI 状态
            this.setTypingState(false);
        }
    },

    /**
     * 构建上下文
     * @param {string} targetId 
     * @param {string} persona 
     */
    buildContext(targetId, persona) {
        // 获取角色配置的记忆限制，默认为 200
        const char = window.sysStore.getCharacter(targetId);
        const limit = char?.settings?.memory_limit || 200;

        // 获取最近 N 条记录
        const rawHistory = window.sysStore.getMessagesBySession(targetId).slice(-limit);

        // 映射为 API 格式 { role, content }
        const history = rawHistory.map(m => ({
            role: (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my') ? 'user' : 'assistant',
            content: m.content
        }));

        // 组装 System Prompt + History
        // 注入长期记忆 (Long-term Memories)
        const memories = char?.memories || [];
        let enhancedPersona = persona;

        if (memories.length > 0) {
            const memoryText = memories.map(m => `- ${m.content}`).join('\n');
            enhancedPersona += `\n\n[长期记忆]\n${memoryText}\n(以上是你对该用户的长期记忆，请在对话中参考这些事实)`;
        }

        return [
            { role: "system", content: enhancedPersona },
            ...history
        ];
    },

    /**
     * 辅助: 更新 UI
     */
    updateUI(msg) {
        if (!window.WeChat.UI || !window.WeChat.UI.Bubbles) return;

        const view = document.getElementById('wx-view-session');
        if (!view) return;

        const cnt = view.querySelector('.wx-chat-messages');
        if (!cnt) return;

        // 适配 UI Bubble 格式
        const isMe = msg.sender_id === 'user' || msg.sender_id === 'me';
        let avatar = '';

        if (!isMe && msg.sender_id !== 'system') {
            const char = window.sysStore.getCharacter(msg.sender_id);
            // Don't fallback to broken path here; let Bubbles handle it
            avatar = char?.avatar || '';
        }

        const bubbleData = {
            id: msg.id || Date.now(),
            sender: isMe ? 'me' : 'other',
            type: msg.type || 'text',
            content: msg.content,
            avatar: avatar,
            time: new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        };

        // Append to DOM
        cnt.innerHTML += window.WeChat.UI.Bubbles.render(bubbleData);

        // Scroll to bottom
        setTimeout(() => {
            view.scrollTop = view.scrollHeight;
        }, 50);
    },

    /**
     * 辅助: 设置输入框状态
     */
    setTypingState(isTyping) {
        const input = document.getElementById('wx-chat-input');
        if (!input) return;

        if (isTyping) {
            if (!input.dataset.originalPlaceholder) {
                input.dataset.originalPlaceholder = input.placeholder;
            }
            input.placeholder = '对方正在输入...';
            // input.disabled = true; // 可选: 是否禁用输入
        } else {
            input.placeholder = input.dataset.originalPlaceholder || '';
            // input.disabled = false;
        }
    },

    /**
     * 接收消息 (兼容旧接口，通常由 triggerAIReply 替代)
     */
    async checkAutoSummary(sessionId) {
        if (!sessionId || sessionId === 'me') return;

        try {
            const char = window.sysStore.getCharacter(sessionId);
            // Default threshold is 50 if not set
            const settings = char?.settings || {};
            const summaryConfig = settings.summaryConfig || {};

            // Check if enabled (default to true if not set)
            const enabled = summaryConfig.autoEnabled !== false;
            if (!enabled) return;

            const threshold = summaryConfig.threshold || 50;
            const messages = window.sysStore.getMessagesBySession(sessionId);

            // Check if we hit the threshold since last summary
            // For simplicity, we just check if total count is a multiple or if specific marker exists
            // A better way: store 'lastSummaryIndex' in character data.
            const lastSummaryIndex = char.lastSummaryIndex || 0;
            const newCount = messages.length - lastSummaryIndex;

            if (newCount >= threshold) {
                console.log(`[AutoSummary] Triggering summary for ${sessionId} (New messages: ${newCount})`);
                await this.performSummary(sessionId, messages, lastSummaryIndex);
            }

        } catch (e) {
            console.warn('[AutoSummary] Check failed', e);
        }
    },

    async performSummary(sessionId, allMessages, lastSummaryIndex) {
        const Api = window.Core?.Api || window.API;
        if (!Api) return;

        // Extract new messages to summarize
        const newMessages = allMessages.slice(lastSummaryIndex);
        if (newMessages.length === 0) return;

        // 1. Prepare Prompt
        const char = window.sysStore.getCharacter(sessionId);
        const settings = char?.settings || {};
        const summaryConfig = settings.summaryConfig || {};
        const customPrompt = summaryConfig.autoPrompt;

        const defaultPrompt = (window.WeChat.Defaults && window.WeChat.Defaults.SUMMARY_PROMPT)
            || "Please summarize the following conversation history into a concise long-term memory.";

        const finalPrompt = customPrompt ? customPrompt : defaultPrompt;

        // 2. Convert messages to text
        const dialogueText = newMessages.map(m => {
            const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? 'User' : (char.name || 'Assistant');
            return `${sender}: ${m.content}`;
        }).join('\n');

        // 3. Call AI
        // We'll insert a system message asking for summary
        try {
            // Notify User (Optional: "正在整理记忆...")
            this.updateUI({
                sender_id: 'system',
                content: '正在整理长期记忆...',
                type: 'system'
            });

            const response = await Api.chat([
                { role: 'system', content: finalPrompt },
                { role: 'user', content: `Here is the conversation to summarize:\n${dialogueText}` }
            ]);

            if (response) {
                // 4. Save to Memories
                const memories = char.memories || [];
                memories.unshift({
                    id: Date.now(),
                    content: response,
                    timestamp: Date.now()
                });

                // Update 'lastSummaryIndex'
                window.sysStore.updateCharacter(sessionId, {
                    memories,
                    lastSummaryIndex: allMessages.length
                });

                this.updateUI({
                    sender_id: 'system',
                    content: '记忆整理完成。',
                    type: 'system'
                });
            }

        } catch (e) {
            console.error('[AutoSummary] Execution failed', e);
            this.updateUI({
                sender_id: 'system',
                content: '记忆整理失败: ' + e.message,
                type: 'system'
            });
        }
    },

    receiveMessage(sessionId, text) {
        // 保留此方法仅为了兼容性，实际逻辑已合并到 triggerAIReply
        this.updateUI({
            sender_id: sessionId,
            content: text,
            type: 'text',
            timestamp: Date.now()
        });
    }
};
