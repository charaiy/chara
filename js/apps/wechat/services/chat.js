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
    },

    /**
     * 触发一键智能回复 (对应 UI 上的语音按钮/小助手按钮)
     */
    triggerSmartReply() {
        console.log('[ChatService] Triggering Smart Reply...');
        this.triggerAIReply();
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

        // 4. 触发 AI 辅助逻辑 (如自动总结)，但不直接触发回复
        if (this._activeSession !== 'me' && this._activeSession !== 'file_helper') {
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

        // UI 状态: 对方正在输入... (标题栏更新)
        this.setTypingState(true);

        try {
            // 1. 获取人设 (System Prompt)
            let character = window.sysStore.getCharacter(targetId);

            if (!character) {
                const contacts = window.WeChat?.Services?.Contacts?._contacts || [];
                const found = contacts.find(c => c.id === targetId);
                if (found) {
                    character = {
                        main_persona: found.settings?.persona || "You are a helpful assistant."
                    };
                }
            }

            const persona = character?.settings?.persona || character?.main_persona || "你是一个乐于助人的 AI 助手。";

            // 2. 构建上下文 (Context)
            const contextMessages = this.buildContext(targetId, persona);

            // 3. 调用 API
            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('Core API module not found');

            const fullReply = await Api.chat(contextMessages);

            // --- 状态更新解析逻辑 ---
            let cleanReply = fullReply;
            const statusMatch = fullReply.match(/<status_update>([\s\S]*?)<\/status_update>/);
            if (statusMatch) {
                try {
                    const statusJson = JSON.parse(statusMatch[1].trim());
                    cleanReply = fullReply.replace(statusMatch[0], '').trim();
                    this._applyStatusUpdate(targetId, statusJson);
                } catch (e) {
                    console.warn('[ChatService] Failed to parse status update:', e);
                }
            }
            // -----------------------

            // 4. 解析回复内容，按段落拆分多条消息
            // 规则：按双换行符拆分，或者显著的段落标识
            const messages = cleanReply.split(/\n\n+/).filter(m => m.trim());

            for (let i = 0; i < messages.length; i++) {
                const content = messages[i].trim();
                if (!content) continue;

                // 如果是后续消息，给一点点“正在输入”的停顿感
                if (i > 0) {
                    this.setTypingState(true);
                    // 模拟输入延迟：根据字数或固定延迟
                    const delay = Math.min(2000, 500 + content.length * 50);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // 存入 Store
                const aiMsg = window.sysStore.addMessage({
                    sender_id: targetId,
                    receiver_id: 'user',
                    content: content,
                    type: 'text'
                });

                // UI 更新
                this.updateUI(aiMsg);

                // 每发完一条，暂时关闭输入状态，除非还有下一条
                if (i < messages.length - 1) {
                    this.setTypingState(false);
                    // 段落之间的短暂间隔
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

        } catch (e) {
            console.error('[ChatService] AI Reply Failed:', e);
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
        const status = char?.status || {};
        let enhancedPersona = persona;

        // 注入状态信息和指令
        enhancedPersona += `\n\n[当前角色状态]
- 好感度: ${status.affection || '0.0'} (难度设定: ${status.relationship_difficulty || 'normal'})
- 服装: ${status.outfit || '未知'}
- 当前行为: ${status.behavior || '未知'}
- 当前心声: ${status.inner_voice || '无'}

[指令]
你现在不仅是在对话，还需要在每次回复的末尾附带一个 <status_update> 标签，包含更新后的状态内容（JSON格式）。
根据对话的发展即时更新：
1. 好感度 (affection): 浮点数。根据对话氛围增减（困难上限+0.1，普通上限+0.5，简单上限+1.0）。
2. 服装 (outfit): 字符串。如果对话中提到换装，请更新。
3. 行为 (behavior): 字符串。描述你回复时的动作或神态。
4. 心声 (inner_voice): 字符串。描述你内心的一句真实想法。

示例格式：
<status_update>
{
  "affection": 5.5,
  "outfit": "白色连衣裙",
  "behavior": "害羞地扭过头去",
  "inner_voice": "他居然跟我表白了..."
}
</status_update>`;

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

        // --- Time Stamp Logic for New Message ---
        let timeHtml = '';
        const currentTs = msg.timestamp || Date.now();

        // Attempt to find previous message timestamp
        let prevTime = 0;

        // Strategy 1: Check Store (Most Reliable)
        if (window.sysStore && window.sysStore.getMessagesBySession) {
            const msgs = window.sysStore.getMessagesBySession(this._activeSession);
            // current msg should be the last one, so we look at the one before it
            if (msgs.length >= 2) {
                prevTime = msgs[msgs.length - 2].timestamp;
            }
        }

        // Strategy 2: Fallback to DOM (If Store logic fails or is async delayed)
        if (prevTime === 0) {
            // Try to find the last message row in DOM and infer time? 
            // Difficult because DOM doesn't store raw timestamp.
            // We'll rely on Strategy 1 mostly. If it fails (first msg), prevTime is 0.
        }

        if (currentTs - prevTime > 5 * 60 * 1000 || prevTime === 0) {
            if (window.WeChat.Views && window.WeChat.Views._formatChatTime) {
                const timeStr = window.WeChat.Views._formatChatTime(currentTs);
                timeHtml = `<div class="wx-msg-time" onclick="window.WeChat.Views.toggleMsgTime(this, ${currentTs})">${timeStr}</div>`;
            }
        }
        // ----------------------------------------

        // 适配 UI Bubble 格式
        const isMe = msg.sender_id === 'user' || msg.sender_id === 'me';
        let avatar = '';

        if (isMe) {
            avatar = (window.sysStore && window.sysStore.get('user_avatar')) || '';
        } else if (msg.sender_id !== 'system') {
            const char = window.sysStore.getCharacter(msg.sender_id);
            avatar = char?.avatar || '';
        }

        const bubbleData = {
            id: msg.id || Date.now(),
            sender: isMe ? 'me' : 'other',
            type: msg.type || 'text',
            content: msg.content,
            avatar: avatar,
            // Bubble renderer doesn't actually use 'time' field for display inside bubble in WeChat style, 
            // but we pass it just in case.
            time: ''
        };

        // Append to DOM (Time Row + Message Row)
        cnt.insertAdjacentHTML('beforeend', timeHtml + window.WeChat.UI.Bubbles.render(bubbleData));

        // Scroll to bottom smoothly
        setTimeout(() => {
            view.scrollTo({
                top: view.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    },

    /**
     * 辅助: 设置输入框状态
     */
    setTypingState(isThinking) {
        // 1. 同步顶部标题栏状态 (对方正在输入...)
        if (window.WeChat.App && window.WeChat.App.setTypingState) {
            window.WeChat.App.setTypingState(isThinking);
        }

        // 2. 同步输入框占位符
        const input = document.getElementById('wx-chat-input');
        if (!input) return;

        if (isThinking) {
            if (!input.dataset.originalPlaceholder) {
                input.dataset.originalPlaceholder = input.placeholder;
            }
            input.placeholder = ''; // 思考时输入框保持空白占位
        } else {
            input.placeholder = input.dataset.originalPlaceholder || '';
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
    },

    /**
     * 辅助: 应用状态更新
     */
    _applyStatusUpdate(sessionId, statusJson) {
        const char = window.sysStore.getCharacter(sessionId);
        if (!char) return;

        const oldStatus = char.status || {};
        const updates = {};

        // 1. 处理好感度 (带有难度限制)
        let newAffection = parseFloat(statusJson.affection);
        if (!isNaN(newAffection)) {
            const oldAff = parseFloat(oldStatus.affection || 0);
            const diff = newAffection - oldAff;

            // 限制单次变动上限 (根据难度)
            const difficulty = oldStatus.relationship_difficulty || 'normal';
            // 困难 0.1, 普通 0.5, 简单 1.0 (根据用户最新要求)
            const cap = difficulty === 'hard' ? 0.1 : (difficulty === 'easy' ? 1.0 : 0.5);

            if (diff > cap) newAffection = oldAff + cap;
            else if (diff < -cap) newAffection = oldAff - cap;

            statusJson.affection = newAffection.toFixed(1);
        }

        // 2. 合并状态
        const newStatus = {
            ...oldStatus,
            ...statusJson
        };
        updates.status = newStatus;

        // 3. 记录历史记录 (如果状态有变)
        let history = char.status_history || [];
        const latest = history[0];
        if (JSON.stringify(newStatus) !== JSON.stringify(latest?.status)) {
            history.unshift({
                timestamp: Date.now(),
                status: JSON.parse(JSON.stringify(newStatus))
            });
            updates.status_history = history.slice(0, 5);
        }

        // 4. 持久化并刷新 UI
        window.sysStore.updateCharacter(sessionId, updates);

        // 如果 App 正在运行且当前正是此会话的面板，触发一次 App Render
        if (window.WeChat.App && window.WeChat.App.render) {
            window.WeChat.App.render();
        }
    }
};
