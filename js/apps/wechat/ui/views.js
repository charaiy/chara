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
                let avatar = isMe ? '' : (character?.avatar || '');
                return window.WeChat.UI.Bubbles.render({
                    id: m.id,
                    type: m.type,
                    content: m.content,
                    sender: isMe ? 'me' : 'other',
                    avatar: avatar,
                    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                });
            })
            : ((m) => `<div>${m.content}</div>`);

        const listHtml = messages.map(renderMsg).join('');

        return `
            <div class="wx-view-container" id="wx-view-session" style="padding-bottom: 70px; ${bgStyle}" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer"></div>
                <div class="wx-chat-messages" style="padding: 16px 0;">
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
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div><span>照片</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg></div><span>拍摄</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div><span>视频通话</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><span>位置</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 10c-3.3 0-6-2.7-6-6h12c0 3.3-2.7 6-6 6z"/></svg></div><span>红包</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36 2.38 3.24L16.99 11 14.92 8H20v6z"/></svg></div><span>礼物</span></div>
                        <div class="wx-extra-item"><div class="wx-extra-icon"><svg viewBox="0 0 24 24"><path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/></svg></div><span>转账</span></div>
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

                return {
                    id: id,
                    name: char?.name || id,
                    lastMsg: lastMsg ? (lastMsg.type === 'image' ? '[图片]' : lastMsg.content) : '',
                    time: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
                    avatar: char?.avatar || ''
                };
            }).filter(c => c.lastMsg); // Only show active chats
        }

        // Default if no messages
        if (chats.length === 0) {
            chats = [
                { id: 'file_helper', name: '文件传输助手', lastMsg: '暂无消息', time: '', mute: false },
                { id: 'chara_assistant', name: 'Chara 小助手', lastMsg: '欢迎使用 CharaOS！', time: '10:05', mute: false }
            ];
        }

        let listHtml = chats.map(chat => {
            return `
            <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.openChat('${chat.id}')" style="height: 64px; padding: 8px 12px;">
                <div style="position: relative; margin-right: 10px;">
                    <img src="${chat.avatar || 'assets/images/avatar_placeholder.png'}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" style="width: 44px; height: 44px; border-radius: 6px; background: #eee;">
                </div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 15px; font-weight: 500; color: var(--wx-text);">${chat.name}</span>
                        <span style="font-size: 9px; color: var(--wx-text-sec);">${chat.time}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--wx-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
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

        return `
            <div class="wx-view-container" id="wx-view-info" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <!-- Members Area -->
                <div style="background: var(--wx-cell-bg); padding: 16px 20px 24px 20px; display: flex; flex-wrap: wrap; gap: 24px; margin-top: 0;">
                     <!-- Member: Peer (Clickable) -->
                     <div onclick="window.WeChat.App.openUserProfile('${sessionId}', '${name}')" style="display: flex; flex-direction: column; align-items: center; width: 56px; cursor: pointer;">
                        <img src="assets/images/avatar_placeholder.png" style="width: 56px; height: 56px; border-radius: 6px; margin-bottom: 6px; background: #eee;">
                        <span style="font-size: 11px; color: var(--wx-text-sec); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                     </div>
                     <!-- Add Button -->
                     <div style="display: flex; flex-direction: column; align-items: center; width: 56px;">
                        <div style="width: 56px; height: 56px; border-radius: 6px; border: 1px solid var(--wx-border); display: flex; align-items: center; justify-content: center; box-sizing: border-box; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--wx-text-sec)" style="opacity: 0.5;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        </div>
                     </div>
                </div>

                <div class="wx-cell-group">
                    ${this._renderSwitchCell('注入最新状态', true)}
                    ${this._renderSwitchCell('启动独立后台活动', false)}
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
                    ${this._renderCell({ text: '关联世界书', showArrow: true, extra: '<span style="font-size:15px; color:var(--wx-text-sec); margin-right:4px;">无</span>' })}
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
                year: 'numeric', month: '1', day: '1',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).replace(/\//g, '/');

            return `
                <div style="background: ${cardBg}; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
                        <img src="${avatar}" style="width: 36px; height: 36px; border-radius: 4px; margin-right: 10px; background: #eee;">
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
        // Mock Data
        const user = {
            id: userId,
            name: name,
            avatar: 'assets/images/avatar_placeholder.png',
            nickname: name,
            wxid: 'wxid_' + userId,
            region: '未知地区'
        };

        return `
            <div class="wx-view-container" id="wx-view-profile" style="background-color: var(--wx-bg);">
                <div class="wx-nav-spacer"></div>
                
                <!-- Profile Header -->
                <div style="background: var(--wx-cell-bg); padding: 24px 24px 24px 24px; display: flex; align-items: flex-start; margin-bottom: 0;">
                    <img src="${user.avatar}" style="width: 60px; height: 60px; border-radius: 6px; margin-right: 16px; background: #eee;">
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

        let listHtml = contacts.map(c => this._renderCell({
            text: c.name,
            iconColor: c.type === 'system' ? '#fa9d3b' : '#eee',
            iconType: 'user_avatar',
            showArrow: false,
            onClick: `window.WeChat.App.openUserProfile('${c.id}', '${c.name}')`
        })).join('');

        return `
            <div class="wx-view-container" id="wx-view-contacts" onclick="window.WeChat.App.closeAllPanels()">
               <div class="wx-nav-spacer"></div>
               <div style="padding-top: 10px;">
                    ${this._renderSimpleCell('新的朋友', '#fa9d3b', 'contact_add')}
                    ${this._renderSimpleCell('群聊', '#07c160', 'group')}
                    ${this._renderSimpleCell('标签', '#2782d7', 'tag')}
                    ${this._renderSimpleCell('公众号', '#2782d7', 'offical')}
                    <div style="padding: 10px 16px; display: flex; align-items: center; border-bottom: 0.5px solid var(--wx-border);">
                         <span style="font-size:11px; color:var(--wx-text-sec);">我的企业及企业联系人</span>
                    </div>
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
        return `
            <div class="wx-scroller" id="wx-view-me">
                <div class="wx-nav-spacer"></div>
                <div class="wx-profile-header">
                    <img src="assets/images/avatar_placeholder.png" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" class="wx-avatar" />
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

    _renderCell({ text, iconColor, iconType, showArrow, extra = '', onClick = '' }) {
        let iconHtml = '';
        if (iconType) {
            let svgContent = '';
            switch (iconType) {
                case 'service': svgContent = '<path d="M4 6h16v12H4z" fill="white" fill-opacity="0.8"/>'; break;
                case 'moments': svgContent = '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" fill="none"/>'; break;
                case 'settings': svgContent = '<circle cx="12" cy="12" r="4" stroke="white" stroke-width="2"/>'; break;
                case 'scan': svgContent = '<path d="M4 4h4v2H4v4H2V4h2zm14 0h2v6h-2V6h-4V4h4zm0 16h-4v-2h4v-4h2v6h-2zM4 20h4v2H4h-2v-6h2v4z" fill="white"/>'; break;
                case 'listen': svgContent = '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>'; break; // Placeholder
                default: svgContent = '<rect x="6" y="6" width="12" height="12" fill="white"/>';
            }
            const iconStyle = `display:flex; align-items:center; justify-content:center; background-color:${iconColor}; width:24px; height:24px; border-radius:4px; margin-right:16px; flex-shrink:0;`;
            iconHtml = `<div style="${iconStyle}"><svg viewBox="0 0 24 24" style="width:16px; height:16px">${svgContent}</svg></div>`;
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
                <div class="wx-cell-content">${text}</div>
                ${extra}
                ${arrowHtml}
            </div>
        `;
    },

};
