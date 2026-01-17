/**
 * js/apps/settings/index.js
 * Settings App 入口文件
 * 引入所有模块, 初始化, 挂载 window 对象
 */

// 导入常量
import { ICONS, Service } from './state.js';

// 导入渲染函数
import {
    renderSettingsApp,
    createSettingsItem,
    renderProfilePageContent,
    renderWifiPageContent,
    renderBluetoothPageContent,
    renderCellularPageContent,
    renderHotspotPageContent,
    renderChatPageContent,
    renderFontPageDesignV5,
    renderAppearancePageContent,
    renderNotificationPageContent
} from './ui_render.js';

// 导入事件处理函数
import {
    bindSettingsEvents,
    openProfilePage,
    bindProfilePageEvents,
    openWifiPage,
    bindWifiPageEvents,
    openBluetoothPage,
    bindBluetoothPageEvents,
    openCellularPage,
    bindCellularPageEvents,
    openHotspotPage,
    bindHotspotPageEvents,
    openChatPage,
    bindChatPageEvents,
    openFontPage,
    bindFontPageDesignEventsV5,
    openAppearancePage,
    bindAppearancePageEvents,
    openNotificationPage,
    bindNotificationPageEvents,
    generateClassicSound,
    generateBlockSound,
    generateCuteSound
} from './handlers.js';

// 导入管理器 (managers.js 会自动挂载到 window)
import './managers.js';

// 适配 os.js 的初始化调用
function initSettingsApp(container, closeCallback) {
    const app = renderSettingsApp();
    container.appendChild(app);
    bindSettingsEvents(app, closeCallback);
}

// 导出模块 - 挂载到 window.SettingsApp
window.SettingsApp = {
    render: renderSettingsApp,
    bindEvents: bindSettingsEvents,
    init: initSettingsApp
};

// =========================================
// 初始化后台活动管理器 (页面加载时)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.BackgroundActivityManager.init();
    }, 2000);
});

// =========================================
// 初始化主题管理器 (页面加载时)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.ThemeManager.init();
    }, 100);
});

// 可选导出 (用于其他模块直接引用)
export {
    // 常量
    ICONS,
    Service,
    // 渲染函数
    renderSettingsApp,
    createSettingsItem,
    renderProfilePageContent,
    renderWifiPageContent,
    renderBluetoothPageContent,
    renderCellularPageContent,
    renderHotspotPageContent,
    renderChatPageContent,
    renderFontPageDesignV5,
    renderAppearancePageContent,
    renderNotificationPageContent,
    // 事件处理
    bindSettingsEvents,
    openProfilePage,
    bindProfilePageEvents,
    openWifiPage,
    bindWifiPageEvents,
    openBluetoothPage,
    bindBluetoothPageEvents,
    openCellularPage,
    bindCellularPageEvents,
    openHotspotPage,
    bindHotspotPageEvents,
    openChatPage,
    bindChatPageEvents,
    openFontPage,
    bindFontPageDesignEventsV5,
    openAppearancePage,
    bindAppearancePageEvents,
    openNotificationPage,
    bindNotificationPageEvents,
    generateClassicSound,
    generateBlockSound,
    generateCuteSound
};
