/**
 * js/apps/wechat/ui/bubbles.js
 * 消息气泡渲染服务 - 负责渲染各种类型的消息气泡
 * 
 * 职责：
 * - 渲染不同类型的消息气泡（文本、图片、语音、位置、转账等）
 * - 处理消息的显示样式（用户侧/角色侧）
 * - 处理消息选择模式下的显示
 * - 处理头像点击和双击事件
 * 
 * 支持的消息类型：
 * - text: 文本消息
 * - image: 图片消息
 * - sticker: 表情包消息
 * - voice: 语音消息
 * - location: 位置消息
 * - transfer: 转账消息
 * - transfer_status: 转账状态消息
 * - call_status: 通话状态消息
 * - system: 系统消息
 * 
 * 功能模块：
 * 1. 消息渲染：
 *    - render(): 渲染单条消息（包含气泡和头像）
 *    - _renderContent(): 渲染消息内容（根据类型）
 * 
 * 2. 交互处理：
 *    - handleAvatarClick(): 处理头像单击（打开资料）
 *    - handleAvatarDblClick(): 处理头像双击（拍一拍）
 * 
 * 3. 特殊处理：
 *    - 撤回消息显示
 *    - 隐藏系统消息（hidden: true）
 *    - 消息选择模式
 *    - 时间戳显示逻辑
 * 
 * 依赖：
 * - window.WeChat.App: 应用主对象
 * - window.sysStore: 数据存储
 * - window.WeChat.Services: 各种服务
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Bubbles = {
    // Default Avatar (PNG)
    DEFAULT_AVATAR: 'assets/images/avatar_placeholder.png',

    // Timer for click disambiguation
    _clickTimer: null,

    /**
     * Helper: Escape HTML characters to prevent XSS
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

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
            // [Fix] 隐藏系统消息（对AI可见，但不在UI中显示）
            if (msg.hidden === true) {
                return ''; // 返回空字符串，不渲染
            }
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

                        const safeAmount = this.escapeHtml(trans.amount);
                        const safeSubText = this.escapeHtml(subText);

                        return `
                            <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                                <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                            <path d="${transferIcon}"/>
                                        </svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; color: ${mainTextColor};">
                                        <div style="font-size: 15px; font-weight: 500;">¥${safeAmount}</div>
                                        <div style="font-size: 12px; opacity: 0.8;">${safeSubText}</div>
                                    </div>
                                </div>
                                <div style="height: 20px; padding: 0 12px; display: flex; align-items: center; border-top: 1px solid ${borderColor};">
                                    <span style="font-size: 10px; color: ${footerColor};">微信转账</span>
                                </div>
                            </div>
                        `;
                    } catch (e) { }
                }
                return msg.content ? this.escapeHtml(msg.content) : '';

            case 'sticker':
                return `<img src="${String(msg.content).replace(/"/g, '&quot;')}" style="max-width: 120px; vertical-align: bottom;">`;

            case 'image':
                return `<img src="${String(msg.content).replace(/"/g, '&quot;')}" style="max-width: 140px; border-radius: 4px; vertical-align: bottom;">`;

            case 'location':
                let loc = {};
                try { loc = JSON.parse(msg.content); } catch (e) { loc = { name: msg.content, detail: '' }; }

                const safeName = this.escapeHtml(loc.name || '位置信息');
                const safeDetail = this.escapeHtml(loc.detail || '');

                return `
                    <div style="width: 210px; background: white; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 8px 10px; display: flex; flex-direction: column;">
                            <div style="font-size: 14px; font-weight: 500; color: #000; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${safeName}</div>
                            <div style="font-size: 10px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeDetail}</div>
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

                const safeAmount = this.escapeHtml(trans.amount);
                const safeSubText = this.escapeHtml(subText);

                return `
                    <div onclick="event.stopPropagation(); window.WeChat.App.handleTransferClick('${msg.id}')" style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
                        <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="${iconColor}">
                                    <path d="${transferIcon}"/>
                                </svg>
                            </div>
                            <div style="display: flex; flex-direction: column; color: ${mainTextColor};">
                                <div style="font-size: 15px; font-weight: 500; color: ${mainTextColor}">¥${safeAmount}</div>
                                <div style="font-size: 12px; color: ${subTextColor};">${safeSubText}</div>
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
                const isReceived = statusData.status === 'received';
                const isRefund = statusData.status === 'refunded';
                // [Fix] 已收款和已被接收应该使用相同的颜色
                const bubbleBg = (isReceived || isRefund) ? (isRefund ? '#ffebd7' : '#f9e6cc') : '#f79e39';
                const txtColor = 'white';
                const footerColor = 'rgba(255,255,255,0.8)';
                const borderColor = 'rgba(255,255,255,0.2)';
                const statusIconPath = isRefund ? "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z";

                const safeAmount = statusData.amount ? '¥' + this.escapeHtml(statusData.amount) : '';
                const safeText = this.escapeHtml(statusData.text);

                return `
                    <div style="width: 230px; background: ${bubbleBg}; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; cursor: default;">
                        <div style="padding: 12px; display: flex; flex-direction: row; align-items: center;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${txtColor}; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-sizing: border-box;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="${txtColor}">
                                    <path d="${statusIconPath}" />
                                </svg>
                            </div>
                            <div style="display: flex; flex-direction: column; color: ${txtColor};">
                                <div style="font-size: 15px; font-weight: 500;">${safeAmount}</div>
                                <div style="font-size: 12px; opacity: 0.9;">${safeText}</div>
                            </div>
                        </div>
                        <div style="height: 20px; padding: 0 12px; display: flex; align-items: center; border-top: 1px solid ${borderColor};">
                            <span style="font-size: 10px; color: ${footerColor};">微信转账</span>
                        </div>
                    </div>
                `;
            }

            case 'voice':
                const voiceText = this.escapeHtml(msg.content || '');
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
            case 'audio_call': {
                const isMe = msg.sender === 'me';
                const isVideo = msg.type === 'video_call';
                const status = msg.status || 'ended';
                const duration = msg.call_duration || '';

                // WeChat Native Outline Call Icon (High Precision)
                const handsetIcon = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 12px; flex-shrink: 0; transform: rotate(-135deg); opacity: 0.9;">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                `;

                return `
                    <div style="display: flex; align-items: center; min-height: 24px;">
                        <span style="font-size: 16px; line-height: 1.4; flex: 1; letter-spacing: 0.3px;">${callText}</span>
                        ${handsetIcon}
                    </div>
                `;
            }

            case 'call_summary': {
                let sumData = {};
                try { sumData = JSON.parse(msg.content); } catch (e) { sumData = { duration: '00:00', summary: '' }; }

                const isMe = msg.sender === 'me';
                const isVideo = sumData.type === 'video';

                const safeDuration = this.escapeHtml(sumData.duration);

                // 高精度图标
                let iconHtml = '';
                if (isVideo) {
                    iconHtml = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${isMe ? 'margin-left: 12px;' : 'margin-right: 12px;'} flex-shrink: 0; opacity: 0.9;">
                        <path d="M15 7.5H6C4.8 7.5 4 8.3 4 9.5V14.5C4 15.7 4.8 16.5 6 16.5H15C16.2 16.5 17 15.7 17 14.5V13L21 15.5V8.5L17 11V9.5C17 8.3 16.2 7.5 15 7.5Z"/>
                    </svg>`;
                } else {
                    iconHtml = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${isMe ? 'margin-left: 12px;' : 'margin-right: 12px;'} flex-shrink: 0; opacity: 0.9;">
                        <path d="M5.5 14.5C4.5 14.5 3.5 13.5 4 12C4.5 10 7 8.5 12 8.5C17 8.5 19.5 10 20 12C20.5 13.5 19.5 14.5 18.5 14.5C17.5 14.5 17 13.5 17 12.5C17 11 15 10.5 12 10.5C9 10.5 7 11 7 12.5C7 13.5 6.5 14.5 5.5 14.5Z"/>
                    </svg>`;
                }

                return `
                    <div onclick="window.WeChat.App.openCallSummary('${msg.id}')" style="display: flex; align-items: center; min-height: 24px; cursor: pointer; flex-direction: ${isMe ? 'row' : 'row-reverse'};">
                        <span style="font-size: 16px; line-height: 1.4; flex: 1; letter-spacing: 0.3px; text-align: ${isMe ? 'right' : 'left'};">通话时长 ${safeDuration}</span>
                        ${iconHtml}
                    </div>
                `;
            }

            case 'call_status': {
                const isMe = msg.sender === 'me';
                const isVideo = msg.isVideo;
                let rawStatus = msg.content; // "reject", "cancel", "no_answer", "busy"

                // [Fix] 获取消息的 initiatedByUser 标记
                // 优先从 msg 对象获取，如果没有则从 store 查找
                let initiatedByUser = msg.initiatedByUser === true;
                if (!initiatedByUser && window.sysStore && msg.id) {
                    const fullMsg = window.sysStore.getAllMessages().find(m => m.id === msg.id);
                    if (fullMsg) {
                        initiatedByUser = fullMsg.initiatedByUser === true;
                    }
                }

                // --- 视角差逻辑还原 (严格匹配微信) ---
                let statusText = '';
                // [Fix] 如果用户主动拨打被拒绝，即使消息显示在右侧（isMe=true），也应该显示"对方已拒绝"
                if (isMe && initiatedByUser && rawStatus === 'reject') {
                    // 用户主动拨打被对方拒绝，显示"对方已拒绝"
                    statusText = '对方已拒绝';
                } else if (isMe) {
                    // 我发起的动作 (如：我按了挂断)
                    const map = {
                        'cancel': '已取消',
                        'reject': '已拒绝',
                        'no_answer': '无应答'
                    };
                    statusText = map[rawStatus] || rawStatus;
                } else {
                    // 对方动作导致的结果 (如：对方拒接了我的呼叫)
                    const map = {
                        'cancel': '对方已取消',
                        'reject': '对方已拒绝',
                        'no_answer': '对方无应答'
                    };
                    statusText = map[rawStatus] || rawStatus;
                }

                statusText = this.escapeHtml(statusText); // Sanitize status text

                // --- 高精度空心图标 ---
                let iconHtml = '';
                if (isVideo) {
                    iconHtml = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                        <path d="M15 7.5H6C4.8 7.5 4 8.3 4 9.5V14.5C4 15.7 4.8 16.5 6 16.5H15C16.2 16.5 17 15.7 17 14.5V13L21 15.5V8.5L17 11V9.5C17 8.3 16.2 7.5 15 7.5Z"/>
                    </svg>`;
                } else {
                    iconHtml = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                        <path d="M5.5 14.5C4.5 14.5 3.5 13.5 4 12C4.5 10 7 8.5 12 8.5C17 8.5 19.5 10 20 12C20.5 13.5 19.5 14.5 18.5 14.5C17.5 14.5 17 13.5 17 12.5C17 11 15 10.5 12 10.5C9 10.5 7 11 7 12.5C7 13.5 6.5 14.5 5.5 14.5Z"/>
                    </svg>`;
                }

                const contentHtml = isMe ?
                    `<div style="display: flex; align-items: center; justify-content: flex-end; width:100%;">
                        <span style="font-size: 16px; margin-right: 12px; font-weight: 400;">${statusText}</span>
                        ${iconHtml}
                    </div>` :
                    `<div style="display: flex; align-items: center; justify-content: flex-start; width:100%;">
                        ${iconHtml}
                        <span style="font-size: 16px; margin-left: 12px; font-weight: 400;">${statusText}</span>
                    </div>`;

                return contentHtml;
            }

            case 'thought_chain':
                // [Fix] 思维链不应该显示在聊天界面，只记录到控制台
                return '';

            default:
                return '[不支持的消息类型]';
        }
    }
};
