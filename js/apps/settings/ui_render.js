/**
 * js/apps/settings/ui_render.js
 * 负责 Settings App 的 UI 渲染逻辑 (HTML 生成)
 */

// 移除 import，改用全局变量
// import { ICONS } from './state.js';

// 定义全局命名空间
window.SettingsUI = {
    /**
     * 创建统一的导航头部 HTML
     */
    createHeaderHTML: function (title, backId = 'settings-back', actionText = '', actionId = '', isDark = false, hideBack = false) {
        const backColor = isDark ? '#fff' : '#007aff';
        const titleColor = isDark ? '#fff' : '#000';
        const actionHtml = actionText ? `<div class="settings-action" id="${actionId}" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">${actionText}</div>` : '<div style="width: 70px;"></div>';
        const backVisibility = hideBack ? 'opacity: 0;' : '';

        const backHtml = backId ?
            `<div class="settings-back" id="${backId}" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; ${backVisibility}">
                <svg viewBox="0 0 12 20" width="12" height="20" style="fill: ${backColor};"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
            </div>` :
            `<div style="width: 70px;"></div>`;

        return `
            <div class="settings-header" style="${isDark ? 'background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); border-bottom: none;' : ''}">
                <div class="settings-nav" style="display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 16px;">
                    ${backHtml}
                    <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: ${titleColor};">${title}</div>
                    ${actionHtml}
                </div>
            </div>
        `;
    }
};


/**
 * 渲染设置 App 主界面
 */
window.SettingsUI.renderSettingsApp = function () {
    const ICONS = window.SettingsState.ICONS;
    const s = window.sysStore;
    const isDark = s.get('dark_mode') !== 'false';

    const div = document.createElement('div');
    div.id = 'app-settings';
    div.className = 'app-window';

    // 获取当前头像
    const currentAvatar = s.get('user_avatar') || '';
    const avatarHtml = currentAvatar ?
        `<img src="${currentAvatar}" alt="Profile" id="settings-main-avatar-img">` :
        ICONS.person;

    // 获取用户信息
    const userName = s.get('user_name') || 'Chara User';

    div.innerHTML = `
        ${window.SettingsUI.createHeaderHTML('设置', 'settings-back', undefined, undefined, isDark, true)}
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
                ${window.SettingsUI.createSettingsItem('fullscreen', '全屏模式', '#5856d6', true, '', 'fullscreen-toggle')}
                ${window.SettingsUI.createSettingsItem('wifi', 'Wi-Fi', '#007aff', false, 'CharaNet', 'wifi-page')}
                ${window.SettingsUI.createSettingsItem('mic', '语音', '#ff9500', false, '', 'bluetooth-page')}
                ${window.SettingsUI.createSettingsItem('palette', '图像', '#af52de', false, '', 'cellular-page')}
                ${window.SettingsUI.createSettingsItem('hourglass', '后台活动', '#34c759', false, '', 'hotspot-page')}
                ${window.SettingsUI.createSettingsItem('moon', '暗黑模式', '#5856d6', true, '', 'dark-mode-toggle')}
            </div>

            <!-- General Section -->
            <div class="settings-group">
                ${window.SettingsUI.createSettingsItem('bubble', '聊天', '#007aff', false, '', 'chat-page')}
                ${window.SettingsUI.createSettingsItem('text', '字体', '#8e8e93', false, '', 'font-page')}
                ${window.SettingsUI.createSettingsItem('sun', '外观', '#007aff', false, '', 'appearance-page')}
                ${window.SettingsUI.createSettingsItem('bell', '通知', '#ff3b30', false, '', 'notification-page')}
            </div>
            
            <!-- App Section -->
            <div class="settings-group">
                ${window.SettingsUI.createSettingsItem('wrench', '开发者', '#666666', false, '', 'developer-page')}
            </div>
        </div>
    `;
    return div;
}

/**
 * 创建通用设置项 HTML
 */
window.SettingsUI.createSettingsItem = function (iconType, label, color, isSwitch = false, valueText = '', switchId = '') {
    const ICONS = window.SettingsState.ICONS;
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
window.SettingsUI.renderProfilePageContent = function () {
    const ICONS = window.SettingsState.ICONS;
    const s = window.sysStore;
    const isDark = s.get('dark_mode') !== 'false';
    const currentAvatar = s.get('user_avatar') || '';
    const avatarHtml = currentAvatar ?
        `<img src="${currentAvatar}" alt="Profile" id="profile-page-avatar-img">` :
        ICONS.person;

    // 获取开关状态
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
        ${window.SettingsUI.createHeaderHTML('Apple ID', 'profile-back', undefined, undefined, isDark)}
        
        <div class="profile-content">
            <!-- Scrollable Avatar Info Section -->
            <div style="display: flex; flex-direction: column; align-items: center; padding: 20px 0 30px 0;">
                <div class="profile-avatar" id="btn-upload-avatar" style="margin-bottom: 12px;">
                    ${avatarHtml}
                    <input type="file" id="avatar-upload-input" accept="image/*" style="display: none;">
                </div>
                <div class="profile-header-name" id="edit-profile-name" style="cursor: pointer; font-size: 24px; font-weight: 600; margin-bottom: 4px; color: ${isDark ? '#fff' : '#000'};">${userName}</div>
                <div class="profile-header-email" id="edit-profile-email" style="cursor: pointer; font-size: 13px; color: #8e8e93;">${userEmail}</div>
            </div>
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

            <!-- 数据管理 -->
            <div class="settings-section-title">数据管理</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label">本地图片占用</div>
                    <div class="settings-value" id="local-img-size">Loading...</div>
                    <div id="btn-compress-images" style="background: rgba(142,142,147,0.12); padding: 5px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #000; cursor: pointer;">压缩</div>
                </div>
                <div class="settings-item no-icon" id="btn-export-data" style="cursor: pointer;">
                    <div class="settings-label">导出所有数据</div>
                </div>
                 <div class="settings-item no-icon" id="btn-import-data" style="cursor: pointer;">
                    <div class="settings-label">导入备份文件</div>
                </div>
                 <div class="settings-item no-icon" id="btn-clean-redundant" style="cursor: pointer;">
                    <div class="settings-label">清理冗余数据</div>
                </div>
                 <div class="settings-item no-icon" id="btn-delete-worldbook" style="cursor: pointer;">
                    <div class="settings-label">删除世界书</div>
                </div>
                 <div class="settings-item no-icon" id="btn-advanced-clean" style="cursor: pointer;">
                    <div class="settings-label">高级数据清理</div>
                </div>
                 <div class="settings-item no-icon" id="btn-check-repair" style="cursor: pointer;">
                    <div class="settings-label">数据检查与修复</div>
                </div>
                 <div class="settings-item no-icon" id="btn-reset-appearance" style="cursor: pointer;">
                    <div class="settings-label">重置当前外观</div>
                </div>
                 <div class="settings-item no-icon" id="btn-reset-all" style="cursor: pointer;">
                    <div class="settings-label" style="color: #ff3b30;">初始化所有内容 (慎用)</div>
                </div>
            </div>
            
            <script>
                // Calculate size immediately
                (function(){
                    try {
                        let total = 0;
                        for(let key in localStorage){
                            if(localStorage.hasOwnProperty(key) && localStorage[key].startsWith('data:image')){
                                total += localStorage[key].length;
                            }
                        }
                        const mb = (total / 1024 / 1024).toFixed(2);
                        const el = document.getElementById('local-img-size');
                        if(el) el.innerText = mb + ' MB';
                    } catch(e) {}
                })();
            </script>
            <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 * 渲染 Wi-Fi (API) 页面内容
 */
window.SettingsUI.renderWifiPageContent = function () {
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
                        <input type="range" id="api-temp-slider" min="0" max="2" step="0.1" value="${tempValue}"
                            style="width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none; background: linear-gradient(to right, #007aff 0%, #007aff ${(tempValue / 2) * 100}%, #3a3a3c ${(tempValue / 2) * 100}%, #3a3a3c 100%);">
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
window.SettingsUI.renderBluetoothPageContent = function () {
    const s = window.sysStore;
    const voiceMode = s.get('voice_interface_type') || 'domestic'; // 'domestic' 或 'global'

    const labelStyle = 'flex: 1; font-size: 17px; color: #fff;';
    const inputStyle = 'text-align: right; background: transparent; border: none; color: #007aff; font-size: 17px; width: 100%; outline: none; padding: 0;';
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
            <div style="padding: 10px 15px; font-size: 13px; color: #8e8e93;">接口配置</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">接口类型</div>
                    <select class="settings-input" data-key="voice_interface_type" style="${inputStyle} direction: rtl;">
                        <option value="domestic" ${voiceMode === 'domestic' ? 'selected' : ''}>国内接口 (MiniMax)</option>
                        <option value="global" ${voiceMode === 'global' ? 'selected' : ''}>国外/通用接口 (OpenAI)</option>
                    </select>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">域名</div>
                    <input type="text" class="settings-input" data-key="voice_domain" placeholder="如: api.minimax.chat" value="${s.get('voice_domain') || (voiceMode === 'domestic' ? 'api.minimax.chat' : 'api.openai.com')}" style="${inputStyle}">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="voice_api_key" placeholder="Bearer Key" value="${s.get('voice_api_key') || ''}" style="${inputStyle}">
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">模型 (Model)</div>
                    <input type="text" class="settings-input" data-key="voice_model" placeholder="如: speech-01" value="${s.get('voice_model') || (voiceMode === 'domestic' ? 'speech-01' : 'tts-1')}" style="${inputStyle}">
                </div>
                <div class="settings-item no-icon" id="voice-group-row" style="display: ${voiceMode === 'domestic' ? 'flex' : 'none'};">
                    <div class="settings-label" style="${labelStyle}">Group ID</div>
                    <input type="text" class="settings-input" data-key="voice_group_id" placeholder="MiniMax ID" value="${s.get('voice_group_id') || ''}" style="${inputStyle}">
                </div>
            </div>

            <div style="${groupTitleStyle}">测试</div>
            <div class="settings-group">
                <div class="settings-item" id="btn-test-voice" style="justify-content: center; cursor: pointer;">
                    <div style="width: 100%; text-align: center; font-size: 17px; color: #007aff;">立即试听</div>
                </div>
            </div>
            <div style="padding: 10px 15px; font-size: 12px; color: #8e8e93; line-height: 1.4;">
                MiniMax 接口需要 Group ID；通用接口默认使用 OpenAI 规范路径 (/v1/audio/speech)。
            </div>
        </div>
    `;
}

/**
 * 渲染图像（NovelAI）页面内容
 */
window.SettingsUI.renderCellularPageContent = function () {
    const s = window.sysStore;
    const isUniversal = s.get('img_gen_universal') === 'true';
    const isNovelAI = s.get('novelai_enabled') === 'true';
    const naiModel = s.get('novelai_model') || 'v4.5 curated';

    const labelStyle = 'flex: 1; font-size: 17px; color: #fff;';
    const inputStyle = 'text-align: right; background: transparent; border: none; color: #007aff; font-size: 17px; width: 100%; outline: none; padding: 0;';
    const groupTitleStyle = 'padding: 0 15px 8px 15px; font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: -0.1px; margin-top: 25px;';

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

        <div class="profile-content" style="padding-top: 0;">
            <div style="padding: 10px 15px; font-size: 13px; color: #8e8e93;">基础设置</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">通用生图引擎</div>
                    <div class="ios-switch ${isUniversal ? 'on' : ''}" data-switch="img_gen_universal"><div class="switch-knob"></div></div>
                </div>
            </div>
            <div style="padding: 0 15px 15px; font-size: 12px; color: #8e8e93; line-height: 1.4;">
                开启后，系统将自动使用内置接口生成图像，无需配置 API。优先于 NovelAI。
            </div>

            <div style="${groupTitleStyle}">NovelAI (专业生图)</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">启用 NovelAI</div>
                    <div class="ios-switch ${isNovelAI ? 'on' : ''}" data-switch="novelai_enabled"><div class="switch-knob"></div></div>
                </div>
                <div class="settings-item no-icon" id="nai-model-row" style="cursor: pointer;">
                    <div class="settings-label" style="${labelStyle}">当前模型</div>
                    <div id="nai-model-display" style="color: #8e8e93; font-size: 16px;">${naiModel.toUpperCase()}</div>
                    <svg viewBox="0 0 8 13" width="8" height="13" style="fill: #c7c7cc; margin-left: 8px;"><path d="M1.5 1L0 2.5l4 4-4 4L1.5 12l5.5-5.5z"/></svg>
                </div>
                <div class="settings-item no-icon">
                    <div class="settings-label" style="${labelStyle}">API Key</div>
                    <input type="password" class="settings-input" data-key="novelai_key" placeholder="Bearer Key" value="${s.get('novelai_key') || ''}" style="${inputStyle}">
                </div>
            </div>

            <div style="${groupTitleStyle}">高级操作</div>
            <div class="settings-group">
                <div class="settings-item" id="btn-novelai-test" style="justify-content: center; cursor: pointer;">
                    <div style="color: #007aff; font-size: 17px;">测试图像生成</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染后台活动页面内容
 */
window.SettingsUI.renderHotspotPageContent = function () {
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
                    <div class="settings-label" style="${labelStyle}">拉黑冷却 (小时)</div>
                    <input type="number" class="settings-input-small" data-key="bg_cooldown_hours" value="${s.get('bg_cooldown_hours') || '1'}" style="width:50px; text-align:right; background:transparent; border:none; color:#8e8e93; font-size:17px; outline:none;">
                </div>
            </div>
            <div style="padding: 10px 15px; font-size: 13px; color: #8e8e93; line-height: 1.4;">
                配置项说明：<br>
                1. 检测间隔控制系统后台唤醒 API 的周期。<br>
                2. 冷却时间用于未来扩展功能（如角色主动申请加回好友）。<br>
                3. 开启后台活动会增加 API 费用，请谨慎使用。
            </div>
        </div>
    `;
}

/**
 * 渲染聊天设置页面内容
 */
window.SettingsUI.renderChatPageContent = function () {
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
            <div style="padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 15px;">加载配置</div>
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

            <div style="padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;">危险操作</div>
            <div class="settings-group">
                <div class="settings-item no-icon" id="btn-clear-all-messages" style="cursor: pointer;">
                    <div class="settings-label" style="color: #ff3b30;">清空所有聊天历史</div>
                    <div class="settings-chevron">›</div>
                </div>
            </div>
            
             <div style="height: 50px;"></div>
        </div>
    `;
}

/**
 * 渲染字体设置页面 (Design V5)
 */
window.SettingsUI.renderFontPageDesignV5 = function () {
    const s = window.sysStore;
    const activeFontStr = s.get('active_font');
    const activeFont = activeFontStr ? JSON.parse(activeFontStr) : null;
    const customFonts = JSON.parse(s.get('custom_fonts') || '[]');
    const currentUrl = activeFont ? activeFont.value : '';
    const currentName = activeFont ? activeFont.name : '系统默认 (System)';

    const sectionTitleStyle = "padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;";

    return `
        <div class="settings-header" style="background: rgba(0,0,0,0.8); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: none; position: sticky; top: 0; z-index: 100;">
            <div class="settings-nav" style="display: flex; justify-content: space-between; align-items: center; padding: 0 16px; height: 44px;">
                <div class="settings-back" id="font-back-v5" style="width: 70px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #007aff;">
                    <svg viewBox="0 0 12 20" width="12" height="20" style="fill: #007aff;"><path d="M10 0L0 10l10 10 1.5-1.5L3 10l8.5-8.5z"/></svg>
                </div>
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">字体设置</div>
                <div class="settings-action btn-apply-font-trigger" style="width: 70px; display: flex; justify-content: flex-end; color: #007aff !important; cursor: pointer; font-weight: 600;">应用</div>
            </div>
        </div>
        
        <div class="settings-content" style="padding-top: 0;">
            <!-- 预设 Section -->
            <div style="${sectionTitleStyle}">库中收藏</div>
            <div class="settings-group">
                <div class="settings-item no-icon" id="font-preset-row">
                    <div class="settings-label">当前预设</div>
                    <div style="color: #8e8e93; font-size: 16px; display: flex; align-items: center;">
                        <span id="font-preset-display">${currentName}</span>
                        <div class="settings-chevron">
                           <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5L6.5 6.5L1.5 11.5" stroke="#5d5d62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>
                </div>
                <div class="settings-item no-icon" style="justify-content: space-between;">
                    <span id="btn-save-preset" style="color: #007aff; font-size: 16px; cursor: pointer;">保存为新预设</span>
                    <span id="btn-delete-preset" style="color: #ff3b30; font-size: 16px; cursor: pointer;">删除此预设</span>
                </div>
            </div>

            <!-- 配置源 Section -->
            <div style="${sectionTitleStyle}">字体配置</div>
            <div class="settings-group">
                <div class="settings-item no-icon" style="flex-direction: column; align-items: stretch; padding: 12px 16px; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="settings-label" style="font-size: 15px; color: #8e8e93;">字体源 (URL 或 Base64)</span>
                        <div id="font-file-trigger" style="background: rgba(118,118,128,0.24); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #007aff; cursor: pointer;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </div>
                    </div>
                    <textarea id="font-url-input" style="background: rgba(118,118,128,0.12); border: 1px solid rgba(255,255,255,0.05); color: #fff; font-size: 14px; width: 100%; height: 80px; outline: none; padding: 12px; border-radius: 10px; resize: none; font-family: monospace;" placeholder="请输入字体直链或粘贴 Base64 数据...">${currentUrl}</textarea>
                    <input type="file" id="font-file-input" style="display:none;" accept=".ttf,.otf,.woff,.woff2">
                </div>
            </div>

            <!-- 预览 Section -->
             <div style="${sectionTitleStyle}">排版预览</div>
             <div style="margin: 0 16px; padding: 30px 20px; background: #1c1c1e; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 140px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <div id="realtime-preview" style="font-family: '${currentName}', sans-serif; text-align: center; width: 100%; transition: all 0.3s ease;">
                    <div style="font-size: 28px; color: #fff; font-weight: 500; margin-bottom: 12px;">Chara OS 字体</div>
                    <div style="font-size: 15px; color: #8e8e93; line-height: 1.5;">这是一段示例文本。<br>The quick brown fox jumps over the lazy dog.</div>
                </div>
             </div>

            <div style="margin-top: 40px; padding: 0 20px; display: flex; flex-direction: column; gap: 14px;">
                <div class="btn-apply-font-trigger" style="background: #007aff; color: #fff; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">应用当前字体</div>
                <div id="btn-reset-font" style="background: #fff; color: #000; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">恢复默认字体</div>
            </div>
            <div style="height: 60px;"></div>
        </div>
    `;
}

/**
 * 渲染外观设置页面的 HTML
 */
/**
 * 渲染外观设置页面的 HTML
 */
window.SettingsUI.renderAppearancePageContent = function () {
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
    const wpLabelStyle = "font-size: 13px; color: #8e8e93; font-weight: 500;";

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
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">外观</div>
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

            
            <!-- Appearance Section -->
            <div style="${sectionTitleStyle}">外观方案</div>
            <div class="settings-group">
                <div class="settings-item no-icon" id="appearance-preset-row">
                    <div class="settings-label">当前预设</div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span id="appearance-preset-display" style="color:#8e8e93; font-size:16px;">默认</span>
                        <div class="settings-chevron">›</div>
                    </div>
                </div>
                <div class="settings-item no-icon" id="btn-save-appearance-preset" style="justify-content: center; cursor: pointer;">
                    <div style="color: #007aff; font-size: 17px;">存储为新预设</div>
                </div>
            </div>

             <!-- CSS Section -->
             <div style="${sectionTitleStyle}">CSS 方案</div>
             <div class="settings-group">
                <div class="settings-item no-icon" id="css-preset-row">
                    <div class="settings-label">当前预设</div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span id="css-preset-display" style="color:#8e8e93; font-size:16px;">无</span>
                         <div class="settings-chevron">›</div>
                    </div>
                </div>
                <div class="settings-item no-icon" id="btn-save-css-preset" style="justify-content: center; cursor: pointer;">
                    <div style="color: #007aff; font-size: 17px;">存储为新预设</div>
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
        </div>
    `;
}

/**
 * 渲染通知设置页面的 HTML
 */
window.SettingsUI.renderNotificationPageContent = function () {
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
                <div class="settings-title" style="flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #fff;">通知</div>
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

/**
 * 渲染开发者设置页面
 */
window.SettingsUI.renderDeveloperPage = function () {
    const s = window.sysStore;
    const isDark = s.get('dark_mode') !== 'false';
    const showLogs = s.get('dev_show_logs') === 'true';

    return `
        ${window.SettingsUI.createHeaderHTML('开发者', 'developer-back', '保存', 'developer-save', isDark)}
        <div class="settings-content">
            <div style="padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 15px;">调试选项</div>
            <div class="settings-group">
                <div class="settings-item no-icon">
                    <div class="settings-label">显示运行时日志</div>
                    <div class="ios-switch ${showLogs ? 'on' : ''}" data-switch="dev_show_logs"><div class="switch-knob"></div></div>
                </div>
                <div class="settings-item no-icon" id="btn-view-system-info" style="cursor: pointer;">
                    <div class="settings-label">查看系统详细信息</div>
                    <div class="settings-chevron">›</div>
                </div>
            </div>

            <div style="padding: 0 16px 8px; font-size: 13px; color: #8e8e93; text-transform: uppercase; margin-top: 25px;">系统日志</div>
            <div class="settings-group" style="padding: 15px; background: ${isDark ? '#000' : '#f2f2f7'}; font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: ${isDark ? '#0f0' : '#3a3a3c'}; min-height: 200px; overflow-y: auto; border: ${isDark ? 'none' : '1px solid rgba(0,0,0,0.05)'}; line-height: 1.5;">
                <div id="dev-log-area">
                    [SYSTEM] CharaOS Kernel v1.0.4 loaded.<br>
                    [INFO] Memory: ${(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB used.<br>
                    [DEBUG] Registered 4 active modules.<br>
                    > _
                </div>
            </div>
            
            <div style="height: 50px;"></div>
        </div>
    `;
};


/**
 * 渲染导出选项的操作表 (ActionSheet)
 */
window.SettingsUI.renderExportSheet = function (isDark) {
    const bg = isDark ? '#1c1c1e' : '#f2f2f7';
    const itemBg = isDark ? '#2c2c2e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    return `
        <div class="action-sheet-mask" style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding-bottom: 20px; animation: fadeIn 0.3s ease;">
            <div class="action-sheet-container" style="width: 92%; max-width: 400px; animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                <div style="background: ${itemBg}; border-radius: 14px; overflow: hidden; margin-bottom: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div style="padding: 15px; text-align: center; color: #8e8e93; font-size: 13px; border-bottom: 1px solid ${border};">选择导出方式</div>
                    <div class="sheet-item" data-type="split" style="padding: 16px; text-align: center; color: #007aff; font-size: 18px; border-bottom: 1px solid ${border}; cursor: pointer;">
                        分片导出 (推荐)
                        <div style="font-size: 12px; color: #8e8e93; margin-top: 2px;">打包为 ZIP, 增量导入更稳定</div>
                    </div>
                    <div class="sheet-item" data-type="smart" style="padding: 16px; text-align: center; color: #007aff; font-size: 18px; border-bottom: 1px solid ${border}; cursor: pointer;">
                        智能导出 (单个文件)
                        <div style="font-size: 12px; color: #8e8e93; margin-top: 2px;">适合数据量较小的情况</div>
                    </div>
                    <div class="sheet-item" data-type="legacy" style="padding: 16px; text-align: center; color: #007aff; font-size: 18px; cursor: pointer;">传统导出</div>
                </div>
                <div class="sheet-close" style="background: ${itemBg}; border-radius: 14px; padding: 16px; text-align: center; color: #007aff; font-size: 18px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">取消</div>
            </div>
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            </style>
        </div>
    `;
};

/**
 * 渲染通用选项选择弹窗 (Modal) - 增强版支持删除
 */
window.SettingsUI.renderSelectionModal = function ({ title, items, isDark, canDelete = false }) {
    const bg = isDark ? '#1c1c1e' : '#f2f2f7';
    const text = isDark ? '#ffffff' : '#000000';
    const border = isDark ? '#333333' : '#c6c6c8';
    const headBg = isDark ? '#2c2c2e' : '#ffffff';

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <div class="modal-selection-item" data-id="${item.id}" style="padding: 14px 16px; border-bottom: 1px solid ${border}; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; flex: 1; pointer-events: none;">${item.label}</span>
                ${canDelete && item.id !== 'default' && item.id !== 'none' ? `
                    <div class="modal-item-delete" data-id="${item.id}" style="color: #ff3b30; font-size: 20px; font-weight: bold; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: -10px;">×</div>
                ` : `
                    <div style="color: #8e8e93; font-size: 14px;">${item.id === 'default' || item.id === 'none' ? '系统' : ''}</div>
                `}
            </div>
        `;
    });

    return `
        <div class="modal-mask" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
            <div class="modal-body" style="background: ${bg}; width: 85%; max-height: 70%; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: ${text};">
                <div style="padding: 15px; text-align: center; font-weight: bold; border-bottom: 1px solid ${border}; background: ${headBg}; position: relative;">
                    ${title}
                    <div class="modal-close" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #8e8e93; font-weight: normal; cursor: pointer; font-size: 18px; padding: 5px;">✕</div>
                </div>
                <div class="modal-list no-scrollbar" style="overflow-y: auto; flex: 1;">
                    ${itemsHtml}
                </div>
            </div>
        </div>
    `;
};
