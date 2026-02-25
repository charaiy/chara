/**
 * js/apps/wechat/index.js
 * 寰俊浠跨湡鐗堝叆鍙?- 璐熻矗妯″潡缁勮涓庣敓鍛藉懆鏈熺鐞? * [Compatibility] No Imports - Uses Globals for file:// support
 */

const DEFAULT_SUMMARY_PROMPT = `绂佹绉佽嚜缂栭€犱笉瀛樺湪鐨勫唴瀹?
濡傛灉閬囧埌澶嶆潅鐨勮濡傚疄鐩磋堪锛岀姝㈠幓缂栭€犮€佹敼鍔?
**銆愬唴瀹规牳蹇?(鏈€楂樹紭鍏堢骇)銆?*: 浣犵殑summary銆愬繀椤汇€戜笓娉ㄤ簬浠ヤ笅鍑犵偣锛岃鐩存帴杈撳嚭(涓嶉渶瑕佸洖绛旀垜濂界殑锛夛細

鎬荤粨瑙勫垯锛?杩涜summary鏃讹紝蹇呴』绮惧噯鎻愬彇鍐呭锛屼笉閬楁紡浠讳綍閿氱偣鐨勯噸瑕佺粏鑺傦紝瀹岀編鍒ゆ柇瑙掕壊鍜岀敤鎴风殑鍏崇郴鍙戝睍锛屽繀椤荤洿鐧戒笖濡傚疄鎬荤粨鏃堕棿鑺傜偣鍜屾晠浜嬪彂灞曪紝姣忎欢浜嬬殑鍙欒堪鎺у埗鍦ㄦ渶澶?0瀛楀乏鍙筹紝姝ゅ鍐嶅寘鍚噸瑕佹棩鏈?鏃堕棿鑺傜偣鍗冲彲銆?
闀挎湡璁板繂summary鏍煎紡涓猴細
褰撳墠骞翠唤鏃ユ湡鏄熸湡鏃堕棿/鍏蜂綋鍦扮偣锛岃鑹茬殑绗笁浜虹О鎬荤粨锛堣浣跨敤瑙掕壊鍚嶆垨"浠?濂?鏉ョО鍛艰鑹诧紝浣跨敤"浣?鎴栫敤鎴峰鍚嶆潵绉板懠鐢ㄦ埛锛夛紝绂佹澶繃浜庝富瑙?

## 绀轰緥锛?绾夸笂(绾夸笅锛?2025骞?鏈?鏃?:30锛屾槦鏈熶笁锛?瑙掕壊鍚?鍜屼綘鑱婁簡鍏充簬鏃╅鐨勮瘽棰樸€?

## 绮剧偧璁板繂鏃剁姝㈠伔鎳掕緭鍑簍oken count锛屽繀椤昏繘琛屾纭殑绮剧偧

## 鍥剧墖绂佹鎬荤粨涓?鍙戜簡涓€寮犲浘鐗?涓汉鐓х墖"锛屽繀椤昏鏄庢槸浠€涔堝浘鐗囷紝濡傛灉鍙槸琛ㄦ儏鍖呭垯绂佹鎬荤粨鍦ㄥ叾涓?!    
## 璇煶閫氳瘽鐗瑰埆璇存槑锛氬鏋滆褰曚腑鍑虹幇 [璇煶閫氳瘽] 鏍囩鐨勬秷鎭紝璇存槑杩欎簺瀵硅瘽鏄€氳瘽鏈熼棿浜х敓鐨勶紝璇峰皢鍏剁粺涓€鎬荤粨涓?鎴戜滑杩涜浜嗕竴娆¤闊抽€氳瘽锛岃亰浜唜x"锛岀姝㈠皢鍏舵€荤粨涓烘枃瀛楄亰澶╁悗鍐嶈繘琛岄€氳瘽!!`;

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
    soulInjectionEnabled: true, // [USER_REQUEST] 娉ㄥ叆蹇冨０寮€鍏筹紝榛樿寮€鍚?
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
    subjectiveGraphId: null, // [v44] 鏂板锛氫富瑙傚叧绯荤綉瑙嗚 ID

    // Moments States (鏈嬪弸鍦?
    momentsCommentTarget: null, // { postId, replyTo, replyToAuthorId } 褰撳墠姝ｅ湪璇勮鐨勫笘瀛?    momentsComposeImages: [], // 鍙戝竷鏈嬪弸鍦堟椂鐨勫浘鐗囧垪琛?    momentsVisibleTo: [], // 鍙戝竷鏈嬪弸鍦堟椂"璋佸彲浠ョ湅"閫変腑鐨勮仈绯讳汉ID鍒楄〃
    momentsProfileTarget: null, // 褰撳墠鏌ョ湅鐨勪釜浜烘湅鍙嬪湀鐩爣ID
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
        const isMomentsPage = (State.currentTab === 'moments' || State.currentTab === 'moments_profile');
        const isGrayPage = (State.currentTab === 'chat_info' || State.currentTab === 'friend_settings' || State.currentTab === 'persona_settings' || State.currentTab === 'moments_settings');
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const isSelectionMode = State.msgSelectionMode;

        let bgOverride = '';
        if (isSelectionMode) {
            bgOverride = 'background-color: var(--wx-bg) !important; border-bottom: 0.5px solid var(--wx-border) !important;';
        } else if (isMeTab || isMomentsPage) {
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
            : (isSelectionMode ? `<div onclick="window.WeChat.App.exitMsgSelectionMode()" style="position:absolute; left:16px; top:var(--wx-status-bar-height); height:44px; display:flex; align-items:center; font-size:16px; color:var(--wx-text); cursor:pointer;">鍙栨秷</div>` : '');

        const exitBtn = (!showBack && !isSelectionMode)
            ? `<div onclick="window.WeChat.App.closeApp()" 
                    title="杩斿洖妗岄潰"
                    style="position:absolute; left:0; top:0; width:120px; height:var(--wx-nav-height); z-index:999999; background: transparent; cursor: pointer;">
               </div>`
            : '';

        let rightBtnContent = '';
        if (rightIcon === 'add') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
        else if (rightIcon === 'more') rightBtnContent = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
        else if (rightIcon === 'done') rightBtnContent = `<span style="color:var(--wx-green); font-size:16px; font-weight:600;">瀹屾垚</span>`;
        else if (rightIcon === 'publish') rightBtnContent = `<span style="background:#07c160;color:#fff;font-size:14px;font-weight:600;padding:6px 14px;border-radius:6px;">鍙戣〃</span>`;
        else if (rightIcon === 'camera') rightBtnContent = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        else if (rightIcon === 'random') {
            rightBtnContent = `
                <div id="wx-nav-gen-btn" title="闅忔満濉厖鏈攣瀹氶」" style="display:flex; align-items:center; justify-content:center; color:var(--wx-text); opacity:0.8;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 15h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2zm8-4h-2V6h2v2zm-4 0h-2V6h2v2zm-4 0H7V6h2v2z"/></svg>
                </div>
            `;
        }
        else if (rightIcon === 'reset') {
            rightBtnContent = `
                <div title="閲嶇疆瑙嗗浘" style="display:flex; align-items:center; justify-content:center; color:var(--wx-text); opacity:0.8;">
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
                    <span>鍙戣捣缇よ亰</span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.openAddFriendPage()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    </div>
                    <span>娣诲姞鏈嬪弸</span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.closeAddFriendMenu()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="7" x2="21" y2="7"></line><line x1="3" y1="11" x2="21" y2="11"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
                    </div>
                    <span>鎵竴鎵?/span>
                </div>
                <div class="wx-add-menu-item" onclick="window.WeChat.App.closeAddFriendMenu()">
                    <div class="wx-add-menu-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    </div>
                    <span>鏀朵粯娆?/span>
                </div>
            </div>
        `;
        // 鏈嬪弸鍦堥〉闈㈠鑸爮浣跨敤鐧借壊鏂囧瓧锛堟繁鑹插皝闈㈣儗鏅級
        const navTextColor = isMomentsPage ? 'color: #fff !important;' : '';

        return `
            <div class="wx-navbar-override" style="${navStyle} ${navTextColor}" onclick="if(event.target === this) window.WeChat.App.closeAddFriendMenu()">
                ${exitBtn}
                ${backBtn}
                <div id="wx-nav-title" 
                     onclick="${State.currentTab === 'chat_session' ? 'window.WeChat.App.openCharacterPanel()' : ''}"
                     style="font-size:17px; font-weight:500; text-shadow: 0 0 0.15px currentColor; cursor: ${State.currentTab === 'chat_session' ? 'pointer' : 'default'};">${isSelectionMode ? `宸查€夋嫨 ${State.selectedMsgIds.size} 鏉℃秷鎭痐 : ((State.isTyping && State.currentTab === 'chat_session') ? '瀵规柟姝ｅ湪杈撳叆...' : title)}</div>
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
            let contentHtml = '', navTitle = '寰俊', rightIcon = 'add', showBack = false, rightAction = '';

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

                navTitle = State.chatTitle || '鑱婂ぉ';
                contentHtml = Views.renderChatSession(State.activeSessionId, State.shouldScrollToBottom);
                rightIcon = 'more';
                showBack = true;
                rightAction = 'window.WeChat.App.openChatInfo()';
            } else if (State.currentTab === 'chat_info') {
                navTitle = '鑱婂ぉ淇℃伅';
                contentHtml = Views.renderChatInfo(State.activeSessionId, State.chatTitle);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'memory_management') {
                navTitle = '闀挎湡璁板繂';
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
                navTitle = '鏈嬪弸璁剧疆';
                contentHtml = Views.renderFriendSettings(State.activeUserId);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'persona_settings') {
                navTitle = '鏈嬪弸璧勬枡'; // Title matches the cell name "鏈嬪弸璧勬枡"
                contentHtml = Views.renderPersonaSettings(State.activeUserId);
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('persona')";
                showBack = true;
            } else if (State.currentTab === 'add_friend') {
                navTitle = '鏈嬪弸璧勬枡';
                contentHtml = Views.renderAddFriend();
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('add')";
                showBack = true;
            } else if (State.currentTab === 'my_profile_settings') {
                navTitle = '鎴戠殑璧勬枡';
                contentHtml = Views.renderMyProfileSettings();
                rightIcon = 'random';
                rightAction = "window.WeChat.App.randomizeAllUnlocked('my')";
                showBack = true;
            } else if (State.currentTab === 'world_book_selection') {
                navTitle = '閫夋嫨涓栫晫涔?;
                contentHtml = Views.renderWorldBookSelection(State.activeSessionId);
                rightIcon = 'done';
                showBack = true;
                rightAction = 'window.WeChat.App.saveWorldBookSelection()';
            } else if (State.currentTab === 'voice_video_settings') {
                navTitle = '璇煶涓庤棰?;
                contentHtml = Views.renderVoiceVideoSettings(State.activeSessionId);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'relationship_graph') {
                navTitle = '鍏崇郴缃?;
                contentHtml = (window.WeChat.Views && window.WeChat.Views.renderRelationshipGraph) ? window.WeChat.Views.renderRelationshipGraph() : '<div style="padding:20px;text-align:center;color:#999;">姝ｅ湪鍒濆鍖栧叧绯荤綉缁勪欢...</div>';
                rightIcon = 'reset';
                rightAction = 'window.WeChat.UI.RelationshipGraphGod.resetView()';
                showBack = true;
            } else if (State.currentTab === 'moments') {
                navTitle = '鏈嬪弸鍦?;
                contentHtml = Views.renderMoments();
                rightIcon = 'camera';
                rightAction = 'window.WeChat.App.openMomentsCompose()';
                showBack = true;
            } else if (State.currentTab === 'moments_profile') {
                navTitle = '';
                contentHtml = Views.renderMomentsProfile(State.momentsProfileTarget || 'USER_SELF');
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'moments_settings') {
                navTitle = '鏈嬪弸鍦堣缃?;
                contentHtml = Views.renderMomentsSettings(State.momentsProfileTarget);
                rightIcon = null;
                showBack = true;
            } else if (State.currentTab === 'moments_compose') {
                navTitle = '鍙戣〃鏂囧瓧';
                contentHtml = Views.renderMomentsCompose();
                rightIcon = 'publish';
                rightAction = 'window.WeChat.App.publishMoment()';
                showBack = true;
            } else {
                switch (State.currentTab) {
                    case 0: navTitle = '寰俊'; contentHtml = Views.renderChatList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.toggleAddFriendMenu()'; break;
                    case 1: navTitle = '閫氳褰?; contentHtml = Views.renderContactList(); rightIcon = 'add'; rightAction = 'window.WeChat.App.openAddFriendPage()'; break;
                    case 2: navTitle = '鍙戠幇'; contentHtml = Views.renderDiscover(); rightIcon = null; break;
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
        // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Generators 鏈嶅姟
        return window.WeChat.Services.Generators.randomizeAllUnlocked(type, targetFieldId);
    },

    // [DEPRECATED] 宸茬Щ鍔ㄥ埌 services/generators.js锛屼繚鐣欐鏂规硶浠呯敤浜庡悜鍚庡吋瀹?    _collectPersonaData(prefix, userId = null) {
        // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Generators 鏈嶅姟
        return window.WeChat.Services.Generators._collectPersonaData(prefix, userId);
    },

    savePersonaSettings(userId, data, silent = false) {
        return window.WeChat.Services.ProfileSettings.savePersonaSettings(userId, data, silent);
    },



    async openAssociatedGen(sourceUserId) {
        return window.WeChat.Services.Relationships.openAssociatedGen(sourceUserId);
    },
    async generateAssociatedInBackground(targetId, sourceChar, relation) {
        // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Generators 鏈嶅姟
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
            if (window.os) window.os.showToast('璇疯嚦灏戣緭鍏ヤ竴涓悕绉?, 'error');
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

        if (window.os) window.os.showToast('淇濆瓨鎴愬姛');
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

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Media 鏈嶅姟
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
                if (window.os) window.os.showToast('宸插鍒?);
            }
        } else if (action === 'recall') {
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                window.WeChat.Services.Chat.recallMessage(State.activeSessionId, msgId);
            }
        } else if (action === 'select') {
            this.enterMsgSelectionMode(msgId);
        } else {
            if (window.os) window.os.showToast('鍔熻兘鏆傛湭寮€鏀?);
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
                if (isChat || titleEl.textContent.includes('杈撳叆') || titleEl.textContent === State.chatTitle) {
                    titleEl.textContent = isTyping ? '瀵规柟姝ｅ湪杈撳叆...' : (State.chatTitle || '寰俊');
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
                    if (label) label.textContent = '鍥炲涓?;
                    vcallGroup.style.opacity = '0.8';
                    vcallGroup.style.pointerEvents = 'none';
                } else {
                    if (btn) btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
                    if (label) label.textContent = '鍥炲';
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
        const map = { 'file_helper': '鏂囦欢浼犺緭鍔╂墜', 'chara_assistant': 'Chara 灏忓姪鎵?, 'pay': '寰俊鏀粯' };
        State.chatTitle = char?.name || map[id] || id;
        State.prevTab = State.currentTab;
        State.currentTab = 'chat_session';

        // 娓呴櫎鏈鏁帮紙閫氱煡绯荤粺闆嗘垚锛?        if (window.WeChat.Services && window.WeChat.Services.Notifications) {
            window.WeChat.Services.Notifications.clearUnread(id);
        }

        // Sync with Service
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.openSession(id);
        }

        State.shouldScrollToBottom = true; // [Fix] Only scroll on initial entry
        this.render();
    },

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Memories 鏈嶅姟
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

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Media 鏈嶅姟
    triggerPhotoUpload() {
        return window.WeChat.Services.Media.triggerPhotoUpload();
    },
    handlePhotoFileSelect(input) {
        return window.WeChat.Services.Media.handlePhotoFileSelect(input);
    },

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Media 鏈嶅姟
    triggerCamera() {
        return window.WeChat.Services.Media.triggerCamera();
    },
    async initCamera() {
        return window.WeChat.Services.Media.initCamera();
    },

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Media 鏈嶅姟
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
            title: '鍙戦€佽闊?,
            placeholder: '璇疯緭鍏ヤ綘鎯宠鐨勫唴瀹癸細',
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

    // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Media 鏈嶅姟
    closeTransferModal() {
        return window.WeChat.Services.Media.closeTransferModal();
    },
    sendTransfer() {
        return window.WeChat.Services.Media.sendTransfer();
    },

    // --- Voice & Video钀藉湴鐩稿叧 ---
    playVoice(msgId) {
        if (window.os) window.os.showToast('姝ｅ湪鎾斁璇煶...');
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
        if (window.os) window.os.showToast('杩炴帴涓?..');
        setTimeout(() => {
            const btn = document.getElementById('wx-vc-accept');
            if (btn) btn.innerText = '宸茶繛鎺?;
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
        // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Modals UI 鏈嶅姟
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
     * v44: 鏀瑰啓鎵撳紑閫昏緫
     * 濡傛灉鏈?observerId锛屽垯浣滀负娴眰寮瑰嚭锛堜笉鍒嘥ab锛?     * 濡傛灉娌℃湁锛屽垯鍒囨崲鍒板叧绯荤綉 Tab锛堜笂甯濇ā寮忥級
     */
    openRelationshipGraph(observerId) {
        console.log('[WeChat] openRelationshipGraph called:', observerId);
        if (observerId) {
            // v54: 瑙嗚妯″紡 - 浣跨敤鐙珛缁勪欢
            if (window.WeChat.UI && window.WeChat.UI.RelationshipGraphSubjective) {
                window.WeChat.UI.RelationshipGraphSubjective.open(observerId);
            }
        } else {
            // v54: 涓婂笣妯″紡 - 浣跨敤鐙珛缁勪欢
            State.prevTab = State.currentTab;
            State.currentTab = 'relationship_graph';
            this.render(); // 娓叉煋鍩虹椤甸潰缁撴瀯

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
            // [Fix] Map both directions of public relation
            char_to_user_public_relation: graphRel.a_to_b_public_relation, // Npc -> User relation
            user_to_char_public_relation: graphRel.b_to_a_public_relation, // User -> Npc relation

            // Legacy fallback if needed (though we prefer specific keys now)
            public_relation: graphRel.a_to_b_public_relation,

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
        const oldUserView = relSettings.user_to_char_view || status.relationship_me_to_they?.opinion || '';

        State.pendingRelationship = {
            // Dynamic Stats
            affection: parseFloat(status.affection || 0),
            difficulty: status.relationship_difficulty || 'normal',
            // [Fix] Deep copy array of objects to prevent reference pollution on cancel
            ladder_persona: (status.ladder_persona || []).map(p => ({ ...p })),

            // 1. Social Contract (Legacy/Fallback)
            public_relation: relSettings.public_relation || status.relationship_they_to_me?.relation || '',

            // 1.5 [Fix] New Explicit Relation Fields (Must init or UI shows empty)
            char_to_user_public_relation: relSettings.char_to_user_public_relation || relSettings.public_relation || status.relationship_they_to_me?.relation || '',
            user_to_char_public_relation: relSettings.user_to_char_public_relation || relSettings.public_relation || status.relationship_they_to_me?.relation || '',

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

        if (window.os) window.os.showToast('璁惧畾宸叉竻绌猴紝璇蜂繚瀛樼敓鏁?);
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
            title: '娓呯┖鑱婂ぉ璁板綍',
            content: '纭畾瑕佹竻绌轰笌璇ヨ鑹茬殑鎵€鏈夎亰澶╄褰曞悧锛熸鎿嶄綔鏃犳硶鎾ら攢銆?,
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
                    outfit: "鏃ュ父渚胯",
                    behavior: "绛夊緟鍥炲",
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

                if (window.os) window.os.showToast('鑱婂ぉ璁板綍涓庢墍鏈夊叧绯昏瀹氬凡娓呴櫎');
            } else {
                if (window.os) window.os.showToast('鑱婂ぉ璁板綍宸叉竻绌?);
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
            content: '鏂扮殑浜鸿闃舵...'
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
        // 妗ユ帴璋冪敤锛氳浆鍙戠粰 Generators 鏈嶅姟
        return window.WeChat.Services.Generators.generateFullRelationshipData();
    },

    /**
     * [Enhanced] 淇濆瓨鍏崇郴鍙樻洿锛屾敮鎸佽法椤甸潰寮傛淇濆瓨锛堟樉寮忎紶鍏?ID 鍜?Data锛?     */
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
                public_relation: rel.char_to_user_public_relation, // [Fix] Alignment

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
                a_to_b_public_relation: rel.char_to_user_public_relation, // [Fix] Use correct field from UI
                a_to_b_public_attitude: rel.char_to_user_public_attitude,
                a_to_b_private_attitude: rel.char_to_user_private_attitude,
                b_knows_a_private: rel.user_knows_char_private,
                b_to_a_public_relation: rel.user_to_char_public_relation, // [Fix] Remove dangerous fallback
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

        if (window.os) window.os.showToast('鍏崇郴璁惧畾宸蹭繚瀛?);
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
                outfit: "鏃ュ父渚胯",
                behavior: "绛夊緟鍥炲",
                inner_voice: "..."
            };
        }

        window.sysStore.updateCharacter(sessionId, updates);
        this.closeConfirmationModal();
        this.render(); // Will re-render status panel
    },

    deleteStatusHistoryRecord(sessionId, timestamp) {
        this.openConfirmationModal({
            title: '鍒犻櫎鐘舵€?,
            content: '纭畾瑕佸垹闄よ繖鏉″巻鍙茬姸鎬佸悧锛熷垹闄ゅ悗灏嗘棤娉曟仮澶嶃€?,
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
        if (window.os) window.os.showToast('璇煶涓庤棰戣缃凡淇濆瓨', 'success');

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
            } else if (current === 'moments') {
                State.currentTab = 2; // 杩斿洖鍙戠幇椤?            } else if (current === 'moments_profile') {
                State.currentTab = State.prevTab === 'moments' ? 'moments' : 2;
            } else if (current === 'moments_settings') {
                State.currentTab = 'moments_profile';
            } else if (current === 'moments_compose') {
                State.momentsComposeImages = [];
                State.currentTab = 'moments';
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

            // 3. Add User-side Message (鏄剧ず鍦ㄧ敤鎴蜂晶)
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const charId = msg.sender_id; // 杞处鍙戦€佽€呯殑ID锛堣鑹睮D锛?
            // 浣跨敤 persistAndShow 娣诲姞鐢ㄦ埛渚х殑娑堟伅姘旀场
            if (window.WeChat.Services && window.WeChat.Services.Chat && window.WeChat.Services.Chat.persistAndShow) {
                window.WeChat.Services.Chat.persistAndShow(charId, JSON.stringify({
                    status: 'received',
                    text: `宸叉敹娆?楼${amount}`,
                    amount: amount
                }), 'transfer_status', {
                    sender_id: 'user',  // 鐢ㄦ埛渚ф樉绀?                    receiver_id: charId
                });
            } else {
                // Fallback: 鐩存帴娣诲姞娑堟伅
                const userMsg = {
                    sender_id: 'user',
                    receiver_id: charId,
                    content: JSON.stringify({ status: 'received', text: `宸叉敹娆?楼${amount}`, amount: amount }),
                    type: 'transfer_status'
                };
                window.sysStore.addMessage(userMsg);
            }
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render
        this.render();

        if (window.os) window.os.showToast('鏀舵鎴愬姛');
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

            // 3. Add User-side Message (鏄剧ず鍦ㄧ敤鎴蜂晶)
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const charId = msg.sender_id;
            const char = window.sysStore.getCharacter(charId);
            const charName = char ? (char.name || charId) : '瀵规柟';

            // Send system message to notify the character (hidden, for AI context)
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                window.WeChat.Services.Chat.persistAndShow(charId, `浣犳嫆缁濅簡 ${charName} 鐨勮浆璐, 'system', { hidden: true });
            }

            // Add user-side transfer_status message (鏄剧ず鍦ㄧ敤鎴蜂晶)
            if (window.WeChat.Services && window.WeChat.Services.Chat && window.WeChat.Services.Chat.persistAndShow) {
                window.WeChat.Services.Chat.persistAndShow(charId, JSON.stringify({
                    status: 'refunded',
                    text: `宸叉嫆缁?楼${amount}`,
                    amount: amount
                }), 'transfer_status', {
                    sender_id: 'user',  // 鐢ㄦ埛渚ф樉绀?                    receiver_id: charId
                });
            } else {
                // Fallback: 鐩存帴娣诲姞娑堟伅
                const userMsg = {
                    sender_id: 'user',
                    receiver_id: charId,
                    content: JSON.stringify({ status: 'refunded', text: `宸叉嫆缁?楼${amount}`, amount: amount }),
                    type: 'transfer_status'
                };
                window.sysStore.addMessage(userMsg);
            }
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render
        this.render();

        if (window.os) window.os.showToast('宸叉嫆缁?);
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
    },

    // ==========================================
    // 鏈嬪弸鍦堝姛鑳芥柟娉?    // ==========================================

    openMoments() {
        State.prevTab = State.currentTab;
        State.currentTab = 'moments';
        this.render();
    },

    openMomentsProfile(targetId) {
        State.prevTab = State.currentTab;
        State.momentsProfileTarget = targetId || 'USER_SELF';
        State.currentTab = 'moments_profile';
        this.render();
    },

    openMomentsSettings(charId) {
        State.prevTab = State.currentTab;
        State.momentsProfileTarget = charId;
        State.currentTab = 'moments_settings';
        this.render();
    },

    openMomentsCompose() {
        State.prevTab = State.currentTab;
        State.momentsComposeImages = [];
        State.currentTab = 'moments_compose';
        this.render();
    },

    /**
     * 鍒囨崲鏈嬪弸鍦堟搷浣滆彍鍗曪紙鐐硅禐/璇勮/鍒犻櫎锛?     */
    toggleMomentsActionMenu(postId) {
        const menu = document.getElementById('moments-menu-' + postId);
        if (!menu) return;
        // 鍏抽棴鎵€鏈夊叾浠栬彍鍗?        document.querySelectorAll('.moments-action-menu').forEach(m => {
            if (m.id !== 'moments-menu-' + postId) m.style.display = 'none';
        });
        const isOpening = menu.style.display === 'none';
        menu.style.display = isOpening ? 'flex' : 'none';

        // 鎵撳紑鏃舵坊鍔犲叏灞€鐐瑰嚮鍏抽棴
        if (isOpening) {
            const closeAll = (e) => {
                if (!e.target.closest('.moments-action-menu') && !e.target.closest('.moments-action-btn')) {
                    document.querySelectorAll('.moments-action-menu').forEach(m => m.style.display = 'none');
                    document.removeEventListener('click', closeAll);
                }
            };
            setTimeout(() => document.addEventListener('click', closeAll), 50);
        }
    },

    /**
     * 鍒囨崲鐐硅禐
     */
    toggleMomentLike(postId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return;
        M.toggleLike(postId, 'USER_SELF');
        // 鍏抽棴鑿滃崟
        const menu = document.getElementById('moments-menu-' + postId);
        if (menu) menu.style.display = 'none';
        this.render();
    },

    /**
     * 寮€濮嬭瘎璁?     */
    startMomentComment(postId) {
        State.momentsCommentTarget = { postId, replyTo: null, replyToAuthorId: null };
        // 鍏抽棴鑿滃崟
        const menu = document.getElementById('moments-menu-' + postId);
        if (menu) menu.style.display = 'none';
        this._showCommentInput();
    },

    /**
     * 鍥炲鏌愭潯璇勮
     */
    startMomentReply(postId, commentId, commentAuthorId) {
        const M = window.WeChat.Services.Moments;
        State.momentsCommentTarget = { postId, replyTo: commentId, replyToAuthorId: commentAuthorId };
        const replyToName = M ? M.getAuthorName(commentAuthorId) : '';
        this._showCommentInput(replyToName);
    },

    /**
     * 鏄剧ず搴曢儴璇勮杈撳叆妗?     */
    _showCommentInput(replyToName = '') {
        // 绉婚櫎宸叉湁鐨?        const existing = document.getElementById('moments-comment-bar');
        if (existing) existing.remove();

        const placeholder = replyToName ? `鍥炲 ${replyToName}` : '璇勮';
        const bar = document.createElement('div');
        bar.id = 'moments-comment-bar';
        bar.className = 'moments-comment-input-bar';
        bar.innerHTML = `
            <input class="moments-comment-input" id="moments-comment-input" 
                   placeholder="${placeholder}" autofocus />
            <div class="moments-comment-send-btn" onclick="window.WeChat.App.sendMomentComment()">鍙戦€?/div>
        `;
        // 娣诲姞鍒?WeChat 搴旂敤瀹瑰櫒鍐?        const appContainer = State.root?.querySelector('.wechat-app') || State.root;
        if (appContainer) {
            appContainer.appendChild(bar);
        } else {
            document.body.appendChild(bar);
        }

        // 鑱氱劍 + 鍥炶溅鎻愪氦
        setTimeout(() => {
            const input = document.getElementById('moments-comment-input');
            if (input) {
                input.focus();
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        window.WeChat.App.sendMomentComment();
                    }
                });
            }
        }, 100);

        // 鐐瑰嚮澶栭儴鍏抽棴
        const closeHandler = (e) => {
            if (!bar.contains(e.target) && !e.target.closest('.moments-comment-item')) {
                bar.remove();
                State.momentsCommentTarget = null;
                document.removeEventListener('click', closeHandler);
            }
            // 鍚屾椂鍏抽棴鎵€鏈夋搷浣滆彍鍗?            document.querySelectorAll('.moments-action-menu').forEach(m => m.style.display = 'none');
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 200);
    },

    /**
     * 鍙戦€佽瘎璁?     */
    sendMomentComment() {
        const M = window.WeChat.Services.Moments;
        if (!M || !State.momentsCommentTarget) return;

        const input = document.getElementById('moments-comment-input');
        const content = input ? input.value.trim() : '';
        if (!content) return;

        const { postId, replyTo, replyToAuthorId } = State.momentsCommentTarget;
        M.addComment(postId, {
            authorId: 'USER_SELF',
            content,
            replyTo,
            replyToAuthorId,
        });

        // 娓呴櫎杈撳叆鍜岀姸鎬?        State.momentsCommentTarget = null;
        const bar = document.getElementById('moments-comment-bar');
        if (bar) bar.remove();

        this.render();

        // 瑙﹀彂瑙掕壊浜掑姩锛堝寘鎷鐢ㄦ埛璇勮鐨勫嵆鏃跺弽搴旓級
        setTimeout(() => {
            if (M && M._triggerReactions) {
                M._triggerReactions(post);
            }
        }, 3000 + Math.random() * 5000);
    },

    /**
     * 鍒犻櫎鏈嬪弸鍦?     */
    deleteMoment(postId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return;
        this.openConfirmationModal({
            title: '鍒犻櫎',
            content: '纭畾鍒犻櫎杩欐潯鏈嬪弸鍦堝悧锛?,
            onConfirm: () => {
                M.deletePost(postId);
                this.closeConfirmationModal();
                this.render();
            }
        });
    },

    /**
     * 鏇存崲鏈嬪弸鍦堝皝闈?     */
    changeMomentsCover(ownerId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                const M = window.WeChat.Services.Moments;
                if (M) {
                    M.setCoverImage(ownerId, re.target.result);
                    this.render();
                    if (window.os) window.os.showToast('灏侀潰宸叉洿鏂?);
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    },

    /**
     * 娣诲姞鍥剧墖鍒版湅鍙嬪湀鍙戝竷
     */
    addMomentImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (re) => {
                    State.momentsComposeImages.push(re.target.result);
                    this._renderComposeImages();
                };
                reader.readAsDataURL(file);
            });
        };
        input.click();
    },

    /**
     * 绉婚櫎鍙戝竷涓殑鍥剧墖
     */
    removeMomentImage(index) {
        State.momentsComposeImages.splice(index, 1);
        this._renderComposeImages();
    },

    /**
     * 鍒锋柊鍙戝竷鍥剧墖棰勮鍖?     */
    _renderComposeImages() {
        const container = document.getElementById('wx-moments-compose-images');
        if (!container) return;
        container.innerHTML = State.momentsComposeImages.map((img, i) => `
            <div class="moments-compose-img-item">
                <img src="${img}" />
                <div class="moments-compose-img-remove" onclick="window.WeChat.App.removeMomentImage(${i})">鉁?/div>
            </div>
        `).join('') + (State.momentsComposeImages.length < 9 ? `
            <div class="moments-compose-add-img" onclick="window.WeChat.App.addMomentImage()">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5" stroke-linecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            </div>
        ` : '');
    },

    /**
     * \u70b9\u51fb\u201c\u8c01\u53ef\u4ee5\u770b\u201d\uff0c\u5f39\u51fa\u53ef\u89c1\u6027\u9009\u62e9
     */
    cycleVisibility() {
        const el = document.getElementById('wx-moments-compose-visibility');
        const label = document.getElementById('wx-moments-visibility-label');
        if (!el || !label) return;
        const cur = el.value;
        if (cur === '\u516c\u5f00') { el.value = '\u79c1\u5bc6'; label.textContent = '\u79c1\u5bc6'; State.momentsVisibleTo = []; }
        else if (cur === '\u79c1\u5bc6') { this._openContactPicker(); }
        else { el.value = '\u516c\u5f00'; label.textContent = '\u516c\u5f00'; State.momentsVisibleTo = []; }
    },

    /**
     * \u5f39\u51fa\u8054\u7cfb\u4eba\u9009\u62e9\u5668\uff08\u9009\u62e9\u8c01\u53ef\u4ee5\u770b\u5e16\u5b50\uff09
     */
    _openContactPicker() {
        const contacts = window.WeChat?.Services?.Contacts?.getContacts() || [];
        const charContacts = contacts.filter(c => c.type !== 'system' && c.id !== 'me' && c.id !== 'file_helper');
        const appContainer = State.root?.querySelector('.wechat-app') || State.root;
        if (!appContainer) return;
        const old = document.getElementById('moments-contact-picker');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'moments-contact-picker';
        modal.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;';
        const sel = new Set(State.momentsVisibleTo || []);
        let listHtml = charContacts.map(c => {
            const ch = window.sysStore?.getCharacter(c.id);
            const nm = ch?.name || c.id;
            const av = ch?.avatar || 'assets/images/avatar_placeholder.png';
            return '<div style="display:flex;align-items:center;padding:12px 20px;border-bottom:0.5px solid var(--wx-border);cursor:pointer;" onclick="this.querySelector(\'input\').checked=!this.querySelector(\'input\').checked;">'
                + '<input type="checkbox" class="mpick-cb" data-cid="' + c.id + '" ' + (sel.has(c.id) ? 'checked ' : '') + 'style="width:20px;height:20px;margin-right:12px;accent-color:#07c160;" onclick="event.stopPropagation();"/>'
                + '<img src="' + av + '" style="width:36px;height:36px;border-radius:6px;object-fit:cover;margin-right:10px;" onerror="this.src=\'assets/images/avatar_placeholder.png\'" />'
                + '<span style="font-size:15px;color:var(--wx-text);">' + nm + '</span></div>';
        }).join('');
        modal.innerHTML = '<div style="background:var(--wx-cell-bg);border-radius:12px 12px 0 0;width:100%;max-height:70%;display:flex;flex-direction:column;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:0.5px solid var(--wx-border);">'
            + '<span onclick="document.getElementById(\'moments-contact-picker\').remove();" style="font-size:15px;color:var(--wx-text-sec);cursor:pointer;">\u53d6\u6d88</span>'
            + '<span style="font-size:17px;font-weight:600;color:var(--wx-text);">\u8c01\u53ef\u4ee5\u770b</span>'
            + '<span id="moments-picker-confirm" style="font-size:15px;color:#07c160;font-weight:600;cursor:pointer;">\u786e\u5b9a</span></div>'
            + '<div style="flex:1;overflow-y:auto;">' + (listHtml || '<div style="padding:40px;text-align:center;color:var(--wx-text-sec);">\u6ca1\u6709\u8054\u7cfb\u4eba</div>') + '</div></div>';
        appContainer.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        setTimeout(() => {
            const btn = document.getElementById('moments-picker-confirm');
            if (btn) btn.addEventListener('click', () => {
                const cbs = modal.querySelectorAll('.mpick-cb:checked');
                const ids = Array.from(cbs).map(cb => cb.dataset.cid);
                State.momentsVisibleTo = ids;
                const el = document.getElementById('wx-moments-compose-visibility');
                const label = document.getElementById('wx-moments-visibility-label');
                if (el && label) {
                    if (ids.length > 0) { el.value = '\u90e8\u5206\u53ef\u89c1'; label.textContent = '\u90e8\u5206\u53ef\u89c1(' + ids.length + '\u4eba)'; }
                    else { el.value = '\u516c\u5f00'; label.textContent = '\u516c\u5f00'; }
                }
                modal.remove();
            });
        }, 50);
    },

    /**
     * 鍙戝竷鏈嬪弸鍦?     */
    publishMoment() {
        const textEl = document.getElementById('wx-moments-compose-text');
        const locationEl = document.getElementById('wx-moments-compose-location');
        const content = textEl ? textEl.value.trim() : '';
        const location = locationEl ? locationEl.value.trim() : '';

        if (!content && State.momentsComposeImages.length === 0) {
            if (window.os) window.os.showToast('璇疯緭鍏ュ唴瀹规垨娣诲姞鍥剧墖', 'error');
            return;
        }

        const M = window.WeChat.Services.Moments;
        if (!M) return;

        const visibilityEl = document.getElementById('wx-moments-compose-visibility');
        const visibility = visibilityEl ? visibilityEl.value : '\u516c\u5f00';

        const post = M.createPost({
            authorId: 'USER_SELF',
            content,
            images: [...State.momentsComposeImages],
            location,
            visibility,
            visibleTo: [...State.momentsVisibleTo],
        });

        // \u6e05\u7a7a\u72b6\u6001
        State.momentsComposeImages = [];
        State.momentsVisibleTo = [];
        State.currentTab = 'moments';

        if (window.os) window.os.showToast('鍙戝竷鎴愬姛');
        this.render();

        // 瑙﹀彂瑙掕壊浜掑姩
        M.triggerReactionsForUserPost(post);
    },

    /**
     * AI 鐢熸垚瑙掕壊鏈嬪弸鍦?     */
    async generateMomentForChar(charId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return;

        if (window.os) window.os.showToast('姝ｅ湪鐢熸垚鏈嬪弸鍦?..');

        const post = await M.generateMomentForChar(charId);
        if (post) {
            if (window.os) window.os.showToast('鏈嬪弸鍦堝凡鍙戝竷锛?);
            this.render();
        } else {
            if (window.os) window.os.showToast('鐢熸垚澶辫触锛岃閲嶈瘯', 'error');
        }
    },

    /**
     * 淇濆瓨瑙掕壊鏈嬪弸鍦堣缃?     */
    saveMomentsSettings(charId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return;

        // 鑾峰彇棰戠巼
        const activeFreqBtn = document.querySelector('.moments-freq-btn.active');
        const frequency = activeFreqBtn ? activeFreqBtn.dataset.freq : 'medium';

        // 鑾峰彇椋庢牸
        const styleEl = document.getElementById('wx-moments-style');
        const style = styleEl ? styleEl.value.trim() : '';

        M.saveCharSettings(charId, { frequency, style });

        if (window.os) window.os.showToast('璁剧疆宸蹭繚瀛?);
    },

    /**
     * 棰勮鏈嬪弸鍦堝浘鐗?     */
    previewMomentImage(postId, imageIndex) {
        const M = window.WeChat.Services.Moments;
        if (!M) return;
        const post = M.getPost(postId);
        if (!post || !post.images[imageIndex]) return;

        const img = post.images[imageIndex];
        if (img.startsWith('data:') || img.startsWith('http') || img.startsWith('blob:')) {
            // 绠€鍗曞浘鐗囬瑙?            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
            overlay.innerHTML = `<img src="${img}" style="max-width:95%;max-height:95%;object-fit:contain;border-radius:4px;">`;
            overlay.onclick = () => overlay.remove();
            document.body.appendChild(overlay);
        }
    },

};

window.WeChat.switchTab = (idx) => window.WeChat.App.switchTab(idx);
window.WeChat.goBack = () => window.WeChat.App.goBack();
window.WeChat.sendMessage = (txt) => window.WeChat.App.sendMessage(txt);
window.WeChat.toggleExtraPanel = () => window.WeChat.App.toggleExtraPanel();
window.WeChat.toggleStickerPanel = () => window.WeChat.App.toggleStickerPanel();

