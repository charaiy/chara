/**
 * js/apps/wechat/ui/components.js
 * 负责渲染通用组件：NavBar, TabBar
 */

/**
 * js/apps/wechat/ui/components.js
 * 负责渲染通用组件：NavBar, TabBar
 * [Compatibility] Converted to global pattern for file:// protocol support
 */

window.WeChat = window.WeChat || {};

window.WeChat.Components = {
    /**
     * 渲染顶部导航栏 (iOS Style Glassmorphism)
     * @param {Object} options
     * @param {string} options.title - 标题
     * @param {boolean} options.showBack - 是否显示返回
     * @param {string} options.rightIcon - 右侧图标类型 ('add', 'more' etc)
     */
    renderNavBar({ title = "WeChat", showBack = false, rightIcon = null } = {}) {
        // Back Button
        const backBtn = showBack
            ? `<div class="wx-navbar-left" onclick="window.WeChat.goBack()">
                 <svg width="12" height="20" viewBox="0 0 12 20">
                    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 2L2 10l8 8"/>
                 </svg>
                 <span style="font-size:16px; margin-left:4px">返回</span>
               </div>`
            : '';

        // Right Icons (Add / More)
        let rightBtnContent = '';
        if (rightIcon === 'add') {
            // Circle Plus
            rightBtnContent = `
                <svg width="24" height="24" viewBox="0 0 24 24" style="background:transparent;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`;
        } else if (rightIcon === 'more') {
            // Three dots
            rightBtnContent = `
                <svg width="24" height="24" viewBox="0 0 24 24">
                     <circle cx="5" cy="12" r="2" fill="currentColor"/>
                     <circle cx="12" cy="12" r="2" fill="currentColor"/>
                     <circle cx="19" cy="12" r="2" fill="currentColor"/>
                </svg>`;
        }

        const rightBtn = rightIcon
            ? `<div class="wx-navbar-right">${rightBtnContent}</div>`
            : '';

        // 隐形退出按钮 (仅在主页显示)
        const hiddenExitBtn = !showBack
            ? `<div class="wx-hidden-exit" onclick="window.WeChat.App.closeApp()" title="返回桌面"></div>`
            : '';

        return `
            <div class="wx-navbar wx-hairline-bottom">
                ${hiddenExitBtn}
                ${backBtn}
                <div class="wx-navbar-title">${title}</div>
                ${rightBtn}
            </div>
        `;
    },

    /**
     * 渲染底部标签栏
     * @param {number} activeIndex - 当前激活的 Tab 索引 (0-3)
     */
    renderTabBar(activeIndex = 0) {
        const tabs = [
            { id: 'chat', label: '微信', icon: 'chat' },
            { id: 'contacts', label: '通讯录', icon: 'contacts' },
            { id: 'discover', label: '发现', icon: 'discover' },
            { id: 'me', label: '我', icon: 'me' }
        ];

        const renderIcon = (type, isActive) => {
            // 使用 SF Symbols 风格 Path
            // 简单的 SVG 路径模拟
            const fill = isActive ? "currentColor" : "none";
            const stroke = isActive ? "none" : "currentColor";
            const strokeWidth = isActive ? "0" : "1.5"; // 细线描边

            // 注意：微信的图标选中和未选中形态通常略有不同（实心 vs 描边）
            // 这里为了简化，我们用同一套 Path，通过 fill/stroke 切换，或者使用双 Path

            switch (type) {
                case 'chat':
                    // 气泡
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 3.58-9 8 0 2.25 1.05 4.28 2.76 5.82L5 21l4.5-1.5c.81.25 1.64.38 2.5.38 4.97 0 9-3.58 9-8s-4.03-8-9-8z" 
                              fill="${isActive ? 'currentColor' : 'none'}" 
                              stroke="${isActive ? 'none' : 'currentColor'}" 
                              stroke-width="${isActive ? 0 : 1.2}"/>
                    </svg>`;
                case 'contacts':
                    // 联系人 (简单头部 + 肩部)
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M4 20v-1c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v1" 
                              fill="${isActive ? 'currentColor' : 'none'}" 
                              stroke="${isActive ? 'none' : 'currentColor'}" 
                              stroke-width="${isActive ? 0 : 1.5}" stroke-linecap="round"/>
                        <circle cx="12" cy="9" r="4" 
                              fill="${isActive ? 'currentColor' : 'none'}" 
                              stroke="${isActive ? 'none' : 'currentColor'}" 
                              stroke-width="${isActive ? 0 : 1.5}"/>
                    </svg>`;
                case 'discover':
                    // 指南针
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" 
                                fill="${isActive ? 'currentColor' : 'none'}"
                                stroke="${isActive ? 'none' : 'currentColor'}" 
                                stroke-width="${isActive ? 0 : 1.5}"/>
                        <path d="M10.5 10.5L16 8l-2.5 5.5L8 16l2.5-5.5z" 
                              fill="${isActive ? '#fff' : 'none'}" 
                              stroke="currentColor" 
                              stroke-width="1.2"/>
                    </svg>`;
                case 'me':
                    // 个人 (剪影)
                    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                         <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" 
                               fill="${isActive ? 'currentColor' : 'none'}" 
                               stroke="${isActive ? 'none' : 'currentColor'}" 
                               stroke-width="${isActive ? 0 : 1.25}"/>
                    </svg>`;
                default:
                    return '';
            }
        };

        // 获取通知系统数据
        const notifService = window.WeChat?.Services?.Notifications;
        const totalUnread = notifService && notifService.getTotalUnreadCount
            ? notifService.getTotalUnreadCount()
            : 0;

        // 未读数显示文本
        let unreadBadge = '';
        if (totalUnread > 0) {
            const displayText = totalUnread <= 99 ? totalUnread.toString() : '···';
            unreadBadge = `<div class="wx-badge">${displayText}</div>`;
        }

        // 发现页红点（可选）
        const discoverDot = window.sysStore && window.sysStore.get('discover_has_new') === 'true'
            ? `<div class="wx-badge-dot"></div>`
            : '';

        const list = tabs.map((tab, index) => {
            const isActive = index === activeIndex;

            // Tab 0 (微信)：显示未读数
            // Tab 2 (发现)：显示红点
            let badge = '';
            if (index === 0 && unreadBadge) {
                badge = unreadBadge;
            } else if (index === 2 && discoverDot) {
                badge = discoverDot;
            }

            return `
                <div class="wx-tab-item ${isActive ? 'active' : ''}" onclick="window.WeChat.switchTab(${index})">
                    <div class="wx-tab-icon">
                        ${renderIcon(tab.icon, isActive)}
                    </div>
                    <div class="wx-tab-label">${tab.label}</div>
                    ${badge}
                </div>
            `;
        }).join('');

        return `<div class="wx-tabbar-fixed wx-hairline-top">${list}</div>`;
    }
};
