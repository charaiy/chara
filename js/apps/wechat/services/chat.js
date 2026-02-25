/**
 * js/apps/wechat/services/chat.js
 * 聊天核心服务 - 负责消息管理、AI回复、动作执行等核心逻辑
 * 
 * 职责：
 * - 消息发送和接收
 * - AI回复触发和处理
 * - AI响应解析（JSON命令系统）
 * - 动作执行（转账、位置、拍一拍、表情包等）
 * - 上下文构建（历史消息、记忆、关系等）
 * - 消息持久化和显示
 * 
 * 核心功能模块：
 * 1. 消息发送：
 *    - sendMessage(): 发送消息（文本、图片等）
 *    - persistAndShow(): 持久化并显示消息
 * 
 * 2. AI回复：
 *    - triggerAIReply(): 触发AI回复
 *    - _parseAIResponse(): 解析AI响应（支持JSON命令和纯文本）
 *    - buildContext(): 构建对话上下文
 * 
 * 3. 动作执行：
 *    - executeActions(): 执行AI返回的动作序列
 *    - 支持的动作类型：
 *      - text: 文本消息
 *      - sticker: 表情包
 *      - image: 图片
 *      - location_share: 位置分享
 *      - transfer: 转账
 *      - accept_transfer: 接收转账
 *      - refund_transfer: 退还转账
 *      - nudge: 拍一拍
 *      - voice_call_request: 语音通话请求
 *      - video_call_request: 视频通话请求
 *      - reject_call: 拒绝通话
 *      - hangup_call: 挂断通话
 *      - status_update: 状态更新
 *      - ignore_and_log: 忽略并记录
 * 
 * 4. 特殊处理：
 *    - 通话中的消息处理（voice_text类型）
 *    - 消息时间戳显示逻辑
 *    - 消息排序和去重
 * 
 * [Refactor] Advanced AI Integration with JSON Command System
 * 
 * 依赖：
 * - window.Core.Api: API调用
 * - window.WeChat.Services.Prompts: 提示词构建
 * - window.WeChat.Services.*: 各种服务（转账、位置等）
 * - window.sysStore: 数据存储
 * - window.Core.Memory: 记忆系统
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
            // Priority 1: Trigger AI Reply
            this.triggerAIReply();

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
                throw new Error('Prompts service not found'); // 改为抛出异常，确保 finally 块执行
            }

            // 3.获取历史消息
            const history = this.buildContext(targetId);

            // 4. 调用 API
            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('Core API module not found');

            console.log('[Chat] Sending Request...');

            // 60s Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时 (60s)')), 60000)
            );

            const apiPromise = Api.chat([
                { role: "system", content: systemPrompt },
                ...history
            ]);

            const responseText = await Promise.race([apiPromise, timeoutPromise]);

            // 5. 增强型 JSON 解析 (Robust JSON Parsing)
            let actions = this._parseAIResponse(responseText);

            // 6. 执行动作序列
            await this.executeActions(targetId, actions);

            // 7. [Optimization] 顺便刷朋友圈 (省API高效模式)
            // AI回复消息后，顺便检查一下朋友圈是否有需要互动的动态
            if (window.WeChat?.Services?.Moments?._triggerReactions) {
                window.WeChat.Services.Moments._triggerReactions(null, targetId);
            }

            // [Integration Feature] 检查该角色是否有"因为离线积压而未发"的朋友圈，并在背景生成
            if (window.WeChat?.Services?.Moments?._checkMissedPostsOnInteraction) {
                window.WeChat.Services.Moments._checkMissedPostsOnInteraction(targetId);
            }

        } catch (e) {
            // 使用统一错误处理
            const errorType = this._getErrorType(e);
            const shouldShowToast = !(e.message && (e.message.includes('JSON') || e.message.includes('parse') || e.message.includes('Unexpected')));

            if (window.ErrorHandler) {
                window.ErrorHandler.setContext({
                    sessionId: targetId,
                    action: 'triggerAIReply'
                });
                window.ErrorHandler.handle(e, {
                    level: window.ErrorHandler.Level.ERROR,
                    type: errorType,
                    showToast: shouldShowToast,
                    metadata: { targetId }
                });
            } else {
                // Fallback: 原始错误处理
                console.error('[ChatService] AI Reply Failed:', e);
                let displayMsg = '连接断开或响应异常';
                if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
                    displayMsg = e.message;
                }
                if (shouldShowToast) {
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
                }
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

        // [Fix] 提前检查：如果文本看起来不像 JSON（没有 {} 或 []），直接作为文本处理
        const hasJsonStructure = (cleanText.includes('{') && cleanText.includes('}')) ||
            (cleanText.includes('[') && cleanText.includes(']'));

        if (!hasJsonStructure) {
            console.log('[Chat] Response does not contain JSON structure, treating as pure text.');
            return [
                { type: 'thought_chain', analysis: 'Fallback', strategy: 'Direct Reply', character_thoughts: {} },
                { type: 'text', content: cleanText }
            ];
        }

        try {
            // Case A: 完美的 JSON
            actions = JSON.parse(cleanText);
        } catch (e1) {
            try {
                // Case B: Markdown 代码块包裹 (```json ... ```)
                // 移除 markdown 代码块标记
                cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

                // 寻找最外层的 [] 或 {}
                const firstBracket = cleanText.indexOf('[');
                const lastBracket = cleanText.lastIndexOf(']');
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');

                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    const jsonCandidate = cleanText.substring(firstBracket, lastBracket + 1);
                    actions = JSON.parse(jsonCandidate);
                } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    const jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
                    const parsed = JSON.parse(jsonCandidate);
                    // 单个对象包装成数组
                    actions = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    throw new Error("No JSON structure found");
                }
            } catch (e2) {
                console.warn('[Chat] Relaxed JSON parsing failed, attempting fallback.', e2);

                // Case C: 彻底不是 JSON，当做普通文本回复
                // [Fix] 改进判断：检查是否包含 JSON 特征（引号、冒号、逗号等）
                const hasJsonFeatures = cleanText.includes('"') &&
                    (cleanText.includes(':') || cleanText.includes(',')) &&
                    (cleanText.includes('type') || cleanText.includes('content'));

                if (!hasJsonFeatures) {
                    console.log('[Chat] Treating response as pure text (no JSON features detected).');
                    // 自动包装标准 Think + Text 结构
                    return [
                        { type: 'thought_chain', analysis: 'Fallback', strategy: 'Direct Reply', character_thoughts: {} },
                        { type: 'text', content: cleanText }
                    ];
                }

                // Case D: 坏掉的 JSON，尝试提取文本内容
                console.error('[Chat] Unrecoverable JSON format, extracting text content.');
                // [Fix] 不抛出异常，而是返回一个文本消息，避免整个流程失败
                return [
                    { type: 'thought_chain', analysis: 'Parse Error', strategy: 'Direct Reply', character_thoughts: {} },
                    { type: 'text', content: cleanText.replace(/[{}[\]]/g, '').trim() || 'AI 响应格式异常，请重试' }
                ];
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
     * [USER REQUEST] 优化：添加缓存机制，避免重复构建上下文，提升通话中回复速度
     */
    buildContext(targetId) {
        const char = window.sysStore.getCharacter(targetId);
        const charName = char ? (char.name || targetId) : '对方';
        const limit = char?.settings?.memory_limit || 50;

        // [OPTIMIZATION] 缓存机制：如果消息没有变化，直接返回缓存的上下文
        const allMessages = window.sysStore.getMessagesBySession(targetId);
        const lastMessageId = allMessages.length > 0 ? allMessages[allMessages.length - 1].id : null;
        const lastMessageTime = allMessages.length > 0 ? allMessages[allMessages.length - 1].timestamp : 0;

        // 检查缓存（增加时效检查，确保时间锚点不过期）
        if (this._contextCache) {
            const cache = this._contextCache;
            const cacheAge = Date.now() - (cache.createdAt || 0);
            if (cache.targetId === targetId &&
                cache.lastMessageId === lastMessageId &&
                cache.lastMessageTime === lastMessageTime &&
                cache.limit === limit &&
                cacheAge < 120000) { // 缓存2分钟内有效
                // 缓存命中，直接返回
                console.log('[Chat] buildContext: Cache hit, reusing context');
                return cache.history;
            }
        }

        const rawHistory = allMessages.slice(-limit);

        const history = rawHistory.map((m, index) => {
            // ... (existing mapping logic)
            let content = m.content;
            if (m.type === 'image') {
                let description = '';
                if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.getAll) {
                    const allStickers = window.WeChat.Services.Stickers.getAll();
                    const match = allStickers.find(s => s.url === m.content || m.content.includes(s.url));
                    if (match && match.tags && match.tags.length > 0) {
                        const meaningfulTags = match.tags.filter(t => !['自定义', '收藏', '未分类'].includes(t));
                        if (meaningfulTags.length > 0) description = meaningfulTags.join(', ');
                    }
                }
                if (description) content = `[图片/表情: ${description}]`;
                else content = [{ type: "text", text: "[发送了一张图片，请根据内容交互]" }, { type: "image_url", image_url: { url: m.content, detail: "auto" } }];
            } else if (m.type === 'voice') content = `[语音消息]`;
            else if (m.type === 'system') {
                if (m.content.includes('我 拍了拍 自己')) content = `[微信系统提示] 用户"拍了拍"自己`;
                else if (m.content.includes('我 拍了拍')) content = `[微信系统提示] 用户"拍了拍"你`;
                else if (m.content.includes('拍了拍 我')) content = `[微信系统提示] 你"拍了拍"用户`;
                else content = `[系统消息: ${m.content}]`;
            } else if (m.type === 'transfer') {
                let trans = { amount: '?', note: '' }; try { trans = JSON.parse(m.content); } catch (e) { }
                const senderName = (m.sender_id === 'user' || m.sender_id === 'me') ? '用户' : '你';
                content = `[${senderName}发起转账] ¥${trans.amount} "${trans.note}"`;
            } else if (m.type === 'call_status') {
                // [Fix] 正确构建通话状态消息，说明是谁的动作和谁发起的
                // 注意：在 buildContext 中，角色视角是 'assistant'，用户视角是 'user'
                // 如果 sender_id 是 'user' 或 'me'，说明是用户的操作
                // 如果 sender_id 是角色ID，说明是角色的操作
                const isUserAction = (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my');
                const wasInitiatedByUser = m.initiatedByUser === true;  // [Fix] 检查是否用户主动发起

                // [Fix] 根据发起者和操作者构建更准确的描述
                let statusText = '';
                if (m.content === 'reject') {
                    if (isUserAction) {
                        statusText = '用户拒绝了你的通话邀请';
                    } else if (wasInitiatedByUser) {
                        // 用户主动发起，角色拒绝
                        statusText = '你拒绝了用户主动发起的通话邀请';
                    } else {
                        // 角色主动发起，角色拒绝（不太可能，但保留逻辑）
                        statusText = '你取消了通话';
                    }
                } else if (m.content === 'cancel') {
                    if (isUserAction) {
                        statusText = '用户取消了通话';
                    } else {
                        statusText = '你取消了通话';
                    }
                } else if (m.content === 'no_answer') {
                    if (isUserAction) {
                        statusText = '用户未接听';
                    } else {
                        statusText = '你未接听';
                    }
                } else {
                    statusText = `[通话状态: ${m.content}]`;
                }

                content = `[${m.isVideo ? '视频' : '语音'}通话] ${statusText}`;
            }
            else if (m.type === 'call_summary') {
                let sum = { duration: '00:00' }; try { sum = JSON.parse(m.content); } catch (e) { }
                content = `[语音通话已结束] 通话时长: ${sum.duration}`;
            }

            let role = (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my') ? 'user' : 'assistant';
            const timeStr = new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
            if (typeof content === 'string') content = `[${timeStr}] ${content}`;
            else if (Array.isArray(content)) content[0].text = `[${timeStr}] ${content[0].text}`;

            if (m.type === 'system') role = 'user';
            return { role: role, content: content };
        });

        // [Fix] Inject REAL-TIME Call Event if dialing
        if (window.WeChat.App) {
            const state = window.WeChat.App.State;
            let callType = '';
            if (state.voiceCallState?.open && state.voiceCallState.sessionId === targetId && state.voiceCallState.status === 'dialing') callType = '语音';
            else if (state.videoCallState?.open && state.videoCallState.sessionId === targetId && state.videoCallState.status === 'dialing') callType = '视频';

            if (callType) {
                history.push({
                    role: 'user',
                    content: `[系统实时提醒] 用户正在向你发起【${callType}通话邀请】，请立刻根据你的性格和好感度做出决定：如果你想接听，请直接回复文字(text)或表情(sticker)作为你的第一句话；如果你不想接听或不方便，请使用指令 reject_call 拒绝。`
                });
            }
        }

        // [时间锚点] 如果最后一条消息距今超过5分钟，注入当前真实时间提醒
        if (allMessages.length > 0) {
            const lastMsgTime = allMessages[allMessages.length - 1].timestamp;
            const nowTime = Date.now();
            const diffMinutes = (nowTime - lastMsgTime) / 60000;
            if (diffMinutes > 5) {
                const pad = n => String(n).padStart(2, '0');
                const now = new Date();
                const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                const diffDesc = diffMinutes >= 60
                    ? `${Math.floor(diffMinutes / 60)}小时${Math.round(diffMinutes % 60)}分钟`
                    : `${Math.round(diffMinutes)}分钟`;
                history.push({
                    role: 'user',
                    content: `[系统时间锚点] 现在的真实时间是 ${nowStr}，距离用户最后一条消息已过去 ${diffDesc}。你现在才看到/回复这条消息。请根据当前时间更新你的状态（地点、服装、行为、心声），体现出"刚看到消息"的自然感觉。`
                });
            }
        }

        // [OPTIMIZATION] 缓存构建好的上下文
        this._contextCache = {
            targetId: targetId,
            lastMessageId: lastMessageId,
            lastMessageTime: lastMessageTime,
            limit: limit,
            createdAt: Date.now(),
            history: history
        };

        return history;
    },

    _autoAnswerIfDialing(targetId) {
        if (!window.WeChat.App) return;
        const state = window.WeChat.App.State;

        let call = null;
        let statusId = '';

        if (state.voiceCallState?.open && state.voiceCallState.sessionId === targetId && state.voiceCallState.status === 'dialing') {
            call = state.voiceCallState;
            statusId = 'wx-call-status-text';
        } else if (state.videoCallState?.open && state.videoCallState.sessionId === targetId && state.videoCallState.status === 'dialing') {
            call = state.videoCallState;
            statusId = 'wx-vcall-status-text';
        }

        if (call) {
            console.log('[Chat] AI produced content. Auto-connecting call...');
            call.status = 'connected';
            call.startTime = Date.now();
            call.awaitingInitiation = false;

            // [New] 启动真实的媒体流
            setTimeout(async () => {
                try {
                    const WebRTC = window.WeChat.Services.WebRTC;
                    if (WebRTC && WebRTC.isSupported()) {
                        // 判断是视频通话还是语音通话
                        const appState = window.WeChat.App.State;
                        const isVideo = (appState.videoCallState?.open &&
                            appState.videoCallState?.sessionId === targetId) || false;

                        if (isVideo) {
                            // 视频通话：获取摄像头和麦克风
                            await WebRTC.startVideoCall();
                            // 绑定本地视频流到 video 元素
                            setTimeout(() => {
                                WebRTC.attachLocalVideo('wx-video-call-local');
                            }, 100);
                        } else {
                            // 语音通话：只获取麦克风
                            await WebRTC.startVoiceCall();
                            // 绑定本地音频流到 audio 元素
                            setTimeout(() => {
                                WebRTC.attachLocalAudio('wx-voice-call-audio');
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('[WebRTC] 启动媒体流失败:', error);
                    if (window.os) {
                        window.os.showToast('无法访问摄像头/麦克风，请检查权限设置', 'error', 3000);
                    }
                }
            }, 200);

            // Start Timer
            if (call.timer) clearInterval(call.timer);
            call.timer = setInterval(() => {
                if (!call.open || call.status !== 'connected') return;
                const diff = Math.floor((Date.now() - call.startTime) / 1000);
                const m = Math.floor(diff / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                call.durationStr = `${m}:${s} `;
                const statusText = document.getElementById(statusId);
                if (statusText) statusText.innerText = call.durationStr;
            }, 1000);

            window.WeChat.App.render();
        }
    },

    /**
     * 执行 AI 返回的动作序列
     */
    async executeActions(targetId, actions) {
        if (!Array.isArray(actions)) return;

        // [Robustness] Capture call state AT THE START of the action sequence execution
        // This prevents messages from "leaking" into the main chat if the call ends while AIs are still speaking
        const appState = window.WeChat.App.State;

        // [USER REQUEST] 检查是否在通话中（已接通状态）
        const isInActiveCall = (appState.voiceCallState?.open && appState.voiceCallState?.sessionId === targetId && appState.voiceCallState?.status === 'connected') ||
            (appState.videoCallState?.open && appState.videoCallState?.sessionId === targetId && appState.videoCallState?.status === 'connected');
        const isInCallWithTarget = (appState.voiceCallState?.open && appState.voiceCallState?.sessionId === targetId) ||
            (appState.videoCallState?.open && appState.videoCallState?.sessionId === targetId);

        // 追踪是否发送了可见消息（用于兜底系统提示）
        let hasSentVisibleMessage = false;
        let lastBehavior = null;

        for (const action of actions) {
            console.log('[Chat] Executing Action:', action.type);

            // [New] If AI produces content during Dialing, it means AI ANSWERS the call
            // [Fix] ONLY auto-answer if THERE IS NO reject_call in the entire sequence.
            // If AI is rejecting, they might still send a text explanation, but we MUST NOT connect.
            const hasReject = actions.some(a => a.type === 'reject_call');
            const contentTypes = ['text', 'sticker', 'voice_message'];
            // [Fix] 在第一个内容消息时立即接通，避免超时保护误判
            if (contentTypes.includes(action.type) && !hasReject) {
                // 检查是否在通话中
                const appState = window.WeChat.App.State;
                const isDialing = (appState.voiceCallState?.open && appState.voiceCallState?.sessionId === targetId && appState.voiceCallState?.status === 'dialing') ||
                    (appState.videoCallState?.open && appState.videoCallState?.sessionId === targetId && appState.videoCallState?.status === 'dialing');

                if (isDialing) {
                    // 立即接通，避免超时保护误判
                    this._autoAnswerIfDialing(targetId);
                }
            }

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

                // [Robustness] Re-check connection after delay
                if (this._activeSession !== targetId) {
                    console.log('[Chat] Session switched, aborting action execution.');
                    return;
                }
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
                    let textContent = action.content;
                    const stickerRegex = /[\(（]\s*(?:表情含义|Expression)[:：]\s*(.*?)[\)）]/i;
                    const match = textContent.match(stickerRegex);

                    if (match) {
                        const stickerMeaning = match[1];
                        textContent = textContent.replace(match[0], '').trim();

                        if (textContent) {
                            textContent = textContent.replace(/[。\.]$/, '');
                            const msgType = isInCallWithTarget ? 'voice_text' : 'text';

                            // [Voice Call Splitting Logic - Enhanced]
                            if (isInCallWithTarget && textContent.length > 45) {
                                const fragments = textContent.match(/[^。！？\?!\n]+([。！？\?!\n]+」?|$)/g)
                                    ?.map(s => s.trim())
                                    .filter(s => s.length > 0)
                                    .slice(0, 4) || [textContent];

                                for (let i = 0; i < fragments.length; i++) {
                                    if (this._activeSession !== targetId) return; // Re-check
                                    this.persistAndShow(targetId, fragments[i], 'voice_text');
                                    if (i < fragments.length - 1) await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
                                }
                            } else {
                                this.persistAndShow(targetId, textContent, msgType);
                            }
                            await new Promise(r => setTimeout(r, 400));
                        }

                        if (stickerMeaning && stickerMeaning.trim()) {
                            const stickerAction = { type: 'sticker', meaning: stickerMeaning };
                            let stickerUrl = null;
                            if (window.WeChat.Services.Stickers && window.WeChat.Services.Stickers.findUrlByMeaning) {
                                stickerUrl = window.WeChat.Services.Stickers.findUrlByMeaning(stickerMeaning);
                            }
                            if (stickerUrl) {
                                this.persistAndShow(targetId, stickerUrl, 'sticker');
                            } else {
                                this.persistAndShow(targetId, `[${stickerMeaning}]`, 'text');
                            }
                        }

                    } else {
                        const filteredContent = textContent.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
                        if (filteredContent) {
                            const finalContent = filteredContent.replace(/[。\.]$/, '');
                            const msgType = isInCallWithTarget ? 'voice_text' : 'text';

                            // [Voice Call Splitting Logic - Enhanced]
                            if (isInCallWithTarget && finalContent.length > 45) {
                                // Smart split: Match sentences while keeping punctuation and brackets
                                // Regex explanation: Match anything that's NOT a sentence ender, 
                                // followed by sentence enders AND optional closing brackets
                                const fragments = finalContent.match(/[^。！？\?!\n]+([。！？\?!\n]+」?|$)/g)
                                    ?.map(s => s.trim())
                                    .filter(s => s.length > 0)
                                    .slice(0, 4) || [finalContent];

                                for (let i = 0; i < fragments.length; i++) {
                                    this.persistAndShow(targetId, fragments[i], 'voice_text');
                                    if (i < fragments.length - 1) await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
                                }
                            } else {
                                this.persistAndShow(targetId, finalContent, msgType);
                            }
                        }
                    }
                    break;

                case 'nudge':
                    // [USER REQUEST] 通话中禁止拍一拍
                    if (isInActiveCall) {
                        console.warn('[Chat] 通话中禁止拍一拍，已忽略');
                        break; // 跳过拍一拍动作
                    }
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
                    // [USER REQUEST] 通话中禁止发送表情包
                    if (isInActiveCall) {
                        console.warn('[Chat] 通话中禁止发送表情包，已忽略');
                        break; // 跳过表情包动作
                    }
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

                case 'voice_message': {
                    const vType = isInCallWithTarget ? 'voice_text' : 'voice';
                    this.persistAndShow(targetId, action.content, vType);
                    break;
                }

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
                        const sLocation = ensureStr(action.status.location);
                        if (sOutfit) statusUpdate.outfit = sOutfit;
                        if (sBehavior) statusUpdate.behavior = sBehavior;
                        if (sLocation) statusUpdate.location = sLocation;
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
                    if (!statusUpdate.location && action.location) {
                        const fLocation = ensureStr(action.location);
                        if (fLocation) statusUpdate.location = fLocation;
                    }

                    // 2.3 处理秘密识破与洞察自动更新
                    const charForSecret = window.sysStore.getCharacter(targetId);
                    if (charForSecret) {
                        const rel = charForSecret.settings?.relationship || {};
                        let relChanged = false;

                        // [Evolution] AI 自动演化关系看法
                        if (action.new_public_relation) {
                            rel.public_relation = ensureStr(action.new_public_relation);
                            relChanged = true;
                            console.log('[Rel] 客观关系更新为:', rel.public_relation);
                        }
                        if (action.new_inner_view) {
                            rel.char_to_user_view = ensureStr(action.new_inner_view);
                            relChanged = true;
                            console.log('[Rel] 内心看法演化为:', rel.char_to_user_view);
                        }
                        // 更新背景故事 (Backstory)
                        if (action.new_backstory) {
                            rel.backstory = ensureStr(action.new_backstory);
                            relChanged = true;
                            console.log('[Rel] 背景故事更新');
                        }

                        // AI 发现自己的秘密泄露了
                        if (action.char_secret_exposed === true && !rel.user_knows_char_private) {
                            rel.user_knows_char_private = true;
                            relChanged = true;
                            console.log('[Secret] AI 判定其秘密已被用户识破');
                        }
                        // AI 识破了用户的秘密
                        if (action.user_secret_discovered === true && !rel.char_knows_user_private) {
                            rel.char_knows_user_private = true;
                            relChanged = true;
                            console.log('[Secret] AI 判定它已识破用户的秘密');
                        }

                        if (relChanged) {
                            window.sysStore.updateCharacter(targetId, {
                                settings: { ...charForSecret.settings, relationship: rel }
                            });
                        }
                    }

                    // 2.4 更新发掘记录 (discovered_knowledge)
                    // AI 可以主动输出新发掘到的关于用户的信息点，持久化存储
                    if (action.new_discovery) {
                        const discovery = ensureStr(action.new_discovery);
                        const existingChar = window.sysStore.getCharacter(targetId);
                        const knowledge = existingChar?.status?.discovered_knowledge || [];
                        if (discovery && !knowledge.includes(discovery)) {
                            statusUpdate.discovered_knowledge = [...knowledge, discovery].slice(-20); // 保留最近20条
                            console.log('[Knowledge] 记录新发掘点:', discovery);
                        }
                    }

                    // [New] 2.5 更新对其他 NPC 的流言/视角 (update_npc_opinion)
                    if (action.update_npc_opinion) {
                        const opinion = action.update_npc_opinion;
                        const otherNpcId = opinion.npc_id;
                        if (otherNpcId && otherNpcId !== targetId) {
                            const rumors = window.sysStore.get('rg_rumors_v1') || {};
                            const pairId = [targetId, otherNpcId].sort().join('_');
                            const rumorKey = `${targetId}|${pairId}`;

                            const existingRumor = rumors[rumorKey] || {
                                observerId: targetId,
                                nodeA: [targetId, otherNpcId].sort()[0],
                                nodeB: [targetId, otherNpcId].sort()[1]
                            };

                            const sortedIds = [targetId, otherNpcId].sort();
                            const isReversed = sortedIds[0] !== targetId;

                            if (opinion.opinion_of_them) {
                                if (isReversed) existingRumor.contentBtoA = ensureStr(opinion.opinion_of_them);
                                else existingRumor.contentAtoB = ensureStr(opinion.opinion_of_them);
                            }
                            if (opinion.their_opinion_of_me) {
                                if (isReversed) existingRumor.contentAtoB = ensureStr(opinion.their_opinion_of_me);
                                else existingRumor.contentBtoA = ensureStr(opinion.their_opinion_of_me);
                            }
                            if (opinion.reason) {
                                existingRumor.reason = ensureStr(opinion.reason);
                            }
                            existingRumor.updatedAt = Date.now();

                            rumors[rumorKey] = existingRumor;
                            window.sysStore.set('rg_rumors_v1', rumors);
                            console.log(`[Rumor] ${targetId} 自动演化了对 ${otherNpcId} 的主观视角`);
                        }
                    }

                    // 2.5 提取每日作息时间表 (daily_schedule) - 智能合并
                    {
                        let newSchedule = null;
                        if (action.status && Array.isArray(action.status.daily_schedule)) {
                            newSchedule = action.status.daily_schedule;
                        } else if (Array.isArray(action.daily_schedule)) {
                            newSchedule = action.daily_schedule;
                        }

                        if (newSchedule && newSchedule.length > 0) {
                            const existingChar = window.sysStore.getCharacter(targetId);
                            const existingSchedule = existingChar?.status?.daily_schedule;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const scheduleDate = existingChar?.status?._schedule_date;

                            if (Array.isArray(existingSchedule) && existingSchedule.length > 0 && scheduleDate === todayStr) {
                                // 已有当天日程 → 智能合并：锁定已过去的时段，未来时段允许更新
                                const nowHour = new Date().getHours();
                                const nowMin = new Date().getMinutes();
                                const nowTotal = nowHour * 60 + nowMin;

                                // 辅助函数：从时间表项中提取结束时间（分钟数）
                                const getEndMinutes = (item) => {
                                    let timeStr = typeof item === 'string' ? item : (item?.time || '');
                                    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/);
                                    if (match) return parseInt(match[3]) * 60 + parseInt(match[4]);
                                    return -1;
                                };

                                // 从旧日程中保留已过去的时段（结束时间 <= 当前时间）
                                const pastSlots = existingSchedule.filter(item => {
                                    const endMin = getEndMinutes(item);
                                    return endMin > 0 && endMin <= nowTotal;
                                });

                                // 从新日程中只取未来时段（结束时间 > 当前时间）
                                const futureSlots = newSchedule.filter(item => {
                                    const endMin = getEndMinutes(item);
                                    return endMin <= 0 || endMin > nowTotal;
                                });

                                // 如果未来时段与旧日程实质相同（内容未变），跳过更新
                                const oldFuture = existingSchedule.filter(item => {
                                    const endMin = getEndMinutes(item);
                                    return endMin <= 0 || endMin > nowTotal;
                                });
                                const futureChanged = JSON.stringify(futureSlots) !== JSON.stringify(oldFuture);

                                if (futureChanged) {
                                    statusUpdate.daily_schedule = [...pastSlots, ...futureSlots];
                                    statusUpdate._schedule_date = todayStr;
                                    console.log('[Schedule] 合并日程: 保留过去时段', pastSlots.length, '更新未来时段', futureSlots.length);
                                } else {
                                    console.log('[Schedule] 日程未变化，跳过更新');
                                }
                            } else {
                                // 今天首次生成日程 或 跨天重置 → 直接使用新日程
                                statusUpdate.daily_schedule = newSchedule;
                                statusUpdate._schedule_date = todayStr;
                                console.log('[Schedule] 首次生成当天日程，共', newSchedule.length, '条');
                            }
                        }
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
                            // [Inertia Optimization] 关系阻力硬编码
                            // 如果是敌对/对立关系，好感度涨幅自动减半，除非完成关系进化
                            const rel = char?.settings?.relationship || {};
                            const pubRel = rel.public_relation || '';
                            if (['仇敌', '死对头', '竞争对手', '前任', '对立面'].includes(pubRel)) {
                                change *= 0.5;
                                console.log('[Affection] 检测到对立关系，涨幅实施 0.5 倍阻力');
                            }

                            change = Math.min(change, maxChange);
                        } else if (change < 0) {
                            // 负向扣分不设限 (Allow unlimited deduction)
                            // change = change; 
                        }

                        // Allow negative scores (No Math.max(0, ...))
                        const newAffection = Math.min(100, currentAffection + change);
                        statusUpdate.affection = newAffection.toFixed(1);

                        // 存储变化信息用于面板显示
                        statusUpdate._last_affection_change = parseFloat(change.toFixed(2));
                        statusUpdate._last_affection_reason = action.affection_reason || action.status?.inner_voice || action.inner_voice || '';

                        console.log(`[Affection] ${currentAffection} + ${change.toFixed(2)} = ${statusUpdate.affection} (难度: ${difficulty})`);
                    }

                    // 4. 只有当确实有更新内容时才应用
                    if (Object.keys(statusUpdate).length > 0) {
                        this._applyStatusUpdate(targetId, statusUpdate);
                    }
                    break;

                case 'update_rumor':
                    // [New] 自动更新角色视角的主观流言
                    try {
                        const rumorTargetA = action.targetA || action.nodeA;
                        const rumorTargetB = action.targetB || action.nodeB;
                        // 支持 v2 双向更新
                        const rumorViewAtoB = action.viewAtoB || action.contentAtoB || action.view;
                        const rumorViewBtoA = action.viewBtoA || action.contentBtoA || action.view; // 默认是对称的
                        const rumorReason = action.reason || action.content;

                        if (rumorTargetA && rumorTargetB && (rumorViewAtoB || rumorViewBtoA || rumorReason)) {
                            // 调用 RelationshipGraph 服务
                            if (window.WeChat.Services.RelationshipGraph) {
                                window.WeChat.Services.RelationshipGraph.saveRumor(
                                    targetId, // observer (当前思考的角色)
                                    rumorTargetA,
                                    rumorTargetB,
                                    {
                                        viewAtoB: rumorViewAtoB,
                                        viewBtoA: rumorViewBtoA,
                                        reason: rumorReason
                                    }
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('[Chat] Failed to auto-update rumor', e);
                    }
                    if (action.content && typeof action.content === 'string') {
                        // 如果有附带文本，也可以显示（可选）
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
                    // 1. Show System Tip (Visual reminder for user)
                    // Priority: status_update (string) > reason > status.behavior
                    let systemTip = null;
                    if (typeof action.status_update === 'string' && action.status_update) {
                        systemTip = action.status_update;
                    } else if (typeof action.reason === 'string' && action.reason) {
                        systemTip = action.reason;
                    }

                    // 2. Perform background internal status update
                    // 支持 status_update (object) 和 status (object) 两种格式
                    const ignoreStatusData = (action.status_update && typeof action.status_update === 'object')
                        ? action.status_update
                        : (action.status && typeof action.status === 'object')
                            ? action.status
                            : null;

                    if (ignoreStatusData) {
                        this._applyStatusUpdate(targetId, ignoreStatusData);
                        // 如果没有显式的系统提示，但有 behavior 描写，自动用它作为系统提示
                        if (!systemTip && ignoreStatusData.behavior) {
                            systemTip = ignoreStatusData.behavior;
                        }
                    }

                    // 3. 显示系统提示
                    if (systemTip) {
                        this.persistAndShow(targetId, systemTip, 'system');
                        hasSentVisibleMessage = true; // 避免兜底逻辑重复生成
                    }

                    console.log(`[Chat] AI ignored user: ${systemTip || '(无提示)'}`);
                    break;

                case 'status_update':
                    // Explicit system notification action
                    if (action.content || action.text || typeof action === 'string') {
                        const tipText = action.content || action.text || (typeof action === 'string' ? action : '');
                        if (tipText) {
                            this.persistAndShow(targetId, tipText, 'system');
                        }
                    }
                    break;

                case 'reject_call':
                case 'hangup_call':
                    console.log('[Chat] AI requested to hang up/reject the call');
                    if (window.WeChat.App) {
                        const vState = window.WeChat.App.State.voiceCallState;
                        const videoState = window.WeChat.App.State.videoCallState;

                        // [Fix] Handle Initiation Decision
                        if (vState && vState.open) {
                            if (vState.status === 'dialing') {
                                // AI Decided to reject while dialing
                                vState.awaitingInitiation = false;
                                // [Fix] 不在这里显示拒绝消息，让 calls.js 的 endVoiceCall 统一处理
                                // 这样可以避免重复显示，并且能正确判断显示位置
                                window.WeChat.App.endVoiceCall();
                            } else if (action.type === 'hangup_call') {
                                // AI Decided to hang up during an active call
                                window.WeChat.App.endVoiceCall();
                            } else {
                                // IMPORTANT: If status is 'connected' but AI returns 'reject_call' (initiation decision), 
                                // it means the decision is OUTDATED (user spoke or system auto-connected). 
                                // We IGNORE this and also discard the rest of this action sequence (the explanation text).
                                console.warn('[Chat] Ignoring stale reject_call action as call is already connected.');
                                return; // Stop executing further actions in this batch (like "Sorry...")
                            }
                        } else if (videoState && videoState.open) {
                            if (videoState.status === 'dialing') {
                                videoState.awaitingInitiation = false;
                                // [Fix] 不在这里显示拒绝消息，让 calls.js 的 endVideoCall 统一处理
                                // 这样可以避免重复显示，并且能正确判断显示位置
                                window.WeChat.App.endVideoCall();
                            } else if (action.type === 'hangup_call') {
                                window.WeChat.App.endVideoCall();
                            } else {
                                console.warn('[Chat] Ignoring stale reject_call action for video.');
                                return;
                            }
                        }
                    }
                    break;

                case 'waimai_request': // 外卖代付
                case 'waimai_order':   // 帮点外卖
                case 'gift':           // 送礼
                case 'gomoku_move':    // 五子棋
                case 'change_music':   // 换歌
                case 'qzone_post':     // 发朋友圈
                    if (window.WeChat?.Services?.Moments?.generateMomentForChar) {
                        window.WeChat.Services.Moments.generateMomentForChar(targetId, action.content || null);
                    }
                    break;

                case 'comment_moment': // 互动朋友圈
                    try {
                        const moments = window.WeChat?.Services?.Moments;
                        if (!moments || !action.post_id) break;

                        if (action.action === 'comment') {
                            moments.addComment(action.post_id, {
                                authorId: targetId,
                                content: action.content,
                            });
                        } else if (action.action === 'like') {
                            moments.toggleLike(action.post_id, targetId);
                        } else if (action.action === 'delete_comment' && action.comment_id) {
                            moments.deleteComment(action.post_id, action.comment_id);
                        }
                        if (window.WeChat?.App?.render) window.WeChat.App.render();
                    } catch (e) {
                        console.warn('[Chat] comment_moment action failed:', e);
                    }
                    break;

                case 'create_event':
                    // [Events System] 事件账本系统 - 记录重要事件
                    try {
                        const eventsService = window.WeChat.Services.Events;
                        if (eventsService) {
                            // 处理参与者列表
                            let participants = action.participants || ['USER_SELF'];
                            // 将 "user"/"self" 规范化
                            participants = participants.map(p => {
                                if (p === 'user' || p === 'me') return 'USER_SELF';
                                if (p === 'self') return targetId;
                                return p;
                            });
                            // 确保当前角色和用户都在参与者中
                            if (!participants.includes(targetId)) participants.push(targetId);
                            if (!participants.includes('USER_SELF')) participants.push('USER_SELF');

                            // 处理关系变化中的 "self" 和 "user" 引用
                            const relationshipChanges = (action.relationship_changes || []).map(change => ({
                                from: change.from === 'self' ? targetId : (change.from === 'user' ? 'USER_SELF' : change.from),
                                to: change.to === 'self' ? targetId : (change.to === 'user' ? 'USER_SELF' : change.to),
                                viewChange: change.viewChange || change.view_change,
                                attitudeChange: parseFloat(change.attitudeChange || change.attitude_change || 0)
                            }));

                            const eventData = {
                                type: action.event_type || 'conversation',
                                participants: participants,
                                summary: action.summary || action.content || '',
                                relationshipChanges: relationshipChanges,
                                scheduleInfo: action.schedule || null,
                                statusSnapshots: {},
                                metadata: {
                                    source: 'chat_action',
                                    originatingChar: targetId
                                }
                            };

                            // 如果有状态快照
                            if (action.status) {
                                eventData.statusSnapshots[targetId] = action.status;
                            }

                            const createdEvent = eventsService.createEvent(eventData);
                            console.log('[Chat] Created event:', createdEvent.id, createdEvent.summary);

                            // 如果有日程，显示提示
                            if (action.schedule) {
                                const scheduleStr = `${action.schedule.date || ''} ${action.schedule.time || ''} ${action.schedule.activity || ''}`.trim();
                                this.persistAndShow(targetId, `(已添加日程: ${scheduleStr})`, 'system');
                            }
                        } else {
                            console.warn('[Chat] Events service not available');
                        }
                    } catch (e) {
                        console.error('[Chat] Failed to create event:', e);
                    }
                    break;


                case 'update_relationship':
                    // [New Feature] AI 自主更新关系网 (v31: 支持任意两人关系)
                    console.log('[Chat] AI is updating relationship graph:', action);
                    try {
                        const rgService = window.WeChat.Services.RelationshipGraph;
                        if (!rgService) break;

                        const myId = targetId; // 当前聊天的角色 ID (观察者)

                        // 1. 解析双方 ID (Source & Target)
                        // 默认 Source 是用户 (USER_SELF)
                        let sourceNodeId = 'USER_SELF';
                        let targetNodeId = action.target_id;

                        const allNodes = rgService.getAllNodes();

                        // 查找 Source
                        if (action.source_id) {
                            sourceNodeId = action.source_id;
                        } else if (action.source_name) {
                            // 让 AI 可以说 "D" 或 "User"
                            if (action.source_name.toLowerCase() === 'user' || action.source_name === '我') {
                                sourceNodeId = 'USER_SELF';
                            } else {
                                const match = allNodes.find(n => n.name.includes(action.source_name));
                                if (match) sourceNodeId = match.id;
                            }
                        }

                        // 查找 Target
                        if (!targetNodeId && action.target_name) {
                            const match = allNodes.find(n => n.name.includes(action.target_name));
                            if (match) targetNodeId = match.id;
                        }

                        // [Safety] 防止自己连自己
                        if (sourceNodeId === targetNodeId) break;

                        // 只有当涉及到“第三方”时才处理
                        // 只要 Source 或 Target 其中之一不是我自己(myId)，就说明是“我在观察别人的关系”
                        // 或者是我自己在跟其中一人发生关系
                        if (targetNodeId && sourceNodeId) {

                            // 获取现存关系 (注意顺序可能是反的，getRelationship 会自动处理)
                            let rel = rgService.getRelationship(sourceNodeId, targetNodeId);
                            let isNew = false;

                            // 如果关系不存在，而且 AI 断定由于“出轨/八卦”需要创建它
                            if (!rel) {
                                isNew = true;
                                rel = {
                                    nodeA: sourceNodeId,
                                    nodeB: targetNodeId,
                                    aViewOfB: action.relation || "未知关系",
                                    aTowardB: "未知",
                                    bViewOfA: action.relation || "未知关系",
                                    bTowardA: "未知",
                                    visibleTo: [], // 初始谁都不可见
                                    backstory: `[自动记录] 由 ${targetId} 在聊天中发现/推断出此关系。`
                                };
                            }

                            // 核心动作：可视性更新
                            // 如果 action.visibility 是 'add_self'，或者这是个新关系，
                            // 则把当前聊天角色(myId)加入 visibleTo，表示“我知道了”
                            if (action.visibility === 'add_self' || isNew) {
                                const currentVis = rel.visibleTo || [];
                                if (!currentVis.includes(myId)) {

                                    // [v33 Logic] 罗生门检查
                                    // 如果我只是一个旁观者 (myId 不是 A 也不是 B)
                                    // 并且我试图定义的关系 (action.relation) 与客观事实不符
                                    // 那么我不应该修改客观事实，而应该产生一条“流言”
                                    const isObserver = (rel.nodeA !== myId && rel.nodeB !== myId);

                                    // 判断关系描述是否冲突 (简单字符串包含检查)
                                    // 例如客观是"仇人"，我说"恋人"，则冲突
                                    // 如果客观是"未知"，我说"恋人"，则不算冲突，可以直接更新
                                    const conflictA = rel.aViewOfB && action.relation && !rel.aViewOfB.includes(action.relation) && rel.aViewOfB !== '未知关系';
                                    const conflictB = rel.bViewOfA && action.relation && !rel.bViewOfA.includes(action.relation) && rel.bViewOfA !== '未知关系';

                                    if (isObserver && (conflictA || conflictB)) {
                                        // 产生流言！
                                        rgService.saveRumor(myId, rel.nodeA, rel.nodeB, action.relation);

                                        // 同时也必须让自己可见这条关系（虽然看到的将是流言）
                                        const newVis = [...currentVis, myId];
                                        const saveData = { ...rel, visibleTo: newVis }; // 只更新可见性，不更新 View
                                        rgService.saveRelationship(saveData);

                                        console.log(`[RG] Rumor Created: ${myId} thinks ${rel.nodeA}-${rel.nodeB} is ${action.relation}`);
                                        this.persistAndShow('system', `(系统提示: ${targetId} 对 ${action.source_name || rel.nodeA} 与 ${action.target_name || rel.nodeB} 的关系产生了【主观误解/流言】，这不会影响事实真相)`, 'system');

                                    } else {
                                        // 没有冲突，或者我是当事人 -> 更新客观事实
                                        const newVis = [...currentVis, myId];
                                        const saveData = {
                                            nodeA: rel.nodeA,
                                            nodeB: rel.nodeB,
                                            aViewOfB: rel.aViewOfB,
                                            aTowardB: rel.aTowardB,
                                            bViewOfA: rel.bViewOfA,
                                            bTowardA: rel.bTowardA,
                                            visibleTo: newVis,
                                            backstory: rel.backstory
                                        };

                                        // 更新 View
                                        if (action.relation) {
                                            // 因为 AI 给的一个 relation 不分方向，我们这里假设双向更新，或者仅是一个模糊更新
                                            // 但因为这通常是新建关系或者 User 参与的关系，直接更新是可以接受的
                                            // 如果是第三方无冲突更新，也可以更新
                                            // v33: 尽量保守，只在非第三方或新关系时更新文本
                                            if (!isObserver || isNew) {
                                                saveData.backstory = (saveData.backstory || '') + `\n[${new Date().toLocaleDateString()}] ${myId} 发现了这段关系: "${action.relation}"`;
                                                // 这里不强行覆盖 aViewOfB，除非是 Unknown
                                            }
                                        }

                                        rgService.saveRelationship(saveData);

                                        const sName = (sourceNodeId === 'USER_SELF') ? '你' : (action.source_name || sourceNodeId);
                                        const tName = (targetNodeId === 'USER_SELF') ? '你' : (action.target_name || targetNodeId);
                                        this.persistAndShow('system', `(系统提示: ${targetId} 记住了 ${sName} 与 ${tName} 的关系，关系网已更新)`, 'system');
                                        console.log(`[RG] Relation ${sourceNodeId}-${targetNodeId} is now visible to ${myId}`);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[Chat] Failed to update relationship:', e);
                    }
                    break;
            }

            // 标记可见消息类型
            const visibleTypes = ['text', 'sticker', 'image', 'voice', 'nudge', 'transfer', 'location', 'video_call', 'link', 'send_and_recall'];
            if (visibleTypes.includes(action.type)) {
                hasSentVisibleMessage = true;
            }
            // 记录 behavior 用于兜底
            if (action.type === 'update_thoughts' || action.type === 'ignore_and_log') {
                const b = action.status?.behavior || action.behavior;
                if (b) lastBehavior = b;
            }
        }

        // 兜底：如果 AI 没发送任何可见消息，也没有 ignore_and_log 系统提示，
        // 则用 behavior 自动生成系统提示
        if (!hasSentVisibleMessage && lastBehavior && !isInActiveCall) {
            this.persistAndShow(targetId, lastBehavior, 'system');
            console.log('[Chat] 自动生成系统提示（无可见消息）:', lastBehavior);
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
            // 使用统一错误处理
            if (window.ErrorHandler) {
                window.ErrorHandler.setContext({
                    sessionId: this._activeSession,
                    action: 'playVoiceMessage'
                });
                window.ErrorHandler.handle(e, {
                    level: window.ErrorHandler.Level.ERROR,
                    type: window.ErrorHandler.Type.API,
                    message: '语音播放失败',
                    metadata: { msgId }
                });
            } else {
                // Fallback
                console.error('[Chat] Play Voice Error:', e);
                if (window.os) window.os.showToast('播放错误: ' + e.message, 'error');
            }
        } finally {
            if (bubble) bubble.style.opacity = '1';
        }
    },

    persistAndShow(targetId, content, type, extra = {}) {
        if (!content) return;
        // [Fix] 如果 extra 中指定了 sender_id 和 receiver_id，使用它们；否则使用默认逻辑
        const senderId = extra.sender_id !== undefined ? extra.sender_id : targetId;
        const receiverId = extra.receiver_id !== undefined ? extra.receiver_id : 'user';

        // [Fix] 防止创建无效会话（如果 targetId 是 'user' 或 'me'，且没有明确指定 receiver_id）
        if (senderId === 'me' || senderId === 'user') {
            // 如果发送者是用户，接收者必须是角色ID（targetId）
            if (!receiverId || receiverId === 'user' || receiverId === 'me') {
                console.error('[Chat] persistAndShow: Invalid receiver_id for user message', { targetId, senderId, receiverId });
                return;
            }
        }

        // [OPTIMIZATION] 清除上下文缓存，因为新消息已添加
        if (targetId === this._activeSession) {
            this._contextCache = null;
        }

        const msg = window.sysStore.addMessage({
            sender_id: senderId,
            receiver_id: receiverId,
            content: content,
            type: type,
            ...extra
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

            try {
                await this.executeActions(targetId, actions);
            } finally {
                // [FIX] 确保即使 executeActions 出错，打字状态也会被清除
                if (isCurrentlyActive) this.setTypingState(false);
            }

        } catch (e) {
            console.error('[ChatService] Background activity failed:', e);
            // [FIX] 确保错误时也清除打字状态（双重保险）
            const isCurrentlyActive = this._activeSession === targetId;
            if (isCurrentlyActive) this.setTypingState(false);
        }
    },

    // --- Helpers (Copied from previous implementation or simplified) ---

    updateUI(msg) {
        if (!window.WeChat.UI || !window.WeChat.UI.Bubbles) return;

        // [Voice Call Integration] 
        // If it's a voice/video call message OR if a call is currently open, we need to refresh the call UI
        const appState = window.WeChat.App.State;
        const isInCall = (appState && appState.voiceCallState && appState.voiceCallState.open) ||
            (appState && appState.videoCallState && appState.videoCallState.open);

        if (isInCall) {
            window.WeChat.App.render();
            // Explicitly scroll call subtitles
            setTimeout(() => {
                const callSubs = document.getElementById('wx-call-subs');
                if (callSubs) {
                    callSubs.scrollTop = callSubs.scrollHeight;
                }
            }, 100);

            // If it's ONLY a voice call message, we don't need to update the main chat list DOM
            if (msg.type === 'voice_text') return;
        }

        // [Sync Fix] Never append voice-call specific messages to the main chat view DOM (for session switch recovery)
        if (msg.type === 'voice_text') return;

        // [Fix] Skip hidden system messages (visible to AI but not in UI)
        if (msg.type === 'system' && msg.hidden === true) return;

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
            timestamp: msg.timestamp || Date.now(),
            // [Fix] 传递额外信息给 bubbles.js，用于正确显示通话状态
            initiatedByUser: msg.initiatedByUser,
            isVideo: msg.isVideo
        };

        // [Logic] Date/Time rendering (5-minute rule)
        // Auto-detect session derived from the message itself
        const activeSess = isMe ? msg.receiver_id : msg.sender_id;
        const messages = window.sysStore.getMessagesBySession(activeSess);

        // [Fix] Sort messages by timestamp to ensure correct order
        const sortedMessages = [...messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // Find current message index
        const currentIndex = sortedMessages.findIndex(m => m.id === msg.id);
        const prevMsg = (currentIndex > 0) ? sortedMessages[currentIndex - 1] : null;

        // [Fix] Show timestamp if:
        // 1. This is the first message (no previous message)
        // 2. Current message not found in list (new message, show timestamp)
        // 3. Time difference > 5 minutes
        if (currentIndex === -1 || currentIndex === 0 || !prevMsg || (bubbleData.timestamp - prevMsg.timestamp > 5 * 60 * 1000)) {
            const timeStr = window.WeChat.Views && window.WeChat.Views._formatChatTime
                ? window.WeChat.Views._formatChatTime(bubbleData.timestamp)
                : new Date(bubbleData.timestamp).toLocaleTimeString();
            cnt.insertAdjacentHTML('beforeend', `<div class="wx-msg-time" onclick="window.WeChat.Views.toggleMsgTime(this, ${bubbleData.timestamp})">${timeStr}</div>`);
        }

        cnt.insertAdjacentHTML('beforeend', window.WeChat.UI.Bubbles.render(bubbleData));

        setTimeout(() => {
            if (view) view.scrollTo({ top: view.scrollHeight, behavior: 'smooth' });
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
