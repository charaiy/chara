/**
 * js/apps/wechat/ui/views_chat.js
 * 聊天视图渲染服务 - 负责渲染聊天会话界面
 * 
 * 职责：
 * - 渲染聊天会话界面（消息列表、输入框、工具栏）
 * - 处理消息时间戳显示逻辑
 * - 渲染聊天背景（支持自定义背景图片）
 * - 处理消息滚动和自动滚动到底部
 * - 渲染聊天信息页面（设置、资料等）
 * 
 * 特性：
 * - 支持隐藏系统消息（hidden: true）
 * - 支持跳过特定类型消息（voice_*, thought_chain等）
 * - 自动滚动到最新消息
 * - 支持聊天背景自定义
 * 
 * 依赖：
 * - window.WeChat.UI.Bubbles: 消息气泡渲染
 * - window.sysStore: 消息和角色数据
 * - window.WeChat.Components: 通用组件（NavBar等）
 */

window.WeChat = window.WeChat || {};

window.WeChat.Views = Object.assign(window.WeChat.Views || {}, {
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
            // [Fix] Skip voice-call specific messages in main chat
            if (m.type && m.type.startsWith('voice_')) return '';

            // [Fix] Skip hidden system messages (visible to AI but not in UI)
            if (m.type === 'system' && m.hidden === true) return '';

            // [Fix] Skip thought_chain messages (should not be displayed in chat)
            if (m.type === 'thought_chain') return '';

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
                    <div class="wx-chat-btn" id="wx-smart-reply-btn" onclick="window.WeChat.Services.Chat.triggerSmartReply()">
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
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerVideoCall()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div><span>视频通话</span></div>
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
                // Safe find last valid message
                let lastMsg = null;
                if (msgs && msgs.length > 0) {
                    for (let i = msgs.length - 1; i >= 0; i--) {
                        if (msgs[i].type !== 'voice_text') {
                            lastMsg = msgs[i];
                            break;
                        }
                    }
                }

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
                        <span style="font-size: 15px; font-weight: 500; color: var(--wx-text);">${this.escapeHtml(chat.name)}</span>
                        <span style="font-size: 9px; color: var(--wx-text-sec);">${chat.time}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--wx-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 30px;">
                        ${this.escapeHtml(chat.lastMsg)}
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
                     <div onclick="window.WeChat.App.openUserProfile('${sessionId}', '${this.escapeQuote(realName)}')" style="display: flex; flex-direction: column; align-items: center; width: 56px; cursor: pointer;">
                        <img src="${avatar}" style="width: 56px; height: 56px; border-radius: 6px; margin-bottom: 6px; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                        <span style="font-size: 11px; color: var(--wx-text-sec); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(realName)}</span>
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
                            <div style="font-size: 15px; font-weight: 500; color: var(--wx-text); margin-bottom: 2px;">${this.escapeHtml(name)}</div>
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
                    <div style="font-size: 15px; line-height: 1.6; color: var(--wx-text); white-space: pre-wrap;">${this.escapeHtml(mem.content)}</div>
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
    }
});
