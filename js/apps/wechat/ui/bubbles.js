/**
 * js/apps/wechat/ui/bubbles.js
 * 负责渲染聊天气泡
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Bubbles = {
    // Default Avatar (SVG Base64) to prevent broken images
    DEFAULT_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00czLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg==',

    /**
     * 渲染单条消息
     * @param {Object} msg - 消息对象 { id, type, content, sender: 'me'|'other', avatar }
     */
    render(msg) {
        // 1. Handle System Messages
        if (msg.type === 'system') {
            return `
                <div class="wx-msg-system">
                    <span>${msg.content}</span>
                </div>
            `;
        }

        const selectionState = (window.WeChat.App && window.WeChat.App.getSelectionState) ? window.WeChat.App.getSelectionState() : { msgSelectionMode: false, selectedMsgIds: new Set() };
        const isSelectionMode = selectionState.msgSelectionMode;
        const isSelected = selectionState.selectedMsgIds && selectionState.selectedMsgIds.has(msg.id);

        const isMe = msg.sender === 'me';
        // Use provided avatar -> fallback to Default Base64 -> Empty string (let error handler catch)
        const avatar = msg.avatar || this.DEFAULT_AVATAR;

        // 气泡样式类
        const bubbleClass = isMe ? 'wx-bubble-me' : 'wx-bubble-other';
        const wrapperClass = isMe ? 'wx-msg-row-me' : 'wx-msg-row-other';
        const selectionClass = isSelectionMode ? 'wx-msg-row-selection' : '';

        return `
            <div class="wx-msg-row ${wrapperClass} ${selectionClass}" onclick="window.WeChat.App.toggleMsgSelection('${msg.id}')">
                ${isSelectionMode ? `
                    <div class="wx-msg-checkbox ${isSelected ? 'checked' : ''}">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                ` : ''}
                <img src="${avatar}" class="wx-msg-avatar" onerror="this.src='${this.DEFAULT_AVATAR}'">
                <div class="wx-msg-content">
                    <!-- 名称 (仅群聊显示，这里简化不显示) -->
                    <div class="wx-bubble ${bubbleClass}" 
                         data-msg-id="${msg.id}"
                         onmousedown="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         onmouseup="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         onmouseleave="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         ontouchstart="window.WeChat.App.handleMsgPressStart(event, '${msg.id}')"
                         ontouchend="window.WeChat.App.handleMsgPressEnd(event, '${msg.id}')"
                         oncontextmenu="return false;">
                        ${this._renderContent(msg)}
                    </div>
                </div>
            </div>
        `;
    },

    _renderContent(msg) {
        switch (msg.type) {
            case 'text':
                return msg.content ? String(msg.content).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
            case 'image':
                return `<img src="${msg.content}" style="max-width: 140px; border-radius: 4px; vertical-align: bottom;">`;
            default:
                return '[不支持的消息类型]';
        }
    }
};
