/**
 * js/apps/wechat/ui/bubbles.js
 * 负责渲染聊天气泡
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Bubbles = {
    // Default Avatar (PNG) - Changed to the grey one requested by user
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
                    // Need to resolve the actual character ID if possible, or pass it down
                    // senderId is raw from store, so it should be the ID
                    window.WeChat.App.openUserProfile(senderId);
                }
            }
        }, 220); // 300ms is standard, but 220 feels snappier
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
        // Use provided avatar -> fallback to Default PNG -> Empty string (let error handler catch)
        const avatar = msg.avatar || this.DEFAULT_AVATAR;

        // Rich media types that shouldn't have the standard bubble background/padding
        // Also detect text that looks like a transfer (fallback)
        const looksLikeTransfer = msg.type === 'text' && msg.content && typeof msg.content === 'string' && msg.content.includes('"amount"');
        const isRich = ['image', 'sticker', 'location', 'transfer', 'transfer_status'].includes(msg.type) || looksLikeTransfer;

        // 气泡样式类
        // If rich media, do NOT apply the standard me/other bubble classes that force bg color and padding
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
                    <!-- 名称 (仅群聊显示，这里简化不显示) -->
                    <div class="wx-bubble ${bubbleClass}" 
                         style="${richStyle}"
                         data-msg-id="${msg.id}"
                         onmousedown="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         onmouseup="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         onmouseleave="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         ontouchstart="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         ontouchend="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         oncontextmenu="return false;">
                        ${this._renderContent(msg)}
                    </div>
                </div>
            </div>
        `;
    },

    _renderContent(msg) {
        switch (msg.type) {
            case 'text':
                // Panic Fallback: If text looks like transfer JSON, render as transfer
                if (msg.content && msg.content.includes('"amount"')) {
                    try {
                        const trans = JSON.parse(msg.content);
                        const isTransferMe = msg.sender === 'me';

                        // Determine Status (default: pending) - Shared logic with case 'transfer'
                        // [Fix] Check status from content JSON as well
                        const status = msg.transfer_status || trans.status || 'pending';
                        const isReceived = status === 'received';
                        const isRefunded = status === 'refunded';

                        // [Fix] White text/icons enforced
                        const bubbleBg = (isReceived || isRefunded) ? '#f9e6cc' : '#f79e39';
                        const iconColor = 'white';
                        const mainTextColor = 'white';
                        const subTextColor = 'rgba(255,255,255,0.8)';
                        const footerColor = 'rgba(255,255,255,0.8)';
                        const borderColor = 'rgba(255,255,255,0.2)';

                        let transferIcon = "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"; // Double Arrow
                        if (isReceived) transferIcon = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"; // Checkmark
                        if (isRefunded) transferIcon = "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"; // Return Arrow

                        // Subtitle Text
                        let subText = trans.note || (isTransferMe ? '请收款' : '转账给你');
                        if (isReceived) {
                            if (isTransferMe) subText = "已被接收";
                            else subText = "已收款";
                        }
                        if (isRefunded) {
                            if (isTransferMe) subText = "已被退还";
                            else subText = "已退还";
                        }

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
                    } catch (e) {
                        // ignore parse error, render as text
                    }
                }
                return msg.content ? String(msg.content).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
            case 'sticker':
                return `<img src="${msg.content}" style="max-width: 120px; vertical-align: bottom;">`;
            case 'image':
                return `<img src="${msg.content}" style="max-width: 140px; border-radius: 4px; vertical-align: bottom;">`;
            case 'location':
                let loc = {};
                try {
                    loc = JSON.parse(msg.content);
                } catch (e) {
                    loc = { name: msg.content, detail: '' };
                }
                const isLocationMe = msg.sender === 'me';
                // Location bubble style: Ultra Compact
                return `
                    <div style="width: 210px; background: white; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 8px 10px; display: flex; flex-direction: column;">
                            <div style="font-size: 14px; font-weight: 500; color: #000; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${loc.name || '位置信息'}</div>
                            <div style="font-size: 10px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${loc.detail || ''}</div>
                        </div>
                        <div style="height: 75px; background: #e0e0e0; position: relative; overflow: hidden;">
                            <!-- Fake Map Pattern -->
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(#ccc 1px, transparent 1px); background-size: 15px 15px; opacity: 0.5;"></div>
                            <div style="position: absolute; top: 40%; left: -10%; width: 150px; height: 6px; background: #dcdcdc; transform: rotate(20deg);"></div>
                            <div style="position: absolute; top: 20%; right: -20%; width: 200px; height: 8px; background: #fff; border: 1px solid #e0e0e0; transform: rotate(-5deg);"></div>
                            
                            <!-- Red Pin -->
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
                try {
                    trans = JSON.parse(msg.content);
                } catch (e) {
                    trans = { amount: '0.00', note: '' };
                }
                const isTransferMe = msg.sender === 'me';

                // [Fix] Check status from content JSON as well (Persistence logic)
                const status = msg.transfer_status || trans.status || 'pending';
                const isReceived = status === 'received';
                const isRefunded = status === 'refunded';

                // [Fix] White text/icons enforced for ALL states
                // Background is lighter orange for resolved states
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

                if (isReceived) {
                    if (isTransferMe) {
                        subText = "已被接收";
                    } else {
                        subText = "已收款";
                    }
                }
                if (isRefunded) {
                    if (isTransferMe) {
                        subText = "已被退还";
                    } else {
                        subText = "已退还";
                    }
                }

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
                try {
                    statusData = JSON.parse(msg.content);
                } catch (e) {
                    statusData = { status: 'unknown', text: msg.content };
                }
                const isRefund = statusData.status === 'refunded';
                const bubbleBg = isRefund ? '#ffebd7' : '#f79e39';
                const txtColor = 'white';
                const footerColor = 'rgba(255,255,255,0.8)';
                const borderColor = 'rgba(255,255,255,0.2)';

                const statusIconPath = isRefund
                    ? "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
                    : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

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
                const duration = msg.duration || 5;
                const isVoiceMe = msg.sender === 'me';
                const barWidth = Math.min(160, 40 + duration * 6);
                const voiceIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="transform: ${isVoiceMe ? 'rotate(180deg)' : 'none'};">
                    <path d="M12 3v18l-6-6H3V9h3l6-6zM18 9v6h-2V9h2zm4-4v14h-2V5h2z"/>
                </svg>`;
                return `
                    <div style="width: ${barWidth}px; display: flex; align-items: center; justify-content: ${isVoiceMe ? 'flex-end' : 'flex-start'}; cursor: pointer;" onclick="window.WeChat.App.playVoice('${msg.id}')">
                        ${isVoiceMe ? `<span style="margin-right:8px; font-size:14px; opacity:0.6;">${duration}"</span>${voiceIcon}` : `${voiceIcon}<span style="margin-left:8px; font-size:14px; opacity:0.6;">${duration}"</span>`}
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

            default:
                return '[不支持的消息类型]';
        }
    }
};
