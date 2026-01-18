/**
 * js/apps/wechat/index.js
 * 微信仿真版入口 - 负责模块组装与生命周期管理
 * [Compatibility] No Imports - Uses Globals for file:// support
 */

const State = {
    currentTab: 0,
    root: null,
    activeSessionId: null,
    chatTitle: '',
    prevTab: 0
};

window.WeChat = window.WeChat || {};

window.WeChat.App = {
    async init(element) {
        State.root = element;
        this.injectForceStyles();

        // [Failsafe] Ensure Stickers service is loaded
        if (!window.WeChat.Services || !window.WeChat.Services.Stickers) {
            console.warn('Stickers service missing, force loading...');
            await new Promise(resolve => {
                const script = document.createElement('script');
                script.src = 'js/apps/wechat/services/stickers.js?v=' + Date.now();
                script.onload = resolve;
                script.onerror = resolve;
                document.head.appendChild(script);
            });
        }

        this.render();
    },

    injectForceStyles() {
        const styleId = 'wx-force-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .wx-scroller, .wx-view-container { padding-top: 0 !important; }
            .wx-tabbar, .wx-tabbar-fixed { z-index: 9999 !important; bottom: 0 !important; }
            .wechat-app { height: 100% !important; overflow: hidden !important; position: absolute; inset: 0; }
            :root { --wx-override-bg: #111111; --wx-override-nav-bg: #111111; --wx-override-text: #ffffff; }
            html body #os-root.light-mode { --wx-override-bg: #ededed; --wx-override-nav-bg: #ededed; --wx-override-text: #000000; }
            .wechat-app, .wx-view-container { background-color: var(--wx-override-bg) !important; color: var(--wx-override-text) !important; }
            .wx-navbar-override { background-color: var(--wx-override-nav-bg) !important; color: var(--wx-override-text) !important; }
        `;
        document.head.appendChild(style);
    },

    loadStyles() {
        const oldLink = document.getElementById('wx-styles');
        if (oldLink) oldLink.remove();
        const link = document.createElement('link');
        link.id = 'wx-styles';
        link.rel = 'stylesheet';
        link.href = 'css/apps/wechat.css?t=' + Date.now();
        document.head.appendChild(link);
    },

    renderNavBarOverride({ title, showBack, rightIcon }) {
        // [Premier Design] Seamless white header for Profile & Chat Info
        const isMeTab = (State.currentTab === 3);
        const isWhitePage = (State.currentTab === 'user_profile');
        const isGrayPage = (State.currentTab === 'chat_info' || State.currentTab === 'friend_settings' || State.currentTab === 'persona_settings');
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';

        let bgOverride = '';
        if (isMeTab || isWhitePage) {
            bgOverride = 'background-color: var(--wx-cell-bg) !important; border-bottom: none !important; box-shadow: none !important;';
        } else if (isGrayPage) {
            // Dark Mode: use dark bg; Light Mode: use #EDEDED
            const grayBg = isDark ? 'var(--wx-bg)' : '#EDEDED';
            bgOverride = `background-color: ${grayBg} !important; border-bottom: none !important; box-shadow: none !important;`;
        }

        const navStyle = `
            height: 92px; padding-top: 48px; position: absolute; top: 0; left: 0; width: 100%;
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            border-bottom: none; box-sizing: border-box; transition: background-color 0.2s;
            ${bgOverride}
        `;

        const backBtn = showBack
            ? `<div onclick="window.WeChat.goBack()" style="position:absolute; left:0; top:48px; width:60px; height:44px; display:flex; align-items:center; padding-left:16px; box-sizing:border-box; z-index:10001; cursor: pointer;">
                 <svg width="12" height="20" viewBox="0 0 12 20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M11 4L4 10l7 6"/></svg>
               </div>`
            : '';

        const exitBtn = !showBack
            ? `<div onclick="if(window.os) window.os.closeActiveApp();" 
                    title="返回桌面"
                    style="position:absolute; left:0; top:48px; width:80px; height:44px; z-index:2147483647; background: transparent; cursor: pointer;">
               </div>`
            : '';

        let rightBtnContent = '';
        if (rightIcon === 'add') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        else if (rightIcon === 'more') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;

        let rightOnClick = '';
        if (State.currentTab === 'chat_session' || State.currentTab === 'user_profile') {
            // Determined dynamically below or specialized
            if (State.currentTab === 'chat_session') rightOnClick = 'window.WeChat.App.openChatInfo()';
            if (State.currentTab === 'user_profile') rightOnClick = 'window.WeChat.App.openFriendSettings()';
        }

        const rightBtn = rightIcon ? `<div onclick="${rightOnClick}" style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; width: 44px;">${rightBtnContent}</div>` : '';

        return `
            <div class="wx-navbar-override" style="${navStyle}">
                ${exitBtn}
                ${backBtn}
                <div style="font-size:15px; font-weight:500;">${title}</div>
                ${rightBtn}
            </div>
        `;
    },

    render() {
        if (!State.root) return;
        try {
            const { Views, Components } = window.WeChat;
            let contentHtml = '', navTitle = '微信', rightIcon = 'add', showBack = false;

            if (State.currentTab === 'chat_session') {
                navTitle = State.chatTitle || '聊天';
                contentHtml = Views.renderChatSession(State.activeSessionId);
                rightIcon = 'more';
                showBack = true;
                rightAction = 'window.WeChat.App.openChatInfo()';
            } else if (State.currentTab === 'chat_info') {
                navTitle = '聊天信息';
                contentHtml = Views.renderChatInfo(State.activeSessionId, State.chatTitle);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'user_profile') {
                navTitle = '';
                contentHtml = Views.renderUserProfile(State.activeUserId, State.activeUserName);
                rightIcon = 'more';
                showBack = true;
                rightAction = 'window.WeChat.App.openFriendSettings()';
            } else if (State.currentTab === 'friend_settings') {
                navTitle = '朋友设置';
                contentHtml = Views.renderFriendSettings();
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'persona_settings') {
                navTitle = '朋友资料'; // Title matches the cell name "朋友资料"
                contentHtml = Views.renderPersonaSettings(State.activeUserId);
                rightIcon = null;
                showBack = true;
            } else {
                switch (State.currentTab) {
                    case 0: navTitle = '微信(12)'; contentHtml = Views.renderChatList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.openAddFriend()'; break;
                    case 1: navTitle = '通讯录'; contentHtml = Views.renderContactList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.openAddFriend()'; break;
                    case 2: navTitle = '发现'; contentHtml = Views.renderDiscover(); rightIcon = null; break;
                    case 3: navTitle = ''; contentHtml = Views.renderMe(); rightIcon = null; break;
                }
            }

            const showTabBar = (typeof State.currentTab === 'number');

            State.root.innerHTML = `
                <div class="wechat-app">
                    ${this.renderNavBarOverride({ title: navTitle, showBack, rightIcon })}
                    ${contentHtml}
                    ${showTabBar ? Components.renderTabBar(State.currentTab) : ''}
                </div>
            `;
        } catch (e) {
            console.error(e);
        }
    },

    openPersonaSettings(userId) {
        State.prevTab = State.currentTab;
        State.currentTab = 'persona_settings';
        State.activeUserId = userId;
        this.render();
    },

    savePersonaSettings(userId, prompt) {
        if (window.sysStore) {
            window.sysStore.set('persona_' + userId, prompt);
        }
        this.goBack(); // Return to previous page
    },

    // --- Panel Hiding Logic ---
    _togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        const otherPanelId = panelId === 'wx-extra-panel' ? 'wx-sticker-panel' : 'wx-extra-panel';
        const otherPanel = document.getElementById(otherPanelId);

        if (otherPanel) {
            otherPanel.style.display = 'none';
            otherPanel.classList.remove('active');
        }

        if (panel) {
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                requestAnimationFrame(() => panel.classList.add('active'));

                const view = document.getElementById('wx-view-session');
                // Scroll to bottom after height transition
                if (view) setTimeout(() => { view.scrollTop = view.scrollHeight; }, 250);
                return true;
            } else {
                panel.classList.remove('active');
                setTimeout(() => { panel.style.display = 'none'; }, 200);
                return false;
            }
        }
    },

    toggleExtraPanel() { this._togglePanel('wx-extra-panel'); },
    toggleStickerPanel() {
        if (this._togglePanel('wx-sticker-panel')) {
            this.renderStickerGrid();
        }
    },

    closeAllPanels() {
        const panels = ['wx-sticker-panel', 'wx-extra-panel'];
        panels.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none') {
                el.classList.remove('active');
                setTimeout(() => { el.style.display = 'none'; }, 200);
            }
        });
    },

    // --- Sticker Panel Logic ---

    // Switch Sticker Panel Tabs
    switchStickerTab(tab) {
        State.stickerTab = tab; // 'link', 'album', 'heart'
        this.renderStickerPanelContent(); // Re-render content only
    },

    renderStickerPanelContent() {
        const panel = document.getElementById('wx-sticker-panel');
        if (!panel) return;

        // 1. Update Tab Icons Active State
        const tabs = panel.querySelectorAll('.wx-sticker-tab-icon');
        tabs.forEach(t => t.classList.remove('active'));
        if (State.stickerTab === 'link') tabs[0].classList.add('active');
        if (State.stickerTab === 'emoji') tabs[1].classList.add('active');
        if (State.stickerTab === 'heart') tabs[2].classList.add('active');
        // 'album' triggers click immediately, stays on previous tab

        // 2. Render Content Area
        const container = document.getElementById('wx-sticker-content-container');
        if (!container) return; // Should exist in views.js

        if (State.stickerTab === 'link') {
            // Render Link Upload Page
            container.innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column; padding:20px; box-sizing:border-box;">
                    <div style="color:var(--wx-text-sec); font-size:14px; margin-bottom:12px;">粘贴图片/表情链接:</div>
                    <textarea id="wx-sticker-url-large-input" style="
                        width:100%; height:120px; 
                        background:var(--wx-cell-bg); border:1px solid var(--wx-border); 
                        border-radius:8px; padding:12px; box-sizing:border-box;
                        color:var(--wx-text); font-size:15px; resize:none; outline:none;
                    " placeholder="https://example.com/image.jpg"></textarea>
                    
                    <div style="display:flex; gap:16px; margin-top:20px;">
                        <button onclick="window.WeChat.App.switchStickerTab('heart')" style="
                            flex:1; height:44px; border-radius:8px; border:none; 
                            background:var(--wx-cell-bg); color:var(--wx-text); font-size:16px; font-weight:500; cursor:pointer;
                        ">取消</button>
                        <button onclick="window.WeChat.App.confirmUrlUploadLarge()" style="
                            flex:1; height:44px; border-radius:8px; border:none; 
                            background:var(--wx-green); color:white; font-size:16px; font-weight:500; cursor:pointer;
                        ">添加表情</button>
                    </div>
                </div>
            `;
        } else if (State.stickerTab === 'emoji') {
            // Render Classic Emojis via Unicode
            const emojis = ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "😗", "😙", "😚", "🙂", "🤗", "🤩", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰", "😱", "🥵", "🥶", "😳", "🤪", "😵", "😡", "😠", "🤬", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤠", "🤡", "🥳", "🥴", "🥺", "🤥", "🤫", "🤭", "🧐", "🤓", "😈", "👿", "👹", "👺", "💀", "👻", "👽", "🤖", "💩"];

            const emojiGrid = emojis.map(e => `
                <div class="wx-sticker-cell" style="font-size:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;"
                     onclick="window.WeChat.App.insertEmoji('${e}')">
                    ${e}
                </div>
            `).join('');

            container.innerHTML = `
                <div class="wx-sticker-title">经典表情</div>
                <div class="wx-sticker-grid-layout" style="overflow-y:visible;">${emojiGrid}</div>
            `;
        } else {
            // Render Heart (Grid) Page
            // Initial skeleton
            container.innerHTML = `
                <div class="wx-sticker-title">添加的单个表情</div>
                <div id="wx-sticker-grid" class="wx-sticker-grid-layout"></div>
            `;
            this.renderStickerGridItems();
        }
    },

    renderStickerGridItems() {
        const grid = document.getElementById('wx-sticker-grid');
        if (!grid || !window.WeChat.Services.Stickers) return;

        const stickers = window.WeChat.Services.Stickers.getAll();

        // 1. Restore Album Upload (Pos 1) - Dashed Plus
        const addBtn = `
            <div class="wx-sticker-cell static-icon wx-sticker-add-btn" onclick="document.getElementById('wx-sticker-upload-input').click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px; height:28px;">
                    <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <input type="file" id="wx-sticker-upload-input" multiple accept="image/*" style="display:none" onchange="window.WeChat.App.handleStickerFileSelect(this)" />
        `;

        // Ensure Set exists
        if (!State.selectedStickers) State.selectedStickers = new Set();

        // 2. Sticker List with Checkboxes
        const stickerItems = stickers.map(url => {
            const isSelected = State.selectedStickers.has(url);
            return `
            <div class="wx-sticker-cell ${isSelected ? 'selected' : ''}" 
                 onmousedown="window.WeChat.App.handleStickerPressStart(event, '${url}')"
                 ontouchstart="window.WeChat.App.handleStickerPressStart(event, '${url}')"
                 onmouseup="window.WeChat.App.handleStickerPressEnd(event, '${url}')"
                 ontouchend="window.WeChat.App.handleStickerPressEnd(event, '${url}')"
                 onclick="window.WeChat.App.handleStickerClick('${url}')">
                
                <div class="wx-sticker-check-btn"></div>
                <img src="${url}" loading="lazy" style="pointer-events:none;" />
            </div>
            `;
        }).join('');

        grid.innerHTML = addBtn + stickerItems;

        // Apply Selection Mode Styles
        if (State.selectionMode) {
            grid.classList.add('selection-mode');
            this.updateActionBar();
        } else {
            grid.classList.remove('selection-mode');
        }
    },

    updateActionBar() {
        const bar = document.getElementById('wx-sticker-action-bar');
        const count = State.selectedStickers ? State.selectedStickers.size : 0;
        if (bar) {
            bar.classList.add('active');
            const delBtn = bar.querySelector('.wx-sticker-action-btn.delete');
            if (delBtn) {
                delBtn.innerText = count > 0 ? `删除 (${count})` : '删除';
                // Optional: disable if count is 0
                // delBtn.disabled = count === 0;
            }
        }
    },

    // --- Selection & Actions Logic ---

    // --- Critical Interaction Logic ---

    handleStickerPressStart(e, url) {
        // If already multiselecting, ignore long press logic (just handle click)
        if (State.selectionMode) return;

        // Block right click
        if (e.button === 2) return;

        // Start timer
        this._pressTimer = setTimeout(() => {
            this._longPressed = true;
            this.enterSelectionMode(url);
        }, 600);
    },

    handleStickerPressEnd(e, url) {
        if (this._pressTimer) {
            clearTimeout(this._pressTimer);
            this._pressTimer = null;
        }
        // Small delay to ensure the subsequent 'click' event sees the _longPressed flag
        setTimeout(() => { this._longPressed = false; }, 200);
    },

    handleStickerClick(url) {
        // 1. If this click was part of a long press event, do nothing
        if (this._longPressed) return;

        // 2. CHECK SELECTION MODE (Fix: was checking deleteMode)
        if (State.selectionMode) {
            this.toggleStickerSelection(url);
            return;
        }

        // 3. Normal Send
        this.sendSticker(url);
    },

    sendSticker(url) {
        // SAFETY LOCK: Never send if in selection mode
        if (State.selectionMode) {
            console.warn('Blocked sendSticker during selection mode');
            return;
        }

        window.WeChat.Services.Chat.sendMessage(url, 'image');

        if (window.WeChat.UI && window.WeChat.UI.Bubbles) {
            const view = document.getElementById('wx-view-session');
            if (view) {
                const cnt = view.querySelector('.wx-chat-messages');
                if (cnt) {
                    cnt.innerHTML += window.WeChat.UI.Bubbles.render({
                        id: Date.now(), type: 'image', content: url, sender: 'me', avatar: ''
                    });
                    view.scrollTop = view.scrollHeight;
                }
            }
        }
    },

    // --- State Management ---

    enterSelectionMode(initialUrl) {
        if (State.selectionMode) return;

        State.selectionMode = true;
        if (!State.selectedStickers) State.selectedStickers = new Set();

        if (initialUrl) State.selectedStickers.add(initialUrl);

        console.log('Entered Selection Mode');

        this.renderStickerGridItems();

        // Show UI
        const bar = document.getElementById('wx-sticker-action-bar');
        if (bar) bar.classList.add('active');

        if (navigator.vibrate) navigator.vibrate(50);
    },

    exitSelectionMode() {
        State.selectionMode = false;
        State.selectedStickers = new Set();

        const bar = document.getElementById('wx-sticker-action-bar');
        if (bar) bar.classList.remove('active');

        this.renderStickerGridItems();
    },

    toggleStickerSelection(url) {
        if (!State.selectedStickers) State.selectedStickers = new Set();

        if (State.selectedStickers.has(url)) {
            State.selectedStickers.delete(url);
        } else {
            State.selectedStickers.add(url);
        }
        this.renderStickerGridItems();
    },

    deleteSelectedStickers() {
        if (!State.selectedStickers || State.selectedStickers.size === 0) return;

        if (confirm(`确定删除选中的 ${State.selectedStickers.size} 个表情吗？`)) {
            State.selectedStickers.forEach(url => {
                window.WeChat.Services.Stickers.remove(url);
            });
            this.exitSelectionMode();
        }
    },

    // --- Helpers ---
    confirmUrlUploadLarge() {
        const input = document.getElementById('wx-sticker-url-large-input');
        if (input && input.value) {
            const urlList = input.value.split(/[,\n]/).map(s => s.trim()).filter(s => s);
            const count = window.WeChat.Services.Stickers.add(urlList);
            if (count > 0) this.switchStickerTab('heart');
            else alert('无效的图片链接或图片已存在');
        }
    },

    insertEmoji(emoji) {
        const input = document.getElementById('wx-chat-input');
        if (input) {
            input.value += emoji;
            input.focus();
        }
    },

    // Entry point
    renderStickerGrid() {
        if (!State.stickerTab) State.stickerTab = 'heart';
        this.exitSelectionMode(); // Ensure clean slate
        this.renderStickerPanelContent();
    },

    toggleUrlBar(show) {
        const bar = document.getElementById('wx-sticker-url-bar');
        if (bar) {
            if (show) bar.classList.add('active');
            else {
                bar.classList.remove('active');
                document.getElementById('wx-sticker-url-input').value = ''; // Clear
            }
        }
    },

    confirmUrlUpload() {
        const input = document.getElementById('wx-sticker-url-input');
        if (input && input.value) {
            window.WeChat.Services.Stickers.add(input.value);
            this.toggleUrlBar(false);
            this.renderStickerGrid();
        }
    },

    // [Removed duplicate/legacy methods: toggleDeleteMode, deleteSticker, handleStickerClick, sendSticker]

    // --- Helpers ---

    promptStickerUpload() {
        const urls = prompt("请输入图片URL (批量导入请用逗号分隔):");
        if (urls) {
            const urlList = urls.split(/[,\n]/).map(s => s.trim()).filter(s => s);
            const count = window.WeChat.Services.Stickers.add(urlList);
            alert(`成功导入 ${count} 个表情`);
            this.renderStickerGrid();
        }
    },

    handleStickerFileSelect(input) {
        const files = input.files;
        if (!files || files.length === 0) return;
        let processed = 0;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                window.WeChat.Services.Stickers.add(e.target.result);
                processed++;
                if (processed === files.length) this.renderStickerGrid();
            };
            reader.readAsDataURL(file);
        });
    },

    switchTab(index) { if (State.currentTab !== index) { State.currentTab = index; this.render(); } },
    openChat(id) {
        State.activeSessionId = id;
        const map = { 'file_helper': '文件传输助手', 'chara_assistant': 'Chara 小助手', 'pay': '微信支付' };
        State.chatTitle = map[id] || id;
        State.prevTab = State.currentTab;
        State.currentTab = 'chat_session';

        // Sync with Service
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.openSession(id);
        }

        this.render();
    },
    openChatInfo() {
        State.prevTab = 'chat_session'; // Although strictly it came from chat session
        State.currentTab = 'chat_info';
        this.render();
    },
    openUserProfile(userId, userName) {
        State.prevTab = State.currentTab;
        State.activeUserId = userId;
        State.activeUserName = userName || State.chatTitle || 'User';
        State.currentTab = 'user_profile';
        this.render();
    },
    openFriendSettings() {
        State.prevTab = 'user_profile';
        State.currentTab = 'friend_settings';
        this.render();
    },
    sendMessage(text) {
        if (!text) return;
        if (window.WeChat.Services && window.WeChat.Services.Chat) window.WeChat.Services.Chat.sendMessage(text);
        const input = document.getElementById('wx-chat-input');
        if (input) input.value = '';
        const view = document.getElementById('wx-view-session');
        if (view) {
            const cnt = view.querySelector('.wx-chat-messages');
            if (cnt && window.WeChat.UI.Bubbles) {
                cnt.innerHTML += window.WeChat.UI.Bubbles.render({ id: Date.now(), type: 'text', content: text, sender: 'me', avatar: '' });
                view.scrollTop = view.scrollHeight;
            }
        }
    },
    goBack() {
        if (State.currentTab === 'chat_session') {
            State.currentTab = (typeof State.prevTab === 'number') ? State.prevTab : 0;
            this.render();
        } else if (State.currentTab === 'chat_info') {
            State.currentTab = 'chat_session';
            this.render();
        } else if (State.currentTab === 'user_profile') {
            // Intelligent Back: If came from main tab (e.g. Contacts), go there. Else assume Chara Flow (Info -> Profile).
            if (typeof State.prevTab === 'number') {
                State.currentTab = State.prevTab;
            } else {
                State.currentTab = 'chat_info';
            }
            this.render();
        } else if (State.currentTab === 'friend_settings') {
            State.currentTab = 'user_profile';
            this.render();
        } else if (State.currentTab === 'persona_settings') {
            State.currentTab = 'user_profile';
            this.render();
        } else {
            if (window.os) window.os.closeActiveApp();
        }
    },
    closeApp() { if (window.os) window.os.closeActiveApp(); }
};

window.WeChat.switchTab = (idx) => window.WeChat.App.switchTab(idx);
window.WeChat.goBack = () => window.WeChat.App.goBack();
window.WeChat.sendMessage = (txt) => window.WeChat.App.sendMessage(txt);
window.WeChat.toggleExtraPanel = () => window.WeChat.App.toggleExtraPanel();
window.WeChat.toggleStickerPanel = () => window.WeChat.App.toggleStickerPanel();
window.WeChat.App.closeApp = () => window.WeChat.App.closeApp();
