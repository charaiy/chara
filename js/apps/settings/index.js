/**
 * js/apps/settings/index.js
 * Settings App 入口文件
 * 初始化, 挂载 window 对象
 */

console.log('Loading Settings App Module...');

// 适配 os.js 的初始化调用
function initSettingsApp(container, closeCallback) {
    const app = window.SettingsUI.renderSettingsApp();
    container.appendChild(app);
    window.SettingsHandlers.bindSettingsEvents(app, closeCallback);
}

// 导出模块 - 挂载到 window.SettingsApp
window.SettingsApp = {
    render: window.SettingsUI.renderSettingsApp,
    bindEvents: window.SettingsHandlers.bindSettingsEvents,
    init: initSettingsApp
};

// =========================================
// 初始化后台活动管理器 (页面加载时)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.BackgroundActivityManager) {
            window.BackgroundActivityManager.init();
        }
    }, 2000);
});

// =========================================
// 初始化主题管理器 (页面加载时)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.ThemeManager) {
            window.ThemeManager.init();
        }
    }, 100);
});
