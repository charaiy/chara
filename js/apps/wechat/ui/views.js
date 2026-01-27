/**
 * js/apps/wechat/ui/views.js
 * 负责渲染四大主页面 + 聊天会话
 * [Refactor] Use .wx-nav-spacer instead of padding-top
 */

window.WeChat = window.WeChat || {};

window.WeChat.Views = {
    /**
     * 渲染聊天会话详情
     */
    renderChatSession(sessionId, startHidden = false) {
        // Fetch real messages from sysStore
        const messages = (window.sysStore && window.sysStore.getMessagesBySession)
            ? window.sysStore.getMessagesBySession(sessionId)
            : [];

        const character = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(sessionId)
            : null;

        const wallpaperUrl = character?.chat_background || '';
        const bgStyle = wallpaperUrl ? `background-image: url('${wallpaperUrl}'); background-size: cover; background-position: center;` : 'background-color: var(--wx-bg);';

        const renderMsg = (window.WeChat.UI && window.WeChat.UI.Bubbles)
            ? ((m) => {
                // Adapt store message to bubble format
                const isMe = m.sender_id === 'user' || m.sender_id === 'me';
                let avatar = isMe ? (window.sysStore && window.sysStore.get('user_avatar') || '') : (character?.avatar || '');
                return window.WeChat.UI.Bubbles.render({
                    id: m.id,
                    type: m.type,
                    content: m.content,
                    sender: isMe ? 'me' : 'other',
                    senderId: m.sender_id,
                    avatar: avatar,
                    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                });
            })
            : ((m) => `<div>${m.content}</div>`);

        let lastTime = 0;
        const listHtml = messages.map(m => {
            let html = '';
            // Time Logic: 5-minute rule
            if (m.timestamp && (m.timestamp - lastTime > 5 * 60 * 1000 || lastTime === 0)) {
                // Use the helper on Views (we will add it next)
                const timeStr = window.WeChat.Views._formatChatTime(m.timestamp);
                html += `<div class="wx-msg-time" onclick="window.WeChat.Views.toggleMsgTime(this, ${m.timestamp})">${timeStr}</div>`;
                lastTime = m.timestamp;
            }
            html += renderMsg(m);
            return html;
        }).join('');

        const hiddenStyle = startHidden ? 'visibility: hidden;' : '';

        return `
            <div class="wx-view-container" id="wx-view-session" style="${bgStyle}" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer"></div>
                <div class="wx-chat-messages" style="padding: 16px 0 0px 0; ${hiddenStyle}">
                    ${listHtml}
                </div>
            </div>
            
            <!-- Input Bar & Extra Panel Container -->
            <div class="wx-chat-footer-container">
                <div class="wx-chat-footer">
                    <!-- Voice Icon (Now AI Smart Reply) -->
                    <div class="wx-chat-btn" onclick="window.WeChat.Services.Chat.triggerSmartReply()">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M12 7.5v9M8.5 10v4M15.5 10v4" stroke-linecap="round"/>
                        </svg>
                    </div>
                    
                    <input type="text" class="wx-chat-input" id="wx-chat-input" onkeydown="if(event.key==='Enter') window.WeChat.App.sendMessage(this.value)" />
                    
                    <!-- Emoji/Sticker Icon -->
                    <div class="wx-chat-btn" onclick="window.WeChat.toggleStickerPanel()">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M9 10.5h.01M15 10.5h.01M8.5 14.5c1.5 1.5 5.5 1.5 7 0" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>

                    <!-- Plus Icon -->
                    <div class="wx-chat-btn" onclick="window.WeChat.toggleExtraPanel()">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M12 8v8M8 12h8" stroke-linecap="round"/>
                        </svg>
                    </div>
                </div>

                <!-- Sticker Panel (Refined) -->
                <div id="wx-sticker-panel" class="wx-extra-panel" style="display:none; flex-direction:column; background-color: var(--wx-footer-bg);">
                     <!-- 1. Top Tab Bar (Functional) -->
                     <div class="wx-sticker-tabs">
                        <!-- Tab 1: Link Upload (Search Icon) -->
                        <div class="wx-sticker-tab-icon" onclick="window.WeChat.App.switchStickerTab('link')">
                            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
                        </div>
                        <!-- Tab 2: Classic Emoji (Smile Icon) -->
                        <div class="wx-sticker-tab-icon" onclick="window.WeChat.App.switchStickerTab('emoji')">
                            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"/></svg>
                        </div>
                        <!-- Tab 3: Custom Stickers (Heart Icon) -->
                        <div class="wx-sticker-tab-icon active" onclick="window.WeChat.App.switchStickerTab('heart')">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>
                        </div>
                     </div> 
                     
                     <!-- 2. Dynamic Content Area -->
                     <div id="wx-sticker-content-container" class="wx-sticker-scroll-area">
                        <!-- Content rendered by index.js -->
                     </div>

                     <!-- 3. Bottom Action Bar (Selection Mode) -->
                     <div id="wx-sticker-action-bar" class="wx-sticker-action-bar">
                        <button class="wx-sticker-action-btn delete" onclick="window.WeChat.App.deleteSelectedStickers()">删除</button>
                        <button class="wx-sticker-action-btn cancel" onclick="window.WeChat.App.exitSelectionMode()">取消</button>
                     </div>
                </div>

                <!-- Extra Panel -->
                <div id="wx-extra-panel" class="wx-extra-panel" style="display:none;">
                    <div class="wx-extra-grid">
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerPhotoUpload()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div><span>照片</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerCamera()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg></div><span>拍摄</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div><span>视频通话</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerLocation()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><span>位置</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerVoiceCall()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg></div><span>语音通话</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36 2.38 3.24L16.99 11 14.92 8H20v6z"/></svg></div><span>礼物</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerTransfer()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></div><span>转账</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerVoiceInput()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></div><span>语音输入</span></div>
                    </div>
                    <!-- Pagination Dots -->
                    <div class="wx-extra-dots">
                        <div class="wx-dot active"></div>
                        <div class="wx-dot"></div>
                    </div>
                </div>
            </div>
        `;
    },

    _renderFieldHeader(label, fieldId) {
        const isLocked = window.State && window.State.fieldLocks && window.State.fieldLocks[fieldId];
        const lockIcon = isLocked
            ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';

        return `
            <div class="wx-field-header" style="margin-top: 4px;">
                <div style="font-size: 13px; color: var(--wx-text-sec); font-weight: 500;">${label}</div>
                <div class="wx-field-actions" style="gap: 14px; opacity: 0.4;">
                    <div class="wx-field-action-btn dice" onclick="window.WeChat.App.randomizeField('${fieldId}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 15h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2zm8-4h-2V6h2v2zm-4 0h-2V6h2v2zm-4 0H7V6h2v2z"/></svg>
                    </div>
                    <div id="lock-btn-${fieldId}" class="wx-field-action-btn ${isLocked ? 'locked' : ''}" onclick="window.WeChat.App.toggleFieldLock('${fieldId}')">
                        ${lockIcon}
                    </div>
                    <div class="wx-field-action-btn clear" onclick="window.WeChat.App.clearField('${fieldId}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Tab 0: 微信
     */
    renderChatList() {
        let chats = [];

        if (window.sysStore) {
            const allMessages = window.sysStore.getAllMessages();
            const isMe = (id) => id === 'user' || id === 'me' || id === 'my';

            // Extract all unique session IDs (excluding 'system')
            const sessionIds = [...new Set(allMessages.map(m => isMe(m.sender_id) ? m.receiver_id : m.sender_id))];

            chats = sessionIds.filter(id => id !== 'system').map(id => {
                const char = window.sysStore.getCharacter(id);
                const msgs = window.sysStore.getMessagesBySession(id);
                const lastMsg = msgs[msgs.length - 1];

                // 获取预览文案与更新时间
                const notifService = window.WeChat.Services.Notifications;
                let previewText = '';
                if (lastMsg) {
                    previewText = notifService?.getPreviewText ? notifService.getPreviewText(id) : (lastMsg.type === 'text' ? lastMsg.content : '[消息]');
                }

                return {
                    id: id,
                    name: char?.name || id,
                    lastMsg: previewText,
                    lastTimestamp: lastMsg ? lastMsg.timestamp : 0,
                    time: lastMsg ? window.WeChat.Views._formatChatTime(lastMsg.timestamp) : '',
                    avatar: char?.avatar || ''
                };
            }).filter(c => c.lastMsg);

            // [Sorting Logic] New messages (highest timestamp) jump to the top
            chats.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        }



        let listHtml = chats.map(chat => {
            // 获取未读标记
            const notifService = window.WeChat.Services.Notifications;
            const badgeHtml = notifService && notifService.renderUnreadBadge
                ? notifService.renderUnreadBadge(chat.id)
                : '';

            return `
            <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.openChat('${chat.id}')" style="height: 64px; padding: 8px 12px; position: relative;">
                <div style="position: relative; margin-right: 10px; width: 44px; height: 44px; flex-shrink: 0;">
                    <img src="${chat.avatar || 'assets/images/avatar_placeholder.png'}" onerror="this.src='assets/images/avatar_placeholder.png'" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                    ${badgeHtml}
                </div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 15px; font-weight: 500; color: var(--wx-text);">${chat.name}</span>
                        <span style="font-size: 9px; color: var(--wx-text-sec);">${chat.time}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--wx-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 30px;">
                        ${chat.lastMsg}
                    </div>
                </div>
            </div>
            `;
        }).join('');


        const searchBar = `
        <div style="padding: 8px 10px; background-color: var(--wx-bg);">
            <div style="background: var(--wx-cell-bg); height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--wx-text-sec); font-size: 13px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px; opacity: 0.5;">
                     <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                搜索
            </div>
        </div>
        `;

        return `
            <div class="wx-view-container" id="wx-view-chat" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
                ${searchBar}
                ${listHtml}
            </div>
        `;
    },

    /**
     * Chat Info Page (Details)
     */
    renderChatInfo(sessionId, name = 'User') {
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        const char = (window.sysStore && window.sysStore.getCharacter) ? window.sysStore.getCharacter(sessionId) : null;
        const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
        const realName = char?.name || name;

        return `
            <div class="wx-view-container" id="wx-view-info" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <!-- Members Area -->
                <div style="background: var(--wx-cell-bg); padding: 16px 20px 24px 20px; display: flex; flex-wrap: wrap; gap: 24px; margin-top: 0;">
                     <!-- Member: Peer (Clickable) -->
                     <div onclick="window.WeChat.App.openUserProfile('${sessionId}', '${realName}')" style="display: flex; flex-direction: column; align-items: center; width: 56px; cursor: pointer;">
                        <img src="${avatar}" style="width: 56px; height: 56px; border-radius: 6px; margin-bottom: 6px; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                        <span style="font-size: 11px; color: var(--wx-text-sec); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${realName}</span>
                     </div>
                     <!-- Add Button -->
                     <div style="display: flex; flex-direction: column; align-items: center; width: 56px;">
                        <div style="width: 56px; height: 56px; border-radius: 6px; border: 1px solid var(--wx-border); display: flex; align-items: center; justify-content: center; box-sizing: border-box; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--wx-text-sec)" style="opacity: 0.5;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        </div>
                     </div>
                </div>

                <div class="wx-cell-group">
                    ${(() => {
                const char = window.sysStore?.getCharacter(sessionId);
                const isBgOn = char?.settings?.bg_activity_enabled === true;
                const threshold = char?.settings?.bg_activity_threshold || 30;
                let html = this._renderSwitchCell('启动独立后台活动', isBgOn, `window.WeChat.App.toggleIndependentBgActivity('${sessionId}', !${isBgOn})`);
                if (isBgOn) {
                    html += this._renderCell({
                        text: '独立活动分钟阀值',
                        extra: `<input type="number" value="${threshold}" style="width:60px; text-align:right; border:none; background:transparent; color:var(--wx-text-sec); font-size:15px; outline:none;" onchange="window.WeChat.App.setIndependentBgThreshold('${sessionId}', this.value)">`,
                        onClick: ''
                    });
                }
                return html;
            })()}
                </div>

                <div class="wx-cell-group">
                    ${(() => {
                const char = window.sysStore?.getCharacter(sessionId);
                const limit = char?.settings?.memory_limit || 200;
                return this._renderCell({
                    text: '上下文记忆量',
                    extra: `<span style="font-size:15px; color:var(--wx-text-sec);">${limit}</span>`,
                    onClick: `window.WeChat.App.setContextMemoryLimit('${sessionId}')`
                });
            })()}
                    ${(() => {
                const char = window.sysStore?.getCharacter(sessionId);
                const linkedIds = char?.settings?.world_book_ids || [];
                const count = linkedIds.length;
                return this._renderCell({
                    text: '关联世界书',
                    showArrow: true,
                    extra: `<span style="font-size:15px; color:var(--wx-text-sec); margin-right:4px;">${count > 0 ? `已关联 ${count} 条` : '无'}</span>`,
                    onClick: `window.WeChat.App.openWorldBookSelection('${sessionId}')`
                });
            })()}
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '语音与视频', showArrow: true, onClick: `window.WeChat.App.openVoiceVideoSettings('${sessionId}')` })}
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({ text: '记忆管理', showArrow: true, onClick: `window.WeChat.App.openMemoryManagement('${sessionId}')` })}
                    ${this._renderCell({ text: '设置当前聊天背景', showArrow: true, onClick: `window.WeChat.App.setChatBackground('${sessionId}')` })}
                    ${this._renderCell({ text: '移除当前聊天背景', showArrow: true, onClick: `window.WeChat.App.removeChatBackground('${sessionId}')` })}
                    ${this._renderCell({ text: '清空聊天记录', showArrow: true, onClick: `window.WeChat.App.clearChatHistory('${sessionId}')` })}
                    
                    ${(() => {
                const char = window.sysStore?.getCharacter(sessionId);
                const isKeep = char?.settings?.keep_relationship_on_clear !== false; // Default true if undefined
                return this._renderSwitchCell('保留关系设定', isKeep, `window.WeChat.App.setKeepRelationshipOnClear('${sessionId}', !${isKeep})`);
            })()}
                </div>
                
                <!-- Footer Info Pills -->
                <div style="display: flex; justify-content: center; gap: 10px; padding: 20px 0 40px 0;">
                    <div style="padding: 4px 12px; background: rgba(0,0,0,0.05); border-radius: 12px; font-size: 11px; color: #999;">总消息: ${(window.sysStore && window.sysStore.getMessagesBySession(sessionId).length) || 0}</div>
                    ${(() => {
                const tokenCount = this._calculateTotalTokens(sessionId);
                return `<div style="padding: 4px 12px; background: rgba(0,0,0,0.05); border-radius: 12px; font-size: 11px; color: #999;">Token: ${tokenCount}</div>`;
            })()}
                </div>
            </div>
        `;
    },

    _calculateTotalTokens(sessionId) {
        if (!window.sysStore) return 0;

        let totalTxt = "";
        const char = window.sysStore.getCharacter(sessionId);
        if (!char) return 0;

        // 1. Character Persona (System Prompt parts)
        totalTxt += (char.name || "") + "\n";
        totalTxt += (char.main_persona || "") + "\n";
        totalTxt += (char.nickname || "") + "\n";
        totalTxt += (char.remark || "") + "\n";

        // 2. User Persona
        const userPersona = window.sysStore.get('user_persona') || "";
        const userRealName = window.sysStore.get('user_realname') || "";
        totalTxt += userPersona + "\n" + userRealName + "\n";

        // 3. Memories (Summaries)
        if (char.memories && Array.isArray(char.memories)) {
            char.memories.forEach(m => totalTxt += (m.content || "") + "\n");
        }

        // 4. World Book (Linked Entries)
        const wbIds = char.settings?.world_book_ids || [];
        if (wbIds.length > 0) {
            let allWB = [];
            // Try explicit getter first
            if (window.sysStore.getWorldBookEntries) {
                allWB = window.sysStore.getWorldBookEntries();
            }
            if (!allWB || allWB.length === 0) {
                allWB = window.sysStore.get('world_book_entries') || [];
            }

            // Normalize IDs to strings
            const activeIds = new Set(wbIds.map(id => String(id)));
            // Get Context for triggers (Sync with Prompts.js logic)
            const recentMsgs = window.sysStore.getMessagesBySession(sessionId).slice(-5).map(m => m.content).join(' ');

            allWB.forEach(entry => {
                // Check if this entry is selected
                if (entry && activeIds.has(String(entry.id))) {
                    if (entry.enabled === false) return;

                    // Activation Logic:
                    // 1. If triggers exist -> Must match recent context
                    // 2. If no triggers -> Constant active
                    let isActive = true;
                    if (entry.triggers && entry.triggers.length > 0) {
                        const matched = entry.triggers.some(t => recentMsgs.includes(t));
                        if (!matched) isActive = false;
                    }

                    if (isActive) {
                        totalTxt += (entry.key_word || "") + "\n";
                        totalTxt += (entry.content || "") + "\n";
                    }
                }
            });
        }

        // 5. Chat History (Context Window)
        const limit = char.settings?.memory_limit || 200;
        const msgs = window.sysStore.getMessagesBySession(sessionId);
        const contextMsgs = msgs.slice(-limit);

        contextMsgs.forEach(m => {
            if (m.type === 'image' || m.type === 'sticker') {
                // Do not count images
            } else {
                totalTxt += (m.content || "") + "\n";
            }
        });

        // 6. Token Algo (Approximating Tiktoken/cl100k)
        // CJK: Safe estimate 1.5
        // Latin: Estimate 0.3
        const cjkCount = (totalTxt.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherCount = Math.max(0, totalTxt.length - cjkCount);

        const estimated = Math.ceil(cjkCount * 1.5 + otherCount * 0.3);

        console.log(`[TokenCalc] WB_IDs: ${wbIds.length}, TxtLen: ${totalTxt.length}, Est: ${estimated}`);
        return estimated;
    },

    /**
     * Long-term Memory Management Page
     */
    renderMemoryManagement(sessionId) {
        const char = window.sysStore?.getCharacter(sessionId);
        const name = char?.name || 'User';
        const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
        const memories = char?.memories || [];

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#F2F2F7';
        const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

        let listHtml = memories.map((mem, index) => {
            const dateStr = new Date(mem.timestamp).toLocaleString('zh-CN', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(/\//g, '/');

            return `
                <div style="background: ${cardBg}; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                        <img src="${avatar}" style="width: 36px; height: 36px; border-radius: 4px; margin-right: 10px; background: #eee; object-fit: cover;">
                        <div style="flex: 1;">
                            <div style="font-size: 15px; font-weight: 500; color: var(--wx-text); margin-bottom: 2px;">${name}</div>
                            <div style="font-size: 12px; color: var(--wx-text-sec);">${dateStr}</div>
                        </div>
                        <div style="display: flex; gap: 16px;">
                            <div onclick="window.WeChat.App.editMemory('${sessionId}', ${index})" style="cursor: pointer; color: var(--wx-text-sec);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>
                            <div onclick="window.WeChat.App.deleteMemory('${sessionId}', ${index})" style="cursor: pointer; color: #fa5151;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 15px; line-height: 1.6; color: var(--wx-text); white-space: pre-wrap;">${mem.content}</div>
                </div>
            `;
        }).join('');

        if (memories.length === 0) {
            listHtml = `
                <div style="text-align: center; padding: 60px 20px; color: var(--wx-text-sec);">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📦</div>
                    <div style="font-size: 15px;">暂无长期记忆</div>
                </div>
            `;
        }

        return `
            <div class="wx-scroller" id="wx-view-memory" style="background-color: ${pageBg}; padding-left: 12px; padding-right: 12px;">
                <div class="wx-nav-spacer"></div>
                <div style="padding: 12px 0 40px 0;">
                    ${listHtml}
                </div>
            </div>
        `;
    },

    /**
     * User Profile Page
     */
    renderUserProfile(userId, name = 'User') {

        // Fetch Real Data
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const user = {
            id: userId,
            name: char?.name || name,
            avatar: char?.avatar || 'assets/images/avatar_placeholder.png',
            nickname: char?.nickname || '无',
            realName: char?.real_name || '未知',
            // Default display if not set: generate consistent hash-based ID for viewing, or random? 
            // User requested default logic. Since we changed save logic, let's just display what is there.
            // If missing, show placeholder that hints it will be generated.
            wxid: char?.wxid || ('wxid_' + (char?.id || userId).slice(-8)),
            gender: char?.gender || '',
            region: char?.region || '未知地区',
            age: char?.settings?.age || ''
        };

        const genderHtml = this._renderGenderIcon(user.gender);

        return `
            <div class="wx-view-container" id="wx-view-profile" style="background-color: var(--wx-bg);">
                <div class="wx-nav-spacer"></div>
                
                <!-- Profile Header -->
                <div style="background: var(--wx-cell-bg); padding: 24px 24px 24px 24px; display: flex; align-items: flex-start; margin-bottom: 0;">
                    <img src="${user.avatar}" style="width: 60px; height: 60px; border-radius: 6px; margin-right: 16px; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                    <div style="flex: 1; min-width: 0; padding-top: 2px;">
                        <div style="font-size: 20px; font-weight: 500; color: var(--wx-text); margin-bottom: 6px; display: flex; align-items: center; line-height: 1.1;">
                            ${user.name}
                            ${genderHtml}
                            ${user.age ? `<span style="font-size: 12px; color: var(--wx-text-sec); background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 4px; margin-left: 6px; font-weight: normal;">${user.age}岁</span>` : ''}
                        </div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 3px; opacity: 0.8;">微信号：${user.wxid}</div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); opacity: 0.8;">真名：${user.realName}</div>
                    </div>
                </div>

                <!-- Friend Info Section -->
                <div class="wx-cell-group" style="margin-top: 0; margin-bottom: 0;">
                     <div class="wx-cell" onclick="window.WeChat.App.openPersonaSettings('${user.id}')" style="padding: 12px 24px 12px 24px; cursor: pointer;">
                        <div class="wx-cell-content" style="font-size: 17px; font-weight: 400; color: var(--wx-text);">朋友资料</div>
                         <div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                         </div>
                    </div>
                </div>


                <!-- Description Block (Full Width Separator) -->
                <div style="background-color: var(--wx-cell-bg);">
                    <!-- Full width separator -->
                    <div style="height: 1px; background-color: rgba(0,0,0,0.05); width: 100%;"></div>
                    <!-- Text container with padding -->
                    <div style="padding: 10px 24px 16px 24px; font-size: 12px; color: var(--wx-text-sec); line-height: 1.4;">
                        添加朋友的备注名、电话、标签、备忘、照片等，并设置朋友权限。
                    </div>
                </div>

                <!-- Moments Cell (With Gap) -->
                <div class="wx-cell-group" style="margin-top: 8px;">
                    <div class="wx-cell wx-hairline-bottom" style="padding: 12px 24px;">
                         <div class="wx-cell-content" style="font-size: 17px; font-weight: 400; color: var(--wx-text);">朋友圈</div>
                         <div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                         </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="wx-cell-group" style="margin-top: 8px;">
                     <!-- Send Message (Rounder Bubble) -->
                    <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.openChat('${user.id}')" style="justify-content: center; cursor: pointer; padding: 16px 0;">
                        <div style="display: flex; align-items: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 6px; flex-shrink: 0;">
                                 <!-- Circular Bubble Body with Tail -->
                                 <path d="M12 3.5C6.75 3.5 2.5 7.08 2.5 11.5c0 2.4 1.3 4.56 3.42 5.98L5.17 19.96c-.12.4.31.74.67.52l3.04-1.71c.98.39 2.03.61 3.12.61 5.25 0 9.5-3.58 9.5-8 0-4.42-4.25-8-9.5-8z" stroke="#576b95" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
                                 <!-- 3 Dots -->
                                 <circle cx="8" cy="11.5" r="1.2" fill="#576b95"/>
                                 <circle cx="12" cy="11.5" r="1.2" fill="#576b95"/>
                                 <circle cx="16" cy="11.5" r="1.2" fill="#576b95"/>
                            </svg>
                            <span style="font-size: 17px; font-weight: 400; color: #576b95;">发消息</span>
                        </div>
                    </div>
                    <!-- Video Call (Outline Camera) -->
                    <div class="wx-cell" style="justify-content: center; cursor: pointer; padding: 16px 0;">
                        <div style="display: flex; align-items: center;">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#576b95" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; flex-shrink: 0;">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            <span style="font-size: 17px; font-weight: 400; color: #576b95;">音视频通话</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },



    renderMyProfileSettings() {
        const s = window.sysStore;
        const realName = s.get('user_realname') || '';
        const nickname = s.get('user_nickname') || '';
        const gender = s.get('user_gender') || '';
        const wxid = s.get('user_wxid') || '';
        const species = s.get('user_species') || '';
        const persona = s.get('user_persona') || '';

        const isDark = s.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-my-profile" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${s.get('user_avatar') || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload()"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>

                    ${this._renderFieldHeader('我的真名', 'wx-my-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-real-name" ${this._lockAttr('wx-my-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：陈晓明" value="${realName}" />
                    </div>

                    ${this._renderFieldHeader('所在地 (影响角色的感应)', 'wx-my-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-region" ${this._lockAttr('wx-my-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、东京、云端" value="${s.get('user_region') || ''}" />
                    </div>

                    ${this._renderFieldHeader('财富/社会地位 (自定义)', 'wx-my-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-wealth" ${this._lockAttr('wx-my-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：学生、打工人、继承人" value="${s.get('user_wealth') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的物种', 'wx-my-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-species" ${this._lockAttr('wx-my-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：人类、猫娘、AI" value="${species}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-my-gender" ${this._lockAttr('wx-my-gender')} onchange="document.getElementById('wx-my-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                            <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
                            <option value="other" ${gender === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('我的生日', 'wx-my-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-birthday" ${this._lockAttr('wx-my-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：10月24日" value="${s.get('user_birthday') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的年龄', 'wx-my-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-age" type="number" ${this._lockAttr('wx-my-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" value="${s.get('user_age') || ''}" />
                    </div>

                    <div id="wx-my-period-box" style="display: ${gender === 'female' ? 'block' : 'none'};">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-my-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-my-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-my-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：1" value="${s.get('user_period_start') || ''}" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('我的网名', 'wx-my-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-my-nickname" ${this._lockAttr('wx-my-nickname')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：Kitten" value="${nickname}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-wxid" ${this._lockAttr('wx-my-wxid')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="留空则自动生成" value="${wxid}" />
                    </div>

                    ${this._renderFieldHeader('个性签名 (Bio)', 'wx-my-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-bio" ${this._lockAttr('wx-my-bio')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入你的签名" value="${s.get('user_bio') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的全局人设 (User Persona)', 'wx-my-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-my-persona" ${this._lockAttr('wx-my-persona')}
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此设置你的全局人设，所有角色都能感知到...">${persona}</textarea>
                    </div>
                </div>

                 <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveMyProfileSettings({
                        realName: document.getElementById('wx-my-real-name').value,
                        nickname: document.getElementById('wx-my-nickname').value,
                        gender: document.getElementById('wx-my-gender').value,
                        birthday: document.getElementById('wx-my-birthday').value,
                        age: document.getElementById('wx-my-age').value,
                        periodStart: document.getElementById('wx-my-period-start').value,
                        bio: document.getElementById('wx-my-bio').value,
                        region: document.getElementById('wx-my-region').value,
                        wealth: document.getElementById('wx-my-wealth').value,
                        wxid: document.getElementById('wx-my-wxid').value,
                        species: document.getElementById('wx-my-species').value,
                        persona: document.getElementById('wx-my-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
                    </div>
                    
                    <div onclick="window.WeChat.App.openAssociatedGen('USER_SELF')" 
                         style="background-color: var(--wx-cell-bg); color: var(--wx-text); text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer; margin-top: 16px;">
                        生成我的关联人物 (如: 我的青梅竹马)
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Voice and Video Settings Page
     */
    renderVoiceVideoSettings(sessionId) {
        const char = (window.sysStore && window.sysStore.getCharacter) ? window.sysStore.getCharacter(sessionId) : null;
        const vs = {
            ...(char?.voice_settings || {}),
            ...(char?.video_settings || {})
        };

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';
        const cellBg = isDark ? '#1C1C1E' : '#FFFFFF';

        return `
            <div class="wx-scroller" id="wx-view-voice-video-settings" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 20px;">
                    <div style="background: ${cellBg}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; margin-bottom: 24px;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="margin-right: 12px; color: #576b95;">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
                            </svg>
                            <span style="font-size: 18px; font-weight: 600; color: var(--wx-text);">语音与视频</span>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 8px;">Minimax 语音ID</div>
                            <div style="background: var(--wx-bg); border-radius: 8px; padding: 12px; border: 1px solid var(--wx-border);">
                                <input id="wx-vs-voice-id" 
                                    style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                    placeholder="例如：male-01" value="${vs.voiceId || ''}" />
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 8px;">Minimax 语言增强</div>
                            <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">增强对特定语言或方言的识别能力。通常选择“自动判断”即可。</div>
                            <div style="background: var(--wx-bg); border-radius: 8px; padding: 12px; border: 1px solid #333; display: flex; align-items: center;">
                                <select id="wx-vs-lang-boost" style="flex: 1; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none; appearance: none;">
                                    <option value="none" ${vs.languageBoost === 'none' ? 'selected' : ''}>无（默认）</option>
                                    <option value="zh" ${vs.languageBoost === 'zh' ? 'selected' : ''}>中文增强</option>
                                    <option value="en" ${vs.languageBoost === 'en' ? 'selected' : ''}>英文增强</option>
                                </select>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="opacity: 0.5;"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 12px;">语音语速: <span id="wx-vs-speed-val">${vs.speechRate || 0.9}</span></div>
                            <input id="wx-vs-speed" type="range" min="0.5" max="2.0" step="0.1" value="${vs.speechRate || 0.9}" 
                                oninput="document.getElementById('wx-vs-speed-val').innerText = this.value"
                                style="width: 100%; height: 24px; appearance: none; background: #ffe4e6; border-radius: 12px; outline: none;" />
                            <style>
                                #wx-vs-speed::-webkit-slider-thumb {
                                    appearance: none;
                                    width: 24px;
                                    height: 24px;
                                    background: #ff5a5f;
                                    border: 4px solid white;
                                    border-radius: 50%;
                                    cursor: pointer;
                                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                                }
                            </style>
                        </div>

                        <div style="height: 1px; background: rgba(0,0,0,0.05); margin: 24px 0; border-bottom: 1px dashed rgba(0,0,0,0.1);"></div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <span style="font-size: 16px; color: var(--wx-text);">可视化视频通话界面</span>
                            <div class="wx-switch ${vs.visualCallEnabled ? 'checked' : ''}" id="wx-vs-visual-call" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>

                        <div id="wx-vs-visual-call-details" style="display: ${vs.visualCallEnabled ? 'block' : 'none'}; margin-bottom: 24px;">
                            <div style="display: flex; gap: 16px;">
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 14px; color: #888; margin-bottom: 8px;">对方画面</div>
                                    <div onclick="window.WeChat.App.triggerCallImageUpload('${sessionId}', 'peer')" style="aspect-ratio: 9/16; background: var(--wx-bg); border: 1px dashed var(--wx-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                        <img id="wx-vc-peer-img" src="${vs.peerCallImage || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${vs.peerCallImage ? 'block' : 'none'};">
                                        <div style="display: ${vs.peerCallImage ? 'none' : 'flex'}; flex-direction: column; align-items: center;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            <span style="font-size: 12px; color: #888; margin-top: 4px;">点击上传</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 14px; color: #888; margin-bottom: 8px;">我的画面</div>
                                    <div onclick="window.WeChat.App.triggerCallImageUpload('${sessionId}', 'my')" style="aspect-ratio: 9/16; background: var(--wx-bg); border: 1px dashed var(--wx-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                        <img id="wx-vc-my-img" src="${vs.myCallImage || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${vs.myCallImage ? 'block' : 'none'};">
                                        <div style="display: ${vs.myCallImage ? 'none' : 'flex'}; flex-direction: column; align-items: center;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            <span style="font-size: 12px; color: #888; margin-top: 4px;">点击上传</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <span style="font-size: 16px; color: var(--wx-text);">我的画面使用真实摄像头</span>
                            <div class="wx-switch ${vs.useRealCamera ? 'checked' : ''}" id="wx-vs-real-camera" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 16px; color: var(--wx-text);">开启语音接入</span>
                            <div class="wx-switch ${vs.voiceAccessEnabled ? 'checked' : ''}" id="wx-vs-voice-access" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 32px; padding: 0 4px;">
                        <div onclick="window.WeChat.App.saveVoiceVideoSettings('${sessionId}', {
                            voiceId: document.getElementById('wx-vs-voice-id').value,
                            languageBoost: document.getElementById('wx-vs-lang-boost').value,
                            speechRate: parseFloat(document.getElementById('wx-vs-speed').value),
                            visualCallEnabled: document.getElementById('wx-vs-visual-call').classList.contains('checked'),
                            useRealCamera: document.getElementById('wx-vs-real-camera').classList.contains('checked'),
                            voiceAccessEnabled: document.getElementById('wx-vs-voice-access').classList.contains('checked'),
                            peerCallImage: document.getElementById('wx-vc-peer-img').src,
                            myCallImage: document.getElementById('wx-vc-my-img').src
                        })" 
                             style="background-color: #07c160; color: white; text-align: center; padding: 14px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);">
                            保存设置
                        </div>
                    </div>
                </div>
            </div>
            <script>
                // Dynamic visibility toggle for visuals
                document.getElementById('wx-vs-visual-call').addEventListener('click', function() {
                    const details = document.getElementById('wx-vs-visual-call-details');
                    details.style.display = this.classList.contains('checked') ? 'block' : 'none';
                });
            </script>
        `;
    },

    /**
     * Persona Settings Page (Character AI Settings)
     */
    renderPersonaSettings(userId) {
        // Load existing data from sysStore
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const realName = char?.real_name || '';
        const remark = char?.remark || '';
        const nickname = char?.nickname || '';
        const wxid = char?.wxid || '';
        const species = char?.species || '';
        const gender = char?.gender || '';
        const persona = char?.main_persona || '';

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-persona" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${char?.avatar || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload('${userId}')"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>
                    ${this._renderFieldHeader('角色备注 (只有你知道)', 'wx-edit-remark')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-remark" ${this._lockAttr('wx-edit-remark')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" value="${remark}" />
                    </div>

                    ${this._renderFieldHeader('角色真名 (系统识别用)', 'wx-edit-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-real-name" ${this._lockAttr('wx-edit-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" value="${realName}" />
                    </div>

                    ${this._renderFieldHeader('所在地 (展示名)', 'wx-edit-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-region" ${this._lockAttr('wx-edit-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：云深不知处" value="${char?.region || ''}" />
                    </div>

                    ${this._renderFieldHeader('现实映射地区 (影响时差/天气)', 'wx-edit-region-mapping')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-region-mapping" ${this._lockAttr('wx-edit-region-mapping')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、东京、伦敦" value="${char?.settings?.region_mapping || ''}" />
                    </div>

                    ${this._renderFieldHeader('财富状况 (自定义词条)', 'wx-edit-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-wealth" ${this._lockAttr('wx-edit-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：名门望族、赤贫、顶级财阀" value="${char?.settings?.wealth_level || ''}" />
                    </div>

                    ${this._renderFieldHeader('物种', 'wx-edit-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-species" ${this._lockAttr('wx-edit-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：人类、猫娘、AI" value="${species}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-edit-gender" ${this._lockAttr('wx-edit-gender')} onchange="document.getElementById('wx-edit-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                            <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
                            <option value="other" ${gender === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('角色生日', 'wx-edit-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-birthday" ${this._lockAttr('wx-edit-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：7月7日" value="${char?.settings?.birthday || ''}" />
                    </div>

                    ${this._renderFieldHeader('角色年龄', 'wx-edit-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-age" type="number" ${this._lockAttr('wx-edit-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" value="${char?.settings?.age || ''}" />
                    </div>

                    <div id="wx-edit-period-box" style="display: ${gender === 'female' ? 'block' : 'none'};">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-edit-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-edit-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-edit-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：15" value="${char?.settings?.period_start || ''}" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('角色在网络上的名字', 'wx-edit-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-edit-nickname" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：大不列颠小厨娘" value="${nickname}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-wxid" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="默认自动生成，可手动修改" value="${wxid}" />
                    </div>

                    ${this._renderFieldHeader('角色在网络上的签名', 'wx-edit-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-bio" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入角色的签名" value="${char?.bio || ''}" />
                    </div>

                    ${this._renderFieldHeader('角色人设 (System Prompt)', 'wx-edit-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-edit-persona" 
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入角色的性格、背景故事或回复风格...">${persona}</textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.savePersonaSettings('${userId}', {
                        realName: document.getElementById('wx-edit-real-name').value,
                        remark: document.getElementById('wx-edit-remark').value,
                        nickname: document.getElementById('wx-edit-nickname').value,
                        wxid: document.getElementById('wx-edit-wxid').value,
                        species: document.getElementById('wx-edit-species').value,
                        gender: document.getElementById('wx-edit-gender').value,
                        gender: document.getElementById('wx-edit-gender').value,
                        birthday: document.getElementById('wx-edit-birthday').value,
                        age: document.getElementById('wx-edit-age').value,
                        periodStart: document.getElementById('wx-edit-period-start').value,
                        periodStart: document.getElementById('wx-edit-period-start').value,
                        bio: document.getElementById('wx-edit-bio').value,
                        region: document.getElementById('wx-edit-region').value,
                        regionMapping: document.getElementById('wx-edit-region-mapping').value,
                        wealth: document.getElementById('wx-edit-wealth').value,
                        persona: document.getElementById('wx-edit-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer; margin-bottom: 16px;">
                        保存设置
                    </div>
                    
                    <div onclick="window.WeChat.App.openAssociatedGen('${userId}')" 
                         style="background-color: var(--wx-cell-bg); color: var(--wx-text); text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        生成关联人物 (如: 他的朋友/宿敌)
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Add Friend Page
     */
    renderAddFriend() {
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-add-friend" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img id="wx-add-friend-avatar" src="${State.newFriendAvatar || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload('new_friend')"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>
                    ${this._renderFieldHeader('角色备注 (只有你知道)', 'wx-add-friend-remark')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-remark" ${this._lockAttr('wx-add-friend-remark')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" />
                    </div>

                    ${this._renderFieldHeader('角色真名 (系统识别用)', 'wx-add-friend-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-real-name" ${this._lockAttr('wx-add-friend-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" />
                    </div>

                    ${this._renderFieldHeader('所在地 (展示名)', 'wx-add-friend-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-region" ${this._lockAttr('wx-add-friend-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：赛博朋克城" />
                    </div>

                    ${this._renderFieldHeader('现实映射地区 (影响时差/天气)', 'wx-add-friend-region-mapping')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-region-mapping" ${this._lockAttr('wx-add-friend-region-mapping')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、伦敦、纽约" />
                    </div>

                    ${this._renderFieldHeader('财富状况', 'wx-add-friend-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-wealth" ${this._lockAttr('wx-add-friend-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：豪门、月光族" />
                    </div>

                    ${this._renderFieldHeader('物物种', 'wx-add-friend-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-species" ${this._lockAttr('wx-add-friend-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：人类、猫娘" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-add-friend-gender" ${this._lockAttr('wx-add-friend-gender')} onchange="document.getElementById('wx-add-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                            <option value="other">其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('角色生日', 'wx-add-friend-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-birthday" ${this._lockAttr('wx-add-friend-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：7月7日" />
                    </div>

                    ${this._renderFieldHeader('角色年龄', 'wx-add-friend-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-age" type="number" ${this._lockAttr('wx-add-friend-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" />
                    </div>

                    <div id="wx-add-period-box" style="display: none;">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-add-friend-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-add-friend-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-add-friend-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：15" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('角色网名 (角色对外展示的名号)', 'wx-add-friend-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-add-friend-nickname" ${this._lockAttr('wx-add-friend-nickname')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                        placeholder="如：大不列颠小厨娘" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-wxid" ${this._lockAttr('wx-add-friend-wxid')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="留空则自动生成" />
                    </div>

                    ${this._renderFieldHeader('个性签名 (Bio)', 'wx-add-friend-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-bio" ${this._lockAttr('wx-add-friend-bio')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入角色的签名" />
                    </div>

                    ${this._renderFieldHeader('角色人设 (System Prompt)', 'wx-add-friend-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-add-friend-persona" ${this._lockAttr('wx-add-friend-persona')}
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入角色的性格、背景故事或回复风格..."></textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveNewFriend({
                        avatar: document.getElementById('wx-add-friend-avatar').src,
                        realName: document.getElementById('wx-add-friend-real-name').value,
                        remark: document.getElementById('wx-add-friend-remark').value,
                        nickname: document.getElementById('wx-add-friend-nickname').value,
                        wxid: document.getElementById('wx-add-friend-wxid').value,
                        species: document.getElementById('wx-add-friend-species').value,
                        gender: document.getElementById('wx-add-friend-gender').value,
                        gender: document.getElementById('wx-add-friend-gender').value,
                        birthday: document.getElementById('wx-add-friend-birthday').value,
                        age: document.getElementById('wx-add-friend-age').value,
                        periodStart: document.getElementById('wx-add-friend-period-start').value,
                        periodStart: document.getElementById('wx-add-friend-period-start').value,
                        bio: document.getElementById('wx-add-friend-bio').value,
                        region: document.getElementById('wx-add-friend-region').value,
                        regionMapping: document.getElementById('wx-add-friend-region-mapping').value,
                        wealth: document.getElementById('wx-add-friend-wealth').value,
                        persona: document.getElementById('wx-add-friend-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Friend Settings Page
     */
    renderFriendSettings(userId) {
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const isBlacklisted = char?.is_blacklisted === true;

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-view-container" id="wx-view-settings" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '设置朋友资料', showArrow: true, onClick: `window.WeChat.App.openPersonaSettings('${userId}')` })}
                    ${this._renderCell({ text: '朋友权限', showArrow: true })}
                    ${this._renderCell({ text: '把他(她)推荐给朋友', showArrow: true })}
                    ${this._renderCell({ text: '添加到桌面', showArrow: true })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderSwitchCell('设为星标朋友', false)}
                </div>

                <div class="wx-cell-group">
                     ${this._renderSwitchCell('加入黑名单', isBlacklisted, `window.WeChat.App.toggleBlacklist('${userId}', !${isBlacklisted})`)}
                     ${this._renderCell({ text: '投诉', showArrow: true })}
                </div>
                
                <div class="wx-cell-group">
                    <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.deleteFriend('${userId}')" style="justify-content: center; cursor: pointer; background-color: var(--wx-cell-bg);">
                        <span style="font-size: 17px; font-weight: 600; color: var(--wx-red);">删除</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Tab 1: 通讯录
     */
    renderContactList() {
        const contacts = (window.WeChat.Services && window.WeChat.Services.Contacts)
            ? window.WeChat.Services.Contacts.getContacts()
            : [];

        // Sort contacts by section (A-Z, #)
        contacts.sort((a, b) => {
            // Force non-alpha initial chars to '#'
            let sectionA = (a.section && /^[A-Za-z]$/.test(a.section)) ? a.section.toUpperCase() : '#';
            let sectionB = (b.section && /^[A-Za-z]$/.test(b.section)) ? b.section.toUpperCase() : '#';

            if (sectionA === sectionB) return a.name.localeCompare(b.name);
            if (sectionA === '#') return 1;
            if (sectionB === '#') return -1;
            return sectionA.localeCompare(sectionB);
        });

        let listHtml = '';
        let lastSection = null;

        contacts.forEach(c => {
            // Force render logic to also adhere to this
            const rawSection = c.section || '#';
            const section = /^[A-Za-z]$/.test(rawSection) ? rawSection.toUpperCase() : '#';

            if (section !== lastSection) {
                // Render Section Header
                listHtml += `
                    <div style="padding: 8px 16px; font-size: 11px; color: var(--wx-text-sec);">
                        ${section}
                    </div>
                `;
                lastSection = section;
            }

            listHtml += this._renderCell({
                text: c.name,
                iconColor: c.type === 'system' ? '#fa9d3b' : '#eee',
                iconType: 'user_avatar',
                showArrow: false,
                onClick: `window.WeChat.App.openUserProfile('${this.escapeQuote(c.id)}', '${this.escapeQuote(c.name)}')`,
                avatar: c.avatar
            });
        });

        return `
            <div class="wx-view-container" id="wx-view-contacts" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
               <div style="padding-top: 10px;">
                    ${this._renderSimpleCell('新的朋友', '#fa9d3b', 'contact_add')}
                    ${this._renderSimpleCell('群聊', '#07c160', 'group')}
                    ${this._renderSimpleCell('标签', '#2782d7', 'tag')}
                    ${this._renderSimpleCell('公众号', '#2782d7', 'offical')}
                    ${listHtml}
               </div>
            </div>
        `;
    },

    /**
     * Tab 2: 发现
     */
    renderDiscover() {
        return `
            <div class="wx-view-container" id="wx-view-discover" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '朋友圈', iconColor: '#e0e0e0', iconType: 'moments', showArrow: true })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '视频号', iconColor: '#fa9d3b', iconType: 'video', showArrow: true })}
                    ${this._renderCell({ text: '直播', iconColor: '#fa9d3b', iconType: 'live', showArrow: true })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '扫一扫', iconColor: '#2782d7', iconType: 'scan', showArrow: true })}
                    ${this._renderCell({ text: '听一听', iconColor: '#fbeb4d', iconType: 'listen', showArrow: true })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '小程序', iconColor: '#7d90a9', iconType: 'mini', showArrow: true })}
                </div>
            </div>
        `;
    },

    /**
     * Tab 3: 我
     */
    renderMe_OLD() {
        const s = window.sysStore;
        const userAvatar = (s && s.get('user_avatar')) || 'assets/images/avatar_placeholder.png';
        const nickname = (s && s.get('user_nickname')) || (s && s.get('user_realname')) || 'User';
        const userGender = (s && s.get('user_gender')) || '';
        const userWxid = (s && s.get('user_wxid')) || 'wxid_chara_os_001';

        const genderHtml = this._renderGenderIcon(userGender);

        return `
            <div class="wx-scroller" id="wx-view-me">
                <!-- <div class="wx-nav-spacer"></div> -->
                <div class="wx-profile-header" onclick="window.WeChat.App.openMyProfileSettings()" style="cursor: pointer;">
                    <img src="${userAvatar}" class="wx-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0x.79LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" />
                    <div class="wx-profile-info">
                        <div class="wx-profile-name">${nickname}${genderHtml}</div>
                        <div class="wx-profile-id">
                            <div class="wx-profile-id-row">
                                <span>微信号：${userWxid}</span>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 8px; opacity: 0.5;"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm2 2h2v2h-2v-2z" fill="currentColor"/></svg>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 4px; opacity: 0.3;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                     <div class="wx-cell-arrow"></div>
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({
            text: '服务',
            iconColor: '#07c160',
            iconType: 'service',
            showArrow: true,
            extra: '<span style="font-size:11px; color:var(--wx-text-sec); margin-right:8px;">支付</span>'
        })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderCell({ text: '收藏', iconColor: '#fa9d3b', iconType: 'fav', showArrow: true })}
                     ${this._renderCell({ text: '朋友圈', iconColor: '#2782d7', iconType: 'moments_blue', showArrow: true })}
                     ${this._renderCell({ text: '卡包', iconColor: '#2782d7', iconType: 'card', showArrow: true })}
                     ${this._renderCell({ text: '表情', iconColor: '#ffc300', iconType: 'sticker', showArrow: true })}
                </div>

                <div class="wx-cell-group" style="margin-bottom: 30px;">
                    ${this._renderCell({ text: '设置', iconColor: '#2782d7', iconType: 'settings', showArrow: true })}
                </div>
            </div>
        `;
    },

    /**
     * Tab 3: 我
     */
    renderMe() {
        const s = window.sysStore;
        const userAvatar = (s && s.get('user_avatar')) || 'assets/images/avatar_placeholder.png';
        const nickname = (s && s.get('user_nickname')) || (s && s.get('user_realname')) || 'User';
        const userGender = (s && s.get('user_gender')) || '';
        const userWxid = (s && s.get('user_wxid')) || 'wxid_chara_os_001';

        const genderHtml = this._renderGenderIcon(userGender);

        return `
            <div class="wx-scroller" id="wx-view-me">
                <!-- <div class="wx-nav-spacer"></div> -->
                <div class="wx-profile-header" onclick="window.WeChat.App.openMyProfileSettings()" style="cursor: pointer;">
                    <img src="${userAvatar}" class="wx-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" />
                    <div class="wx-profile-info">
                        <div class="wx-profile-name" style="font-weight:600; display: flex; align-items: center;">${nickname}${genderHtml}</div>
                        <div class="wx-profile-id">
                            <div class="wx-profile-id-row">
                                <span>微信号：${userWxid}</span>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 4px; opacity: 0.3;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({
            text: '服务',
            iconColor: '#07c160',
            iconType: 'service',
            showArrow: true,
            extra: '<span style="font-size:11px; color:var(--wx-text-sec); margin-right:8px;">支付</span>'
        })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderCell({ text: '收藏', iconColor: '#fa9d3b', iconType: 'fav', showArrow: true })}
                     ${this._renderCell({ text: '朋友圈', iconColor: '#2782d7', iconType: 'moments_blue', showArrow: true })}
                     ${this._renderCell({ text: '卡包', iconColor: '#2782d7', iconType: 'card', showArrow: true })}
                     ${this._renderCell({ text: '表情', iconColor: '#ffc300', iconType: 'sticker', showArrow: true })}
                </div>

                <div class="wx-cell-group" style="margin-bottom: 30px;">
                    ${this._renderCell({ text: '设置', iconColor: '#2782d7', iconType: 'settings', showArrow: true })}
                </div>
            </div>
        `;
    },

    // --- Helpers ---
    _renderSwitchCell(text, checked = false, onClick = '') {
        const action = onClick ? `onclick="${onClick}; event.stopPropagation();"` : "onclick=\"this.classList.toggle('checked')\"";
        return `
            <div class="wx-cell wx-hairline-bottom" style="justify-content: space-between;">
                <div class="wx-cell-text" style="font-size: 16px; color: var(--wx-text);">${text}</div>
                <div class="wx-switch ${checked ? 'checked' : ''}" ${action}>
                    <div class="wx-switch-node"></div>
                </div>
            </div>
        `;
    },

    _renderSimpleCell(text, color, type) {
        return this._renderCell({ text, iconColor: color, iconType: type, showArrow: false });
    },

    /**
     * Helper to return 'disabled' if a field is currently locked in State
     */
    _lockAttr(fieldId) {
        return (window.State && window.State.fieldLocks && window.State.fieldLocks[fieldId]) ? 'disabled' : '';
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    escapeQuote(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'");
    },

    _renderGenderIcon(gender) {
        if (!gender) return '';

        // Male: Blue Silhouette with Shirt Collar
        if (gender === 'male') {
            return `
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-left:6px;">
                    <g fill="none" fill-rule="evenodd">
                        <path fill="#267dcc" d="M12,4 C14.7614237,4 17,6.23857625 17,9 C17,11.7614237 14.7614237,14 12,14 C9.23857625,14 7,11.7614237 7,9 C7,6.23857625 9.23857625,4 12,4 Z M12,15 C16.418278,15 20,16.790861 20,19 L20,21 L4,21 L4,19 C4,16.790861 7.581722,15 12,15 Z"/>
                        <path fill="#FFFFFF" opacity="0.9" d="M12,15 L14.5,19 L9.5,19 L12,15 Z" />
                    </g>
                </svg>
            `;
        }

        // Female: Pink Silhouette with Bob Hair and Collar
        if (gender === 'female') {
            return `
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-left:6px;">
                    <g fill="none" fill-rule="evenodd">
                         <!-- Hair & Face Base -->
                        <path fill="#ff4d4f" d="M12,4 C15.5,4 17.5,6.5 17.5,9.5 C17.5,12.5 16,14.5 13.5,14.5 L10.5,14.5 C8,14.5 6.5,12.5 6.5,9.5 C6.5,6.5 8.5,4 12,4 Z M12,15 C16.418278,15 20,16.790861 20,19 L20,21 L4,21 L4,19 C4,16.790861 7.581722,15 12,15 Z"/>
                        <!-- Bow Tie / Collar -->
                        <path fill="#FFFFFF" opacity="0.9" d="M12,15.5 C13,16.2 14.2,16 14.8,15.5 L14.8,16.5 C14,17.2 13,17 12,16.2 C11,17 10,17.2 9.2,16.5 L9.2,15.5 C9.8,16 11,16.2 12,15.5 Z"/>
                    </g>
                </svg>
            `;
        }

        return '';
    },

    _renderCell({ text, iconColor, iconType, showArrow, extra = '', onClick = '', avatar = '' }) {
        let iconHtml = '';
        if (iconType === 'user_avatar') {
            const src = avatar || 'assets/images/avatar_placeholder.png';
            iconHtml = `<img src="${src}" style="width:36px; height:36px; border-radius:4px; margin-right:12px; flex-shrink:0; background:${iconColor}; object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">`;
        } else if (iconType) {
            let svgContent = '';
            switch (iconType) {
                case 'service': svgContent = '<path d="M4 6h16v12H4z" fill="white" fill-opacity="0.8"/>'; break;
                case 'moments': svgContent = '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" fill="none"/>'; break;
                case 'settings': svgContent = '<circle cx="12" cy="12" r="4" stroke="white" stroke-width="2"/>'; break;
                case 'scan': svgContent = '<path d="M4 4h4v2H4v4H2V4h2zm14 0h2v6h-2V6h-4V4h4zm0 16h-4v-2h4v-4h2v6h-2zM4 20h4v2H4h-2v-6h2v4z" fill="white"/>'; break;
                case 'listen': svgContent = '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>'; break;
                case 'contact_add': svgContent = '<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>'; break;
                case 'group': svgContent = '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="white"/>'; break;
                case 'tag': svgContent = '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill="white"/>'; break;
                case 'offical': svgContent = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="white"/>'; break;
                default: svgContent = '<rect x="6" y="6" width="12" height="12" fill="white"/>';
            }
            const iconStyle = `display:flex; align-items:center; justify-content:center; background-color:${iconColor}; width:36px; height:36px; border-radius:4px; margin-right:12px; flex-shrink:0;`;
            iconHtml = `<div style="${iconStyle}"><svg viewBox="0 0 24 24" style="width:20px; height:20px">${svgContent}</svg></div>`;
        }

        const arrowHtml = showArrow ?
            `<div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
             </div>` : '';

        return `
            <div class="wx-cell wx-hairline-bottom" onclick="${onClick}" style="${onClick ? 'cursor:pointer;' : ''}">
                ${iconHtml}
                <div class="wx-cell-content" style="font-size:16px;">${this.escapeHtml(text)}</div>
                ${extra}
                ${arrowHtml}
            </div>
        `;
    },

    // --- Time Utils ---
    toggleMsgTime(el, timestamp) {
        const isFull = el.getAttribute('data-full') === 'true';
        // Toggle state
        const newState = !isFull;
        el.innerText = this._formatChatTime(timestamp, newState);
        el.setAttribute('data-full', newState);
    },

    _formatChatTime(timestamp, full = false) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();

        const pad = (n) => n < 10 ? '0' + n : n;
        const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`; // 24h format

        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

        if (full) {
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${weekDays[date.getDay()]} ${timeStr}`;
        }

        // Logic based on requirements
        const isToday = now.toDateString() === date.toDateString();

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = yesterday.toDateString() === date.toDateString();

        // One week logic (approximation)
        const diffTime = now.getTime() - date.getTime();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const isWithinWeek = diffTime < oneWeekMs && diffTime > 0;

        const isSameYear = now.getFullYear() === date.getFullYear();

        if (isToday) {
            return timeStr;
        } else if (isYesterday) {
            return `昨天 ${timeStr}`;
        } else if (isWithinWeek) {
            return `星期${weekDays[date.getDay()]} ${timeStr}`;
        } else if (isSameYear) {
            return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
        } else {
            return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
        }
    },

    /**
     * 渲染角色面板
     */
    renderCharacterPanel(sessionId) {
        const char = window.sysStore.getCharacter(sessionId) || {};
        const status = char.status || {};

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeCharacterPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()">
                    <div class="wx-char-panel-header">
                        <div class="wx-char-panel-close" onclick="window.WeChat.App.closeCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                        <div class="wx-char-panel-actions">
                            <div class="wx-char-panel-action" onclick="window.WeChat.App.openRelationshipPanel()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </div>
                            <div class="wx-char-panel-action" onclick="window.WeChat.App.openStatusHistoryPanel()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                        </div>
                    </div>

                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding-bottom: 24px; scrollbar-width: none; -ms-overflow-style: none;">
                        <style>.wx-char-panel-scrollable::-webkit-scrollbar { display: none; }</style>
                        <div class="wx-char-panel-main">
                            <img src="${char.avatar || 'assets/images/avatar_placeholder.png'}" class="wx-char-panel-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">
                            <div class="wx-char-panel-name">${char.name || '未知角色'}</div>
                            <div class="wx-char-panel-affection">❤️ ${status.affection || '0.0'}</div>
                        </div>

                        <div class="wx-char-panel-cards">
                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title">
                                        <span>👕</span> 服装
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.outfit || '暂无描述')}
                                </div>
                            </div>

                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title behavior">
                                        <span>🏃</span> 行为
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.behavior || '暂无描述')}
                                </div>
                            </div>

                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title voice">
                                        <span>☁️</span> 心声
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.inner_voice || status.heartfelt_voice || '暂无消息')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染关系管理面板
     */
    renderRelationshipPanel(sessionId) {
        const rel = State.pendingRelationship;
        if (!rel) return '';

        const affection = rel.affection;
        const difficulty = rel.difficulty;

        const diffText = {
            'hard': '困难模式，难加易减，每次好感度增加上限 0.1',
            'normal': '普通模式，平衡增减，每次好感度增加上限 0.5',
            'easy': '容易模式，易加难减，每次好感度增加上限 1.0'
        };

        const ladderHtml = rel.ladder_persona.map((lp, idx) => `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid #f0f0f0; position: relative;">
                <div style="display: flex; align-items: center; margin-bottom: 8px; gap: 8px;">
                    <span style="font-size: 11px; color: #999;">解锁阈值</span>
                    <input type="number" value="${lp.affection_threshold}" 
                        style="width: 50px; height: 28px; background: #fff; border: 1px solid #eee; border-radius: 6px; text-align: center; font-size: 13px; outline: none;"
                        oninput="window.WeChat.App.updateLadderPersona(${idx}, 'affection_threshold', parseFloat(this.value), true)">
                    <div style="flex: 1;"></div>
                    <div style="cursor: pointer; padding: 4px; color: #ff3b30; opacity: 0.6;" onclick="window.WeChat.App.removeLadderPersona(${idx})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
                ${this._renderFieldHeader(`阶段 ${idx + 1} 表现`, `wx-rel-ladder-content-${idx}`)}
                <textarea id="wx-rel-ladder-content-${idx}" ${this._lockAttr(`wx-rel-ladder-content-${idx}`)} style="width: 100%; min-height: 50px; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 8px; box-sizing: border-box; font-size: 13px; outline: none; resize: none; line-height: 1.4; color: #333;"
                    placeholder="输入该好感阶段下的角色表现..."
                    oninput="window.WeChat.App.updateLadderPersona(${idx}, 'content', this.value, true)">${lp.content}</textarea>
            </div>
        `).join('');

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeRelationshipPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()" style="padding: 0;">
                    <!-- Header -->
                    <div style="position: relative; height: 50px; display: flex; align-items: center; padding: 0 16px; margin-top: 10px;">
                        <!-- Left: Back Button -->
                        <div style="z-index: 2; cursor: pointer; padding: 4px;" onclick="window.WeChat.App.openCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>
                        
                        <!-- Center: Title -->
                        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 16px; font-weight: 700; color: #333; z-index: 1;">
                            关系管理
                        </div>

                        <!-- Right: Actions -->
                        <div style="margin-left: auto; z-index: 2; display: flex; gap: 12px; align-items: center;">
                            <!-- Clear/Trash Icon -->
                            <div onclick="window.WeChat.App.openConfirmationModal({title: '清空关系', content: '确定要清空所有关系设定吗？', onConfirm: () => window.WeChat.App.clearRelationshipSettings()})" style="cursor: pointer; color: #ff3b30; display: flex; align-items: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </div>

                             <!-- AI Dice Icon -->
                            <div id="wx-rel-gen-btn" onclick="window.WeChat.App.generateFullRelationshipData()" style="cursor: pointer; color: #007aff; display: flex; align-items: center;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                    <circle cx="16" cy="8" r="2"></circle>
                                    <circle cx="8" cy="16" r="2"></circle>
                                    <circle cx="8" cy="8" r="2"></circle>
                                    <circle cx="16" cy="16" r="2"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding: 0 24px 24px 24px;">
                        
                        <!-- 好感度数值 -->
                        <div style="margin-top: 15px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 10px;">好感度数值</div>
                            <div style="background: #fff; border-radius: 16px; padding: 20px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <span style="font-weight: 700; font-size: 14px; color: #333;">当前该角色好感度</span>
                                    <span style="font-weight: 700; font-size: 16px; color: #0052d9;">${affection}</span>
                                </div>
                                <input type="range" min="-100" max="100" step="0.1" value="${affection}" 
                                    style="width: 100%; -webkit-appearance: none; height: 6px; background: #e0e0e0; border-radius: 3px; outline: none;"
                                    oninput="this.previousElementSibling.children[1].innerText = parseFloat(this.value).toFixed(1); window.WeChat.App.updatePendingRelationship('affection', parseFloat(this.value), null, true)">
                            </div>
                        </div>

                        <!-- 攻略难度设定 -->
                        <div style="margin-top: 20px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 10px;">攻略难度设定</div>
                            <div style="background: #fff; border-radius: 16px; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; display: flex; gap: 4px;">
                                <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'hard')" 
                                     style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'hard' ? '600' : '400'}; color: ${difficulty === 'hard' ? '#333' : '#999'}; background: ${difficulty === 'hard' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'hard' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                                     困难
                                </div>
                                <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'normal')" 
                                     style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'normal' ? '600' : '400'}; color: ${difficulty === 'normal' ? '#0052d9' : '#999'}; background: ${difficulty === 'normal' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'normal' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                                     普通
                                </div>
                                <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'easy')" 
                                     style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'easy' ? '600' : '400'}; color: ${difficulty === 'easy' ? '#00a870' : '#999'}; background: ${difficulty === 'easy' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'easy' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                                     容易
                                </div>
                            </div>
                            <div style="text-align: center; font-size: 11px; color: #bbb; margin-top: 8px;">
                                ${diffText[difficulty]}
                            </div>
                        </div>

                        <!-- 关系透镜 -->
                        <div style="margin-top: 20px;">
                            <div style="font-size: 13px; color: #999; margin-bottom: 12px; font-weight: 500; padding-left: 4px;">关系透镜 (决定AI如何思考)</div>
                            <div style="background: #fff; border-radius: 18px; padding: 24px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #f2f2f2;">
                                
                                <!-- Objective Relation -->
                                <div style="margin-bottom: 24px; border-bottom: 1px dashed #eee; padding-bottom: 24px;">
                                    ${this._renderFieldHeader('表面 / 客观关系 (对外的名义)', 'wx-rel-public_relation')}
                                    <div style="font-size: 11px; color: #999; margin-bottom: 10px;">
                                        例如：兄妹、师生、同事、死对头...
                                    </div>
                                    <input type="text" id="wx-rel-public_relation" value="${rel.public_relation || ''}" placeholder="在此填写客观身份..." ${this._lockAttr('wx-rel-public_relation')}
                                        style="width: 100%; height: 44px; background: #f7f8fa; border: 1px solid #eee; border-radius: 12px; padding: 0 16px; box-sizing: border-box; font-size: 15px; color: #333; outline: none; transition: border 0.2s;"
                                        oninput="window.WeChat.App.updatePendingRelationship('public_relation', this.value, null, true)">
                                </div>
                                
                                <!-- Character View (Merged Dual Layer) -->
                                <div style="margin-bottom: 24px;">
                                    <div style="font-size: 15px; font-weight: 700; color: #333; margin-bottom: 12px;">角色对用户</div>
                                    
                                    <!-- Surface Layer -->
                                    <div style="margin-bottom: 12px;">
                                        ${this._renderFieldHeader('表现出的态度', 'wx-rel-char_to_user_public')}
                                        <textarea id="wx-rel-char_to_user_public" placeholder="例如：嘴上嫌弃笨手笨脚，经常吐槽..." ${this._lockAttr('wx-rel-char_to_user_public')}
                                            style="width: 100%; height: 70px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 10px; box-sizing: border-box; font-size: 14px; resize: none; outline: none; line-height: 1.5; color: #333;"
                                            oninput="window.WeChat.App.updatePendingRelationship('char_to_user_public', this.value, null, true)">${rel.char_to_user_public || ''}</textarea>
                                    </div>

                                    <!-- Inner Layer -->
                                    <div>
                                        ${this._renderFieldHeader('内心真实想法 (秘密)', 'wx-rel-char_to_user_secret')}
                                        <textarea id="wx-rel-char_to_user_secret" placeholder="例如：其实觉得那样很可爱，只是不好意思承认..." ${this._lockAttr('wx-rel-char_to_user_secret')}
                                            style="width: 100%; height: 70px; background: #fffafa; border: 1px solid #ffebea; border-radius: 10px; padding: 10px; box-sizing: border-box; font-size: 14px; resize: none; outline: none; line-height: 1.5; color: #333;"
                                            oninput="window.WeChat.App.updatePendingRelationship('char_to_user_secret', this.value, null, true)">${rel.char_to_user_secret || ''}</textarea>
                                    </div>
                                </div>

                                <!-- User View (Merged Dual Layer) -->
                                <div style="margin-bottom: 24px;">
                                    <div style="font-size: 15px; font-weight: 700; color: #333; margin-bottom: 12px;">用户对角色</div>
                                    
                                    <!-- Surface Layer -->
                                    <div style="margin-bottom: 12px;">
                                        ${this._renderFieldHeader('表现出的态度', 'wx-rel-user_to_char_public')}
                                        <textarea id="wx-rel-user_to_char_public" placeholder="例如：总是表现得很听话，顺着TA的意思..." ${this._lockAttr('wx-rel-user_to_char_public')}
                                            style="width: 100%; height: 70px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 10px; box-sizing: border-box; font-size: 14px; resize: none; outline: none; line-height: 1.5; color: #333;"
                                            oninput="window.WeChat.App.updatePendingRelationship('user_to_char_public', this.value, null, true)">${rel.user_to_char_public || ''}</textarea>
                                    </div>

                                    <!-- Inner Layer -->
                                    <div>
                                        ${this._renderFieldHeader('内心真实想法 (秘密)', 'wx-rel-user_to_char_secret')}
                                        <textarea id="wx-rel-user_to_char_secret" placeholder="例如：其实只是在敷衍，并没有真正认同..." ${this._lockAttr('wx-rel-user_to_char_secret')}
                                            style="width: 100%; height: 70px; background: #fffafa; border: 1px solid #ffebea; border-radius: 10px; padding: 10px; box-sizing: border-box; font-size: 14px; resize: none; outline: none; line-height: 1.5; color: #333;"
                                            oninput="window.WeChat.App.updatePendingRelationship('user_to_char_secret', this.value, null, true)">${rel.user_to_char_secret || ''}</textarea>
                                        <div style="font-size: 11px; color: #999; margin-top: 6px;">* 角色不知道你有这个想法。</div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <!-- 阶梯人设 -->
                        <div style="margin-top: 24px;">
                            ${this._renderFieldHeader('关系进阶 (随好感度变化)', 'wx-rel-ladder')}
                            <div id="wx-ladder-list">
                                ${ladderHtml}
                            </div>
                            <div onclick="window.WeChat.App.addLadderPersona()" style="border: 1.5px dashed #007aff55; border-radius: 14px; padding: 12px; display: flex; align-items: center; justify-content: center; color: #007aff; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 10px;">
                                <span style="font-size: 18px; margin-right: 4px; line-height: 18px;">+</span> 添加人设阶段
                            </div>
                        </div>

                    </div>

                    <!-- Footer Buttons -->
                    <div style="display: flex; gap: 12px; padding: 16px 24px 24px 24px; background: #fff; border-bottom-left-radius: 32px; border-bottom-right-radius: 32px;">
                        <div onclick="window.WeChat.App.closeRelationshipPanel()" style="flex: 1; height: 46px; background: #f2f2f2; color: #666; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; cursor: pointer;">
                            取消
                        </div>
                        <div onclick="window.WeChat.App.saveRelationshipChanges()" style="flex: 1.4; height: 46px; background: #fff0f3; color: #ff6b81; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; cursor: pointer;">
                            保存更改
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染状态历史记录面板
     */
    renderStatusHistoryPanel(sessionId) {
        const char = window.sysStore.getCharacter(sessionId) || {};
        const history = char.status_history || [];

        let listHtml = history.map(record => {
            const timeStr = new Date(record.timestamp).toLocaleString('zh-CN', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `
                <div style="background: #fff; border-radius: 20px; padding: 16px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="font-size: 13px; color: #999; font-weight: 500;">${timeStr}</div>
                        <div style="cursor: pointer; padding: 4px; color: #ccc;" onclick="window.WeChat.App.deleteStatusHistoryRecord('${sessionId}', ${record.timestamp})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <div style="font-size: 12px; color: gold; line-height: 1.5; width: 100%;">❤️ 好感度: ${record.status?.affection || '0.0'}</div>
                        <div style="font-size: 12px; color: var(--wx-text); line-height: 1.5; width: 100%;">
                            👕 服装: ${record.status?.outfit || '暂无描述'}
                        </div>
                        <div style="font-size: 12px; color: var(--wx-text-sec); line-height: 1.5; width: 100%;">
                            🏃 行为: ${record.status?.behavior || '暂无描述'}
                        </div>
                        <div style="font-size: 11px; color: #999; line-height: 1.4; background: var(--wx-bg-alt); padding: 8px 12px; border-radius: 12px; width: 100%; margin-top: 4px; font-style: italic;">
                            心声: ${record.status?.inner_voice || '无'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (history.length === 0) {
            listHtml = `
                <div style="text-align: center; padding: 60px 20px; color: #ccc;">
                    <div style="font-size: 40px; margin-bottom: 16px; opacity: 0.5;">🕒</div>
                    <div style="font-size: 14px;">暂无历史状态记录</div>
                </div>
            `;
        }

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeStatusHistoryPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()" style="padding: 0;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 10px 24px;">
                        <div style="cursor: pointer; padding: 4px; margin-left: -4px;" onclick="window.WeChat.App.openCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: #333;">状态历史</div>
                        <div style="width: 24px;"></div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding: 0 24px 24px 24px;">
                        <div style="margin-top: 20px;">
                            ${listHtml}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px 24px 24px 24px; background: #fff; border-bottom-left-radius: 32px; border-bottom-right-radius: 32px;">
                        <div onclick="window.WeChat.App.closeStatusHistoryPanel()" style="width: 100%; height: 50px; background: #f5f6f8; color: #666; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; cursor: pointer;">
                            关闭
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * World Book Selection Page
     */
    renderWorldBookSelection(sessionId) {
        const char = window.sysStore.getCharacter(sessionId);
        const selectedIds = char?.settings?.world_book_ids || [];

        // Fetch all world book entries
        const entries = window.sysStore.get('chara_db_worldbook', []);
        const customGroups = window.sysStore.get('chara_db_worldbook_groups', []);

        // Group entries (Strict Sync with WorldBookApp)
        const groups = {};

        // 1. Initialize custom groups
        customGroups.forEach(g => {
            groups[g.id] = { name: g.name, entries: [], isCustom: true };
        });

        // 2. Ensure 'uncategorized' exists
        if (!groups['uncategorized']) {
            groups['uncategorized'] = { name: '未分类', entries: [], isCustom: true };
        }

        entries.forEach(e => {
            let gid = e.groupId;

            // Force strict group matching: If not a valid custom group, goto uncategorized
            if (!groups[gid] || gid === 'global' || gid === 'uncategorized') {
                gid = 'uncategorized';
            }

            // Fallback Init (Safe)
            if (!groups[gid]) {
                groups[gid] = { name: '未分类', entries: [], isCustom: true };
            }
            groups[gid].entries.push(e);
        });

        // Generate HTML
        const sortedCids = Object.keys(groups)
            .filter(gid => groups[gid].entries.length > 0) // Hide empty groups in Selector for cleaner view
            .sort((a, b) => {
                if (a === 'uncategorized') return 1;
                if (b === 'uncategorized') return -1;
                return groups[a].name.localeCompare(groups[b].name);
            });

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#000' : '#EDEDED';

        let sectionsHtml = sortedCids.map(cid => {
            const group = groups[cid];
            const itemsHtml = group.entries.map(e => {
                const checked = selectedIds.includes(e.id);
                return `
                    <div class="wx-wb-select-item" onclick="window.WeChat.App.toggleWorldBookSelection('${e.id}')">
                         <div style="flex:1;">
                            <div style="font-size:16px; color:var(--wx-text); font-weight:500;">${e.name}</div>
                            <div style="font-size:13px; color:var(--wx-text-sec); margin-top:2px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${e.content || '无内容'}</div>
                         </div>
                         <div class="wx-wb-checkbox ${checked ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                         </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="wx-wb-select-section">
                    <div class="wx-wb-select-header">
                        ${group.name} (${group.entries.length})
                    </div>
                    <div class="wx-wb-select-body">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="wx-scroller" id="wx-view-worldbook-select" style="background-color: ${pageBg}; padding-top: calc(var(--wx-nav-height) - 20px);">
                <!-- <div class="wx-nav-spacer"></div> -->
                ${sectionsHtml || '<div style="padding:100px 20px; text-align:center; color:#999;">暂无世界书条目</div>'}
                <div style="height: 60px;"></div>
            </div>
        `;
    },

    renderVoiceCallModal_OLD(state) {
        if (!state.open) return '';

        const avatar = state.avatar || 'assets/images/avatar_placeholder.png';
        const name = state.name || '未知用户';
        const statusText = state.status === 'connected' ? (state.durationStr || '00:00') : (state.status === 'ended' ? '通话结束' : '正在等待对方接受邀请...');
        const isConnected = state.status === 'connected';

        const pulseClass = (state.status === 'dialing' || state.status === 'waiting') ? 'pulsing' : '';
        const blurStyle = (state.avatar) ? `background-image: url('${state.avatar}');` : 'background-color: #333;';

        // --- Subtitles ---
        let subtitlesHtml = '';
        if (isConnected && window.sysStore) {
            const msgs = window.sysStore.getMessagesBySession(state.sessionId);
            const recentMsgs = msgs; // All Messages
            const items = recentMsgs.map(m => {
                const isMe = (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my');
                if (m.type === 'system' || m.type === 'transfer_status') return '';
                let content = m.content;
                if (m.type === 'image') content = '[图片]';
                if (m.type === 'voice') content = '[语音]';
                return `<div class="wx-call-subtitle-item ${isMe ? 'me' : ''}">${content}</div>`;
            }).join('');

            if (items) {
                // Auto-scroll script injection
                const scrollScript = `<img src="" onerror="setTimeout(() => { const el = document.getElementById('wx-call-subs'); if(el) el.scrollTop = el.scrollHeight; }, 10); this.remove();" style="display:none;">`;
                subtitlesHtml = `<div class="wx-call-subtitles" id="wx-call-subs">${items}${scrollScript}</div>`;
            }
        }

        // Buttons logic
        let buttonsHtml = '';

        if (state.status === 'dialing' || state.status === 'waiting') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">取消</span>
                </div>
            `;
        } else if (state.status === 'connected') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallReply()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">回复</span>
                </div>

                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">挂断</span>
                </div>
                
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallInput()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="14" y2="16"></line><line x1="18" y1="16" x2="18" y2="16"></line></svg>
                    </div>
                    <span class="wx-call-btn-label">输入</span>
                </div>
            `;
        }

        return `
            < style >
                .wx - call - modal { position: fixed!important; top: 0; left: 0; width: 100 %; height: 100 %; z - index: 10000; background: #222; display: flex; flex - direction: column; overflow: hidden; font - family: -apple - system, BlinkMacSystemFont, "Segoe UI", Roboto, sans - serif; }
                .wx - call - bg - blur { position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; background - size: cover; background - position: center; filter: blur(30px) brightness(0.6); z - index: -1; }
                .wx - call - content { position: relative; z - index: 1; height: 100 %; display: flex; flex - direction: column; }
                .wx - call - header { height: 60px; display: flex; align - items: center; padding: 0 16px; }
                .wx - call - minimize { width: 32px; height: 32px; display: flex; align - items: center; justify - content: center; background: rgba(255, 255, 255, 0.2); border - radius: 50 %; cursor: pointer; }
                .wx - call - info { flex: 1; display: flex; flex - direction: column; align - items: center; justify - content: center; transition: all 0.3s ease; }
                .wx - call - avatar { width: 100px; height: 100px; border - radius: 12px; object - fit: cover; box - shadow: 0 8px 24px rgba(0, 0, 0, 0.3); margin - bottom: 20px; }
                .wx - call - avatar.pulse { animation: wx - ripple 2s infinite; }
                .wx - call - name { font - size: 24px; font - weight: 500; margin - bottom: 12px; color: white; text - shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
                .wx - call - status { font - size: 16px; color: rgba(255, 255, 255, 0.7); font - weight: 400; }
                .wx - call - actions { width: 100 %; display: flex; justify - content: space - around; align - items: flex - end; padding: 0 40px 40px 40px; box - sizing: border - box; }
                .wx - call - btn - group { display: flex; flex - direction: column; align - items: center; gap: 12px; }
                .wx - call - btn { width: 64px; height: 64px; border - radius: 50 %; background: rgba(255, 255, 255, 0.15); backdrop - filter: blur(10px); display: flex; align - items: center; justify - content: center; cursor: pointer; color: white; }
                .wx - call - btn:active { transform: scale(0.92); background: rgba(255, 255, 255, 0.25); }
                .wx - call - btn.hangup { background: #fa5151; width: 72px; height: 72px; box - shadow: 0 4px 12px rgba(250, 81, 81, 0.3); }
                .wx - call - btn.answer { background: #07c160; width: 72px; height: 72px; box - shadow: 0 4px 12px rgba(7, 193, 96, 0.3); }
                .wx - call - btn - label { font - size: 13px; color: rgba(255, 255, 255, 0.7); text - shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
@keyframes wx - ripple { 0 % { box- shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); } 70 % { box- shadow: 0 0 0 20px rgba(255, 255, 255, 0); } 100 % { box- shadow: 0 0 0 0 rgba(255, 255, 255, 0); } }
                .wx - call - subtitles { flex: 1; width: 100 %; overflow - y: auto; padding: 20px 30px; box - sizing: border - box; display: flex; flex - direction: column; justify - content: flex - end; margin - bottom: 20px; mask - image: linear - gradient(to bottom, transparent, black 20 %); -webkit - mask - image: linear - gradient(to bottom, transparent, black 20 %); }
                .wx - call - subtitle - item { background: rgba(0, 0, 0, 0.4); backdrop - filter: blur(5px); padding: 8px 12px; border - radius: 12px; border - bottom - left - radius: 2px; margin - bottom: 12px; color: rgba(255, 255, 255, 0.95); font - size: 15px; line - height: 1.5; align - self: flex - start; max - width: 85 %; animation: wx - fade -in -up 0.3s ease - out; }
                .wx - call - subtitle - item.me { align - self: flex - end; background: rgba(7, 193, 96, 0.65); border - bottom - left - radius: 12px; border - bottom - right - radius: 2px; }
@keyframes wx - fade -in -up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style >
    <div class="wx-call-modal">
        <div class="wx-call-bg-blur" style="${blurStyle}"></div>

        <div class="wx-call-content">
            <div class="wx-call-header">
                <div class="wx-call-minimize" onclick="window.WeChat.App.minimizeVoiceCall()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </div>
            </div>

            <div class="wx-call-info" style="${subtitlesHtml ? 'margin-top: 20px; flex: 0 0 auto;' : 'flex: 1; justify-content: center; margin-top: -60px;'}">
                <img src="${avatar}" class="wx-call-avatar ${pulseClass}" onerror="this.src='assets/images/avatar_placeholder.png'">
                    <div class="wx-call-name">${name}</div>
                    <div class="wx-call-status" id="wx-call-status-text">${statusText}</div>
            </div>

            ${subtitlesHtml}

            <div class="wx-call-actions">
                ${buttonsHtml}
            </div>
        </div>
    </div>
`;
    },

    renderVoiceCallModal(state) {
        if (!state.open) return '';

        const avatar = state.avatar || 'assets/images/avatar_placeholder.png';
        const name = state.name || 'Unknown';
        const statusText = state.status === 'dialing' ? '正在等待对方接受邀请...' :
            state.status === 'connected' ? (state.durationStr || '00:00') :
                state.status === 'ended' ? '通话结束' : '...';

        const pulseClass = (state.status === 'dialing') ? 'pulsing' : '';
        const blurStyle = `background-image: url('${avatar}');`;

        // Subtitles Logic
        let subtitlesHtml = '';
        if (state.status === 'connected') {
            const msgs = window.sysStore ? window.sysStore.getMessagesBySession(state.sessionId) : [];
            // Slice last 20 for performance
            const recentMsgs = msgs.slice(-20);

            let items = '';
            const callStartTime = state.startTime || 0;

            recentMsgs.forEach(msg => {
                // [Feature] Only show messages that occurred AFTER the voice call started
                // This prevents chat history from cluttering the voice call view ("like real WeChat")
                if (msg.timestamp && msg.timestamp < callStartTime) return;

                const isMe = msg.sender_id === 'me';
                const text = msg.content;
                // Filter non-text or simple text
                if (msg.type === 'text') {
                    items += `<div class="wx-call-subtitle-item ${isMe ? 'me' : ''}">${text}</div>`;
                }
            });

            if (items) {
                // Auto-scroll script injection
                const scrollScript = `<img src="" onerror="setTimeout(() => { const el = document.getElementById('wx-call-subs'); if(el) el.scrollTop = el.scrollHeight; }, 10); this.remove();" style="display:none;">`;
                subtitlesHtml = `<div class="wx-call-subtitles" id="wx-call-subs">${items}${scrollScript}</div>`;
            }
        }

        // Buttons logic
        let buttonsHtml = '';

        if (state.status === 'dialing' || state.status === 'waiting') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">取消</span>
                </div>
            `;
        } else if (state.status === 'connected') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallReply()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">回复</span>
                </div>

                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">挂断</span>
                </div>
                
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallInput()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="14" y2="16"></line><line x1="18" y1="16" x2="18" y2="16"></line></svg>
                    </div>
                    <span class="wx-call-btn-label">输入</span>
                </div>
            `;
        }

        return `
            <style>
                .wx-call-modal { position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background: #222; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                .wx-call-bg-blur { position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; background-size: cover; background-position: center; filter: blur(30px) brightness(0.6); z-index: -1; }
                .wx-call-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
                .wx-call-header { height: 60px; display: flex; align-items: center; padding: 0 16px; }
                .wx-call-minimize { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; cursor: pointer; }
                .wx-call-info { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.3s ease; }
                .wx-call-avatar { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.3); margin-bottom: 20px; }
                .wx-call-avatar.pulsing { animation: wx-ripple 2s infinite; }
                .wx-call-name { font-size: 24px; font-weight: 500; margin-bottom: 12px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                .wx-call-status { font-size: 16px; color: rgba(255,255,255,0.7); font-weight: 400; }
                .wx-call-actions { width: 100%; display: flex; justify-content: space-around; align-items: flex-end; padding: 0 40px 40px 40px; box-sizing: border-box; }
                .wx-call-btn-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .wx-call-btn { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
                .wx-call-btn:active { transform: scale(0.92); background: rgba(255,255,255,0.25); }
                .wx-call-btn.hangup { background: #fa5151; width: 72px; height: 72px; box-shadow: 0 4px 12px rgba(250,81,81,0.3); }
                .wx-call-btn.answer { background: #07c160; width: 72px; height: 72px; box-shadow: 0 4px 12px rgba(7,193,96,0.3); }
                .wx-call-btn-label { font-size: 13px; color: rgba(255,255,255,0.7); text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                @keyframes wx-ripple { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); } 70% { box-shadow: 0 0 0 20px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
                .wx-call-subtitles { flex: 1; width: 100%; overflow-y: auto; padding: 20px 30px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end; margin-bottom: 20px; mask-image: linear-gradient(to bottom, transparent, black 20%); -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%); }
                .wx-call-subtitle-item { background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); padding: 8px 12px; border-radius: 12px; border-bottom-left-radius: 2px; margin-bottom: 12px; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.5; align-self: flex-start; max-width: 85%; animation: wx-fade-in-up 0.3s ease-out; }
                .wx-call-subtitle-item.me { align-self: flex-end; background: rgba(7,193,96,0.65); border-bottom-left-radius: 12px; border-bottom-right-radius: 2px; }
                @keyframes wx-fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div class="wx-call-modal">
                <div class="wx-call-bg-blur" style="${blurStyle}"></div>
                
                <div class="wx-call-content">
                    <div class="wx-call-header">
                        <div class="wx-call-minimize" onclick="window.WeChat.App.minimizeVoiceCall()">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                    </div>
                    
                    <div class="wx-call-info" style="${subtitlesHtml ? 'margin-top: 20px; flex: 0 0 auto;' : 'flex: 1; justify-content: center; margin-top: -60px;'}">
                         <img src="${avatar}" class="wx-call-avatar ${pulseClass}" onerror="this.src='assets/images/avatar_placeholder.png'">
                         <div class="wx-call-name">${name}</div>
                         <div class="wx-call-status" id="wx-call-status-text">${statusText}</div>
                    </div>
                    
                    ${subtitlesHtml}

                    <div class="wx-call-actions">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    },
    renderCallSummaryModal(state) {
        if (!state.open) return '';

        return `
            <div class="wx-modal-overlay show" style="z-index: 10001;">
                <div class="wx-modal-container show" style="width: 300px; padding: 0; background: white; border-radius: 12px; overflow: hidden;">
                    <div style="padding: 24px 24px 12px 24px;">
                        <div style="font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 8px;">通话总结</div>
                        <div style="font-size: 14px; color: #888; text-align: center; margin-bottom: 20px;">时长: ${state.duration}</div>
                        <div style="font-size: 15px; color: #333; line-height: 1.6; max-height: 300px; overflow-y: auto; white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px;">${state.summary}</div>
                    </div>
                    <div style="display: flex; border-top: 1px solid rgba(0,0,0,0.1);">
                        <div style="flex: 1; text-align: center; padding: 16px; font-size: 17px; font-weight: 600; color: #07c160; cursor: pointer;" 
                             onclick="window.State.callSummaryModal.open = false; window.WeChat.App.render();">关闭</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染 Prompt 输入模态框
     * 用于语音通话输入、编辑等场景
     */
    renderPromptModal(state) {
        if (!state || !state.open) return '';

        const title = state.title || '请输入';
        const placeholder = state.placeholder || '请输入...';
        const value = state.value || '';
        const content = state.content || '';

        return `
            <div class="wx-modal-overlay active" style="z-index: 20003; background: rgba(0,0,0,0.5);" onclick="window.WeChat.App.closePromptModal()">
                <div class="wx-ios-alert" onclick="event.stopPropagation()" style="width: 280px; background: white; border-radius: 14px; overflow: hidden;">
                    <div style="padding: 20px 16px 16px 16px;">
                        <div style="font-size: 17px; font-weight: 600; text-align: center; margin-bottom: 12px; color: #333;">${title}</div>
                        ${content ? `<div style="font-size: 13px; color: #666; text-align: center; margin-bottom: 12px;">${content}</div>` : ''}
                        <input type="text" id="wx-prompt-input" value="${this.escapeQuote(value)}" placeholder="${placeholder}" 
                            style="width: 100%; height: 40px; padding: 0 12px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; outline: none; background: #f8f8f8;"
                            onclick="event.stopPropagation()"
                            onkeydown="if(event.key==='Enter') window.WeChat.App.confirmPromptModal()">
                    </div>
                    <div style="display: flex; border-top: 1px solid rgba(0,0,0,0.1);">
                        <div style="flex: 1; text-align: center; padding: 14px; font-size: 17px; color: #666; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1);"
                             onclick="window.WeChat.App.closePromptModal()">取消</div>
                        <div style="flex: 1; text-align: center; padding: 14px; font-size: 17px; font-weight: 600; color: #07c160; cursor: pointer;"
                             onclick="window.WeChat.App.confirmPromptModal()">确定</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染 Alert 警告模态框（备用）
     */
    renderAlertModal() {
        // 目前使用 confirmationModal 代替，这里返回空
        return '';
    },

    /**
     * 渲染 Confirmation 确认模态框（备用）
     * 主逻辑在 index.js 的 renderModals 中已处理
     */
    renderConfirmationModal() {
        // 主要的确认模态框逻辑在 index.js 的 renderModals 中，这里返回空
        return '';
    }
};

