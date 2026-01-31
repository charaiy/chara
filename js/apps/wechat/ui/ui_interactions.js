/**
 * js/apps/wechat/ui/ui_interactions.js
 * UI 交互服务 - 处理面板切换、选择模式等 UI 交互
 * 
 * 职责：
 * - 面板管理（额外功能面板、表情面板的开关）
 * - 表情面板内容渲染和交互
 * - 表情选择模式管理
 * - 表情导入导出功能
 * - 默认表情重置
 * 
 * 功能模块：
 * 1. 面板切换：
 *    - toggleExtraPanel(): 切换额外功能面板（照片、位置、转账等）
 *    - toggleStickerPanel(): 切换表情面板
 *    - closeAllPanels(): 关闭所有面板
 * 
 * 2. 表情管理：
 *    - switchStickerTab(): 切换表情标签页（link/emoji/heart）
 *    - renderStickerPanelContent(): 渲染表情面板内容
 *    - renderStickerGridItems(): 渲染表情网格项
 *    - handleStickerClick(): 处理表情点击
 *    - resetDefaultStickers(): 重置默认表情
 * 
 * 3. 表情导入导出：
 *    - importStickerBackupFromTextarea(): 从文本区域导入表情备份
 *    - exportStickerBackupToTextarea(): 导出表情备份到文本区域
 * 
 * [Refactor] Moved from services/ui.js to ui/ directory for better organization
 * 
 * 依赖：
 * - window.WeChat.Services.Stickers: 表情数据服务
 * - window.WeChat.Views.Stickers: 表情视图渲染
 * - window.WeChat.App: 应用主对象
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.UI = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    _togglePanel(panelId) {
        const State = this.State;
        const panel = document.getElementById(panelId);
        if (!panel) return false;

        const isOpen = panel.style.display !== 'none' && panel.classList.contains('active');
        const otherPanelId = panelId === 'wx-extra-panel' ? 'wx-sticker-panel' : 'wx-extra-panel';
        const otherPanel = document.getElementById(otherPanelId);

        if (isOpen) {
            // Close this panel
            panel.classList.remove('active');
            setTimeout(() => { panel.style.display = 'none'; }, 200);
            const view = document.getElementById('wx-view-session');
            if (view) view.classList.remove('panel-open');
            return false;
        } else {
            // Close other panel first
            if (otherPanel && otherPanel.style.display !== 'none') {
                otherPanel.classList.remove('active');
                setTimeout(() => { otherPanel.style.display = 'none'; }, 200);
            }

            // Open this panel
            panel.style.display = 'flex';
            setTimeout(() => { panel.classList.add('active'); }, 10);
            const view = document.getElementById('wx-view-session');
            if (view) view.classList.add('panel-open');
            return true;
        }
    },

    toggleExtraPanel() {
        return this._togglePanel('wx-extra-panel');
    },

    toggleStickerPanel() {
        if (this._togglePanel('wx-sticker-panel')) {
            // Small delay to ensure display:flex is applied and elements are searchable
            setTimeout(() => this.App.renderStickerGrid(), 50);
        }
    },

    closeAllPanels() {
        this.App.closeAddFriendMenu();
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
    switchStickerTab(tab) {
        const State = this.State;
        State.stickerTab = tab; // 'link', 'album', 'heart'
        this.renderStickerPanelContent(); // Re-render content only
    },

    renderStickerPanelContent() {
        const State = this.State;
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
        const State = this.State;
        if (window.WeChat.Views && window.WeChat.Views.Stickers) {
            window.WeChat.Views.Stickers.renderGridItems();
        }
        if (State.selectionMode) {
            this.updateActionBar();
        }
    },

    updateActionBar() {
        const State = this.State;
        const bar = document.getElementById('wx-sticker-action-bar');
        const count = State.selectedStickers ? State.selectedStickers.size : 0;
        if (bar) {
            bar.classList.add('active');
            const delBtn = bar.querySelector('.wx-sticker-action-btn.delete');
            if (delBtn) {
                delBtn.innerText = count > 0 ? `删除(${count})` : '删除';
            }
        }
    },

    // --- Selection Mode Logic ---
    enterSelectionMode(initialUrl) {
        const State = this.State;
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
        const State = this.State;
        State.selectionMode = false;
        State.selectedStickers = new Set();

        const bar = document.getElementById('wx-sticker-action-bar');
        if (bar) bar.classList.remove('active');

        this.renderStickerGridItems();
    },

    toggleStickerSelection(url) {
        const State = this.State;
        if (!State.selectedStickers) State.selectedStickers = new Set();

        if (State.selectedStickers.has(url)) {
            State.selectedStickers.delete(url);
        } else {
            State.selectedStickers.add(url);
        }
        // Update action bar count
        this.updateActionBar();
        // Re-render grid to show selection state
        this.renderStickerGridItems();
    },

    getSelectionStateStickers() {
        const State = this.State;
        return Array.from(State.selectedStickers || []);
    },

    deleteSelectedStickers() {
        const State = this.State;
        if (!State.selectedStickers || State.selectedStickers.size === 0) return;

        this.App.openConfirmationModal({
            title: '删除表情',
            content: `确定删除选中的 ${State.selectedStickers.size} 个表情吗？此操作无法撤销。`,
            onConfirm: `window.WeChat.Services.Stickers.removeBatch(window.WeChat.Services.UI.getSelectionStateStickers()); window.WeChat.Services.UI.exitSelectionMode();`
        });
    },

    // --- Message Selection Mode ---
    enterMsgSelectionMode(initialMsgId) {
        const State = this.State;
        State.msgSelectionMode = true;
        State.selectedMsgIds = new Set();
        if (initialMsgId) State.selectedMsgIds.add(initialMsgId);
        this.App.render(); // Re-render to show checkboxes
    },

    exitMsgSelectionMode() {
        const State = this.State;
        State.msgSelectionMode = false;
        State.selectedMsgIds = new Set();
        this.App.render();
    },

    toggleMsgSelection(msgId) {
        const State = this.State;
        if (!State.msgSelectionMode) return;
        if (State.selectedMsgIds.has(msgId)) {
            State.selectedMsgIds.delete(msgId);
        } else {
            State.selectedMsgIds.add(msgId);
        }
        // Full render is safer for checkboxes
        this.App.render();
    },

    renderMsgSelectionFooter() {
        const State = this.State;
        return `
            <div class="wx-tabbar-fixed" style="height: 56px; padding: 0 24px; justify-content: space-between; align-items: center; border-top: 0.5px solid var(--wx-border); background: var(--wx-tabbar-bg);">
                <div style="display:flex; flex-direction:column; align-items:center; opacity: ${State.selectedMsgIds.size > 0 ? 1 : 0.5};" onclick="${State.selectedMsgIds.size > 0 ? 'window.WeChat.App.forwardSelectedMsgs()' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center; opacity: ${State.selectedMsgIds.size > 0 ? 1 : 0.5};" onclick="${State.selectedMsgIds.size > 0 ? 'window.WeChat.App.deleteSelectedMsgs()' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </div>
            </div>
            `;
    },

    deleteSelectedMsgs() {
        const State = this.State;
        if (State.selectedMsgIds.size === 0) return;
        // Batch delete
        if (window.sysStore && window.sysStore.deleteMessage) {
            State.selectedMsgIds.forEach(id => window.sysStore.deleteMessage(id));
            this.exitMsgSelectionMode();
            if (window.os) window.os.showToast('已删除');
        }
    },

    getSelectionState() {
        const State = this.State;
        return {
            selectionMode: State.selectionMode,
            selectedStickers: State.selectedStickers,
            msgSelectionMode: State.msgSelectionMode,
            selectedMsgIds: State.selectedMsgIds
        };
    },

    // --- Sticker Interaction Logic ---
    _pressTimer: null,
    _longPressed: false,

    handleStickerPressStart(e, url) {
        const State = this.State;
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

        // Reset long press flag after a delay
        if (this._longPressed) {
            setTimeout(() => { this._longPressed = false; }, 50);
        }
    },

    handleStickerClick(url) {
        // 1. If this click was part of a long press event, do nothing
        if (this._longPressed) return;

        const State = this.State;
        // 2. CHECK SELECTION MODE
        if (State.selectionMode) {
            this.toggleStickerSelection(url);
            return;
        }

        // 3. Normal Send
        this.sendSticker(url);
    },

    sendSticker(url) {
        const State = this.State;
        // SAFETY LOCK: Never send if in selection mode
        if (State.selectionMode) {
            console.warn('Blocked sendSticker during selection mode');
            return;
        }

        window.WeChat.Services.Chat.sendMessage(url, 'image');
    },

    // --- Sticker Helpers ---
    renderStickerGrid() {
        const State = this.State;
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
                const input = document.getElementById('wx-sticker-url-input');
                if (input) input.value = ''; // Clear
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

    confirmUrlUploadLarge() {
        const input = document.getElementById('wx-sticker-url-large-input');
        if (input && input.value) {
            const urlList = input.value.split(/[,\n]/).map(s => s.trim()).filter(s => s);
            const count = window.WeChat.Services.Stickers.add(urlList);
            if (count > 0) this.switchStickerTab('heart');
            else if (window.os) window.os.showToast('无效链接或已存在', 'error');
        }
    },

    exportStickerBackupToTextarea() {
        const input = document.getElementById('wx-sticker-url-large-input');
        if (!input || !window.WeChat?.Services?.Stickers?.exportCustomJSON) return;
        const json = window.WeChat.Services.Stickers.exportCustomJSON();
        input.value = json || '[]';
        input.focus();
        input.select();
        if (window.os) window.os.showToast('已导出到输入框：长按/复制保存', 'success');
    },

    importStickerBackupFromTextarea() {
        const input = document.getElementById('wx-sticker-url-large-input');
        if (!input || !window.WeChat?.Services?.Stickers?.importCustomJSON) return;
        const text = String(input.value || '').trim();
        const result = window.WeChat.Services.Stickers.importCustomJSON(text);
        if (!result.ok) {
            if (window.os) window.os.showToast('导入失败：请粘贴正确的 JSON 备份', 'error');
            return;
        }
        if (window.os) window.os.showToast(`导入成功：${result.count} 个表情`, 'success');
        // Refresh grid
        this.switchStickerTab('heart');
    },

    resetDefaultStickers() {
        if (window.WeChat?.Services?.Stickers?.resetExcluded) {
            window.WeChat.Services.Stickers.resetExcluded();
        }
        if (window.os) window.os.showToast('已重置默认表情', 'success');
        this.renderStickerGrid();
    },

    insertEmoji(emoji) {
        const input = document.getElementById('wx-chat-input');
        if (input) {
            input.value += emoji;
            input.focus();
        }
    },

    promptStickerUpload() {
        this.App.openPromptModal({
            title: '导入表情',
            content: '请输入图片URL (批量导入请用逗号分隔):',
            value: '',
            onConfirm: (urls) => {
                if (urls) {
                    const urlList = urls.split(/[,\n]/).map(s => s.trim()).filter(s => s);
                    const count = window.WeChat.Services.Stickers.add(urlList);
                    if (window.os) window.os.showToast(`成功导入 ${count} 个表情`);
                    this.renderStickerGrid();
                }
            }
        });
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
    }
};
