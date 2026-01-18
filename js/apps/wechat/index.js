/**
 * js/apps/wechat/index.js
 * 微信仿真版入口 - 负责模块组装与生命周期管理
 * [Compatibility] No Imports - Uses Globals for file:// support
 */

const DEFAULT_SUMMARY_PROMPT = `禁止私自编造不存在的内容!
如果遇到复杂的请如实直述，禁止去编造、改动!
**【内容核心 (最高优先级)】**: 你的summary【必须】专注于以下几点，请直接输出(不需要回答我好的）：

总结规则：
进行summary时，必须精准提取内容，不遗漏任何锚点的重要细节，完美判断角色和用户的关系发展，必须直白且如实总结时间节点和故事发展，每件事的叙述控制在最多50字左右，此外再包含重要日期+时间节点即可。

长期记忆summary格式为：
当前年份日期星期时间/具体地点，角色的第一人称总结与用户发生的事件，禁止太过于主观!

## 示例：“线上(线下）/2025年4月2日8:30，星期三，我和（用户真名）聊了关于早餐的话题。”

## 精炼记忆时禁止偷懒输出token count，必须进行正确的精炼

##图片禁止总结为“发了一张图片/个人照片”，必须说明是什么图片，如果只是表情包则禁止总结在其中!!`;

const State = {
    currentTab: 0,
    root: null,
    activeSessionId: null,
    chatTitle: '',
    prevTab: 0,
    addFriendMenuOpen: false,

    // Modal States
    memoryModalOpen: false,
    summaryModalOpen: false,
    rangeModalOpen: false,
    editMemoryIndex: -1,
    summaryConfig: {
        autoEnabled: true,
        threshold: 50,
        autoPrompt: '', // Empty means use default
        manualPrompt: ''
    }
};

window.WeChat = window.WeChat || {};
window.WeChat.Defaults = {
    SUMMARY_PROMPT: DEFAULT_SUMMARY_PROMPT
};

window.WeChat.App = {
    async init(element) {
        State.root = element;
        // [User Request] Always start at Home (Tab 0) on fresh load/refresh
        State.currentTab = 0;
        State.activeSessionId = null;
        State.prevTab = 0;

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
            
            /* Add Friend Dropdown Menu */
            .wx-add-menu {
                position: absolute;
                top: 86px;
                right: 8px;
                width: 160px;
                background: #4c4c4c;
                border-radius: 8px;
                z-index: 10002;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            .wx-add-menu.active { display: flex; animation: wxFadeIn 0.2s ease; }
            .wx-add-menu-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                color: white;
                font-size: 16px;
                cursor: pointer;
            }
            .wx-add-menu-item:active { background: rgba(255,255,255,0.1); }
            .wx-add-menu-icon { margin-right: 12px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
            .wx-add-menu-arrow {
                position: absolute;
                top: -10px;
                right: 16px;
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 10px solid #4c4c4c;
            }
            @keyframes wxFadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
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
        else if (rightIcon === 'memory_actions') {
            rightBtnContent = `
                <div style="display: flex; gap: 16px; align-items: center; color: var(--wx-text);">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer;" onclick="window.WeChat.App.openRefineModal()"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    <div onclick="window.WeChat.App.openSummaryManagement()" style="cursor: pointer;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div onclick="window.WeChat.App.addMemory('${State.activeSessionId}')" style="cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                </div>
            `;
            // Special styling for multi-icon area
            return `
                <div class="wx-navbar-override" style="${navStyle}" onclick="if(event.target === this) window.WeChat.App.closeAddFriendMenu()">
                    ${exitBtn}
                    ${backBtn}
                    <div style="font-size:17px; font-weight:500;">${title}</div>
                    <div style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center;">${rightBtnContent}</div>
                </div>
            `;
        }

        let rightOnClick = '';
        if (State.currentTab === 0 || State.currentTab === 1) {
            rightOnClick = 'window.WeChat.App.toggleAddFriendMenu()';
        } else if (State.currentTab === 'chat_session' || State.currentTab === 'user_profile') {
            if (State.currentTab === 'chat_session') rightOnClick = 'window.WeChat.App.openChatInfo()';
            if (State.currentTab === 'user_profile') rightOnClick = 'window.WeChat.App.openFriendSettings()';
        }

        const rightBtn = rightIcon ? `<div onclick="${rightOnClick}" style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; width: 44px;">${rightBtnContent}</div>` : '';

        // Dropdown Menu HTML
        const menuHtml = `
            <div class="wx-add-menu ${State.addFriendMenuOpen ? 'active' : ''}">
                <div class="wx-add-menu-arrow"></div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.closeAddFriendMenu()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <span>发起群聊</span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.openAddFriendPage()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    </div>
                    <span>添加朋友</span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.closeAddFriendMenu()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="7" x2="21" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
                    </div>
                    <span>扫一扫</span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.closeAddFriendMenu()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    </div>
                    <span>收付款</span>
                </div>
            </div>
        `;

        return `
            <div class="wx-navbar-override" style="${navStyle}" onclick="if(event.target === this) window.WeChat.App.closeAddFriendMenu()">
                ${exitBtn}
                ${backBtn}
                <div style="font-size:15px; font-weight:500;">${title}</div>
                ${rightBtn}
                ${menuHtml}
            </div>
        `;
    },

    render() {
        if (!State.root) return;

        // --- Persistence (Save State on every render) ---
        if (window.sysStore && window.sysStore.set) {
            window.sysStore.set('wx_last_tab', String(State.currentTab));
            if (State.activeSessionId) window.sysStore.set('wx_last_session', State.activeSessionId);
        }

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
            } else if (State.currentTab === 'memory_management') {
                navTitle = '长期记忆';
                contentHtml = Views.renderMemoryManagement(State.activeSessionId);
                rightIcon = 'memory_actions';
                showBack = true;
            } else if (State.currentTab === 'user_profile') {
                navTitle = ''; // Profile header has custom handling or no title in iOS style
                // Ensure State.activeUserName is robustly populated
                const targetName = State.activeUserName || State.chatTitle || 'User';
                contentHtml = Views.renderUserProfile(State.activeUserId, targetName);
                rightIcon = 'more'; // Option to see Friend Settings
                // In profile page, "More" icon usually leads to Friend Settings (Remark, Block, Delete)
                rightAction = 'window.WeChat.App.openFriendSettings()';
                showBack = true;
            } else if (State.currentTab === 'friend_settings') {
                navTitle = '朋友设置';
                contentHtml = Views.renderFriendSettings(State.activeUserId);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'persona_settings') {
                navTitle = '朋友资料'; // Title matches the cell name "朋友资料"
                contentHtml = Views.renderPersonaSettings(State.activeUserId);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'add_friend') {
                navTitle = '朋友资料';
                contentHtml = Views.renderAddFriend();
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
                    ${this.renderModals()}
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

    savePersonaSettings(userId, data) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            const displayName = data.remark || data.nickname || data.realName || userId;
            window.sysStore.updateCharacter(userId, {
                name: displayName,
                real_name: data.realName,
                remark: data.remark,
                nickname: data.nickname,
                main_persona: data.persona
            });
            // Update current chat title if it's the active session
            if (State.activeSessionId === userId) {
                State.chatTitle = displayName;
            }
        }
        alert('保存成功');
        this.goBack(); // Return to previous page
    },

    toggleAddFriendMenu() {
        State.addFriendMenuOpen = !State.addFriendMenuOpen;
        this.render();
    },

    closeAddFriendMenu() {
        if (State.addFriendMenuOpen) {
            State.addFriendMenuOpen = false;
            this.render();
        }
    },

    openAddFriendPage() {
        State.addFriendMenuOpen = false;
        State.prevTab = State.currentTab;
        State.currentTab = 'add_friend';
        this.render();
    },

    saveNewFriend(data) {
        const { realName, remark, nickname, persona } = data;
        if (!realName && !remark && !nickname) {
            alert('请至少输入一个名称');
            return;
        }

        const id = 'user_' + Date.now();
        // Logical display name for lists: Remark > Nickname > RealName
        const displayName = remark || nickname || realName;

        const contact = {
            id: id,
            name: displayName,
            realName: realName,
            remark: remark,
            nickname: nickname,
            avatar: 'assets/images/avatar_placeholder.png',
            section: displayName.charAt(0).toUpperCase() || 'Z',
            settings: { persona: persona }
        };

        if (window.WeChat.Services && window.WeChat.Services.Contacts) {
            window.WeChat.Services.Contacts.addContact(contact);
        }

        alert('保存成功');
        this.goBack();
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
        this.closeAddFriendMenu();
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

    setChatBackground(sessionId) {
        const url = prompt('请输入背景图片链接 (或者你可以点击选择本地文件，但这需要系统底层支持)');
        if (url) {
            if (window.sysStore) {
                window.sysStore.updateCharacter(sessionId, { chat_background: url });
                alert('背景设置成功');
                this.render();
            }
        }
    },

    removeChatBackground(sessionId) {
        if (window.sysStore) {
            window.sysStore.updateCharacter(sessionId, { chat_background: null });
            alert('背景已移除');
            this.render();
        }
    },

    clearChatHistory(sessionId) {
        if (confirm('确定要清空与该联系人的聊天记录吗？此操作不可撤销。')) {
            if (window.sysStore) {
                window.sysStore.clearMessagesBySession(sessionId);
                alert('记录已清空');
                this.render();
            }
        }
    },

    setContextMemoryLimit(sessionId) {
        const char = window.sysStore?.getCharacter(sessionId);
        const currentLimit = char?.settings?.memory_limit || 200;
        const input = prompt('请输入上下文记忆量 (保留最近多少条消息):', currentLimit);

        if (input !== null) {
            const limit = parseInt(input);
            if (!isNaN(limit) && limit >= 0) {
                window.sysStore.updateCharacter(sessionId, {
                    settings: { memory_limit: limit }
                });
                this.render();
            } else {
                alert('请输入有效的数字');
            }
        }
    },

    toggleBlacklist(userId, isBlacklisted) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(userId, { is_blacklisted: isBlacklisted });
            this.render(); // Refresh UI
        }
    },

    deleteFriend(userId) {
        if (confirm('确定删除该联系人吗？此操作将删除联系人信息及所有聊天记录。')) {
            if (window.WeChat.Services && window.WeChat.Services.Contacts) {
                const success = window.WeChat.Services.Contacts.removeContact(userId);
                if (success) {
                    alert('已删除');
                    State.currentTab = 1; // Go back to Contacts
                    this.render();
                }
            }
        }
    },

    switchTab(index) { if (State.currentTab !== index) { State.currentTab = index; this.render(); } },
    openChat(id) {
        State.activeSessionId = id;
        if (window.sysStore && window.sysStore.set) window.sysStore.set('wx_last_session', id); // Persist State
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

    openMemoryManagement(sessionId) {
        State.prevTab = State.currentTab;
        State.currentTab = 'memory_management';

        // Robust ID Handling
        if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
            State.activeSessionId = sessionId;
        } else if (!State.activeSessionId && window.sysStore) {
            // Fallback to stored session
            State.activeSessionId = window.sysStore.get('wx_last_session');
        }

        console.log('Opening Memory Management for:', State.activeSessionId);
        this.render();
    },

    addMemory(sessionId) {
        State.memoryModalOpen = true;
        State.editMemoryIndex = -1;
        this.render();
    },

    editMemory(sessionId, index) {
        State.memoryModalOpen = true;
        State.editMemoryIndex = index;
        this.render();
    },

    saveMemory() {
        const text = document.getElementById('wx-memory-input')?.value;
        if (!text) {
            alert('请输入记忆内容');
            return;
        }

        const sessionId = State.activeSessionId;
        const char = window.sysStore.getCharacter(sessionId);
        const memories = char.memories || [];

        if (State.editMemoryIndex >= 0) {
            // Edit existing
            memories[State.editMemoryIndex].content = text;
            memories[State.editMemoryIndex].timestamp = Date.now();
        } else {
            // Add new
            memories.unshift({
                id: Date.now(),
                content: text,
                timestamp: Date.now()
            });
        }

        window.sysStore.updateCharacter(sessionId, { memories });
        this.closeModals();
        this.render();
    },

    deleteMemory(sessionId, index) {
        if (confirm('确定要删除这条记忆吗？')) {
            const char = window.sysStore.getCharacter(sessionId);
            const memories = char.memories || [];
            memories.splice(index, 1);
            window.sysStore.updateCharacter(sessionId, { memories });
            this.render();
        }
    },

    openSummaryManagement() {
        State.summaryModalOpen = true;
        this.render();
    },

    openSummaryRange() {
        State.rangeModalOpen = true;
        this.render();
    },

    openRefineModal() {
        State.refineModalOpen = true;
        this.render();
    },

    closeModals() {
        State.memoryModalOpen = false;
        State.summaryModalOpen = false;
        State.rangeModalOpen = false;
        State.refineModalOpen = false;
        this.render();
    },

    handleRefineAll() {
        const count = window.sysStore.getCharacter(State.activeSessionId)?.memories?.length || 0;
        alert(`开始精炼全部 ${count} 条记忆...`);
        this.closeModals();
    },

    handleRefineCustom() {
        const input = prompt("请输入要精炼的记忆数量:");
        if (input) {
            alert(`开始精炼 ${input} 条记忆...`);
            this.closeModals();
        }
    },

    startSummarize() {
        const start = parseInt(document.getElementById('wx-range-start')?.value) || 1;
        const end = parseInt(document.getElementById('wx-range-end')?.value) || 0;
        alert(`开始总结对话范围: ${start} 到 ${end === 0 ? '末尾' : end}`);
        this.closeModals();
    },

    toggleSummaryAuto() {
        State.summaryConfig.autoEnabled = !State.summaryConfig.autoEnabled;
        this.render();
    },

    updateSummaryConfig(key, value) {
        if (key === 'threshold') {
            State.summaryConfig.threshold = parseInt(value) || 50;
        } else if (key === 'autoPrompt') {
            State.summaryConfig.autoPrompt = value;
        } else if (key === 'manualPrompt') {
            State.summaryConfig.manualPrompt = value;
        }
    },

    saveSummarySettings() {
        if (window.sysStore && State.activeSessionId) {
            const char = window.sysStore.getCharacter(State.activeSessionId);
            const settings = char?.settings || {};
            window.sysStore.updateCharacter(State.activeSessionId, {
                settings: {
                    ...settings,
                    summaryConfig: { ...State.summaryConfig }
                }
            });
        }
        this.closeModals();
    },

    renderModals() {
        if (!State.memoryModalOpen && !State.summaryModalOpen && !State.rangeModalOpen && !State.refineModalOpen) return '';

        const char = window.sysStore.getCharacter(State.activeSessionId);

        // Modal 1: Add/Edit Memory
        if (State.memoryModalOpen) {
            const memories = char?.memories || [];
            const existingText = State.editMemoryIndex >= 0 ? memories[State.editMemoryIndex].content : '';
            const title = `为 “${char?.name || 'User'}” ${State.editMemoryIndex >= 0 ? '编辑' : '添加'}记忆`;

            return `
                <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                    <div class="wx-modal" onclick="event.stopPropagation()">
                        <div class="wx-modal-header">
                            <div class="wx-modal-title">${title}</div>
                        </div>
                        <div class="wx-modal-body">
                            <textarea id="wx-memory-input" class="wx-modal-textarea" placeholder="在此输入记忆内容...">${existingText}</textarea>
                        </div>
                        <div class="wx-modal-footer">
                            <div class="wx-modal-btn cancel" onclick="window.WeChat.App.closeModals()">取消</div>
                            <div class="wx-modal-btn confirm" onclick="window.WeChat.App.saveMemory()">确定</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Modal 4: Refine Memory Action Sheet
        if (State.refineModalOpen) {
            const memoryCount = char?.memories?.length || 0;
            return `
                <div class="wx-modal-overlay active" style="align-items: flex-end; padding-bottom: 20px;" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                    <div class="wx-action-sheet-modal" style="width: 100% !important; max-width: 360px !important; margin: 0 auto;">
                        <div class="wx-action-sheet-group">
                            <div class="wx-action-sheet-title">选择精炼范围</div>
                            <div class="wx-action-sheet-item" onclick="window.WeChat.App.handleRefineAll()">
                                全部记忆 (${memoryCount}条)
                            </div>
                            <div class="wx-action-sheet-item" onclick="window.WeChat.App.handleRefineCustom()">
                                自定义数量...
                            </div>
                        </div>
                        <div class="wx-action-sheet-cancel" onclick="window.WeChat.App.closeModals()">
                            取消
                        </div>
                    </div>
                </div>
            `;
        }

        // Modal 2: Summary Management
        if (State.summaryModalOpen && !State.rangeModalOpen) {
            const promptPlaceholder = "未设置则使用系统默认规则 (精准提取锚点细节，第一人称格式)";

            return `
                <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                    <div class="wx-modal" onclick="event.stopPropagation()">
                        <div class="wx-modal-header clean">
                            <div class="wx-modal-title clean">对话总结管理</div>
                        </div>
                        <div class="wx-ios-modal-body">
                            
                            <!-- Group 1: Auto Summary -->
                            <div>
                                <div class="wx-ios-section-header">自动智能总结 (随聊天触发)</div>
                                <div class="wx-ios-card">
                                    <div class="wx-ios-row">
                                        <div class="wx-ios-label">启用自动总结</div>
                                        <div class="wx-switch ${State.summaryConfig.autoEnabled ? 'checked' : ''}" onclick="window.WeChat.App.toggleSummaryAuto()">
                                            <div class="wx-switch-node"></div>
                                        </div>
                                    </div>
                                    
                                    ${State.summaryConfig.autoEnabled ? `
                                    <div class="wx-ios-row">
                                        <div class="wx-ios-label">触发阈值 (消息数)</div>
                                        <input type="number" class="wx-ios-value" 
                                            value="${State.summaryConfig.threshold}" 
                                            oninput="window.WeChat.App.updateSummaryConfig('threshold', this.value)" />
                                    </div>
                                    <div class="wx-ios-input-container">
                                        <div class="wx-ios-input-label">自动总结规则 (Prompt)</div>
                                        <textarea class="wx-ios-textarea" 
                                            placeholder="${promptPlaceholder}"
                                            oninput="window.WeChat.App.updateSummaryConfig('autoPrompt', this.value)">${State.summaryConfig.autoPrompt}</textarea>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Group 2: Manual Summary -->
                            <div>
                                <div class="wx-ios-section-header">手动范围总结 (即时执行)</div>
                                <div class="wx-ios-card">
                                    <div class="wx-ios-input-container">
                                        <div class="wx-ios-input-label">手动总结规则 (Prompt)</div>
                                        <textarea class="wx-ios-textarea" 
                                            style="min-height: 60px;"
                                            placeholder="例如：重点总结关于某次约会的细节... (留空则使用默认规则)"
                                            oninput="window.WeChat.App.updateSummaryConfig('manualPrompt', this.value)">${State.summaryConfig.manualPrompt}</textarea>
                                    </div>
                                    
                                    <div class="wx-ios-row" style="padding-top: 0; padding-bottom: 0px; border-bottom: none;">
                                         <div class="wx-ios-action-link" style="width: 100%; border-top: 0.5px solid var(--wx-border);" onclick="window.WeChat.App.openSummaryRange()">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59L14 6z" transform="rotate(180 12 12)"/></svg>
                                            去选择范围并立即执行
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer Button -->
                            <div class="wx-ios-primary-btn" onclick="window.WeChat.App.saveSummarySettings()">
                                保存并完成
                            </div>

                        </div>
                    </div>
                </div>
            `;
        }

        // Modal 3: Determine Range
        if (State.rangeModalOpen) {
            return `
                <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                    <div class="wx-modal" onclick="event.stopPropagation()" style="width: 270px !important;">
                        <div class="wx-modal-header clean" style="padding-top: 20px !important; padding-bottom: 0 !important;">
                            <div class="wx-modal-title clean" style="font-size: 17px !important;">选择总结范围</div>
                        </div>
                        <div class="wx-ios-modal-body" style="padding: 16px; background: transparent;">
                            <div style="text-align: center; color: var(--wx-text); font-size: 13px; margin-bottom: 16px;">
                                请输入消息 ID (默认从 1 到 最新)
                            </div>
                            
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <input type="number" id="wx-range-start" class="wx-ios-textarea" 
                                    style="width: 60px; height: 36px; min-height: 0; padding: 4px; text-align: center; font-size: 16px; border: 0.5px solid var(--wx-border); background: var(--wx-bg);" 
                                    value="1">
                                <span style="color: var(--wx-text-sec);">至</span>
                                <input type="number" id="wx-range-end" class="wx-ios-textarea" 
                                    style="width: 60px; height: 36px; min-height: 0; padding: 4px; text-align: center; font-size: 16px; border: 0.5px solid var(--wx-border); background: var(--wx-bg);" 
                                    placeholder="最新" value="0">
                            </div>
                        </div>
                        <div class="wx-modal-footer" style="padding: 0; display: flex; border-top: 0.5px solid var(--wx-border); height: 44px;">
                            <div onclick="window.WeChat.App.closeModals()" 
                                style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 17px; color: #007AFF; border-right: 0.5px solid var(--wx-border); font-weight: 400; cursor: pointer;">
                                取消
                            </div>
                            <div onclick="window.WeChat.App.startSummarize()" 
                                style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 17px; color: #007AFF; font-weight: 600; cursor: pointer;">
                                执行
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    },


    openChatInfo() {
        State.prevTab = 'chat_session'; // Although strictly it came from chat session
        State.currentTab = 'chat_info';
        this.render();
    },
    openUserProfile(userId, userName) {
        // Fix: Ensure prevTab is correctly set to current context (e.g. 1 for Contacts)
        State.prevTab = (State.currentTab !== 'user_profile') ? State.currentTab : 1;
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
    },
    goBack() {
        if (State.currentTab === 'chat_session') {
            State.currentTab = (typeof State.prevTab === 'number') ? State.prevTab : 0;
            this.render();
        } else if (State.currentTab === 'chat_info') {
            State.currentTab = 'chat_session';
            this.render();
        } else if (State.currentTab === 'memory_management') {
            State.currentTab = 'chat_info';
            this.render();
        } else if (State.currentTab === 'user_profile') {
            // Intelligent Back: Return to previous tab if valid, else Chat Info
            if (State.prevTab !== undefined && State.prevTab !== null) {
                State.currentTab = State.prevTab;
            } else {
                State.currentTab = 'chat_info';
            }
            this.render();
        } else if (State.currentTab === 'friend_settings') {
            State.currentTab = 'user_profile';
            this.render();
        } else if (State.currentTab === 'persona_settings' || State.currentTab === 'add_friend') {
            State.currentTab = (typeof State.prevTab === 'number') ? State.prevTab : 1; // Default to Contacts
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
