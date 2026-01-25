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
    renderChatSession(sessionId) {
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

        return `
            <div class="wx-view-container" id="wx-view-session" style="${bgStyle}" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer"></div>
                <div class="wx-chat-messages" style="padding: 16px 0 20px 0;">
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
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 10c-3.3 0-6-2.7-6-6h12c0 3.3-2.7 6-6 6z"/></svg></div><span>红包</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36 2.38 3.24L16.99 11 14.92 8H20v6z"/></svg></div><span>礼物</span></div>
                        <div class="wx-extra-item" onclick="window.WeChat.App.triggerTransfer()"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></div><span>转账</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></div><span>语音输入</span></div>
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

        // Default if no messages
        if (chats.length === 0) {
            chats = [
                { id: 'file_helper', name: '文件传输助手', lastMsg: '暂无消息', time: '', mute: false },
                { id: 'chara_assistant', name: 'Chara 小助手', lastMsg: '欢迎使用 CharaOS！', time: '10:05', mute: false }
            ];
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
                    <img src="${chat.avatar || 'assets/images/avatar_placeholder.png'}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" style="width: 44px; height: 44px; border-radius: 6px; background: #eee; object-fit: cover;">
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
                <div class="wx-nav-spacer"></div>
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
                        <img src="${avatar}" style="width: 56px; height: 56px; border-radius: 6px; margin-bottom: 6px; background: #eee; object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">
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
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({ text: '记忆管理', showArrow: true, onClick: `window.WeChat.App.openMemoryManagement('${sessionId}')` })}
                    ${this._renderCell({ text: '设置当前聊天背景', showArrow: true, onClick: `window.WeChat.App.setChatBackground('${sessionId}')` })}
                    ${this._renderCell({ text: '移除当前聊天背景', showArrow: true, onClick: `window.WeChat.App.removeChatBackground('${sessionId}')` })}
                    ${this._renderCell({ text: '清空聊天记录', showArrow: true, onClick: `window.WeChat.App.clearChatHistory('${sessionId}')` })}
                </div>
                
                <!-- Footer Info Pills -->
                <div style="display: flex; justify-content: center; gap: 10px; padding: 20px 0 40px 0;">
                    <div style="padding: 4px 12px; background: rgba(0,0,0,0.05); border-radius: 12px; font-size: 11px; color: #999;">总消息: ${(window.sysStore && window.sysStore.getMessagesBySession(sessionId).length) || 0}</div>
                    <div style="padding: 4px 12px; background: rgba(0,0,0,0.05); border-radius: 12px; font-size: 11px; color: #999;">Token: 0</div>
                </div>
            </div>
        `;
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
            nickname: char?.nickname || name,
            wxid: 'wxid_' + (char?.id || userId),
            region: '未知地区'
        };

        return `
            <div class="wx-view-container" id="wx-view-profile" style="background-color: var(--wx-bg);">
                <div class="wx-nav-spacer"></div>
                
                <!-- Profile Header -->
                <div style="background: var(--wx-cell-bg); padding: 24px 24px 24px 24px; display: flex; align-items: flex-start; margin-bottom: 0;">
                    <img src="${user.avatar}" onclick="window.WeChat.App.triggerAvatarUpload('${userId}')" style="width: 60px; height: 60px; border-radius: 6px; margin-right: 16px; background: #eee; object-fit: cover; cursor: pointer;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">
                    <div style="flex: 1; min-width: 0; padding-top: 2px;">
                        <div style="font-size: 20px; font-weight: 500; color: var(--wx-text); margin-bottom: 6px; display: flex; align-items: center; line-height: 1.1;">
                            ${user.name}
                        </div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 3px; opacity: 0.8;">微信号：${user.wxid}</div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); opacity: 0.8;">地区：${user.region}</div>
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

                <!-- My Profile Section (New) -->
                <div class="wx-cell-group" style="margin-top: 0; margin-bottom: 0px; border-top: 1px solid rgba(0,0,0,0.05);">
                     <div class="wx-cell" onclick="window.WeChat.App.openMyProfileSettings()" style="padding: 12px 24px 12px 24px; cursor: pointer;">
                        <div class="wx-cell-content" style="font-size: 17px; font-weight: 400; color: var(--wx-text);">我的资料</div>
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

    /**
     * My Profile Settings Page
     */
    renderMyProfileSettings() {
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        // Load existing data
        const realName = (window.sysStore && window.sysStore.get('user_realname')) || '';
        const gender = (window.sysStore && window.sysStore.get('user_gender')) || '';
        const persona = (window.sysStore && window.sysStore.get('user_persona')) || '';

        return `
            <div class="wx-scroller" id="wx-view-my-profile" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">我的真名 (让对方知道你是谁)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-real-name" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：卫宫士郎" value="${realName}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">我的性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <select id="wx-my-gender" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                            <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
                            <option value="other" ${gender === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">我的人设 (告知AI你的设定)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-my-persona" 
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入你的性格、背景故事或特殊身份...">${persona}</textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveMyProfileSettings({
                        realName: document.getElementById('wx-my-real-name').value,
                        gender: document.getElementById('wx-my-gender').value,
                        persona: document.getElementById('wx-my-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
                    </div>
                </div>
            </div>
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
        const persona = char?.main_persona || '';

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-persona" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色真名 (系统识别用)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-real-name" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" value="${realName}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色备注 (只有你知道)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-remark" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" value="${remark}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色网名 (角色对外展示的名号)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-edit-nickname" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：大不列颠小厨娘" value="${nickname}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色人设 (System Prompt)</div>
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
                        persona: document.getElementById('wx-edit-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
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
                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色真名 (系统识别用)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-real-name" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色备注 (只有你知道)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-remark" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色网名 (角色对外展示的名号)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-add-friend-nickname" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：大不列颠小厨娘" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">角色人设 (System Prompt)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-add-friend-persona" 
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入角色的性格、背景故事或回复风格..."></textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveNewFriend({
                        realName: document.getElementById('wx-add-friend-real-name').value,
                        remark: document.getElementById('wx-add-friend-remark').value,
                        nickname: document.getElementById('wx-add-friend-nickname').value,
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
               <div class="wx-nav-spacer"></div>
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
                <div class="wx-nav-spacer"></div>
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
    renderMe() {
        const userAvatar = (window.sysStore && window.sysStore.get('user_avatar')) || 'assets/images/avatar_placeholder.png';
        return `
            <div class="wx-scroller" id="wx-view-me">
                <div class="wx-nav-spacer"></div>
                <div class="wx-profile-header">
                    <img src="${userAvatar}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" class="wx-avatar" onclick="window.WeChat.App.triggerAvatarUpload()" style="cursor: pointer; object-fit: cover;" />
                    <div class="wx-profile-info">
                        <div class="wx-profile-name">User</div>
                        <div class="wx-profile-id">
                            <div class="wx-profile-id-row">
                                <span>微信号：wxid_chara_os_001</span>
                                <svg class="wx-icon-qrcode" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h-3v2h3v-2zm-3 4h2v-2h-2v2zm3 0v2h-2v-2h2zm1-5h2v3h-2v-3zm0 5h-1v2h1v-2z"/>
                                </svg>
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
                                    ${String(status.inner_voice || '暂无消息')}
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
                <textarea style="width: 100%; min-height: 50px; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 8px; box-sizing: border-box; font-size: 13px; outline: none; resize: none; line-height: 1.4; color: #333;"
                    placeholder="输入该好感阶段下的角色表现..."
                    oninput="window.WeChat.App.updateLadderPersona(${idx}, 'content', this.value, true)">${lp.content}</textarea>
            </div>
        `).join('');

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeRelationshipPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()" style="padding: 0;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px 8px 24px;">
                        <div style="cursor: pointer; padding: 4px; margin-left: -4px;" onclick="window.WeChat.App.openCharacterPanel()">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: #333;">关系管理</div>
                        <div style="width: 24px;"></div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding: 0 24px 24px 24px;">
                        
                        <!-- 好感度数值 -->
                        <div style="margin-top: 15px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 10px;">好感度数值</div>
                            <div style="background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <span style="font-size: 14px; font-weight: 600;">当前好感度</span>
                                    <span style="font-size: 16px; font-weight: 700; color: #007aff;">${affection.toFixed(1)}</span>
                                </div>
                                <input type="range" min="0" max="100" step="0.1" value="${affection}" 
                                    style="width: 100%; height: 4px; -webkit-appearance: none; background: #e0e0e0; border-radius: 2px; outline: none; margin-bottom: 5px; cursor: pointer;"
                                    oninput="window.WeChat.App.updatePendingRelationship('affection', parseFloat(this.value))">
                            </div>
                        </div>

                        <!-- 攻略难度设定 -->
                        <div style="margin-top: 20px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 10px;">攻略难度设定</div>
                            <div style="background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                                <div style="display: flex; background: #f5f6f8; border-radius: 10px; padding: 3px; margin-bottom: 12px;">
                                    <div class="wx-rel-diff-btn ${difficulty === 'hard' ? 'active' : ''}" 
                                        onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'hard')"
                                        style="flex: 1; text-align: center; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: ${difficulty === 'hard' ? '700' : '400'}; color: ${difficulty === 'hard' ? '#007aff' : '#888'}; background: ${difficulty === 'hard' ? '#fff' : 'transparent'}; box-shadow: ${difficulty === 'hard' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'}; cursor: pointer;">困难</div>
                                    <div class="wx-rel-diff-btn ${difficulty === 'normal' ? 'active' : ''}" 
                                        onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'normal')"
                                        style="flex: 1; text-align: center; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: ${difficulty === 'normal' ? '700' : '400'}; color: ${difficulty === 'normal' ? '#007aff' : '#888'}; background: ${difficulty === 'normal' ? '#fff' : 'transparent'}; box-shadow: ${difficulty === 'normal' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'}; cursor: pointer;">普通</div>
                                    <div class="wx-rel-diff-btn ${difficulty === 'easy' ? 'active' : ''}" 
                                        onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'easy')"
                                        style="flex: 1; text-align: center; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: ${difficulty === 'easy' ? '700' : '400'}; color: ${difficulty === 'easy' ? '#007aff' : '#888'}; background: ${difficulty === 'easy' ? '#fff' : 'transparent'}; box-shadow: ${difficulty === 'easy' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'}; cursor: pointer;">容易</div>
                                </div>
                                <div style="font-size: 11px; color: #999; text-align: center; line-height: 1.4;">
                                    ${diffText[difficulty]}
                                </div>
                            </div>
                        </div>

                        <!-- 关系看法 -->
                        <div style="margin-top: 20px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 10px;">关系看法</div>
                            <div style="background: #fff; border-radius: 16px; padding: 20px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                                <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 12px;">TA对我</div>
                                <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 11px; color: #bbb; margin-bottom: 6px;">关系</div>
                                        <input type="text" value="${rel.they_to_me.relation}" placeholder="如：好朋友"
                                            style="width: 100%; height: 38px; background: #f5f6f8; border: none; border-radius: 10px; padding: 0 10px; box-sizing: border-box; font-size: 13px;"
                                            oninput="window.WeChat.App.updatePendingRelationship('they_to_me', this.value, 'relation', true)">
                                    </div>
                                    <div style="flex: 2;">
                                        <div style="font-size: 11px; color: #bbb; margin-bottom: 6px;">看法/秘密</div>
                                        <input type="text" value="${rel.they_to_me.opinion}" placeholder="TA眼中的我..."
                                            style="width: 100%; height: 38px; background: #f5f6f8; border: none; border-radius: 10px; padding: 0 10px; box-sizing: border-box; font-size: 13px;"
                                            oninput="window.WeChat.App.updatePendingRelationship('they_to_me', this.value, 'opinion', true)">
                                    </div>
                                </div>
                                <div style="font-size: 14px; font-weight: 700; color: #333; margin-bottom: 12px;">我对TA</div>
                                <div style="display: flex; gap: 10px;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 11px; color: #bbb; margin-bottom: 6px;">关系</div>
                                        <input type="text" value="${rel.me_to_they.relation}" placeholder="如：暗恋对象"
                                            style="width: 100%; height: 38px; background: #f5f6f8; border: none; border-radius: 10px; padding: 0 10px; box-sizing: border-box; font-size: 13px;"
                                            oninput="window.WeChat.App.updatePendingRelationship('me_to_they', this.value, 'relation', true)">
                                    </div>
                                    <div style="flex: 2;">
                                        <div style="font-size: 11px; color: #bbb; margin-bottom: 6px;">看法/印象</div>
                                        <input type="text" value="${rel.me_to_they.opinion}" placeholder="我眼中的TA..."
                                            style="width: 100%; height: 38px; background: #f5f6f8; border: none; border-radius: 10px; padding: 0 10px; box-sizing: border-box; font-size: 13px;"
                                            oninput="window.WeChat.App.updatePendingRelationship('me_to_they', this.value, 'opinion', true)">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 阶梯人设 -->
                        <div style="margin-top: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-size: 12px; color: #999;">阶梯人设 (随好感度变化)</div>
                                <div onclick="window.WeChat.App.generateLadderPersona()" style="cursor: pointer; color: #007aff; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>
                                    AI 生成
                                </div>
                            </div>
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
        const chars = window.sysStore.get('chara_db_characters', {});

        // Group entries (same logic as WorldBookApp)
        const groups = {};
        entries.forEach(e => {
            const gid = e.groupId || 'global';
            if (!groups[gid]) {
                let name = (gid === 'global') ? '全局/通用' : (chars[gid]?.name || '未知角色');
                groups[gid] = { name, entries: [] };
            }
            groups[gid].entries.push(e);
        });

        // Generate HTML
        const sortedCids = Object.keys(groups).sort((a, b) => {
            if (a === 'global') return -1;
            if (b === 'global') return 1;
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
            <div class="wx-scroller" id="wx-view-worldbook-select" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                ${sectionsHtml || '<div style="padding:100px 20px; text-align:center; color:#999;">暂无世界书条目</div>'}
                <div style="height: 60px;"></div>
            </div>
        `;
    }
};

