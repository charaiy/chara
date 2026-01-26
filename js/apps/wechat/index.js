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
    locationModalOpen: false,
    transferModalOpen: false,
    videoCallModalOpen: false,
    activeCallSessionId: null,
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
        else if (rightIcon === 'random') {
            rightBtnContent = `
                <div id="wx-nav-gen-btn" title="随机填充未锁定项" style="display:flex; align-items:center; justify-content:center; color:var(--wx-text); opacity:0.8;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 15h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2zm8-4h-2V6h2v2zm-4 0h-2V6h2v2zm-4 0H7V6h2v2z"/></svg>
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
                    <div style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center;">${rightBtnContent}</div>
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

        const rightBtn = rightIcon ? `<div onclick="${(rightIcon === 'random' && rightAction) ? rightAction : (rightAction || rightOnClick)}" style="position:absolute; right:16px; top:48px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer; width: 44px;">${rightBtnContent}</div>` : '';

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

            // [Fix] Preserve Relationship Panel Scroll
            const relPanelScrollEl = document.querySelector('.wx-char-panel-scrollable');
            const relPanelScrollTop = relPanelScrollEl ? relPanelScrollEl.scrollTop : null;

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
        let prefix = '';
        if (type === 'my') prefix = 'wx-my-';
        else if (type === 'persona') prefix = 'wx-edit-';
        else if (type === 'add') prefix = 'wx-add-friend-';
        else if (type === 'rel') prefix = 'wx-rel-';

        const fieldKeys = [
            'real-name', 'bio', 'region', 'region-mapping', 'wealth',
            'species', 'birthday', 'age', 'nickname', 'persona', 'remark',
            'gender', 'period-start',
            'public_relation', 'char_to_user_public', 'char_to_user_secret', 'user_to_char_public', 'user_to_char_secret'
        ];

        const userId = (type === 'persona' || type === 'rel') ? (State.activeUserId || State.activeSessionId) : null;
        const currentData = this._collectPersonaData(prefix, userId);

        // 1. 收集目标字段与上下文 (优先从 currentData 读取，即使 DOM 不存在也能生成)
        const fields = [];
        const targets = [];

        fieldKeys.forEach(k => {
            const id = prefix + k;
            const isLocked = !!State.fieldLocks?.[id];

            // 映射 internal key (e.g. real-name -> realName)
            const internalK = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const value = currentData[internalK] || '';

            const fieldInfo = { key: k, internalKey: internalK, id: id, value: value, isLocked: isLocked };
            fields.push(fieldInfo);

            if (!isLocked && (!targetFieldId || targetFieldId === id)) {
                targets.push(fieldInfo);
            }
        });

        // 阶梯人设处理 (支持后台读取)
        if (type === 'rel') {
            const rel = State.pendingRelationship;
            const ladderCount = rel?.ladder_persona?.length || 0;
            for (let i = 0; i < ladderCount; i++) {
                const id = `wx-rel-ladder-content-${i}`;
                const isLocked = !!State.fieldLocks?.[id];
                const value = rel.ladder_persona[i].content || '';
                const fieldInfo = { key: `ladder-content-${i}`, id: id, value: value, isLocked: isLocked, idx: i };
                fields.push(fieldInfo);

                if (!isLocked && (!targetFieldId || targetFieldId === id || targetFieldId === 'wx-rel-ladder')) {
                    targets.push(fieldInfo);
                }
            }
        }

        if (targets.length === 0) return;

        // 2. 加载反馈
        const btnId = targetFieldId ? (targetFieldId.startsWith('wx-rel-ladder') ? 'wx-rel-gen-btn' : `lock-btn-${targetFieldId}`) : 'wx-nav-gen-btn';
        const btn = document.getElementById(btnId);
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `<svg class="wx-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: wx-spin 1s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
            btn.style.pointerEvents = 'none';
        }

        if (window.os) window.os.showToast(targetFieldId ? 'AI 正在思考中...' : 'AI 正在构思全套人设...', 'info', 5000);

        // 3. 构建 Prompt
        let contextStr = fields.map(f => `- ${f.key}: ${f.value || '(未填写)'}${f.isLocked ? ' [已锁定]' : ''}`).join('\n');

        // [Associated Character Generation Logic]
        if (type === 'add' && State.genContext) {
            contextStr += `\n\n[关联人物生成上下文]\n你正在生成的人物是【${State.genContext.sourceName}】的【${State.genContext.relation}】。\n${State.genContext.sourceName}的人设概要：\n${State.genContext.sourcePersona}\n\n[关联生成特殊指令]\n1. 请在【生活图谱 - 人际关系】中，明确写出与【${State.genContext.sourceName}】的关系。\n2. 在输出的最后（JSON闭合之后），请额外附带一段给源人物【${State.genContext.sourceName}】的更新文本，格式如下：\n\n[SourceUpdate]\n在此输出一段文本，这段文本将被追加到【${State.genContext.sourceName}】的人设中的“人际关系”部分，用于描述他/她与这位新角色的关系。\n[/SourceUpdate]`;
        }

        const targetKeys = targets.map(t => t.key).join(', ');

        const prompt = `你是一个能够洞察灵魂的剧本作家。你的任务是基于碎片信息，构建一个极其鲜活、复杂且逻辑自洽的虚拟角色档案。

[已知信息]
${contextStr}

[生成任务]
请为字段 ${targetKeys} 生成内容。

[核心创作戒律]
1.  反模版化：拒绝刻板印象，构建具有独特缺陷和真实感的人物。
2.  拒绝AI腔：禁止使用矫饰、空洞的词汇，使用具体的行为细节代替抽象形容词。
3.  内容量：Roleplay Prompt (Persona) 必须充实，建议1000字以上，确保高保真度。

[禁词检测与强制替换 (Strict Forbidden List)]
1. 分类避讳清单 (用更生动的描写替代):
   - 模糊陈腐: 一丝、一抹、似乎、不易察觉、闪过
   - 侵略刻板: 不容置喙、小东西、你是我的、猎物、猎人、小妞儿、共犯
   - 粗俗生理: 甜腻、肉刃、邪火、饥渴、哭腔、低吼
   - 俗套淫语: “你是谁的？”、“叫我名字”、“再叫一次”、身体诚实

2. 绝对禁令 (Rigorous Ban List):
   - 🚫 严禁词汇 (Verboten): 石子、羽毛、涟漪、投入、泛起、不易察觉、泛白、抛入、落在、冲击波、炸弹、真空、撕裂、激起、微妙、死寂、手术刀、花蕊、蓓蕾、精密仪器、机器、粉碎机、心率、精确
   - 🚫 严禁句式:
     - “像一个xx投入xx泛起xx” (如“像石子投入湖中泛起涟漪”)
     - “他(终于)动了”、“迈开长腿”
     - “心率不会超过xx”、“精确到xx毫秒” (禁止用具体数字描述生理/心理状态)
     - 禁止将人物比喻为物体（如：他是一台机器、一把手术刀、没有感情的杀手）

3. 强制自检机制 (Self-Correction):
   - 在生成结束前，必须进行自检。如果发现上述词汇，立即替换。
   - 格式要求：在JSON之前，输出一段注释：
     <!-- 禁词风险X: 检测到可能使用[禁词A]。将调整为[替代方案B]。绝不会使用“石子/涟漪/投入”等绝对禁词及相关句式。 -->

[Persona (main_persona) 内容结构 - 纯文本设定]
请将这部分内容完整写入 main_persona 字段。
**注意：不要包含“社交展示面”的具体字段（如网名、签名），那些需要单独输出。**

1.  基础档案：姓名、年龄、身高、具体的社会身份（职业/学校/经济状况）及外貌特征（面部特征、发型发色、穿搭品牌风格）。
2.  个人编年史 (Timeline)：
    - 0-12岁：家庭背景、成长环境与早期记忆。
    - 12-18岁：校园生活、青春期经历与性格成型。
    - 18岁-至今：人生轨迹、职业/学业发展与当前现状。
3.  性格透视：
    - Public (对外)：对外展示的性格侧面与社交行为模式。
    - Private (对内)：内在的真实性格、情绪状态与自我认知。
    - Romantic (恋爱)：亲密关系中的依恋类型与相处模式。
    - Conflict (冲突)：在压力或争吵下的应激反应与解决矛盾的方式。
4.  深层心理 (Critical)：
    - 核心欲望 (Core Desire)：角色行为背后的根本驱动力。
    - 绝对底线 (Bottom Line)：绝不妥协的道德或行为底线。
5.  核心观念体系 (Beliefs)：
    - 配置原则：拒绝文艺腔
    - 世界观：对外部世界的底层认知。
    - 人生观：认为人活着的目的是什么。
    - 价值观：在利益权衡中，什么最重要（钱/名声/义气/安稳）。
    - 感情观：对待伴侣和性的真实态度。
    - 道德观：自我约束的边界在哪里。
    - 性取向：异性恋/同性恋/双性恋/无性恋。和喜欢的类型。
6.  生活图谱：
    - 日常行程：典型的一天作息与活动安排。
    - 喜好/厌恶（具体的书/影/音/食物）。
    - NSFW（性观念简述）。
    - 人际关系：简述核心社交圈及关键人物。
7.  数字通讯生态 (Digital Ecology)：
    - 通讯风格：打字习惯（标点/Emoji/句式）、回复速度（秒回/轮回）、语音偏好。
    - 朋友圈画风：更新频率、内容类型（生活记录/工作展示/仅三天可见）、互动习惯。
8.  AI扮演指南 (Meta)：
    - 人设理解：一句话概括角色的核心特质。
    - 避坑指南 (What NOT to do)：扮演该角色时需避免的OOC行为。
    - 口头禅/语言风格：标志性的用词习惯或句式结构。

[Metadata Fields (独立元数据) - 仅输出JSON键值]
**严禁将以下内容写入 main_persona 文本中！它们必须作为独立的 JSON key 返回。**

- nickname (角色在网络上的名字): 短小精悍，符合人设（字数 < 7）。
- bio (角色在网络上的签名): 句意通顺，切忌长篇大论（字数 < 20）。
- region (展示地区): 微信上显示的地区（如“冰岛”、“上海 黄浦”）。
- region_mapping (现实映射): 用于同步天气/时区的真实城市 English Name（如 "Shanghai"）。
- wealth_level (财富标签): 简短的经济状态描述（如“负债累累”、“中产小资”）。
- remark (用户备注): 用户视角的备注（如“老板”、“那个谁”）。

[Relationship System (关系体系) - 严禁OOC]
此部分用于配置角色与用户的关系网，必须完全基于【Persona】进行逻辑推演。

1.  基础关系矩阵 (Matrix)：
    - public_relation (公开关系)：基于身份设定的合理社会关系。
    - char_to_user_public (明面态度)：角色在旁人面前如何对待用户（基于Public Settings）。
    - char_to_user_secret (私下态度)：角色内心如何看待用户（基于Private Settings）。
    - Logic Check：确保明面态度与私下态度符合人设逻辑（注意检查表里不一或一致性的合理性）。

2.  Ladder Content (关系管理页面配置 - 好感度阶段)：
    - Stage 0~4 (共5个阶段) 必须是角色情感逻辑的延伸。
    - 严禁套用公式：建立符合该角色性格特质的情感递进逻辑。
    - Stage 0 (初识)：对陌生人/普通人的默认态度。
    - Stage 4 (羁绊/最高)：建立深刻信任后的具体表现。

请精准捕捉该角色特有的情感递进逻辑，每一阶段都要写明行为模式和心理状态。

[输出格式]
严格输出 JSON 对象。不要输出 Markdown 代码块。

输出 JSON：`;

        const Api = window.Core?.Api || window.API;
        if (!Api) {
            if (btn) { btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; }
            return;
        }

        try {
            const response = await Api.chat([{ role: 'user', content: prompt }]);
            let data = null;

            // [Source Character Update Logic] - Parse and apply source update if present
            const sourceUpdateMatch = response.match(/\[SourceUpdate\]([\s\S]*?)\[\/SourceUpdate\]/);
            if (sourceUpdateMatch && State.genContext && State.genContext.sourceId) {
                const updateText = sourceUpdateMatch[1].trim();
                const sourceChar = window.sysStore.getCharacter(State.genContext.sourceId);

                if (sourceChar && updateText) {
                    console.log('[Associated Gen] Updating source character:', sourceChar.name);

                    // Append to main_persona smartly
                    let newPersona = sourceChar.main_persona || '';
                    if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                        // Try to append near the existing section if possible, otherwise just append to end
                        newPersona += `\n\n【新增人际关系】\n${updateText}`;
                    } else {
                        // Create section if missing
                        newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updateText}`;
                    }

                    // Save source character immediately
                    window.sysStore.updateCharacter(sourceChar.id, {
                        ...sourceChar,
                        main_persona: newPersona
                    });

                    if (window.os) window.os.showToast(`已同步更新【${sourceChar.name || '源角色'}】的人际关系`, 'success', 4000);
                }
            }

            // Clean response for JSON parsing (remove the special block)
            const cleanResponse = response.replace(/\[SourceUpdate\][\s\S]*?\[\/SourceUpdate\]/, '');

            const match = cleanResponse.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    data = JSON.parse(match[0]);
                } catch (e) {
                    const first = cleanResponse.indexOf('{');
                    const last = cleanResponse.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        try { data = JSON.parse(cleanResponse.substring(first, last + 1)); } catch (ee) { }
                    }
                }
            }

            if (data) {
                // 4. 应用修改
                targets.forEach(t => {
                    const possibleKeys = [t.key, t.key.replace(/-/g, '_'), t.key.replace(/_/g, '-')];
                    let val = null;
                    for (const pk of possibleKeys) {
                        if (data[pk] !== undefined) { val = data[pk]; break; }
                    }

                    if (val !== null) {
                        // [Fix] 确保填入 DOM 的是字符串，防止出现 [object Object]
                        let displayVal = val;
                        if (typeof val === 'object' && val !== null) {
                            displayVal = val.name || val.label || val.text || JSON.stringify(val);
                        }

                        // 更新中间对象
                        if (t.internalKey) currentData[t.internalKey] = displayVal;
                        if (t.idx !== undefined && type === 'rel') State.pendingRelationship.ladder_persona[t.idx].content = displayVal;

                        // 更新 DOM (如果可见)
                        const el = document.getElementById(t.id);
                        if (el) {
                            if (el.tagName === 'SELECT') {
                                const searchVal = String(displayVal).toLowerCase();
                                for (let i = 0; i < el.options.length; i++) {
                                    if (el.options[i].value.toLowerCase() === searchVal) { el.value = el.options[i].value; break; }
                                }
                            } else {
                                el.value = displayVal;
                            }
                            el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                // 5. 持久化存储 (使用更新后的 currentData)
                if (type === 'persona' && userId) {
                    this.savePersonaSettings(userId, currentData, true);
                } else if (type === 'my') {
                    this.saveMyProfileSettings(currentData, true);
                } else if (type === 'rel' && State.activeSessionId) {
                    this.saveRelationshipChanges(true);
                }

                this.render(); // 刷新 UI
                if (window.os) window.os.showToast(targetFieldId ? '生成完成' : '全套人设补全完成', 'success');
            }
        } catch (e) {
            console.error('[AI] Generation Failed:', e);
            if (window.os) window.os.showToast('生成失败，请检查网络或配置', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
            }
        }
    },

    savePersonaSettings(userId, data, silent = false) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            const displayName = data.remark || data.nickname || data.realName || userId;
            window.sysStore.updateCharacter(userId, {
                name: displayName,
                real_name: data.realName,
                remark: data.remark,
                nickname: data.nickname,
                main_persona: data.persona,
                species: data.species || '',
                gender: data.gender || '',
                wxid: data.wxid || ('wxid_' + Math.random().toString(36).substring(2, 10)),
                bio: data.bio || '',
                region: data.region || '',
                settings: {
                    birthday: data.birthday || '',
                    age: data.age || '',
                    period_start: data.periodStart || '',
                    region_mapping: data.regionMapping || '',
                    wealth_level: data.wealth || ''
                }
            });
            // Update current chat title if it's the active session
            if (State.activeSessionId === userId) {
                State.chatTitle = displayName;
            }
        }
        if (!silent) {
            if (window.os) window.os.showToast('保存成功');
            this.goBack(); // Return to previous page
        }
    },



    async openAssociatedGen(sourceUserId) {
        let char = window.sysStore.getCharacter(sourceUserId);

        // Support for User Self
        if (!char && sourceUserId === 'USER_SELF') {
            const s = window.sysStore;
            char = {
                id: 'USER_SELF',
                name: s.get('user_nickname') || s.get('user_realname') || '我',
                nickname: s.get('user_nickname') || '我',
                main_persona: s.get('user_persona') || '',
                avatar: s.get('user_avatar')
            };
        }

        if (!char) return;

        const relation = prompt(`想要生成一个与【${char.nickname || char.name}】什么关系的角色？\n(例如：的前女友、的宿敌、的债主)`, "的");
        if (!relation) return;

        // 1. Create Placeholder Character
        const newCharId = 'gen_' + Date.now();
        const placeholderName = `关联人物 (${relation})`;

        // Save initial placeholder
        window.sysStore.updateCharacter(newCharId, {
            id: newCharId,
            name: placeholderName,
            avatar: 'assets/images/avatar_placeholder.png',
            main_persona: '正在后台生成中，请稍候...\n\n(您可以离开此页面，生成完成后会自动通知您)',
            remark: `与 ${char.name} 是 ${relation} 关系`
        });

        // 2. Navigate to New Settings Page
        State.activeSessionId = newCharId;
        // 2. Navigate to New Settings Page
        State.activeSessionId = newCharId;
        State.activeUserId = newCharId; // [Fix] Set activeUserId so render() knows which char to show
        State.currentTab = 'persona_settings';

        this.render(); // Let the main router handle the view switch

        // 3. Start Background Generation
        if (window.os) window.os.showToast(`后台任务启动：正在生成【${char.name}】的${relation}...`, 'info', 4000);

        // Non-blocking call
        this.generateAssociatedInBackground(newCharId, char, relation);
    },

    async generateAssociatedInBackground(targetId, sourceChar, relation) {
        try {
            // A. Construct Prompts
            const contextStr = [
                `[关联人物生成上下文]`,
                `你正在生成的人物是【${sourceChar.nickname || sourceChar.name}】的【${relation}】。`,
                `${sourceChar.nickname || sourceChar.name}的人设概要：`,
                sourceChar.main_persona || '(无详实人设)',
                `\n[关联生成特殊指令]`,
                `1. 【独立性原则】：这是一个有血有肉、独立存在的人，拥有自己完整的人生轨迹、职业和社交圈。此人绝不是源人物的附庸。请确保其人设的丰富度与源人物相当。`,
                `2. 【备注(remark)生成规则】：这是用户（玩家）在微信通讯录里给这个人打的备注。`,
                `   - 场景：用户刚加上这个人。`,
                `   - 格式：必须是真实的“人名”或“身份标签”（如“陈总”、“小王”、“房东太太”）。`,
                `   - 禁止：绝对不要写成“${sourceChar.name}的朋友”或“${relation}”这种描述性句子。角色本身并不知道用户给了他什么备注。`,
                `3. 请在【生活图谱 - 人际关系】中，明确写出与【${sourceChar.name}】的关系。`,
                `4. 在输出的最后（JSON闭合之后），请额外附带一段给源人物【${sourceChar.name}】的更新文本，格式如下：`,
                `[SourceUpdate]`,
                `在此输出一段文本，这段文本将被追加到【${sourceChar.name}】的人设中的“人际关系”部分，用于描述他/她与这位新角色的关系。`,
                `[/SourceUpdate]`
            ].join('\n');

            const fullPrompt = `你是一个能够洞察灵魂的剧本作家。你的任务是基于关联请求，构建一个极其鲜活、复杂且逻辑自洽的虚拟角色档案。
            
[已知信息]
${contextStr}

[核心创作戒律]
1. 反模版化：拒绝刻板印象。
2. 拒绝AI腔：禁止使用“精密仪器、机器、机械”等比喻。
3. 内容量：Roleplay Prompt (Persona) 必须充实。

[禁词检测与强制替换 (Strict Forbidden List)]
1. 分类避讳清单 (用更生动的描写替代):
   - 模糊陈腐: 一丝、一抹、似乎、不易察觉、闪过
   - 侵略刻板: 不容置喙、小东西、你是我的、猎物、猎人、小妞儿、共犯
   - 粗俗生理: 甜腻、肉刃、邪火、饥渴、哭腔、低吼
   - 俗套淫语: “你是谁的？”、“叫我名字”、“再叫一次”、身体诚实

2. 绝对禁令 (Rigorous Ban List):
   - 🚫 严禁词汇 (Verboten): 石子、羽毛、涟漪、投入、泛起、不易察觉、泛白、抛入、落在、冲击波、炸弹、真空、撕裂、激起、微妙、死寂、手术刀、花蕊、蓓蕾、精密仪器、机器、粉碎机、心率、精确
   - 🚫 严禁句式:
     - “像一个xx投入xx泛起xx” (如“像石子投入湖中泛起涟漪”)
     - “他(终于)动了”、“迈开长腿”
     - “心率不会超过xx”、“精确到xx毫秒” (禁止用具体数字描述生理/心理状态)
     - 禁止将人物比喻为物体（如：他是一台机器、一把手术刀、没有感情的杀手）

3. 强制自检机制 (Self-Correction):
   - 在生成结束前，必须进行自检。如果发现上述词汇，立即替换。
   - 格式要求：在JSON之前，输出一段注释：
     <!-- 禁词风险X: 检测到可能使用[禁词A]。将调整为[替代方案B]。绝不会使用“石子/涟漪/投入”等绝对禁词及相关句式。 -->

[Persona (main_persona) 内容结构 - 纯文本设定]
请生成 main_persona 字段，包含：基础档案、编年史、性格透视、深层心理、核心观念、生活图谱(含人际关系)、数字通讯生态、AI扮演指南。
**注意：不要包含 Social Profile 字段。**

[Metadata Fields (必须严格遵守的格式)]
请作为独立 JSON key 返回，并严格遵循以下语言和格式要求：
- species (物种): 必须是中文 (如: 人类, 吸血鬼, AI)。
- wealth_level (财富状况): 必须是中文短语 (如: 负债累累, 财务自由)。
- bio (微信个性签名): 必须是角色自己写的网络签名（句子），严禁写成“高冷/霸道”这种标签！
- region (展示地区): 必须是中文 (如: 中国 上海)。
- region_mapping (现实映射): 必须是真实存在的城市英文名 (如: Shanghai, Tokyo, New York)，用于天气/时区同步。
- nickname (网名): 短小精悍。
- remark (备注): 必须是中文称呼 (如: 陈总, 房东太太)。
- real_name: 真名。
- age: 数字。
- gender: male/female/other。
- birthday: 格式如 "7月7日"。

[输出格式]
Strict JSON Object.`;

            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('API not ready');

            // B. Call API
            const response = await Api.chat([{ role: 'user', content: fullPrompt }]);

            // C. Source Update
            // Try to separate based on [SourceUpdate] tag
            const parts = response.split('[SourceUpdate]');
            const jsonPart = parts[0];
            const updatePart = parts.length > 1 ? parts[1].replace('[/SourceUpdate]', '').trim() : null;

            if (updatePart) {
                if (sourceChar.id === 'USER_SELF') {
                    // Special handling for User Self
                    const s = window.sysStore;
                    const currentPersona = s.get('user_persona') || '';
                    let newPersona = currentPersona;
                    if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                        newPersona += `\n\n【新增人际关系】\n${updatePart}`;
                    } else {
                        newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updatePart}`;
                    }
                    s.set('user_persona', newPersona);
                    if (window.os) window.os.showToast(`双向同步：已更新【我】的记忆`, 'success');
                } else {
                    // Standard Character handling
                    const freshSource = window.sysStore.getCharacter(sourceChar.id);
                    if (freshSource) {
                        let newPersona = freshSource.main_persona || '';
                        if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                            newPersona += `\n\n【新增人际关系】\n${updatePart}`;
                        } else {
                            newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updatePart}`;
                        }
                        window.sysStore.updateCharacter(freshSource.id, { ...freshSource, main_persona: newPersona });
                        if (window.os) window.os.showToast(`双向同步：已更新【${freshSource.name}】的记忆`, 'success');
                    }
                }
            }

            const cleanResponse = jsonPart; // Use jsonPart directly
            let data = null;
            try {
                const match = cleanResponse.match(/\{[\s\S]*\}/);
                if (match) data = JSON.parse(match[0]);
                else {
                    const first = cleanResponse.indexOf('{');
                    const last = cleanResponse.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        data = JSON.parse(cleanResponse.substring(first, last + 1));
                    }
                }
            } catch (e) {
                console.error('Background Gen JSON Error', e);
            }

            // D. Save & Update
            if (data) {
                window.sysStore.updateCharacter(targetId, {
                    id: targetId,
                    name: data.remark || data.nickname || data.realName || 'New Character',
                    real_name: data.real_name || data.real_name, // Fix key
                    remark: data.remark,
                    nickname: data.nickname, // Important
                    bio: data.bio,
                    main_persona: data.persona || data.main_persona,
                    species: data.species,
                    gender: data.gender,
                    region: data.region,
                    wxid: 'wxid_' + Math.random().toString(36).substring(2, 10),
                    settings: {
                        age: data.age,
                        birthday: data.birthday,
                        wealth_level: data.wealth || data.wealth_level,
                        region_mapping: data.region_mapping || data.regionMapping
                    }
                });

                if (window.os) window.os.showToast(`关联人物生成完成！已存入通讯录。`, 'success', 5000);

                // E. Refresh if user is still watching
                if (State.activeSessionId === targetId) {
                    this.render(); // Trigger full page refresh to update View
                }
            } else {
                if (window.os) window.os.showToast('生成格式解析失败，请重试', 'error');
            }

        } catch (err) {
            console.error(err);
            if (window.os) window.os.showToast('后台生成任务出错', 'error');
        }
    },

    openVoiceVideoSettings(sessionId) {
        State.prevTab = State.currentTab;
        State.activeSessionId = sessionId;
        State.currentTab = 'voice_video_settings';
        this.render();
    },

    saveVoiceVideoSettings(sessionId, data) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(sessionId, {
                voice_settings: {
                    voiceId: data.voiceId,
                    languageBoost: data.languageBoost,
                    speechRate: data.speechRate,
                    visualCallEnabled: data.visualCallEnabled,
                    useRealCamera: data.useRealCamera,
                    voiceAccessEnabled: data.voiceAccessEnabled,
                    peerCallImage: data.peerCallImage,
                    myCallImage: data.myCallImage
                }
            });
        }
        if (window.os) window.os.showToast('设置已保存');
        this.goBack();
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

    /**
     * [Enhanced] 收集人设数据，支持从 DOM 或 Store 中读取（确保背景生成有效）
     */
    _collectPersonaData(prefix, userId = null) {
        const s = window.sysStore;
        const char = userId ? s?.getCharacter(userId) : null;

        // 辅助函数：优先读取 DOM，其次读取 Store (Character 或 Global User)
        const getVal = (fieldK, storeK, isSetting = false) => {
            const el = document.getElementById(prefix + fieldK);
            if (el) return el.value;

            // Fallback 1: 角色数据 (针对现有好友)
            let result = '';
            if (char) {
                result = (isSetting ? char.settings?.[storeK] : char[storeK]) || '';
            }
            // Fallback 2: 全局用户数据 (针对 "我" 的资料)
            else if (prefix === 'wx-my-' && s) {
                result = s.get('user_' + storeK) || '';
            }

            // [Fix] 如果结果是一个对象（常出现在地理位置 field），提取其文字描述
            if (typeof result === 'object' && result !== null) {
                return result.name || result.label || result.text || JSON.stringify(result);
            }
            return result;
        };

        return {
            realName: getVal('real-name', 'real_name'),
            remark: getVal('remark', 'remark'),
            nickname: getVal('nickname', 'nickname'),
            persona: getVal('persona', 'main_persona'),
            gender: getVal('gender', 'gender'),
            species: getVal('species', 'species'),
            wxid: getVal('wxid', 'wxid'),
            bio: getVal('bio', 'bio'),
            region: getVal('region', 'region'),
            regionMapping: getVal('region-mapping', 'region_mapping', true),
            wealth: getVal('wealth', 'wealth_level', true),
            birthday: getVal('birthday', 'birthday', true),
            age: getVal('age', 'age', true),
            periodStart: getVal('period-start', 'period_start', true)
        };
    },

    openMyProfileSettings() {
        State.prevTab = State.currentTab;
        State.currentTab = 'my_profile_settings';
        this.render();
    },

    saveMyProfileSettings(data, silent = false) {
        if (window.sysStore && window.sysStore.set) {
            window.sysStore.set('user_realname', data.realName);
            window.sysStore.set('user_nickname', data.nickname); // nickname is the display name
            window.sysStore.set('user_gender', data.gender);
            window.sysStore.set('user_species', data.species);
            window.sysStore.set('user_persona', data.persona);
            window.sysStore.set('user_persona', data.persona);
            window.sysStore.set('user_birthday', data.birthday);
            window.sysStore.set('user_age', data.age);
            window.sysStore.set('user_period_start', data.periodStart);
            window.sysStore.set('user_bio', data.bio);
            window.sysStore.set('user_region', data.region);
            window.sysStore.set('user_wealth', data.wealth);

            let wxid = data.wxid;
            if (!wxid) {
                const existing = window.sysStore.get('user_wxid');
                wxid = existing || ('wxid_' + Math.random().toString(36).substring(2, 10));
            }
            window.sysStore.set('user_wxid', wxid);
        }
        if (!silent) {
            if (window.os) window.os.showToast('个人资料已更新');
            this.goBack();
        }
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
        const panel = document.getElementById(panelId);
        const otherPanelId = panelId === 'wx-extra-panel' ? 'wx-sticker-panel' : 'wx-extra-panel';
        const otherPanel = document.getElementById(otherPanelId);

        if (otherPanel) {
            otherPanel.style.display = 'none';
            otherPanel.classList.remove('active');
        }

        const view = document.getElementById('wx-view-session');

        if (panel) {
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                requestAnimationFrame(() => panel.classList.add('active'));

                // Handle View Padding
                if (view) {
                    view.classList.add('panel-open');
                    // Scroll immediately (since CSS transition is removed)
                    requestAnimationFrame(() => {
                        view.scrollTop = view.scrollHeight;
                    });
                }
                return true;
            } else {
                panel.classList.remove('active');
                if (view) view.classList.remove('panel-open');
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
        const view = document.getElementById('wx-view-session');
        if (view) view.classList.remove('panel-open');

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
                delBtn.innerText = count > 0 ? `删除(${count})` : '删除';
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

    handleTransferClick(msgId) {
        if (!msgId) return;
        const msg = window.sysStore.getMessages().find(m => m.id == msgId);
        if (!msg) return;

        // If I sent it -> Do nothing (or show details)
        if (msg.sender_id === 'user' || msg.sender_id === 'me') {
            return;
        }

        // If Character sent it -> Check Status
        // Initialize status if missing
        if (!msg.transfer_status) msg.transfer_status = 'pending';

        const status = msg.transfer_status;

        if (status === 'pending') {
            // ACTION: Receive it (Me receiving from Character)

            // 1. Update Message Data (Persistence)
            msg.transfer_status = 'received';
            if (window.sysStore.updateMessage) {
                window.sysStore.updateMessage(msg.id, { transfer_status: 'received' });
            } else {
                // Fallback
                window.sysStore.set('chara_db_messages', window.sysStore.getMessages());
            }

            // 2. Refresh UI (Re-render the bubble)
            // Ideally we only re-render the row, but full render is safer to ensure index sync
            // Actually, let's just trigger a re-render of the specific bubble if possible, or full render.
            // Full render of chat session is okay.
            this.render();

            // 3. Send System Message (Notification that I received it)
            if (window.WeChat.Services && window.WeChat.Services.Chat) {
                const charId = msg.sender_id;
                const char = window.sysStore.getCharacter(charId);
                const charName = char ? (char.name || charId) : '对方';

                // Construct System Notification
                // "你领取了 对方 的转账"
                window.WeChat.Services.Chat.persistAndShow(charId, `你领取了 ${charName} 的转账`, 'system');

                // Optional: Play a sound?
                // if (window.WeChat.Audio) window.WeChat.Audio.play('money_received');
            }
        } else if (status === 'received') {
            if (window.os) window.os.showToast('已收款');
        } else if (status === 'refunded') {
            if (window.os) window.os.showToast('该转账已退还');
        }
    },

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
        return { msgSelectionMode: State.msgSelectionMode, selectedMsgIds: State.selectedMsgIds };
    },

    enterMsgSelectionMode(initialMsgId) {
        State.msgSelectionMode = true;
        State.selectedMsgIds = new Set();
        if (initialMsgId) State.selectedMsgIds.add(initialMsgId);
        this.render(); // Re-render to show checkboxes
    },

    exitMsgSelectionMode() {
        State.msgSelectionMode = false;
        State.selectedMsgIds = new Set();
        this.render();
    },

    toggleMsgSelection(msgId) {
        if (!State.msgSelectionMode) return;
        if (State.selectedMsgIds.has(msgId)) {
            State.selectedMsgIds.delete(msgId);
        } else {
            State.selectedMsgIds.add(msgId);
        }
        // Partial Update for performance? Or full?
        // Full render is safer for checkboxes
        this.render();
    },

    renderMsgSelectionFooter() {
        return `
            < div class="wx-tabbar-fixed" style = "height: 56px; padding: 0 24px; justify-content: space-between; align-items: center; border-top: 0.5px solid var(--wx-border); background: var(--wx-tabbar-bg);" >
                <div style="display:flex; flex-direction:column; align-items:center; opacity: ${State.selectedMsgIds.size > 0 ? 1 : 0.5};" onclick="${State.selectedMsgIds.size > 0 ? 'window.WeChat.App.forwardSelectedMsgs()' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; opacity: ${State.selectedMsgIds.size > 0 ? 1 : 0.5};" onclick="${State.selectedMsgIds.size > 0 ? 'window.WeChat.App.deleteSelectedMsgs()' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </div>
            </div >
            `;
    },

    deleteSelectedMsgs() {
        if (State.selectedMsgIds.size === 0) return;
        // Batch delete
        if (window.sysStore && window.sysStore.deleteMessage) {
            State.selectedMsgIds.forEach(id => window.sysStore.deleteMessage(id));
            this.exitMsgSelectionMode();
            if (window.os) window.os.showToast('已删除');
        }
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

    async startSummarize() {
        const start = parseInt(document.getElementById('wx-range-start')?.value) || 1;
        const end = parseInt(document.getElementById('wx-range-end')?.value) || 0;

        this.closeModals();

        if (window.os) window.os.showToast('正在生成总结...', 'info', 10000);

        // Fetch messages for active session
        const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);

        // Filter by range (start index 1-based logic)
        // Range: start -> end (0 means till end)
        let sliceStart = Math.max(0, start - 1);
        let sliceEnd = end === 0 ? msgs.length : end;

        const targetMsgs = msgs.slice(sliceStart, sliceEnd);

        if (targetMsgs.length === 0) {
            if (window.os) window.os.showToast('该范围内没有消息', 'error');
            return;
        }

        try {
            await window.Core.Memory.performSummary(State.activeSessionId, targetMsgs, State.summaryConfig);
            // Success toast is handled inside performSummary
        } catch (e) {
            console.error(e);
            if (window.os) window.os.showToast('总结失败，请重试', 'error');
        }
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

    triggerVideoCall() {
        this.toggleExtraPanel();
        this.openVideoCallModal(State.activeSessionId);
    },

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

    renderModals() {
        if (!State.memoryModalOpen && !State.summaryModalOpen && !State.rangeModalOpen && !State.refineModalOpen && !State.bubbleMenuOpen && !State.characterPanelOpen && !State.relationshipPanelOpen && !State.statusHistoryPanelOpen && !State.cameraModalOpen && !State.locationModalOpen && !State.transferModalOpen && !State.videoCallModalOpen && !(State.confirmationModal && State.confirmationModal.open)) return '';

        const char = window.sysStore.getCharacter(State.activeSessionId);

        // --- Transfer Modal (Full Screen Simulation) ---
        if (State.transferModalOpen) {
            const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
            const name = char?.name || 'User';
            const realName = char?.real_name || '';
            const maskedName = realName ? `(* ${realName.slice(-1)})` : (name.length > 1 ? `(** ${name.slice(-1)})` : '');

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
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
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
    < div class="wx-modal-overlay active" style = "z-index: 20002; background: rgba(0,0,0,0.4);" onclick = "window.WeChat.App.closeConfirmationModal()" >
        <div class="wx-ios-alert" onclick="event.stopPropagation()">
            <div class="wx-ios-alert-title">${title}</div>
            <div class="wx-ios-alert-content">${content}</div>
            <div class="wx-ios-alert-footer">
                <div class="wx-ios-alert-btn cancel" onclick="window.WeChat.App.closeConfirmationModal()">取消</div>
                <div class="wx-ios-alert-btn confirm" onclick="${onConfirm}">确定</div>
            </div>
        </div>
                </div >
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
    < div class="wx-modal-overlay active" style = "align-items: center; justify-content: center;" onclick = "if(event.target===this) window.WeChat.App.closeTransferModal()" >
        <div class="wx-transfer-modal" style="width: 300px; background: white; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <div style="background: #f79e39; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; position: relative;">
                <div style="position: absolute; top: 10px; left: 10px; cursor: pointer;" onclick="window.WeChat.App.closeTransferModal()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </div>
                <div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" /></svg>
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
                </div >
    `;
        }

        if (State.statusHistoryPanelOpen) {
            return window.WeChat.Views.renderStatusHistoryPanel(State.activeSessionId);
        }

        // Modal 1: Add/Edit Memory
        if (State.memoryModalOpen) {
            const memories = char?.memories || [];
            const existingText = State.editMemoryIndex >= 0 ? memories[State.editMemoryIndex].content : '';
            const title = `为 “${char?.name || 'User'}” ${State.editMemoryIndex >= 0 ? '编辑' : '添加'} 记忆`;

            return `
    < div class="wx-modal-overlay active" onclick = "if(event.target===this) window.WeChat.App.closeModals()" >
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
                </div >
    `;
        }

        // Modal 4: Refine Memory Action Sheet
        if (State.refineModalOpen) {
            const memoryCount = char?.memories?.length || 0;
            return `
    < div class="wx-modal-overlay active" style = "align-items: flex-end; padding-bottom: 20px;" onclick = "if(event.target===this) window.WeChat.App.closeModals()" >
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
                </div >
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
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59L14 6z" transform="rotate(180 12 12)" /></svg>
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
    < div class="wx-modal-overlay active" onclick = "if(event.target===this) window.WeChat.App.closeModals()" >
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
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.copyMsg('${State.bubbleMenuId}')">复制</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.regenerateMsg('${State.bubbleMenuId}')">重回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.recallMsg('${State.bubbleMenuId}')">撤回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.quoteMsg('${State.bubbleMenuId}')">引用</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.multiSelectMsg()">多选</div>
                    <div class="wx-bubble-menu-item delete" onclick="window.WeChat.App.deleteMsg('${State.bubbleMenuId}')">删除</div>
                </div>
            `;
        }

        // Modal 6: Generic Confirmation Modal (iOS Style) - High Priority Overlay
        if (State.confirmationModal && State.confirmationModal.open) {
            const { title, content, onConfirm, onCancel } = State.confirmationModal;
            return `
    < div class="wx-modal-overlay active" style = "z-index: 20002; background: rgba(0,0,0,0.4);" onclick = "window.WeChat.App.closeConfirmationModal()" >
        <div class="wx-ios-alert" onclick="event.stopPropagation()">
            <div class="wx-ios-alert-title">${title}</div>
            <div class="wx-ios-alert-content">${content}</div>
            <div class="wx-ios-alert-footer">
                <div class="wx-ios-alert-btn cancel" onclick="window.WeChat.App.closeConfirmationModal()">取消</div>
                <div class="wx-ios-alert-btn confirm" onclick="${onConfirm}">确定</div>
            </div>
        </div>
                </div >
    `;
        }

        // --- Video Call Simulation (Full Screen) ---
        if (State.videoCallModalOpen) {
            const callChar = window.sysStore.getCharacter(State.activeCallSessionId);
            const avatar = callChar?.avatar || 'assets/images/avatar_placeholder.png';
            const name = callChar?.name || 'User';

            return `
    < div class="wx-modal-overlay active" style = "background: #1a1a1a; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 60px 0 80px 0; z-index: 10003;" >
                    <div style="text-align: center;">
                        <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        <div style="font-size: 24px; color: white; font-weight: 500; margin-bottom: 8px;">${name}</div>
                        <div style="font-size: 16px; color: rgba(255,255,255,0.6);">邀请你进行视频通话...</div>
                    </div>

                    <div style="width: 100%; padding: 0 40px; display: flex; justify-content: space-around; align-items: center;">
                        <!-- Decline -->
                        <div onclick="window.WeChat.App.closeVideoCallModal()" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ff3b30; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/></svg>
                            </div>
                            <span style="color: white; font-size: 13px;">挂断</span>
                        </div>

                        <!-- Accept -->
                        <div id="wx-vc-accept" onclick="window.WeChat.App.acceptVideoCall()" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #07c160; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.55-2.27A1 1 0 0121 8.61v6.78a1 1 0 01-1.45.89L15 14v-4zM5 8h8a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z"/></svg>
                            </div>
                            <span style="color: white; font-size: 13px;">接听</span>
                        </div>
                    </div>

                    <!--Bottom Bar-- >
    <div style="display: flex; gap: 40px; opacity: 0.8;">
        <div style="display: flex; flex-direction: column; align-items: center; font-size: 12px; color: white;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
            </div>
            切到语音
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; font-size: 12px; color: white;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" /></svg>
            </div>
            模糊背景
        </div>
    </div>
                </div >
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
        const settings = char.settings || {};
        const relSettings = settings.relationship || {};

        // [Migration Logic] Handle transition from single-field+toggle to dual-field
        const oldCharView = relSettings.char_to_user_view || status.relationship_they_to_me?.opinion || '';
        const oldCharSecret = relSettings.char_view_is_secret || false;

        const oldUserView = relSettings.user_to_char_view || status.relationship_me_to_they?.opinion || '';
        const oldUserSecret = relSettings.user_view_is_secret || false;

        State.pendingRelationship = {
            // Dynamic Stats
            affection: parseFloat(status.affection || 0),
            difficulty: status.relationship_difficulty || 'normal',
            ladder_persona: [...(status.ladder_persona || [])],

            // 1. Social Contract
            public_relation: relSettings.public_relation || status.relationship_they_to_me?.relation || '',

            // 2. Character's Lens (Dual Layer)
            // If new fields exist, use them. Else migrate: if old was secret -> secret field, else public field.
            char_to_user_public: relSettings.char_to_user_public || (!oldCharSecret ? oldCharView : ''),
            char_to_user_secret: relSettings.char_to_user_secret || (oldCharSecret ? oldCharView : ''),

            // 3. User's Lens (Dual Layer)
            user_to_char_public: relSettings.user_to_char_public || (!oldUserSecret ? oldUserView : ''),
            user_to_char_secret: relSettings.user_to_char_secret || (oldUserSecret ? oldUserView : '')
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
            char_to_user_public: '',
            char_to_user_secret: '',
            user_to_char_public: '',
            user_to_char_secret: ''
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
                // Reset Relationship & Status
                const defaultStatus = {
                    outfit: "日常便装",
                    behavior: "等待回复",
                    inner_voice: "...",
                    affection: 0,
                    relationship_difficulty: 'normal',
                    ladder_persona: []
                };

                const defaultSettings = { ...char.settings };
                // Clear relationship part of settings
                delete defaultSettings.relationship;

                window.sysStore.updateCharacter(sessionId, {
                    status: defaultStatus,
                    status_history: [], // Clear history too
                    settings: defaultSettings,
                    memories: [] // Maybe clear memories too? User said "Clear chat history... keep relationship". Usually implies full wipe if not kept.
                    // But let's stick to "Relationship Panel" data (Status + Relationship Settings).
                });

                if (window.os) window.os.showToast('聊天记录与关系设定已清空');
            } else {
                if (window.os) window.os.showToast('聊天记录已清空');
            }

            this.closeConfirmationModal();
            this.render();
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
        // [Fix] 立即捕获当前会话和数据的引用，防止在 AI 思考期间切换页面导致数据错乱
        const sessionId = State.activeSessionId;
        const rel = State.pendingRelationship;
        if (!sessionId || !rel) return;

        // 1. Visual Loading State
        const btn = document.getElementById('wx-rel-gen-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `
                <svg class="wx-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: wx-spin 1s linear infinite;">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                生成中...
            `;
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.7';
        }

        const fieldMap = {
            'public_relation': 'wx-rel-public_relation',
            'char_to_user_public': 'wx-rel-char_to_user_public',
            'char_to_user_secret': 'wx-rel-char_to_user_secret',
            'user_to_char_public': 'wx-rel-user_to_char_public',
            'user_to_char_secret': 'wx-rel-user_to_char_secret'
        };

        const contextParts = [];
        for (const [key, id] of Object.entries(fieldMap)) {
            const isLocked = !!State.fieldLocks?.[id];
            const value = rel[key] || "(未填写)";
            contextParts.push(`- ${key}: ${value}${isLocked ? " [已锁定]" : " [待生成]"}`);
        }

        const char = window.sysStore.getCharacter(sessionId);
        const mainPersona = char?.main_persona || "未知人设";

        if (window.os) window.os.showToast('正在补全关系设定...', 'info', 3000);

        const prompt = `你是一个顶级角色构建专家。请根据[核心人设]和[关系状态]，生成或润色两人的关系设定，确保逻辑自洽且细节落地。

[核心人设]
${mainPersona}

[当前状态](Locked 表示必须遵守的既定事实)
${contextParts.join('\n')}

[任务要求]
1. **深度适配**：关系设定必须与[核心人设]相辅相成。若角色由于背景或底层性格（如缺乏情感）而显得疏离，好感度阶梯的表现必须遵循此逻辑，禁止情感突变或割裂。
2. **细节补全**：针对待生成的项，扩写为生动、有张力且符合微信聊天背景的描述（40-80字）。
3. **关系透镜**：强化“表现”与“内心”的反差，体现人物的欲望、弱点或执念。
4. **阶梯演进**：如果[wx-rel-ladder] 未锁定，生成5个阶段的表现，体现情感的随好感度变化的细腻递进。
5. **格式要求**：只输出一个纯 JSON 对象，包含上述所有5个关系字段名以及 ladder_persona 数组。不要包含多余解释。

输出 JSON：`;

        const Api = window.Core?.Api || window.API;
        if (!Api) {
            if (btn) { btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; }
            return;
        }

        try {
            const response = await Api.chat([{ role: 'user', content: prompt }]);

            let data = null;
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    data = JSON.parse(match[0]);
                } catch (e) {
                    const first = response.indexOf('{');
                    const last = response.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        try { data = JSON.parse(response.substring(first, last + 1)); } catch (ee) { }
                    }
                }
            }

            if (data) {
                // 4. 应用修改 (使用局部变量 rel)
                for (const [key, id] of Object.entries(fieldMap)) {
                    if (!State.fieldLocks?.[id]) {
                        const possibleKeys = [key, key.replace(/_/g, '-'), key.replace(/-/g, '_')];
                        let val = null;
                        for (const pk of possibleKeys) {
                            if (data[pk] !== undefined) { val = data[pk]; break; }
                        }
                        if (val !== null) rel[key] = val;
                    }
                }

                if (!State.fieldLocks?.['wx-rel-ladder']) {
                    const ladderVal = data.ladder_persona || data.ladder;
                    if (Array.isArray(ladderVal)) {
                        rel.ladder_persona = ladderVal.map(item => ({
                            affection_threshold: item.affection_threshold ?? item.threshold ?? 0,
                            content: item.content || item.performance || item.desc || '...'
                        }));
                    }
                }

                if (window.os) window.os.showToast('✨ 关系设定已完成', 'success');
                // [Fix] 显式传递 sessionId 和 rel，确保异步保存准确
                this.saveRelationshipChanges(true, sessionId, rel);
                this.render();
            } else {
                throw new Error("Invalid JSON");
            }
        } catch (e) {
            console.error('[AI Generation] Failed:', e);
            if (window.os) window.os.showToast('生成失败，请检查 API', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            }
        }
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

                // Save the Dual Layers
                char_to_user_public: rel.char_to_user_public,
                char_to_user_secret: rel.char_to_user_secret,

                user_to_char_public: rel.user_to_char_public,
                user_to_char_secret: rel.user_to_char_secret,

                // Clear old single fields to keep data clean
                char_to_user_view: null,
                char_view_is_secret: null,
                user_to_char_view: null,
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

        if (!silent) {
            State.pendingRelationship = null;
            State.relationshipPanelOpen = false;
            State.characterPanelOpen = true; // Return to character panel
            this.render();
        }
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
            State.shouldScrollToBottom = true; // Force scroll if returning to chat session
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
    // --- Message Context Menu Handlers (Fixed & Consolidated) ---
    handleMsgPressStart(e, msgId) {
        // [Interaction] Prevent system menu and handle selection mode
        if (State.selectionMode || State.msgSelectionMode) return;

        // [Fix] Flag to prevent double-fire (Touch + Mouse)
        if (e.type === 'mousedown' && this._lastTouchTime && (Date.now() - this._lastTouchTime < 1000)) {
            return;
        }
        if (e.type === 'touchstart') {
            this._lastTouchTime = Date.now();
        }

        if (this._msgPressTimer) clearTimeout(this._msgPressTimer);

        // Capture coordinates synchronously!
        let clientX, clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        this._msgPressTimer = setTimeout(() => {
            this._msgLongPressed = true;
            this.showMsgMenu(msgId, clientX, clientY);
        }, 400); // 400ms Trigger
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
        // [Fix] Correct Selector Syntax (No spaces)
        const el = document.querySelector(`.wx-bubble[data-msg-id="${msgId}"]`);

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

    copyMsg(msgId) {
        const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);
        const msg = msgs.find(m => String(m.id) === String(msgId));
        if (msg && msg.content && navigator.clipboard) {
            navigator.clipboard.writeText(msg.content);
            if (window.os) window.os.showToast('已复制');
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
    < div class="wx-msg-selection-footer" >
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
            </div >
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

            // 3. Add System Notice
            let amount = '0.00';
            try { amount = JSON.parse(msg.content).amount; } catch (e) { }

            const sysMsg = {
                sender_id: 'system',
                receiver_id: 'user',
                content: JSON.stringify({ status: 'received', text: `已收款 ¥${amount} `, amount: amount }),
                type: 'transfer_status'
            };

            window.sysStore.addMessage(sysMsg);
        }

        // Close modal
        this.closeTransferModal();

        // Force full re-render
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

