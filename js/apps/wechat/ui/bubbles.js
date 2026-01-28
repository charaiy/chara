/**
 * js/apps/wechat/ui/bubbles.js
 * 负责渲染聊天气泡
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Bubbles = {
    // Default Avatar (PNG)
    DEFAULT_AVATAR: 'assets/images/avatar_placeholder.png',

    // Timer for click disambiguation
    _clickTimer: null,

    handleAvatarClick(senderId, type) {
        if (this._clickTimer) clearTimeout(this._clickTimer);

        this._clickTimer = setTimeout(() => {
            this._clickTimer = null;
            // Single Click Action: Open Profile
            if (window.WeChat.App) {
                if (type === 'me') {
                    window.WeChat.App.openMyProfileSettings();
                } else {
                    window.WeChat.App.openUserProfile(senderId);
                }
            }
        }, 220);
    },

    handleAvatarDblClick(type, msgId) {
        // Cancel Single Click
        if (this._clickTimer) {
            clearTimeout(this._clickTimer);
            this._clickTimer = null;
        }

        // Double Click Action: Nudge
        if (window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.handleAvatarDblClick(type, msgId);
        }
    },

    /**
     * 渲染单条消息
     * @param {Object} msg - 消息对象 { id, type, content, sender: 'me'|'other', avatar, senderId }
     */
    render(msg) {
        // 1. Handle Recalled Messages
        if (msg.is_recalled) {
            const isMe = msg.sender === 'me';
            const charId = (window.WeChat.App && window.WeChat.App.State) ? window.WeChat.App.State.activeSessionId : null;
            const name = isMe ? '你' : (window.sysStore.getCharacter(charId)?.name || '对方');
            return `
                <div class="wx-msg-system">
                    <span>${name} 撤回了一条消息</span>
                </div>
            `;
        }

        // 2. Handle System Messages
        if (msg.type === 'system') {
            return `
                <div class="wx-msg-system">
                    <span>${msg.content}</span>
                </div>
            `;
        }

        const selectionState = (window.WeChat.App && window.WeChat.App.getSelectionState) ? window.WeChat.App.getSelectionState() : { msgSelectionMode: false, selectedMsgIds: new Set() };
        const isSelectionMode = selectionState.msgSelectionMode;
        const isSelected = selectionState.selectedMsgIds && selectionState.selectedMsgIds.has(msg.id);

        const isMe = msg.sender === 'me';
        // Use provided avatar -> fallback to Default PNG
        const avatar = msg.avatar || this.DEFAULT_AVATAR;

        // Rich media types that shouldn't have the standard bubble background/padding
        const looksLikeTransfer = msg.type === 'text' && msg.content && typeof msg.content === 'string' && msg.content.includes('"amount"');
        const isRich = ['image', 'sticker', 'location', 'voice', 'transfer', 'transfer_status'].includes(msg.type) || looksLikeTransfer;

        // 气泡样式类
        let bubbleClass = '';
        if (!isRich) {
            bubbleClass = isMe ? 'wx-bubble-me' : 'wx-bubble-other';
        }

        const wrapperClass = isMe ? 'wx-msg-row-me' : 'wx-msg-row-other';
        const selectionClass = isSelectionMode ? 'wx-msg-row-selection' : '';

        // Inline style override to ensure transparency for rich media
        const richStyle = isRich ? 'background: transparent !important; padding: 0 !important; box-shadow: none !important;' : '';

        return `
            <div class="wx-msg-row ${wrapperClass} ${selectionClass}" onclick="window.WeChat.App.toggleMsgSelection('${msg.id}')">
                ${isSelectionMode ? `
                    <div class="wx-msg-checkbox ${isSelected ? 'checked' : ''}">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                ` : ''}
                <img src="${avatar}" 
                     class="wx-msg-avatar" 
                     data-sender="${isMe ? 'me' : 'other'}"
                     style="object-fit: cover; cursor: pointer;"
                     onerror="this.src='${this.DEFAULT_AVATAR}'"
                     onclick="window.WeChat.UI.Bubbles.handleAvatarClick('${msg.senderId}', '${isMe ? 'me' : 'other'}')"
                     ondblclick="window.WeChat.UI.Bubbles.handleAvatarDblClick('${isMe ? 'me' : 'other'}', '${msg.id}')">
                <div class="wx-msg-content">
                    <div class="wx-bubble ${bubbleClass}" 
                         style="${richStyle}"
                         data-msg-id="${msg.id}"
                         onmousedown="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         onmouseup="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         onmouseleave="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         ontouchstart="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         ontouchend="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         oncontextmenu="window.WeChat.App.handleMsgContextMenu(event, '${msg.id}')">
                        ${this._renderContent(msg)}
                    </div>
                </div>
            </div>
        `;
    },

    _renderContent(msg) {
        switch (msg.type) {
            case 'text':
                if (msg.content && msg.content.includes('"amount"')) {
                    try {
                        const trans = JSON.parse(msg.content);
                        const isTransferMe = msg.sender === 'me';
                        const status = msg.transfer_status || trans.status || 'pending';
                        const isReceived = status === 'received';
                        const isRefunded = status === 'refunded';

                        const bubbleBg = (isReceived || isRefunded) ? '#f9e6cc' : '#f79e39';
                        const iconColor = 'white';
                        const mainTextColor = 'white';
                        const subTextColor = 'rgba(255,255,255,0.8)';
                        const footerColor = 'rgba(255,255,255,0.8)';
                        const borderColor = 'rgba(255,255,255,0.2)';

                        let transferIcon = "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z";
                        if (isReceived) transferIcon = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";
                        if (isRefunded) transferIcon = "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z";

                        let subText = trans.note || (isTransferMe ? '请收款' : '转账给你');
                        if (isReceived) subText = isTransferMe ? "已被接收" : "已收款";
                        if (isRefunded) subText = isTransferMe ? "已被退还" : "已退还";

                        return `
                            <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                                <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                            <path d="${transferIcon}"/>
                                        </svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; color: ${mainTextColor};">
                                        <div style="font-size: 15px; font-weight: 500;">¥${trans.amount}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">${subText}</div>
                                    </div>
                                </div>
                                <div style="height: 20px; padding: 0 12px; display: flex; align-items: center; border-top: 1px solid ${borderColor};">
                                    <span style="font-size: 10px; color: ${footerColor};">微信转账</span>
                                </div>
                            </div>
                        `;
                    } catch (e) { }
                }
                return msg.content ? String(msg.content).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

            case 'sticker':
                return `<img src="${msg.content}" style="max-width: 120px; vertical-align: bottom;">`;

            case 'image':
                return `<img src="${msg.content}" style="max-width: 140px; border-radius: 4px; vertical-align: bottom;">`;

            case 'location':
                let loc = {};
                try { loc = JSON.parse(msg.content); } catch (e) { loc = { name: msg.content, detail: '' }; }
                return `
                    <div style="width: 210px; background: white; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 8px 10px; display: flex; flex-direction: column;">
                            <div style="font-size: 14px; font-weight: 500; color: #000; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${loc.name || '位置信息'}</div>
                            <div style="font-size: 10px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${loc.detail || ''}</div>
                        </div>
                        <div style="height: 75px; background: #e0e0e0; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(#ccc 1px, transparent 1px); background-size: 15px 15px; opacity: 0.5;"></div>
                            <div style="position: absolute; top: 40%; left: -10%; width: 150px; height: 6px; background: #dcdcdc; transform: rotate(20deg);"></div>
                            <div style="position: absolute; top: 20%; right: -20%; width: 200px; height: 8px; background: #fff; border: 1px solid #e0e0e0; transform: rotate(-5deg);"></div>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%);">
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="#fa5151">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    <circle cx="12" cy="9" r="2.5" fill="rgba(0,0,0,0.2)"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                `;

            case 'transfer': {
                let trans = {};
                try { trans = JSON.parse(msg.content); } catch (e) { trans = { amount: '0.00', note: '' }; }
                const isTransferMe = msg.sender === 'me';
                const status = msg.transfer_status || trans.status || 'pending';
                const isReceived = status === 'received';
                const isRefunded = status === 'refunded';

                const bubbleBg = (isReceived || isRefunded) ? '#f9e6cc' : '#f79e39';
                const iconColor = 'white';
                const mainTextColor = 'white';
                const subTextColor = 'rgba(255,255,255,0.8)';
                const footerColor = 'rgba(255,255,255,0.8)';
                const borderColor = 'rgba(255,255,255,0.2)';

                let transferIcon = "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z";
                if (isReceived) transferIcon = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";
                if (isRefunded) transferIcon = "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z";

                let subText = trans.note || (isTransferMe ? '请收款' : '转账给你');
                if (isReceived) subText = isTransferMe ? "已被接收" : "已收款";
                if (isRefunded) subText = isTransferMe ? "已被退还" : "已退还";

                return `
                    <div onclick="event.stopPropagation(); window.WeChat.App.handleTransferClick('${msg.id}')" style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                    <path d="${transferIcon}"/>
                                </svg>
                            </div>
                            <div style="display: flex; flex-direction: column; color: ${mainTextColor};">
                                <div style="font-size: 15px; font-weight: 500; color: ${mainTextColor}">¥${trans.amount}</div>
                                <div style="font-size: 12px; color: ${subTextColor};">${subText}</div>
                            </div>
                        </div>
                        <div style="height: 20px; padding: 0 12px; display: flex; align-items: center; border-top: 1px solid ${borderColor};">
                            <span style="font-size: 10px; color: ${footerColor};">微信转账</span>
                        </div>
                    </div>
                `;
            }

            case 'transfer_status': {
                let statusData = {};
                try { statusData = JSON.parse(msg.content); } catch (e) { statusData = { status: 'unknown', text: msg.content }; }
                const isRefund = statusData.status === 'refunded';
                const bubbleBg = isRefund ? '#ffebd7' : '#f79e39';
                const txtColor = 'white';
                const footerColor = 'rgba(255,255,255,0.8)';
                const borderColor = 'rgba(255,255,255,0.2)';
                const statusIconPath = isRefund ? "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

                return `
                    <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: default;">
                        <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${txtColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="${txtColor}">
                                    <path d="${statusIconPath}" />
                                </svg>
                            </div>
                            <div style="display: flex; flex-direction: column; color: ${txtColor};">
                                <div style="font-size: 15px; font-weight: 500;">${statusData.amount ? '¥' + statusData.amount : ''}</div>
                                <div style="font-size: 12px; opacity: 0.9;">${statusData.text}</div>
                            </div>
                        </div>
                        <div style="height: 20px; padding: 0 12px; display: flex; align-items: center; border-top: 1px solid ${borderColor};">
                            <span style="font-size: 10px; color: ${footerColor};">微信转账</span>
                        </div>
                    </div>
                `;
            }

            case 'voice':
                const voiceText = msg.content || '';
                const calcDuration = Math.max(1, Math.min(60, Math.ceil(voiceText.length / 3)));
                const duration = msg.duration || calcDuration;

                const isVoiceMe = msg.sender === 'me';
                const barWidth = Math.min(200, 60 + duration * 4);

                // CSS Variables for Colors and Dark Mode
                const bgVar = isVoiceMe ? 'var(--wx-bubble-me)' : 'var(--wx-bubble-other)';
                const transcriptBg = 'var(--wx-cell-bg)';
                const transcriptColor = 'var(--wx-text)';
                const iconColor = isVoiceMe ? '#111' : 'var(--wx-text)';

                // Icon: Strict "(( <" Style
                const voiceIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: block; transform: ${isVoiceMe ? 'rotate(180deg)' : 'none'}; opacity: 0.9; color: ${iconColor};">
                    <circle cx="6" cy="12" r="2.5" fill="currentColor"/>
                    <path d="M11 8.5C12 9.5 12.5 10.7 12.5 12C12.5 13.3 12 14.5 11 15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15 5.5C17 7.5 18 9.7 18 12C18 14.3 17 16.5 15 18.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;

                const toggleScript = `
                    const t = document.getElementById('wx-voice-text-${msg.id}');
                    if(t.style.display === 'none') {
                        t.style.display = 'block';
                    } else {
                        t.style.display = 'none';
                    }
                `;

                // Arrow Styles (Dynamic Colors)
                const arrowStyle = isVoiceMe
                    ? `position: absolute; top: 11px; right: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 6px solid ${bgVar};`
                    : `position: absolute; top: 11px; left: -6px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid ${bgVar};`;

                return `
                    <div style="display: flex; flex-direction: column; align-items: ${isVoiceMe ? 'flex-end' : 'flex-start'}; position: relative;">
                        <!-- Voice Bar -->
                        <div id="wx-voice-bubble-${msg.id}" 
                             onclick="if(window.WeChat.Services.Chat && window.WeChat.Services.Chat.playVoiceMessage) { window.WeChat.Services.Chat.playVoiceMessage('${msg.id}'); } event.stopPropagation();"
                             style="position: relative; width: ${barWidth}px; background: ${bgVar}; border-radius: 4px; padding: 9px 12px; display: flex; align-items: center; justify-content: ${isVoiceMe ? 'flex-end' : 'flex-start'}; cursor: pointer;">
                            <!-- Arrow -->
                            <div style="${arrowStyle}"></div>
                            
                            <!-- Content -->
                            ${isVoiceMe ?
                        `<span style="margin-right:4px; font-size:15px; color:${iconColor}; user-select:none;">${duration}"</span>${voiceIcon}` :
                        `${voiceIcon}<span style="margin-left:4px; font-size:15px; color:${iconColor}; user-select:none;">${duration}"</span>`
                    }
                        </div>
                        
                        <!-- Hidden Transcript -->
                        <div id="wx-voice-text-${msg.id}" style="display: block; background: ${transcriptBg}; color: ${transcriptColor}; border-radius: 4px; padding: 10px; margin-top: 6px; border: none; max-width: 260px; word-break: break-all; font-size: 15px; line-height: 1.5;">
                            ${voiceText}
                        </div>
                    </div>
                `;

            case 'video_call':
                const isVideoMe = msg.sender === 'me';
                const callStatus = msg.status || 'ended';
                const callDuration = msg.call_duration || '';
                let callText = '视频通话';
                if (callStatus === 'ended') callText = `视频通话 结束时长 ${callDuration || '00:00'}`;
                if (callStatus === 'declined') callText = isVideoMe ? '对方已拒绝' : '已拒绝';
                if (callStatus === 'cancelled') callText = isVideoMe ? '已取消' : '对方已取消';
                const callIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                    <path d="M15 10l4.55-2.27A1 1 0 0121 8.61v6.78a1 1 0 01-1.45.89L15 14v-4zM5 8h8a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" fill="currentColor"/>
                </svg>`;
                return `
                    <div style="display: flex; align-items: center; padding: 2px 0;">
                        ${isVideoMe ? `<span style="font-size: 15px;">${callText}</span>${callIcon}` : `${callIcon}<span style="font-size: 15px;">${callText}</span>`}
                    </div>
                `;

            case 'audio_call':
                const isAudioMe = msg.sender === 'me';
                const aCallText = msg.status === 'ended' ? `语音通话 结束时长 ${msg.call_duration || '00:00'}` : '语音通话';
                const audioIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
                </svg>`;
                return `
                    <div style="display: flex; align-items: center; padding: 2px 0;">
                        ${isAudioMe ? `<span style="font-size: 15px;">${aCallText}</span>${audioIcon}` : `${audioIcon}<span style="font-size: 15px;">${aCallText}</span>`}
                    </div>
                `;

            case 'call_summary':
                // Native Style Call Summary Bubble
                let sumData = {};
                try { sumData = JSON.parse(msg.content); } catch (e) { sumData = { duration: '00:00', summary: '' }; }

                const isSumMe = msg.sender === 'me';
                const sumBg = isSumMe ? '#95ec69' : '#FFFFFF'; // WeChat Green #95ec69
                const sumColor = '#000000';

                // Simple Document Icon SVG
                const docIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; opacity:0.6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

                // IMPORTANT: Do NOT render a nested `.wx-bubble` here.
                // Outer wrapper already provides the `.wx-bubble` container & press handlers.
                return `
                    <div style="background: ${sumBg}; padding: 10px 12px; border-radius: 10px; cursor: pointer; display: flex; align-items: center;"
                         onclick="event.stopPropagation(); window.WeChat.App.openCallSummary('${msg.id}')">
                        ${docIcon}
                        <span style="font-size: 14px; color: ${sumColor};">通话时长 ${sumData.duration}</span>
                        <span style="font-size: 10px; color: ${sumColor}; opacity: 0.5; margin-left: 6px; margin-top: 2px;">(点击查看)</span>
                    </div>
                `;

            default:
                return '[不支持的消息类型]';
        }
    }
};
