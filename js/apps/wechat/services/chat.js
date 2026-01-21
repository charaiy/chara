/**
 * js/apps/wechat/services/chat.js
 * 负责消息管理、发送、接收逻辑
 * [Refactor] Advanced AI Integration with JSON Command System
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

    triggerSmartReply() {
        console.log('[ChatService] Triggering Smart Reply...');
        this.triggerAIReply();
    },

    sendMessage(text, type = 'text') {
        if (!this._activeSession) return;
        const msg = window.sysStore.addMessage({
            sender_id: 'user',
            receiver_id: this._activeSession,
            content: text,
            type: type
        });
        this.updateUI(msg);

        if (this._activeSession !== 'me' && this._activeSession !== 'file_helper') {
            if (window.Core && window.Core.Memory) {
                window.Core.Memory.checkAndSummarize(this._activeSession);
            }
        }
    },

    /**
     * B. 触发 AI 回复 (核心逻辑)
     */
    async triggerAIReply() {
        const targetId = this._activeSession;
        if (!targetId) return;

        this.setTypingState(true);

        try {
            // 1. 获取角色与上下文
            let character = window.sysStore.getCharacter(targetId);
            if (!character) {
                character = {
                    id: targetId,
                    name: targetId,
                    main_persona: "你是一个乐于助人的 AI 助手。"
                };
            }

            // 2. 构建超级 System Prompt
            let systemPrompt = '';
            if (window.WeChat.Services.Prompts) {
                systemPrompt = window.WeChat.Services.Prompts.constructSystemPrompt(targetId, character);
            } else {
                console.error('[Chat] Prompts service not found!');
                return;
            }

            // 3.获取历史消息
            const history = this.buildContext(targetId);

            // 4. 调用 API
            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('Core API module not found');

            console.log('[Chat] Sending Request...');
            const responseText = await Api.chat([
                { role: "system", content: systemPrompt },
                ...history
            ]);

            // 5. 增强型 JSON 解析 (Robust JSON Parsing)
            let actions = this._parseAIResponse(responseText);

            // 6. 执行动作序列
            await this.executeActions(targetId, actions);

        } catch (e) {
            console.error('[ChatService] AI Reply Failed:', e);
            // 友好的错误提示，不再显示系统级 Error 对象
            this.updateUI({
                sender_id: 'system',
                receiver_id: 'user',
                content: `(系统消息: 连接断开或响应异常，请重试)`,
                type: 'system'
            });
        } finally {
            this.setTypingState(false);
        }
    },

    /**
     * 智能解析 AI 响应
     * 能够处理 Markdown 包裹、多余字符等情况
     */
    _parseAIResponse(responseText) {
        let cleanText = responseText.trim();
        let actions = [];

        try {
            // Case A: 完美的 JSON
            actions = JSON.parse(cleanText);
        } catch (e1) {
            try {
                // Case B: Markdown 代码块包裹 (```json ... ```)
                // 寻找最外层的 []
                const firstBracket = cleanText.indexOf('[');
                const lastBracket = cleanText.lastIndexOf(']');

                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    const jsonCandidate = cleanText.substring(firstBracket, lastBracket + 1);
                    actions = JSON.parse(jsonCandidate);
                } else {
                    throw new Error("No JSON array structure found");
                }
            } catch (e2) {
                console.warn('[Chat] Relaxed JSON parsing failed, attempting fallback.', e2);

                // Case C: 彻底不是 JSON，当做普通文本回复
                // 只有当文本不包含明显的 JSON 特征时才这样做，否则可能是 JSON 格式错误
                if (!cleanText.includes('type":')) {
                    console.log('[Chat] Treating response as pure text.');
                    // 自动包装标准 Think + Text 结构
                    return [
                        { type: 'thought_chain', analysis: 'Fallack', strategy: 'Direct Reply', character_thoughts: {} },
                        { type: 'text', content: cleanText }
                    ];
                }

                // Case D: 坏掉的 JSON，只能报错或忽略
                console.error('[Chat] Unrecoverable JSON format.');
                throw e2;
            }
        }

        // 校验: 确保结果是数组
        if (!Array.isArray(actions)) {
            // 如果 AI 返回了单个对象而不是数组，包一层
            if (typeof actions === 'object' && actions !== null) {
                return [actions];
            }
            // 否则作为文本
            return [{ type: 'text', content: String(actions) }];
        }

        return actions;
    },

    /**
     * 构建上下文消息列表
     */
    buildContext(targetId) {
        const char = window.sysStore.getCharacter(targetId);
        const limit = char?.settings?.memory_limit || 50;
        const rawHistory = window.sysStore.getMessagesBySession(targetId).slice(-limit);

        return rawHistory.map(m => {
            let content = m.content;

            // Core: Transcribe non-text messages for AI
            if (m.type === 'image') {
                // Try to resolve sticker meaning from Stickers Service
                let description = '';
                if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.getAll) {
                    const allStickers = window.WeChat.Services.Stickers.getAll();
                    // Loose match to handle potential URL encoding diffs
                    const match = allStickers.find(s => s.url === m.content || m.content.includes(s.url));
                    if (match && match.tags && match.tags.length > 0) {
                        // Filter out generic tags
                        const meaningfulTags = match.tags.filter(t => !['自定义', '收藏', '未分类'].includes(t));
                        if (meaningfulTags.length > 0) {
                            description = meaningfulTags.join(', ');
                        }
                    }
                }

                if (description) {
                    content = `[发送了表情包/图片] (表情含义: ${description})`;
                } else {
                    content = `[发送了一张图片] (系统提示: 你暂时无法识别这张图片的内容。如果上下文不明确，请询问用户图片里有什么，切勿根据猜测胡乱回复!)`;
                }
            } else if (m.type === 'voice') {
                content = `[语音消息]`;
            } else if (m.type === 'system') {
                content = `[系统消息: ${m.content}]`;
            }

            return {
                role: (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my') ? 'user' : 'assistant',
                content: content
            };
        });
    },


    /**
     * 执行 AI 返回的动作序列
     */
    async executeActions(targetId, actions) {
        if (!Array.isArray(actions)) return;

        for (const action of actions) {
            console.log('[Chat] Executing Action:', action.type);

            // 模拟输入延迟 (增强拟人感)
            if (action.type === 'text' || action.type === 'sticker' || action.type === 'voice_message') {
                const delay = Math.max(1000, (action.content?.length || 5) * 100);
                await new Promise(r => setTimeout(r, Math.min(delay, 3000)));
            } else {
                await new Promise(r => setTimeout(r, 500));
            }

            switch (action.type) {
                case 'thought_chain':
                    // 记录思维链 (可选：显示在控制台或特殊的调试UI)
                    console.groupCollapsed(`💭 ${targetId} 的思考`);
                    console.log('分析:', action.analysis);
                    console.log('策略:', action.strategy);
                    console.log('独白:', action.character_thoughts);
                    console.groupEnd();
                    break;

                case 'text':
                    this.persistAndShow(targetId, action.content, 'text');
                    break;

                case 'sticker':
                    let stickerUrl = null;
                    const meaning = action.meaning || '';
                    if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.findUrlByMeaning) {
                        stickerUrl = window.WeChat.Services.Stickers.findUrlByMeaning(meaning);
                    }

                    if (stickerUrl) {
                        this.persistAndShow(targetId, stickerUrl, 'image'); // Send as image
                    } else {
                        // Fallback Text if not found
                        this.persistAndShow(targetId, `[${meaning}]`, 'text');
                    }
                    break;

                case 'ai_image':
                case 'naiimag': // NovelAI support hook
                    this.persistAndShow(targetId, `[图片: ${action.description || 'AI生成'}]`, 'text');
                    // Future: 真正调用画图 API 并发送
                    break;

                case 'voice_message':
                    this.persistAndShow(targetId, `[语音: ${action.content}]`, 'text');
                    // Future: TTS This
                    break;

                case 'update_thoughts':
                    // 更新状态与好感度
                    if (action.heartfelt_voice || action.status || action.affection_change !== undefined) {
                        // 正确提取 status 对象中的 outfit 和 behavior 字段
                        const statusUpdate = {
                            inner_voice: action.heartfelt_voice
                        };
                        // 如果 action.status 存在且是对象，提取其中的字段
                        if (action.status && typeof action.status === 'object') {
                            if (action.status.outfit) {
                                statusUpdate.outfit = action.status.outfit;
                            }
                            if (action.status.behavior) {
                                statusUpdate.behavior = action.status.behavior;
                            }
                        }

                        // 处理好感度变化
                        if (action.affection_change !== undefined && typeof action.affection_change === 'number') {
                            const char = window.sysStore.getCharacter(targetId);
                            const currentAffection = parseFloat(char?.status?.affection || 0);
                            const difficulty = char?.status?.relationship_difficulty || 'normal';

                            // 根据难度设定限制最大变化值
                            let maxChange = 0.5; // 默认 normal
                            if (difficulty === 'hard') maxChange = 0.1;
                            if (difficulty === 'easy') maxChange = 1.0;

                            // 限制变化范围并计算新好感度
                            let change = action.affection_change;
                            if (change > 0) change = Math.min(change, maxChange);
                            if (change < 0) change = Math.max(change, -maxChange);

                            const newAffection = Math.max(0, Math.min(100, currentAffection + change));
                            statusUpdate.affection = newAffection.toFixed(1);

                            console.log(`[Affection] ${currentAffection} + ${change.toFixed(2)} = ${statusUpdate.affection} (难度: ${difficulty})`);
                        }

                        this._applyStatusUpdate(targetId, statusUpdate);
                    }
                    break;

                // --- 扩展功能 Hooks (留口子) ---
                case 'transfer': // 发起转账
                case 'redpacket': // 发红包
                    this.persistAndShow(targetId, `[转账] ${action.amount}元\n备注: ${action.note || ''}`, 'text');
                    // Future: Render Red Packet Bubble
                    break;

                case 'video_call_request': // 发起视频
                    this.persistAndShow(targetId, `[视频通话请求]`, 'text');
                    // Future: Trigger Call Modal
                    break;

                case 'share_link':
                    this.persistAndShow(targetId, `[链接] ${action.title}\n${action.description}`, 'text');
                    break;

                case 'location_share':
                    this.persistAndShow(targetId, `[位置] ${action.content}`, 'text');
                    break;

                case 'waimai_request': // 外卖代付
                case 'waimai_order':   // 帮点外卖
                case 'gift':           // 送礼
                case 'gomoku_move':    // 五子棋
                case 'change_music':   // 换歌
                case 'qzone_post':     // 发朋友圈
                    console.log(`[Feature Placeholder] Character used feature: ${action.type}`, action);
                    // 暂时以系统提示展示，让用户知道 AI 想干什么
                    // this.persistAndShow('system', `(AI 尝试使用功能: ${action.type})`, 'system');
                    break;
            }
        }
    },

    persistAndShow(targetId, content, type) {
        if (!content) return;
        const msg = window.sysStore.addMessage({
            sender_id: targetId,
            receiver_id: 'user',
            content: content,
            type: type
        });
        this.updateUI(msg);
    },



    // --- Helpers (Copied from previous implementation or simplified) ---

    updateUI(msg) {
        if (!window.WeChat.UI || !window.WeChat.UI.Bubbles) return;
        const view = document.getElementById('wx-view-session');
        if (!view) return;
        const cnt = view.querySelector('.wx-chat-messages');
        if (!cnt) return;

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
            avatar: avatar
        };

        // Render Time (Simplified logic)
        // ... (省略具体的时间判断逻辑，为节省篇幅，实际应用中建议加上)

        cnt.insertAdjacentHTML('beforeend', window.WeChat.UI.Bubbles.render(bubbleData));
        setTimeout(() => {
            view.scrollTo({ top: view.scrollHeight, behavior: 'smooth' });
        }, 50);
    },

    setTypingState(isThinking) {
        if (window.WeChat.App && window.WeChat.App.setTypingState) {
            window.WeChat.App.setTypingState(isThinking);
        }
    },

    /**
     * 辅助: 应用状态更新 (Legacy Support)
     */
    _applyStatusUpdate(sessionId, updates) {
        const char = window.sysStore.getCharacter(sessionId);
        if (!char) return;

        const oldStatus = char.status || {};
        const newStatus = { ...oldStatus, ...updates };

        // Save
        window.sysStore.updateCharacter(sessionId, { status: newStatus });

        // 记录历史
        let history = char.status_history || [];
        const latest = history[0];

        // Deep compare to avoid duplicates
        const isSame = latest && JSON.stringify(latest.status) === JSON.stringify(newStatus);

        if (!isSame) {
            history.unshift({ timestamp: Date.now(), status: newStatus });
            window.sysStore.updateCharacter(sessionId, { status_history: history.slice(0, 5) });
        }
    }
};
