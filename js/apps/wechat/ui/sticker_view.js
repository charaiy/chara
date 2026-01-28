/**
 * js/apps/wechat/ui/sticker_view.js
 * 负责渲染贴纸面板的内容 (从 index.js 剥离)
 */

window.WeChat = window.WeChat || {};
window.WeChat.Views = window.WeChat.Views || {};

window.WeChat.Views.Stickers = {

    /**
     * 渲染贴纸面板的主要内容区域 (Tab 内容)
     * @param {string} tab - 'link', 'emoji', 'heart'
     */
    renderPanelContent(container, tab) {
        if (!container) return;

        if (tab === 'link') {
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
                    
                    <div style="display:flex; gap:12px; margin-top:14px;">
                        <button onclick="window.WeChat.App.importStickerBackupFromTextarea()" style="
                            flex:1; height:40px; border-radius:8px; border:none;
                            background:var(--wx-cell-bg); color:var(--wx-text); font-size:14px; font-weight:500; cursor:pointer;
                        ">导入备份</button>
                        <button onclick="window.WeChat.App.exportStickerBackupToTextarea()" style="
                            flex:1; height:40px; border-radius:8px; border:none;
                            background:var(--wx-cell-bg); color:var(--wx-text); font-size:14px; font-weight:500; cursor:pointer;
                        ">导出备份</button>
                    </div>

                    <div style="display:flex; gap:16px; margin-top:14px;">
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
        } else if (tab === 'emoji') {
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
            // Render Heart (Grid) Page - Initial Skeleton
            container.innerHTML = `
                <div class="wx-sticker-title">添加的单个表情</div>
                <div id="wx-sticker-grid" class="wx-sticker-grid-layout"></div>
            `;
            // Call the grid item renderer
            this.renderGridItems();
        }
    },

    /**
     * 渲染具体的贴纸网格项 (Heart Tab)
     */
    renderGridItems() {
        const grid = document.getElementById('wx-sticker-grid');
        if (!grid || !window.WeChat.Services.Stickers) return;

        // Access State from App if possible, or pass it in. 
        // Note: index.js exposes State partially via App logic or we assume global State access?
        // Actually index.js State is private. But we can access the necessary data via arguments or globals if needed.
        // But for minimal Refactor, we can access the Stickers Service directly.
        // We also need `State.selectedStickers` and `State.selectionMode`. 
        // Currently `index.js` manages State. 
        // We will assume `window.WeChat.App.getStickerSelectionState()` exists or perform a logic shift.
        // For now, let's keep logic in index.js but move the *HTML Generation* here?
        // Wait, if I move this here, I need access to State.
        // Let's modify App to pass the selection state to this function.

        const stickers = window.WeChat.Services.Stickers.getAll();

        // We need a way to get selection state. 
        // Let's rely on the App to call this with params, OR simply query the App if we expose a getter.
        // To keep it clean, we'll try to get state from App. 
        // But `State` in `index.js` is not exposed.
        // Solution: I will expose `window.WeChat.App.getSelectionState()` in index.js

        const { selectionMode, selectedStickers } = window.WeChat.App.getSelectionState
            ? window.WeChat.App.getSelectionState()
            : { selectionMode: false, selectedStickers: new Set() };


        // 1. Restore Album Upload (Pos 1) - Dashed Plus
        const addBtn = `
            <div class="wx-sticker-cell static-icon wx-sticker-add-btn" onclick="document.getElementById('wx-sticker-upload-input').click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px; height:28px;">
                    <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <input type="file" id="wx-sticker-upload-input" multiple accept="image/*" style="display:none" onchange="window.WeChat.App.handleStickerFileSelect(this)" />
        `;

        // 2. Sticker List with Checkboxes
        const stickerItems = stickers.map(item => {
            const url = item.url; // Extract URL from object
            // Check if selected
            const isSelected = selectedStickers && selectedStickers.has(url);
            return `
            <div class="wx-sticker-cell ${isSelected ? 'selected' : ''}" 
                 onmousedown="window.WeChat.App.handleStickerPressStart(event, '${url}')"
                 ontouchstart="window.WeChat.App.handleStickerPressStart(event, '${url}')"
                 onmouseup="window.WeChat.App.handleStickerPressEnd(event, '${url}')"
                 ontouchend="window.WeChat.App.handleStickerPressEnd(event, '${url}')"
                 onclick="window.WeChat.App.handleStickerClick('${url}')">
                
                <div class="wx-sticker-check-btn"></div>
                <img src="${url}" loading="lazy" style="pointer-events:none;" onerror="this.style.display='none'; this.parentElement.style.background='rgba(255,255,255,0.06)';" />
            </div>
            `;
        }).join('');

        const emptyHint = `
            <div style="grid-column: 1 / -1; padding: 10px 6px; color: var(--wx-text-sec); font-size: 13px; line-height: 1.5;">
                默认表情未加载出来时，可以点这里重置：<span style="color: var(--wx-green); font-weight:600; cursor:pointer;" onclick="window.WeChat.App.resetDefaultStickers()">重置默认表情</span>
            </div>
        `;

        grid.innerHTML = addBtn + (stickerItems || emptyHint);

        // Apply Selection Mode Styles
        if (selectionMode) {
            grid.classList.add('selection-mode');
        } else {
            grid.classList.remove('selection-mode');
        }
    }
};
