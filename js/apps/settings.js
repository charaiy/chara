/**
 * js/apps/settings.js
 *     Settings App Logic Module (设置 App 逻辑模块)
 */

// SVG Icons Map
const ICONS = {
    fullscreen: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>',
    bluetooth: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/></svg>',
    cellular: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M2 22h20V2L2 22zm18-2h-3V9.83l3-3V20z"/></svg>',
    hotspot: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    slider: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
    media: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>',
    family: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
    iphone: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>',
    watch: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 12c0-2.54-1.19-4.81-3.04-6.27L16 0H8l-.96 5.73C5.19 7.19 4 9.45 4 12s1.19 4.81 3.04 6.27L8 24h8l.96-5.73C18.81 16.81 20 14.54 20 12zM6 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6-6-2.69-6-6z"/></svg>',
    // New Icons for Backup/Host
    imgbb: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>',
    hash: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.35 1.2 2.93.92.09-.65.35-1.15.63-1.41-2.61-.29-5.35-1.31-5.35-5.83 0-1.29.46-2.35 1.21-3.18-.12-.3-.52-1.52.12-3.16 0 0 1-.32 3.3 1.23a11.5 11.5 0 016 0c2.28-1.55 3.28-1.23 3.28-1.23.64 1.64.24 2.87.12 3.16.75.83 1.21 1.89 1.21 3.18 0 4.53-2.75 5.54-5.37 5.83.36.31.68.92.68 1.85v2.74c0 .27.18.64.73.55A11 11 0 0012 1.27z"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
    token: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
    time: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
    cloud_up: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>',
    cloud_down: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>',
    // New Icons for WiFi page
    list: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
    thermometer: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-2V5c0-.55.45-1 1-1s1 .45 1 1v1h-1v1h1v2h-1v1h1v1h-2z"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
    // 添加文本图标用于字体设置
    text: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
    // 添加聊天气泡图标
    bubble: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
    // 月亮图标用于暗黑模式
    moon: '<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/></svg>'
};

/**
 *     Render Settings App Interface (渲染设置 App 界面)
 * @returns {HTMLElement}
 */
function renderSettingsApp() {
    const div = document.createElement('div');
    div.id = 'app-settings';
    div.className = 'app-window';

    // 获取当前头像
    const currentAvatar = window.sysStore.get('user_avatar') || '';
    const avatarHtml = currentAvatar ?
        `<img src="${currentAvatar}" alt="Profile" id="settings-main-avatar-img">` :
        ICONS.person;

    // 获取用户信息
    const s = window.sysStore;
    const userName = s.get('user_name') || 'Chara User';
    // 主页描述通常固定，或者也可以自定义，暂且只改名字

    div.innerHTML = `
        <div class="settings-header">
            <div class="settings-nav">
                <!-- Back button (Close App) -->
                <div class="settings-back" id="settings-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; opacity: 0;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                 <!-- Title -->
                <div class="settings-title">设置</div>
                 <!-- Placeholder for symmetry -->
                <div style="width: 70px;"></div>
            </div>
        </div>
        <div class="settings-search" style="margin: 0 16px 10px 16px;">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            搜索
        </div>
        <div class="settings-content">
            <!-- Profile Section -->
            <div class="settings-group">
                <div class="settings-item profile-row">
                    <div class="profile-pic" id="settings-main-avatar">
                        ${avatarHtml}
                    </div>
                    <div class="profile-info">
                        <div class="profile-name" id="home-profile-name">${userName}</div>
                        <div class="profile-desc">Apple ID、iCloud、媒体与购买项目</div>
                    </div>
                    <div class="settings-chevron">›</div>
                </div>
            </div>

            <!-- Display Section -->
            <div class="settings-group">
                ${createSettingsItem('fullscreen', '全屏模式', '#5856d6', true, '', 'fullscreen-toggle')}
                ${createSettingsItem('wifi', 'Wi-Fi', '#007aff', false, 'CharaNet', 'wifi-page')}
                ${createSettingsItem('mic', '语音', '#ff9500', false, '', 'bluetooth-page')}
                ${createSettingsItem('palette', '图像', '#af52de', false, '', 'cellular-page')}
                ${createSettingsItem('hourglass', '后台活动', '#34c759', false, '', 'hotspot-page')}
                ${createSettingsItem('moon', '暗黑模式', '#5856d6', true, '', 'dark-mode-toggle')}
            </div>

            <!-- General Section -->
            <div class="settings-group">
                ${createSettingsItem('bubble', '聊天', '#007aff', false, '', 'chat-page')}
                ${createSettingsItem('text', '字体', '#8e8e93', false, '', 'font-page')}
                ${createSettingsItem('sun', '外观', '#007aff', false, '', 'appearance-page')}
                ${createSettingsItem('bell', '通知', '#ff3b30', false, '', 'notification-page')}
            </div>
            
            <!-- App Section -->
            <div class="settings-group">
                ${createSettingsItem('wrench', '开发者', '#666666')}
                ${createSettingsItem('robot', 'Chara AI', '#000000')}
            </div>
        </div>
    `;
    return div;
}

/**
 *     Create Settings Item (创建设置项)
 */
function createSettingsItem(iconType, label, color, isSwitch = false, valueText = '', switchId = '') {
    const iconSvg = ICONS[iconType] || `<span style="font-size:16px;font-weight:bold;">${iconType.charAt(0).toUpperCase()}</span>`;

    let rightContent = `<div class="settings-chevron">›</div>`;

    if (valueText) {
        rightContent = `<div class="settings-value">${valueText}</div>` + rightContent;
    }

    if (isSwitch) {
        let isOn = false;
        if (switchId === 'fullscreen-toggle') {
            isOn = document.getElementById('os-root')?.classList.contains('fullscreen-mode');
        } else if (switchId === 'dark-mode-toggle') {
            // 默认开启暗黑模式，除非明确设置为 false
            isOn = window.sysStore?.get('dark_mode') !== 'false';
        }
        const switchClass = isOn ? 'ios-switch on' : 'ios-switch';
        rightContent = `<div class="${switchClass}" data-switch="${switchId}"><div class="switch-knob"></div></div>`;
    }

    return `
        <div class="settings-item" ${switchId ? `data-action="${switchId}"` : ''}>
            <div class="settings-icon" style="background-color: ${color}">
               ${iconSvg}
            </div>
            <div class="settings-label">${label}</div>
            ${rightContent}
        </div>
    `;
}

/**
 *     Bind Settings Events (绑定设置页事件)
 * @param {HTMLElement} app 
 * @param {Function} closeCallback 
 */
function bindSettingsEvents(app, closeCallback) {
    // Back Button
    const backBtn = app.querySelector('#settings-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            closeCallback();
        });
    }

    // Profile Row - 打开个人页面
    const profileRow = app.querySelector('.profile-row');
    if (profileRow) {
        profileRow.addEventListener('click', () => {
            openProfilePage(app);
        });
    }

    // Fullscreen Toggle
    const fullscreenItem = app.querySelector('[data-action="fullscreen-toggle"]');
    if (fullscreenItem) {
        fullscreenItem.addEventListener('click', () => {
            const osRoot = document.getElementById('os-root');
            const isOn = osRoot.classList.toggle('fullscreen-mode');

            // Toggle switch visual
            const switchEl = fullscreenItem.querySelector('.ios-switch');
            if (switchEl) {
                switchEl.classList.toggle('on', isOn);
            }

            // Save preference
            window.sysStore.set('fullscreen_mode', isOn ? 'on' : 'off');
            console.log('Fullscreen Mode:', isOn ? 'ON' : 'OFF');
        });
    }

    // Dark Mode Toggle
    const darkModeItem = app.querySelector('[data-action="dark-mode-toggle"]');
    if (darkModeItem) {
        darkModeItem.addEventListener('click', () => {
            const switchEl = darkModeItem.querySelector('.ios-switch');
            if (switchEl) {
                switchEl.classList.toggle('on');
                const isOn = switchEl.classList.contains('on');

                // 保存设置
                window.sysStore.set('dark_mode', isOn ? 'true' : 'false');

                // 切换主题
                if (window.ThemeManager) {
                    window.ThemeManager.setDarkMode(isOn);
                }

                console.log('Dark Mode:', isOn ? 'ON' : 'OFF');
            }
        });
    }

    // Wi-Fi Page
    const wifiItem = app.querySelector('[data-action="wifi-page"]');
    if (wifiItem) {
        wifiItem.addEventListener('click', () => {
            openWifiPage(app);
        });
    }

    // Bluetooth Page (语音)
    const bluetoothItem = app.querySelector('[data-action="bluetooth-page"]');
    if (bluetoothItem) {
        bluetoothItem.addEventListener('click', () => {
            openBluetoothPage(app);
        });
    }

    // Cellular Page (图像)
    const cellularItem = app.querySelector('[data-action="cellular-page"]');
    if (cellularItem) {
        cellularItem.addEventListener('click', () => {
            openCellularPage(app);
        });
    }

    // Hotspot Page (后台活动)
    const hotspotItem = app.querySelector('[data-action="hotspot-page"]');
    if (hotspotItem) {
        hotspotItem.addEventListener('click', () => {
            openHotspotPage(app);
        });
    }

    // Chat Page
    const chatItem = app.querySelector('[data-action="chat-page"]');
    if (chatItem) {
        chatItem.addEventListener('click', () => {
            openChatPage(app);
        });
    }

    // Font Page
    const fontItem = app.querySelector('[data-action="font-page"]');
    if (fontItem) {
        fontItem.addEventListener('click', () => {
            openFontPage(app);
        });
    }

    // Appearance Page
    const appearanceItem = app.querySelector('[data-action="appearance-page"]');
    if (appearanceItem) {
        appearanceItem.addEventListener('click', () => {
            openAppearancePage(app);
        });
    }

    // Notification Page (通知)
    const notificationItem = app.querySelector('[data-action="notification-page"]');
    if (notificationItem) {
        notificationItem.addEventListener('click', () => {
            openNotificationPage(app);
        });
    }
}

/**
 *     Open Profile Page (打开个人页面)
 */
function openProfilePage(settingsApp) {
    // 如果已存在则直接显示
    let profilePage = settingsApp.querySelector('.profile-page');

    if (!profilePage) {
        profilePage = document.createElement('div');
        profilePage.className = 'profile-page';
        profilePage.innerHTML = renderProfilePageContent();
        settingsApp.appendChild(profilePage);

        // 绑定个人页面事件
        bindProfilePageEvents(profilePage);
    }

    // 延迟添加 active 类以触发动画
    requestAnimationFrame(() => {
        profilePage.classList.add('active');
    });
}

/**
 *     Open Wi-Fi Page (打开 Wi-Fi [API] 页面)
 */
function openWifiPage(settingsApp) {
    let wifiPage = settingsApp.querySelector('.wifi-page');

    if (!wifiPage) {
        wifiPage = document.createElement('div');
        wifiPage.className = 'profile-page wifi-page'; // Reuse profile-page styles for slide-in
        wifiPage.innerHTML = renderWifiPageContent();
        settingsApp.appendChild(wifiPage);

        bindWifiPageEvents(wifiPage);
    }

    requestAnimationFrame(() => {
        wifiPage.classList.add('active');
    });
}

/**
 *     Open Bluetooth Page (打开蓝牙 [语音服务] 页面)
 */
function openBluetoothPage(settingsApp) {
    let btPage = settingsApp.querySelector('.bluetooth-page');

    if (!btPage) {
        btPage = document.createElement('div');
        btPage.className = 'profile-page bluetooth-page';
        btPage.innerHTML = renderBluetoothPageContent();
        settingsApp.appendChild(btPage);

        bindBluetoothPageEvents(btPage);
    }

    requestAnimationFrame(() => {
        btPage.classList.add('active');
    });
}

/**
 *     Render Bluetooth Page (渲染蓝牙页面内容)
 */
function renderBluetoothPageContent() {
    const s = window.sysStore;

    // 样式常量
    const labelStyle = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; font-size: 17px; color: #fff; letter-spacing: -0.4px;';
    const inputStyle = 'text-align: right; background: transparent; border: none; color: #007aff; font-size: 17px; width: 100%; outline: none; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;';
    const groupTitleStyle = 'padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;';

    return `
        <div class="profile-header" style="padding-bottom: 10px; background: #000;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="bluetooth-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">语音</div>
                <div class="settings-action" id="bluetooth-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>

        <div class="profile-content" style="padding-top: 0;">
            <!-- 语音服务设置 -->
            <div style="padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 5px;">语音服务 (MiniMax)</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">Group ID</div>
                    <input type="text" class="settings-input" data-key="voice_group_id" placeholder="输入 ID" value="${s.get('voice_group_id') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="voice_api_key" placeholder="输入 Key" value="${s.get('voice_api_key') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">模型</div>
                    <input type="text" class="settings-input" data-key="voice_model" placeholder="speech-01" value="${s.get('voice_model') || 'speech-01'}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">接口域名</div>
                    <input type="text" class="settings-input" data-key="voice_domain" placeholder="api.minimax.chat" value="${s.get('voice_domain') || 'api.minimax.chat'}" style="${inputStyle} color: #8e8e93;">
                </div>
            </div>

            <!-- 测试按钮 -->
            <div style="${groupTitleStyle}">测试</div>
            <div class="settings-group">
                <div class="settings-item" id="btn-test-voice" style="justify-content: center; cursor: pointer;">
                    <div style="width: 100%; text-align: center; font-size: 17px; color: #007aff;">测试语音合成</div>
                </div>
            </div>

            <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 *     Bind Bluetooth Events (绑定蓝牙页面事件)
 */
function bindBluetoothPageEvents(page) {
    // Back
    const backBtn = page.querySelector('#bluetooth-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => {
                page.remove();
            }, 350);
        });
    }

    // Save
    const saveBtn = page.querySelector('#bluetooth-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const s = window.sysStore;
            const allInputs = page.querySelectorAll('[data-key]');
            allInputs.forEach(input => {
                s.set(input.dataset.key, input.value);
            });
            alert('语音设置已保存');
        });
    }

    // Test Voice
    const testBtn = page.querySelector('#btn-test-voice');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const groupId = page.querySelector('[data-key="voice_group_id"]')?.value;
            const apiKey = page.querySelector('[data-key="voice_api_key"]')?.value;
            const model = page.querySelector('[data-key="voice_model"]')?.value || 'speech-01';
            const domain = page.querySelector('[data-key="voice_domain"]')?.value || 'api.minimax.chat';

            if (!groupId || !apiKey) {
                alert('请先填写 Group ID 和 API Key');
                return;
            }

            testBtn.querySelector('div').innerText = '测试中...';

            try {
                const response = await fetch(`https://${domain}/v1/tts/stream?GroupId=${groupId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        text: '你好，语音服务测试成功！',
                        voice_id: 'female-tianmei'
                    })
                });

                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    audio.play();
                    testBtn.querySelector('div').innerText = '播放中...';
                    audio.onended = () => {
                        testBtn.querySelector('div').innerText = '测试语音合成';
                    };
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (e) {
                console.error(e);
                alert('测试失败: ' + e.message);
                testBtn.querySelector('div').innerText = '测试语音合成';
            }
        });
    }
}

/**
 *     Open NovelAI Page (打开图像 [NovelAI] 页面)
 */
function openCellularPage(settingsApp) {
    let cellularPage = settingsApp.querySelector('.cellular-page');

    if (!cellularPage) {
        cellularPage = document.createElement('div');
        cellularPage.className = 'profile-page cellular-page';
        cellularPage.innerHTML = renderCellularPageContent();
        settingsApp.appendChild(cellularPage);

        bindCellularPageEvents(cellularPage);
    }

    requestAnimationFrame(() => {
        cellularPage.classList.add('active');
    });
}

/**
 *     Render NovelAI Page (渲染图像页面内容)
 */
function renderCellularPageContent() {
    const s = window.sysStore;

    const isNovelAI = s.get('novelai_enabled') === 'true';

    // 样式常量
    const labelStyle = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; font-size: 17px; color: #fff; letter-spacing: -0.4px;';
    const inputStyle = 'text-align: right; background: transparent; border: none; color: #007aff; font-size: 17px; width: 100%; outline: none; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;';
    const groupTitleStyle = 'padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;';
    const rowBtnStyle = 'width: 100%; text-align: center; font-size: 17px; background: transparent; border: none; padding: 4px 0; cursor: pointer;';

    return `
        <div class="profile-header" style="padding-bottom: 10px; background: #000;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="cellular-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">图像</div>
                <div class="settings-action" id="cellular-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>

        <div class="profile-content" style="padding-top: 10px;">
            <!-- NovelAI 设置 -->
            <div style="${groupTitleStyle}">图像生成 (NovelAI)</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">启用服务</div>
                    <div class="ios-switch ${isNovelAI ? 'on' : ''}" data-switch="novelai_enabled"><div class="switch-knob"></div></div>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">模型</div>
                    <div class="settings-value" style="font-size:17px; color:#8e8e93;">V4.5 Full</div>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="novelai_key" placeholder="输入 Key" value="${s.get('novelai_key') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
            </div>

            <!-- 操作按钮 -->
            <div style="${groupTitleStyle}">操作</div>
            <div class="settings-group">
                <div class="settings-item" id="btn-novelai-params" style="justify-content: center; cursor: pointer;">
                    <div style="${rowBtnStyle} color: #007aff;">生成参数设置</div>
                </div>
                <div class="settings-item" id="btn-novelai-test" style="justify-content: center; cursor: pointer;">
                    <div style="${rowBtnStyle} color: #007aff;">测试生成</div>
                </div>
            </div>

            <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 *     Bind NovelAI Events (绑定图像页面事件)
 */
function bindCellularPageEvents(page) {
    // Back
    const backBtn = page.querySelector('#cellular-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => {
                page.remove();
            }, 350);
        });
    }

    // Switches
    const switches = page.querySelectorAll('.ios-switch');
    switches.forEach(sw => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('on');
        });
    });

    // Save
    const saveBtn = page.querySelector('#cellular-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const s = window.sysStore;
            const allInputs = page.querySelectorAll('[data-key]');
            allInputs.forEach(input => {
                s.set(input.dataset.key, input.value);
            });

            const allSwitches = page.querySelectorAll('.ios-switch');
            allSwitches.forEach(sw => {
                const key = sw.dataset.switch;
                if (key) s.set(key, sw.classList.contains('on'));
            });

            alert('图像设置已保存');
        });
    }

    // TODO: 生成参数设置和测试生成按钮的功能可以后续实现
}

/**
 *     Open Hotspot Page (打开后台活动页面)
 */
function openHotspotPage(settingsApp) {
    let hotspotPage = settingsApp.querySelector('.hotspot-page');

    if (!hotspotPage) {
        hotspotPage = document.createElement('div');
        hotspotPage.className = 'profile-page hotspot-page';
        hotspotPage.innerHTML = renderHotspotPageContent();
        settingsApp.appendChild(hotspotPage);

        bindHotspotPageEvents(hotspotPage);
    }

    requestAnimationFrame(() => {
        hotspotPage.classList.add('active');
    });
}

/**
 *     Render Hotspot Page (渲染后台活动页面内容)
 */
function renderHotspotPageContent() {
    const s = window.sysStore;

    const isBgActivity = s.get('bg_activity_enabled') === 'true';

    // 样式常量
    const labelStyle = 'flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; font-size: 17px; color: #fff; letter-spacing: -0.4px;';
    const groupTitleStyle = 'padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;';

    return `
        <div class="profile-header" style="padding-bottom: 10px; background: #000;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="hotspot-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">后台活动</div>
                <div class="settings-action" id="hotspot-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>

        <div class="profile-content" style="padding-top: 0;">
            <!-- 后台活动设置 -->
            <div style="padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 5px;">后台与自动化</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">后台活跃</div>
                    <div class="ios-switch ${isBgActivity ? 'on' : ''}" data-switch="bg_activity_enabled"><div class="switch-knob"></div></div>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">检测间隔 (分钟)</div>
                    <input type="number" class="settings-input-small" data-key="bg_check_interval" value="${s.get('bg_check_interval') || '30'}" style="width:50px; text-align:right; background:transparent; border:none; color:#8e8e93; font-size:17px; outline:none;">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">冷却时间 (小时)</div>
                    <input type="number" class="settings-input-small" data-key="bg_cooldown_hours" value="${s.get('bg_cooldown_hours') || '1'}" style="width:50px; text-align:right; background:transparent; border:none; color:#8e8e93; font-size:17px; outline:none;">
                </div>
            </div>

            <!-- 提示信息 -->
            <div style="padding: 15px; font-size: 12px; color: #8e8e93; text-align: center; line-height: 1.5;">
                ⚠️ 开启后台活动会增加 API 费用，请谨慎使用
            </div>
        </div>
    `;
}

/**
 *     Bind Hotspot Events (为后台活动页面绑定交互事件)
 */
function bindHotspotPageEvents(page) {
    // Back
    const backBtn = page.querySelector('#hotspot-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => {
                page.remove();
            }, 350);
        });
    }

    // Switches
    const switches = page.querySelectorAll('.ios-switch');
    switches.forEach(sw => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('on');
        });
    });

    // Save
    const saveBtn = page.querySelector('#hotspot-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const s = window.sysStore;
            const allInputs = page.querySelectorAll('[data-key]');
            allInputs.forEach(input => {
                s.set(input.dataset.key, input.value);
            });

            const allSwitches = page.querySelectorAll('.ios-switch');
            allSwitches.forEach(sw => {
                const key = sw.dataset.switch;
                if (key) s.set(key, sw.classList.contains('on'));
            });

            // 重启后台活动管理器
            if (window.BackgroundActivityManager) {
                const enabled = s.get('bg_activity_enabled') === 'true';
                if (enabled) {
                    window.BackgroundActivityManager.restart();
                } else {
                    window.BackgroundActivityManager.stop();
                }
            }

            alert('后台设置已保存');
        });
    }
}

/**
 *     Render Chat Page (生成聊天设置页面的HTML结构)
 */
function renderChatPageContent() {
    const s = window.sysStore;
    const listLoadCount = s.get('chat_list_load_count') || '20';
    const internalLoadCount = s.get('chat_internal_load_count') || '50';

    return `
        <div class="settings-header">
            <div class="settings-nav" style="display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="chat-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600;">聊天</div>
                <div class="settings-action" id="chat-save-btn" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>
        <div class="settings-content">
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label">聊天列表加载数</div>
                    <input type="number" class="settings-input" data-key="chat_list_load_count" value="${listLoadCount}">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label">聊天内加载数</div>
                    <input type="number" class="settings-input" data-key="chat_internal_load_count" value="${internalLoadCount}">
                </div>
            </div>
            
            <!-- Removed bottom save button for consistency -->
            
             <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 *     Bind Chat Events (为聊天页面绑定交互事件)
 */
function bindChatPageEvents(page) {
    const backBtn = page.querySelector('#chat-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    // Save Logic
    const saveBtn = page.querySelector('#chat-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const s = window.sysStore;
            const inputs = page.querySelectorAll('input[data-key]');
            inputs.forEach(input => {
                s.set(input.dataset.key, input.value);
            });
            alert('聊天设置已保存');
        });
    }
}

/**
 *     Open Chat Page (初始化并打开聊天设置页面)
 */
function openChatPage(app) {
    const page = document.createElement('div');
    page.className = 'settings-page';
    page.innerHTML = renderChatPageContent();

    app.appendChild(page);

    // Slight delay for animation
    requestAnimationFrame(() => {
        page.classList.add('active');
    });

    bindChatPageEvents(page);
}

/* ===========================
   Font Page (字体设置)
   =========================== */

function renderFontPageContent() {
    const s = window.sysStore;
    const activeFontStr = s.get('active_font');
    let activeFont = null;
    try { activeFont = activeFontStr ? JSON.parse(activeFontStr) : null; } catch (e) { }

    const customFontsStr = s.get('custom_fonts') || '[]';
    let customFonts = [];
    try { customFonts = JSON.parse(customFontsStr); } catch (e) { }

    const isSystemActive = !activeFont || activeFont.type === 'system';

    // Style generation
    let styleBlock = '<style>';
    customFonts.forEach(font => {
        if (font.type === 'url' || font.type === 'local') {
            styleBlock += `
                 @font-face {
                     font-family: '${font.name}';
                     src: url('${font.value}');
                     font-display: swap;
                 }
             `;
        }
    });
    styleBlock += '</style>';

    // Custom Fonts List HTML
    let customFontsHtml = '';
    customFonts.forEach(font => {
        const isActive = activeFont && activeFont.id === font.id;
        const checkMark = isActive ? '<span style="color:#007aff; font-weight:bold; font-size:18px; margin-left:10px;">✓</span>' : '';

        customFontsHtml += `
            <div class="settings-item font-item" data-id="${font.id}" style="cursor:pointer;">
                <div class="settings-label" style="font-family: '${font.name}', sans-serif; font-size:16px; flex:1;">${font.name}</div>
                ${checkMark}
                <div class="delete-font-btn" data-id="${font.id}" style="
                    margin-left: 15px;
                    width: 24px; height: 24px; 
                    background: #ff3b30; border-radius: 50%; 
                    color: white; display: flex; align-items: center; justify-content: center; 
                    font-size: 16px; font-weight: bold;
                    opacity: 0.8;">-</div>
            </div>
        `;
    });

    const previewText = "CharaOS\n敏捷的棕色狐狸跳过了懒狗。\n1234567890";

    return `
        ${styleBlock}
        <div class="settings-header">
            <div class="settings-nav">
                <div class="settings-back" id="font-back">
                    <svg viewBox="0 0 12 20"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title">字体</div>
                <div class="settings-action" id="add-font-btn-header">保存</div>
            </div>
        </div>
        <div class="settings-content">
            
            <div class="settings-title-small" style="margin: 20px 0 5px 16px; font-size:13px; color:#6d6d72; text-transform:uppercase;">预览 (Preview)</div>
            <div class="settings-group" style="padding: 20px; display:flex; justify-content:center; align-items:center;">
                <textarea class="font-preview" style="width:100%; height:80px; border:none; background:transparent; font-size:22px; color:inherit; resize:none; line-height:1.4; text-align:center; font-family:inherit; outline:none;">${previewText}</textarea>
            </div>

            <div class="settings-title-small" style="margin: 20px 0 5px 16px; font-size:13px; color:#6d6d72; text-transform:uppercase;">选择字体 (Select Font)</div>
            <div class="settings-group" id="custom-fonts-list">
                <!-- System Default -->
                <div class="settings-item font-system-item" data-type="system" style="cursor:pointer;">
                    <div class="settings-label" style="flex:1;">系统默认 (System)</div>
                    ${isSystemActive ? '<span style="color:#007aff; font-weight:bold; font-size:18px;">✓</span>' : ''}
                </div>
                <!-- Custom Fonts -->
                ${customFontsHtml}
            </div>

            <div class="settings-title-small" style="margin: 20px 0 5px 16px; font-size:13px; color:#6d6d72; text-transform:uppercase;">添加新字体 (Import)</div>
            <div class="settings-group">
                <div class="settings-item">
                    <div class="settings-label" style="width:60px;">名称</div>
                    <input type="text" class="settings-input" id="new-font-name" placeholder="Font Name" style="text-align:right;">
                </div>
                
                <div class="settings-item">
                    <div class="settings-label" style="width:60px;">URL</div>
                    <input type="text" class="settings-input" id="new-font-url" placeholder="https://..." style="text-align:right;">
                </div>

                <div class="settings-item" id="upload-trigger" style="cursor:pointer;">
                    <div class="settings-label">上传文件</div>
                    <div class="settings-value" id="file-name-display" style="color:#8e8e93; margin-right:5px;">未选择</div>
                    <input type="file" id="new-font-file" accept=".ttf,.otf,.woff,.woff2" style="display:none;">
                    <div class="settings-chevron">›</div>
                </div>
            </div>
            
            <div class="profile-signout" id="add-font-btn" style="margin-top: 20px; color: #007aff;">
                添加字体
            </div>

            <div style="height: 50px;"></div>
        </div>
    `;
}

function bindFontPageEvents(page) {
    const backBtn = page.querySelector('#font-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    const s = window.sysStore;
    const refresh = () => {
        const newContent = renderFontPageContent();
        page.innerHTML = newContent;
        bindFontPageEvents(page);
    };

    // System Selection
    const sysItem = page.querySelector('.font-system-item');
    if (sysItem) {
        sysItem.addEventListener('click', () => {
            const fontData = { type: 'system', value: 'system-ui', name: 'System Default' };
            s.set('active_font', JSON.stringify(fontData));
            if (window.os && window.os.applyFont) window.os.applyFont(fontData);
            refresh();
        });
    }

    // Custom Font Selection & Deletion
    const customItems = page.querySelectorAll('.font-item');
    customItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-font-btn')) {
                e.stopPropagation();
                const id = e.target.dataset.id;
                if (confirm('确定删除该字体吗？')) {
                    let fonts = JSON.parse(s.get('custom_fonts') || '[]');
                    fonts = fonts.filter(f => f.id !== id);
                    s.set('custom_fonts', JSON.stringify(fonts));

                    const active = JSON.parse(s.get('active_font') || '{}');
                    if (active && active.id === id) {
                        const def = { type: 'system', value: 'system-ui', name: 'System Default' };
                        s.set('active_font', JSON.stringify(def));
                        if (window.os && window.os.applyFont) window.os.applyFont(def);
                    }
                    refresh();
                }
                return;
            }

            const id = item.dataset.id;
            let fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const font = fonts.find(f => f.id === id);
            if (font) {
                s.set('active_font', JSON.stringify(font));
                if (window.os && window.os.applyFont) window.os.applyFont(font);
                refresh();
            }
        });
    });

    // File Upload UI Logic
    const uploadTrigger = page.querySelector('#upload-trigger');
    const fileInput = page.querySelector('#new-font-file');
    const fileNameDisplay = page.querySelector('#file-name-display');

    if (uploadTrigger && fileInput) {
        uploadTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                if (fileNameDisplay) fileNameDisplay.textContent = fileInput.files[0].name;
            } else {
                if (fileNameDisplay) fileNameDisplay.textContent = '未选择';
            }
        });
        fileInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // Add Font (Both bottom and header button)
    const addBtn = page.querySelector('#add-font-btn');
    const addBtnHeader = page.querySelector('#add-font-btn-header');
    [addBtn, addBtnHeader].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', async () => {
                const nameInput = page.querySelector('#new-font-name');
                const urlInput = page.querySelector('#new-font-url');

                const name = nameInput.value.trim();
                const url = urlInput.value.trim();
                const file = fileInput ? fileInput.files[0] : null;

                if (!name) { alert('请输入字体名称'); return; }
                if (!url && !file) { alert('请输入 URL 或上传文件'); return; }

                let fontValue = url;
                let type = 'url';

                if (file) {
                    try {
                        fontValue = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                        type = 'local';
                    } catch (e) {
                        alert('文件读取失败');
                        return;
                    }
                }

                const newFont = {
                    id: 'font_' + Date.now(),
                    name: name,
                    type: type,
                    value: fontValue
                };

                let fonts = JSON.parse(s.get('custom_fonts') || '[]');
                fonts.push(newFont);
                s.set('custom_fonts', JSON.stringify(fonts));

                s.set('active_font', JSON.stringify(newFont));
                if (window.os && window.os.applyFont) window.os.applyFont(newFont);

                alert('添加成功');
                refresh();
            });
        }
    });
}

function openFontPage(app) {
    const s = window.sysStore;
    const isDark = s.get('dark_mode') !== 'false';
    const page = document.createElement('div');
    page.className = `settings-page font-settings-wrapper ${isDark ? 'force-dark' : ''}`;
    page.innerHTML = renderFontPageDesignV5();
    app.appendChild(page);
    requestAnimationFrame(() => {
        page.classList.add('active');
    });
    bindFontPageDesignEventsV5(page);
}

/**
 *     Render Profile Page (生成个人资料页面的HTML结构)
 */
const Service = {
    // ImgBB 上传
    async uploadToImgBB(file, apiKey) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                return data.data.url;
            } else {
                throw new Error(data.error ? data.error.message : 'Upload failed');
            }
        } catch (e) {
            console.error('ImgBB Upload Error:', e);
            throw e;
        }
    },

    // GitHub 备份
    async backupToGithub(token, user, repo, filename, content) {
        const path = `https://api.github.com/repos/${user}/${repo}/contents/${filename}`;

        // 1. 获取现有文件的 SHA (如果存在) 以便更新
        let sha = '';
        try {
            const checkRes = await fetch(path, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                sha = checkData.sha;
            }
        } catch (e) { /* ignore */ }

        // 2. 上传新内容 (Base64 编码)
        // 处理中文编码问题
        const base64Content = btoa(unescape(encodeURIComponent(content)));

        const body = {
            message: `Backup from CharaOS - ${new Date().toLocaleString()}`,
            content: base64Content
        };
        if (sha) body.sha = sha;

        const res = await fetch(path, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Backup failed');
        }
        return true;
    },

    // GitHub 恢复
    async restoreFromGithub(token, user, repo, filename) {
        const path = `https://api.github.com/repos/${user}/${repo}/contents/${filename}`;
        const res = await fetch(path, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            throw new Error('File not found or access denied');
        }

        const data = await res.json();
        // content 是 base64，可能有换行
        const cleanContent = data.content.replace(/\n/g, '');
        // 解码
        try {
            const jsonStr = decodeURIComponent(escape(atob(cleanContent)));
            return JSON.parse(jsonStr);
        } catch (e) {
            throw new Error('Failed to parse backup file');
        }
    }
};

function renderProfilePageContent() {
    const currentAvatar = window.sysStore.get('user_avatar') || '';
    const avatarHtml = currentAvatar ?
        `<img src="${currentAvatar}" alt="Profile" id="profile-page-avatar-img">` :
        ICONS.person;

    // 获取开关状态
    const s = window.sysStore;
    const isImgBB = s.get('imgbb_enabled') === 'true';
    const isCatbox = s.get('catbox_enabled') === 'true';
    const isGithub = s.get('github_enabled') === 'true';
    const isProxy = s.get('proxy_enabled') === 'true';
    const isAutoBackup = s.get('autobackup_enabled') === 'true';

    // 样式修复：使用半透明背景和合适的文字颜色
    // 样式修复：增加顶部 margin 防止粘连
    const infoBoxStyle = 'background: rgba(142, 142, 147, 0.12); border-radius: 10px; padding: 12px; margin: 10px 15px 15px 15px; font-size: 13px; color: #8e8e93; line-height: 1.4;';
    const linkStyle = 'color: #0a84ff; text-decoration: none;';

    const userName = s.get('user_name') || 'Chara User';
    const userEmail = s.get('user_email') || 'chara@example.com';

    return `
        <div class="profile-header">
            <div class="settings-nav" style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px;">
                <div class="settings-back" id="profile-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600;">Apple ID</div>
                <div style="width: 70px;"></div>
            </div>
            <div class="profile-avatar" id="btn-upload-avatar">
                ${avatarHtml}
                <input type="file" id="avatar-upload-input" accept="image/*" style="display: none;">
                <div class="profile-avatar-edit-hint" style="position:absolute; bottom:0; right:0; background:#007aff; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px; border:2px solid #1c1c1e;">+</div>
            </div>
            <div class="profile-header-name" id="edit-profile-name" style="cursor: pointer;">${userName}</div>
            <div class="profile-header-email" id="edit-profile-email" style="cursor: pointer;">${userEmail}</div>
        </div>
        
        <div class="profile-content">
            <!-- ImgBB 设置 -->
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="font-weight: 500;">ImgBB 图床</div>
                    <div class="ios-switch ${isImgBB ? 'on' : ''}" data-switch="imgbb_enabled" data-target="imgbb-details"><div class="switch-knob"></div></div>
                </div>
                <div id="imgbb-details" style="display: ${isImgBB ? 'block' : 'none'};">
                    <div style="${infoBoxStyle}">
                        开启后，本地图片将自动上传到 ImgBB 图床以减小体积。<br>
                        <span style="color:#ff9f0a;">⚠️</span> 图片将上传到公共互联网，请勿上传私密照片！<br>
                        <a href="https://api.imgbb.com/" target="_blank" style="${linkStyle}">🔗 点击此处注册并获取 API Key</a>
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label">API Key</div>
                        <input type="text" class="settings-input" data-key="imgbb_key" placeholder="输入 ImgBB Key" value="${s.get('imgbb_key') || ''}">
                    </div>
                </div>

            <!-- Catbox 设置 -->
                <div class="settings-item no-icon">
                    <div class="settings-label" style="font-weight: 500;">Catbox 托管</div>
                    <div class="ios-switch ${isCatbox ? 'on' : ''}" data-switch="catbox_enabled" data-target="catbox-details"><div class="switch-knob"></div></div>
                </div>
                <div id="catbox-details" style="display: ${isCatbox ? 'block' : 'none'};">
                     <div style="${infoBoxStyle}">
                        开启后，歌曲文件将上传到 Catbox.moe 托管。<br>
                        <a href="https://catbox.moe/user/manage.php" target="_blank" style="${linkStyle}">🔗 登录 Catbox 查看 User Hash</a>
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label">User Hash</div>
                        <input type="text" class="settings-input" data-key="catbox_hash" placeholder="输入 User Hash (可选)" value="${s.get('catbox_hash') || ''}">
                    </div>
                </div>

            <!-- GitHub 备份 -->
                <div class="settings-item no-icon">
                    <div class="settings-label" style="font-weight: 500;">GitHub 云备份</div>
                    <div class="ios-switch ${isGithub ? 'on' : ''}" data-switch="github_enabled" data-target="github-details"><div class="switch-knob"></div></div>
                </div>
                <div id="github-details" style="display: ${isGithub ? 'block' : 'none'};">
                    <div style="${infoBoxStyle}">
                        将数据备份到私有 GitHub 仓库，方便跨设备同步。<br>
                        1. <a href="https://github.com/new" target="_blank" style="${linkStyle}">创建新仓库</a> (建议设为 Private)<br>
                        2. <a href="https://github.com/settings/tokens" target="_blank" style="${linkStyle}">获取 Token</a> (必须勾选 <span style="color:#ff453a;">repo</span> 权限)
                    </div>
                    
                    <div class="settings-item no-icon">
                        <div class="settings-label">自动备份 (分钟)</div>
                        <div style="flex:1; display:flex; justify-content:flex-end; align-items:center; gap:10px;">
                            <input type="number" class="settings-input-small" data-key="autobackup_interval" value="${s.get('autobackup_interval') || '30'}">
                            <div class="ios-switch ${isAutoBackup ? 'on' : ''}" data-switch="autobackup_enabled"><div class="switch-knob"></div></div>
                        </div>
                    </div>

                    <div class="settings-item no-icon">
                        <div class="settings-label">用户名</div>
                        <input type="text" class="settings-input" data-key="github_user" placeholder="如: yourname" value="${s.get('github_user') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label">仓库名</div>
                        <input type="text" class="settings-input" data-key="github_repo" placeholder="如: my-backup" value="${s.get('github_repo') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label">Token</div>
                        <input type="password" class="settings-input" data-key="github_token" placeholder="ghp_xxxxxxxxxxxx" value="${s.get('github_token') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label">文件名</div>
                        <div class="settings-value" style="color: #8e8e93;">chara_backup.json</div>
                    </div>
                    
                    <!-- 代理 (嵌套在 Github 设置中) -->
                    <div class="settings-item no-icon">
                        <div class="settings-label">代理 (Worker)</div>
                        <div class="ios-switch ${isProxy ? 'on' : ''}" data-switch="proxy_enabled" data-target="proxy-details"><div class="switch-knob"></div></div>
                    </div>
                    <div id="proxy-details" style="display: ${isProxy ? 'block' : 'none'};">
                        <div style="${infoBoxStyle}">
                            国内网络建议开启。<br>
                            <a href="#" style="${linkStyle}">🔗 前往 Cloudflare 控制台</a>
                        </div>
                        <div class="settings-item no-icon">
                            <div class="settings-label">代理地址</div>
                            <input type="text" class="settings-input" data-key="proxy_url" placeholder="https://..." value="${s.get('proxy_url') || ''}">
                        </div>
                    </div>

                    <br>
                    <div style="display: flex; gap: 15px; margin: 0 15px 15px 15px;">
                        <div class="profile-signout" id="btn-backup-upload" style="flex:1; margin-top:0; background:rgba(255,255,255,0.1); color:#0a84ff; font-size: 15px; padding: 10px; cursor: pointer;">
                            ☁️ 上传备份
                        </div>
                        <div class="profile-signout" id="btn-backup-download" style="flex:1; margin-top:0; background:rgba(255,255,255,0.1); color:#0a84ff; font-size: 15px; padding: 10px; cursor: pointer;">
                            📥 恢复备份
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 *     Bind Profile Events (绑定个人页面事件)
 */
function bindProfilePageEvents(profilePage) {
    // 返回按钮
    const backBtn = profilePage.querySelector('#profile-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            profilePage.classList.remove('active');
            setTimeout(() => {
                profilePage.remove();
            }, 350);
        });
    }

    // 头像上传逻辑
    const uploadBtn = profilePage.querySelector('#btn-upload-avatar');
    const fileInput = profilePage.querySelector('#avatar-upload-input');

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 显示上传中状态 (可选)
            const originalContent = uploadBtn.innerHTML;
            // uploadBtn.innerHTML = '...'; 

            let finalUrl = '';

            // 检查是否启用 ImgBB
            const isImgBB = window.sysStore.get('imgbb_enabled') === 'true';
            const imgBBKey = window.sysStore.get('imgbb_key');

            if (isImgBB && imgBBKey) {
                try {
                    console.log('Uploading to ImgBB...');
                    finalUrl = await Service.uploadToImgBB(file, imgBBKey);
                    console.log('ImgBB Upload Success:', finalUrl);
                } catch (err) {
                    console.error('ImgBB Upload Failed, falling back to base64:', err);
                    alert('图床上传失败，转为本地存储。错误: ' + err.message);
                }
            }

            // 如果 ImgBB 失败或未启用，使用 FileReader 转 base64
            if (!finalUrl) {
                await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        finalUrl = ev.target.result;
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }

            // 更新 Store 和 UI
            window.sysStore.set('user_avatar', finalUrl);
            const profileImg = document.getElementById('profile-page-avatar-img');

            // 辅助函数：更新图片 DOM
            const updateImgDom = (imgId, containerId, src) => {
                const img = document.getElementById(imgId);
                if (img) img.src = src;
                else {
                    const container = document.getElementById(containerId);
                    if (container) {
                        // 保留 input
                        const input = container.querySelector('input');
                        container.innerHTML = `<img src="${src}" alt="Profile" id="${imgId}">`;
                        if (input) container.appendChild(input);
                    }
                }
            };

            updateImgDom('profile-page-avatar-img', 'btn-upload-avatar', finalUrl);
            updateImgDom('settings-main-avatar-img', 'settings-main-avatar', finalUrl);
        });
    }

    // 修改名字事件
    const nameEl = profilePage.querySelector('#edit-profile-name');
    if (nameEl) {
        nameEl.addEventListener('click', () => {
            const current = window.sysStore.get('user_name') || 'Chara User';
            const newName = prompt('请输入新名字:', current);
            if (newName && newName.trim() !== '') {
                window.sysStore.set('user_name', newName.trim());
                nameEl.textContent = newName.trim();
                // 更新主页（如果在）
                const homeName = document.getElementById('home-profile-name');
                if (homeName) homeName.textContent = newName.trim();
            }
        });
    }

    // 修改邮箱事件
    const emailEl = profilePage.querySelector('#edit-profile-email');
    if (emailEl) {
        emailEl.addEventListener('click', () => {
            const current = window.sysStore.get('user_email') || 'chara@example.com';
            const newEmail = prompt('请输入新邮箱 (Apple ID):', current);
            if (newEmail && newEmail.trim() !== '') {
                window.sysStore.set('user_email', newEmail.trim());
                emailEl.textContent = newEmail.trim();
            }
        });
    }

    // 处理所有开关
    const switches = profilePage.querySelectorAll('.ios-switch');
    switches.forEach(sw => {
        sw.addEventListener('click', (e) => {
            e.stopPropagation();
            sw.classList.toggle('on');
            const isOn = sw.classList.contains('on');

            const key = sw.dataset.switch;
            if (key) window.sysStore.set(key, isOn);

            const targetId = sw.dataset.target;
            if (targetId) {
                const targetEl = profilePage.querySelector(`#${targetId}`);
                if (targetEl) targetEl.style.display = isOn ? 'block' : 'none';
            }
        });
    });

    // 处理输入框保存 (实时保存)
    const inputs = profilePage.querySelectorAll('input[type="text"], input[type="password"], input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const key = input.dataset.key;
            if (key) {
                window.sysStore.set(key, input.value);
            }
        });
    });

    // 绑定备份按钮
    const btnBackup = profilePage.querySelector('#btn-backup-upload');
    if (btnBackup) {
        btnBackup.addEventListener('click', async () => {
            const s = window.sysStore;
            const token = s.get('github_token');
            const user = s.get('github_user');
            const repo = s.get('github_repo');

            if (!token || !user || !repo) {
                alert('请先填写 GitHub 用户名、仓库名和 Token');
                return;
            }

            btnBackup.textContent = '⏳ 上传中...';
            try {
                // 收集数据: 导出 localStorage
                const data = JSON.stringify(localStorage);
                await Service.backupToGithub(token, user, repo, 'ephone_backup.json', data);
                alert('✅ 备份成功！');
            } catch (e) {
                alert('❌ 备份失败: ' + e.message);
            } finally {
                btnBackup.textContent = '☁️ 上传备份';
            }
        });
    }

    // 绑定恢复按钮
    const btnRestore = profilePage.querySelector('#btn-backup-download');
    if (btnRestore) {
        btnRestore.addEventListener('click', async () => {
            const s = window.sysStore;
            const token = s.get('github_token');
            const user = s.get('github_user');
            const repo = s.get('github_repo');

            if (!token || !user || !repo) {
                alert('请先填写 GitHub 用户名、仓库名和 Token');
                return;
            }

            if (!confirm('⚠️ 恢复备份将覆盖当前所有数据，确定继续吗？')) return;

            btnRestore.textContent = '⏳ 下载中...';
            try {
                const data = await Service.restoreFromGithub(token, user, repo, 'ephone_backup.json');
                // 恢复数据
                window.sysStore.clear(); // 先清空? 或者合并? 通常恢复是覆盖
                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, data[key]);
                });
                alert('✅ 恢复成功！即将刷新页面...');
                location.reload();
            } catch (e) {
                alert('❌ 恢复失败: ' + e.message);
            } finally {
                btnRestore.textContent = '📥 恢复备份';
            }
        });
    }
}

// 渲染 Wi-Fi (API) 页面内容
// 渲染 Wi-Fi (API) 页面内容
function renderWifiPageContent() {
    const s = window.sysStore;
    const tempValue = s.get('api_temperature') || '0.7';
    // pct for initial slider gradient
    const pct = (parseFloat(tempValue) / 2) * 100;

    // JS Dark Mode Check for robust initial render
    const isDark = s.get('dark_mode') !== 'false';
    const darkClass = isDark ? 'force-dark' : '';

    return `
        <div class="wifi-page-wrapper ${darkClass}">
            <style>
                .wifi-page-wrapper {
                    --wp-bg: #f2f2f7;
                    --wp-nav-bg: #f2f2f7;
                    --wp-nav-text: #000;
                    --wp-text: #000;
                    --wp-subtext: #8e8e93;
                    --wp-btn-bg: rgba(118, 118, 128, 0.12);
                    --wp-btn-text: #007aff;
                    --wp-input-text: #007aff;
                    --wp-input-ph: #8e8e93;
                    --wp-slider-track: #e5e5ea;
                    --wp-border: rgba(60, 60, 67, 0.29);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                .wifi-page-wrapper.force-dark {
                    --wp-bg: #000000;
                    --wp-nav-bg: #000000;
                    --wp-nav-text: #fff;
                    --wp-text: #fff;
                    --wp-subtext: #8e8e93;
                    --wp-btn-bg: #2c2c2e;
                    --wp-btn-text: #0a84ff;
                    --wp-input-text: #0a84ff;
                    --wp-input-ph: #636366;
                    --wp-slider-track: #3a3a3c;
                    --wp-border: #38383a;
                }
                
                .wifi-profile-content {
                    background-color: var(--wp-bg) !important;
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-top: 0;
                    padding-bottom: 50px;
                }
                
                .wifi-header {
                    padding-bottom: 10px;
                    background: var(--wp-nav-bg) !important;
                    transition: background 0.3s;
                }
                .wifi-nav {
                    display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;
                }
                .wifi-title {
                    font-size: 17px; font-weight: 600; color: var(--wp-nav-text) !important;
                }
                
                .wifi-group-title {
                    padding: 0 15px 8px 15px; font-size: 13px; color: var(--wp-subtext); text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;
                }
                
                .wifi-label {
                    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; font-size: 17px; color: var(--wp-text) !important; letter-spacing: -0.4px;
                }
                
                .wifi-input {
                    text-align: right; background: transparent; border: none; 
                    color: var(--wp-input-text) !important; 
                    font-size: 17px; width: 100%; outline: none; padding: 0; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .wifi-input::placeholder { color: var(--wp-input-ph) !important; }
                
                .wifi-pull-btn {
                    margin:0; padding: 4px 12px; font-size:13px; 
                    background: var(--wp-btn-bg) !important; 
                    color: var(--wp-btn-text) !important; 
                    border-radius: 14px; cursor: pointer; border:none; font-weight:600; white-space: nowrap;
                }
                
                /* Slider */
                .wifi-slider {
                    width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none;
                    background: linear-gradient(to right, #007aff 0%, #007aff ${pct}%, var(--wp-slider-track) ${pct}%, var(--wp-slider-track) 100%);
                }
                
                .wifi-row-btn {
                     width: 100%; text-align: center; font-size: 17px; background: transparent; border: none; padding: 4px 0; cursor: pointer;
                }
            </style>

            <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; sticky; top: 0; z-index: 100;">
                <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                    <div class="settings-back" id="wifi-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                        <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                    </div>
                    <div class="settings-title wifi-title" style="flex: 1; text-align: center; color: #fff;">Wi-Fi</div>
                    <div class="settings-action" id="wifi-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
                </div>
            </div>

            <div class="profile-content wifi-profile-content">
                <!-- 1. 主 API -->
                <div class="wifi-group-title" style="margin-top: 5px;">主 API (聊天)</div>
                <div class="settings-group">
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">反代地址</div>
                        <input type="text" class="settings-input wifi-input" data-key="main_api_url" placeholder="https://api.openai.com/v1" value="${s.get('main_api_url') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">API Key</div>
                        <input type="password" class="settings-input wifi-input" data-key="main_api_key" placeholder="sk-..." value="${s.get('main_api_key') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">模型</div>
                        <div style="flex: 0 0 auto; display:flex; gap:10px; align-items: center; width: 60%; justify-content: flex-end;">
                            <div id="main-model-container" style="flex: 1; display:flex; justify-content: flex-end;">
                                <input type="text" class="settings-input wifi-input" data-key="main_model" placeholder="gpt-4o" value="${s.get('main_model') || ''}">
                            </div>
                            <button class="profile-signout wifi-pull-btn" id="btn-pull-models">拉取</button>
                        </div>
                    </div>
                </div>

                <!-- 2. 副 API -->
                <div class="wifi-group-title">副 API (摘要 & 记忆)</div>
                <div class="settings-group">
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">反代地址</div>
                        <input type="text" class="settings-input wifi-input" data-key="sub_api_url" placeholder="留空默认" value="${s.get('sub_api_url') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">API Key</div>
                        <input type="password" class="settings-input wifi-input" data-key="sub_api_key" placeholder="可选" value="${s.get('sub_api_key') || ''}">
                    </div>
                    <div class="settings-item no-icon">
                        <div class="settings-label wifi-label">模型</div>
                        <div style="flex: 0 0 auto; display:flex; gap:10px; align-items: center; width: 60%; justify-content: flex-end;">
                             <div id="sub-model-container" style="flex: 1; display:flex; justify-content: flex-end;">
                                <input type="text" class="settings-input wifi-input" data-key="sub_model" placeholder="gpt-3.5-turbo" value="${s.get('sub_model') || ''}">
                            </div>
                            <button class="profile-signout wifi-pull-btn" id="btn-pull-sub-models">拉取</button>
                        </div>
                    </div>
                </div>

                <!-- 3. 模型参数 -->
                <div class="wifi-group-title">模型参数</div>
                <div class="settings-group">
                    <div class="settings-item no-icon" style="flex-direction: column; align-items: stretch; padding: 15px 15px;">
                        <div style="display:flex; justify-content: space-between; margin-bottom: 12px;">
                            <span class="wifi-label">随机性 (Temperature)</span>
                            <span id="temp-display" style="color:var(--wp-subtext); font-size: 17px; font-variant-numeric: tabular-nums;">${tempValue}</span>
                        </div>
                        <input type="range" class="ios-slider wifi-slider" id="api-temp-slider" min="0" max="2" step="0.1" value="${tempValue}">
                    </div>
                </div>

                <!-- 4. API 预设 -->
                <div class="wifi-group-title">API 预设</div>
                <div class="settings-group">
                    <div class="settings-item" style="position: relative; cursor: pointer;" id="preset-row">
                        <div class="settings-label wifi-label">加载预设</div>
                        <input type="hidden" id="preset-selector-value" value="">
                        <div id="preset-display" style="text-align: right; color: var(--wp-subtext); font-size: 17px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">选择预设...</div>
                        <svg viewBox="0 0 8 13" width="8" height="13" style="fill: #c7c7cc; margin-left: 8px;"><path d="M1.5 1L0 2.5l4 4-4 4L1.5 12l5.5-5.5z"/></svg>
                    </div>
                     <div class="settings-item">
                         <div class="settings-label wifi-label">保存为</div>
                         <input type="text" class="settings-input wifi-input" id="new-preset-name" placeholder="新预设名称">
                    </div>
                    <div class="settings-item" id="btn-save-preset" style="justify-content: center;">
                        <div class="wifi-row-btn" style="color: #007aff;">保存当前配置为预设</div>
                    </div>
                    <div class="settings-item" id="btn-del-preset" style="justify-content: center;">
                        <div class="wifi-row-btn" style="color: #ff3b30;">删除选中预设</div>
                    </div>
                </div>

                <div style="height: 50px;"></div>
            </div>
        </div>
    `;
}
/* const groupTitleStyle = 'padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;';
const rowBtnStyle = 'width: 100%; text-align: center; font-size: 17px; background: transparent; border: none; padding: 4px 0; cursor: pointer;';
 
return `
        <div class="profile-header" style="padding-bottom: 10px; background: #000;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 15px; height: 44px;">
                <div class="settings-back" id="wifi-back" style="display: flex; align-items: center; gap: 4px; color: #007aff; font-size: 17px; cursor: pointer; padding: 10px 0;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                    <span>设置</span>
                </div>
                <div class="settings-title" style="font-size: 17px; font-weight: 600; color: #fff;">Wi-Fi</div>
                <div class="settings-action" id="wifi-save" style="color: #007aff; font-size: 17px; font-weight: 600; cursor: pointer; padding: 10px 0;">保存</div>
            </div>
        </div>
 
        <div class="profile-content" style="padding-top: 0;">
            <!-- 1. 主 API -->
            <div style="padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 5px;">主 API (聊天)</div>
            <div class="settings-group">
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">反代地址</div>
                    <input type="text" class="settings-input" data-key="main_api_url" placeholder="https://api.openai.com/v1" value="${s.get('main_api_url') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="main_api_key" placeholder="sk-..." value="${s.get('main_api_key') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">模型</div>
                    <div style="flex: 0 0 auto; display:flex; gap:10px; align-items: center; width: 60%; justify-content: flex-end;">
                        <div id="main-model-container" style="flex: 1; display:flex; justify-content: flex-end;">
                            <input type="text" class="settings-input" data-key="main_model" placeholder="gpt-4o" value="${s.get('main_model') || ''}" style="${inputStyle} width: 100%; color: #8e8e93;">
                        </div>
                        <button class="profile-signout" id="btn-pull-models" style="margin:0; padding: 4px 12px; font-size:13px; background:#2c2c2e; color:#007aff; border-radius: 14px; cursor: pointer; border:none; font-weight:600; white-space: nowrap;">拉取</button>
                    </div>
                </div>
            </div>
 
            <!-- 2. 副 API -->
            <div style="${groupTitleStyle}">副 API (摘要 & 记忆)</div>
            <div class="settings-group">
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">反代地址</div>
                    <input type="text" class="settings-input" data-key="sub_api_url" placeholder="留空默认" value="${s.get('sub_api_url') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="sub_api_key" placeholder="可选" value="${s.get('sub_api_key') || ''}" style="${inputStyle} color: #8e8e93;">
                </div>
                <div class="settings-item">
                    <div class="settings-label" style="${labelStyle}">模型</div>
                    <div style="flex: 0 0 auto; display:flex; gap:10px; align-items: center; width: 60%; justify-content: flex-end;">
                         <div id="sub-model-container" style="flex: 1; display:flex; justify-content: flex-end;">
                            <input type="text" class="settings-input" data-key="sub_model" placeholder="gpt-3.5-turbo" value="${s.get('sub_model') || ''}" style="${inputStyle} width: 100%; color: #8e8e93;">
                        </div>
                        <button class="profile-signout" id="btn-pull-sub-models" style="margin:0; padding: 4px 12px; font-size:13px; background:#2c2c2e; color:#007aff; border-radius: 14px; cursor: pointer; border:none; font-weight:600; white-space: nowrap;">拉取</button>
                    </div>
                </div>
            </div>
 
            <!-- 3. 模型参数 -->
            <div style="${groupTitleStyle}">模型参数</div>
            <div class="settings-group">
                <div class="settings-item" style="flex-direction: column; align-items: stretch; padding: 15px 15px;">
                    <div style="display:flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="font-size: 17px; color: #fff;">随机性 (Temperature)</span>
                        <span id="temp-display" style="color:#8e8e93; font-size: 17px; font-variant-numeric: tabular-nums;">${tempValue}</span>
                    </div>
                    <input type="range" class="ios-slider" id="api-temp-slider" min="0" max="2" step="0.1" value="${tempValue}" 
                        style="width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none; background: linear-gradient(to right, #007aff 0%, #007aff ${tempValue / 2 * 100}%, #3a3a3c ${tempValue / 2 * 100}%, #3a3a3c 100%);">
                </div>
            </div>
 
            <!-- 4. API 预设 -->
            <div style="${groupTitleStyle}">API 预设</div>
            <div class="settings-group">
                <div class="settings-item" style="position: relative; cursor: pointer;" id="preset-row">
                    <div class="settings-label" style="${labelStyle}">加载预设</div>
                    <input type="hidden" id="preset-selector-value" value="">
                    <div id="preset-display" style="text-align: right; color: #8e8e93; font-size: 17px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">选择预设...</div>
                    <svg viewBox="0 0 8 13" width="8" height="13" style="fill: #c7c7cc; margin-left: 8px;"><path d="M1.5 1L0 2.5l4 4-4 4L1.5 12l5.5-5.5z"/></svg>
                </div>
                 <div class="settings-item">
                     <div class="settings-label" style="${labelStyle}">保存为</div>
                     <input type="text" class="settings-input" id="new-preset-name" placeholder="新预设名称" style="${inputStyle} color: #fff;">
                </div>
                <div class="settings-item" id="btn-save-preset" style="justify-content: center;">
                    <div style="${rowBtnStyle} color: #007aff;">保存当前配置为预设</div>
                </div>
                <div class="settings-item" id="btn-del-preset" style="justify-content: center;">
                    <div style="${rowBtnStyle} color: #ff3b30;">删除选中预设</div>
                </div>
            </div>
 
            <div style="height: 50px;"></div>
        </div>
    `;
} */

function bindWifiPageEvents(page) {
    // Back
    const backBtn = page.querySelector('#wifi-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => {
                page.remove();
            }, 350);
        });
    }

    // Switches
    const switches = page.querySelectorAll('.ios-switch');
    switches.forEach(sw => {
        sw.addEventListener('click', () => {
            sw.classList.toggle('on');
        });
    });

    // Temperature Slider
    const tempSlider = page.querySelector('#api-temp-slider');
    const tempDisplay = page.querySelector('#temp-display');
    if (tempSlider && tempDisplay) {
        const updateSliderBg = (val) => {
            const percent = (val / 2) * 100;
            tempSlider.style.setProperty('background', `linear-gradient(to right, #007aff 0%, #007aff ${percent}%, var(--wp-slider-track, #3a3a3c) ${percent}%, var(--wp-slider-track, #3a3a3c) 100%)`, 'important');
        };

        tempSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            tempDisplay.textContent = val;
            updateSliderBg(val);
        });

        // Initial sync
        updateSliderBg(tempSlider.value);
    }

    // Pull Models Logic
    const bindPullBtn = (btnId, urlKey, keyKey, containerId, modelInputKey) => {
        const btn = page.querySelector('#' + btnId);
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const urlInput = page.querySelector(`[data-key="${urlKey}"]`);
            const keyInput = page.querySelector(`[data-key="${keyKey}"]`);

            const baseUrl = urlInput ? urlInput.value.trim() : '';
            const key = keyInput ? keyInput.value.trim() : '';

            if (!baseUrl || !key) {
                alert('请先填写完整的 API 地址和 Key');
                return;
            }

            const btnText = btn.innerText;
            btn.innerText = '...';

            try {
                const cleanUrl = baseUrl.replace(/\/$/, '');
                const targetUrl = cleanUrl.endsWith('/v1') ? `${cleanUrl}/models` : `${cleanUrl}/v1/models`;

                const res = await fetch(targetUrl, {
                    headers: { 'Authorization': `Bearer ${key}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const models = data.data || [];
                    const cleanName = (name) => name.replace(/\[.*?\]/g, '').replace(/【.*?】/g, '').trim();

                    const container = page.querySelector('#' + containerId);
                    if (container) {
                        const currentInput = container.querySelector('input, select, .model-display');
                        const existingVal = currentInput ? (currentInput.value || currentInput.innerText) : '';
                        let currentVal = existingVal === '选择模型...' ? '' : existingVal;

                        if (!currentVal && models.length > 0) currentVal = models[0].id;

                        // Create hidden input for saving
                        container.innerHTML = '';
                        const hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.dataset.key = modelInputKey;
                        hiddenInput.value = currentVal;
                        container.appendChild(hiddenInput);

                        // Create visual trigger
                        const display = document.createElement('div');
                        display.className = 'model-display';
                        display.style.cssText = 'text-align: right; color: #007aff; font-size: 15px; width: 100%; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; margin-left: auto;';
                        display.innerText = currentVal || '选择模型...';
                        container.appendChild(display);

                        // Click to open modal
                        display.onclick = () => {
                            const overlay = document.createElement('div');
                            overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:200; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s;';

                            // 隐藏滚动条样式
                            const style = document.createElement('style');
                            style.textContent = '.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }';
                            overlay.appendChild(style);

                            const isLight = window.ThemeManager?.isDarkMode() === false;
                            const bg = isLight ? '#f2f2f7' : '#1c1c1e';
                            const text = isLight ? '#000' : 'white';
                            const border = isLight ? '#c6c6c8' : '#333';
                            const headBg = isLight ? '#ffffff' : '#2c2c2e';
                            const hoverBg = isLight ? '#e5e5ea' : '#2c2c2e';

                            const modal = document.createElement('div');
                            modal.style.cssText = `background:${bg}; width:80%; max-height:60%; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; transform:scale(0.9); transition:transform 0.2s; box-shadow:0 0 20px rgba(0,0,0,0.5); color:${text};`;

                            const header = document.createElement('div');
                            header.style.cssText = `padding:15px; text-align:center; color:${text}; font-weight:bold; border-bottom:1px solid ${border}; background:${headBg}; position:relative;`;
                            header.innerText = '选择模型';

                            const closeBtn = document.createElement('div');
                            closeBtn.innerHTML = '✕';
                            closeBtn.style.cssText = 'position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#8e8e93; font-weight:normal; cursor:pointer; font-size:18px; padding:5px;';
                            closeBtn.onclick = (e) => { e.stopPropagation(); closeModal(); };
                            header.appendChild(closeBtn);

                            modal.appendChild(header);

                            const list = document.createElement('div');
                            list.className = 'no-scrollbar';
                            list.style.cssText = 'overflow-y:auto; flex:1; -webkit-overflow-scrolling: touch;';

                            models.forEach(m => {
                                const item = document.createElement('div');
                                item.style.cssText = `padding:12px 15px; border-bottom:1px solid ${border}; color:${text}; font-size:14px; cursor:pointer; transition:background 0.2s;`;
                                item.innerText = m.id;
                                item.onclick = () => {
                                    hiddenInput.value = m.id;
                                    display.innerText = m.id;
                                    closeModal();
                                };
                                item.onmouseenter = () => item.style.background = hoverBg;
                                item.onmouseleave = () => item.style.background = 'transparent';
                                list.appendChild(item);
                            });
                            modal.appendChild(list);
                            overlay.appendChild(modal);

                            // Close on outside click
                            overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

                            page.appendChild(overlay);

                            // Anim
                            setTimeout(() => {
                                overlay.style.opacity = '1';
                                modal.style.transform = 'scale(1)';
                            }, 10);

                            function closeModal() {
                                overlay.style.opacity = '0';
                                modal.style.transform = 'scale(0.9)';
                                setTimeout(() => overlay.remove(), 200);
                            }
                        };
                    }

                    if (btnId === 'btn-pull-models') {
                        sessionConnected = true;
                        alert(`拉取成功! 请选择模型然后点击右上角 "保存"`);
                        const statusDiv = page.querySelector('#connection-status');
                        if (statusDiv) {
                            statusDiv.innerText = '拉取成功(未保存)';
                            statusDiv.style.color = '#007aff';
                        }
                    } else {
                        alert(`副API拉取成功!`);
                    }

                } else {
                    throw new Error(`HTTP ${res.status} `);
                }
            } catch (e) {
                console.error(e);
                if (btnId === 'btn-pull-models') {
                    sessionConnected = false;
                    const statusDiv = page.querySelector('#connection-status');
                    if (statusDiv) {
                        statusDiv.innerText = '连接失败';
                        statusDiv.style.color = '#ff3b30';
                    }
                }
                alert('连接失败: ' + e.message);
            } finally {
                btn.innerText = btnText;
            }
        });
    };

    bindPullBtn('btn-pull-models', 'main_api_url', 'main_api_key', 'main-model-container', 'main_model');
    bindPullBtn('btn-pull-sub-models', 'sub_api_url', 'sub_api_key', 'sub-model-container', 'sub_model');


    // Global SAVE Button
    const saveBtn = page.querySelector('#wifi-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const s = window.sysStore;

            const allInputs = page.querySelectorAll('[data-key]');
            allInputs.forEach(input => {
                s.set(input.dataset.key, input.value);
            });

            const allSwitches = page.querySelectorAll('.ios-switch');
            allSwitches.forEach(sw => {
                const key = sw.dataset.switch;
                if (key) s.set(key, sw.classList.contains('on'));
            });

            const tempSlider = page.querySelector('#api-temp-slider');
            if (tempSlider) s.set('api_temperature', tempSlider.value);

            const statusDiv = page.querySelector('#connection-status');
            if (sessionConnected) {
                s.set('api_connected', 'true');
                if (statusDiv) {
                    statusDiv.innerText = '已连接';
                    statusDiv.style.color = '#34c759';
                }
            } else if (statusDiv && statusDiv.innerText.includes('未连接')) {
                s.set('api_connected', 'false');
            }

            alert('设置已保存');
        });
    }

    // Presets Logic
    const presetRow = page.querySelector('#preset-row');
    const presetDisplay = page.querySelector('#preset-display');
    const presetValueInput = page.querySelector('#preset-selector-value');
    const newPresetNameInput = page.querySelector('#new-preset-name');
    const btnSavePreset = page.querySelector('#btn-save-preset');
    const btnDelPreset = page.querySelector('#btn-del-preset');

    // 打开预设选择模态框
    if (presetRow) {
        presetRow.addEventListener('click', () => {
            const presets = JSON.parse(window.sysStore.get('api_presets') || '{}');
            const presetNames = Object.keys(presets);

            if (presetNames.length === 0) {
                alert('暂无保存的预设');
                return;
            }

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:200; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s;';

            // 隐藏滚动条样式
            const style = document.createElement('style');
            style.textContent = '.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }';
            overlay.appendChild(style);

            const isLight = window.ThemeManager?.isDarkMode() === false;
            const bg = isLight ? '#f2f2f7' : '#1c1c1e';
            const text = isLight ? '#000' : 'white';
            const border = isLight ? '#c6c6c8' : '#333';
            const headBg = isLight ? '#ffffff' : '#2c2c2e';
            const hoverBg = isLight ? '#e5e5ea' : '#2c2c2e';

            const modal = document.createElement('div');
            modal.style.cssText = `background:${bg}; width:80%; max-height:60%; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; transform:scale(0.9); transition:transform 0.2s; box-shadow:0 0 20px rgba(0,0,0,0.5); color:${text};`;

            // Header
            const header = document.createElement('div');
            header.style.cssText = `padding:15px; text-align:center; color:${text}; font-weight:bold; border-bottom:1px solid ${border}; background:${headBg}; position:relative;`;
            header.innerText = '选择预设';

            const closeBtn = document.createElement('div');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#8e8e93; font-weight:normal; cursor:pointer; font-size:18px; padding:5px;';
            closeBtn.onclick = (e) => { e.stopPropagation(); closeModal(); };
            header.appendChild(closeBtn);

            modal.appendChild(header);

            // List
            const list = document.createElement('div');
            list.className = 'no-scrollbar';
            list.style.cssText = 'overflow-y:auto; flex:1; -webkit-overflow-scrolling: touch;';

            presetNames.forEach(name => {
                const item = document.createElement('div');
                item.style.cssText = `padding:12px 15px; border-bottom:1px solid ${border}; color:${text}; font-size:14px; cursor:pointer; transition:background 0.2s;`;
                item.innerText = name;

                item.onclick = () => {
                    // 加载预设数据
                    const data = presets[name];
                    if (data) {
                        for (const key in data) {
                            const input = page.querySelector(`[data-key="${key}"]`);
                            if (input) input.value = data[key];

                            if (key === 'api_temperature') {
                                const slider = page.querySelector('#api-temp-slider');
                                const tempDisp = page.querySelector('#temp-display');
                                if (slider) {
                                    slider.value = data[key];
                                    const percent = (data[key] / 2) * 100;
                                    slider.style.background = `linear-gradient(to right, #007aff 0%, #007aff ${percent}%, #3a3a3c ${percent}%, #3a3a3c 100%)`;
                                }
                                if (tempDisp) tempDisp.textContent = data[key];
                            }
                        }
                    }
                    presetDisplay.innerText = name;
                    presetValueInput.value = name;
                    closeModal();
                };
                item.onmouseenter = () => item.style.background = hoverBg;
                item.onmouseleave = () => item.style.background = 'transparent';
                list.appendChild(item);
            });
            modal.appendChild(list);
            overlay.appendChild(modal);

            overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
            page.appendChild(overlay);

            setTimeout(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            }, 10);

            function closeModal() {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => overlay.remove(), 200);
            }
        });
    }

    // Save Preset
    btnSavePreset.addEventListener('click', () => {
        const name = newPresetNameInput.value.trim();
        if (!name) {
            alert('请输入预设名称');
            return;
        }

        const s = window.sysStore;
        const presets = JSON.parse(s.get('api_presets') || '{}');

        // 重名判定
        if (presets[name]) {
            if (!confirm(`预设 "${name}" 已存在，是否覆盖？`)) {
                return;
            }
        }

        const currentData = {};
        page.querySelectorAll('[data-key]').forEach(i => {
            currentData[i.dataset.key] = i.value;
        });
        const tempSlider = page.querySelector('#api-temp-slider');
        if (tempSlider) currentData['api_temperature'] = tempSlider.value;

        presets[name] = currentData;
        s.set('api_presets', JSON.stringify(presets));

        newPresetNameInput.value = '';
        alert(`预设 "${name}" 已保存`);
    });

    // Delete Preset
    btnDelPreset.addEventListener('click', () => {
        const name = presetValueInput.value;
        if (!name) {
            alert('请先选择要删除的预设');
            return;
        }
        if (!confirm(`确定删除预设 "${name}" 吗?`)) return;

        const s = window.sysStore;
        const presets = JSON.parse(s.get('api_presets') || '{}');
        delete presets[name];
        s.set('api_presets', JSON.stringify(presets));

        // 重置显示
        presetDisplay.innerText = '选择预设...';
        presetValueInput.value = '';
    });
}

// 导出模块
window.SettingsApp = {
    render: renderSettingsApp,
    bindEvents: bindSettingsEvents
};

// =========================================
// 后台活动管理器
// =========================================
window.BackgroundActivityManager = (function () {
    let timerId = null;
    let isRunning = false;

    /**
     *     Run Background Task (后台任务执行函数 - 调用 API)
     */
    async function runBackgroundTask() {
        const s = window.sysStore;

        // 检查冷却时间
        const lastRun = parseInt(s.get('bg_last_run') || '0');
        const cooldownHours = parseFloat(s.get('bg_cooldown_hours') || '1');
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const now = Date.now();

        if (now - lastRun < cooldownMs) {
            console.log('[后台活动] 冷却中，跳过本次执行');
            return;
        }

        // 获取 API 配置
        const apiUrl = s.get('main_api_url');
        const apiKey = s.get('main_api_key');
        const model = s.get('main_model') || 'gpt-3.5-turbo';

        if (!apiUrl || !apiKey) {
            console.log('[后台活动] API 未配置，跳过执行');
            return;
        }

        console.log('[后台活动] 开始执行后台任务...');

        try {
            // 调用 API - 这里可以根据实际需求定制请求内容
            const response = await fetch(`${apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: '你是一个助手。' },
                        { role: 'user', content: '后台心跳检测，请简短回复"在线"即可。' }
                    ],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                s.set('bg_last_run', now.toString());
                console.log('[后台活动] 任务执行成功');
            } else {
                console.error('[后台活动] API 调用失败:', response.status);
            }
        } catch (e) {
            console.error('[后台活动] 任务执行出错:', e);
        }
    }

    /**
     *     Start Background Timer (启动后台定时器)
     */
    function start() {
        if (isRunning) return;

        const s = window.sysStore;
        const enabled = s.get('bg_activity_enabled') === 'true';

        if (!enabled) {
            console.log('[后台活动] 功能未开启');
            return;
        }

        const intervalMinutes = parseInt(s.get('bg_check_interval') || '30');
        const intervalMs = intervalMinutes * 60 * 1000;

        console.log(`[后台活动] 启动，间隔: ${intervalMinutes} 分钟`);

        isRunning = true;

        // 立即执行一次
        runBackgroundTask();

        // 设置定时器
        timerId = setInterval(() => {
            runBackgroundTask();
        }, intervalMs);
    }

    /**
     *     Stop Background Timer (停止后台定时器)
     */
    function stop() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        isRunning = false;
        console.log('[后台活动] 已停止');
    }

    /**
     *     Restart Timer (重启定时器 [配置变更时调用])
     */
    function restart() {
        stop();
        start();
    }

    /**
     *     Check and Init (检查并初始化)
     */
    function init() {
        const s = window.sysStore;
        if (s.get('bg_activity_enabled') === 'true') {
            start();
        }
    }

    return {
        start,
        stop,
        restart,
        init,
        isRunning: () => isRunning
    };
})();

//     Init Background Activity on Load (页面加载时初始化后台活动)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.BackgroundActivityManager.init();
    }, 2000);
});

// =========================================
// 主题管理器 - 日间/夜间模式
// =========================================
window.ThemeManager = (function () {
    /**
     *     Set Dark Mode (设置暗黑模式)
     */
    function setDarkMode(isDark) {
        const osRoot = document.getElementById('os-root');
        if (osRoot) {
            if (isDark) {
                osRoot.classList.remove('light-mode');
                osRoot.classList.add('dark-mode');
            } else {
                osRoot.classList.remove('dark-mode');
                osRoot.classList.add('light-mode');
            }
        }
        console.log('[主题] 切换到:', isDark ? '暗黑模式' : '日间模式');
    }

    /**
     *     Init Theme (初始化主题)
     */
    function init() {
        const s = window.sysStore;
        const isDark = s.get('dark_mode') !== 'false'; // 默认暗黑模式
        setDarkMode(isDark);
    }

    /**
     *     Get Dark Mode Status (获取当前是否为暗黑模式)
     */
    function isDarkMode() {
        return window.sysStore?.get('dark_mode') !== 'false';
    }

    return {
        setDarkMode,
        init,
        isDarkMode
    };
})();

//     Init Theme on Load (页面加载时初始化主题)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.ThemeManager.init();
    }, 100);
});

/* ===========================
    Font Page Design V2 (字体页面 V2)
   =========================== */
function renderFontPageDesign() {
    const s = window.sysStore;
    const activeFontStr = s.get('active_font');
    let activeFont = null;
    try { activeFont = activeFontStr ? JSON.parse(activeFontStr) : null; } catch (e) { }

    const customFontsStr = s.get('custom_fonts') || '[]';
    let customFonts = [];
    try { customFonts = JSON.parse(customFontsStr); } catch (e) { }

    const currentUrl = (activeFont && activeFont.type !== 'system') ? activeFont.value : '';
    const currentName = (activeFont && activeFont.type !== 'system') ? activeFont.name : 'System Default';

    let optionsHtml = `<option value="">-- 选择一个预设 --</option>`;
    customFonts.forEach(font => {
        const selected = (activeFont && activeFont.id === font.id) ? 'selected' : '';
        optionsHtml += `<option value="${font.id}" ${selected}>${font.name}</option>`;
    });

    return `
        <div class="settings-header">
            <div class="settings-nav">
                <div class="settings-back" id="font-back-v2">
                    <svg viewBox="0 0 12 20"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex:1; text-align:center; margin-right:40px;">字体设置</div>
                <div class="settings-action" id="btn-apply-font">保存</div>
            </div>
        </div>
        <div class="settings-content" style="padding: 20px; background: var(--bg-color, #fff);">
            <style>
                .font-form-group { margin-bottom: 20px; }
                .font-label { display: block; margin-bottom: 10px; font-weight: bold; font-size: 14px; color: var(--text-color, #333); }
                .font-sublabel { display: block; margin-bottom: 8px; font-size: 12px; color: #8e8e93; }
                .font-control-row { display: flex; gap: 10px; }
                .font-select { 
                    flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #e5e5ea; background: #f2f2f7; 
                    font-size: 14px; color: inherit; appearance: none;
                    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%206L0%201l1-1%204%204%204-4%201%201z%22%20fill%3D%22%238e8e93%22%2F%3E%3C%2Fsvg%3E");
                    background-repeat: no-repeat; background-position: right 10px center;
                }
                .font-btn-small { padding: 0 16px; border-radius: 6px; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .btn-save-preset { background: #f2f2f7; color: #333; border: 1px solid #d1d1d6; }
                .btn-delete-preset { background: #ffe5e5; color: #ff3b30; border: 1px solid #ffcdcd; }
                .font-input-box { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #e5e5ea; font-size: 14px; background: #fff; color: inherit; box-sizing: border-box; }
                .font-preview-box { width: 100%; height: 120px; padding: 16px; background: #f9f9f9; border-radius: 8px; border: 1px solid #f0f0f0; box-sizing: border-box; font-size: 16px; line-height: 1.6; overflow: hidden; color: #000; }
                .font-main-btn { width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: bold; border: none; cursor: pointer; margin-bottom: 12px; text-align: center; }
                .btn-primary { background: #007aff; color: white; }
                .btn-secondary { background: #f2f2f7; color: #333; }
                
                #os-root.dark-theme .font-preview-box { background: #2c2c2e; border-color: #3a3a3c; color: #fff; }
                #os-root.dark-theme .font-input-box { background: #1c1c1e; border-color: #3a3a3c; color: #fff; }
                #os-root.dark-theme .font-select { background-color: #1c1c1e; border-color: #3a3a3c; color: #fff; }
                #os-root.dark-theme .btn-save-preset { background: #1c1c1e; border-color: #3a3a3c; color: #fff; }
                #os-root.dark-theme .btn-secondary { background: #1c1c1e; color: #fff; }
                #os-root.light-mode .settings-content { background: #fff !important; }
            </style>
            
            <div class="font-form-group">
                <label class="font-label">字体预设管理</label>
                <div style="height:1px; background:#f0f0f0; margin-bottom:15px; width:100%;"></div>
                <span class="font-sublabel">选择或切换预设</span>
                <div class="font-control-row">
                    <select id="font-preset-select" class="font-select">${optionsHtml}</select>
                    <button id="btn-save-preset" class="font-btn-small btn-save-preset">保存</button>
                    <button id="btn-delete-preset" class="font-btn-small btn-delete-preset">删除</button>
                </div>
            </div>

            <div class="font-form-group">
                <label class="font-sublabel">字体文件URL (.ttf, .otf, .woff等)</label>
                <div style="position:relative;">
                    <input type="text" id="font-url-input" class="font-input-box" value="${currentUrl}" placeholder="https://...">
                    <div id="font-file-trigger" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#007aff; font-size:20px; cursor:pointer;" title="Upload File">📂</div>
                    <input type="file" id="font-file-input" style="display:none;" accept=".ttf,.otf,.woff,.woff2">
                </div>
            </div>

            <div class="font-form-group">
                <label class="font-sublabel">实时预览</label>
                <div id="realtime-preview" class="font-preview-box" style="font-family: '${currentName}', sans-serif;">
                    你好世界 Hello World<br>这是字体预览效果，12345。
                </div>
            </div>

            <div style="margin-top: 30px;">
                <button id="btn-apply-font" class="font-main-btn btn-primary">保存并应用</button>
                <button id="btn-reset-font" class="font-main-btn btn-secondary">恢复默认字体</button>
            </div>
            <div style="height: 50px;"></div>
        </div>
    `;
}

function bindFontPageDesignEvents(page) {
    const backBtn = page.querySelector('#font-back-v2');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    const s = window.sysStore;
    const urlInput = page.querySelector('#font-url-input');
    const previewBox = page.querySelector('#realtime-preview');
    const presetSelect = page.querySelector('#font-preset-select');
    const fileInput = page.querySelector('#font-file-input');
    const fileTrigger = page.querySelector('#font-file-trigger');

    const updatePreview = (url, name = 'PreviewFont') => {
        if (!url) {
            previewBox.style.fontFamily = 'inherit';
            return;
        }
        const fontFaceId = 'temp-preview-style';
        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }
        style.textContent = `@font-face { font-family: '${name}'; src: url('${url}'); font-display: swap; }`;
        previewBox.style.fontFamily = `'${name}', sans-serif`;
    };

    if (urlInput) {
        urlInput.addEventListener('input', () => {
            updatePreview(urlInput.value.trim(), 'TempPreview_' + Date.now());
        });
    }

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const id = presetSelect.value;
            if (!id) return;
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const font = fonts.find(f => f.id === id);
            if (font) {
                urlInput.value = font.value;
                updatePreview(font.value, font.name);
            }
        });
    }

    page.querySelector('#btn-save-preset').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('请输入字体 URL'); return; }
        const name = prompt('请输入预设名称:', 'My Font');
        if (!name) return;
        const newFont = {
            id: 'font_' + Date.now(),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        let fonts = JSON.parse(s.get('custom_fonts') || '[]');
        fonts.push(newFont);
        s.set('custom_fonts', JSON.stringify(fonts));
        page.innerHTML = renderFontPageDesign();
        bindFontPageDesignEvents(page);

        // Restore check
        const newSelect = page.querySelector('#font-preset-select');
        if (newSelect) newSelect.value = newFont.id;
        page.querySelector('#font-url-input').value = val;
    });

    page.querySelector('#btn-delete-preset').addEventListener('click', () => {
        const id = presetSelect.value;
        if (!id) { alert('请先选择一个预设'); return; }
        if (confirm('确定删除该预设吗?')) {
            let fonts = JSON.parse(s.get('custom_fonts') || '[]');
            fonts = fonts.filter(f => f.id !== id);
            s.set('custom_fonts', JSON.stringify(fonts));
            page.innerHTML = renderFontPageDesign();
            bindFontPageDesignEvents(page);
        }
    });

    page.querySelector('#btn-apply-font').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('URL 为空'); return; }
        let name = 'Custom Font';
        const id = presetSelect.value;
        if (id) {
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const f = fonts.find(i => i.id === id);
            if (f) name = f.name;
        }
        const fontData = {
            id: id || ('applied_' + Date.now()),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        s.set('active_font', JSON.stringify(fontData));
        if (window.os && window.os.applyFont) window.os.applyFont(fontData);
        alert('字体已应用');
    });

    page.querySelector('#btn-reset-font').addEventListener('click', () => {
        const def = { type: 'system', value: 'system-ui', name: 'System Default' };
        s.set('active_font', JSON.stringify(def));
        if (window.os && window.os.applyFont) window.os.applyFont(def);
        urlInput.value = '';
        presetSelect.value = '';
        previewBox.style.fontFamily = 'inherit';
        alert('已恢复系统默认字体');
    });

    if (fileTrigger && fileInput) {
        fileTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                urlInput.value = base64;
                updatePreview(base64, file.name);
            } catch (e) { alert('读取文件失败'); }
        });
    }
}

/* ===========================
    Font Page Design V3 (字体页面 V3)
   =========================== */
function renderFontPageDesignV3() {
    const s = window.sysStore;
    const activeFontStr = s.get('active_font');
    let activeFont = null;
    try { activeFont = activeFontStr ? JSON.parse(activeFontStr) : null; } catch (e) { }

    const customFontsStr = s.get('custom_fonts') || '[]';
    let customFonts = [];
    try { customFonts = JSON.parse(customFontsStr); } catch (e) { }

    const currentUrl = (activeFont && activeFont.type !== 'system') ? activeFont.value : '';
    const currentName = (activeFont && activeFont.type !== 'system') ? activeFont.name : 'System Default';

    let optionsHtml = `<option value="">-- 选择一个预设 (Select Preset) --</option>`;
    customFonts.forEach(font => {
        const selected = (activeFont && activeFont.id === font.id) ? 'selected' : '';
        optionsHtml += `<option value="${font.id}" ${selected}>${font.name}</option>`;
    });

    return `
        <div class="settings-header">
            <div class="settings-nav">
                <div class="settings-back" id="font-back-v3">
                    <svg viewBox="0 0 12 20"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex:1; text-align:center; margin-right:40px;">字体设置</div>
                <div class="settings-action" id="btn-apply-font">保存</div>
            </div>
        </div>
        <div class="settings-content font-page-content">
            <style>
                .font-page-content {
                    --fp-bg: #f2f2f7;
                    --fp-text: #000000;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #ffffff;
                    --fp-input-border: #e5e5ea;
                    --fp-preview-bg: #ffffff;
                    --fp-btn-sec-bg: #ffffff;
                    --fp-btn-sec-text: #007aff;
                    --fp-danger-bg: #ffffff;
                    --fp-danger-text: #ff3b30;
                    
                    background-color: var(--fp-bg) !important;
                    color: var(--fp-text);
                    padding: 20px;
                    box-sizing: border-box;
                    height: 100%;
                    overflow-y: auto;
                }

                #os-root.dark-theme .font-page-content {
                    --fp-bg: #000000;
                    --fp-text: #ffffff;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #1c1c1e;
                    --fp-input-border: #2c2c2e;
                    --fp-preview-bg: #1c1c1e;
                    --fp-btn-sec-bg: #1c1c1e;
                    --fp-btn-sec-text: #0a84ff;
                    --fp-danger-bg: #1c1c1e;
                    --fp-danger-text: #ff453a;
                }

                .font-form-group { margin-bottom: 24px; }
                
                .font-sublabel { 
                    display: block; margin-bottom: 8px; margin-left: 4px;
                    font-size: 13px; color: var(--fp-subtext); text-transform: uppercase; letter-spacing: -0.2px;
                }
                
                .font-control-row { display: flex; gap: 12px; }
                
                .font-select { 
                    flex: 1; height: 46px; padding: 0 16px; 
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border); 
                    background-color: var(--fp-input-bg); 
                    font-size: 17px; color: var(--fp-text); 
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat; background-position: right 12px center; background-size: 16px;
                }
                
                .font-btn-small {
                    height: 46px; padding: 0 20px;
                    border-radius: 10px;
                    font-size: 15px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--fp-input-border);
                }
                
                .btn-save-preset { background: var(--fp-btn-sec-bg); color: var(--fp-text); }
                .btn-delete-preset { background: var(--fp-danger-bg); color: var(--fp-danger-text); }

                .font-input-container { position: relative; }
                .font-input-box {
                    width: 100%; height: 46px; padding: 0 16px; 
                    padding-right: 44px;
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border);
                    background-color: var(--fp-input-bg);
                    font-size: 17px; 
                    color: var(--fp-text);
                    box-sizing: border-box;
                    outline: none;
                }
                .font-input-box::placeholder { color: var(--fp-subtext); }
                
                .font-file-icon {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    color: #007aff; font-size: 20px; cursor: pointer;
                }

                .font-preview-box {
                    width: 100%; height: 140px; 
                    padding: 20px;
                    background: var(--fp-preview-bg);
                    border-radius: 12px;
                    border: 1px solid var(--fp-input-border);
                    box-sizing: border-box;
                    font-size: 20px;
                    line-height: 1.5;
                    overflow: auto;
                    color: var(--fp-text);
                    display: flex; flex-direction: column; justify-content: center; text-align: center;
                }

                .font-main-btn {
                    width: 100%; height: 50px;
                    border-radius: 12px;
                    font-size: 17px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    margin-bottom: 16px;
                    text-align: center;
                }
                
                .btn-primary { background: #007aff; color: #ffffff; }
                .btn-secondary { background: var(--fp-btn-sec-bg); color: var(--fp-text); border: 1px solid var(--fp-input-border); }
                #os-root.dark-theme .btn-secondary { color: var(--fp-btn-sec-text); }

            </style>
            
            <div class="font-form-group">
                <span class="font-sublabel">字体预设 (PRESETS)</span>
                <div class="font-control-row">
                    <select id="font-preset-select" class="font-select">${optionsHtml}</select>
                    <button id="btn-save-preset" class="font-btn-small btn-save-preset">保存</button>
                    <button id="btn-delete-preset" class="font-btn-small btn-delete-preset">删除</button>
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">URL 或 本地文件 (SOURCE)</span>
                <div class="font-input-container">
                    <input type="text" id="font-url-input" class="font-input-box" value="${currentUrl}" placeholder="https://example.com/font.ttf">
                    <div id="font-file-trigger" class="font-file-icon" title="Upload Local File">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </div>
                    <input type="file" id="font-file-input" style="display:none;" accept=".ttf,.otf,.woff,.woff2">
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">实时预览 (PREVIEW)</span>
                <div id="realtime-preview" class="font-preview-box" style="font-family: '${currentName}', sans-serif;">
                    <div>你好世界 Hello World</div>
                    <div style="font-size: 14px; opacity: 0.7; margin-top: 10px;">这是字体预览效果 12345.</div>
                </div>
            </div>

            <div style="margin-top: 40px;">
                <button id="btn-apply-font" class="font-main-btn btn-primary">保存并应用</button>
                <button id="btn-reset-font" class="font-main-btn btn-secondary">恢复默认字体</button>
            </div>
            <div style="height: 50px;"></div>
        </div>
    `;
}

function bindFontPageDesignEventsV3(page) {
    const backBtn = page.querySelector('#font-back-v3');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    const s = window.sysStore;
    const urlInput = page.querySelector('#font-url-input');
    const previewBox = page.querySelector('#realtime-preview');
    const presetSelect = page.querySelector('#font-preset-select');
    const fileInput = page.querySelector('#font-file-input');
    const fileTrigger = page.querySelector('#font-file-trigger');

    const updatePreview = (url, name = 'PreviewFont') => {
        if (!url) {
            previewBox.style.fontFamily = 'inherit';
            return;
        }
        const fontFaceId = 'temp-preview-style';
        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }
        style.textContent = `@font-face { font-family: '${name}'; src: url('${url}'); font-display: swap; }`;
        previewBox.style.fontFamily = `'${name}', sans-serif`;
    };

    if (urlInput) {
        urlInput.addEventListener('input', () => {
            updatePreview(urlInput.value.trim(), 'TempPreview_' + Date.now());
        });
    }

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const id = presetSelect.value;
            if (!id) return;
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const font = fonts.find(f => f.id === id);
            if (font) {
                urlInput.value = font.value;
                updatePreview(font.value, font.name);
            }
        });
    }

    page.querySelector('#btn-save-preset').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('请输入字体 URL'); return; }
        const name = prompt('请输入预设名称:', 'My Font');
        if (!name) return;
        const newFont = {
            id: 'font_' + Date.now(),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        let fonts = JSON.parse(s.get('custom_fonts') || '[]');
        fonts.push(newFont);
        s.set('custom_fonts', JSON.stringify(fonts));
        page.innerHTML = renderFontPageDesignV3();
        bindFontPageDesignEventsV3(page);

        const newSelect = page.querySelector('#font-preset-select');
        if (newSelect) newSelect.value = newFont.id;
        page.querySelector('#font-url-input').value = val;
    });

    page.querySelector('#btn-delete-preset').addEventListener('click', () => {
        const id = presetSelect.value;
        if (!id) { alert('请先选择一个预设'); return; }
        if (confirm('确定删除该预设吗?')) {
            let fonts = JSON.parse(s.get('custom_fonts') || '[]');
            fonts = fonts.filter(f => f.id !== id);
            s.set('custom_fonts', JSON.stringify(fonts));
            page.innerHTML = renderFontPageDesignV3();
            bindFontPageDesignEventsV3(page);
        }
    });

    page.querySelector('#btn-apply-font').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('URL 为空'); return; }
        let name = 'Custom Font';
        const id = presetSelect.value;
        if (id) {
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const f = fonts.find(i => i.id === id);
            if (f) name = f.name;
        }
        const fontData = {
            id: id || ('applied_' + Date.now()),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        s.set('active_font', JSON.stringify(fontData));
        if (window.os && window.os.applyFont) window.os.applyFont(fontData);
        alert('字体已应用');
    });

    page.querySelector('#btn-reset-font').addEventListener('click', () => {
        const def = { type: 'system', value: 'system-ui', name: 'System Default' };
        s.set('active_font', JSON.stringify(def));
        if (window.os && window.os.applyFont) window.os.applyFont(def);
        urlInput.value = '';
        presetSelect.value = '';
        previewBox.style.fontFamily = 'inherit';
        alert('已恢复系统默认字体');
    });

    if (fileTrigger && fileInput) {
        fileTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                urlInput.value = base64;
                updatePreview(base64, file.name);
            } catch (e) { alert('读取文件失败'); }
        });
    }
}

/* ===========================
    Font Page Design V4 (字体页面 V4)
   =========================== */
function renderFontPageDesignV4() {
    const s = window.sysStore;
    const activeFontStr = s.get('active_font');
    let activeFont = null;
    try { activeFont = activeFontStr ? JSON.parse(activeFontStr) : null; } catch (e) { }

    const customFontsStr = s.get('custom_fonts') || '[]';
    let customFonts = [];
    try { customFonts = JSON.parse(customFontsStr); } catch (e) { }

    const currentUrl = (activeFont && activeFont.type !== 'system') ? activeFont.value : '';
    const currentName = (activeFont && activeFont.type !== 'system') ? activeFont.name : 'System Default';

    let optionsHtml = `<option value="">-- 选择一个预设 (Select Preset) --</option>`;
    customFonts.forEach(font => {
        const selected = (activeFont && activeFont.id === font.id) ? 'selected' : '';
        optionsHtml += `<option value="${font.id}" ${selected}>${font.name}</option>`;
    });

    return `
        <div class="settings-header font-page-header">
            <div class="settings-nav">
                <div class="settings-back" id="font-back-v4">
                    <svg viewBox="0 0 12 20"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex:1; text-align:center; margin-right:40px;">字体设置</div>
                <div class="settings-action" id="btn-apply-font">保存</div>
            </div>
        </div>
        <div class="settings-content font-page-content">
            <style>
                /* V4 Independent Styles */
                .font-page-content {
                    --fp-bg: #f2f2f7;
                    --fp-text: #000000;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #ffffff;
                    --fp-input-border: #e5e5ea;
                    --fp-preview-bg: #ffffff;
                    --fp-btn-sec-bg: #ffffff;
                    --fp-btn-sec-text: #007aff;
                    --fp-danger-bg: #ffffff;
                    --fp-danger-text: #ff3b30;
                    
                    background-color: var(--fp-bg) !important;
                    color: var(--fp-text);
                    padding: 20px;
                    box-sizing: border-box;
                    height: 100%;
                    overflow-y: auto;
                }

                #os-root.dark-theme .font-page-content {
                    --fp-bg: #000000;
                    --fp-text: #ffffff;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #1c1c1e;
                    --fp-input-border: #333333;
                    --fp-preview-bg: #1c1c1e;
                    --fp-btn-sec-bg: #1c1c1e;
                    --fp-btn-sec-text: #0a84ff;
                    --fp-danger-bg: #1c1c1e;
                    --fp-danger-text: #ff453a;
                }
                
                /* Aggressively force layout background to black in dark mode */
                #os-root.dark-theme .font-settings-wrapper {
                    background-color: #000000 !important;
                }

                /* Header Styling */
                .font-page-header {
                    background: var(--fp-bg);
                    transition: background 0.3s;
                }
                #os-root.dark-theme .font-page-header {
                    background-color: #000000 !important;
                }
                #os-root.dark-theme .font-page-header .settings-title {
                    color: #fff;
                }
                #os-root.dark-theme .font-page-header svg {
                    fill: #0a84ff; /* iOS Blue in Dark Mode */
                }

                /* Layout & Controls */
                .font-form-group { margin-bottom: 24px; }
                
                .font-sublabel { 
                    display: block; margin-bottom: 8px; margin-left: 4px;
                    font-size: 13px; color: var(--fp-subtext); text-transform: uppercase; letter-spacing: -0.2px;
                }
                
                .font-control-row { display: flex; gap: 12px; }
                
                .font-select { 
                    flex: 1; height: 46px; padding: 0 16px; 
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border); 
                    background-color: var(--fp-input-bg); 
                    font-size: 17px; color: var(--fp-text); 
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat; background-position: right 12px center; background-size: 16px;
                }
                
                .font-btn-small {
                    height: 46px; padding: 0 16px;
                    border-radius: 10px;
                    font-size: 15px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--fp-input-border);
                    flex-shrink: 0; white-space: nowrap;
                }
                
                .btn-save-preset { background: var(--fp-btn-sec-bg); color: var(--fp-text); }
                .btn-delete-preset { background: var(--fp-danger-bg); color: var(--fp-danger-text); }

                .font-input-container { position: relative; }
                .font-input-box {
                    width: 100%; height: 46px; padding: 0 16px; 
                    padding-right: 44px;
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border);
                    background-color: var(--fp-input-bg);
                    font-size: 17px; 
                    color: var(--fp-text);
                    box-sizing: border-box;
                    outline: none;
                }
                .font-input-box::placeholder { color: var(--fp-subtext); }
                
                .font-file-icon {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    color: #007aff; font-size: 20px; cursor: pointer;
                }

                .font-preview-box {
                    width: 100%; height: 140px; 
                    padding: 20px;
                    background: var(--fp-preview-bg);
                    border-radius: 12px;
                    border: 1px solid var(--fp-input-border);
                    box-sizing: border-box;
                    font-size: 20px;
                    line-height: 1.5;
                    overflow: auto;
                    color: var(--fp-text);
                    display: flex; flex-direction: column; justify-content: center; text-align: center;
                }

                .font-main-btn {
                    width: 100%; height: 50px;
                    border-radius: 12px;
                    font-size: 17px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    margin-bottom: 16px;
                    text-align: center;
                }
                
                .btn-primary { background: #007aff; color: #ffffff; }
                .btn-secondary { background: var(--fp-btn-sec-bg); color: var(--fp-text); border: 1px solid var(--fp-input-border); }
                #os-root.dark-theme .btn-secondary { color: var(--fp-btn-sec-text); }
                
                /* Layout Safety */
                .font-control-row > * { min-width: 0; }
            </style>
            
            <div class="font-form-group">
                <span class="font-sublabel">字体预设 (PRESETS)</span>
                <div class="font-control-row">
                    <select id="font-preset-select" class="font-select">${optionsHtml}</select>
                    <button id="btn-save-preset" class="font-btn-small btn-save-preset">保存</button>
                    <button id="btn-delete-preset" class="font-btn-small btn-delete-preset">删除</button>
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">URL 或 本地文件 (SOURCE)</span>
                <div class="font-input-container">
                    <input type="text" id="font-url-input" class="font-input-box" value="${currentUrl}" placeholder="https://example.com/font.ttf">
                    <div id="font-file-trigger" class="font-file-icon" title="Upload Local File">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </div>
                    <input type="file" id="font-file-input" style="display:none;" accept=".ttf,.otf,.woff,.woff2">
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">实时预览 (PREVIEW)</span>
                <div id="realtime-preview" class="font-preview-box" style="font-family: '${currentName}', sans-serif;">
                    <div>你好世界 Hello World</div>
                    <div style="font-size: 14px; opacity: 0.7; margin-top: 10px;">这是字体预览效果 12345.</div>
                </div>
            </div>

            <div style="margin-top: 40px;">
                <button id="btn-apply-font" class="font-main-btn btn-primary">保存并应用</button>
                <button id="btn-reset-font" class="font-main-btn btn-secondary">恢复默认字体</button>
            </div>
            <div style="height: 50px;"></div>
        </div>
    `;
}

function bindFontPageDesignEventsV4(page) {
    const backBtn = page.querySelector('#font-back-v4');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    const s = window.sysStore;
    const urlInput = page.querySelector('#font-url-input');
    const previewBox = page.querySelector('#realtime-preview');
    const presetSelect = page.querySelector('#font-preset-select');
    const fileInput = page.querySelector('#font-file-input');
    const fileTrigger = page.querySelector('#font-file-trigger');

    const updatePreview = (url, name = 'PreviewFont') => {
        if (!url) {
            previewBox.style.fontFamily = 'inherit';
            return;
        }
        const fontFaceId = 'temp-preview-style';
        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }
        style.textContent = `@font-face { font-family: '${name}'; src: url('${url}'); font-display: swap; }`;
        previewBox.style.fontFamily = `'${name}', sans-serif`;
    };

    if (urlInput) {
        urlInput.addEventListener('input', () => {
            updatePreview(urlInput.value.trim(), 'TempPreview_' + Date.now());
        });
    }

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const id = presetSelect.value;
            if (!id) return;
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const font = fonts.find(f => f.id === id);
            if (font) {
                urlInput.value = font.value;
                updatePreview(font.value, font.name);
            }
        });
    }

    page.querySelector('#btn-save-preset').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('请输入字体 URL'); return; }
        const name = prompt('请输入预设名称:', 'My Font');
        if (!name) return;
        const newFont = {
            id: 'font_' + Date.now(),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        let fonts = JSON.parse(s.get('custom_fonts') || '[]');
        fonts.push(newFont);
        s.set('custom_fonts', JSON.stringify(fonts));
        page.innerHTML = renderFontPageDesignV4();
        bindFontPageDesignEventsV4(page);

        const newSelect = page.querySelector('#font-preset-select');
        if (newSelect) newSelect.value = newFont.id;
        page.querySelector('#font-url-input').value = val;
    });

    page.querySelector('#btn-delete-preset').addEventListener('click', () => {
        const id = presetSelect.value;
        if (!id) { alert('请先选择一个预设'); return; }
        if (confirm('确定删除该预设吗?')) {
            let fonts = JSON.parse(s.get('custom_fonts') || '[]');
            fonts = fonts.filter(f => f.id !== id);
            s.set('custom_fonts', JSON.stringify(fonts));
            page.innerHTML = renderFontPageDesignV4();
            bindFontPageDesignEventsV4(page);
        }
    });

    page.querySelector('#btn-apply-font').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('URL 为空'); return; }
        let name = 'Custom Font';
        const id = presetSelect.value;
        if (id) {
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const f = fonts.find(i => i.id === id);
            if (f) name = f.name;
        }
        const fontData = {
            id: id || ('applied_' + Date.now()),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        s.set('active_font', JSON.stringify(fontData));
        if (window.os && window.os.applyFont) window.os.applyFont(fontData);
        alert('字体已应用');
    });

    page.querySelector('#btn-reset-font').addEventListener('click', () => {
        const def = { type: 'system', value: 'system-ui', name: 'System Default' };
        s.set('active_font', JSON.stringify(def));
        if (window.os && window.os.applyFont) window.os.applyFont(def);
        urlInput.value = '';
        presetSelect.value = '';
        previewBox.style.fontFamily = 'inherit';
        alert('已恢复系统默认字体');
    });

    if (fileTrigger && fileInput) {
        fileTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                urlInput.value = base64;
                updatePreview(base64, file.name);
            } catch (e) { alert('读取文件失败'); }
        });
    }
}

/* ===========================
   Font Page (Design V5 - JS-Driven Dark Mode)
   =========================== */
function renderFontPageDesignV5() {
    const s = window.sysStore;
    const isDark = s.get('dark_mode') !== 'false';
    const darkClass = isDark ? 'force-dark' : '';

    const activeFontStr = s.get('active_font');
    let activeFont = null;
    try { activeFont = activeFontStr ? JSON.parse(activeFontStr) : null; } catch (e) { }

    const customFontsStr = s.get('custom_fonts') || '[]';
    let customFonts = [];
    try { customFonts = JSON.parse(customFontsStr); } catch (e) { }

    const currentUrl = (activeFont && activeFont.type !== 'system') ? activeFont.value : '';
    const currentName = (activeFont && activeFont.type !== 'system') ? activeFont.name : 'System Default';

    let optionsHtml = `<option value="">-- 选择一个预设 (Select Preset) --</option>`;
    customFonts.forEach(font => {
        const selected = (activeFont && activeFont.id === font.id) ? 'selected' : '';
        optionsHtml += `<option value="${font.id}" ${selected}>${font.name}</option>`;
    });

    return `
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; sticky; top: 0; z-index: 100;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="font-back-v5" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">字体设置</div>
                <div class="settings-action" id="btn-apply-font" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>
        <div class="settings-content font-page-content ${darkClass}">
            <style>
                .font-page-content {
                    --fp-bg: #f2f2f7;
                    --fp-text: #000000;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #ffffff;
                    --fp-input-border: #e5e5ea;
                    --fp-preview-bg: #ffffff;
                    --fp-btn-sec-bg: #ffffff;
                    --fp-btn-sec-text: #007aff;
                    --fp-danger-bg: #ffffff;
                    --fp-danger-text: #ff3b30;
                    
                    background-color: var(--fp-bg) !important;
                    color: var(--fp-text);
                    padding: 20px;
                    box-sizing: border-box;
                    height: 100%;
                    overflow-y: auto;
                }

                /* FORCE DARK MODE CLASSES */
                .font-page-content.force-dark {
                    --fp-bg: #000000;
                    --fp-text: #ffffff;
                    --fp-subtext: #8e8e93;
                    --fp-input-bg: #1c1c1e;
                    --fp-input-border: #333333;
                    --fp-preview-bg: #1c1c1e;
                    --fp-btn-sec-bg: #1c1c1e;
                    --fp-btn-sec-text: #0a84ff;
                    --fp-danger-bg: #1c1c1e;
                    --fp-danger-text: #ff453a;
                    
                    background-color: #000000 !important;
                    color: #ffffff !important;
                }

                /* Header Config */
                .font-page-header {
                    background: #f2f2f7;
                    border-bottom: 1px solid #e5e5ea;
                }
                .font-page-header.force-dark {
                    background-color: #000000 !important;
                    border-bottom: 0.5px solid #1c1c1e !important;
                }
                .font-page-header.force-dark .settings-title { color: #fff !important; }
                .font-page-header.force-dark svg { fill: #0a84ff !important; }

                .font-form-group { margin-bottom: 24px; }
                
                .font-sublabel { 
                    display: block; margin-bottom: 8px; margin-left: 4px;
                    font-size: 13px; color: var(--fp-subtext); text-transform: uppercase; letter-spacing: -0.2px;
                }
                
                .font-control-row { display: flex; gap: 12px; }
                
                .font-select { 
                    flex: 1; height: 46px; padding: 0 16px; 
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border); 
                    background-color: var(--fp-input-bg); 
                    font-size: 17px; color: var(--fp-text); 
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat; background-position: right 12px center; background-size: 16px;
                }
                
                .font-btn-small {
                    height: 46px; padding: 0 16px;
                    border-radius: 10px;
                    font-size: 15px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--fp-input-border);
                    flex-shrink: 0; white-space: nowrap;
                }
                
                .btn-save-preset { background: var(--fp-btn-sec-bg); color: var(--fp-text); }
                .btn-delete-preset { background: var(--fp-danger-bg); color: var(--fp-danger-text); }
                /* Inverse text color for buttons in Dark Mode if needed, but variables handle it */
                .font-page-content.force-dark .btn-save-preset { color: #ffffff; }

                .font-input-container { position: relative; }
                .font-input-box {
                    width: 100%; height: 46px; padding: 0 16px; 
                    padding-right: 44px;
                    border-radius: 10px; 
                    border: 1px solid var(--fp-input-border);
                    background-color: var(--fp-input-bg);
                    font-size: 17px; 
                    color: var(--fp-text);
                    box-sizing: border-box;
                    outline: none;
                }
                .font-input-box::placeholder { color: var(--fp-subtext); }
                
                .font-file-icon {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    color: #007aff; font-size: 20px; cursor: pointer;
                }

                .font-preview-box {
                    width: 100%; height: 140px; 
                    padding: 20px;
                    background: var(--fp-preview-bg);
                    border-radius: 12px;
                    border: 1px solid var(--fp-input-border);
                    box-sizing: border-box;
                    font-size: 20px;
                    line-height: 1.5;
                    overflow: auto;
                    color: var(--fp-text);
                    display: flex; flex-direction: column; justify-content: center; text-align: center;
                }

                .font-main-btn {
                    width: 100%; height: 50px;
                    border-radius: 12px;
                    font-size: 17px; font-weight: 600;
                    border: none;
                    cursor: pointer;
                    margin-bottom: 16px;
                    text-align: center;
                }
                .btn-primary { background: #007aff; color: #ffffff; }
                .btn-secondary { background: var(--fp-btn-sec-bg); color: var(--fp-text); border: 1px solid var(--fp-input-border); }
                .font-page-content.force-dark .btn-secondary { color: var(--fp-btn-sec-text); }
                
                .font-control-row > * { min-width: 0; }
            </style>
            
            <div class="font-form-group">
                <span class="font-sublabel">字体预设 (PRESETS)</span>
                <div class="font-control-row">
                    <select id="font-preset-select" class="font-select">${optionsHtml}</select>
                    <button id="btn-save-preset" class="font-btn-small btn-save-preset">保存</button>
                    <button id="btn-delete-preset" class="font-btn-small btn-delete-preset">删除</button>
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">URL 或 本地文件 (SOURCE)</span>
                <div class="font-input-container">
                    <input type="text" id="font-url-input" class="font-input-box" value="${currentUrl}" placeholder="https://example.com/font.ttf">
                    <div id="font-file-trigger" class="font-file-icon" title="Upload Local File">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </div>
                    <input type="file" id="font-file-input" style="display:none;" accept=".ttf,.otf,.woff,.woff2">
                </div>
            </div>

            <div class="font-form-group">
                <span class="font-sublabel">实时预览 (PREVIEW)</span>
                <div id="realtime-preview" class="font-preview-box" style="font-family: '${currentName}', sans-serif;">
                    <div>你好世界 Hello World</div>
                    <div style="font-size: 14px; opacity: 0.7; margin-top: 10px;">这是字体预览效果 12345.</div>
                </div>
            </div>

            <div style="margin-top: 40px;">
                <button id="btn-apply-font" class="font-main-btn btn-primary">保存并应用</button>
                <button id="btn-reset-font" class="font-main-btn btn-secondary">恢复默认字体</button>
            </div>
            <div style="height: 50px;"></div>
        </div>
    `;
}

function bindFontPageDesignEventsV5(page) {
    const backBtn = page.querySelector('#font-back-v5');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }

    const s = window.sysStore;
    const urlInput = page.querySelector('#font-url-input');
    const previewBox = page.querySelector('#realtime-preview');
    const presetSelect = page.querySelector('#font-preset-select');
    const fileInput = page.querySelector('#font-file-input');
    const fileTrigger = page.querySelector('#font-file-trigger');

    const updatePreview = (url, name = 'PreviewFont') => {
        if (!url) {
            previewBox.style.fontFamily = 'inherit';
            return;
        }
        const fontFaceId = 'temp-preview-style';
        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }
        style.textContent = `@font-face { font-family: '${name}'; src: url('${url}'); font-display: swap; }`;
        previewBox.style.fontFamily = `'${name}', sans-serif`;
    };

    if (urlInput) {
        urlInput.addEventListener('input', () => {
            updatePreview(urlInput.value.trim(), 'TempPreview_' + Date.now());
        });
    }

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const id = presetSelect.value;
            if (!id) return;
            const fonts = JSON.parse(s.get('custom_fonts') || '[]');
            const font = fonts.find(f => f.id === id);
            if (font) {
                urlInput.value = font.value;
                updatePreview(font.value, font.name);
            }
        });
    }

    page.querySelector('#btn-save-preset').addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (!val) { alert('请输入字体 URL'); return; }
        const name = prompt('请输入预设名称:', 'My Font');
        if (!name) return;
        const newFont = {
            id: 'font_' + Date.now(),
            name: name,
            type: val.startsWith('data:') ? 'local' : 'url',
            value: val
        };
        let fonts = JSON.parse(s.get('custom_fonts') || '[]');
        fonts.push(newFont);
        s.set('custom_fonts', JSON.stringify(fonts));
        page.innerHTML = renderFontPageDesignV5();
        bindFontPageDesignEventsV5(page);

        const newSelect = page.querySelector('#font-preset-select');
        if (newSelect) newSelect.value = newFont.id;
        page.querySelector('#font-url-input').value = val;
    });

    page.querySelector('#btn-delete-preset').addEventListener('click', () => {
        const id = presetSelect.value;
        if (!id) { alert('请先选择一个预设'); return; }
        if (confirm('确定删除该预设吗?')) {
            let fonts = JSON.parse(s.get('custom_fonts') || '[]');
            fonts = fonts.filter(f => f.id !== id);
            s.set('custom_fonts', JSON.stringify(fonts));
            page.innerHTML = renderFontPageDesignV5();
            bindFontPageDesignEventsV5(page);
        }
    });

    page.querySelectorAll('#btn-apply-font').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = urlInput.value.trim();
            if (!val) { alert('URL 为空'); return; }
            let name = 'Custom Font';
            const id = presetSelect.value;
            if (id) {
                const fonts = JSON.parse(s.get('custom_fonts') || '[]');
                const f = fonts.find(i => i.id === id);
                if (f) name = f.name;
            }
            const fontData = {
                id: id || ('applied_' + Date.now()),
                name: name,
                type: val.startsWith('data:') ? 'local' : 'url',
                value: val
            };
            s.set('active_font', JSON.stringify(fontData));
            if (window.os && window.os.applyFont) window.os.applyFont(fontData);
            alert('字体已应用');
        });
    });

    page.querySelector('#btn-reset-font').addEventListener('click', () => {
        const def = { type: 'system', value: 'system-ui', name: 'System Default' };
        s.set('active_font', JSON.stringify(def));
        if (window.os && window.os.applyFont) window.os.applyFont(def);
        urlInput.value = '';
        presetSelect.value = '';
        previewBox.style.fontFamily = 'inherit';
        alert('已恢复系统默认字体');
    });

    if (fileTrigger && fileInput) {
        fileTrigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                urlInput.value = base64;
                updatePreview(base64, file.name);
            } catch (e) { alert('读取文件失败'); }
        });
    }
}

/**
 *     Open Appearance Page (初始化并打开外观设置)
 */
function openAppearancePage(app) {
    const page = document.createElement('div');
    page.className = 'settings-page appearance-page';
    page.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ios-bg); z-index: 10; transition: transform 0.3s ease; transform: translateX(100%); display: flex; flex-direction: column;";

    page.innerHTML = renderAppearancePageContent();
    app.appendChild(page);

    requestAnimationFrame(() => {
        page.style.transform = 'translateX(0)';
    });

    bindAppearancePageEvents(page);
}

/**
 *     Render Appearance HTML (生成外观设置页面的HTML)
 */
function renderAppearancePageContent() {
    const s = window.sysStore;
    const lockEnabled = s.get('lock_screen_enabled') === 'true';
    const password = s.get('lock_screen_password') || '';

    // Get Wallpapers for Preview
    const lockWpSrc = s.get('lock_screen_wallpaper') || '';
    const homeWpSrc = s.get('home_screen_wallpaper') || '';

    // System Toggles
    const showStatusBar = s.get('show_status_bar') !== 'false';
    const showDynamicIsland = s.get('show_dynamic_island') !== 'false';

    // Inline Styles - 修复暗黑模式标题颜色 & 居中对齐
    const headerStyle = "display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; height: 94px; background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); box-sizing: border-box; position: sticky; top: 0; z-index: 100;";
    // 使用固定的宽度确保标题绝对居中
    const navBtnStyle = "width: 70px; color: #007aff; font-size: 17px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer;";
    const titleStyle = "flex: 1; font-size: 17px; font-weight: 600; color: #fff; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
    const saveBtnStyle = "width: 70px; color: #007aff !important; font-size: 17px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: flex-end;";

    const sectionTitleStyle = "padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;";

    const wpSectionStyle = "display: flex; justify-content: center; gap: 40px; padding: 20px 0;";
    const wpWrapperStyle = "display: flex; flex-direction: column; align-items: center; gap: 10px;";
    const wpLabelStyle = "font-size: 13px; color: #fff; font-weight: 500;";

    const wpPreviewStyle = (src) => `width: 100px; height: 180px; border-radius: 14px; background-color: #333; background-size: cover; background-position: center; border: 1px solid rgba(255,255,255,0.15); position: relative; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.3); ${src ? `background-image: url('${src}');` : ''} display: flex; align-items: center; justify-content: center;`;
    const wpTextStyle = "font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;";

    // Close button style
    const closeBtnStyle = "position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #8e8e93; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; font-weight: bold; border: 2px solid #000; z-index: 10; cursor: pointer;";

    return `
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; sticky; top: 0; z-index: 100;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="appearance-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">外观</div>
                <div id="appearance-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>
        
        <div class="settings-content" style="padding-top: 0;">
            <!-- 系统显示 Section -->
            <div style="${sectionTitleStyle}">系统显示</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label">顶部状态栏</div>
                    <div class="ios-switch ${showStatusBar ? 'on' : ''}" id="toggle-status-bar">
                        <div class="switch-knob"></div>
                    </div>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label">灵动岛</div>
                    <div class="ios-switch ${showDynamicIsland ? 'on' : ''}" id="toggle-dynamic-island">
                        <div class="switch-knob"></div>
                    </div>
                </div>
            </div>

            <!-- 锁屏安全 Section -->
            <div style="${sectionTitleStyle}">锁屏安全</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label">启用锁屏密码</div>
                    <div class="ios-switch ${lockEnabled ? 'on' : ''}" id="lock-screen-toggle">
                        <div class="switch-knob"></div>
                    </div>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label">4位数字密码</div>
                    <input type="text" id="lock-password" value="${password}" placeholder="1 2 3 4" maxlength="4" style="text-align: right; background: rgba(118, 118, 128, 0.24); border-radius: 6px; border: none; color: #fff; font-size: 17px; outline: none; width: 80px; padding: 4px 8px; letter-spacing: 4px;">
                </div>
            </div>
            
            <!-- 壁纸 Section (Side by Side) -->
            <div style="${sectionTitleStyle}">壁纸设置</div>
            <div style="${wpSectionStyle}">
                <!-- Lock Screen -->
                <div style="${wpWrapperStyle}">
                    <div style="${wpPreviewStyle(lockWpSrc)}" id="preview-lock" data-role="lock">
                        ${!lockWpSrc ? '<div style="' + wpTextStyle + '">点击设置<br>锁屏壁纸</div>' : ''}
                        ${lockWpSrc ? `<div style="${closeBtnStyle}" class="wp-reset" data-target="lock">×</div>` : ''}
                    </div>
                    <div style="${wpLabelStyle}">锁屏</div>
                </div>
                
                <!-- Home Screen -->
                <div style="${wpWrapperStyle}">
                    <div style="${wpPreviewStyle(homeWpSrc)}" id="preview-home" data-role="home">
                        ${!homeWpSrc ? '<div style="' + wpTextStyle + '">点击设置<br>主屏壁纸</div>' : ''}
                        ${homeWpSrc ? `<div style="${closeBtnStyle}" class="wp-reset" data-target="home">×</div>` : ''}
                    </div>
                    <div style="${wpLabelStyle}">主屏幕</div>
                </div>
            </div>
            
            <!-- Presets & Advanced Section -->
            <div style="${sectionTitleStyle}">预设管理</div>
            <div class="settings-group">
                <!-- Appearance Preset -->
                <div class="settings-item no-icon">
                    <div class="settings-label">外观预设</div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="color:#8e8e93; font-size:16px;">默认</span>
                        <div class="settings-chevron">›</div>
                    </div>
                </div>
                 <!-- CSS Preset -->
                <div class="settings-item no-icon">
                    <div class="settings-label">CSS 预设</div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="color:#8e8e93; font-size:16px;">无</span>
                         <div class="settings-chevron">›</div>
                    </div>
                </div>
            </div>

            <div style="${sectionTitleStyle}">全局自定义 CSS</div>
            <div class="settings-group" style="padding:0; overflow:hidden;">
                <textarea id="custom-css-input" 
                    style="width: 100%; height: 180px; border: none; padding: 15px; box-sizing: border-box; background: transparent; color: #fff; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 13px; resize: none; outline: none; line-height: 1.4;" 
                    placeholder="/* 输入 CSS 代码... */"
                    spellcheck="false">${s.get('custom_css') || ''}</textarea>
                
                 <div class="settings-item" id="reset-css" style="justify-content: center; border-top: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
                    <div style="color: #ff453a; font-size: 17px;">重置 CSS</div>
                </div>
            </div>

             <div style="${sectionTitleStyle}">配置管理</div>
             <div class="settings-group">
                 <!-- Export -->
                <div class="settings-item no-icon" id="btn-export-config" style="cursor: pointer;">
                    <div class="settings-label" style="color: #007aff;">导出外观配置</div>
                    <div class="settings-chevron">›</div>
                </div>
                <!-- Import -->
                <div class="settings-item no-icon" id="btn-import-config" style="cursor: pointer;">
                    <div class="settings-label" style="color: #007aff;">导入外观配置</div>
                    <div class="settings-chevron">›</div>
                </div>
            </div>
            
            <div style="padding: 10px 30px; font-size: 12px; color: #8e8e93; text-align: center;">
                点击预览图上传新壁纸。
            </div>
        </div>
    `;
}

/**
 *     Bind Appearance Events (为外观页面绑定交互事件)
 */
function bindAppearancePageEvents(page) {
    // Back
    page.querySelector('#appearance-back').addEventListener('click', () => {
        page.style.transform = 'translateX(100%)';
        setTimeout(() => page.remove(), 350);
    });

    // --- System Toggles Logic ---
    const statusBarToggle = page.querySelector('#toggle-status-bar');
    const dynamicIslandToggle = page.querySelector('#toggle-dynamic-island');
    const lockScreenToggle = page.querySelector('#lock-screen-toggle');

    statusBarToggle.addEventListener('click', () => {
        statusBarToggle.classList.toggle('on');
        const isNowOn = statusBarToggle.classList.contains('on');
        window.sysStore.set('show_status_bar', isNowOn ? 'true' : 'false');

        const sb = document.querySelector('.status-bar');
        if (sb) sb.style.display = isNowOn ? 'flex' : 'none';
    });

    dynamicIslandToggle.addEventListener('click', () => {
        dynamicIslandToggle.classList.toggle('on');
        const isNowOn = dynamicIslandToggle.classList.contains('on');
        window.sysStore.set('show_dynamic_island', isNowOn ? 'true' : 'false');

        const island = document.querySelector('.dynamic-island');
        if (island) island.style.display = isNowOn ? 'flex' : 'none';
    });

    // Lock Screen Toggle
    lockScreenToggle.addEventListener('click', () => lockScreenToggle.classList.toggle('on'));

    // Save
    page.querySelector('#appearance-save').addEventListener('click', () => {
        const enabled = lockScreenToggle.classList.contains('on');
        const password = page.querySelector('#lock-password').value;
        const statusBarOn = statusBarToggle.classList.contains('on');
        const islandOn = dynamicIslandToggle.classList.contains('on');
        const customCSS = page.querySelector('#custom-css-input').value;

        window.sysStore.set('lock_screen_enabled', enabled ? 'true' : 'false');
        window.sysStore.set('lock_screen_password', password);
        window.sysStore.set('show_status_bar', statusBarOn ? 'true' : 'false');
        window.sysStore.set('show_dynamic_island', islandOn ? 'true' : 'false');

        window.sysStore.set('custom_css', customCSS);
        if (window.os && window.os.applyCustomCSS) {
            window.os.applyCustomCSS(customCSS);
        }

        alert('设置已保存');
    });

    // Reset CSS
    const resetCSSBtn = page.querySelector('#reset-css');
    if (resetCSSBtn) {
        resetCSSBtn.addEventListener('click', () => {
            if (confirm('确定要重置全局 CSS 吗？')) {
                page.querySelector('#custom-css-input').value = '';
            }
        });
    }

    // Export Config
    const btnExport = page.querySelector('#btn-export-config');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const config = {
                lock_screen_enabled: window.sysStore.get('lock_screen_enabled'),
                lock_screen_password: window.sysStore.get('lock_screen_password'),
                show_status_bar: window.sysStore.get('show_status_bar'),
                show_dynamic_island: window.sysStore.get('show_dynamic_island'),
                custom_css: window.sysStore.get('custom_css'),
                theme_mode: window.sysStore.get('theme_mode')
            };
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chara_config.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Import Config
    const btnImport = page.querySelector('#btn-import-config');
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.txt,.doc,.docx';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const config = JSON.parse(ev.target.result);
                        if (config.custom_css) {
                            // Update UI and Store
                            page.querySelector('#custom-css-input').value = config.custom_css;
                        }

                        // Update other toggles if present (visual update only, save to persist)
                        if (config.lock_screen_enabled) {
                            if (config.lock_screen_enabled === 'true') lockScreenToggle.classList.add('on');
                            else lockScreenToggle.classList.remove('on');
                        }

                        alert('配置已读取，请点击右上角“保存”以应用。');
                    } catch (e) {
                        alert('导入失败：文件格式不正确');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }

    // Mock buttons interaction
    const mockBtns = page.querySelectorAll('.mock-btn');
    mockBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('功能开发中...');
        });
    });

    // Wallpaper Upload Logic
    const handleUpload = (type, previewEl) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                const src = ev.target.result;
                updateWallpaper(type, src, previewEl);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    // Wallpaper Reset Logic
    const handleReset = (type, previewEl) => {
        if (confirm('确定要恢复默认壁纸吗？')) {
            updateWallpaper(type, '', previewEl);
        }
    };

    const updateWallpaper = (type, src, previewEl) => {
        const key = type === 'lock' ? 'lock_screen_wallpaper' : 'home_screen_wallpaper';

        // 1. Storage
        if (src) {
            window.sysStore.set(key, src);
        } else {
            window.sysStore.remove(key);
        }

        // 2. UI Update (Re-render the preview content to toggle close button)
        previewEl.style.backgroundImage = src ? `url('${src}')` : '';

        // Re-inject inner HTML logic
        const closeBtnStyle = "position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #8e8e93; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; font-weight: bold; border: 2px solid #000; z-index: 10; cursor: pointer;";
        const wpTextStyle = "font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;";
        const label = type === 'lock' ? '锁屏壁纸' : '主屏壁纸';

        if (src) {
            previewEl.innerHTML = `<div style="${closeBtnStyle}" class="wp-reset" data-target="${type}">×</div>`;
        } else {
            previewEl.innerHTML = `<div style="${wpTextStyle}">点击设置<br>${label}</div>`;
        }

        // Re-bind listener for the new reset button
        if (src) {
            const newReset = previewEl.querySelector('.wp-reset');
            newReset.addEventListener('click', (e) => {
                e.stopPropagation();
                handleReset(type, previewEl);
            });
        }

        // 3. System Update
        if (type === 'home') {
            const wp = document.querySelector('.wallpaper');
            if (wp) wp.style.setProperty('background-image', src ? `url('${src}')` : 'none', 'important');
        } else {
            if (window.os && window.os.updateLockScreenWallpaper) {
                window.os.updateLockScreenWallpaper(src);
            }
        }
    };

    // Bind Preview Clicks
    const pLock = page.querySelector('#preview-lock');
    const pHome = page.querySelector('#preview-home');

    // Click to upload
    pLock.addEventListener('click', (e) => {
        if (e.target.classList.contains('wp-reset')) return;
        handleUpload('lock', pLock);
    });
    pHome.addEventListener('click', (e) => {
        if (e.target.classList.contains('wp-reset')) return;
        handleUpload('home', pHome);
    });

    // Initial binding for existing reset buttons
    const resets = page.querySelectorAll('.wp-reset');
    resets.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleReset(btn.dataset.target, btn.closest('[data-role]'));
        });
    });
}


/**
 *     Open Notification Page (初始化并打开通知设置页面)
 */
function openNotificationPage(app) {
    const page = document.createElement('div');
    page.className = 'settings-page notification-page';
    page.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ios-bg); z-index: 10; transition: transform 0.3s ease; transform: translateX(100%); display: flex; flex-direction: column;";

    page.innerHTML = renderNotificationPageContent();
    app.appendChild(page);

    requestAnimationFrame(() => {
        page.style.transform = 'translateX(0)';
    });

    bindNotificationPageEvents(page);
}

/**
 *     Render Notification HTML (生成通知设置页面的HTML)
 */
function renderNotificationPageContent() {
    const s = window.sysStore;
    const notificationEnabled = s.get('notification_enabled') !== 'false';
    const notificationSound = s.get('notification_sound') || '';
    const notificationVolume = s.get('notification_volume') || '0.5';

    // 样式 - 适配日间/夜间模式
    const headerStyle = "display: flex; align-items: center; justify-content: space-between; padding: 44px 16px 10px; height: 94px; background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); box-sizing: border-box; position: sticky; top: 0; z-index: 100;";
    const navBtnStyle = "width: 70px; color: #007aff; font-size: 17px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer;";
    const titleStyle = "font-size: 17px; font-weight: 600; color: #fff; flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
    const saveBtnStyle = "width: 70px; color: #007aff !important; font-size: 17px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: flex-end;";
    const sectionTitleStyle = "padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;";

    const volPercent = (parseFloat(notificationVolume) * 100);

    // 获取用户自定义提示音列表
    let customSounds = [];
    try {
        customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
    } catch (e) { }

    // 生成自定义提示音列表 HTML
    let customSoundsHtml = '';
    customSounds.forEach((sound, index) => {
        const isSelected = notificationSound === `custom_${index}`;
        customSoundsHtml += `
            <div class="settings-item custom-sound no-icon ${isSelected ? 'selected' : ''}" data-index="${index}" style="cursor: pointer;">
                <div class="settings-label" style="flex: 1;">${sound.name}</div>
                <div class="sound-check" style="color: #007aff; font-size: 18px; margin-right: 10px;">${isSelected ? '✓' : ''}</div>
                <div class="custom-sound-delete" data-index="${index}" style="color: #ff3b30; font-size: 14px; padding: 4px 8px; cursor: pointer;">删除</div>
            </div>
        `;
    });

    return `
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; sticky; top: 0; z-index: 100;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="notification-back" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">通知</div>
                <div id="notification-save" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">保存</div>
            </div>
        </div>

            <div class="settings-content" style="padding-top: 0;">
                <!-- 通知开关 Section -->
                <div style="${sectionTitleStyle}">通知设置</div>
                <div class="settings-group">
                    <div class="settings-item no-icon">
                        <div class="settings-label">启用消息通知</div>
                        <div class="ios-switch ${notificationEnabled ? 'on' : ''}" id="toggle-notification">
                            <div class="switch-knob"></div>
                        </div>
                    </div>
                </div>

                <!-- 提示音 Section -->
                <div style="${sectionTitleStyle}">消息提示音</div>
                <div class="settings-group">
                    <div class="settings-item no-icon" style="flex-direction: column; align-items: stretch; padding: 12px 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span class="settings-label">音量</span>
                            <span id="volume-display" style="color: #8e8e93; font-size: 15px;">${Math.round(volPercent)}%</span>
                        </div>
                        <input type="range" id="notification-volume" min="0" max="1" step="0.05" value="${notificationVolume}"
                            style="width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none; background: linear-gradient(to right, #007aff 0%, #007aff ${volPercent}%, #3a3a3c ${volPercent}%, #3a3a3c 100%);">
                    </div>
                </div>

                <!-- 自带提示音 Section -->
                <div style="${sectionTitleStyle}">自带提示音</div>
                <div class="settings-group" id="builtin-sounds">
                    <div class="settings-item preset-sound no-icon ${notificationSound === 'classic' ? 'selected' : ''}" data-sound-id="classic" style="cursor: pointer;">
                        <div class="settings-label">微信经典</div>
                        <div class="sound-check" style="color: #007aff; font-size: 18px;">${notificationSound === 'classic' ? '✓' : ''}</div>
                    </div>
                    <div class="settings-item preset-sound no-icon ${notificationSound === 'block' ? 'selected' : ''}" data-sound-id="block" style="cursor: pointer;">
                        <div class="settings-label">kakao</div>
                        <div class="sound-check" style="color: #007aff; font-size: 18px;">${notificationSound === 'block' ? '✓' : ''}</div>
                    </div>
                    <div class="settings-item preset-sound no-icon ${notificationSound === 'cute' ? 'selected' : ''}" data-sound-id="cute" style="cursor: pointer;">
                        <div class="settings-label">qq经典</div>
                        <div class="sound-check" style="color: #007aff; font-size: 18px;">${notificationSound === 'cute' ? '✓' : ''}</div>
                    </div>
                </div>

                <!-- 自定义提示音 Section -->
                <div style="${sectionTitleStyle}">自定义提示音</div>
                <div class="settings-group">
                    <div class="settings-item no-icon" id="btn-upload-sound" style="justify-content: center; cursor: pointer;">
                        <div style="width: 100%; text-align: center; font-size: 17px; color: #007aff;">＋ 添加自定义提示音</div>
                    </div>
                    <input type="file" id="sound-file-input" accept="audio/*" style="display: none;">
                </div>

                <!-- 用户自定义提示音列表 -->
                <div class="settings-group" id="custom-sounds-list" style="display: ${customSoundsHtml ? 'block' : 'none'};">
                    ${customSoundsHtml}
                </div>

                <div style="padding: 10px 30px; font-size: 12px; color: #8e8e93; text-align: center;">
                    点击自带提示音可快速选择并试听。<br>
                        添加的自定义提示音将保存在本地。
                </div>

                <div style="height: 50px;"></div>
            </div>
        `;
}

/**
 *     Bind Notification Events (为通知页面绑定交互事件)
 */
function bindNotificationPageEvents(page) {
    const s = window.sysStore;

    // 微信风格内置提示音
    const builtinSounds = {
        'classic': 'https://files.catbox.moe/73u5nm.mp3',
        'block': 'https://files.catbox.moe/s7gftd.wav',
        'cute': 'https://files.catbox.moe/i3mohu.mp3'
    };

    let currentAudio = null;
    let selectedSoundId = s.get('notification_sound') || 'classic';

    // Back
    page.querySelector('#notification-back').addEventListener('click', () => {
        if (currentAudio) currentAudio.pause();
        page.style.transform = 'translateX(100%)';
        setTimeout(() => page.remove(), 350);
    });

    // 通知开关
    const notificationToggle = page.querySelector('#toggle-notification');
    notificationToggle.addEventListener('click', () => {
        notificationToggle.classList.toggle('on');
        s.set('notification_enabled', notificationToggle.classList.contains('on'));
    });

    // 保存检测
    const saveBtn = page.querySelector('#notification-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert('通知设置已保存');
        });
    }

    // 音量滑块
    const volumeSlider = page.querySelector('#notification-volume');
    const volumeDisplay = page.querySelector('#volume-display');

    const updateVolBg = (val) => {
        const percent = val * 100;
        volumeDisplay.textContent = Math.round(percent) + '%';
        volumeSlider.style.setProperty('background', `linear-gradient(to right, #007aff 0%, #007aff ${percent}%, #3a3a3c ${percent}%, #3a3a3c 100%)`, 'important');
        if (currentAudio) currentAudio.volume = val;
    };

    volumeSlider.addEventListener('input', (e) => {
        updateVolBg(parseFloat(e.target.value));
    });

    // Initial sync
    updateVolBg(parseFloat(volumeSlider.value));

    // 播放提示音函数
    const playSound = (soundId, audioData) => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        if (audioData) {
            currentAudio = new Audio(audioData);
            currentAudio.volume = parseFloat(volumeSlider.value);
            currentAudio.play().catch(() => { });
        } else if (builtinSounds[soundId]) {
            currentAudio = new Audio(builtinSounds[soundId]);
            currentAudio.volume = parseFloat(volumeSlider.value);
            currentAudio.play().catch(() => { });
        }
    };

    // 更新选中状态显示
    const updateSelection = (newSoundId) => {
        selectedSoundId = newSoundId;

        // 更新自带提示音选中状态
        page.querySelectorAll('#builtin-sounds .preset-sound').forEach(item => {
            const checkEl = item.querySelector('.sound-check');
            if (item.dataset.soundId === newSoundId) {
                item.classList.add('selected');
                if (checkEl) checkEl.textContent = '✓';
            } else {
                item.classList.remove('selected');
                if (checkEl) checkEl.textContent = '';
            }
        });

        // 更新自定义提示音选中状态
        page.querySelectorAll('#custom-sounds-list .custom-sound').forEach(item => {
            const checkEl = item.querySelector('.sound-check');
            const customId = `custom_${item.dataset.index}`;
            if (customId === newSoundId) {
                item.classList.add('selected');
                if (checkEl) checkEl.textContent = '✓';
            } else {
                item.classList.remove('selected');
                if (checkEl) checkEl.textContent = '';
            }
        });
    };

    // 自带提示音点击
    page.querySelectorAll('#builtin-sounds .preset-sound').forEach(item => {
        item.addEventListener('click', () => {
            const soundId = item.dataset.soundId;
            updateSelection(soundId);
            playSound(soundId);
        });
    });

    // 上传本地文件
    const uploadBtn = page.querySelector('#btn-upload-sound');
    const fileInput = page.querySelector('#sound-file-input');
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const name = prompt('请输入提示音名称:', file.name.replace(/\.[^.]+$/, ''));
        if (!name) return;

        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = ev => resolve(ev.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 保存到列表
            let customSounds = [];
            try {
                customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
            } catch (e) { }

            customSounds.push({ name, data: base64 });
            s.set('custom_notification_sounds', JSON.stringify(customSounds));

            // 刷新页面显示
            refreshCustomSoundsList(page, customSounds);

            alert('✅ 提示音已添加');
        } catch (err) {
            alert('文件读取失败');
        }
    });

    //     Refresh Custom Sound List (刷新自定义提示音列表)
    const refreshCustomSoundsList = (page, customSounds) => {
        const listEl = page.querySelector('#custom-sounds-list');
        if (customSounds.length === 0) {
            listEl.style.display = 'none';
            listEl.innerHTML = '';
            return;
        }

        listEl.style.display = 'block';
        listEl.innerHTML = customSounds.map((sound, index) => {
            const isSelected = selectedSoundId === `custom_${index}`;
            return `
            <div class="settings-item custom-sound ${isSelected ? 'selected' : ''}" data-index="${index}" style="cursor: pointer;">
                    <div class="settings-label" style="flex: 1;">${sound.name}</div>
                    <div class="sound-check" style="color: #007aff; font-size: 18px; margin-right: 10px;">${isSelected ? '✓' : ''}</div>
                    <div class="custom-sound-delete" data-index="${index}" style="color: #ff3b30; font-size: 14px; padding: 4px 8px; cursor: pointer;">删除</div>
            </div>
            `;
        }).join('');

        //     Rebind Events (重新绑定事件)
        bindCustomSoundEvents(page);
    };

    //     Bind Custom Sound Events (绑定自定义提示音事件)
    const bindCustomSoundEvents = (page) => {
        page.querySelectorAll('#custom-sounds-list .custom-sound').forEach(item => {
            //     Select Event (选择事件)
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('custom-sound-delete')) return;

                const index = parseInt(item.dataset.index);
                const customId = `custom_${index}`;
                updateSelection(customId);

                //     Play Sound (播放)
                let customSounds = [];
                try {
                    customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
                } catch (e) { }

                if (customSounds[index]) {
                    playSound(customId, customSounds[index].data);
                }
            });

            //     Delete Event (删除事件)
            const delBtn = item.querySelector('.custom-sound-delete');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (!confirm('确定删除这个提示音吗？')) return;

                    const index = parseInt(delBtn.dataset.index);
                    let customSounds = [];
                    try {
                        customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
                    } catch (e) { }

                    customSounds.splice(index, 1);
                    s.set('custom_notification_sounds', JSON.stringify(customSounds));

                    //     Reset to default if deleted (如果删除的是当前选中的，切换回默认)
                    if (selectedSoundId === `custom_${index}`) {
                        updateSelection('tri-tone');
                    }

                    refreshCustomSoundsList(page, customSounds);
                });
            }
        });
    };

    //     Bind Initial Events (初始绑定自定义提示音事件)
    bindCustomSoundEvents(page);

    //     Auto Save (自动保存函数)
    const autoSave = () => {
        const enabled = notificationToggle.classList.contains('on');
        const volume = volumeSlider.value;
        s.set('notification_enabled', enabled ? 'true' : 'false');
        s.set('notification_sound', selectedSoundId);
        s.set('notification_volume', volume);
    };

    //     Auto Save on Toggle (通知开关变化时自动保存)
    notificationToggle.addEventListener('click', () => {
        setTimeout(autoSave, 100);
    });

    //     Auto Save on Volume Change (音量变化时自动保存)
    volumeSlider.addEventListener('change', autoSave);

    //     Save on Back (返回时也保存一次)
    page.querySelector('#notification-back').addEventListener('click', autoSave, { once: true });
}

//     WeChat Style Sounds (微信风格自带提示音 - 使用类似音效资源)
function generateClassicSound() {
    //     Classic Sound (经典 - 类似微信经典提示音的清脆音效)
    return 'https://cdn.freesound.org/previews/709/709515_11861866-lq.mp3';
}

function generateBlockSound() {
    //     Block Sound (积木 - 轻快的积木碰撞音效)
    return 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3';
}

function generateCuteSound() {
    //     Cute Sound (可爱 - 可爱的泡泡/叮咚音效)
    return 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3';
}

