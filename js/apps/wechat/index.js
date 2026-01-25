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
    isTyping: false,
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
    },
    soulInjectionEnabled: true, // [USER_REQUEST] 注入心声开关，默认开启

    // Sticker Panel States
    stickerTab: 'heart', // 'link', 'emoji', 'heart'
    selectionMode: false,
    selectedStickers: new Set(),

    // Bubble Menu States
    bubbleMenuOpen: false,
    bubbleMenuId: null,
    bubbleMenuPos: { x: 0, y: 0 },

    // Message Selection States
    msgSelectionMode: false,
    selectedMsgIds: new Set(),
    characterPanelOpen: false,
    relationshipPanelOpen: false,
    statusHistoryPanelOpen: false,
    cameraFacingMode: 'user', // 'user' or 'environment'

    // Pending edits for relationship management
    pendingRelationship: null,
    cameraModalOpen: false,
    locationModalOpen: false, // New State
    transferModalOpen: false, // New State
    cameraError: null
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
        State.stickerTab = 'heart';
        State.selectionMode = false;
        State.selectedStickers = new Set();
        State.cameraModalOpen = false;
        State.cameraFacingMode = 'user';

        this.injectForceStyles();

        // [file:// Compatibility] Stickers service is now statically loaded in index.html
        // No dynamic loading needed - this ensures file:// protocol compatibility

        // [Upgrade] Wait for Store (IndexedDB) to be ready
        if (window.sysStore && window.sysStore.ready) {
            await window.sysStore.ready();
        }

        this.render();
    },

    sendMessage(text) {
        if (!text) return;
        const cleanText = text.trim();
        if (!cleanText) return;

        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.sendMessage(cleanText, 'text');
        }

        // Clear input
        const input = document.getElementById('wx-chat-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    },

    setTypingState(isTyping) {
        if (State.isTyping !== isTyping) {
            State.isTyping = isTyping;
            this.render();
        }
    },



    injectForceStyles() {
        // [Refactor] Styles moved to css/apps/wechat.css
        // This function is deprecated and kept empty (or removed) to avoid errors if called externally 
        // (though we removed the call in init).
        this.loadStyles();
    },

    loadStyles() {
        if (document.getElementById('wx-styles')) return; // Optimization: Prevent duplicate loading
        const link = document.createElement('link');
        link.id = 'wx-styles';
        link.rel = 'stylesheet';
        link.href = 'css/apps/wechat.css?t=' + Date.now();
        document.head.appendChild(link);
    },

    renderNavBarOverride({ title, showBack, rightIcon, rightAction }) {
        // [Premier Design] Seamless white header for Profile & Chat Info
        const isMeTab = (State.currentTab === 3);
        const isWhitePage = (State.currentTab === 'user_profile');
        const isGrayPage = (State.currentTab === 'chat_info' || State.currentTab === 'friend_settings' || State.currentTab === 'persona_settings');
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const isSelectionMode = State.msgSelectionMode;

        let bgOverride = '';
        if (isSelectionMode) {
            bgOverride = 'background-color: var(--wx-bg) !important; border-bottom: 0.5px solid var(--wx-border) !important;';
        } else if (isMeTab || isWhitePage) {
            bgOverride = 'background-color: var(--wx-cell-bg) !important; border-bottom: none !important; box-shadow: none !important;';
        } else if (isGrayPage || State.currentTab === 'world_book_selection') {
            // Dark Mode: use dark bg; Light Mode: use #EDEDED
            const grayBg = isDark ? 'var(--wx-bg)' : '#EDEDED';
            bgOverride = `background-color: ${grayBg} !important; border-bottom: 0.5px solid var(--wx-border) !important; box-shadow: none !important;`;
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
            : (isSelectionMode ? `<div onclick="window.WeChat.App.exitMsgSelectionMode()" style="position:absolute; left:16px; top:48px; height:44px; display:flex; align-items:center; font-size:16px; color:var(--wx-text); cursor:pointer;">取消</div>` : '');

        const exitBtn = (!showBack && !isSelectionMode)
            ? `<div onclick="window.WeChat.App.closeApp()" 
                    title="返回桌面"
                    style="position:absolute; left:0; top:0; width:120px; height:88px; z-index:999999; background: transparent; cursor: pointer;">
               </div>`
            : '';

        let rightBtnContent = '';
        if (rightIcon === 'add') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        else if (rightIcon === 'more') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
        else if (rightIcon === 'done') rightBtnContent = `<span style="color:var(--wx-green); font-size:16px; font-weight:600;">完成</span>`;
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

        let rightOnClick = rightAction || '';
        if (!rightOnClick) {
            if (State.currentTab === 0 || State.currentTab === 1) {
                rightOnClick = 'window.WeChat.App.toggleAddFriendMenu()';
            } else if (State.currentTab === 'chat_session' || State.currentTab === 'user_profile') {
                if (State.currentTab === 'chat_session') rightOnClick = 'window.WeChat.App.openChatInfo()';
                if (State.currentTab === 'user_profile') rightOnClick = 'window.WeChat.App.openFriendSettings()';
            }
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
                <div id="wx-nav-title" 
                     onclick="${State.currentTab === 'chat_session' ? 'window.WeChat.App.openCharacterPanel()' : ''}"
                     style="font-size:15px; font-weight:500; cursor: ${State.currentTab === 'chat_session' ? 'pointer' : 'default'};">${isSelectionMode ? `已选择 ${State.selectedMsgIds.size} 条消息` : ((State.isTyping && State.currentTab === 'chat_session') ? '对方正在输入...' : title)}</div>
                ${isSelectionMode ? `<div style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center; cursor:pointer;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>` : rightBtn}
                ${isSelectionMode ? '' : menuHtml}
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
            const Views = window.WeChat.Views;
            const Components = window.WeChat.Components;
            if (!Views || !Components) {
                console.warn('WeChat Views or Components not ready, skipping render');
                return;
            }
            let contentHtml = '', navTitle = '微信', rightIcon = 'add', showBack = false, rightAction = '';

            if (State.currentTab === 'chat_session') {
                // [Fix] Ensure Service is synced with App State
                if (window.WeChat.Services && window.WeChat.Services.Chat && State.activeSessionId) {
                    if (window.WeChat.Services.Chat._activeSession !== State.activeSessionId) {
                        window.WeChat.Services.Chat.openSession(State.activeSessionId);
                    }
                }

                // [Fix] Enforce clearing unread status while in chat (SILENTLY to avoid infinite loop)
                if (window.WeChat.Services && window.WeChat.Services.Notifications && State.activeSessionId) {
                    window.WeChat.Services.Notifications.clearUnread(State.activeSessionId, true);
                }

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
            } else if (State.currentTab === 'my_profile_settings') {
                navTitle = '我的资料';
                contentHtml = Views.renderMyProfileSettings();
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'world_book_selection') {
                navTitle = '选择世界书';
                contentHtml = Views.renderWorldBookSelection(State.activeSessionId);
                rightIcon = 'done';
                showBack = true;
                rightAction = 'window.WeChat.App.saveWorldBookSelection()';
            } else {
                switch (State.currentTab) {
                    case 0: navTitle = '微信'; contentHtml = Views.renderChatList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.toggleAddFriendMenu()'; break;
                    case 1: navTitle = '通讯录'; contentHtml = Views.renderContactList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.openAddFriendPage()'; break;
                    case 2: navTitle = '发现'; contentHtml = Views.renderDiscover(); rightIcon = null; break;
                    case 3: navTitle = ''; contentHtml = Views.renderMe(); rightIcon = null; break;
                }
            }

            const showTabBar = (typeof State.currentTab === 'number');
            const selectionModeClass = State.msgSelectionMode ? 'wx-msg-selection-active' : '';

            // --- Enhanced Scroll Preservation ---
            const viewEl = document.getElementById('wx-view-session');
            const oldScrollTop = viewEl ? viewEl.scrollTop : null;

            State.root.innerHTML = `
                    <div class="wechat-app ${selectionModeClass}">
                        ${this.renderNavBarOverride({ title: navTitle, showBack, rightIcon, rightAction })}
                        ${contentHtml}
                        ${showTabBar ? Components.renderTabBar(State.currentTab) : ''}
                        ${State.msgSelectionMode ? this.renderMsgSelectionFooter() : ''}
                        ${this.renderModals()}
                    </div>
                `;

            // --- Restore or Update Scroll ---
            if (State.currentTab === 'chat_session') {
                const newView = document.getElementById('wx-view-session');
                if (newView) {
                    if (State.shouldScrollToBottom) {
                        newView.scrollTop = newView.scrollHeight;
                        State.shouldScrollToBottom = false; // Reset
                    } else if (oldScrollTop !== null) {
                        newView.scrollTop = oldScrollTop; // Keep position
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    },

    openMyProfileSettings() {
        State.prevTab = State.currentTab;
        State.currentTab = 'my_profile_settings';
        this.render();
    },

    saveMyProfileSettings(data) {
        if (window.sysStore && window.sysStore.set) {
            window.sysStore.set('user_realname', data.realName);
            window.sysStore.set('user_gender', data.gender);
            window.sysStore.set('user_persona', data.persona);
        }
        if (window.os) window.os.showToast('保存成功');
        this.goBack();
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
        if (window.os) window.os.showToast('保存成功');
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
            if (window.os) window.os.showToast('请至少输入一个名称', 'error');
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

        if (window.os) window.os.showToast('保存成功');
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
            // Small delay to ensure display:flex is applied and elements are searchable
            setTimeout(() => this.renderStickerGrid(), 50);
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

        // 2. Render Content Area via View
        const container = document.getElementById('wx-sticker-content-container');
        if (container && window.WeChat.Views && window.WeChat.Views.Stickers) {
            window.WeChat.Views.Stickers.renderPanelContent(container, State.stickerTab);
        }

        // 3. Post-render updates
        if (State.stickerTab === 'heart' && State.selectionMode) {
            this.updateActionBar();
        }
    },

    renderStickerGridItems() {
        if (window.WeChat.Views && window.WeChat.Views.Stickers) {
            window.WeChat.Views.Stickers.renderGridItems();
        }
        if (State.selectionMode) {
            this.updateActionBar();
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
            // 如果定时器被清除，说明还没触发长按，此时松手应视为点击
            // _longPressed 应该保持为 false
        }

        // 只有当真正触发了长按后，为了防止后续的 click 事件被触发（click会在mouseup后触发），
        // 我们利用 _longPressed 标志位来拦截。
        // click 事件通常会有一个 check: if (this._longPressed) return;

        // 我们需要由 click handler 负责重置 _longPressed，或者设置一个极短的 timeout 重置它
        // 但这里为了安全，我们延迟重置
        if (this._longPressed) {
            setTimeout(() => { this._longPressed = false; }, 50);
        }
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

        // [Refactor] UI update is now handled centrally by Chat Service (updateUI)
        // This prevents duplicate messages and ensures timestamp logic is applied.
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
            else if (window.os) window.os.showToast('无效链接或已存在', 'error');
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
            // Removed duplicate declaration
            const count = window.WeChat.Services.Stickers.add(urlList);
            if (window.os) window.os.showToast(`成功导入 ${count} 个表情`);
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
                this.render();
                if (window.os) window.os.showToast('背景设置成功');
            }
        }
    },

    removeChatBackground(sessionId) {
        if (window.sysStore) {
            window.sysStore.updateCharacter(sessionId, { chat_background: null });
            this.render();
            if (window.os) window.os.showToast('背景已移除');
        }
    },

    clearChatHistory(sessionId) {
        if (confirm('确定要清空与该联系人的聊天记录吗？此操作不可撤销（包括记忆和状态）。')) {
            if (window.sysStore) {
                window.sysStore.clearMessagesBySession(sessionId);
                if (window.sysStore.resetCharacterState) {
                    window.sysStore.resetCharacterState(sessionId);
                }
                if (window.os) window.os.showToast('记录已清空');
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
                if (window.os) window.os.showToast('请输入有效的数字', 'error');
            }
        }
    },

    toggleBlacklist(userId, isBlacklisted) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(userId, { is_blacklisted: isBlacklisted });
            this.render(); // Refresh UI
        }
    },

    toggleIndependentBgActivity(sessionId, isEnabled) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            const char = window.sysStore.getCharacter(sessionId);
            const settings = char?.settings || {};
            settings.bg_activity_enabled = isEnabled;
            // Ensure threshold exists
            if (isEnabled && settings.bg_activity_threshold === undefined) {
                settings.bg_activity_threshold = 30;
            }
            window.sysStore.updateCharacter(sessionId, { settings: settings });
            this.render();
        }
    },

    setIndependentBgThreshold(sessionId, value) {
        const minutes = parseInt(value);
        if (isNaN(minutes) || minutes < 1) return;
        if (window.sysStore && window.sysStore.updateCharacter) {
            const char = window.sysStore.getCharacter(sessionId);
            const settings = char?.settings || {};
            settings.bg_activity_threshold = minutes;
            window.sysStore.updateCharacter(sessionId, { settings: settings });
        }
    },

    deleteFriend(userId) {
        if (confirm('确定删除该联系人吗？此操作将删除联系人信息及所有聊天记录。')) {
            if (window.WeChat.Services && window.WeChat.Services.Contacts) {
                const success = window.WeChat.Services.Contacts.removeContact(userId);
                if (success) {
                    if (window.os) window.os.showToast('已删除');
                    State.currentTab = 1; // Go back to Contacts
                    this.render();
                }
            }
        }
    },

    setTypingState(isTyping) {
        if (State.isTyping !== isTyping) {
            State.isTyping = isTyping;
            // 直接更新 DOM 避免全局重绘造成的闪烁 (Prevent global re-render flicker)
            const titleEl = document.getElementById('wx-nav-title');
            if (titleEl && State.currentTab === 'chat_session') {
                titleEl.textContent = isTyping ? '对方正在输入...' : (State.chatTitle || '微信');
            } else {
                this.render();
            }
        }
    },

    switchTab(index) { if (State.currentTab !== index) { State.currentTab = index; this.render(); } },
    openChat(id) {
        State.activeSessionId = id;
        if (window.sysStore && window.sysStore.set) window.sysStore.set('wx_lastSession', id); // Persist State
        const map = { 'file_helper': '文件传输助手', 'chara_assistant': 'Chara 小助手', 'pay': '微信支付' };
        State.chatTitle = map[id] || id;
        State.prevTab = State.currentTab;
        State.currentTab = 'chat_session';

        // 清除未读数（通知系统集成）
        if (window.WeChat.Services && window.WeChat.Services.Notifications) {
            window.WeChat.Services.Notifications.clearUnread(id);
        }

        // Sync with Service
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.openSession(id);
        }

        State.shouldScrollToBottom = true; // [Fix] Only scroll on initial entry
        this.render();
    },

    openMemoryManagement(sessionId) {
        State.prevTab = State.currentTab;
        State.currentTab = 'memory_management';

        // Robust ID Handling
        if (sessionId && sessionId !== 'undefined' && sessionId !== 'null' && typeof sessionId === 'string') {
            State.activeSessionId = sessionId;
        } else if (!State.activeSessionId && window.sysStore) {
            // Fallback to stored session if none active
            State.activeSessionId = window.sysStore.get('wx_last_session');
        } else if (!State.activeSessionId) {
            console.error('No active session ID for memory management');
            return; // Can't open without ID
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

    // --- Avatar Upload Logic ---
    triggerAvatarUpload(targetUserId = null) {
        State.avatarTargetId = targetUserId;
        let input = document.getElementById('wx-avatar-upload-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'wx-avatar-upload-input';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (e) => this.handleAvatarFileSelect(e.target);
            document.body.appendChild(input);
        }
        input.click();
    },

    handleAvatarFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            if (window.sysStore) {
                if (State.avatarTargetId) {
                    // Update Character Avatar
                    if (window.sysStore.updateCharacter) {
                        window.sysStore.updateCharacter(State.avatarTargetId, { avatar: result });
                    }
                } else {
                    // Update User (Me) Avatar
                    if (window.sysStore.set) {
                        window.sysStore.set('user_avatar', result);
                    }
                }
                this.render();
            }
            State.avatarTargetId = null; // Reset
        };
        reader.readAsDataURL(file);
        input.value = '';
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
        State.characterPanelOpen = false;
        State.relationshipPanelOpen = false;
        State.statusHistoryPanelOpen = false;
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


    // --- Photo & Camera Features ---

    triggerPhotoUpload() {
        let input = document.getElementById('wx-photo-upload-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'wx-photo-upload-input';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (e) => this.handlePhotoFileSelect(e.target);
            document.body.appendChild(input);
        }
        input.click();
        this.toggleExtraPanel(); // Close the panel
    },

    handlePhotoFileSelect(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            window.WeChat.Services.Chat.sendMessage(dataUrl, 'image');
        };
        reader.readAsDataURL(file);
        input.value = '';
    },

    triggerCamera() {
        this.toggleExtraPanel(); // Close the panel
        State.cameraModalOpen = true;
        this.render();
        // Delay to ensure DOM is ready
        setTimeout(() => this.initCamera(), 100);
    },

    async initCamera() {
        this._stopCameraStream(); // Stop any existing stream first

        // 1. Check Support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this._handleCameraError('SecureContextRequired');
            return;
        }

        const video = document.getElementById('wx-camera-video');
        if (!video) return;

        try {
            const constraints = {
                video: { facingMode: State.cameraFacingMode },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.onloadedmetadata = () => video.play();

            // Hide error if previously shown
            State.cameraError = null;
            this.render(); // Re-render to clear error state if needed

        } catch (err) {
            console.error("Camera access failed", err);
            // Ignore abort error which happens during quick switching
            if (err.name !== 'AbortError' && err.name !== 'NotReadableError') {
                this._handleCameraError(err.name);
            }
        }
    },

    _handleCameraError(errorName) {
        State.cameraError = errorName;
        this.render(); // Trigger re-render to show fallback

        let msg = '无法访问摄像头';
        if (errorName === 'NotAllowedError') msg = '请在浏览器设置中允许摄像头权限';
        if (errorName === 'SecureContextRequired') msg = '当前环境不支持摄像头 (需 HTTPS 或 localhost)';
        if (errorName === 'NotFoundError') msg = '未检测到摄像头设备';

        if (window.os) window.os.showToast(msg, 'error');
    },

    switchCamera() {
        State.cameraFacingMode = State.cameraFacingMode === 'user' ? 'environment' : 'user';
        this.initCamera();
    },

    capturePhoto() {
        const video = document.getElementById('wx-camera-video');
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // Mirror if user facing
        if (State.cameraFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg');
        window.WeChat.Services.Chat.sendMessage(dataUrl, 'image');

        this.closeCameraModal();
    },

    _stopCameraStream() {
        const video = document.getElementById('wx-camera-video');
        if (video && video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
    },

    closeCameraModal() {
        this._stopCameraStream();
        State.cameraModalOpen = false;
        this.render();
    },

    // --- Location Feature ---
    triggerLocation() {
        this.toggleExtraPanel(); // Close extra panel
        State.locationModalOpen = true;
        this.render();
    },

    closeLocationModal() {
        State.locationModalOpen = false;
        this.render();
    },

    sendLocation() {
        const nameInput = document.getElementById('wx-location-name');
        const remarkInput = document.getElementById('wx-location-remark');
        const distInput = document.getElementById('wx-location-dist');

        const locationName = nameInput ? nameInput.value.trim() : '';
        const remark = remarkInput ? remarkInput.value.trim() : '';
        const distance = distInput ? distInput.value.trim() : '';

        if (!locationName) {
            if (window.os) window.os.showToast('请输入位置名称', 'error');
            return;
        }

        // Construct detail string: "Remark" + " | " + "Distance"
        let detailParts = [];
        if (remark) detailParts.push(remark);
        if (distance) detailParts.push(`距你 ${distance} km`);
        const detailText = detailParts.join(' | ');

        const payload = {
            name: locationName,
            detail: detailText || locationName // Fallback
        };

        window.WeChat.Services.Chat.sendMessage(JSON.stringify(payload), 'location');

        this.closeLocationModal();
        if (window.os) window.os.showToast('位置已发送');
    },

    // --- Transfer Feature --- //
    triggerTransfer() {
        this.toggleExtraPanel();
        State.transferModalOpen = true;
        this.render();
    },

    closeTransferModal() {
        State.transferModalOpen = false;
        this.render();
    },

    sendTransfer() {
        const amountInput = document.getElementById('wx-transfer-amount');
        const noteInput = document.getElementById('wx-transfer-note');

        const amount = amountInput ? parseFloat(amountInput.value).toFixed(2) : '0.00';
        const note = noteInput ? noteInput.value.trim() : '';

        if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
            // Button should be disabled ideally, but safety check
            return;
        }

        const payload = {
            amount: amount,
            note: note
        };

        window.WeChat.Services.Chat.sendMessage(JSON.stringify(payload), 'transfer');

        this.closeTransferModal();
        // if (window.os) window.os.showToast('Transfer sent'); // WeChat usually doesn't toast, just bubbles
    },

    renderModals() {
        if (!State.memoryModalOpen && !State.summaryModalOpen && !State.rangeModalOpen && !State.refineModalOpen && !State.bubbleMenuOpen && !State.characterPanelOpen && !State.relationshipPanelOpen && !State.statusHistoryPanelOpen && !State.cameraModalOpen && !State.locationModalOpen && !State.transferModalOpen) return '';

        const char = window.sysStore.getCharacter(State.activeSessionId);

        // --- Transfer Modal (Full Screen Simulation) ---
        if (State.transferModalOpen) {
            const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
            const name = char?.name || 'User';
            // Mask the real name logic (Last name masking is complex without real name data, assume 'User' for now)
            const maskedName = name.length > 1 ? `(**${name.slice(-1)})` : name;

            return `
                <div class="wx-modal-overlay active" style="background: #EDEDED; display: block;">
                    <!-- Nav Bar -->
                    <div style="height: 44px; padding-top: 48px; display: flex; align-items: center; padding-left: 16px; position: relative;">
                        <div onclick="window.WeChat.App.closeTransferModal()" style="width: 24px; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                        <div style="flex: 1;"></div>
                    </div>

                    <!-- Content -->
                    <div style="padding: 20px 24px;">
                        <!-- User Info -->
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 30px;">
                            <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 6px; margin-bottom: 12px; background: #ddd;">
                            <div style="font-size: 16px; color: #000;">转账给 <span style="font-weight: 500;">${name}</span> ${maskedName}</div>
                        </div>

                        <!-- Card -->
                        <div style="background: white; border-radius: 12px; padding: 24px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <div style="font-size: 14px; color: #000; margin-bottom: 16px;">转账金额</div>
                            
                            <div style="display: flex; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 24px;">
                                <span style="font-size: 30px; font-weight: 600; margin-right: 8px;">¥</span>
                                <input id="wx-transfer-amount" type="number" step="0.01" 
                                    style="border: none; font-size: 40px; font-weight: 600; width: 100%; outline: none; caret-color: #07C160;"
                                    placeholder="" oninput="document.getElementById('wx-transfer-btn').style.opacity = (this.value > 0 ? 1 : 0.5)">
                            </div>

                            <div style="margin-bottom: 30px;">
                                <input id="wx-transfer-note" 
                                    style="border: none; font-size: 14px; width: 100%; outline: none; color: #333;" 
                                    placeholder="添加备注 (50字以内)">
                            </div>

                            <div id="wx-transfer-btn" onclick="window.WeChat.App.sendTransfer()"
                                style="background: #07C160; color: white; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; cursor: pointer; opacity: 0.5; transition: opacity 0.2s;">
                                转账
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Location Modal ---
        if (State.locationModalOpen) {
            return `
                <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeLocationModal()">
                    <div class="wx-modal" onclick="event.stopPropagation()">
                        <div class="wx-modal-header">
                            <div class="wx-modal-title">发送位置</div>
                        </div>
                        <div class="wx-modal-body">
                            <div style="margin-bottom: 12px;">
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">位置名称</div>
                                <input id="wx-location-name" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：上海中心大厦" />
                            </div>
                            <div>
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">距离对方 (km)</div>
                                <input id="wx-location-dist" type="number" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：1.5" />
                            </div>
                            <div style="margin-top: 12px;">
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">备注 (可选)</div>
                                <input id="wx-location-remark" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：人均¥200、历史传说、甚至是“xx的家”" />
                            </div>
                        </div>
                        <div class="wx-modal-footer">
                            <div class="wx-modal-btn cancel" onclick="window.WeChat.App.closeLocationModal()">取消</div>
                            <div class="wx-modal-btn confirm" onclick="window.WeChat.App.sendLocation()">发送</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (State.cameraModalOpen) {
            const errorMode = State.cameraError ? true : false;

            return `
                <div class="wx-modal-overlay active" style="background: black; display: flex; align-items: center; justify-content: center;">
                    
                    ${errorMode ? `
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888;">
                            <div style="margin-bottom: 20px; font-size: 48px; opacity: 0.3;">📷</div>
                            <div style="font-size: 16px; margin-bottom: 8px;">无法启动摄像头</div>
                            <div style="font-size: 12px; opacity: 0.6; margin-bottom: 30px; text-align: center; padding: 0 40px;">
                                ${State.cameraError === 'SecureContextRequired' ? '浏览器安全限制：请使用 HTTPS 或 localhost 访问' : '请检查设备连接或权限设置'}
                            </div>
                            <!-- Fallback Upload Button -->
                            <div onclick="window.WeChat.App.triggerPhotoUpload()" style="padding: 10px 24px; background: rgba(255,255,255,0.15); border-radius: 20px; font-size: 14px; color: white; cursor: pointer; border: 1px solid rgba(255,255,255,0.2);">
                                从相册选择...
                            </div>
                        </div>
                    ` : `
                        <!-- Video Container -->
                        <video id="wx-camera-video" style="width: 100%; height: 100%; object-fit: cover; transform: ${State.cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none'};" autoplay playsinline></video>
                    `}
                    
                    <!-- Close Button Removed as per User Request -->
                    <!-- The close functionality is handled by the 'Cancel' button in the bottom controls -->

                    <!-- Bottom Controls (Hide if error) -->
                    <div style="position: absolute; bottom: 50px; width: 100%; display: flex; justify-content: center; align-items: center; gap: 60px; z-index: 10002; ${errorMode ? 'display: none !important;' : ''}">
                         <!-- Cancel / Back -->
                         <div onclick="window.WeChat.App.closeCameraModal()" style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                         </div>
                         
                         <!-- Shutter Button -->
                         <div onclick="window.WeChat.App.capturePhoto()" style="width: 76px; height: 76px; border-radius: 50%; background: white; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 4px solid rgba(255,255,255,0.3); transition: transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                             <div style="width: 60px; height: 60px; border-radius: 50%; background: white;"></div>
                         </div>
                         
                         <!-- Flip Camera -->
                         <div onclick="window.WeChat.App.switchCamera()" style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 .46.04.91.12 1.35"></path>
                                <path d="M4 22c0-4.42 3.58-8 8-8s8 3.58 8 8c0-.46-.04-.91-.12-1.35"></path>
                                <polyline points="16 11.65 20 10 20 14.35"></polyline>
                                <polyline points="8 12.35 4 14 4 9.65"></polyline>
                            </svg>
                         </div>
                    </div>
                </div>
            `;
        }

        // Modal 6: Generic Confirmation Modal (iOS Style) - High Priority Overlay
        if (State.confirmationModal && State.confirmationModal.open) {
            const { title, content, onConfirm, onCancel } = State.confirmationModal;
            return `
                <div class="wx-modal-overlay active" style="z-index: 20002; background: rgba(0,0,0,0.4);" onclick="window.WeChat.App.closeConfirmationModal()">
                     <div class="wx-ios-alert" onclick="event.stopPropagation()">
                        <div class="wx-ios-alert-title">${title}</div>
                        <div class="wx-ios-alert-content">${content}</div>
                        <div class="wx-ios-alert-footer">
                            <div class="wx-ios-alert-btn cancel" onclick="window.WeChat.App.closeConfirmationModal()">取消</div>
                            <div class="wx-ios-alert-btn confirm" onclick="${onConfirm}">确定</div>
                        </div>
                     </div>
                </div>
                ${State.statusHistoryPanelOpen ? window.WeChat.Views.renderStatusHistoryPanel(State.activeSessionId) : ''}
            `;
        }

        if (State.characterPanelOpen) {
            return window.WeChat.Views.renderCharacterPanel(State.activeSessionId);
        }

        if (State.relationshipPanelOpen) {
            return window.WeChat.Views.renderRelationshipPanel(State.activeSessionId);
        }

        // Transfer Modal
        if (State.transferModalOpen) {
            const msg = window.sysStore.getMessageById(State.activeTransferMsgId);
            if (!msg) {
                setTimeout(() => window.WeChat.App.closeTransferModal(), 0);
                return '';
            }

            let trans = { amount: '0.00', note: '' };
            try { trans = JSON.parse(msg.content); } catch (e) { }

            const status = msg.transfer_status || 'pending';
            const isReceived = status === 'received';
            const isRefunded = status === 'refunded';

            // UI State
            let title = '待收款';
            let iconClass = 'waiting';
            let statusText = '确认收款后，资金将存入零钱';

            if (isReceived) {
                title = '已收款';
                iconClass = 'received';
                statusText = '已存入零钱';
            } else if (isRefunded) {
                title = '已退款';
                iconClass = 'refunded';
                statusText = '该转账已退回';
            }

            return `
                <div class="wx-modal-overlay active" style="align-items: center; justify-content: center;" onclick="if(event.target===this) window.WeChat.App.closeTransferModal()">
                    <div class="wx-transfer-modal" style="width: 300px; background: white; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <div style="background: #f79e39; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; position: relative;">
                            <div style="position: absolute; top: 10px; left: 10px; cursor: pointer;" onclick="window.WeChat.App.closeTransferModal()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </div>
                            <div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>
                            </div>
                            <div style="font-size: 16px; margin-bottom: 5px;">${title}</div>
                        </div>
                        <div style="flex: 1; padding: 30px 20px; display: flex; flex-direction: column; align-items: center;">
                            <div style="font-size: 36px; font-weight: 600; color: #333; margin-bottom: 5px;">¥${trans.amount}</div>
                            <div style="font-size: 14px; color: #999; margin-bottom: 30px;">${trans.note || '转账给您'}</div>
                            
                            ${(!isReceived && !isRefunded) ? `
                                <div onclick="window.WeChat.App.confirmReceiveTransfer()" style="width: 100%; height: 48px; background: #07c160; color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; cursor: pointer;">
                                    确认收款
                                </div>
                                <div style="font-size: 12px; color: #999; margin-top: 15px;">${statusText}</div>
                            ` : `
                                <div style="font-size: 14px; color: #999;">${statusText}</div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }

        if (State.statusHistoryPanelOpen) {
            return window.WeChat.Views.renderStatusHistoryPanel(State.activeSessionId);
        }

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

        // Modal 5: Message Bubble Menu
        if (State.bubbleMenuOpen) {
            const pos = State.bubbleMenuPos;
            const flippedClass = pos.isFlipped ? 'flipped' : '';
            return `
                <div class="wx-menu-mask active" onclick="window.WeChat.App.closeMsgMenu()"></div>
                <div class="wx-bubble-menu active ${flippedClass}" style="left: ${pos.x}px; top: ${pos.y}px;">
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.regenerateMsg('${State.bubbleMenuId}')">重回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.recallMsg('${State.bubbleMenuId}')">撤回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.quoteMsg('${State.bubbleMenuId}')">引用</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.multiSelectMsg()">多选</div>
                    <div class="wx-bubble-menu-item delete" onclick="window.WeChat.App.deleteMsg('${State.bubbleMenuId}')">删除</div>
                </div>
            `;
        }

        // Modal 6: Generic Confirmation Modal (iOS Style)
        if (State.confirmationModal && State.confirmationModal.open) {
            const { title, content, onConfirm, onCancel } = State.confirmationModal;
            return `
                <div class="wx-modal-overlay active" style="z-index: 20000; background: rgba(0,0,0,0.4);" onclick="window.WeChat.App.closeConfirmationModal()">
                     <div class="wx-ios-alert" onclick="event.stopPropagation()">
                        <div class="wx-ios-alert-title">${title}</div>
                        <div class="wx-ios-alert-content">${content}</div>
                        <div class="wx-ios-alert-footer">
                            <div class="wx-ios-alert-btn cancel" onclick="window.WeChat.App.closeConfirmationModal()">取消</div>
                            <div class="wx-ios-alert-btn confirm" onclick="${onConfirm}">确定</div>
                        </div>
                     </div>
                </div>
            `;
        }

        return '';
    },


    openChat(sessionId) {
        if (!sessionId) return;
        const char = window.sysStore.getCharacter(sessionId);
        State.activeSessionId = sessionId;
        State.chatTitle = char ? char.name : sessionId;
        State.currentTab = 'chat_session';
        State.shouldScrollToBottom = true; // FORCE SCROLL TO BOTTOM
        this.render();
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

        // [Fix] Force scroll to bottom to prevent "disappearing message" illusion
        // We set the flag for any pending renders
        State.shouldScrollToBottom = true;

        // And we also try to scroll immediately after a short delay (for DOM update)
        setTimeout(() => {
            const view = document.getElementById('wx-view-session');
            if (view) {
                view.scrollTop = view.scrollHeight;
            }
        }, 100);
    },
    openCharacterPanel() {
        State.relationshipPanelOpen = false;
        State.statusHistoryPanelOpen = false;
        State.characterPanelOpen = true;
        this.render();
    },
    closeCharacterPanel() {
        State.characterPanelOpen = false;
        // Ensure others are closed too just in case
        State.relationshipPanelOpen = false;
        State.statusHistoryPanelOpen = false;
        this.render();
    },
    openRelationshipPanel() {
        const char = window.sysStore.getCharacter(State.activeSessionId) || {};
        const status = char.status || {};

        // Initialize pending state with current data
        State.pendingRelationship = {
            affection: parseFloat(status.affection || 0),
            difficulty: status.relationship_difficulty || 'normal', // hard, normal, easy
            they_to_me: {
                relation: status.relationship_they_to_me?.relation || '',
                opinion: status.relationship_they_to_me?.opinion || ''
            },
            me_to_they: {
                relation: status.relationship_me_to_they?.relation || '',
                opinion: status.relationship_me_to_they?.opinion || ''
            },
            ladder_persona: [...(status.ladder_persona || [])]
        };

        State.characterPanelOpen = false;
        State.statusHistoryPanelOpen = false; // Ensure history is closed
        State.relationshipPanelOpen = true;
        this.render();
    },
    updatePendingRelationship(field, value, subfield = null, silent = false) {
        if (!State.pendingRelationship) return;
        if (subfield) {
            State.pendingRelationship[field][subfield] = value;
        } else {
            State.pendingRelationship[field] = value;
        }
        if (!silent) this.render();
    },
    addLadderPersona() {
        if (!State.pendingRelationship) return;
        State.pendingRelationship.ladder_persona.push({
            affection_threshold: 10,
            content: '新的人设阶梯...'
        });
        this.render();
    },
    removeLadderPersona(index) {
        if (!State.pendingRelationship) return;
        State.pendingRelationship.ladder_persona.splice(index, 1);
        this.render();
    },
    updateLadderPersona(index, field, value, silent = false) {
        if (!State.pendingRelationship) return;
        State.pendingRelationship.ladder_persona[index][field] = value;
        if (!silent) this.render();
    },
    async generateLadderPersona() {
        if (!State.pendingRelationship) return;
        const rel = State.pendingRelationship;

        // Validation: Must have relationship info filled
        if (!rel.they_to_me.relation || !rel.they_to_me.opinion || !rel.me_to_they.relation || !rel.me_to_they.opinion) {
            alert('请先填写完整的“关系看法”后再使用生成功能');
            return;
        }

        const sessionId = State.activeSessionId;
        const char = window.sysStore.getCharacter(sessionId);
        const mainPersona = char?.main_persona || "未知人设";

        // Show loading state (simple alert for now or just wait)
        console.log('[AI Generation] Starting Ladder Persona Generation...');

        const prompt = `你是一个角色构建专家。请根据以下角色的[主要人设]和[关系背景]，生成5个阶段的“阶梯人设”。
阶梯人设是指随着好感度增长，角色表现出的性格倾向、行为变化或态度转变。

[主要人设]
${mainPersona}

[关系背景]
- TA对我 (角色对用户): 关系是[${rel.they_to_me.relation}]，看法是[${rel.they_to_me.opinion}]
- 我对TA (用户对角色): 关系是[${rel.me_to_they.relation}]，看法是[${rel.me_to_they.opinion}]

[要求]
1. 严格符合主要人设，逻辑自洽。
2. 生成5个阶段，好感变动区间为 0-100。
3. 请只输出 JSON 数组格式，不要包含任何多余的文字叙述。
4. 格式示例：[{"affection_threshold": 10, "content": "初识：表现得比较客气..."}, ...]

请开始生成 JSON 数组：`;

        const Api = window.Core?.Api || window.API;
        if (!Api) return;

        try {
            const response = await Api.chat([{ role: 'user', content: prompt }]);
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                const stages = JSON.parse(match[0]);
                if (Array.isArray(stages)) {
                    State.pendingRelationship.ladder_persona = stages.slice(0, 5);
                    this.render();
                }
            }
        } catch (e) {
            console.error('[AI Generation] Failed:', e);
            alert('生成失败: ' + e.message);
        }
    },
    async saveRelationshipChanges() {
        const sessionId = State.activeSessionId;
        if (!sessionId || !State.pendingRelationship) return;

        const char = window.sysStore.getCharacter(sessionId);
        const newStatus = {
            ...(char?.status || {}),
            affection: State.pendingRelationship.affection.toFixed(1),
            relationship_difficulty: State.pendingRelationship.difficulty,
            relationship_they_to_me: State.pendingRelationship.they_to_me,
            relationship_me_to_they: State.pendingRelationship.me_to_they,
            ladder_persona: State.pendingRelationship.ladder_persona
        };

        const updates = { status: newStatus };

        // Record to history if changed since last entry
        let history = char?.status_history || [];
        const latest = history[0];

        // [Optimization] Check for empty status before saving
        const aff = parseFloat(newStatus.affection || 0);
        const r1 = newStatus.relationship_they_to_me?.relation;
        const r2 = newStatus.relationship_me_to_they?.relation;
        const isEmpty = (aff === 0 && !r1 && !r2);

        if (!isEmpty && JSON.stringify(newStatus) !== JSON.stringify(latest?.status)) {
            history.unshift({
                timestamp: Date.now(),
                status: JSON.parse(JSON.stringify(newStatus))
            });
            updates.status_history = history.slice(0, 5);
        }
        window.sysStore.updateCharacter(sessionId, updates);

        State.pendingRelationship = null;
        State.relationshipPanelOpen = false;
        State.characterPanelOpen = true; // Return to character panel
        this.render();
    },
    closeRelationshipPanel() {
        State.pendingRelationship = null;
        State.relationshipPanelOpen = false;
        this.render();
    },

    toggleSoulInjection(sessionId, enabled) {
        if (!window.sysStore) return;
        const char = window.sysStore.getCharacter(sessionId);
        const settings = char?.settings || {};
        window.sysStore.updateCharacter(sessionId, {
            settings: { ...settings, soul_injection_enabled: enabled }
        });
        this.render();
    },

    toggleIndependentBgActivity(sessionId, enabled) {
        if (!window.sysStore) return;
        const char = window.sysStore.getCharacter(sessionId);
        const settings = char?.settings || {};
        window.sysStore.updateCharacter(sessionId, {
            settings: { ...settings, bg_activity_enabled: enabled }
        });
        this.render();
    },

    setIndependentBgThreshold(sessionId, value) {
        if (!window.sysStore) return;
        const char = window.sysStore.getCharacter(sessionId);
        const settings = char?.settings || {};
        window.sysStore.updateCharacter(sessionId, {
            settings: { ...settings, bg_activity_threshold: parseInt(value) || 30 }
        });
        // No rerender needed for pure value change usually, but safe
        this.render();
    },

    setContextMemoryLimit(sessionId) {
        const char = window.sysStore.getCharacter(sessionId);
        const current = char?.settings?.memory_limit || 200;
        const val = prompt("请输入上下文记忆消息数量 (建议 50-500):", current);
        if (val !== null) {
            const num = parseInt(val);
            if (!isNaN(num)) {
                const settings = char?.settings || {};
                window.sysStore.updateCharacter(sessionId, {
                    settings: { ...settings, memory_limit: num }
                });
                this.render();
            }
        }
    },
    openStatusHistoryPanel() {
        // Record current status to history before opening
        const sessionId = State.activeSessionId;
        const char = window.sysStore.getCharacter(sessionId);
        if (char && char.status) {
            let history = char.status_history || [];

            // Check if current status is already the latest in history (to avoid duplicates)
            const latest = history[0];
            const currentStr = JSON.stringify(char.status);
            const latestStr = latest ? JSON.stringify(latest.status) : '';

            // [Optimization] Check for empty status
            const s = char.status;
            const aff = parseFloat(s.affection || 0);
            const r1 = s.relationship_they_to_me?.relation;
            const r2 = s.relationship_me_to_they?.relation;
            const isEmpty = (aff === 0 && !r1 && !r2);

            if (!isEmpty && currentStr !== latestStr) {
                history.unshift({
                    timestamp: Date.now(),
                    status: JSON.parse(currentStr) // Deep copy
                });
                // Limit to 5 records
                history = history.slice(0, 5);
                window.sysStore.updateCharacter(sessionId, { status_history: history });
            }
        }

        State.characterPanelOpen = false;
        State.relationshipPanelOpen = false; // Ensure relationship is closed
        State.statusHistoryPanelOpen = true;
        this.render();
    },
    closeStatusHistoryPanel() {
        State.statusHistoryPanelOpen = false;
        this.render();
    },
    openConfirmationModal({ title, content, onConfirm }) {
        State.confirmationModal = {
            open: true,
            title,
            content,
            onConfirm
        };
        this.render();
    },

    closeConfirmationModal() {
        State.confirmationModal = { open: false };
        this.render();
    },

    performDeleteStatusHistoryRecord(sessionId, timestamp) {
        const char = window.sysStore.getCharacter(sessionId);
        if (!char || !char.status_history) return;

        const history = char.status_history.filter(record => record.timestamp !== timestamp);

        // Logic: If we deleted the LATEST record (index 0), then the current active status must roll back to the new latest.
        // If history becomes empty, reset to default.
        let updates = { status_history: history };

        if (history.length > 0) {
            // Check if we deleted the head. Comparing timestamp is safest.
            // Actually, we just simply apply the RULE: "Current Status" should always mirror "History[0]".
            // So if History[0] changed, we update Status.
            updates.status = history[0].status;
        } else {
            updates.status = {
                outfit: "日常便装",
                behavior: "等待回复",
                inner_voice: "..."
            };
        }

        window.sysStore.updateCharacter(sessionId, updates);
        this.closeConfirmationModal();
        this.render(); // Will re-render status panel
    },

    deleteStatusHistoryRecord(sessionId, timestamp) {
        this.openConfirmationModal({
            title: '删除状态',
            content: '确定要删除这条历史状态吗？删除后将无法恢复。',
            onConfirm: `window.WeChat.App.performDeleteStatusHistoryRecord('${sessionId}', ${timestamp})`
        });
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
            // Intelligent Back: Return to previous tab if valid
            // CAUTION: If prevTab is 'user_profile' (recursive), break out to contact list
            if (State.prevTab !== undefined && State.prevTab !== null && State.prevTab !== 'user_profile') {
                // Special case: If we came from Chat Info, go back there
                if (State.prevTab === 'chat_info') {
                    State.currentTab = 'chat_info';
                } else {
                    State.currentTab = State.prevTab;
                }
            } else {
                State.currentTab = 1; // Default fallback to Contacts
            }
            this.render();
        } else if (State.currentTab === 'friend_settings') {
            State.currentTab = 'user_profile';
            this.render();
        } else if (State.currentTab === 'persona_settings' || State.currentTab === 'add_friend') {
            State.currentTab = (typeof State.prevTab === 'number') ? State.prevTab : 1;
            this.render();
        } else if (State.currentTab === 'my_profile_settings') {
            State.currentTab = State.prevTab || 3;
            this.render();
        } else {
            // If we are in a sub-page (string ID) but no specific handler matches, go Home
            if (typeof State.currentTab === 'string') {
                console.warn('Recovering from unknown sub-page to Home');
                State.currentTab = 0;
                this.render();
            } else {
                // Numeric tabs (0, 1, 2, 3) -> Exit App
                if (window.os) window.os.closeActiveApp();
            }
        }
    },
    closeApp() { if (window.os) window.os.closeActiveApp(); },

    // --- Message Context Menu Handlers ---
    handleMsgPressStart(e, msgId) {
        // [Interaction] Prevent system menu and handle selection mode
        if (State.selectionMode || State.msgSelectionMode) return;

        // [Optimized] Rely on oncontextmenu="return false" instead of early preventDefault
        // This ensures mouse/touch events flow correctly in all browsers
        e.stopPropagation();

        if (this._msgPressTimer) clearTimeout(this._msgPressTimer);

        this._msgPressTimer = setTimeout(() => {
            this._msgLongPressed = true;
            const touch = (e.touches && e.touches[0]) ? e.touches[0] : e;
            this.showMsgMenu(msgId, touch.clientX, touch.clientY);
        }, 400);
    },

    handleMsgPressEnd() {
        if (this._msgPressTimer) {
            clearTimeout(this._msgPressTimer);
            this._msgPressTimer = null;
        }
        // Small delay to allow click event to detect longpress if needed
        setTimeout(() => { this._msgLongPressed = false; }, 200);
    },

    showMsgMenu(msgId, x, y) {
        const el = document.querySelector(`[data-msg-id="${msgId}"]`);
        const appEl = document.querySelector('.wechat-app');
        const appWidth = appEl ? appEl.offsetWidth : window.innerWidth;

        if (el) {
            const rect = el.getBoundingClientRect();
            // 获取相对于 app 容器的坐标
            const appRect = appEl ? appEl.getBoundingClientRect() : { left: 0, top: 0 };

            let menuX = (rect.left - appRect.left) + rect.width / 2;
            let menuY = (rect.top - appRect.top);

            // [Boundary Check] Menu max-width is 160px, centered means 80px on each side
            const halfMenuWidth = 80;
            if (menuX < halfMenuWidth + 10) {
                menuX = halfMenuWidth + 10;
            } else if (menuX > appWidth - (halfMenuWidth + 10)) {
                menuX = appWidth - (halfMenuWidth + 10);
            }

            // [Safety] If the bubble is too close to the top, show the menu BELOW the bubble.
            const isTooTop = (rect.top - appRect.top) < (92 + 150);

            if (isTooTop) {
                menuY = (rect.bottom - appRect.top) + 10;
            } else {
                menuY = (rect.top - appRect.top) - 10;
            }

            State.bubbleMenuPos = { x: menuX, y: menuY, isFlipped: isTooTop };
        } else {
            // Absolute coordinates fallback (need to adjust relative to container)
            const appRect = appEl ? appEl.getBoundingClientRect() : { left: 0, top: 0 };
            State.bubbleMenuPos = { x: x - appRect.left, y: y - appRect.top, isFlipped: false };
        }

        State.bubbleMenuOpen = true;
        State.bubbleMenuId = msgId;
        this.render();
        if (navigator.vibrate) navigator.vibrate(50);
    },

    closeMsgMenu() {
        State.bubbleMenuOpen = false;
        this.render();
    },

    deleteMsg(msgId) {
        if (window.sysStore && window.sysStore.deleteMessage) {
            window.sysStore.deleteMessage(msgId);
            this.render();
        }
        this.closeMsgMenu();
    },

    recallMsg(msgId) {
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.recallMessage(State.activeSessionId, msgId);
        }
        this.closeMsgMenu();
        this.render(); // Redraw session
    },

    regenerateMsg(msgId) {
        if (!window.sysStore) return;
        const messages = window.sysStore.getMessagesBySession(State.activeSessionId);
        const index = messages.findIndex(m => m.id === msgId);
        if (index === -1) return;

        // Find the "Origin" of this round: 
        // If we long-press AI message, we want to go back to the user message that caused it.
        // If we long-press Our message, we want to redo from that message.
        let rollbackIndex = index;
        const targetMsg = messages[index];
        const isMe = (m) => m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my';

        if (!isMe(targetMsg)) {
            // It's AI message, find the User message before it
            for (let i = index; i >= 0; i--) {
                if (isMe(messages[i])) {
                    rollbackIndex = i;
                    break;
                }
            }
        }

        const originUserMsg = messages[rollbackIndex];
        // SAFETY: Only proceed if we found a user message to redo from
        if (!originUserMsg || !isMe(originUserMsg)) {
            console.warn('No user message found to regenerate from');
            this.closeMsgMenu();
            return;
        }

        const toDeleteIds = messages.slice(rollbackIndex).map(m => m.id);

        // Delete messages in store
        toDeleteIds.forEach(id => window.sysStore.deleteMessage(id));

        // Close Menu First
        this.closeMsgMenu();

        // Put user content back and trigger sending + AI reply
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            // 1. Re-send the user message
            window.WeChat.Services.Chat.sendMessage(originUserMsg.content);

            // 2. IMPORTANT: Trigger the AI to reply to this "new" send
            // Add a small delay for store sync/UI update
            setTimeout(() => {
                window.WeChat.Services.Chat.triggerAIReply();
            }, 300);
        }

        this.render();
    },

    quoteMsg(msgId) {
        const msg = window.sysStore.getMessageById(msgId);
        if (msg) {
            const input = document.getElementById('wx-chat-input');
            if (input) {
                // Prepend quote
                const escaped = msg.content.length > 50 ? msg.content.substring(0, 47) + '...' : msg.content;
                input.value = `「${escaped}」\n----------------\n` + input.value;
                input.focus();
            }
        }
        this.closeMsgMenu();
    },

    multiSelectMsg() {
        State.msgSelectionMode = true;
        State.selectedMsgIds = new Set();
        if (State.bubbleMenuId) {
            State.selectedMsgIds.add(State.bubbleMenuId);
        }
        this.closeMsgMenu();
        this.render();
    },

    exitMsgSelectionMode() {
        State.msgSelectionMode = false;
        State.selectedMsgIds = new Set();
        this.render();
    },

    toggleMsgSelection(msgId) {
        if (!State.msgSelectionMode) {
            // [Interactive Feature] Handle specific message interactions when NOT in selection mode
            const msg = window.sysStore.getMessageById(msgId);
            if (msg && msg.type === 'transfer') {
                this.openTransferModal(msgId);
            }
            return;
        }
        if (State.selectedMsgIds.has(msgId)) {
            State.selectedMsgIds.delete(msgId);
        } else {
            State.selectedMsgIds.add(msgId);
        }
        this.render();
    },

    deleteSelectedMessages() {
        if (State.selectedMsgIds.size === 0) return;
        if (confirm(`确定删除选中的 ${State.selectedMsgIds.size} 条消息吗？`)) {
            if (window.sysStore && window.sysStore.deleteMessage) {
                State.selectedMsgIds.forEach(id => {
                    window.sysStore.deleteMessage(id);
                });
            }
            this.exitMsgSelectionMode();
        }
    },

    renderMsgSelectionFooter() {
        return `
            <div class="wx-msg-selection-footer">
                <div class="wx-selection-footer-item" onclick="alert('转发功能开发中...')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 17 5 5 5-5"/><path d="M20 2v9a4 4 0 0 1-4 4H4"/><path d="m7 19-3-4 3-4"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="alert('收藏功能开发中...')">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="window.WeChat.App.deleteSelectedMessages()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="alert('更多功能开发中...')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M11 4v16"/></svg>
                </div>
            </div>
        `;
    },

    // --- World Book Selection Logic ---
    openWorldBookSelection(sessionId) {
        State.prevTab = State.currentTab;
        State.currentTab = 'world_book_selection';
        State.activeSessionId = sessionId;
        this.render();
    },

    toggleWorldBookSelection(entryId) {
        const char = window.sysStore.getCharacter(State.activeSessionId);
        if (!char) return;

        const settings = char.settings || {};
        let selectedIds = settings.world_book_ids || [];

        if (!Array.isArray(selectedIds)) selectedIds = [];

        const index = selectedIds.indexOf(entryId);
        if (index > -1) {
            selectedIds.splice(index, 1);
        } else {
            selectedIds.push(entryId);
        }

        settings.world_book_ids = selectedIds;
        window.sysStore.updateCharacter(State.activeSessionId, { settings });
        this.render();
    },

    saveWorldBookSelection() {
        this.goBack();
    },

    goBack() {
        const current = State.currentTab;
        const prev = State.prevTab;

        if (current === 'world_book_selection') {
            State.currentTab = 'chat_info';
        } else if (current === 'chat_info' || current === 'memory_management') {
            State.currentTab = 'chat_session';
        } else if (current === 'chat_session') {
            State.currentTab = 0;
            State.activeSessionId = null;
        } else if (current === 'friend_settings' || current === 'persona_settings') {
            State.currentTab = 'user_profile';
        } else if (current === 'user_profile') {
            // User profile is special because it can be reached from multiple places
            State.currentTab = (prev === 'chat_session' || prev === 0 || prev === 1) ? prev : 0;
        } else if (current === 'add_friend' || current === 'my_profile_settings') {
            State.currentTab = (typeof prev === 'number') ? prev : 0;
        } else {
            // Default fallback
            State.currentTab = 0;
        }

        // Reset scrolling or close panels if needed
        this.closeAllPanels();

        if (State.currentTab === 'chat_session' && prev === 0) {
            State.shouldScrollToBottom = true; // Force scroll if coming from list
        }

        this.render();
    },

    // --- Transfer Modal Logic ---
    openTransferModal(msgId) {
        State.transferModalOpen = true;
        State.activeTransferMsgId = msgId;
        this.render();
    },

    closeTransferModal() {
        State.transferModalOpen = false;
        State.activeTransferMsgId = null;
        this.render();
    },

    confirmReceiveTransfer() {
        if (!State.activeTransferMsgId) return;
        const msgId = State.activeTransferMsgId;
        const msg = window.sysStore.getMessageById(msgId);

        if (msg) {
            // 1. Update Message Status
            msg.transfer_status = 'received';

            // 2. Persist
            if (window.sysStore.updateMessage) {
                window.sysStore.updateMessage(msg.id, msg);
            } else {
                // Fallback update
                const all = window.sysStore.getAllMessages();
                window.sysStore.set('chara_db_messages', all);
            }

            // 3. Add System Notice (Use Chat Service helper if available, or direct store add)
            // We can simulate an "accept_transfer" action behavior
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const sysMsg = {
                sender_id: 'system',
                receiver_id: 'user',
                content: `已收款 ¥${amount}`,
                type: 'transfer_status' // Use a special type for the "Received" notice bubble if we have one, or simple text
            };
            // Use `transfer_status` type which we saw in chat.js logic
            sysMsg.content = JSON.stringify({ status: 'received', text: `已收款 ¥${amount}`, amount: amount });
            sysMsg.type = 'transfer_status';

            window.sysStore.addMessage(sysMsg);

            // 4. Update UI
            if (window.WeChat.Services && window.WeChat.Services.Chat && window.WeChat.Services.Chat._findAndUpdateTransfer) {
                // This updates the *original* bubble visually in DOM if needed immediately
                // But since we updated the store and will re-render, it might be redundant but safe
            }
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render to update the bubble status color
        this.render();

        if (window.os) window.os.showToast('收款成功');
    },


    // --- Public Getters for View ---
    getSelectionState() {
        return {
            selectionMode: State.selectionMode,
            selectedStickers: State.selectedStickers,
            msgSelectionMode: State.msgSelectionMode,
            selectedMsgIds: State.selectedMsgIds
        };
    },

    getActiveSessionId() {
        // Only return ID if we are actually viewing the chat session
        if (State.currentTab === 'chat_session') return State.activeSessionId;
        return null;
    }
};

window.WeChat.switchTab = (idx) => window.WeChat.App.switchTab(idx);
window.WeChat.goBack = () => window.WeChat.App.goBack();
window.WeChat.sendMessage = (txt) => window.WeChat.App.sendMessage(txt);
window.WeChat.toggleExtraPanel = () => window.WeChat.App.toggleExtraPanel();
window.WeChat.toggleStickerPanel = () => window.WeChat.App.toggleStickerPanel();

