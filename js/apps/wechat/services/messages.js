/**
 * js/apps/wechat/services/messages.js
 * 消息操作服务 - 处理消息的交互操作
 * 
 * 职责：
 * - 消息长按菜单（复制、转发、删除、撤回等）
 * - 消息选择模式（多选、批量操作）
 * - 消息右键菜单
 * - 消息点击交互
 * - 消息转发功能
 * 
 * 功能模块：
 * 1. 消息长按：
 *    - handleMsgPressStart(): 开始长按（500ms触发）
 *    - handleMsgPressEnd(): 结束长按
 *    - showMsgMenu(): 显示消息菜单
 * 
 * 2. 消息选择：
 *    - toggleMsgSelection(): 切换消息选中状态
 *    - enterMsgSelectionMode(): 进入选择模式
 *    - exitMsgSelectionMode(): 退出选择模式
 * 
 * 3. 消息操作：
 *    - copyMessage(): 复制消息
 *    - forwardMessage(): 转发消息
 *    - deleteMessage(): 删除消息
 *    - recallMessage(): 撤回消息
 * 
 * 依赖：
 * - window.WeChat.App: 应用主对象
 * - window.sysStore: 消息数据存储
 * - window.WeChat.Services.Chat: 聊天服务
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Messages = {
    // 获取 State 和 App 的引用
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    handleMsgPressStart(e, msgId) {
        const State = this.State;
        // [Interaction] Prevent system menu and handle selection mode
        if (State.selectionMode || State.msgSelectionMode) return;

        // [Fix] Flag to prevent double-fire (Touch + Mouse)
        if (e.type === 'mousedown' && this.App._lastTouchTime && (Date.now() - this.App._lastTouchTime < 1000)) {
            return;
        }
        if (e.type === 'touchstart') {
            this.App._lastTouchTime = Date.now();
        }

        if (this.App._msgPressTimer) clearTimeout(this.App._msgPressTimer);

        // Preserve coordinates
        let clientX, clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        this.App._msgPressTimer = setTimeout(() => {
            this.App._msgLongPressed = true;
            this.showMsgMenu(msgId, clientX, clientY);
        }, 500); // 500ms for long press
    },

    handleMsgContextMenu(e, msgId) {
        const State = this.State;
        e.preventDefault(); // Prevent default browser context menu
        if (State.selectionMode || State.msgSelectionMode) return;

        // Directly show menu on right click
        this.showMsgMenu(msgId, e.clientX, e.clientY);
    },

    handleMsgPressEnd() {
        if (this.App._msgPressTimer) {
            clearTimeout(this.App._msgPressTimer);
            this.App._msgPressTimer = null;
        }
        // Small delay
        setTimeout(() => { this.App._msgLongPressed = false; }, 200);
    },

    showMsgMenu(msgId, x, y) {
        const State = this.State;
        // [Fix] Correct Selector Syntax (No spaces)
        let el = document.querySelector(`.wx-bubble[data-msg-id="${msgId}"]`);

        // Fallback for voice/transfer bubbles which might have the handler on the parent or different structure
        if (!el) {
            // Try finding by ID inside bubble content if needed, though data-msg-id should be on .wx-bubble
            // But in bubbles.js, for voice, the valid element with data-msg-id is the .wx-bubble div
        }

        // NOTE: `.wx-bubble-menu` is `position: fixed` in CSS, so its coordinates must be viewport-based.
        // Using container-relative coordinates will push the menu off-screen (and the transparent mask will block clicks).
        const viewportW = window.innerWidth || 375;

        if (el) {
            const rect = el.getBoundingClientRect();
            let menuX = rect.left + rect.width / 2;
            let menuY = rect.top;

            // [Boundary Check] Menu max-width is 160px, centered means 80px on each side
            const halfMenuWidth = 80;
            if (menuX < halfMenuWidth + 10) {
                menuX = halfMenuWidth + 10;
            } else if (menuX > viewportW - (halfMenuWidth + 10)) {
                menuX = viewportW - (halfMenuWidth + 10);
            }

            // [Safety] If the bubble is too close to the top, show the menu BELOW the bubble.
            const isTooTop = rect.top < 160;
            menuY = isTooTop ? (rect.bottom + 10) : (rect.top - 10);

            State.bubbleMenuPos = { x: menuX, y: menuY, isFlipped: isTooTop };
        } else {
            // Absolute coordinates fallback (already viewport coords)
            State.bubbleMenuPos = { x: x, y: y, isFlipped: false };
        }

        State.bubbleMenuOpen = true;
        State.bubbleMenuId = msgId;
        this.App.render();
        if (navigator.vibrate) navigator.vibrate(50);
    },

    closeMsgMenu() {
        const State = this.State;
        State.bubbleMenuOpen = false;
        this.App.render();
    },

    deleteMsg(msgId) {
        if (window.sysStore && window.sysStore.deleteMessage) {
            window.sysStore.deleteMessage(msgId);
            this.App.render();
        }
        this.closeMsgMenu();
    },

    copyMsg(msgId) {
        const State = this.State;
        const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);
        const msg = msgs.find(m => String(m.id) === String(msgId));
        if (msg && msg.content && navigator.clipboard) {
            navigator.clipboard.writeText(msg.content);
            if (window.os) window.os.showToast('已复制');
        }
        this.closeMsgMenu();
    },

    recallMsg(msgId) {
        const State = this.State;
        if (window.WeChat.Services && window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.recallMessage(State.activeSessionId, msgId);
        }
        this.closeMsgMenu();
        this.App.render(); // Redraw session
    },

    regenerateMsg(msgId) {
        const State = this.State;
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

        this.App.render();
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
        const State = this.State;
        State.msgSelectionMode = true;
        State.selectedMsgIds = new Set();
        if (State.bubbleMenuId) {
            State.selectedMsgIds.add(State.bubbleMenuId);
        }
        this.closeMsgMenu();
        this.App.render();
    },

    exitMsgSelectionMode() {
        const State = this.State;
        State.msgSelectionMode = false;
        State.selectedMsgIds = new Set();
        this.App.render();
    },

    toggleMsgSelection(msgId) {
        const State = this.State;
        if (!State.msgSelectionMode) {
            // [Interactive Feature] Handle specific message interactions when NOT in selection mode
            const msg = window.sysStore.getMessageById(msgId);
            if (msg && msg.type === 'transfer') {
                this.App.openTransferModal(msgId);
            }
            return;
        }
        if (State.selectedMsgIds.has(msgId)) {
            State.selectedMsgIds.delete(msgId);
        } else {
            State.selectedMsgIds.add(msgId);
        }
        this.App.render();
    },

    deleteSelectedMessages() {
        const State = this.State;
        if (State.selectedMsgIds.size === 0) return;
        this.App.openConfirmationModal({
            title: '删除消息',
            content: `确定删除选中的 ${State.selectedMsgIds.size} 条消息吗？`,
            onConfirm: () => {
                if (window.sysStore && window.sysStore.deleteMessage) {
                    State.selectedMsgIds.forEach(id => {
                        window.sysStore.deleteMessage(id);
                    });
                }
                this.exitMsgSelectionMode();
                if (window.os) window.os.showToast('已删除');
            }
        });
    },

    renderMsgSelectionFooter() {
        return `
    <div class="wx-msg-selection-footer">
                <div class="wx-selection-footer-item" onclick="window.WeChat.App.openConfirmationModal({title:'转发', content:'转发功能开发中...', showCancel:false})">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 17 5 5 5-5"/><path d="M20 2v9a4 4 0 0 1-4 4H4"/><path d="m7 19-3-4 3-4"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="window.WeChat.App.openConfirmationModal({title:'收藏', content:'收藏功能开发中...', showCancel:false})">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="window.WeChat.App.deleteSelectedMessages()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </div>
                <div class="wx-selection-footer-item" onclick="window.WeChat.App.openConfirmationModal({title:'更多', content:'更多功能开发中...', showCancel:false})">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M11 4v16"/></svg>
                </div>
            </div>
    `;
    }
};
