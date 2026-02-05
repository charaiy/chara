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
当前年份日期星期时间/具体地点，角色的第三人称总结（请使用角色名或"他/她"来称呼角色，使用"你"或用户姓名来称呼用户），禁止太过于主观!

## 示例："线上(线下）/2025年4月2日8:30，星期三，(角色名)和你聊了关于早餐的话题。"

## 精炼记忆时禁止偷懒输出token count，必须进行正确的精炼

## 图片禁止总结为"发了一张图片/个人照片"，必须说明是什么图片，如果只是表情包则禁止总结在其中!!    
## 语音通话特别说明：如果记录中出现 [语音通话] 标签的消息，说明这些对话是通话期间产生的，请将其统一总结为"我们进行了一次语音通话，聊了xx"，禁止将其总结为文字聊天后再进行通话!!`;

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
    locationModalOpen: false,
    transferModalOpen: false,
    videoCallModalOpen: false,
    activeCallSessionId: null,
    voiceCallState: { open: false, sessionId: null, status: 'dialing', startTime: null, timer: null },
    videoCallState: { open: false, sessionId: null, status: 'dialing', startTime: null, timer: null },
    cameraError: null,

    // Custom Modals
    confirmationModal: { open: false, title: '', content: '', onConfirm: '', onCancel: '' },
    promptModal: { open: false, title: '', content: '', value: '', onConfirm: '', onCancel: '' },
    subjectiveGraphId: null // [v44] 新增：主观关系网视角 ID
};

window.WeChat = window.WeChat || {};
window.WeChat.Defaults = {
    SUMMARY_PROMPT: DEFAULT_SUMMARY_PROMPT
};

window.WeChat.App = {
    get State() { return State; },
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

        const style = document.createElement('style');
        style.textContent = `
            .wx-field-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .wx-field-actions {
                display: flex;
                gap: 12px;
                opacity: 0.6;
            }
            .wx-field-action-btn {
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.1s, opacity 0.2s;
                color: var(--wx-text-sec);
            }
            .wx-field-action-btn:hover {
                opacity: 1;
                transform: scale(1.1);
            }
            .wx-field-action-btn.locked {
                color: #ff9500;
            }
            .wx-field-action-btn.dice {
                color: #576b95;
            }
            .wx-field-action-btn.clear {
                color: #fa5151;
            }
            input:disabled, textarea:disabled, select:disabled {
                opacity: 0.7;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);

        // [file:// Compatibility] Stickers service is now statically loaded in index.html
        // No dynamic loading needed - this ensures file:// protocol compatibility

        // [Upgrade] Wait for Store (IndexedDB) to be ready
        if (window.sysStore && window.sysStore.ready) {
            await window.sysStore.ready();
        }

        // [Persist] Load field locks
        State.fieldLocks = window.sysStore.get('chara_field_locks', {});

        // [Critical] Expose State to window so sub-services (like Prompts) can read context correctly
        window.State = State;

        this.render();
    },







    injectForceStyles() {
        // [Refactor] Styles moved to css/apps/wechat.css
        // This function is deprecated and kept empty (or removed) to avoid errors if called externally 
        // (though we removed the call in init).
        this.loadStyles();
    },

    loadStyles() {
        // if (document.getElementById('wx-styles')) return; 
        // const link = document.createElement('link');
        // link.id = 'wx-styles';
        // link.rel = 'stylesheet';
        // link.href = 'css/apps/wechat.css?t=' + Date.now();
        // document.head.appendChild(link);
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
        } else if (isMeTab) {
            bgOverride = 'background-color: transparent !important; border-bottom: none !important; box-shadow: none !important;';
        } else if (isWhitePage) {
            bgOverride = 'background-color: var(--wx-cell-bg) !important; border-bottom: none !important; box-shadow: none !important;';
        } else if (isGrayPage || State.currentTab === 'world_book_selection') {
            // Dark Mode: use dark bg; Light Mode: use #EDEDED
            const grayBg = isDark ? 'var(--wx-bg)' : '#EDEDED';
            bgOverride = `background-color: ${grayBg} !important; border-bottom: 0.5px solid var(--wx-border) !important; box-shadow: none !important;`;
        }

        const navStyle = `
            height: var(--wx-nav-height); padding-top: var(--wx-status-bar-height); position: absolute; top: 0; left: 0; width: 100%;
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            border-bottom: none; box-sizing: border-box; transition: background-color 0.2s;
            ${bgOverride}
        `;

        const backBtn = showBack
            ? `<div onclick="window.WeChat.goBack()" style="position:absolute; left:0; top:var(--wx-status-bar-height); width:60px; height:44px; display:flex; align-items:center; padding-left:16px; box-sizing:border-box; z-index:10001; cursor: pointer;">
                 <svg width="12" height="20" viewBox="0 0 12 20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M11 4L4 10l7 6"/></svg>
               </div>`
            : (isSelectionMode ? `<div onclick="window.WeChat.App.exitMsgSelectionMode()" style="position:absolute; left:16px; top:var(--wx-status-bar-height); height:44px; display:flex; align-items:center; font-size:16px; color:var(--wx-text); cursor:pointer;">取消</div>` : '');

        const exitBtn = (!showBack && !isSelectionMode)
            ? `<div onclick="window.WeChat.App.closeApp()" 
                    title="返回桌面"
                    style="position:absolute; left:0; top:0; width:120px; height:var(--wx-nav-height); z-index:999999; background: transparent; cursor: pointer;">
               </div>`
            : '';

        let rightBtnContent = '';
        if (rightIcon === 'add') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        else if (rightIcon === 'more') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
        else if (rightIcon === 'done') rightBtnContent = `<span style="color:var(--wx-green); font-size:16px; font-weight:600;">完成</span>`;
        else if (rightIcon === 'random') {
            rightBtnContent = `
                <div id="wx-nav-gen-btn" title="随机填充未锁定项" style="display:flex; align-items:center; justify-content:center; color:var(--wx-text); opacity:0.8;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 15h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2zm8-4h-2V6h2v2zm-4 0h-2V6h2v2zm-4 0H7V6h2v2z"/></svg>
                </div>
            `;
        }
        else if (rightIcon === 'reset') {
            rightBtnContent = `
                <div title="重置视图" style="display:flex; align-items:center; justify-content:center; color:var(--wx-text); opacity:0.8;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                </div>
            `;
        }
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
                    <div style="position:absolute; right:16px; top:var(--wx-status-bar-height); height:44px; display:flex; align-items:center;">${rightBtnContent}</div>
                </div>
            `;
        }

        let rightOnClick = rightAction || '';
        if (!rightOnClick) {
            if (State.currentTab === 0 || State.currentTab === 1) {
                rightOnClick = 'window.WeChat.App.toggleAddFriendMenu()';
            } else if (State.currentTab === 'chat_session' || State.currentTab === 'user_profile') {
                if (State.currentTab === 'chat_session') {
                    // Force scroll to bottom when returning to chat info (or mistakenly thought returning)
                    // Actually, let's fix the specific user complaint
                    rightOnClick = 'window.WeChat.App.openChatInfo()';
                }
                if (State.currentTab === 'user_profile') rightOnClick = 'window.WeChat.App.openFriendSettings()';
            }
        }

        const rightBtn = rightIcon ? `<div onclick="${(rightIcon === 'random' && rightAction) ? rightAction : (rightAction || rightOnClick)}" style="position:absolute; right:16px; top:var(--wx-status-bar-height); height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; width: 44px;">${rightBtnContent}</div>` : '';

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
                ${isSelectionMode ? `<div style="position:absolute; right:16px; top:var(--wx-status-bar-height); height:44px; display:flex; align-items:center; cursor:pointer;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>` : rightBtn}
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
                contentHtml = Views.renderChatSession(State.activeSessionId, State.shouldScrollToBottom);
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
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('persona')";
                showBack = true;
            } else if (State.currentTab === 'add_friend') {
                navTitle = '朋友资料';
                contentHtml = Views.renderAddFriend();
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('add')";
                showBack = true;
            } else if (State.currentTab === 'my_profile_settings') {
                navTitle = '我的资料';
                contentHtml = Views.renderMyProfileSettings();
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('my')";
                showBack = true;
            } else if (State.currentTab === 'world_book_selection') {
                navTitle = '选择世界书';
                contentHtml = Views.renderWorldBookSelection(State.activeSessionId);
                rightIcon = 'done';
                showBack = true;
                rightAction = 'window.WeChat.App.saveWorldBookSelection()';
            } else if (State.currentTab === 'voice_video_settings') {
                navTitle = '语音与视频';
                contentHtml = Views.renderVoiceVideoSettings(State.activeSessionId);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'relationship_graph') {
                navTitle = '关系网';
                contentHtml = (window.WeChat.Views && window.WeChat.Views.renderRelationshipGraph) ? window.WeChat.Views.renderRelationshipGraph() : '<div style="padding:20px;text-align:center;color:#999;">正在初始化关系网组件...</div>';
                rightIcon = 'reset';
                rightAction = 'window.WeChat.UI.RelationshipGraphGod.resetView()';
                showBack = true;
            } else {
                switch (State.currentTab) {
                    case 0: navTitle = '微信'; contentHtml = Views.renderChatList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.toggleAddFriendMenu()'; break;
                    case 1: navTitle = '通讯录'; contentHtml = Views.renderContactList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.openAddFriendPage()'; break;
                    case 2: navTitle = '发现'; contentHtml = Views.renderDiscover(); rightIcon = null; break;
                    case 3: navTitle = ''; contentHtml = Views.renderMe(); rightIcon = null; break;
                }
            }

            const showTabBar = (typeof State.currentTab === 'number');
            const isRG = (State.currentTab === 'relationship_graph');
            const selectionModeClass = State.msgSelectionMode ? 'wx-msg-selection-active' : '';

            // --- Enhanced Scroll Preservation ---
            const viewEl = document.getElementById('wx-view-session');
            const oldScrollTop = viewEl ? viewEl.scrollTop : null;

            // [Fix] Preserve Relationship Panel Scroll
            const relPanelScrollEl = document.querySelector('.wx-char-panel-scrollable');
            const relPanelScrollTop = relPanelScrollEl ? relPanelScrollEl.scrollTop : null;

            State.root.innerHTML = `
                    <div class="wechat-app ${selectionModeClass}">
                        ${isRG ? '' : this.renderNavBarOverride({ title: navTitle, showBack, rightIcon, rightAction })}
                        ${contentHtml}
                        ${showTabBar ? Components.renderTabBar(State.currentTab) : ''}
                        ${State.msgSelectionMode ? this.renderMsgSelectionFooter() : ''}
                        ${this.renderModals()}
                    </div>
                `;

            // --- Restore or Update Scroll ---

            // 1. Restore Relationship Panel Scroll
            if (relPanelScrollTop !== null) {
                const newRelPanel = document.querySelector('.wx-char-panel-scrollable');
                if (newRelPanel) {
                    newRelPanel.scrollTop = relPanelScrollTop;
                }
            }

            // 2. Chat Session Scroll
            if (State.currentTab === 'chat_session') {
                const newView = document.getElementById('wx-view-session');
                if (newView) {
                    if (State.shouldScrollToBottom) {
                        // [Anti-Jump] Content initialized with visibility:hidden

                        // [Fix] Use double-RAF to ensure layout paint is ready
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                if (newView) {
                                    newView.scrollTop = newView.scrollHeight;

                                    const msgList = newView.querySelector('.wx-chat-messages');
                                    if (msgList) {
                                        msgList.style.visibility = 'visible';
                                        msgList.style.opacity = '1';
                                    }
                                }
                            });
                        });
                        State.shouldScrollToBottom = false; // Reset
                    } else if (oldScrollTop !== null) {
                        // Only restore if not forcing bottom
                        newView.scrollTop = oldScrollTop; // Keep position
                    }
                }
            }
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

    // --- Field Management (Lock, Clear, Randomize) ---
    toggleFieldLock(fieldId) {
        if (!State.fieldLocks) State.fieldLocks = {};
        State.fieldLocks[fieldId] = !State.fieldLocks[fieldId];

        // [Persist] Save field locks
        if (window.sysStore && window.sysStore.set) {
            window.sysStore.set('chara_field_locks', State.fieldLocks);
        }

        const btn = document.getElementById(`lock-btn-${fieldId}`);
        if (btn) {
            btn.classList.toggle('locked', !!State.fieldLocks[fieldId]);
            btn.innerHTML = State.fieldLocks[fieldId]
                ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>'
                : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';
        }

        const input = document.getElementById(fieldId);
        if (input) input.disabled = !!State.fieldLocks[fieldId];
    },

    clearField(fieldId) {
        if (State.fieldLocks?.[fieldId]) return;
        const input = document.getElementById(fieldId);
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        }
    },

    async randomizeField(fieldId) {
        if (State.fieldLocks?.[fieldId]) return;

        // Find which group this field belongs to (type: my, persona, add)
        let type = 'persona';
        if (fieldId.startsWith('wx-my-')) type = 'my';
        else if (fieldId.startsWith('wx-add-friend-')) type = 'add';
        else if (fieldId.startsWith('wx-rel-')) type = 'rel';

        await this.randomizeAllUnlocked(type, fieldId);
    },

    async randomizeAllUnlocked(type, targetFieldId = null) {
        // 桥接调用：转发给 Generators 服务
        return window.WeChat.Services.Generators.randomizeAllUnlocked(type, targetFieldId);
    },

    // [DEPRECATED] 已移动到 services/generators.js，保留此方法仅用于向后兼容
    _collectPersonaData(prefix, userId = null) {
        // 桥接调用：转发给 Generators 服务
        return window.WeChat.Services.Generators._collectPersonaData(prefix, userId);
    },

    savePersonaSettings(userId, data, silent = false) {
        return window.WeChat.Services.ProfileSettings.savePersonaSettings(userId, data, silent);
    },



    async openAssociatedGen(sourceUserId) {
        return window.WeChat.Services.Relationships.openAssociatedGen(sourceUserId);
    },
    async generateAssociatedInBackground(targetId, sourceChar, relation) {
        // 桥接调用：转发给 Generators 服务
        return window.WeChat.Services.Generators.generateAssociatedInBackground(targetId, sourceChar, relation);
    },


    openVoiceVideoSettings(sessionId) {
        State.prevTab = State.currentTab;
        State.activeSessionId = sessionId;
        State.currentTab = 'voice_video_settings';
        this.render();
    },

    saveVoiceVideoSettings(sessionId, data) {
        return window.WeChat.Services.ProfileSettings.saveVoiceVideoSettings(sessionId, data);
    },

    triggerCallImageUpload(sessionId, type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const dataUrl = re.target.result;
                    const imgId = type === 'peer' ? 'wx-vc-peer-img' : 'wx-vc-my-img';
                    const el = document.getElementById(imgId);
                    if (el) {
                        el.src = dataUrl;
                        el.dataset.hasImage = 'true';
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    },


    openMyProfileSettings() {
        State.prevTab = State.currentTab;
        State.currentTab = 'my_profile_settings';
        this.render();
    },

    saveMyProfileSettings(data, silent = false) {
        return window.WeChat.Services.ProfileSettings.saveMyProfileSettings(data, silent);
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
        const { realName, remark, nickname, persona, gender, species, wxid } = data;
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
            gender: gender || '',
            species: species || '',
            wxid: wxid || ('wxid_' + Math.random().toString(36).substring(2, 10)),
            avatar: data.avatar || 'assets/images/avatar_placeholder.png',
            section: displayName.charAt(0).toUpperCase() || 'Z',
            bio: data.bio || '',
            region: data.region || '',
            settings: {
                persona: persona,
                birthday: data.birthday || '',
                age: data.age || '',
                period_start: data.periodStart || '',
                region_mapping: data.regionMapping || '',
                wealth_level: data.wealth || ''
            }
        };

        if (window.WeChat.Services && window.WeChat.Services.Contacts) {
            window.WeChat.Services.Contacts.addContact(contact);
        }

        if (window.os) window.os.showToast('保存成功');
        State.newFriendAvatar = null;
        this.goBack();
    },

    // --- Panel Hiding Logic ---
    _togglePanel(panelId) {
        return window.WeChat.Services.UI._togglePanel(panelId);
    },

    toggleExtraPanel() {
        return window.WeChat.Services.UI.toggleExtraPanel();
    },
    toggleStickerPanel() {
        return window.WeChat.Services.UI.toggleStickerPanel();
    },

    closeAllPanels() {
        return window.WeChat.Services.UI.closeAllPanels();
    },



    // --- Sticker Panel Logic ---
    switchStickerTab(tab) {
        return window.WeChat.Services.UI.switchStickerTab(tab);
    },

    renderStickerPanelContent() {
        return window.WeChat.Services.UI.renderStickerPanelContent();
    },

    renderStickerGridItems() {
        return window.WeChat.Services.UI.renderStickerGridItems();
    },

    updateActionBar() {
        return window.WeChat.Services.UI.updateActionBar();
    },

    // --- Selection & Actions Logic ---

    // --- Critical Interaction Logic ---

    handleStickerPressStart(e, url) {
        return window.WeChat.Services.UI.handleStickerPressStart(e, url);
    },

    handleStickerPressEnd(e, url) {
        return window.WeChat.Services.UI.handleStickerPressEnd(e, url);
    },

    handleStickerClick(url) {
        return window.WeChat.Services.UI.handleStickerClick(url);
    },

    sendSticker(url) {
        return window.WeChat.Services.UI.sendSticker(url);
    },

    // --- State Management ---

    // 桥接调用：转发给 Media 服务
    handleTransferClick(msgId) {
        return window.WeChat.Services.Media.handleTransferClick(msgId);
    },

    enterSelectionMode(initialUrl) {
        return window.WeChat.Services.UI.enterSelectionMode(initialUrl);
    },

    exitSelectionMode() {
        return window.WeChat.Services.UI.exitSelectionMode();
    },

    // --- Message Long Press Logic ---
    _msgPressTimer: null,
    _isMsgLongPressed: false,
    _msgPressStartY: 0,

    // --- Message Long Press Logic (Legacy Removed - See bottom of file) ---

    handleMsgMenuAction(action, msgId) {
        const overlay = document.getElementById('wx-msg-menu-overlay');
        if (overlay) overlay.remove();

        if (action === 'delete') {
            if (window.sysStore && window.sysStore.deleteMessage) {
                window.sysStore.deleteMessage(msgId);
                // Also Refresh
                // this.render(); // Full render is expensive
                // Smart delete from DOM
                const bubble = document.querySelector(`.wx - bubble[data - msg - id="${msgId}"]`);
                if (bubble) {
                    const row = bubble.closest('.wx-msg-row');
                    if (row) row.remove();
                }
            }
        } else if (action === 'copy') {
            const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);
            const msg = msgs.find(m => m.id === msgId);
            if (msg && msg.content && navigator.clipboard) {
                navigator.clipboard.writeText(msg.content);
                if (window.os) window.os.showToast('已复制');
            }
        } else if (action === 'recall') {
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                window.WeChat.Services.Chat.recallMessage(State.activeSessionId, msgId);
            }
        } else if (action === 'select') {
            this.enterMsgSelectionMode(msgId);
        } else {
            if (window.os) window.os.showToast('功能暂未开放');
        }
    },

    getSelectionState() {
        return window.WeChat.Services.UI.getSelectionState();
    },

    enterMsgSelectionMode(initialMsgId) {
        return window.WeChat.Services.UI.enterMsgSelectionMode(initialMsgId);
    },

    exitMsgSelectionMode() {
        return window.WeChat.Services.UI.exitMsgSelectionMode();
    },

    toggleMsgSelection(msgId) {
        return window.WeChat.Services.UI.toggleMsgSelection(msgId);
    },

    renderMsgSelectionFooter() {
        return window.WeChat.Services.UI.renderMsgSelectionFooter();
    },

    deleteSelectedMsgs() {
        return window.WeChat.Services.UI.deleteSelectedMsgs();
    },

    toggleStickerSelection(url) {
        return window.WeChat.Services.UI.toggleStickerSelection(url);
    },

    getSelectionStateStickers() {
        return window.WeChat.Services.UI.getSelectionStateStickers();
    },

    deleteSelectedStickers() {
        return window.WeChat.Services.UI.deleteSelectedStickers();
    },

    // --- Helpers ---
    confirmUrlUploadLarge() {
        return window.WeChat.Services.UI.confirmUrlUploadLarge();
    },

    exportStickerBackupToTextarea() {
        return window.WeChat.Services.UI.exportStickerBackupToTextarea();
    },

    importStickerBackupFromTextarea() {
        return window.WeChat.Services.UI.importStickerBackupFromTextarea();
    },

    resetDefaultStickers() {
        return window.WeChat.Services.UI.resetDefaultStickers();
    },

    insertEmoji(emoji) {
        return window.WeChat.Services.UI.insertEmoji(emoji);
    },

    renderStickerGrid() {
        return window.WeChat.Services.UI.renderStickerGrid();
    },

    toggleUrlBar(show) {
        return window.WeChat.Services.UI.toggleUrlBar(show);
    },

    confirmUrlUpload() {
        return window.WeChat.Services.UI.confirmUrlUpload();
    },

    promptStickerUpload() {
        return window.WeChat.Services.UI.promptStickerUpload();
    },

    handleStickerFileSelect(input) {
        return window.WeChat.Services.UI.handleStickerFileSelect(input);
    },

    setChatBackground(sessionId) {
        return window.WeChat.Services.ChatConfig.setChatBackground(sessionId);
    },

    removeChatBackground(sessionId) {
        return window.WeChat.Services.ChatConfig.removeChatBackground(sessionId);
    },

    setContextMemoryLimit(sessionId) {
        return window.WeChat.Services.ChatConfig.setContextMemoryLimit(sessionId);
    },

    toggleBlacklist(userId, isBlacklisted) {
        return window.WeChat.Services.ChatConfig.toggleBlacklist(userId, isBlacklisted);
    },

    toggleIndependentBgActivity(sessionId, isEnabled) {
        return window.WeChat.Services.ChatConfig.toggleIndependentBgActivity(sessionId, isEnabled);
    },

    setIndependentBgThreshold(sessionId, value) {
        return window.WeChat.Services.ChatConfig.setIndependentBgThreshold(sessionId, value);
    },

    deleteFriend(userId) {
        return window.WeChat.Services.Relationships.deleteFriend(userId);
    },

    performDeleteFriend(userId) {
        return window.WeChat.Services.Relationships.performDeleteFriend(userId);
    },

    setTypingState(isTyping) {
        if (State.isTyping !== isTyping) {
            State.isTyping = isTyping;

            // 1. Update Title
            const titleEl = document.getElementById('wx-nav-title');
            if (titleEl) {
                // If in chat session, always update. If elsewhere, check tab.
                const isChat = State.currentTab === 'chat_session';
                if (isChat || titleEl.textContent.includes('输入') || titleEl.textContent === State.chatTitle) {
                    titleEl.textContent = isTyping ? '对方正在输入...' : (State.chatTitle || '微信');
                }
            }

            // 2. Update Reply Button in Main Chat (Immediate Feedback)
            const smartReplyBtn = document.getElementById('wx-smart-reply-btn');
            if (smartReplyBtn) {
                if (isTyping) {
                    smartReplyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" class="wx-spin" style="animation: wx-spin 1s linear infinite;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.2"></circle>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
                        </svg>
                    `;
                    smartReplyBtn.style.opacity = '0.5';
                    smartReplyBtn.style.pointerEvents = 'none';
                } else {
                    smartReplyBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="12" cy="12" r="9"/>
                            <path d="M12 7.5v9M8.5 10v4M15.5 10v4" stroke-linecap="round"/>
                        </svg>
                    `;
                    smartReplyBtn.style.opacity = '1';
                    smartReplyBtn.style.pointerEvents = 'auto';
                }
            }

            // 3. Update Voice Call Reply Button (If open)
            const vcallGroup = document.getElementById('wx-vcall-reply-btn-group');
            if (vcallGroup) {
                const btn = vcallGroup.querySelector('.wx-call-btn');
                const label = vcallGroup.querySelector('.wx-call-btn-label');
                if (isTyping) {
                    if (btn) btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" class="wx-spin" style="animation: wx-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="white" stroke-opacity="0.2"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path></svg>`;
                    if (label) label.textContent = '回复中';
                    vcallGroup.style.opacity = '0.8';
                    vcallGroup.style.pointerEvents = 'none';
                } else {
                    if (btn) btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
                    if (label) label.textContent = '回复';
                    vcallGroup.style.opacity = '1';
                    vcallGroup.style.pointerEvents = 'auto';
                }
            }
        }
    },

    switchTab(index) { if (State.currentTab !== index) { State.currentTab = index; this.render(); } },
    openChat(id) {
        State.activeSessionId = id;
        if (window.sysStore && window.sysStore.set) window.sysStore.set('wx_lastSession', id); // Persist State

        const char = window.sysStore.getCharacter(id);
        const map = { 'file_helper': '文件传输助手', 'chara_assistant': 'Chara 小助手', 'pay': '微信支付' };
        State.chatTitle = char?.name || map[id] || id;
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

    // 桥接调用：转发给 Memories 服务
    openMemoryManagement(sessionId) {
        return window.WeChat.Services.Memories.openMemoryManagement(sessionId);
    },
    addMemory(sessionId) {
        return window.WeChat.Services.Memories.addMemory(sessionId);
    },
    editMemory(sessionId, index) {
        return window.WeChat.Services.Memories.editMemory(sessionId, index);
    },
    saveMemory() {
        return window.WeChat.Services.Memories.saveMemory();
    },
    deleteMemory(sessionId, index) {
        return window.WeChat.Services.Memories.deleteMemory(sessionId, index);
    },
    performDeleteMemory(sessionId, index) {
        return window.WeChat.Services.Memories.performDeleteMemory(sessionId, index);
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
                    if (State.avatarTargetId === 'new_friend') {
                        State.newFriendAvatar = result;
                        const img = document.getElementById('wx-add-friend-avatar');
                        if (img) img.src = result;
                        State.avatarTargetId = null;
                        return; // Avoid full rerender to preserve other input values
                    }
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
        return window.WeChat.Services.Summaries.openSummaryManagement();
    },

    openSummaryRange() {
        return window.WeChat.Services.Summaries.openSummaryRange();
    },

    openRefineModal() {
        return window.WeChat.Services.Summaries.openRefineModal();
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
        return window.WeChat.Services.Summaries.handleRefineAll();
    },

    handleRefineCustom() {
        return window.WeChat.Services.Summaries.handleRefineCustom();
    },

    async startSummarize() {
        return window.WeChat.Services.Summaries.startSummarize();
    },

    toggleSummaryAuto() {
        return window.WeChat.Services.Summaries.toggleSummaryAuto();
    },

    updateSummaryConfig(key, value) {
        return window.WeChat.Services.Summaries.updateSummaryConfig(key, value);
    },

    saveSummarySettings() {
        return window.WeChat.Services.Summaries.saveSummarySettings();
    },


    // --- Photo & Camera Features ---

    // 桥接调用：转发给 Media 服务
    triggerPhotoUpload() {
        return window.WeChat.Services.Media.triggerPhotoUpload();
    },
    handlePhotoFileSelect(input) {
        return window.WeChat.Services.Media.handlePhotoFileSelect(input);
    },

    // 桥接调用：转发给 Media 服务
    triggerCamera() {
        return window.WeChat.Services.Media.triggerCamera();
    },
    async initCamera() {
        return window.WeChat.Services.Media.initCamera();
    },

    // 桥接调用：转发给 Media 服务
    _handleCameraError(errorName) {
        return window.WeChat.Services.Media._handleCameraError(errorName);
    },
    switchCamera() {
        return window.WeChat.Services.Media.switchCamera();
    },
    capturePhoto() {
        return window.WeChat.Services.Media.capturePhoto();
    },
    _stopCameraStream() {
        return window.WeChat.Services.Media._stopCameraStream();
    },
    closeCameraModal() {
        return window.WeChat.Services.Media.closeCameraModal();
    },
    triggerLocation() {
        return window.WeChat.Services.Media.triggerLocation();
    },
    closeLocationModal() {
        return window.WeChat.Services.Media.closeLocationModal();
    },
    sendLocation() {
        return window.WeChat.Services.Media.sendLocation();
    },

    triggerVoiceInput() {
        this.toggleExtraPanel();
        this.openPromptModal({
            title: '发送语音',
            placeholder: '请输入你想要的内容：',
            onConfirm: (val) => {
                if (val && val.trim()) {
                    window.WeChat.Services.Chat.sendMessage(val, 'voice');
                }
            }
        });
    },

    // --- Transfer Feature --- //
    triggerTransfer() {
        this.toggleExtraPanel();
        State.transferModalOpen = true;
        this.render();
    },

    // 桥接调用：转发给 Media 服务
    closeTransferModal() {
        return window.WeChat.Services.Media.closeTransferModal();
    },
    sendTransfer() {
        return window.WeChat.Services.Media.sendTransfer();
    },

    // --- Voice & Video落地相关 ---
    playVoice(msgId) {
        if (window.os) window.os.showToast('正在播放语音...');
        // Mock visual feedback: Find the bubble and add a playing class
        const el = document.querySelector(`[data - msg - id= "${msgId}"]`);
        if (el) {
            el.classList.add('playing');
            setTimeout(() => el.classList.remove('playing'), 2000);
        }
    },

    // [Legacy] Keep these methods for backward compatibility with modals.js
    openVideoCallModal(sessionId) {
        State.videoCallModalOpen = true;
        State.activeCallSessionId = sessionId;
        this.render();
    },

    closeVideoCallModal() {
        State.videoCallModalOpen = false;
        this.render();
    },

    acceptVideoCall() {
        if (window.os) window.os.showToast('连接中...');
        setTimeout(() => {
            const btn = document.getElementById('wx-vc-accept');
            if (btn) btn.innerText = '已连接';
        }, 1500);
    },

    openPromptModal({ title, content, value, placeholder, onConfirm, onCancel }) {
        State.promptModal = {
            open: true,
            title,
            content,
            value: value || '',
            placeholder: placeholder || '',
            onConfirm,
            onCancel
        };
        this.render();
    },

    closePromptModal() {
        State.promptModal = { open: false };
        this.render();
    },

    confirmPromptModal() {
        const val = document.getElementById('wx-prompt-input')?.value;
        const callback = State.promptModal.onConfirm;
        this.closePromptModal();
        if (typeof callback === 'function') {
            callback(val);
        } else if (typeof callback === 'string' && callback) {
            // Evaluated if string (legacy support)
            try { eval(callback.replace('VALUE_PLACEHOLDER', val)); } catch (e) { console.error(e); }
        }
    },

    renderModals() {
        // 桥接调用：转发给 Modals UI 服务
        return window.WeChat.UI && window.WeChat.UI.Modals ? window.WeChat.UI.Modals.render(State) : '';
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
            if (view) view.scrollTop = view.scrollHeight;
        }, 100);
    },

    /**
     * v44: 改写打开逻辑
     * 如果有 observerId，则作为浮层弹出（不切Tab）
     * 如果没有，则切换到关系网 Tab（上帝模式）
     */
    openRelationshipGraph(observerId) {
        console.log('[WeChat] openRelationshipGraph called:', observerId);
        if (observerId) {
            // v54: 视角模式 - 使用独立组件
            if (window.WeChat.UI && window.WeChat.UI.RelationshipGraphSubjective) {
                window.WeChat.UI.RelationshipGraphSubjective.open(observerId);
            }
        } else {
            // v54: 上帝模式 - 使用独立组件
            State.prevTab = State.currentTab;
            State.currentTab = 'relationship_graph';
            this.render(); // 渲染基础页面结构

            if (window.WeChat.UI && window.WeChat.UI.RelationshipGraphGod) {
                window.WeChat.UI.RelationshipGraphGod.init();
            }
        }
    },

    openCharacterPanel(sessionId) {
        if (sessionId) State.activeSessionId = sessionId;
        State.relationshipPanelOpen = false;
        State.statusHistoryPanelOpen = false;
        State.characterPanelOpen = true;
        this.render();
    },

    closeCharacterPanel() {
        State.characterPanelOpen = false;
        State.relationshipPanelOpen = false;
        State.statusHistoryPanelOpen = false;
        this.render();
    },

    openRelationshipPanel() {
        const char = window.sysStore.getCharacter(State.activeSessionId) || {};
        const status = char.status || {};
        const settings = char.settings || {};

        // [Sync Logic] Try to fetch dynamic data from Relationship Graph first
        let graphRel = null;
        if (window.WeChat.Services && window.WeChat.Services.RelationshipGraph) {
            graphRel = window.WeChat.Services.RelationshipGraph.getRelationship(State.activeSessionId, 'USER_SELF');
            if (graphRel) console.log('[Settings] Loaded relationship from Graph:', graphRel);
        }

        // Merge: Graph Data > Settings Data
        // If graphRel exists, map its V2 fields to the settings structure expected below
        const relSettings = graphRel ? {
            // Mapped from RelationshipGraph Structure
            public_relation: graphRel.a_to_b_public_relation, // Npc -> User relation

            char_to_user_public_attitude: graphRel.a_to_b_public_attitude,
            char_to_user_private_attitude: graphRel.a_to_b_private_attitude,
            user_knows_char_private: graphRel.b_knows_a_private,

            user_to_char_public_attitude: graphRel.b_to_a_public_attitude,
            user_to_char_private_attitude: graphRel.b_to_a_private_attitude,
            char_knows_user_private: graphRel.a_knows_b_private,

            backstory: graphRel.backstory
        } : (settings.relationship || {});

        // [Migration Logic] Handle transition from single-field+toggle to dual-field
        // Preserve legacy values if new ones don't exist
        const oldCharView = relSettings.char_to_user_view || status.relationship_they_to_me?.opinion || '';
        // const oldCharSecret = relSettings.char_view_is_secret || false;
        const oldUserView = relSettings.user_to_char_view || status.relationship_me_to_they?.opinion || '';
        // const oldUserSecret = relSettings.user_view_is_secret || false;

        State.pendingRelationship = {
            // Dynamic Stats
            affection: parseFloat(status.affection || 0),
            difficulty: status.relationship_difficulty || 'normal',
            // [Fix] Deep copy array of objects to prevent reference pollution on cancel
            ladder_persona: (status.ladder_persona || []).map(p => ({ ...p })),

            // 1. Social Contract
            public_relation: relSettings.public_relation || status.relationship_they_to_me?.relation || '',

            // 2. Character's Lens (NPC -> User)
            char_to_user_public_attitude: relSettings.char_to_user_public_attitude || relSettings.char_to_user_public || oldCharView,
            char_to_user_private_attitude: relSettings.char_to_user_private_attitude || relSettings.char_to_user_secret || '',
            user_knows_char_private: relSettings.user_knows_char_private === true,

            // 3. User's Lens (User -> NPC)
            user_to_char_public_attitude: relSettings.user_to_char_public_attitude || relSettings.user_to_char_public || oldUserView,
            user_to_char_private_attitude: relSettings.user_to_char_private_attitude || relSettings.user_to_char_secret || '',
            char_knows_user_private: relSettings.char_knows_user_private === true,

            // 4. Backstory
            backstory: relSettings.backstory || ''
        };

        State.characterPanelOpen = false;
        State.statusHistoryPanelOpen = false; // Ensure history is closed
        State.relationshipPanelOpen = true;
        this.render();
    },
    clearRelationshipSettings() {
        if (!State.pendingRelationship) return;

        // Reset to defaults
        State.pendingRelationship = {
            affection: 0.0,
            difficulty: 'normal',
            ladder_persona: [],
            public_relation: '',
            char_to_user_public_attitude: '',
            char_to_user_private_attitude: '',
            user_knows_char_private: false,
            user_to_char_public_attitude: '',
            user_to_char_private_attitude: '',
            char_knows_user_private: false,
            backstory: ''
        };

        if (window.os) window.os.showToast('设定已清空，请保存生效');
        this.render();
    },

    setKeepRelationshipOnClear(sessionId, enabled) {
        if (!window.sysStore) return;
        const char = window.sysStore.getCharacter(sessionId);
        const settings = char?.settings || {};
        window.sysStore.updateCharacter(sessionId, {
            settings: { ...settings, keep_relationship_on_clear: enabled }
        });
        this.render();
    },

    clearChatHistory(sessionId) {
        this.openConfirmationModal({
            title: '清空聊天记录',
            content: '确定要清空与该角色的所有聊天记录吗？此操作无法撤销。',
            onConfirm: `window.WeChat.App.performClearChatHistory('${sessionId}')`
        });
    },

    performClearChatHistory(sessionId) {
        if (window.sysStore && window.sysStore.deleteMessagesBySession) {
            window.sysStore.deleteMessagesBySession(sessionId);

            // Check Keep Setting
            const char = window.sysStore.getCharacter(sessionId);
            const isKeep = char?.settings?.keep_relationship_on_clear !== false; // Default True

            if (!isKeep) {
                // [Exhaustive Reset] User demands EVERYTHING in relationship management to be cleared
                const defaultStatus = {
                    outfit: "日常便装",
                    behavior: "等待回复",
                    inner_voice: "...",
                    affection: 0.0,
                    relationship_difficulty: 'normal',
                    ladder_persona: []
                };

                const updatedSettings = { ...char.settings };
                // 1. Remove New Matrix Object
                delete updatedSettings.relationship;

                // 2. Clear memories for fresh start
                const updatedMemories = [];

                window.sysStore.updateCharacter(sessionId, {
                    status: defaultStatus,
                    status_history: [], // Clear thought history
                    settings: updatedSettings,
                    memories: updatedMemories,
                    // [Crucial] Specifically nullify/delete old legacy fields that might be used as fallbacks
                    relationship_they_to_me: null,
                    relationship_me_to_they: null
                });

                // Clear live pending state if UI is open or was cached
                if (State.activeSessionId === sessionId) {
                    State.pendingRelationship = null;
                }

                if (window.os) window.os.showToast('聊天记录与所有关系设定已清除');
            } else {
                if (window.os) window.os.showToast('聊天记录已清空');
            }

            // Sync with Chat Service if needed (to reset prompt cache etc)
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                window.WeChat.Services.Chat.openSession(sessionId);
            }

            this.render(); // Full re-render to update Token display etc.
            this.closeConfirmationModal();
        }
    },

    updatePendingRelationship(field, value, subfield = null, silent = false) {
        if (!State.pendingRelationship) return;

        // Type safety for affection to ensure it's a number
        if (field === 'affection') {
            value = parseFloat(value);
            if (isNaN(value)) value = 0;
        }

        if (subfield) {
            State.pendingRelationship[field][subfield] = value;
        } else {
            State.pendingRelationship[field] = value;
        }
        if (!silent) this.render();
    },

    togglePendingRelationshipBool(field) {
        if (!State.pendingRelationship) return;
        State.pendingRelationship[field] = !State.pendingRelationship[field];
        this.render();
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
    async generateFullRelationshipData() {
        // 桥接调用：转发给 Generators 服务
        return window.WeChat.Services.Generators.generateFullRelationshipData();
    },

    /**
     * [Enhanced] 保存关系变更，支持跨页面异步保存（显式传入 ID 和 Data）
     */
    async saveRelationshipChanges(silent = false, sessionIdOverride = null, relOverride = null) {
        const sessionId = sessionIdOverride || State.activeSessionId;
        const rel = relOverride || State.pendingRelationship;

        if (!sessionId || !rel) return;

        const char = window.sysStore.getCharacter(sessionId);

        // 1. Update Status (Dynamic)
        const newStatus = {
            ...(char?.status || {}),
            affection: (rel.affection || 0).toFixed(1),
            relationship_difficulty: rel.difficulty,
            ladder_persona: rel.ladder_persona,
            // Clear legacy fields to avoid confusion
            relationship_they_to_me: null,
            relationship_me_to_they: null
        };

        // 2. Update Settings (Static Configuration)
        const newSettings = {
            ...(char?.settings || {}),
            relationship: {
                ...(char?.settings?.relationship || {}),
                public_relation: rel.public_relation,

                // Save the Dual Layers with Correct Keys
                char_to_user_public_attitude: rel.char_to_user_public_attitude,
                char_to_user_view: rel.char_to_user_public_attitude, // Legacy Sync
                char_to_user_private_attitude: rel.char_to_user_private_attitude,
                user_knows_char_private: rel.user_knows_char_private,

                user_to_char_public_attitude: rel.user_to_char_public_attitude,
                user_to_char_view: rel.user_to_char_public_attitude, // Legacy Sync
                user_to_char_private_attitude: rel.user_to_char_private_attitude,
                char_knows_user_private: rel.char_knows_user_private,

                backstory: rel.backstory,

                // Clear outdated/ambiguous fields if they exist
                char_to_user_public: null,
                char_to_user_secret: null,
                char_view_is_secret: null,
                user_view_is_secret: null
            }
        };

        const updates = {
            status: newStatus,
            settings: newSettings
        };

        // Record to history if changed since last entry
        // We track status history mainly for affection/mood changes
        // (Relationship definitions are static settings, usually not tracked in status flow history)
        let history = char?.status_history || [];
        const latest = history[0];

        // [Optimization] Check for meaningful status change
        // We only care if affection or difficulty changed in the history log
        const aff = parseFloat(newStatus.affection || 0);
        const lastAff = parseFloat(latest?.status?.affection || 0);

        const isDiff = (aff !== lastAff);

        if (isDiff) {
            history.unshift({
                timestamp: Date.now(),
                status: JSON.parse(JSON.stringify(newStatus))
            });
            updates.status_history = history.slice(0, 5);
        }
        window.sysStore.updateCharacter(sessionId, updates);

        // [Sync Logic] Update Relationship Graph
        if (window.WeChat.Services && window.WeChat.Services.RelationshipGraph) {
            const graphPayload = {
                nodeA: sessionId,
                nodeB: 'USER_SELF',
                a_to_b_public_relation: rel.public_relation,
                a_to_b_public_attitude: rel.char_to_user_public_attitude,
                a_to_b_private_attitude: rel.char_to_user_private_attitude,
                b_knows_a_private: rel.user_knows_char_private,
                b_to_a_public_relation: rel.user_to_char_public_relation || rel.public_relation,
                b_to_a_public_attitude: rel.user_to_char_public_attitude,
                b_to_a_private_attitude: rel.user_to_char_private_attitude,
                a_knows_b_private: rel.char_knows_user_private,
                backstory: rel.backstory,
                visibleTo: ['all']
            };
            window.WeChat.Services.RelationshipGraph.saveRelationship(graphPayload);
            console.log('[Settings] Synced to Graph:', graphPayload);
        }

        if (!silent) {
            State.pendingRelationship = null;
            State.relationshipPanelOpen = false;
            State.characterPanelOpen = true; // Return to character panel
            this.render();
        }

        if (window.os) window.os.showToast('关系设定已保存');
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

    closeApp() { if (window.os) window.os.closeActiveApp(); },

    // --- Message Context Menu Handlers ---
    // --- Message Context Menu Handlers (Fixed & Consolidated) ---
    // --- Message Operations (Bridge to Messages Service) ---
    handleMsgPressStart(e, msgId) {
        return window.WeChat.Services.Messages.handleMsgPressStart(e, msgId);
    },

    handleMsgContextMenu(e, msgId) {
        return window.WeChat.Services.Messages.handleMsgContextMenu(e, msgId);
    },

    handleMsgPressEnd() {
        return window.WeChat.Services.Messages.handleMsgPressEnd();
    },

    showMsgMenu(msgId, x, y) {
        return window.WeChat.Services.Messages.showMsgMenu(msgId, x, y);
    },

    closeMsgMenu() {
        return window.WeChat.Services.Messages.closeMsgMenu();
    },

    deleteMsg(msgId) {
        return window.WeChat.Services.Messages.deleteMsg(msgId);
    },

    copyMsg(msgId) {
        return window.WeChat.Services.Messages.copyMsg(msgId);
    },

    recallMsg(msgId) {
        return window.WeChat.Services.Messages.recallMsg(msgId);
    },

    regenerateMsg(msgId) {
        return window.WeChat.Services.Messages.regenerateMsg(msgId);
    },

    quoteMsg(msgId) {
        return window.WeChat.Services.Messages.quoteMsg(msgId);
    },

    multiSelectMsg() {
        return window.WeChat.Services.Messages.multiSelectMsg();
    },

    exitMsgSelectionMode() {
        return window.WeChat.Services.Messages.exitMsgSelectionMode();
    },

    toggleMsgSelection(msgId) {
        return window.WeChat.Services.Messages.toggleMsgSelection(msgId);
    },

    deleteSelectedMessages() {
        return window.WeChat.Services.Messages.deleteSelectedMessages();
    },

    renderMsgSelectionFooter() {
        return window.WeChat.Services.Messages.renderMsgSelectionFooter();
    },

    handleModalConfirm() {
        const callback = State.confirmationModal.onConfirm;
        this.closeConfirmationModal();
        if (typeof callback === 'function') callback();
    },

    handleModalCancel() {
        const callback = State.confirmationModal.onCancel;
        this.closeConfirmationModal();
        if (typeof callback === 'function') callback();
    },

    saveVoiceVideoSettings(sessionId, settings) {
        if (!window.sysStore) return;
        const char = window.sysStore.getCharacter(sessionId);
        if (!char) return;

        // 1. Prepare Voice Settings Group
        const voiceSettings = {
            voiceId: settings.voiceId || '',
            languageBoost: settings.languageBoost || 'none',
            speechRate: parseFloat(settings.speechRate || 0.9),
            pitch: 0,
            voiceAccessEnabled: !!settings.voiceAccessEnabled
        };

        // 2. Prepare Video Settings Group
        const videoSettings = {
            visualCallEnabled: !!settings.visualCallEnabled,
            useRealCamera: !!settings.useRealCamera,
            peerCallImage: settings.peerCallImage || '',
            myCallImage: settings.myCallImage || ''
        };

        // 3. Update Character
        const updatedChar = {
            ...char,
            voice_settings: voiceSettings,
            video_settings: videoSettings
        };

        window.sysStore.updateCharacter(sessionId, updatedChar);
        if (window.os) window.os.showToast('语音与视频设置已保存', 'success');

        this.goBack();
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

        // [Auto-Save Feature] Save current settings silently when backing out
        if (current === 'persona_settings' && State.activeUserId) {
            this.savePersonaSettings(State.activeUserId, this._collectPersonaData('wx-edit-'), true);
        } else if (current === 'my_profile_settings') {
            this.saveMyProfileSettings(this._collectPersonaData('wx-my-'), true);
        } else if (current === 'add_friend') {
            // Clear new friend draft avatar on back
            State.newFriendAvatar = null;
        }

        if (State.navStack && State.navStack.length > 0) {
            const last = State.navStack.pop();
            State.currentTab = last.tab;
            if (last.sessionId) State.activeSessionId = last.sessionId;

            // [Fix] Force scroll when returning to chat session from stack
            if (State.currentTab === 'chat_session') {
                State.shouldScrollToBottom = true;
            }
        } else {
            // Fallback Legacy Logic
            if (current === 'world_book_selection') {
                State.currentTab = 'chat_info';
            } else if (current === 'chat_info' || current === 'memory_management') {
                State.currentTab = 'chat_session';
                State.shouldScrollToBottom = true; // [Fix] Force scroll
            } else if (current === 'chat_session') {
                State.currentTab = 0; // Back to list
                State.activeSessionId = null;
            } else if (current === 'friend_settings' || current === 'persona_settings') {
                State.currentTab = 'user_profile';
            } else if (current === 'user_profile') {
                // Return to appropriate tab
                State.currentTab = (prev === 'chat_session' || prev === 0 || prev === 1) ? prev : 1;
                if (State.currentTab === 'chat_session') State.shouldScrollToBottom = true;
            } else if (current === 'add_friend' || current === 'my_profile_settings') {
                State.currentTab = (typeof prev === 'number') ? prev : 0;
            } else {
                State.currentTab = 0;
            }
        }

        this.closeAllPanels();
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

        // 1. Get Message
        const msg = window.sysStore.getMessageById(msgId); // This returns a reference in simple stores, but let's be safe

        if (msg) {
            // 1. Update Message Status
            msg.transfer_status = 'received';

            // [Persistence Fix] Update the underlying content JSON
            // Because localStorage/SysStore might only save 'content' string and lose custom properties on reload
            try {
                let payload = JSON.parse(msg.content);
                payload.status = 'received';
                msg.content = JSON.stringify(payload);
            } catch (e) {
                console.warn('Failed to update transfer content JSON', e);
            }

            // 2. Persist - EXPLICITLY
            if (window.sysStore.updateMessage) {
                window.sysStore.updateMessage(msg.id, msg);
            } else {
                // Fallback update
                const all = window.sysStore.getAllMessages();
                window.sysStore.set('chara_db_messages', all);
            }

            // Hard Fallback: Force write to localStorage manually if sysStore is weak
            try {
                const allMsgs = window.sysStore.getAllMessages();
                // Ensure the item in the array is updated (if getAllMessages returned a copy)
                const idx = allMsgs.findIndex(m => String(m.id) === String(msg.id));
                if (idx !== -1) {
                    allMsgs[idx].transfer_status = 'received';
                    allMsgs[idx].content = msg.content; // Also sync content
                    if (window.sysStore.saveMessages) {
                        window.sysStore.saveMessages(allMsgs);
                    } else {
                        window.sysStore.set('chara_db_messages', allMsgs);
                    }
                }
            } catch (e) { console.error("Persistence failed", e); }

            // 3. Add User-side Message (显示在用户侧)
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const charId = msg.sender_id; // 转账发送者的ID（角色ID）

            // 使用 persistAndShow 添加用户侧的消息气泡
            if (window.WeChat.Services && window.WeChat.Services.Chat && window.WeChat.Services.Chat.persistAndShow) {
                window.WeChat.Services.Chat.persistAndShow(charId, JSON.stringify({
                    status: 'received',
                    text: `已收款 ¥${amount}`,
                    amount: amount
                }), 'transfer_status', {
                    sender_id: 'user',  // 用户侧显示
                    receiver_id: charId
                });
            } else {
                // Fallback: 直接添加消息
                const userMsg = {
                    sender_id: 'user',
                    receiver_id: charId,
                    content: JSON.stringify({ status: 'received', text: `已收款 ¥${amount}`, amount: amount }),
                    type: 'transfer_status'
                };
                window.sysStore.addMessage(userMsg);
            }
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render
        this.render();

        if (window.os) window.os.showToast('收款成功');
    },

    rejectTransfer() {
        if (!State.activeTransferMsgId) return;
        const msgId = State.activeTransferMsgId;

        // 1. Get Message
        const msg = window.sysStore.getMessageById(msgId);

        if (msg) {
            // 1. Update Message Status
            msg.transfer_status = 'refunded';

            // [Persistence Fix] Update the underlying content JSON
            try {
                let payload = JSON.parse(msg.content);
                payload.status = 'refunded';
                msg.content = JSON.stringify(payload);
            } catch (e) {
                console.warn('Failed to update transfer content JSON', e);
            }

            // 2. Persist - EXPLICITLY
            if (window.sysStore.updateMessage) {
                window.sysStore.updateMessage(msg.id, msg);
            } else {
                // Fallback update
                const all = window.sysStore.getAllMessages();
                window.sysStore.set('chara_db_messages', all);
            }

            // Hard Fallback: Force write to localStorage manually if sysStore is weak
            try {
                const allMsgs = window.sysStore.getAllMessages();
                const idx = allMsgs.findIndex(m => String(m.id) === String(msg.id));
                if (idx !== -1) {
                    allMsgs[idx].transfer_status = 'refunded';
                    allMsgs[idx].content = msg.content;
                    if (window.sysStore.saveMessages) {
                        window.sysStore.saveMessages(allMsgs);
                    } else {
                        window.sysStore.set('chara_db_messages', allMsgs);
                    }
                }
            } catch (e) { console.error("Persistence failed", e); }

            // 3. Add User-side Message (显示在用户侧)
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const charId = msg.sender_id;
            const char = window.sysStore.getCharacter(charId);
            const charName = char ? (char.name || charId) : '对方';

            // Send system message to notify the character (hidden, for AI context)
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                window.WeChat.Services.Chat.persistAndShow(charId, `你拒绝了 ${charName} 的转账`, 'system', { hidden: true });
            }

            // Add user-side transfer_status message (显示在用户侧)
            if (window.WeChat.Services && window.WeChat.Services.Chat && window.WeChat.Services.Chat.persistAndShow) {
                window.WeChat.Services.Chat.persistAndShow(charId, JSON.stringify({
                    status: 'refunded',
                    text: `已拒绝 ¥${amount}`,
                    amount: amount
                }), 'transfer_status', {
                    sender_id: 'user',  // 用户侧显示
                    receiver_id: charId
                });
            } else {
                // Fallback: 直接添加消息
                const userMsg = {
                    sender_id: 'user',
                    receiver_id: charId,
                    content: JSON.stringify({ status: 'refunded', text: `已拒绝 ¥${amount}`, amount: amount }),
                    type: 'transfer_status'
                };
                window.sysStore.addMessage(userMsg);
            }
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render
        this.render();

        if (window.os) window.os.showToast('已拒绝');
    },


    // --- Voice Call Logic ---
    // --- Voice Call Logic (Bridge to Calls Service) ---
    triggerVoiceCall() {
        return window.WeChat.Services.Calls.triggerVoiceCall();
    },

    endVoiceCall() {
        return window.WeChat.Services.Calls.endVoiceCall();
    },

    triggerVoiceCallInput() {
        return window.WeChat.Services.Calls.triggerVoiceCallInput();
    },

    triggerVoiceCallReply() {
        return window.WeChat.Services.Calls.triggerVoiceCallReply();
    },

    async generateCallSummary(sessionId, duration) {
        return window.WeChat.Services.Calls.generateCallSummary(sessionId, duration);
    },

    openCallSummary(msgId) {
        return window.WeChat.Services.Calls.openCallSummary(msgId);
    },

    closeCallSummaryModal() {
        return window.WeChat.Services.Calls.closeCallSummaryModal();
    },

    minimizeVoiceCall() {
        return window.WeChat.Services.Calls.minimizeVoiceCall();
    },

    restoreVoiceCall() {
        return window.WeChat.Services.Calls.restoreVoiceCall();
    },

    // --- Video Call Logic (Bridge to Calls Service) ---
    triggerVideoCall() {
        return window.WeChat.Services.Calls.triggerVideoCall();
    },

    endVideoCall() {
        return window.WeChat.Services.Calls.endVideoCall();
    },

    triggerVideoCallInput() {
        return window.WeChat.Services.Calls.triggerVideoCallInput();
    },

    triggerVideoCallReply() {
        return window.WeChat.Services.Calls.triggerVideoCallReply();
    },

    minimizeVideoCall() {
        return window.WeChat.Services.Calls.minimizeVideoCall();
    },

    restoreVideoCall() {
        return window.WeChat.Services.Calls.restoreVideoCall();
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

