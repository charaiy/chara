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

        // [Manual Trigger Logic]
        // If last message is from User -> Reply
        // If last message is from AI -> Continue/Follow-up
        if (!this._activeSession) return;

        const msgs = window.sysStore.getMessagesBySession(this._activeSession);
        if (msgs.length === 0) {
            this.triggerAIReply();
            return;
        }

        const lastMsg = msgs[msgs.length - 1];
        const isUser = lastMsg.sender_id === 'user' || lastMsg.sender_id === 'me';

        if (isUser) {
            this.triggerAIReply();
        } else {
            // AI Last spoke -> No action (Auto-continue removed)
            console.log('[Chat] Last message was from AI. Waiting for user input.');
        }
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
            // [Manual Mode] Auto-reply disabled. User must click the button.
            // this.triggerAIReply(); 

            // Priority 2: Memory Summarization (Background)
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
        if (!targetId) {
            console.warn('[Chat] triggerAIReply aborted: No active session ID.');
            return;
        }
        if (this._isRequesting) {
            console.warn('[Chat] triggerAIReply aborted: Already requesting.');
            return;
        }

        this._isRequesting = true;
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
            // [Robustness] Ensure char object has an ID before passing to Prompts service
            if (!character.id) character.id = targetId;

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

            // Extract meaningful error message
            let displayMsg = '连接断开或响应异常';
            if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
                displayMsg = e.message;
            } else if (e.message) {
                // If it's a JSON/Parsing error after a successful response chunk, don't toast
                return;
            }

            if (window.os && window.os.showToast) {
                window.os.showToast(`(系统消息: ${displayMsg})`, 'error');
            } else {
                this.updateUI({
                    sender_id: 'system',
                    receiver_id: 'user',
                    content: `(系统消息: ${displayMsg}，请确保网络及 API 配置正确)`,
                    type: 'system'
                });
            }
        } finally {
            this._isRequesting = false;
            this.setTypingState(false);
        }
    },

    /**
     * Check if AI wants to continue speaking
     * Supports recursive calls for multi-turn chains
     */


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
        const charName = char ? (char.name || targetId) : '对方';
        const limit = char?.settings?.memory_limit || 50;
        const rawHistory = window.sysStore.getMessagesBySession(targetId).slice(-limit);

        return rawHistory.map((m, index) => {
            let content = m.content;

            // Vision Logic: STRICTLY follow the user's context_limit. 
            // If the message is within the 'limit' slice (rawHistory), we send the full image payload.
            // No secondary truncation.

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
                    content = `[图片/表情: ${description}]`;
                } else {
                    // Standard Image (Always send full payload if in history context)
                    // Construction for Vision Models (OpenAI/Anthropic compatible format)
                    content = [
                        { type: "text", text: "[发送了一张图片，请根据图片内容进行交互]" },
                        { type: "image_url", image_url: { url: m.content, detail: "auto" } }
                    ];
                }
            } else if (m.type === 'voice') {
                content = `[语音消息]`;
            } else if (m.type === 'system') {
                if (m.content.includes('我 拍了拍 自己')) {
                    // User nudged themselves
                    content = `[微信系统提示] 用户在微信上"拍了拍"自己 (可能是无聊或者按错了)`;
                } else if (m.content.includes('我 拍了拍') && (m.content.includes(charName) || m.content.includes('对方'))) {
                    // User nudged AI
                    content = `[微信系统提示] 用户在微信上"拍了拍"你 (你的手机震动了一下。这是虚拟提醒信号，请不要理解为物理接触)`;
                } else if (m.content.includes('拍了拍 我')) {
                    // AI nudged User (History)
                    content = `[微信系统提示] 你在微信上"拍了拍"用户`;
                } else if (m.content.includes('拍了拍 自己') && !m.content.includes('我 拍了拍')) {
                    // AI nudged themselves (History)
                    content = `[微信系统提示] 你在微信上"拍了拍"你自己`;
                } else {
                    content = `[系统消息: ${m.content}]`;
                }
            } else if (m.type === 'transfer') {
                let trans = { amount: '?', note: '' };
                try { trans = JSON.parse(m.content); } catch (e) { }
                const statusStr = m.transfer_status ? ` (当前状态: ${m.transfer_status === 'received' ? '已收款' : '已退回'})` : ' (等待收款)';

                // Explicitly describe the direction for AI
                const senderName = (m.sender_id === 'user' || m.sender_id === 'me') ? '用户' : '你';
                content = `[${senderName}发起转账] 金额: ¥${trans.amount} 备注: "${trans.note}"${statusStr}`;
            } else if (m.type === 'transfer_status') {
                let transStat = {};
                try { transStat = JSON.parse(m.content); } catch (e) { }
                content = `[转账状态更新] ${transStat.text}`;
            }

            let role = (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my') ? 'user' : 'assistant';

            // [Time Awareness] Add timestamp to message content
            const timeStr = new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
            if (typeof content === 'string') {
                content = `[${timeStr}] ${content}`;
            } else if (Array.isArray(content)) {
                content[0].text = `[${timeStr}] ${content[0].text}`;
            }

            // Special handling for System interactions
            if (m.type === 'system') {
                if (m.content.includes('用户拍了拍') || m.content.includes('我 拍了拍')) {
                    // This is a user-initiated event, treat as User Role for the AI
                    role = 'user';
                } else if (m.content.includes('你拍了拍') || m.content.includes('拍了拍 我')) {
                    // This is an AI-initiated event
                    role = 'assistant';
                } else {
                    // Generic system messages -> treat as 'system' role if possible, or 'user' (as context/instruction)
                    // For safety with most APIs, 'system' messages in history are tricky. 
                    // Let's coerce to 'user' with a prefix to ensure AI sees it as an external input.
                    role = 'user';
                }
            }

            return {
                role: role,
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

            // 模拟输入延迟 (增强拟人感) - User Rule: First msg 0s, others 2s 固定
            const displayTypes = ['text', 'sticker', 'voice_message'];
            if (displayTypes.includes(action.type)) {
                // Calculate if this is the FIRST displayable message in the batch
                // We must find the index of the first visual item to ensure it pops instantly
                const firstDisplayIndex = actions.findIndex(a => displayTypes.includes(a.type));
                const currentIndex = actions.indexOf(action);

                const isFirstDisplayable = (currentIndex !== -1 && currentIndex === firstDisplayIndex);

                // Rule: First message 0 delay, subsequent messages 2000ms
                const delay = isFirstDisplayable ? 0 : 2000;
                await new Promise(r => setTimeout(r, delay));
            } else {
                // Internal parsing/thought events: Instant
                await new Promise(r => setTimeout(r, 20));
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
                    // Auto-fix: Extract "expression meaning" from text and convert to sticker
                    // Regex handles: (表情含义: XXX), （表情含义：XXX）, (Expression: XXX)
                    let textContent = action.content;
                    const stickerRegex = /[\(（]\s*(?:表情含义|Expression)[:：]\s*(.*?)[\)）]/i;
                    const match = textContent.match(stickerRegex);

                    if (match) {
                        // Found a sticker description embedded in text
                        const stickerMeaning = match[1];
                        // Remove it from text
                        textContent = textContent.replace(match[0], '').trim();

                        // 1. Send the cleaned text first (if any remains)
                        if (textContent) {
                            // [Style Fix] Remove trailing periods/dots for realism
                            textContent = textContent.replace(/[。\.]$/, '');

                            this.persistAndShow(targetId, textContent, 'text');
                            await new Promise(r => setTimeout(r, 400)); // Small delay between text and sticker
                        }

                        if (stickerMeaning && stickerMeaning.trim()) {
                            // 2. Trigger Sticker Logic (Recursing or duplicating logic)
                            // We'll reuse the logic in case 'sticker' below by constructing a fake action object
                            const stickerAction = { type: 'sticker', meaning: stickerMeaning };

                            // Directly execute the sticker logic block (Extracting it to a helper would be cleaner, but for now inline is fine or jump)
                            // Let's just copy the logic for reliability
                            let stickerUrl = null;
                            if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.findUrlByMeaning) {
                                stickerUrl = window.WeChat.Services.Stickers.findUrlByMeaning(stickerMeaning);
                            }
                            if (stickerUrl) {
                                this.persistAndShow(targetId, stickerUrl, 'sticker');
                            } else {
                                // If still not found, just show the meaning as format text? 
                                // No, better to show nothing or a generic placeholder?
                                // User hates the text format, so let's fallback to a system tip or nothing.
                                // Or maybe just [Expression: XXX] is better than the sentence format.
                                this.persistAndShow(targetId, `[${stickerMeaning}]`, 'text');
                            }
                        }

                    } else {
                        // Normal text - Filter out WorldBook citations like [1], [1, 2] etc.
                        const filteredContent = textContent.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
                        if (filteredContent) {
                            // [Style Fix] Remove trailing periods/dots
                            const finalContent = filteredContent.replace(/[。\.]$/, '');
                            this.persistAndShow(targetId, finalContent, 'text');
                        }
                    }
                    break;

                case 'nudge':
                    // AI actively nudges...
                    const target = action.target || 'user';
                    const char = window.sysStore.getCharacter(targetId);
                    const charName = char ? (char.name || targetId) : '对方';

                    if (target === 'self') {
                        // AI nudges AI (Itself) (In UI, AI is 'other')
                        this.triggerShakeEffect('other'); // Shake AI's avatar
                        this.persistAndShow(targetId, `"${charName}" 拍了拍 自己`, 'system');
                    } else {
                        // AI nudges User
                        this.triggerShakeEffect('me'); // Shake USER's avatar
                        this.persistAndShow(targetId, `"${charName}" 拍了拍 我`, 'system');
                    }
                    break;

                case 'sticker':
                    let stickerUrl = null;
                    // Robust Clean: Remove [ ], - , ( ) and trim
                    let meaning = String(action.meaning || action.content || '').trim();
                    meaning = meaning.replace(/[\[\]\(\)\-]/g, '').trim();

                    if (!meaning) break;

                    if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.findUrlByMeaning) {
                        stickerUrl = window.WeChat.Services.Stickers.findUrlByMeaning(meaning);
                    }

                    if (stickerUrl) {
                        this.persistAndShow(targetId, stickerUrl, 'sticker');
                    } else {
                        // [Fix] One last try with very loose matching before giving up
                        if (meaning && meaning.length >= 1 && window.WeChat.Services.Stickers.findUrlByMeaning) {
                            const fallbackUrl = window.WeChat.Services.Stickers.findUrlByMeaning(meaning.substring(0, 1));
                            if (fallbackUrl) {
                                this.persistAndShow(targetId, fallbackUrl, 'sticker');
                                break;
                            }
                        }
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
                    this.persistAndShow(targetId, action.content, 'voice');
                    break;

                case 'send_and_recall':
                    const recalledMsg = this.persistAndShow(targetId, action.content, 'text');
                    // Simulate a short delay before recalling
                    setTimeout(() => {
                        this.recallMessage(targetId, recalledMsg.id);
                    }, 2500);
                    break;

                case 'update_thoughts':
                    // 更新状态与好感度 - [Robustness Upgrade]
                    // 支持嵌套结构: { status: { outfit, behavior }, heartfelt_voice }
                    // 或扁平结构: { outfit, behavior, inner_voice }

                    const statusUpdate = {};

                    const ensureStr = (v) => {
                        if (v === null || v === undefined) return v;
                        if (typeof v === 'string') return v;
                        if (typeof v === 'object') return v.content || v.description || v.text || JSON.stringify(v);
                        return String(v);
                    };

                    // 1. 提取心声 (heartfelt_voice 或 inner_voice)
                    let rawVoice = ensureStr(action.heartfelt_voice || action.inner_voice);

                    // Fix: check in nested status object if not found at top level
                    if (!rawVoice && action.status && typeof action.status === 'object') {
                        rawVoice = ensureStr(action.status.inner_voice);
                    }

                    if (rawVoice) statusUpdate.inner_voice = rawVoice;

                    // 2. 提取服装与行为 (优先从 status 对象找，其次找顶层)
                    if (action.status && typeof action.status === 'object') {
                        const sOutfit = ensureStr(action.status.outfit);
                        const sBehavior = ensureStr(action.status.behavior);
                        if (sOutfit) statusUpdate.outfit = sOutfit;
                        if (sBehavior) statusUpdate.behavior = sBehavior;
                    }
                    // 扁平结构兜底
                    if (!statusUpdate.outfit && action.outfit) {
                        const fOutfit = ensureStr(action.outfit);
                        if (fOutfit) statusUpdate.outfit = fOutfit;
                    }
                    if (!statusUpdate.behavior && action.behavior) {
                        const fBehavior = ensureStr(action.behavior);
                        if (fBehavior) statusUpdate.behavior = fBehavior;
                    }

                    // 3. 处理好感度变化
                    if (action.affection_change !== undefined || action.affection !== undefined) {
                        const char = window.sysStore.getCharacter(targetId);
                        const currentAffection = parseFloat(char?.status?.affection || 0);
                        const difficulty = char?.status?.relationship_difficulty || 'normal';

                        let change = 0;
                        if (action.affection_change !== undefined) {
                            change = parseFloat(action.affection_change);
                        } else if (action.affection !== undefined) {
                            // 如果 AI 直接给了新值，计算差值 (但也受到难度限制)
                            change = parseFloat(action.affection) - currentAffection;
                        }

                        // 根据难度设定限制最大变化值
                        let maxChange = 0.5; // 默认 normal
                        if (difficulty === 'hard') maxChange = 0.1;
                        if (difficulty === 'easy') maxChange = 1.0;

                        // 限制变化范围 (仅限制正向涨幅，负向扣分不设限)
                        if (change > 0) {
                            change = Math.min(change, maxChange);
                        } else if (change < 0) {
                            // 负向扣分不设限 (Allow unlimited deduction)
                            // change = change; 
                        }

                        // Allow negative scores (No Math.max(0, ...))
                        const newAffection = Math.min(100, currentAffection + change);
                        statusUpdate.affection = newAffection.toFixed(1);

                        console.log(`[Affection] ${currentAffection} + ${change.toFixed(2)} = ${statusUpdate.affection} (难度: ${difficulty})`);
                    }

                    // 4. 只有当确实有更新内容时才应用
                    if (Object.keys(statusUpdate).length > 0) {
                        this._applyStatusUpdate(targetId, statusUpdate);
                    }
                    break;

                // --- 扩展功能 Hooks (留口子) ---
                case 'transfer': // 发起转账
                case 'redpacket': // 发红包
                    const transferPayload = {
                        amount: action.amount,
                        note: action.note || '转账给您'
                    };
                    this.persistAndShow(targetId, JSON.stringify(transferPayload), 'transfer');
                    break;

                case 'accept_transfer':
                    // AI accepts User's transfer -> Find transfer from 'user'
                    const accMsg = this._findAndUpdateTransfer(targetId, 'received', 'user');
                    // Create a separate status bubble (visual feedback)
                    let accAmount = '?.??';
                    try { if (accMsg) accAmount = JSON.parse(accMsg.content).amount; } catch (e) { }

                    this.persistAndShow(targetId, JSON.stringify({
                        status: 'received',
                        text: '已收款', // Or "已收款"
                        amount: accAmount
                    }), 'transfer_status');
                    break;

                case 'refund_transfer':
                    // AI refunds User's transfer -> Find transfer from 'user'
                    const refMsg = this._findAndUpdateTransfer(targetId, 'refunded', 'user');
                    // Create a separate status bubble
                    let refAmount = '?.??';
                    try { if (refMsg) refAmount = JSON.parse(refMsg.content).amount; } catch (e) { }

                    this.persistAndShow(targetId, JSON.stringify({
                        status: 'refunded',
                        text: '已退还',
                        amount: refAmount
                    }), 'transfer_status');
                    break;

                case 'video_call_request': // 发起视频
                    this.persistAndShow(targetId, `[视频通话请求]`, 'text');
                    // Future: Trigger Call Modal
                    break;

                case 'share_link':
                    this.persistAndShow(targetId, `[链接] ${action.title}\n${action.description}`, 'text');
                    break;


                case 'location_share':
                    const locData = {
                        name: action.content || action.name || '未知位置',
                        detail: action.detail || action.address || ''
                    };
                    this.persistAndShow(targetId, JSON.stringify(locData), 'location');
                    break;

                case 'ignore_and_log':
                    // 1. Show System Tip (Gray text explain why ignored)
                    if (action.reason) {
                        this.persistAndShow(targetId, `(${action.reason})`, 'system');
                    }

                    // 2. Perform background status update (if provided)
                    // The 'status' update is already handled by the global parser at the top of executeActions (lines 500+),
                    // but we ensure it's processed. The global parser extracts 'status' object from any action.
                    // If action.status_update is passed as a separate field, we map it.
                    if (action.status_update) {
                        this._applyStatusUpdate(targetId, action.status_update);
                    }
                    console.log(`[Chat] AI ignored user: ${action.reason}`);
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

    /**
     * Play Voice Message (TTS Synthesis)
     * Called by UI Bubble click
     */
    async playVoiceMessage(msgId) {
        console.log('[Chat] Playing voice for message:', msgId);

        // 1. Find Message
        const msgs = window.sysStore.getAllMessages(); // Ideally optimize this fetch
        const msg = msgs.find(m => m.id === msgId); // Simplified lookup

        if (!msg || !msg.content) return;

        // 2. Prepare UI (Loading State)
        const bubble = document.getElementById(`wx-voice-bubble-${msgId}`);
        if (bubble) bubble.style.opacity = '0.5';

        // [User Correction] User's own voice messages should NOT trigger TTS.
        if (msg.sender_id === 'user' || msg.sender_id === 'me' || msg.sender_id === 'my') {
            if (bubble) bubble.style.opacity = '1';
            const t = document.getElementById(`wx-voice-text-${msgId}`);
            if (t) t.style.display = (t.style.display === 'none' ? 'block' : 'none');
            return;
        }

        // 1.5 Check Cache (Data URL persistence)
        if (msg.audio_data) {
            console.log('[Chat] Playing voice from cache');
            if (window.SettingsState && window.SettingsState.Service) {
                window.SettingsState.Service.playAudio(msg.audio_data);
            } else {
                const audio = new Audio(msg.audio_data);
                audio.play();
            }
            if (bubble) bubble.style.opacity = '1';
            return;
        }

        try {
            // 3. Gather Config
            const s = window.sysStore;
            const senderId = msg.sender_id;
            const char = s.getCharacter(senderId);

            // Global Settings
            const domain = s.get('voice_domain');
            const apiKey = s.get('voice_api_key');
            const type = s.get('voice_interface_type'); // domestic | global
            const model = s.get('voice_model');
            const groupId = s.get('voice_group_id');

            if (!domain || !apiKey) {
                if (window.os) window.os.showToast('语音服务未配置', 'error');
                return;
            }

            // Character Specific Settings
            let voiceId = null;
            let speed = 1.0;
            let pitch = 0;

            if (char && char.voice_settings) {
                voiceId = char.voice_settings.voiceId;
                // speed = char.voice_settings.speed ... (if implemented)
            }

            // 4. Synthesize
            const blob = await window.SettingsState.Service.testVoice({
                type, domain, groupId, apiKey, model,
                text: msg.content,
                voiceId, speed, pitch
            });

            if (blob) {
                // 5. Play Immediately
                window.SettingsState.Service.playAudio(blob);

                // 6. Persist Cache (Background)
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    if (reader.result) {
                        msg.audio_data = reader.result;
                        // Try persistence
                        if (window.sysStore && window.sysStore.updateMessage) {
                            window.sysStore.updateMessage(msg.id, msg);
                            console.log('[Chat] Voice audio cached for msg:', msgId);
                        }
                    }
                };
            } else {
                if (window.os) window.os.showToast('语音合成失败', 'error');
            }

        } catch (e) {
            console.error('[Chat] Play Voice Error:', e);
            if (window.os) window.os.showToast('播放错误: ' + e.message, 'error');
        } finally {
            if (bubble) bubble.style.opacity = '1';
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

        // [Notification Trigger]
        if (window.WeChat.Services.Notifications && window.WeChat.Services.Notifications.handleNewMessage) {
            window.WeChat.Services.Notifications.handleNewMessage(targetId, msg);
        }
    },



    async triggerCharacterIndependentActivity(targetId) {
        console.log(`[ChatService] Starting independent activity for ${targetId}`);
        try {
            const char = window.sysStore.getCharacter(targetId);
            if (!char) return;

            // 1. Build background prompt
            const prompt = window.WeChat.Services.Prompts.constructBackgroundActivityPrompt(targetId, char);

            // 2. Call API (Using window.API with built-in retry/timeout)
            const Api = window.Core?.Api || window.API;
            if (!Api) return;

            const responseText = await Api.chat(
                [{ role: 'system', content: prompt }],
                {
                    silent: true,
                    useSub: true // 使用专用子模型配置
                }
            );

            // 3. Parse and Execute
            let actions = [];
            try {
                // Background activity expects JSON
                const match = responseText.match(/\{[\s\S]*\}/);
                const jsonText = match ? match[0] : responseText;
                const parsed = JSON.parse(jsonText.trim());
                // Handle both array and object { actions: [] } formats
                actions = Array.isArray(parsed) ? parsed : (parsed.actions || [parsed]);
            } catch (e) {
                console.warn('[Chat] Failed to parse background activity JSON', e);
                return;
            }

            // Sync with active session if currently chatting
            const isCurrentlyActive = this._activeSession === targetId;
            if (isCurrentlyActive) this.setTypingState(true);

            await this.executeActions(targetId, actions);

            if (isCurrentlyActive) this.setTypingState(false);

        } catch (e) {
            console.error('[ChatService] Background activity failed:', e);
        }
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
            senderId: msg.sender_id, // Ensure senderId is passed for interactions
            type: msg.type || 'text',
            content: msg.content,
            avatar: avatar,
            timestamp: msg.timestamp || Date.now()
        };

        // [Logic] Date/Time rendering (5-minute rule)
        // Auto-detect session derived from the message itself
        const activeSess = isMe ? msg.receiver_id : msg.sender_id;
        const messages = window.sysStore.getMessagesBySession(activeSess);

        // Find current message index
        const currentIndex = messages.findIndex(m => m.id === msg.id);
        const prevMsg = (currentIndex > 0) ? messages[currentIndex - 1] : null;

        if (!prevMsg || (bubbleData.timestamp - prevMsg.timestamp > 5 * 60 * 1000)) {
            const timeStr = window.WeChat.Views && window.WeChat.Views._formatChatTime
                ? window.WeChat.Views._formatChatTime(bubbleData.timestamp)
                : new Date(bubbleData.timestamp).toLocaleTimeString();
            cnt.insertAdjacentHTML('beforeend', `<div class="wx-msg-time" onclick="window.WeChat.Views.toggleMsgTime(this, ${bubbleData.timestamp})">${timeStr}</div>`);
        }

        cnt.insertAdjacentHTML('beforeend', window.WeChat.UI.Bubbles.render(bubbleData));

        // [Voice Call Integration]
        if (window.WeChat.App && window.WeChat.App.State && window.WeChat.App.State.voiceCallState && window.WeChat.App.State.voiceCallState.open) {
            window.WeChat.App.render();
        }
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
    /**
     * Helper: Find the last transfer message and update its status visually
     * @param {string} targetId - Session ID
     * @param {string} status - New status ('received' | 'refunded')
     * @param {string} [targetSenderId='user'] - Who sent the transfer? 'user' or 'ai' (targetId)
     */
    _findAndUpdateTransfer(targetId, status, targetSenderId = 'user') {
        // 1. Find in Memory
        const history = window.sysStore.getMessagesBySession(targetId);

        // Find last transfer sent by SPECIFIED SENDER
        const transferMsg = [...history].reverse().find(m => {
            let isTargetSender = false;
            const isMe = m.sender_id === 'user' || m.sender_id === 'me';

            if (targetSenderId === 'user') {
                isTargetSender = isMe;
            } else {
                isTargetSender = !isMe && (m.sender_id === targetId);
            }

            if (!isTargetSender) return false;

            if (m.type === 'transfer') return true;
            if (m.type === 'text' && m.content && m.content.includes('"amount"')) return true;
            return false;
        });

        if (transferMsg) {
            // Update Data (Simulated persistence)
            transferMsg.transfer_status = status;

            // [Persistence Fix] Update content JSON
            try {
                let payload = JSON.parse(transferMsg.content);
                payload.status = status;
                transferMsg.content = JSON.stringify(payload);
            } catch (e) { }

            // 2. Update DOM
            const bubbleEl = document.querySelector(`.wx-bubble[data-msg-id="${transferMsg.id}"]`);
            if (bubbleEl) {
                // Re-render the bubble content
                const isMe = true; // We know it's sent by me
                const avatar = (window.sysStore && window.sysStore.get('user_avatar')) || '';

                // Construct a temporary msg object that matches structure needed by render
                const tempMsg = {
                    ...transferMsg,
                    sender: 'me',
                    avatar: avatar,
                    transfer_status: status // Passing the new status
                };

                // We only need to update the INNER content of the bubble wrapper, 
                // BUT Bubbles.render returns the whole row. 
                // Actually Bubbles.render returns the wrapper. 
                // Let's call _renderContent directly if accessible? No, it's private `_renderContent`.
                // Usage: window.WeChat.UI.Bubbles.render(msg) returns the whole HTML string for the row.

                // We can't easily replace the whole row without parsing HTML or finding parent.
                // EASIER: Just overwrite bubbleEl.innerHTML with the result of _renderContent (we need to expose it or duplicate logic?)
                // Accessing private method via object key? It's defined as an object property `_renderContent`. So it IS accessible.

                if (window.WeChat.UI.Bubbles._renderContent) {
                    const newContent = window.WeChat.UI.Bubbles._renderContent(tempMsg);

                    // Update the Style as well (BG color change needs style update on the bubble element itself)
                    // The bubble element has the class `wx-bubble`.
                    // Wait, `_renderContent` returns the inner HTML. 
                    // The wrapper `wx-bubble` has the background color if it's a standard bubble.
                    // BUT for our `transfer` type, the colors are inline in the returned HTML from `_renderContent`?
                    // Let's check `bubbles.js`.
                    // Yes! `case 'transfer'` returns a `<div style="width: 230px...`
                    // So `_renderContent` returns the whole card div.
                    // The `wx-bubble` wrapper usually holds it.

                    // IF `wx-bubble` has padding/bg, we need to clear it.
                    // Our `index.js` step 217 removed padding/bg for rich media.
                    // So replacing innerHTML of `.wx-bubble` with result of `_renderContent` should work perfectly.

                    bubbleEl.innerHTML = newContent;
                }
            }

            // 3. PERSISTENCE FIX: Force save the modified message to the Store
            // Since we modified the object in-place (reference from cache), we must trigger a set()
            // to persist the entire array to IndexedDB.
            if (window.sysStore && window.sysStore.set && window.sysStore.getAllMessages) {
                window.sysStore.set('chara_db_messages', window.sysStore.getAllMessages());
            }

            return transferMsg;
        }
        return null; // Return null if not found
    },

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

        const isSame = JSON.stringify(oldStatus) === JSON.stringify(newStatus);
        if (!isSame) {
            const now = Date.now();
            // Always create new history node for every update
            history.unshift({ timestamp: now, status: newStatus });

            // History limit kept at 5 as per user request
            window.sysStore.updateCharacter(sessionId, { status_history: history.slice(0, 5) });
        }
    },

    // [Feature] Remove status history around a timestamp (for Recall/Delete)
    // [Feature] Intelligent Status Rollback (Only when turn is fully deleted)
    deleteStatusHistory(sessionId, timestamp) {
        if (!timestamp) return;
        const char = window.sysStore.getCharacter(sessionId);
        if (!char || !char.status_history) return;

        // The status grouping logic is now more granular, so we reduce the window
        // to find the relevant status update for this message.
        const GROUP_WINDOW = 10000;

        // Find the status record that this message might belong to
        // RELAXED MATCH: Allow message strictly before OR after, as long as within window.
        const targetStatusIndex = char.status_history.findIndex(h => {
            return Math.abs(timestamp - h.timestamp) < GROUP_WINDOW;
        });

        if (targetStatusIndex === -1) return;

        const targetStatus = char.status_history[targetStatusIndex];

        // CHECK: Are there any OTHER messages left in this time window?
        const allMsgs = window.sysStore.getMessagesBySession(sessionId);

        const activeMsgsInTurn = allMsgs.filter(m => {
            // Must be sent by character
            if (m.sender_id !== sessionId) return false;
            // Must be valid (not recalled)
            if (m.is_recalled) return false;
            // Must be in the time window
            return Math.abs(m.timestamp - targetStatus.timestamp) < GROUP_WINDOW;
        });

        // Refined Logic:
        // Filter out the current timestamp message(s) from the active list to see if "others" remain.
        const othersCount = activeMsgsInTurn.filter(m => Math.abs(m.timestamp - timestamp) > 100).length;

        if (othersCount > 0) {
            console.log(`[Status] Turn not empty (${othersCount} msgs left). Keep status.`);
            return;
        }

        console.log(`[Status] Turn empty. Rolling back status record at ${new Date(targetStatus.timestamp).toLocaleTimeString()}`);

        const newHistory = [...char.status_history];
        newHistory.splice(targetStatusIndex, 1);

        let updates = { status_history: newHistory };

        if (newHistory.length > 0) {
            // Revert to the previous latest (which is now at index 0)
            // If we deleted the HEAD, we revert current status to the new HEAD.
            if (targetStatusIndex === 0) {
                updates.status = newHistory[0].status;
            }
        } else {
            // History is empty - Reset to Defaults
            updates.status = {
                outfit: "日常便装",
                behavior: "等待回复",
                inner_voice: "..."
            };
        }

        window.sysStore.updateCharacter(sessionId, updates);
    },

    /**
     * Handle Avatar Double Click (Nudge/拍一拍)
     * @param {string} type - 'me' (clicked my avatar) or 'other' (clicked character avatar)
     */
    handleAvatarDblClick(type, msgId) {
        // Prevent spamming
        const now = Date.now();
        if (this._lastNudgeTime && now - this._lastNudgeTime < 2000) return;
        this._lastNudgeTime = now;

        const targetId = this._activeSession;
        if (!targetId) return;

        // Visual Feedback Immediate
        this.triggerShakeEffect(type);

        // Construct System Message
        let systemText = '';

        if (type === 'me') {
            // I nudged myself
            systemText = '我 拍了拍 自己';
        } else {
            // I nudged the character
            // Get character name logic
            const char = window.sysStore.getCharacter(targetId);
            const charName = char ? (char.name || targetId) : '对方';
            // Simple truncation if too long
            const displayName = charName.length > 8 ? charName.substring(0, 8) + '...' : charName;

            systemText = `我 拍了拍 "${displayName}"`;
        }

        this.persistAndShow(targetId, systemText, 'system');
    },

    /**
     * Trigger Shake Animation on Avatars
     * @param {string} type - 'me' or 'other'
     */
    triggerShakeEffect(type) {
        // Find all avatars of this type in the view
        // We rely on the `data-sender` attribute added in bubbles.js
        const selector = `.wx-msg-avatar[data-sender="${type}"]`;
        const avatars = document.querySelectorAll(selector);

        avatars.forEach(el => {
            // Reset animation
            el.classList.remove('wx-avatar-shake');
            void el.offsetWidth; // Force reflow
            el.classList.add('wx-avatar-shake');
        });

        // Also, if 'other', maybe vibration? (Haptic feedback mock)
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    },

    recallMessage(targetId, msgId) {
        const messages = window.sysStore.getAllMessages();
        const msg = messages.find(m => m.id === msgId);
        if (msg) {
            msg.is_recalled = true;
            window.sysStore.set('chara_db_messages', messages);

            // Find and update the bubble in UI
            const bubbleEl = document.querySelector(`.wx-bubble[data-msg-id="${msgId}"]`);
            if (bubbleEl) {
                const row = bubbleEl.closest('.wx-msg-row');
                if (row && window.WeChat.UI.Bubbles) {
                    const char = window.sysStore.getCharacter(targetId);
                    const isMe = msg.sender_id === 'user' || msg.sender_id === 'me';

                    // Construct formatted row
                    const newHtml = window.WeChat.UI.Bubbles.render({
                        ...msg,
                        sender: isMe ? 'me' : 'other',
                        avatar: isMe ? (window.sysStore.get('user_avatar') || '') : (char?.avatar || '')
                    });

                    // Replace the whole row
                    const div = document.createElement('div');
                    div.innerHTML = newHtml.trim();
                    row.replaceWith(div.firstChild);
                }
            }

            // [Fix] Also remove related status history if any
            this.deleteStatusHistory(targetId, msg.timestamp);
        }
    }
};
