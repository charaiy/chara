/**
 * js/apps/wechat/services/calls.js
 * 语音/视频通话服务 - 处理语音和视频通话的完整生命周期
 * 
 * 职责：
 * - 发起语音/视频通话
 * - 处理通话状态管理（拨号中、已接通、已结束、已拒绝）
 * - 处理通话中的消息发送（voice_text类型）
 * - 处理通话结束和总结
 * - 处理AI拒绝通话的逻辑
 * - 发送隐藏系统消息给AI（让AI理解通话事件）
 * 
 * 功能模块：
 * 1. 语音通话：
 *    - triggerVoiceCall(): 发起语音通话
 *    - endVoiceCall(): 结束语音通话
 *    - handleVoiceCallAccept(): 处理接听
 *    - handleVoiceCallReject(): 处理拒绝
 * 
 * 2. 视频通话：
 *    - triggerVideoCall(): 发起视频通话
 *    - endVideoCall(): 结束视频通话
 *    - handleVideoCallAccept(): 处理接听
 *    - handleVideoCallReject(): 处理拒绝
 * 
 * 3. 通话状态管理：
 *    - 状态：'dialing'（拨号中）、'connected'（已接通）、'ended'（已结束）
 *    - 计时器管理（通话时长）
 *    - 状态持久化
 * 
 * 4. 通话消息处理：
 *    - 通话中的消息标记为 'voice_text' 类型
 *    - 通话结束后生成通话总结
 *    - 发送隐藏系统消息给AI（告知通话事件）
 * 
 * 特殊逻辑：
 * - 用户拒绝：显示"已拒绝"在用户侧
 * - 角色拒绝：显示"对方已拒绝"在用户侧
 * - AI理解拒绝：通过隐藏系统消息让AI知道通话被拒绝
 * 
 * [Refactor] Extracted from index.js to reduce file size
 * 
 * 依赖：
 * - window.WeChat.Services.WebRTC: WebRTC底层API（可选）
 * - window.WeChat.Services.Chat: 聊天服务（发送消息）
 * - window.sysStore: 数据存储
 * - window.WeChat.App: 应用主对象
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Calls = {
    // 获取 State 和 App 的引用
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    // --- Voice Call Logic ---
    triggerVoiceCall() {
        this.App.toggleExtraPanel();
        const State = this.State;
        const sessionId = State.activeSessionId;
        // [Fix] 验证会话ID有效性，防止创建无效会话
        if (!sessionId || sessionId === 'user' || sessionId === 'me') {
            if (window.ErrorHandler) {
                window.ErrorHandler.handle(new Error('Invalid session ID'), {
                    level: window.ErrorHandler.Level.WARNING,
                    type: window.ErrorHandler.Type.VALIDATION,
                    message: '无法拨打电话：请先选择一个联系人',
                    metadata: { sessionId }
                });
            } else {
                console.error('[Calls] triggerVoiceCall: Invalid session ID', sessionId);
                if (window.os) window.os.showToast('无法拨打电话：请先选择一个联系人', 'error');
            }
            return;
        }
        const char = window.sysStore.getCharacter(sessionId);

        State.voiceCallState = {
            open: true,
            sessionId: sessionId,
            status: 'dialing',
            name: char ? (char.name || sessionId) : '未知用户',
            avatar: char?.avatar || 'assets/images/avatar_placeholder.png',
            dialStartTime: Date.now(), // Capture REAL start (dialing)
            startTime: Date.now(),
            timer: null,
            initiatedByUser: true // [Fix] 标记是用户主动拨打的
        };
        this.App.render();

        // 1. Trigger AI thinking immediately
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            State.voiceCallState.awaitingInitiation = true;
            // [Fix] 确保会话已设置，避免创建新会话
            window.WeChat.Services.Chat.openSession(sessionId);
            window.WeChat.Services.Chat.triggerAIReply();
        }

        // [New] Timeout protection: 60s if AI never answers or rejects (increased from 30s to allow for longer AI processing)
        const cId = State.voiceCallState.sessionId;
        if (!cId) {
            console.error('[Calls] triggerVoiceCall: No session ID available');
            return;
        }
        setTimeout(() => {
            const call = State.voiceCallState;
            // [Fix] 检查状态：只有在仍然是 'dialing' 且没有等待AI决定时才显示"无应答"
            // 如果 awaitingInitiation 为 false，说明AI已经做出决定（接听或拒绝），不应该显示"无应答"
            // 如果状态已经是 'connected'，说明已经接通，不应该显示"无应答"
            // [Fix] 如果AI正在处理中，也不应该显示"无应答"
            const isAIProcessing = window.WeChat.Services.Chat && window.WeChat.Services.Chat._isRequesting === true;
            if (call.open && call.sessionId === cId && call.status === 'dialing' && call.awaitingInitiation !== false && !isAIProcessing) {
                console.warn('[Call] No response from AI after 60s, marking as unanswered.');
                // [Fix] 用户主动拨打，无应答应该显示在右侧
                // [Fix] 确保使用正确的会话ID，避免创建新会话
                if (cId && cId !== 'user' && cId !== 'me') {
                    window.WeChat.Services.Chat.persistAndShow(cId, 'no_answer', 'call_status', {
                        sender_id: 'me',
                        receiver_id: cId  // [Fix] 明确指定接收者，确保消息属于正确的会话
                    });
                }
                call.open = false;
                call.awaitingInitiation = false; // [Fix] 标记不再等待，避免重复处理
                this.App.render();
            } else if (isAIProcessing) {
                // [Fix] 如果AI正在处理中，延长超时时间，再等30秒
                console.log('[Call] AI is still processing, extending timeout by 30s...');
                setTimeout(() => {
                    const call2 = State.voiceCallState;
                    const isStillProcessing = window.WeChat.Services.Chat && window.WeChat.Services.Chat._isRequesting === true;
                    if (call2.open && call2.sessionId === cId && call2.status === 'dialing' && call2.awaitingInitiation !== false && !isStillProcessing) {
                        console.warn('[Call] No response from AI after extended timeout (90s), marking as unanswered.');
                        if (cId && cId !== 'user' && cId !== 'me') {
                            window.WeChat.Services.Chat.persistAndShow(cId, 'no_answer', 'call_status', {
                                sender_id: 'me',
                                receiver_id: cId
                            });
                        }
                        call2.open = false;
                        call2.awaitingInitiation = false;
                        this.App.render();
                    }
                }, 30000);
            }
        }, 60000); // [Fix] 增加到60秒，给AI更多时间处理
    },

    endVoiceCall() {
        const State = this.State;
        if (State.voiceCallState.timer) clearInterval(State.voiceCallState.timer);
        
        // [New] 停止媒体流
        if (window.WeChat.Services.WebRTC) {
            window.WeChat.Services.WebRTC.endCall();
        }
        
        const durationStr = State.voiceCallState.durationStr || '00:00';
        const sessionId = State.voiceCallState.sessionId;
        const callStartTime = State.voiceCallState.dialStartTime || State.voiceCallState.startTime || Date.now();
        const callEndTime = Date.now();
        const lastStatus = State.voiceCallState.status;
        const awaitingDecision = State.voiceCallState.awaitingInitiation;

        // [Fix] 如果通话未接通就被拒绝，立即关闭通话页面，不显示"通话结束"
        if (lastStatus === 'dialing') {
            State.voiceCallState.open = false;
            State.voiceCallState.minimized = false;
            State.voiceCallState.timer = null;
            this.App.render();
        } else {
            // 通话已连接，显示"通话结束"后再关闭
            State.voiceCallState.status = 'ended';
            State.voiceCallState.timer = null;
            this.App.render();
        }
        
        setTimeout(() => {
            // [Fix] 如果通话未接通，已经在上面关闭了，这里只需要处理已连接的情况
            if (lastStatus === 'connected') {
                State.voiceCallState.open = false;
                State.voiceCallState.minimized = false;
                this.App.render();
            }

            if (sessionId) {
                if (lastStatus === 'connected') {
                    // 通话已连接，用户主动挂断 - 只显示通话时长，不显示状态消息
                    window.WeChat.Services.Chat.sendMessage(JSON.stringify({
                        duration: durationStr,
                        summary: null,
                        callStartTime,
                        callEndTime
                    }), 'call_summary');
                    
                    // [New] 发送系统消息告知 AI 用户主动挂断了通话，话题可能还没结束（隐藏显示）
                    window.WeChat.Services.Chat.persistAndShow(sessionId, `[系统提示] 用户主动挂断了语音通话（通话时长 ${durationStr}）。话题可能还没聊完，你可以根据刚才的对话内容和你的性格，决定是否要继续这个话题或表达你的感受。`, 'system', { hidden: true });
                    
                    // Trigger AI response to the call end event
                    // [Fix] 确保会话已设置，避免创建新会话
                    window.WeChat.Services.Chat.openSession(sessionId);
                    window.WeChat.Services.Chat.triggerAIReply();
                } else if (lastStatus === 'dialing') {
                    // 通话未接通就被挂断 - 区分用户取消和对方拒绝
                    // [Fix] 如果用户主动拨打（initiatedByUser = true），被拒绝时应该显示在右侧
                    const wasInitiatedByUser = State.voiceCallState.initiatedByUser === true;
                    const statusCode = awaitingDecision ? 'cancel' : 'reject';
                    // 如果用户主动拨打被拒绝，消息应该显示在右侧（用户自己的位置）
                    const realSender = (awaitingDecision || wasInitiatedByUser) ? 'me' : sessionId;
                    // [Fix] 如果发送者是用户，需要明确指定接收者为角色ID
                    const extra = {
                        sender_id: realSender,
                        isVideo: false,
                        initiatedByUser: wasInitiatedByUser  // [Fix] 传递"用户主动发起"的信息
                    };
                    if (realSender === 'me') {
                        extra.receiver_id = sessionId;  // [Fix] 确保消息属于正确的会话
                    }
                    window.WeChat.Services.Chat.persistAndShow(sessionId, statusCode, 'call_status', extra);
                    
                    // [Fix] 发送隐藏的系统消息，明确告诉AI发生了什么，确保角色理解拒绝逻辑
                    if (!awaitingDecision && statusCode === 'reject' && wasInitiatedByUser) {
                        // 用户主动拨打，角色拒绝
                        window.WeChat.Services.Chat.persistAndShow(sessionId, 
                            `[系统提示] 用户主动向你发起了语音通话，但你拒绝了这次通话邀请。你可以根据你的性格、当前心情和与用户的关系，决定是否要解释拒绝的原因，或者继续其他话题。`, 
                            'system', 
                            { hidden: true }
                        );
                    } else if (awaitingDecision && statusCode === 'cancel') {
                        // 用户取消了通话（在角色做出决定之前）
                        window.WeChat.Services.Chat.persistAndShow(sessionId, 
                            `[系统提示] 用户主动向你发起了语音通话，但在你做出决定之前，用户取消了这次通话。`, 
                            'system', 
                            { hidden: true }
                        );
                    }
                    
                    // Trigger AI response to the missed event
                    // [Fix] 确保会话已设置，避免创建新会话
                    window.WeChat.Services.Chat.openSession(sessionId);
                    window.WeChat.Services.Chat.triggerAIReply();
                }
            }
        }, 800);
    },

    triggerVoiceCallInput() {
        const State = this.State;
        if (!State.voiceCallState || !State.voiceCallState.open) return;
        const sessionId = State.voiceCallState.sessionId || State.activeSessionId;

        this.App.openPromptModal({
            title: '在通话中输入消息',
            content: '',
            placeholder: '请输入...',
            onConfirm: (val) => {
                if (val && val.trim()) {
                    // [Synchronization] Ensure session is set for Chat service
                    if (sessionId) window.WeChat.Services.Chat.openSession(sessionId);
                    if (sessionId) window.WeChat.Services.Chat.openSession(sessionId);
                    // Use 'voice_text' type to hide from main chat but show in call modal
                    window.WeChat.Services.Chat.sendMessage(val.trim(), 'voice_text');
                    // Force render to show new subtitle
                    this.App.render();
                }
            }
        });
    },

    triggerVoiceCallReply() {
        const State = this.State;
        if (!State.voiceCallState || !State.voiceCallState.open) return;
        const sessionId = State.voiceCallState.sessionId || State.activeSessionId;

        // [FIX] 防止重复点击
        const chatService = window.WeChat.Services && window.WeChat.Services.Chat;
        if (!chatService) return;
        
        // 如果已经在请求中，忽略
        if (chatService._isRequesting) {
            console.warn('[Calls] triggerVoiceCallReply: Already requesting, ignoring duplicate call');
            return;
        }

        // [Synchronization] Ensure session is set for Chat service
        if (sessionId) chatService.openSession(sessionId);
        
        // [FIX] 添加超时保护：如果 200 秒内没有完成，强制清除状态
        const timeoutId = setTimeout(() => {
            if (chatService._isRequesting) {
                console.warn('[Calls] triggerVoiceCallReply: Timeout after 200s, forcing cleanup');
                chatService._isRequesting = false;
                chatService.setTypingState(false);
                // 强制更新UI
                if (window.WeChat.App) window.WeChat.App.render();
                // 使用统一错误处理
                if (window.ErrorHandler) {
                    window.ErrorHandler.handle(new Error('Reply timeout'), {
                        level: window.ErrorHandler.Level.WARNING,
                        type: window.ErrorHandler.Type.API,
                        message: '回复超时，请重试',
                        metadata: { sessionId, timeout: '200s' }
                    });
                } else if (window.os && window.os.showToast) {
                    window.os.showToast('回复超时，请重试', 'error');
                }
            }
        }, 200000); // 200秒超时
        
        // 执行回复，并在完成后清除超时
        (async () => {
            try {
                await chatService.triggerAIReply();
            } catch (e) {
                // 使用统一错误处理
                if (window.ErrorHandler) {
                    window.ErrorHandler.setContext({
                        sessionId: sessionId,
                        action: 'triggerVoiceCallReply'
                    });
                    window.ErrorHandler.handle(e, {
                        level: window.ErrorHandler.Level.ERROR,
                        type: window.ErrorHandler.Type.API,
                        message: '通话回复失败',
                        metadata: { sessionId }
                    });
                } else {
                    console.error('[Calls] triggerVoiceCallReply error:', e);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        })();
        // User requested to remove the toast and use button UI feedback instead
    },

    async generateCallSummary(sessionId, duration) {
        if (!window.Core || !window.Core.Api) return;
        const msgs = window.sysStore.getMessagesBySession(sessionId);

        // Get messages from the last 100 to ensure full context coverage
        const recentMsgs = msgs.slice(-100).map(m => `${m.sender_id === 'me' ? 'User' : 'Char'}: ${m.content} `).join('\n');

        const prompt = `
        Summarize the following voice call transcript in under 200 words. 
        Focus on the emotional tone and key topics. 
        Return ONLY the summary text in Chinese.

    Transcript:
        ${recentMsgs}
`;

        try {
            const summary = await window.Core.Api.chat([
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ]);

            // Update the last message (which should be the call_summary)
            const currentMsgs = window.sysStore.getMessagesBySession(sessionId);
            const lastMsg = currentMsgs[currentMsgs.length - 1];
            if (lastMsg && lastMsg.type === 'call_summary') {
                const data = JSON.parse(lastMsg.content);
                data.summary = summary;
                lastMsg.content = JSON.stringify(data);
                // Persist (compat layer - in IndexedDB mode set() already persists, keep call for safety)
                if (window.sysStore && window.sysStore.save) window.sysStore.save();
                if (window.WeChat.Services.Chat.updateUI) window.WeChat.Services.Chat.updateUI(lastMsg);
            }
        } catch (e) {
            // 使用统一错误处理
            if (window.ErrorHandler) {
                window.ErrorHandler.handle(e, {
                    level: window.ErrorHandler.Level.WARNING,
                    type: window.ErrorHandler.Type.API,
                    message: '通话总结生成失败',
                    showToast: false,
                    metadata: { sessionId }
                });
            } else {
                console.error('Failed to generate call summary', e);
            }
        }
    },

    openCallSummary(msgId) {
        const State = this.State;
        const msg = window.sysStore.getMessageById(msgId);
        if (!msg) return;

        // Determine session from msg
        const sessionId = msg.sender_id === 'user' || msg.sender_id === 'me' ? msg.receiver_id : msg.sender_id;
        const msgs = window.sysStore.getMessagesBySession(sessionId);

        let data = {};
        try { data = JSON.parse(msg.content || '{}'); } catch (e) { data = {}; }

        const duration = data.duration || '00:00';
        const callStartTime = Number(data.callStartTime) || 0;
        const callEndTime = Number(data.callEndTime) || 0;

        // Build transcript for THIS call window only
        let transcript = [];
        const msgTypes = ['text', 'voice_text', 'voice'];

        const char = window.sysStore.getCharacter(sessionId);
        const charName = char?.name || '对方';

        if (callStartTime > 0 && callEndTime > 0 && callEndTime >= callStartTime) {
            // Buffer: -5000ms to catch the start trigger reliably
            const bufferedStart = callStartTime - 5000;
            transcript = msgs
                .filter(m => msgTypes.includes(m.type) && m.timestamp >= bufferedStart && m.timestamp <= callEndTime)
                .map(m => {
                    const isMe = (m.sender_id === 'user' || m.sender_id === 'me');
                    return {
                        ts: m.timestamp,
                        isMe: isMe,
                        senderName: isMe ? '我' : charName,
                        text: m.type === 'voice' ? '[语音消息]' : String(m.content || '')
                    };
                });
            console.log(`[Call History] Found ${transcript.length} msgs in window ${bufferedStart}-${callEndTime}`);
        } else {
            // Fallback: last 30 related messages
            transcript = msgs
                .filter(m => msgTypes.includes(m.type))
                .slice(-30)
                .map(m => {
                    const isMe = (m.sender_id === 'user' || m.sender_id === 'me');
                    return {
                        ts: m.timestamp,
                        isMe: isMe,
                        senderName: isMe ? '我' : charName,
                        text: m.type === 'voice' ? '[语音消息]' : String(m.content || '')
                    };
                });
            console.log(`[Call History] Fallback mode: Found ${transcript.length} msgs`);
        }

        State.callSummaryModal = {
            open: true,
            msgId,
            sessionId,
            duration,
            callStartTime,
            callEndTime,
            transcript
        };
        this.App.render();
    },

    closeCallSummaryModal() {
        const State = this.State;
        if (State.callSummaryModal) State.callSummaryModal.open = false;
        this.App.render();
    },

    minimizeVoiceCall() {
        const State = this.State;
        if (State.voiceCallState) {
            State.voiceCallState.minimized = true;
            this.App.render();
        }
    },

    restoreVoiceCall() {
        const State = this.State;
        if (State.voiceCallState) {
            State.voiceCallState.minimized = false;
            this.App.render();
        }
    },

    // --- Video Call Logic ---
    triggerVideoCall() {
        this.App.toggleExtraPanel();
        const State = this.State;
        const sessionId = State.activeSessionId;
        // [Fix] 验证会话ID有效性，防止创建无效会话
        if (!sessionId || sessionId === 'user' || sessionId === 'me') {
            console.error('[Calls] triggerVideoCall: Invalid session ID', sessionId);
            if (window.os) window.os.showToast('无法拨打视频通话：请先选择一个联系人', 'error');
            return;
        }
        const char = window.sysStore.getCharacter(sessionId);

        State.videoCallState = {
            open: true,
            sessionId: sessionId,
            status: 'dialing',
            name: char ? (char.name || sessionId) : '未知用户',
            avatar: char?.avatar || 'assets/images/avatar_placeholder.png',
            dialStartTime: Date.now(),
            startTime: Date.now(),
            timer: null,
            initiatedByUser: true // [Fix] 标记是用户主动拨打的
        };
        
        console.log('[Calls] triggerVideoCall: videoCallState set', State.videoCallState);
        this.App.render();

        // 1. Trigger AI thinking immediately
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            State.videoCallState.awaitingInitiation = true;
            // [Fix] 确保会话已设置，避免创建新会话
            window.WeChat.Services.Chat.openSession(sessionId);
            window.WeChat.Services.Chat.triggerAIReply();
        }

        // [New] Timeout protection: 60s if AI never answers or rejects (increased from 30s to allow for longer AI processing)
        const vId = State.videoCallState.sessionId;
        if (!vId) {
            console.error('[Calls] triggerVideoCall: No session ID available');
            return;
        }
        setTimeout(() => {
            const vcall = State.videoCallState;
            // [Fix] 检查状态：只有在仍然是 'dialing' 且没有等待AI决定时才显示"无应答"
            // 如果 awaitingInitiation 为 false，说明AI已经做出决定（接听或拒绝），不应该显示"无应答"
            // 如果状态已经是 'connected'，说明已经接通，不应该显示"无应答"
            // [Fix] 如果AI正在处理中，也不应该显示"无应答"
            const isAIProcessing = window.WeChat.Services.Chat && window.WeChat.Services.Chat._isRequesting === true;
            if (vcall.open && vcall.sessionId === vId && vcall.status === 'dialing' && vcall.awaitingInitiation !== false && !isAIProcessing) {
                console.warn('[Calls] Video call timeout: No response from AI after 60s');
                // [Fix] 用户主动拨打，无应答应该显示在右侧
                // [Fix] 确保使用正确的会话ID，避免创建新会话
                if (vId && vId !== 'user' && vId !== 'me') {
                    window.WeChat.Services.Chat.persistAndShow(vId, 'no_answer', 'call_status', { 
                        isVideo: true,
                        sender_id: 'me',
                        receiver_id: vId  // [Fix] 明确指定接收者，确保消息属于正确的会话
                    });
                }
                vcall.open = false;
                vcall.awaitingInitiation = false; // [Fix] 标记不再等待，避免重复处理
                this.App.render();
            } else if (isAIProcessing) {
                // [Fix] 如果AI正在处理中，延长超时时间，再等30秒
                console.log('[Calls] AI is still processing video call, extending timeout by 30s...');
                setTimeout(() => {
                    const vcall2 = State.videoCallState;
                    const isStillProcessing = window.WeChat.Services.Chat && window.WeChat.Services.Chat._isRequesting === true;
                    if (vcall2.open && vcall2.sessionId === vId && vcall2.status === 'dialing' && vcall2.awaitingInitiation !== false && !isStillProcessing) {
                        console.warn('[Calls] Video call timeout: No response from AI after extended timeout (90s)');
                        if (vId && vId !== 'user' && vId !== 'me') {
                            window.WeChat.Services.Chat.persistAndShow(vId, 'no_answer', 'call_status', { 
                                isVideo: true,
                                sender_id: 'me',
                                receiver_id: vId
                            });
                        }
                        vcall2.open = false;
                        vcall2.awaitingInitiation = false;
                        this.App.render();
                    }
                }, 30000);
            }
        }, 60000); // [Fix] 增加到60秒，给AI更多时间处理
    },

    endVideoCall() {
        const State = this.State;
        if (State.videoCallState.timer) clearInterval(State.videoCallState.timer);
        
        // [New] 停止媒体流
        if (window.WeChat.Services.WebRTC) {
            window.WeChat.Services.WebRTC.endCall();
        }
        
        const durationStr = State.videoCallState.durationStr || '00:00';
        const sessionId = State.videoCallState.sessionId;
        const callStartTime = State.videoCallState.dialStartTime || State.videoCallState.startTime || Date.now();
        const callEndTime = Date.now();
        const lastStatus = State.videoCallState.status;
        const awaitingDecision = State.videoCallState.awaitingInitiation;

        // [Fix] 如果通话未接通就被拒绝，立即关闭通话页面，不显示"通话结束"
        if (lastStatus === 'dialing') {
            State.videoCallState.open = false;
            State.videoCallState.minimized = false;
            State.videoCallState.timer = null;
            this.App.render();
        } else {
            // 通话已连接，显示"通话结束"后再关闭
            State.videoCallState.status = 'ended';
            State.videoCallState.timer = null;
            this.App.render();
        }
        
        setTimeout(() => {
            // [Fix] 如果通话未接通，已经在上面关闭了，这里只需要处理已连接的情况
            if (lastStatus === 'connected') {
                State.videoCallState.open = false;
                State.videoCallState.minimized = false;
                this.App.render();
            }

            if (sessionId) {
                if (lastStatus === 'connected') {
                    // 视频通话已连接，用户主动挂断 - 只显示通话时长，不显示状态消息
                    window.WeChat.Services.Chat.sendMessage(JSON.stringify({
                        duration: durationStr,
                        summary: null,
                        callStartTime,
                        callEndTime,
                        type: 'video'
                    }), 'call_summary');
                    
                    // [New] 发送系统消息告知 AI 用户主动挂断了通话，话题可能还没结束（隐藏显示）
                    window.WeChat.Services.Chat.persistAndShow(sessionId, `[系统提示] 用户主动挂断了视频通话（通话时长 ${durationStr}）。话题可能还没聊完，你可以根据刚才的对话内容和你的性格，决定是否要继续这个话题或表达你的感受。`, 'system', { hidden: true });
                    
                    // Trigger AI response to the call end event
                    // [Fix] 确保会话已设置，避免创建新会话
                    window.WeChat.Services.Chat.openSession(sessionId);
                    window.WeChat.Services.Chat.triggerAIReply();
                } else if (lastStatus === 'dialing') {
                    // 视频通话未接通就被挂断 - 区分用户取消和对方拒绝
                    // [Fix] 如果用户主动拨打（initiatedByUser = true），被拒绝时应该显示在右侧
                    const wasInitiatedByUser = State.videoCallState.initiatedByUser === true;
                    const statusCode = awaitingDecision ? 'cancel' : 'reject';
                    // 如果用户主动拨打被拒绝，消息应该显示在右侧（用户自己的位置）
                    const realSender = (awaitingDecision || wasInitiatedByUser) ? 'me' : sessionId;
                    // [Fix] 如果发送者是用户，需要明确指定接收者为角色ID
                    const extra = {
                        sender_id: realSender,
                        isVideo: true,
                        initiatedByUser: wasInitiatedByUser  // [Fix] 传递"用户主动发起"的信息
                    };
                    if (realSender === 'me') {
                        extra.receiver_id = sessionId;  // [Fix] 确保消息属于正确的会话
                    }
                    window.WeChat.Services.Chat.persistAndShow(sessionId, statusCode, 'call_status', extra);
                    
                    // [Fix] 发送隐藏的系统消息，明确告诉AI发生了什么，确保角色理解拒绝逻辑
                    if (!awaitingDecision && statusCode === 'reject' && wasInitiatedByUser) {
                        // 用户主动拨打，角色拒绝
                        window.WeChat.Services.Chat.persistAndShow(sessionId, 
                            `[系统提示] 用户主动向你发起了视频通话，但你拒绝了这次通话邀请。你可以根据你的性格、当前心情和与用户的关系，决定是否要解释拒绝的原因，或者继续其他话题。`, 
                            'system', 
                            { hidden: true }
                        );
                    } else if (awaitingDecision && statusCode === 'cancel') {
                        // 用户取消了通话（在角色做出决定之前）
                        window.WeChat.Services.Chat.persistAndShow(sessionId, 
                            `[系统提示] 用户主动向你发起了视频通话，但在你做出决定之前，用户取消了这次通话。`, 
                            'system', 
                            { hidden: true }
                        );
                    }
                    
                    window.WeChat.Services.Chat.triggerAIReply();
                }
            }
        }, 800);
    },

    triggerVideoCallInput() {
        const State = this.State;
        if (!State.videoCallState || !State.videoCallState.open) return;
        const sessionId = State.videoCallState.sessionId || State.activeSessionId;

        this.App.openPromptModal({
            title: '在视频通话中输入消息',
            content: '',
            placeholder: '请输入...',
            onConfirm: (val) => {
                if (val && val.trim()) {
                    if (sessionId) window.WeChat.Services.Chat.openSession(sessionId);
                    window.WeChat.Services.Chat.sendMessage(val.trim(), 'voice_text');
                    this.App.render();
                }
            }
        });
    },

    triggerVideoCallReply() {
        const State = this.State;
        if (!State.videoCallState || !State.videoCallState.open) return;
        const sessionId = State.videoCallState.sessionId || State.activeSessionId;

        // [FIX] 防止重复点击
        const chatService = window.WeChat.Services && window.WeChat.Services.Chat;
        if (!chatService) return;
        
        // 如果已经在请求中，忽略
        if (chatService._isRequesting) {
            console.warn('[Calls] triggerVideoCallReply: Already requesting, ignoring duplicate call');
            return;
        }

        // [Synchronization] Ensure session is set for Chat service
        if (sessionId) chatService.openSession(sessionId);
        
        // [FIX] 添加超时保护：如果 200 秒内没有完成，强制清除状态
        const timeoutId = setTimeout(() => {
            if (chatService._isRequesting) {
                console.warn('[Calls] triggerVideoCallReply: Timeout after 200s, forcing cleanup');
                chatService._isRequesting = false;
                chatService.setTypingState(false);
                // 强制更新UI
                if (window.WeChat.App) window.WeChat.App.render();
                if (window.os && window.os.showToast) {
                    window.os.showToast('回复超时，请重试', 'error');
                }
            }
        }, 200000); // 200秒超时
        
        // 执行回复，并在完成后清除超时
        (async () => {
            try {
                await chatService.triggerAIReply();
            } catch (e) {
                console.error('[Calls] triggerVideoCallReply error:', e);
            } finally {
                clearTimeout(timeoutId);
            }
        })();
    },

    minimizeVideoCall() {
        const State = this.State;
        if (State.videoCallState) {
            State.videoCallState.minimized = true;
            this.App.render();
        }
    },

    restoreVideoCall() {
        const State = this.State;
        if (State.videoCallState) {
            State.videoCallState.minimized = false;
            this.App.render();
        }
    }
};
