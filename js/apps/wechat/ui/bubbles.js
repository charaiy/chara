/**
 * js/apps/wechat/ui/bubbles.js
 * 负责渲染聊天气泡
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Bubbles = {
    // Default Avatar (SVG Base64) to prevent broken images
    DEFAULT_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==',

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
        // Use provided avatar -> fallback to Default Base64 -> Empty string (let error handler catch)
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
                        const status = msg.transfer_status || 'pending';
                        const isReceived = status === 'received';
                        const isRefunded = status === 'refunded';

                        const bubbleBg = isRefunded ? '#ffebd7' : '#f79e39';
                        const iconColor = isRefunded ? '#fa9d3b' : 'white';
                        const footerColor = isRefunded ? '#fa9d3b' : 'rgba(255,255,255,0.8)';
                        const borderColor = isRefunded ? 'rgba(250,157,59,0.3)' : 'rgba(255,255,255,0.2)';

                        let transferIcon = "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"; // Double Arrow
                        if (isReceived) transferIcon = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"; // Checkmark
                        if (isRefunded) transferIcon = "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"; // Return Arrow

                        // Subtitle Text
                        let subText = trans.note || (isTransferMe ? '你发起了一笔转账' : '转账给你');
                        if (isReceived) subText = "已收款";
                        if (isRefunded) subText = "已退还";

                        return `
                            <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                                <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                            <path d="${transferIcon}"/>
                                        </svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; color: ${iconColor};">
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
                return `<img src="${msg.content}" style="max-width: 120px; vertical-align: bottom;">`; // WeChat expressions are usually slightly smaller and no radius
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
            // Orange Bubble Style
            case 'transfer': {
                let trans = {};
                try {
                    trans = JSON.parse(msg.content);
                } catch (e) {
                    trans = { amount: '0.00', note: '' };
                }
                const isTransferMe = msg.sender === 'me';


                // Determine Status (default: pending)
                // We rely on 'msg.transfer_status' being set by the Chat Service during updates
                const status = msg.transfer_status || 'pending';
                const isReceived = status === 'received';
                const isRefunded = status === 'refunded';

                const bubbleBg = isRefunded ? '#ffebd7' : '#f79e39';
                const iconColor = isRefunded ? '#fa9d3b' : 'white';
                const footerColor = isRefunded ? '#fa9d3b' : 'rgba(255,255,255,0.8)';
                const borderColor = isRefunded ? 'rgba(250,157,59,0.3)' : 'rgba(255,255,255,0.2)';

                let transferIcon = "M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"; // Double Arrow
                if (isReceived) transferIcon = "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"; // Checkmark
                if (isRefunded) transferIcon = "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"; // Return Arrow

                // Subtitle Text
                let subText = trans.note || (isTransferMe ? '你发起了一笔转账' : '转账给你');
                if (isReceived) subText = "已收款";
                if (isRefunded) subText = "已退还";

                return `
                    <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                    <path d="${transferIcon}"/>
                                </svg>
                            </div>
                            <div style="display: flex; flex-direction: column; color: ${iconColor};">
                                <div style="font-size: 15px; font-weight: 500;">¥${trans.amount}</div>
                                <div style="font-size: 12px; opacity: 0.8;">${subText}</div>
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

                // Colors
                const bubbleBg = isRefund ? '#ffebd7' : '#f79e39';
                // const contentColor = isRefund ? '#fa9d3b' : 'white'; 
                // Actually WeChat uses White text even on light orange for consistency, or standard orange text. 
                // Let's use White for consistency with the screenshot reference if possible, otherwise Dark Orange.
                // Screenshot 1 top bubble (Refunded) text is WHITE.
                const txtColor = 'white';
                const footerColor = 'rgba(255,255,255,0.8)';
                const borderColor = 'rgba(255,255,255,0.2)';

                const statusIconPath = isRefund
                    ? "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" // Return
                    : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"; // Checkmark

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
            default:
                return '[不支持的消息类型]';
        }
    }
};
