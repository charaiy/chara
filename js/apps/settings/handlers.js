/**
 * 内部辅助：读取文件为 DataURL
 */
const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

/**
 * 内部辅助：处理图片上传逻辑 (支持 ImgBB)
 */
const handleImageUpload = async (file, useCloud = false) => {
    const s = window.sysStore;
    if (useCloud && s.get('imgbb_enabled') === 'true') {
        const cloudUrl = await window.SettingsState.Service.uploadToImgBB(file, s.get('imgbb_key'));
        if (cloudUrl) return cloudUrl;
    }
    return await readFileAsDataURL(file);
};

window.SettingsHandlers = {};

/**
 * 通用页面辅助函数
 */
const openPage = (app, className, renderFunc, bindFunc) => {
    let page = app.querySelector('.' + className);
    if (!page) {
        page = document.createElement('div');
        page.className = 'profile-page ' + className;
        page.innerHTML = renderFunc();
        app.appendChild(page);
        bindFunc(page);
    }
    requestAnimationFrame(() => page.classList.add('active'));
};


/**
 * 通用绑定器：处理返回、保存、开关逻辑
 */
const genericBind = (prefix) => (page) => {
    const s = window.sysStore;
    // 返回
    const backBtn = page.querySelector(`#${prefix}-back`);
    if (backBtn) backBtn.onclick = () => { page.classList.remove('active'); setTimeout(() => page.remove(), 350); };

    // 统一保存
    const saveBtn = page.querySelector(`#${prefix}-save`) || page.querySelector(`#${prefix}-save-btn`);
    if (saveBtn) saveBtn.onclick = () => {
        page.querySelectorAll('[data-key]').forEach(i => s.set(i.dataset.key, i.value.trim()));
        page.querySelectorAll('.ios-switch').forEach(sw => {
            const k = sw.dataset.switch;
            if (k) s.set(k, sw.classList.contains('on') ? 'true' : 'false');
        });
        if (window.os && window.os.showToast) window.os.showToast('设置已保存');
    };

    // 统一开关
    page.querySelectorAll('.ios-switch').forEach(sw => sw.onclick = () => {
        const isOn = sw.classList.toggle('on');
        const k = sw.dataset.switch;
        const val = isOn ? 'true' : 'false';
        if (k) {
            s.set(k, val);
            if (window.os?.applySetting) window.os.applySetting(k, val);
        }

        const targetId = sw.dataset.target;
        if (targetId) {
            const targetEl = page.querySelector(`#${targetId}`);
            if (targetEl) targetEl.style.display = isOn ? 'block' : 'none';
        }
    });
};

const PAGE_CONFIG = {
    'profile-row': { className: 'profile-page', render: 'renderProfilePageContent', bind: 'openProfilePage' },
    'wifi-page': { className: 'wifi-page-v2', render: 'renderWifiPageContent', bind: 'openWifiPage' },
    'bluetooth-page': { className: 'bluetooth-page', render: 'renderBluetoothPageContent', bind: 'openBluetoothPage' },
    'cellular-page': { className: 'cellular-page', render: 'renderCellularPageContent', bind: 'openCellularPage' },
    'hotspot-page': { className: 'hotspot-page', render: 'renderHotspotPageContent', bind: 'openHotspotPage' },
    'chat-page': { className: 'chat-page', render: 'renderChatPageContent', bind: 'openChatPage' },
    'font-page': { className: 'font-page-v5', render: 'renderFontPageDesignV5', bind: 'openFontPage' },
    'appearance-page': { className: 'appearance-page', render: 'renderAppearancePageContent', bind: 'openAppearancePage' },
    'notification-page': { className: 'notification-page', render: 'renderNotificationPageContent', bind: 'openNotificationPage' },
    'developer-page': { className: 'developer-page', render: 'renderDeveloperPage', bind: 'openDeveloperPage' }
};

/**
 * 设置主界面
 */
window.SettingsHandlers.bindSettingsEvents = function (app, closeCallback) {
    const s = window.sysStore;
    const backBtn = app.querySelector('#settings-back');
    if (backBtn) backBtn.onclick = () => closeCallback();

    app.querySelectorAll('[data-action], .profile-row').forEach(el => {
        const action = el.dataset.action || 'profile-row';
        const cfg = PAGE_CONFIG[action];
        if (cfg) {
            el.onclick = () => openPage(app, cfg.className, window.SettingsUI[cfg.render], window.SettingsHandlers[cfg.bind]);
        }
    });


    // 主页快捷开关
    const fsBtn = app.querySelector('[data-action="fullscreen-toggle"]');
    if (fsBtn) fsBtn.onclick = () => {
        const isOn = document.getElementById('os-root').classList.toggle('fullscreen-mode');
        fsBtn.querySelector('.ios-switch').classList.toggle('on', isOn);
        s.set('fullscreen_mode', isOn ? 'true' : 'false');
    };

    const darkModeItem = app.querySelector('[data-action="dark-mode-toggle"]');
    if (darkModeItem) darkModeItem.onclick = () => {
        const sw = darkModeItem.querySelector('.ios-switch');
        const isOn = sw.classList.toggle('on');
        s.set('dark_mode', isOn ? 'true' : 'false');
        window.ThemeManager?.setDarkMode(isOn);

        // 立即更新头部样式
        const header = app.querySelector('.settings-header');
        const title = app.querySelector('.settings-title');
        const backSvg = app.querySelector('.settings-back svg');

        if (isOn) {
            if (header) {
                header.style.background = 'rgba(0,0,0,0.8)';
                header.style.backdropFilter = 'saturate(180%) blur(20px)';
                header.style.borderBottom = 'none';
            }
            if (title) title.style.color = '#fff';
            if (backSvg) backSvg.style.fill = '#fff';
        } else {
            if (header) {
                header.style.background = '';
                header.style.backdropFilter = '';
                header.style.borderBottom = '';
            }
            if (title) title.style.color = '#000';
            if (backSvg) backSvg.style.fill = '#007aff';
        }
    };
};

/**
 * 个人资料 (全面覆盖)
 */
window.SettingsHandlers.openProfilePage = (page) => {
    const s = window.sysStore;
    genericBind('profile')(page);

    // 头像与信息
    const fI = page.querySelector('#avatar-upload-input');
    const avatarBtn = page.querySelector('#btn-upload-avatar');
    if (avatarBtn && fI) {
        avatarBtn.onclick = () => fI.click();
        fI.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = await handleImageUpload(file, true);
            s.set('user_avatar', url);
            ['profile-page-avatar-img', 'settings-main-avatar-img'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = url;
            });
        };
    }

    const nameBtn = page.querySelector('#edit-profile-name');
    if (nameBtn) {
        nameBtn.onclick = () => {
            const n = prompt('新名字:', s.get('user_name') || 'User');
            if (n) {
                s.set('user_name', n);
                nameBtn.innerText = n;
                const h = document.getElementById('home-profile-name');
                if (h) h.innerText = n;
            }
        };
    }


    // GitHub
    page.querySelector('#btn-backup-upload').onclick = async () => {
        const cfg = { token: s.get('github_token'), user: s.get('github_user'), repo: s.get('github_repo'), filename: 'chara_backup.json', content: JSON.stringify(localStorage) };
        if (!cfg.token || !cfg.user || !cfg.repo) return alert('请完整配置 GitHub 信息 (Token, 用户名, 仓库名)');
        const btn = page.querySelector('#btn-backup-upload');
        const oldText = btn.innerText;
        btn.innerText = '正在上传...';
        const ok = await window.SettingsState.Service.githubAction('upload', cfg);
        btn.innerText = oldText;
        if (window.os) window.os.showToast(ok ? '云端备份成功' : '上传失败，检查 Token', ok ? 'success' : 'error');
    };
    page.querySelector('#btn-backup-download').onclick = async () => {
        const cfg = { token: s.get('github_token'), user: s.get('github_user'), repo: s.get('github_repo'), filename: 'chara_backup.json' };
        if (!cfg.token || !cfg.user || !cfg.repo) return alert('请完整配置 GitHub 信息');
        const btn = page.querySelector('#btn-backup-download');
        const oldText = btn.innerText;
        btn.innerText = '正在拉取...';
        const data = await window.SettingsState.Service.githubAction('download', cfg);
        btn.innerText = oldText;
        if (data && confirm('成功拉取云端数据，是否立即恢复并重启？\n注意：这将覆盖所有现有本地聊天记录和设置。')) {
            localStorage.clear();
            Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
            location.reload();
        } else if (!data) {
            alert('未找到备份文件或下载失败');
        }
    };

    // 数据管理
    window.SettingsHandlers.bindDataManagementEvents(page);
};


/**
 * 数据管理逻辑 (导入/导出/清理)
 */
window.SettingsHandlers.bindDataManagementEvents = function (page) {
    const s = window.sysStore;
    const sizeEl = page.querySelector('#local-img-size');
    if (sizeEl) sizeEl.innerText = (JSON.stringify(localStorage).length / 1024 / 1024).toFixed(2) + ' MB';

    page.querySelector('#btn-compress-images').onclick = async () => {
        if (!confirm('压缩将降低本地图片质量以节省空间，确定？')) return;
        const btn = page.querySelector('#btn-compress-images');
        const oldText = btn.innerText;
        btn.innerText = '···';

        let count = 0;
        try {
            const keys = Object.keys(localStorage);
            for (let k of keys) {
                const val = localStorage.getItem(k);
                if (val && typeof val === 'string' && val.startsWith('data:image')) {
                    count++;
                    console.log(`Compressing image for key: ${k}`);
                    const compressed = await window.SettingsState.Service.compressImage(val);
                    localStorage.setItem(k, compressed);
                }
            }
        } catch (e) {
            console.error('Compression Error:', e);
        }

        btn.innerText = oldText;
        if (count > 0) {
            if (window.os) window.os.showToast(`压缩完成，处理 ${count} 张图片`);
            setTimeout(() => location.reload(), 1500);
        } else {
            if (window.os) window.os.showToast('未检测到需压缩图片', 'info');
        }
    };
    // 导出数据
    page.querySelector('#btn-export-data').onclick = () => {
        const modal = document.createElement('div');
        modal.innerHTML = window.SettingsUI.renderExportSheet(s.get('dark_mode') !== 'false');
        document.getElementById('os-root').appendChild(modal.firstElementChild);
        const mask = document.querySelector('.action-sheet-mask');
        mask.querySelectorAll('.sheet-item').forEach(it => it.onclick = () => {
            window.SettingsState.Service.doExport(it.dataset.type, { ...localStorage });
            mask.remove();
        });
        mask.querySelector('.sheet-close').onclick = () => mask.remove();
        mask.onclick = (e) => { if (e.target === mask) mask.remove(); };
    };

    page.querySelector('#btn-import-data').onclick = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,.zip';
        input.onchange = (e) => {
            const f = e.target.files[0]; if (!f) return;
            const rd = new FileReader(); rd.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    Object.keys(d).forEach(k => localStorage.setItem(k, d[k]));
                    if (window.os) window.os.showToast('导入成功');
                    setTimeout(() => location.reload(), 1000);
                }
                catch (err) { if (window.os) window.os.showToast('非法文件格式', 'error'); }
            }; rd.readAsText(f);
        }; input.click();
    };

    const extra = {
        'btn-clean-redundant': () => {
            let count = 0, size = 0;
            const keys = Object.keys(localStorage);
            const standardKeys = [
                'chara_db_messages', 'chara_db_characters', 'chara_db_world',
                'main_api_key', 'main_api_url', 'main_model', 'bg_activity_enabled',
                'user_name', 'user_avatar', 'dark_mode', 'show_status_bar',
                'home_screen_wallpaper', 'lock_screen_wallpaper', 'active_font'
            ];
            keys.forEach(k => {
                if (k.startsWith('chara_os_')) {
                    const rawKey = k.replace('chara_os_', '');
                    // 如果键很大且不在标准列表中，也不是角色相关的，则视为冗余
                    if (!standardKeys.includes(rawKey) && !rawKey.startsWith('icon_') && !rawKey.startsWith('name_')) {
                        count++;
                        size += localStorage.getItem(k).length;
                        localStorage.removeItem(k);
                    }
                }
            });
            if (window.os) window.os.showToast(`清理完成: ${count} 碎片`);
        },
        'btn-advanced-clean': () => {
            if (!confirm('高级清理将扫描并移除已失效的角色聊天记录，是否继续？')) return;
            const msgs = s.get('chara_db_messages') || [];
            const chars = s.get('chara_db_characters') || {};
            const standardIds = ['file_helper', 'chara_assistant', 'pay', 'system', 'user', 'me', 'my'];
            const filteredMsgs = msgs.filter(m => {
                const target = m.sender_id === 'user' ? m.receiver_id : m.sender_id;
                return chars[target] || standardIds.includes(target);
            });
            const removedCount = msgs.length - filteredMsgs.length;
            s.set('chara_db_messages', filteredMsgs);
            if (window.os) window.os.showToast(`清理 ${removedCount} 条孤立消息`);
        },
        'btn-check-repair': () => {
            s.init(); // 触发初始化检测
            if (window.os) window.os.showToast('核心数据已修复', 'success');
        },
        'btn-delete-worldbook': () => { if (confirm('确认删除所有世界书数据？此操作不可撤销。')) { s.remove('chara_db_world'); if (window.os) window.os.showToast('已清空'); } },
        'btn-reset-appearance': () => { if (confirm('确认重置所有外观设置（壁纸、字体、自定义CSS）？')) { ['custom_css', 'lock_screen_wallpaper', 'home_screen_wallpaper', 'active_font', 'show_status_bar', 'show_dynamic_island'].forEach(k => s.remove(k)); location.reload(); } },
        'btn-reset-all': () => { if (confirm('⚠️ 警告：彻底抹除所有本地数据（包括聊天记录、API Key、已保存的角色）？此操作不可逆！')) { localStorage.clear(); location.reload(); } }
    };
    Object.keys(extra).forEach(id => { const el = page.querySelector('#' + id); if (el) el.onclick = extra[id]; });
};

/**
 * WiFi (API 配置与预设管理)
 */
window.SettingsHandlers.openWifiPage = (page) => {
    const s = window.sysStore;
    genericBind('wifi')(page);

    // 温度滑块
    const slider = page.querySelector('#api-temp-slider');
    const display = page.querySelector('#temp-display');
    const updateSlider = (v) => { display.innerText = v; slider.style.background = `linear-gradient(to right, #007aff 0%, #007aff ${v * 50}%, #3a3a3c ${v * 50}%, #3a3a3c 100%)`; };
    slider.oninput = (e) => { updateSlider(e.target.value); s.set('api_temperature', e.target.value); };
    updateSlider(slider.value);

    // 模型拉取
    const bindPull = (id, urlK, keyK, modelK) => {
        const btn = page.querySelector('#' + id); if (!btn) return;
        btn.onclick = async () => {
            const url = page.querySelector(`[data-key="${urlK}"]`).value.trim();
            const key = page.querySelector(`[data-key="${keyK}"]`).value.trim();

            // Auto-save credentials when pulling
            const s = window.sysStore;
            s.set(urlK, url);
            s.set(keyK, key);

            btn.innerText = "...";
            const ms = await window.SettingsState.Service.pullModels(url, key);
            btn.innerText = "拉取";
            if (ms && ms.length) {
                const modal = document.createElement('div');
                modal.innerHTML = window.SettingsUI.renderSelectionModal({ title: '选择模型', items: ms.map(m => ({ id: m.id, label: m.id })), isDark: s.get('dark_mode') !== 'false' });
                document.getElementById('os-root').appendChild(modal.firstElementChild);
                const m = document.querySelector('.modal-mask');
                m.querySelectorAll('.modal-selection-item').forEach(it => it.onclick = () => {
                    page.querySelector(`[data-key="${modelK}"]`).value = it.dataset.id;
                    s.set(modelK, it.dataset.id); m.remove();
                });
                m.querySelector('.modal-close').onclick = () => m.remove();
            } else alert('暂时无法连接 API\n请检查地址和 Key 是否正确');
        };
    };
    bindPull('btn-pull-models', 'main_api_url', 'main_api_key', 'main_model');
    bindPull('btn-pull-sub-models', 'sub_api_url', 'sub_api_key', 'sub_model');

    // 预设管理
    page.querySelector('#preset-row').onclick = () => {
        const ps = JSON.parse(s.get('api_presets') || '{}');
        const ks = Object.keys(ps); if (!ks.length) return alert('尚无预设');
        const modal = document.createElement('div');
        modal.innerHTML = window.SettingsUI.renderSelectionModal({ title: '加载预设', items: ks.map(k => ({ id: k, label: k })), isDark: s.get('dark_mode') !== 'false' });
        document.getElementById('os-root').appendChild(modal.firstElementChild);
        const m = document.querySelector('.modal-mask');
        m.querySelectorAll('.modal-selection-item').forEach(it => it.onclick = () => {
            const data = ps[it.dataset.id];
            Object.keys(data).forEach(k => { const el = page.querySelector(`[data-key="${k}"]`); if (el) el.value = data[k]; });
            page.querySelector('#preset-display').innerText = it.dataset.id; m.remove();
        });
        m.querySelector('.modal-close').onclick = () => m.remove();
    };

    page.querySelector('#btn-save-preset').onclick = () => {
        const name = page.querySelector('#new-preset-name').value.trim(); if (!name) return alert('请输入预设名');
        const ps = JSON.parse(s.get('api_presets') || '{}');
        const data = {}; page.querySelectorAll('[data-key]').forEach(i => data[i.dataset.key] = i.value);
        ps[name] = data; s.set('api_presets', JSON.stringify(ps)); if (window.os) window.os.showToast('预设已保存');
    };

    page.querySelector('#btn-del-preset').onclick = () => {
        const name = page.querySelector('#preset-display').innerText;
        if (name === "选择预设..." || !confirm('删除 "' + name + '"？')) return;
        const ps = JSON.parse(s.get('api_presets') || '{}'); delete ps[name];
        s.set('api_presets', JSON.stringify(ps));
        page.querySelector('#preset-display').innerText = "选择预设...";
        if (window.os) window.os.showToast('已删除');
    };
};


/**
 * 外观 (壁纸、CSS、导入/导出外观)
 */
window.SettingsHandlers.openAppearancePage = (page) => {
    const s = window.sysStore;
    genericBind('appearance')(page);

    // Manual Bindings for Switches
    const bindSwitch = (id, key) => {
        const el = page.querySelector('#' + id);
        if (el) el.onclick = () => {
            const on = el.classList.toggle('on');
            const val = on ? 'true' : 'false';
            s.set(key, val);
            if (window.os?.applySetting) window.os.applySetting(key, val);
        };
    };
    bindSwitch('toggle-status-bar', 'show_status_bar');
    bindSwitch('toggle-dynamic-island', 'show_dynamic_island');
    bindSwitch('lock-screen-toggle', 'lock_screen_enabled');

    const passInput = page.querySelector('#lock-password');
    if (passInput) passInput.oninput = () => s.set('lock_screen_password', passInput.value);

    // Wallpapers
    ['lock', 'home'].forEach(type => {
        const preview = page.querySelector(`#preview-${type}`);
        if (!preview) return;

        const resetBtn = preview.querySelector('.wp-reset');
        if (resetBtn) {
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                s.remove(`${type}_screen_wallpaper`);
                if (window.os?.applySetting) window.os.applySetting(`${type}_screen_wallpaper`, null);
                preview.style.backgroundImage = '';
                preview.innerHTML = `<div style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;">点击设置<br>${type === 'lock' ? '锁屏' : '主屏'}壁纸</div>`;
            };
        }

        preview.onclick = (e) => {
            if (e.target.classList.contains('wp-reset')) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (ev) => {
                const f = ev.target.files[0];
                if (!f) return;
                const url = await handleImageUpload(f, true);
                s.set(`${type}_screen_wallpaper`, url);
                if (window.os?.applySetting) window.os.applySetting(`${type}_screen_wallpaper`, url);
                preview.style.backgroundImage = `url('${url}')`;
                preview.innerHTML = `<div style="position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #8e8e93; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; font-weight: bold; border: 2px solid #000; z-index: 10; cursor: pointer;" class="wp-reset">×</div>`;
                // Rebind reset newly created
                preview.querySelector('.wp-reset').onclick = (ex) => {
                    ex.stopPropagation();
                    s.remove(`${type}_screen_wallpaper`);
                    if (window.os?.applySetting) window.os.applySetting(`${type}_screen_wallpaper`, null);
                    preview.style.backgroundImage = '';
                    preview.innerHTML = `<div style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;">点击设置<br>${type === 'lock' ? '锁屏' : '主屏'}壁纸</div>`;
                };
            };
            input.click();
        };
    });

    // CSS & Presets
    const cssInput = page.querySelector('#custom-css-input');
    if (cssInput) {
        cssInput.oninput = () => {
            s.set('custom_css', cssInput.value);
            if (window.os?.applySetting) window.os.applySetting('custom_css', cssInput.value);
        };
        page.querySelector('#reset-css').onclick = () => {
            cssInput.value = '';
            s.remove('custom_css');
            if (window.os?.applySetting) window.os.applySetting('custom_css', null);
        };
    }

    // Import/Export Config
    page.querySelector('#btn-export-config').onclick = () => {
        const cfg = {
            css: s.get('custom_css'),
            lock: s.get('lock_screen_wallpaper'),
            home: s.get('home_screen_wallpaper'),
            statusBar: s.get('show_status_bar'),
            island: s.get('show_dynamic_island')
        };
        window.SettingsState.Service.downloadFile(JSON.stringify(cfg), 'chara_appearance.json');
    };

    page.querySelector('#btn-import-config').onclick = () => {
        const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
        i.onchange = (e) => {
            const f = e.target.files[0];
            const r = new FileReader();
            r.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    if (d.css) s.set('custom_css', d.css);
                    if (d.lock) s.set('lock_screen_wallpaper', d.lock);
                    if (d.home) s.set('home_screen_wallpaper', d.home);
                    if (d.statusBar) s.set('show_status_bar', d.statusBar);
                    if (d.island) s.set('show_dynamic_island', d.island);
                    if (window.os) window.os.showToast('外观配置已导入');
                    setTimeout(() => location.reload(), 1000);
                } catch (err) { if (window.os) window.os.showToast('配置无效', 'error'); }
            };
            r.readAsText(f);
        };
        i.click();
    };

    // 预设管理：外观方案
    const bindPresets = (rowId, displayId, saveBtnId, storeKey) => {
        const row = page.querySelector('#' + rowId);
        const display = page.querySelector('#' + displayId);
        const saveBtn = page.querySelector('#' + saveBtnId);

        if (row) row.onclick = () => {
            const ps = JSON.parse(s.get(storeKey) || '{}');
            const ks = Object.keys(ps);
            if (!ks.length) return alert('尚无预设');
            const modal = document.createElement('div');
            modal.innerHTML = window.SettingsUI.renderSelectionModal({ title: '加载预设', items: ks.map(k => ({ id: k, label: k })), isDark: s.get('dark_mode') !== 'false', canDelete: true });
            document.getElementById('os-root').appendChild(modal.firstElementChild);
            const m = document.querySelector('.modal-mask');
            m.querySelectorAll('.modal-selection-item').forEach(it => {
                it.onclick = () => {
                    const data = ps[it.dataset.id];
                    Object.keys(data).forEach(k => { s.set(k, data[k]); if (window.os?.applySetting) window.os.applySetting(k, data[k]); });
                    if (display) display.innerText = it.dataset.id;
                    m.remove();
                    if (window.os) window.os.showToast('预设已应用');
                };
            });
            m.querySelectorAll('.modal-item-delete').forEach(it => {
                it.onclick = (ex) => {
                    ex.stopPropagation();
                    const id = it.dataset.id;
                    if (confirm(`删除预设 "${id}"?`)) {
                        delete ps[id];
                        s.set(storeKey, JSON.stringify(ps));
                        it.closest('.modal-selection-item').remove();
                    }
                };
            });
            m.querySelector('.modal-close').onclick = () => m.remove();
        };

        if (saveBtn) saveBtn.onclick = () => {
            const name = prompt('保存当前方案为:');
            if (!name) return;
            const ps = JSON.parse(s.get(storeKey) || '{}');
            const data = {};
            if (storeKey === 'appearance_presets') {
                ['lock_screen_wallpaper', 'home_screen_wallpaper', 'show_status_bar', 'show_dynamic_island', 'active_font'].forEach(k => data[k] = s.get(k));
            } else if (storeKey === 'css_presets') {
                data['custom_css'] = s.get('custom_css');
            }
            ps[name] = data;
            s.set(storeKey, JSON.stringify(ps));
            if (display) display.innerText = name;
            if (window.os) window.os.showToast('已保存');
        };
    };

    bindPresets('appearance-preset-row', 'appearance-preset-display', 'btn-save-appearance-preset', 'appearance_presets');
    bindPresets('css-preset-row', 'css-preset-display', 'btn-save-css-preset', 'css_presets');
};



/**
 * 字体 V5 - 交互逻辑重构
 */
window.SettingsHandlers.openFontPage = (page) => {
    const s = window.sysStore;
    const urlI = page.querySelector('#font-url-input');
    const preview = page.querySelector('#realtime-preview');
    const display = page.querySelector('#font-preset-display');

    const applyPreview = (url) => {
        if (!url) return;
        try {
            let style = document.getElementById('temp-font-preview') || document.createElement('style');
            style.id = 'temp-font-preview';
            style.textContent = `@font-face { font-family: 'FontPreview'; src: url('${url}'); }`;
            document.head.appendChild(style);
            preview.style.fontFamily = 'FontPreview';
        } catch (e) {
            console.error("Preview failed", e);
        }
    };

    page.querySelector('#font-back-v5').onclick = () => {
        page.classList.remove('active');
        setTimeout(() => page.remove(), 350);
    };

    // 输入或上载后实时预览
    urlI.oninput = () => applyPreview(urlI.value);

    page.querySelector('#font-file-trigger').onclick = () => page.querySelector('#font-file-input').click();
    page.querySelector('#font-file-input').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const dataUrl = await readFileAsDataURL(f);
        urlI.value = dataUrl;
        applyPreview(dataUrl);
    };

    // 弹窗式预设选择 (iOS 风格)
    page.querySelector('#font-preset-row').onclick = () => {
        const fonts = JSON.parse(s.get('custom_fonts') || '[]');
        const items = [{ id: 'system', label: '系统默认 (System)' }, ...fonts.map((f, i) => ({ id: i, label: f.name }))];

        const modal = document.createElement('div');
        modal.innerHTML = window.SettingsUI.renderSelectionModal({ title: '已收藏的字体', items, isDark: true });
        document.getElementById('os-root').appendChild(modal.firstElementChild);

        const m = document.querySelector('.modal-mask');
        m.querySelectorAll('.modal-selection-item').forEach(it => it.onclick = () => {
            const id = it.dataset.id;
            if (id === 'system') {
                urlI.value = "";
                display.innerText = "系统默认 (System)";
                preview.style.fontFamily = 'inherit';
            } else {
                const selected = fonts[id];
                urlI.value = selected.value;
                display.innerText = selected.name;
                applyPreview(selected.value);
            }
            m.remove();
        });
        m.querySelector('.modal-close').onclick = () => m.remove();
    };

    page.querySelector('#btn-save-preset').onclick = () => {
        if (!urlI.value) return alert('请先输入或上传字体');
        const name = prompt('为当前字体命名:');
        if (!name) return;
        const ps = JSON.parse(s.get('custom_fonts') || '[]');
        ps.push({ name, value: urlI.value });
        s.set('custom_fonts', JSON.stringify(ps));
        if (window.os) window.os.showToast('已存入预设库');
    };

    page.querySelector('#btn-delete-preset').onclick = () => {
        const name = display.innerText;
        if (name.includes('系统默认') || !confirm(`删除预设 "${name}"?`)) return;
        const ps = JSON.parse(s.get('custom_fonts') || '[]');
        const newPs = ps.filter(f => f.name !== name);
        s.set('custom_fonts', JSON.stringify(newPs));
        display.innerText = "系统默认 (System)";
        urlI.value = "";
        if (window.os) window.os.showToast('已删除');
    };

    page.querySelectorAll('.btn-apply-font-trigger').forEach(btn => btn.onclick = () => {
        if (!urlI.value) return alert('当前没有选中的字体源');
        const data = { type: 'custom', value: urlI.value, name: display.innerText };
        s.set('active_font', JSON.stringify(data));
        window.os?.applyFont?.(data);
        if (window.os) window.os.showToast('字体配置已生效');
    });

    page.querySelector('#btn-reset-font').onclick = () => {
        if (confirm('确认还原为系统原生字体吗？')) {
            s.remove('active_font');
            location.reload();
        }
    };
};


/**
 * 通知中心 (音量、提示音、上传)
 */
/**
 * 通知中心 (音量、提示音、上传)
 */
window.SettingsHandlers.openNotificationPage = (page) => {
    const s = window.sysStore;
    let currentAudio = null;

    page.querySelector('#notification-back').onclick = () => { currentAudio?.pause(); page.classList.remove('active'); setTimeout(() => page.remove(), 350); };

    // 音量与预览逻辑
    const volI = page.querySelector('#notification-volume');
    const volD = page.querySelector('#volume-display');
    const updateVol = (v) => {
        const p = Math.round(v * 100); volD.innerText = p + '%';
        volI.style.background = `linear-gradient(to right, #007aff 0%, #007aff ${p}%, #3a3a3c ${p}%, #3a3a3c 100%)`;
        s.set('notification_volume', v);
    };
    volI.oninput = (e) => updateVol(e.target.value);

    const play = (src) => { currentAudio?.pause(); currentAudio = window.SettingsState.Service.playAudio(src, volI.value); };

    // 内置
    page.querySelectorAll('.preset-sound').forEach(it => it.onclick = () => {
        const id = it.dataset.soundId;
        // 视觉反馈：切换选中背景
        page.querySelectorAll('.preset-sound, .custom-sound').forEach(x => {
            x.classList.remove('selected');
            const check = x.querySelector('.sound-check');
            if (check) check.textContent = ''; // 清除旧的钩
        });
        it.classList.add('selected');
        const currentCheck = it.querySelector('.sound-check');
        if (currentCheck) currentCheck.textContent = '✓'; // 添加新的钩

        currentAudio?.pause();
        currentAudio = window.SettingsState.Service.playAudio(window.SettingsState.BUILTIN_SOUNDS[id], volI.value);
        s.set('notification_sound', id);
    });

    // 上传
    const fI = page.querySelector('#sound-file-input');
    page.querySelector('#btn-upload-sound').onclick = () => fI.click();
    fI.onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const dataUrl = await readFileAsDataURL(f);
        const list = JSON.parse(s.get('custom_notification_sounds') || '[]');
        list.push({ name: f.name, value: dataUrl });
        s.set('custom_notification_sounds', JSON.stringify(list));
        if (window.os) window.os.showToast('上传成功');
        setTimeout(() => location.reload(), 1000);
    };


    // 自定义列表选择与删除
    page.querySelectorAll('.custom-sound').forEach(it => {
        it.onclick = (e) => {
            if (e.target.classList.contains('custom-sound-delete')) return;
            const idx = it.dataset.index; const list = JSON.parse(s.get('custom_notification_sounds') || '[]');
            play(list[idx].value); s.set('notification_sound', 'custom_' + idx);
            page.querySelectorAll('.preset-sound, .custom-sound').forEach(el => el.classList.remove('selected')); it.classList.add('selected');
        };
        it.querySelector('.custom-sound-delete').onclick = (e) => {
            e.stopPropagation(); if (confirm('删除此声音？')) {
                const list = JSON.parse(s.get('custom_notification_sounds') || '[]'); list.splice(it.dataset.index, 1);
                s.set('custom_notification_sounds', JSON.stringify(list)); location.reload();
            }
        };
    });
};


/**
 * 语音服务 (支持国内 Minimax / 国外通用 OpenAI)
 */
/**
 * 语音服务 (支持国内 Minimax / 国外通用 OpenAI)
 */
window.SettingsHandlers.openBluetoothPage = (page) => {
    const s = window.sysStore;
    const updateVisibility = () => {
        const type = page.querySelector('[data-key="voice_interface_type"]').value;
        const groupRow = page.querySelector('#voice-group-row');
        if (groupRow) groupRow.style.display = (type === 'domestic' ? 'flex' : 'none');
    };

    page.querySelector('#bluetooth-back').onclick = () => { page.classList.remove('active'); setTimeout(() => page.remove(), 350); };
    page.querySelector('[data-key="voice_interface_type"]').onchange = updateVisibility;

    page.querySelector('#bluetooth-save').onclick = () => {
        page.querySelectorAll('[data-key]').forEach(i => s.set(i.dataset.key, i.value));
        if (window.os) window.os.showToast('语音配置已保存');
    };

    page.querySelector('#btn-test-voice').onclick = async () => {
        const type = page.querySelector('[data-key="voice_interface_type"]').value;
        const cfg = {
            type: type,
            domain: page.querySelector('[data-key="voice_domain"]').value,
            apiKey: page.querySelector('[data-key="voice_api_key"]').value,
            model: page.querySelector('[data-key="voice_model"]').value,
            groupId: type === 'domestic' ? page.querySelector('[data-key="voice_group_id"]').value : null,
            text: "语音合成功能测试成功。Chara OS 正在为您服务。"
        };
        if (!cfg.apiKey) return alert('请先配置 API Key');
        if (type === 'domestic' && !cfg.groupId) return alert('国内接口需要 Group ID');

        const blob = await window.SettingsState.Service.testVoice(cfg);
        if (blob) window.SettingsState.Service.playAudio(blob); else { if (window.os) window.os.showToast('合成失败', 'error'); }
    };
    updateVisibility(); // Initial call to set visibility
};

/**
 * 图像设置 (支持通用生图 / NovelAI 模型选择)
 */
window.SettingsHandlers.openCellularPage = (page) => {
    const s = window.sysStore;
    page.querySelector('#cellular-back').onclick = () => { page.classList.remove('active'); setTimeout(() => page.remove(), 350); };

    // 模型选择
    page.querySelector('#nai-model-row').onclick = () => {
        const models = [
            { id: 'v4.5 curated', label: 'NovelAI V4.5 Curated' },
            { id: 'v4.5 full', label: 'NovelAI V4.5 Full' },
            { id: 'anime v3', label: 'NovelAI Anime V3' }
        ];
        const modal = document.createElement('div');
        modal.innerHTML = window.SettingsUI.renderSelectionModal({
            title: '选择生图模型',
            items: models,
            isDark: s.get('dark_mode') !== 'false'
        });
        document.getElementById('os-root').appendChild(modal.firstElementChild);
        const m = document.querySelector('.modal-mask');
        m.querySelectorAll('.modal-selection-item').forEach(it => it.onclick = () => {
            const id = it.dataset.id;
            s.set('novelai_model', id);
            page.querySelector('#nai-model-display').innerText = id.toUpperCase();
            m.remove();
        });
        m.querySelector('.modal-close').onclick = () => m.remove();
    };

    page.querySelector('#cellular-save').onclick = () => {
        page.querySelectorAll('[data-key]').forEach(i => s.set(i.dataset.key, i.value));
        page.querySelectorAll('.ios-switch').forEach(sw => { if (sw.dataset.switch) s.set(sw.dataset.switch, sw.classList.contains('on')); });
        alert('图像中心配置已保存');
    };

    page.querySelector('#btn-novelai-test').onclick = async () => {
        const key = s.get('novelai_key');
        if (!key) return alert('请先配置 NovelAI API Key');
        const btn = page.querySelector('#btn-novelai-test');
        btn.innerText = '正在生成测试图...';
        const blob = await window.SettingsState.Service.testNovelAI(key, s.get('novelai_model'));
        btn.innerText = '测试图像生成';
        if (blob) {
            const url = URL.createObjectURL(blob);
            const win = window.open();
            win.document.write(`<img src="${url}" style="max-width:100%;">`);
        } else alert('生成失败，请检查 Key 或模型设置');
    };

    page.querySelectorAll('.ios-switch').forEach(sw => sw.onclick = () => sw.classList.toggle('on'));
};

window.SettingsHandlers.openHotspotPage = (page) => {
    const s = window.sysStore;
    page.querySelector('#hotspot-back').onclick = () => { page.classList.remove('active'); setTimeout(() => page.remove(), 350); };

    // 开关实时保存并启动业务逻辑
    // 开关逻辑
    page.querySelectorAll('.ios-switch').forEach(sw => {
        sw.onclick = () => {
            const isOn = sw.classList.toggle('on');
            const k = sw.dataset.switch;
            if (k) s.set(k, isOn ? 'true' : 'false');
            const tid = sw.dataset.target;
            if (tid) {
                const tel = page.querySelector(`#${tid}`);
                if (tel) tel.style.display = isOn ? 'block' : 'none';
            }
            // 特定逻辑
            if (k === 'bg_activity_enabled' && window.BackgroundActivityManager) {
                isOn ? window.BackgroundActivityManager.restart() : window.BackgroundActivityManager.stop();
            }
        };
    });

    page.querySelector('#hotspot-save').onclick = () => {
        page.querySelectorAll('[data-key]').forEach(i => s.set(i.dataset.key, i.value));
        alert('后台配置已更新');
    };
};
window.SettingsHandlers.openChatPage = (page) => {
    const s = window.sysStore;
    genericBind('chat')(page);
    page.querySelector('#chat-save-btn').onclick = () => {
        page.querySelectorAll('[data-key]').forEach(i => s.set(i.dataset.key, i.value));
        alert('聊天设置已更新');
    };
    page.querySelector('#btn-clear-all-messages').onclick = () => {
        if (confirm('⚠️ 确定要清空所有角色的聊天历史吗？此操作不可撤销。')) {
            s.set('chara_db_messages', []);
            alert('消息记录已全部清空');
        }
    };
};

/**
 * 开发者设置处理器
 */
window.SettingsHandlers.openDeveloperPage = (page) => {
    const s = window.sysStore;
    genericBind('developer')(page);

    page.querySelector('#btn-view-system-info').onclick = () => {
        const info = {
            os_version: '1.0.4 Platinum',
            user_agent: navigator.userAgent,
            storage_usage: (JSON.stringify(localStorage).length / 1024).toFixed(2) + ' KB',
            timestamp: new Date().toISOString()
        };
        alert('系统详细信息:\n' + JSON.stringify(info, null, 2));
    };

    // 可以在这里添加更多调试逻辑，比如清除缓存等
};



