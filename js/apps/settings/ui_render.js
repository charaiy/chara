/**
 * js/apps/settings/ui_render.js
 * 负责 Settings App 的 UI 渲染逻辑 (HTML 生成)
 */

import { ICONS } from './state.js';

/**
 * 渲染设置 App 主界面
 */
export function renderSettingsApp() {
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
 * 创建通用设置项 HTML
 */
export function createSettingsItem(iconType, label, color, isSwitch = false, valueText = '', switchId = '') {
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
 * 渲染个人资料页面内容
 */
export function renderProfilePageContent() {
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
 * 渲染 Wi-Fi (API) 页面内容
 */
export function renderWifiPageContent() {
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

/**
 * 渲染蓝牙（语音服务）页面内容
 */
export function renderBluetoothPageContent() {
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
 * 渲染图像（NovelAI）页面内容
 */
export function renderCellularPageContent() {
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
 * 渲染后台活动页面内容
 */
export function renderHotspotPageContent() {
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
 * 渲染聊天设置页面内容
 */
export function renderChatPageContent() {
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
            
             <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 * 渲染字体设置页面 (Design V5)
 */
export function renderFontPageDesignV5() {
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
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; position: sticky; top: 0; z-index: 100;">
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

/**
 * 渲染外观设置页面的 HTML
 */
export function renderAppearancePageContent() {
    const s = window.sysStore;
    const lockEnabled = s.get('lock_screen_enabled') === 'true';
    const password = s.get('lock_screen_password') || '';

    // Get Wallpapers for Preview
    const lockWpSrc = s.get('lock_screen_wallpaper') || '';
    const homeWpSrc = s.get('home_screen_wallpaper') || '';

    // System Toggles
    const showStatusBar = s.get('show_status_bar') !== 'false';
    const showDynamicIsland = s.get('show_dynamic_island') !== 'false';

    // Inline Styles
    const sectionTitleStyle = "padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;";
    const wpSectionStyle = "display: flex; justify-content: center; gap: 40px; padding: 20px 0;";
    const wpWrapperStyle = "display: flex; flex-direction: column; align-items: center; gap: 10px;";
    const wpLabelStyle = "font-size: 13px; color: #fff; font-weight: 500;";

    const wpPreviewStyle = (src) => `width: 100px; height: 180px; border-radius: 14px; background-color: #333; background-size: cover; background-position: center; border: 1px solid rgba(255,255,255,0.15); position: relative; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.3); ${src ? `background-image: url('${src}');` : ''} display: flex; align-items: center; justify-content: center;`;
    const wpTextStyle = "font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;";

    // Close button style
    const closeBtnStyle = "position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #8e8e93; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; font-weight: bold; border: 2px solid #000; z-index: 10; cursor: pointer;";

    return `
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; position: sticky; top: 0; z-index: 100;">
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
 * 渲染通知设置页面的 HTML
 */
export function renderNotificationPageContent() {
    const s = window.sysStore;
    const notificationEnabled = s.get('notification_enabled') !== 'false';
    const notificationSound = s.get('notification_sound') || '';
    const notificationVolume = s.get('notification_volume') || '0.5';

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
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; position: sticky; top: 0; z-index: 100;">
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
        </div>
    `;
}
