/**
 * js/apps/settings/handlers.js
 * 负责 Settings App 的各种事件处理和页面跳转逻辑
 */

// 移除 import
// import { Service } from './state.js';
// import { render... } from './ui_render.js';

// 定义全局命名空间
window.SettingsHandlers = {};

/**
 * 绑定设置页主界面事件
 */
window.SettingsHandlers.bindSettingsEvents = function (app, closeCallback) {
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
            window.SettingsHandlers.openProfilePage(app);
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
            window.SettingsHandlers.openWifiPage(app);
        });
    }

    // Bluetooth Page (语音)
    const bluetoothItem = app.querySelector('[data-action="bluetooth-page"]');
    if (bluetoothItem) {
        bluetoothItem.addEventListener('click', () => {
            window.SettingsHandlers.openBluetoothPage(app);
        });
    }

    // Cellular Page (图像)
    const cellularItem = app.querySelector('[data-action="cellular-page"]');
    if (cellularItem) {
        cellularItem.addEventListener('click', () => {
            window.SettingsHandlers.openCellularPage(app);
        });
    }

    // Hotspot Page (后台活动)
    const hotspotItem = app.querySelector('[data-action="hotspot-page"]');
    if (hotspotItem) {
        hotspotItem.addEventListener('click', () => {
            window.SettingsHandlers.openHotspotPage(app);
        });
    }

    // Chat Page
    const chatItem = app.querySelector('[data-action="chat-page"]');
    if (chatItem) {
        chatItem.addEventListener('click', () => {
            window.SettingsHandlers.openChatPage(app);
        });
    }

    // Font Page
    const fontItem = app.querySelector('[data-action="font-page"]');
    if (fontItem) {
        fontItem.addEventListener('click', () => {
            window.SettingsHandlers.openFontPage(app);
        });
    }

    // Appearance Page
    const appearanceItem = app.querySelector('[data-action="appearance-page"]');
    if (appearanceItem) {
        appearanceItem.addEventListener('click', () => {
            window.SettingsHandlers.openAppearancePage(app);
        });
    }

    // Notification Page (通知)
    // Chara AI Page (Placeholder)
    const charaAiItem = app.querySelector('[data-action="chara-ai-page"]');
    if (charaAiItem) {
        charaAiItem.addEventListener('click', () => {
            alert('Chara AI 功能正在开发中，敬请期待！');
        });
    }

    // Developer Page (Placeholder)
    const devItem = app.querySelector('[data-action="developer-page"]');
    if (devItem) {
        devItem.addEventListener('click', () => {
            alert('开发者选项暂未开放。');
        });
    }

    const notificationItem = app.querySelector('[data-action="notification-page"]');
    if (notificationItem) {
        notificationItem.addEventListener('click', () => {
            window.SettingsHandlers.openNotificationPage(app);
        });
    }
}

/**
 * 打开个人资料页
 */
/**
 * 打开个人资料页
 */
window.SettingsHandlers.openProfilePage = function (settingsApp) {
    let profilePage = settingsApp.querySelector('.profile-page');
    if (!profilePage) {
        profilePage = document.createElement('div');
        profilePage.className = 'profile-page';
        profilePage.innerHTML = window.SettingsUI.renderProfilePageContent();
        settingsApp.appendChild(profilePage);
        window.SettingsHandlers.bindProfilePageEvents(profilePage);
    }
    requestAnimationFrame(() => {
        profilePage.classList.add('active');
    });
}

/**
 * 绑定个人资料页事件
 */
/**
 * 绑定个人资料页事件
 */
window.SettingsHandlers.bindProfilePageEvents = function (profilePage) {
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

            let finalUrl = '';
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

            window.sysStore.set('user_avatar', finalUrl);
            const updateImgDom = (imgId, containerId, src) => {
                const img = document.getElementById(imgId);
                if (img) img.src = src;
                else {
                    const container = document.getElementById(containerId);
                    if (container) {
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
                alert('请先填写 GitHub 用户名、仓库名 and Token');
                return;
            }

            if (!confirm('⚠️ 恢复备份将覆盖当前所有数据，确定继续吗？')) return;

            btnRestore.textContent = '⏳ 下载中...';
            try {
                const data = await Service.restoreFromGithub(token, user, repo, 'ephone_backup.json');
                window.sysStore.clear();
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
    // 数据管理事件绑定
    window.SettingsHandlers.bindDataManagementEvents(profilePage);
}

/**
 * 绑定数据管理部分事件 (Import/Export/Compress)
 */
window.SettingsHandlers.bindDataManagementEvents = function (page) {
    const s = window.sysStore;

    // 1. 压缩图片
    const btnCompress = page.querySelector('#btn-compress-images');
    if (btnCompress) {
        btnCompress.addEventListener('click', async () => {
            if (!confirm('⚠️ 压缩将降低所有本地已存储图片的质量以释放空间，此操作不可逆。\n确定继续吗？')) return;

            btnCompress.innerText = '压缩中...';
            try {
                let savedSpace = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        const val = localStorage[key];
                        if (val && val.startsWith('data:image')) {
                            const oldSize = val.length;
                            // Attempt compress
                            const img = new Image();
                            img.src = val;
                            await new Promise(r => img.onload = r);

                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const max = 1024; // Limit max dimension
                            let w = img.width;
                            let h = img.height;
                            if (w > max || h > max) {
                                if (w > h) { h = Math.round(h * max / w); w = max; }
                                else { w = Math.round(w * max / h); h = max; }
                            }
                            canvas.width = w;
                            canvas.height = h;
                            ctx.drawImage(img, 0, 0, w, h);

                            // Compress
                            const newVal = canvas.toDataURL('image/jpeg', 0.5);
                            if (newVal.length < oldSize) {
                                localStorage.setItem(key, newVal);
                                savedSpace += (oldSize - newVal.length);
                            }
                        }
                    }
                }
                const mb = (savedSpace / 1024 / 1024).toFixed(2);
                alert(`✅ 压缩完成！共节省了 ${mb} MB 空间。`);
                // Refresh size display
                const sizeEl = page.querySelector('#local-img-size');
                if (sizeEl) sizeEl.innerText = '计算中...';
                // Recalculate - lazy reload or quick calc
                setTimeout(() => {
                    let total = 0;
                    for (let k in localStorage) if (localStorage[k].startsWith('data:image')) total += localStorage[k].length;
                    if (sizeEl) sizeEl.innerText = (total / 1024 / 1024).toFixed(2) + ' MB';
                    btnCompress.innerText = '压缩';
                }, 500);

            } catch (e) {
                alert('压缩出错: ' + e.message);
                btnCompress.innerText = '压缩';
            }
        });
    }

    // 2. 导出数据
    const btnExport = page.querySelector('#btn-export-data');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            showExportModal();
        });
    }

    // 3. 导入数据
    const btnImport = page.querySelector('#btn-import-data');
    if (btnImport) {
        btnImport.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.zip';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.name.endsWith('.zip')) {
                    // ZIP Import
                    if (!window.JSZip) { alert('JSZip 库未加载，无法解压 ZIP'); return; }
                    try {
                        const zip = new JSZip();
                        const loadedZip = await zip.loadAsync(file);
                        let count = 0;
                        for (let filename in loadedZip.files) {
                            if (!loadedZip.files[filename].dir) {
                                const content = await loadedZip.files[filename].async('string');
                                try {
                                    const json = JSON.parse(content);
                                    Object.keys(json).forEach(k => localStorage.setItem(k, json[k]));
                                    count++;
                                } catch (err) { console.error('Error parsing file in zip', filename, err); }
                            }
                        }
                        alert(`✅ 成功导入了 ${count} 个数据切片！请刷新页面。`);
                        location.reload();
                    } catch (e) {
                        alert('❌ 导入 ZIP 失败: ' + e.message);
                    }
                } else {
                    // JSON Import
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            const data = JSON.parse(ev.target.result);
                            if (typeof data !== 'object') throw new Error('Invalid JSON');

                            if (confirm(`检测到备份文件，包含 ${Object.keys(data).length} 个键值对。\n导入将覆盖同名数据，确定导入吗？`)) {
                                Object.keys(data).forEach(k => {
                                    localStorage.setItem(k, data[k]);
                                });
                                alert('✅ 导入成功！'); // No reload mandated for basic json unless critical
                                location.reload();
                            }
                        } catch (e) {
                            alert('❌ 解析失败: ' + e.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });
    }

    // ... 其他按钮 (Cleaning etc.) 可以在此扩展
}

// 辅助函数：显示导出模态框 (UI Style matching Screenshot)
function showExportModal() {
    // Check existing
    if (document.querySelector('.action-sheet-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'action-sheet-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); z-index: 1000;
        display: flex; flex-direction: column; justify-content: flex-end;
        align-items: center; opacity: 0; transition: opacity 0.2s;
    `;

    const sheet = document.createElement('div');
    sheet.style.cssText = `
        background: #f2f2f7; width: 95%; max-width: 400px; border-radius: 14px;
        margin-bottom: 30px; overflow: hidden; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        display: flex; flex-direction: column; gap: 1px;
    `;
    // Dark mode adjust
    if (window.SettingsHandlers.isDarkMode()) {
        sheet.style.background = '#1c1c1e';
    }

    const titleDiv = document.createElement('div');
    titleDiv.innerText = '选择导出方式';
    titleDiv.style.cssText = `
        padding: 15px; text-align: center; color: #8e8e93; font-size: 13px; font-weight: 500;
        background: rgba(255,255,255,0.8);
    `;
    if (window.SettingsHandlers.isDarkMode()) titleDiv.style.background = '#2c2c2e';

    const createBtn = (text, onClick, isCancel = false, subtitle = '') => {
        const btn = document.createElement('div');
        btn.style.cssText = `
            padding: 16px; text-align: center; font-size: 18px; color: ${isCancel ? '#007aff' : '#007aff'};
            background: rgba(255,255,255,0.8); cursor: pointer; border-top: 1px solid rgba(0,0,0,0.1);
        `;
        if (window.SettingsHandlers.isDarkMode()) {
            btn.style.background = '#2c2c2e';
            btn.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        }
        if (isCancel) {
            btn.style.marginTop = '8px';
            btn.style.borderRadius = '14px';
            btn.style.fontWeight = '600';
            btn.style.background = window.SettingsHandlers.isDarkMode() ? '#2c2c2e' : '#fff';
        }

        if (subtitle) {
            btn.innerHTML = `<div>${text}</div><div style="font-size:12px; color:#8e8e93; margin-top:2px;">${subtitle}</div>`;
        } else {
            btn.innerText = text;
        }

        btn.onclick = () => {
            closeSheet();
            if (onClick) onClick();
        };
        return btn;
    };

    // Options
    const btnSplit = createBtn('分片导出 (推荐)', () => doExport('split'), false, '打包为 ZIP, 解压每个切片选择增量导入');
    const btnSmart = createBtn('智能导出 (单个大文件)', () => doExport('smart'), false, '太大可能会导致导入不了');
    const btnLegacy = createBtn('传统导出', () => doExport('legacy'), false, '兼容旧版或内存小的浏览器');
    const btnCancel = createBtn('取消', null, true);

    // Grouping
    const groupMenu = document.createElement('div');
    groupMenu.style.cssText = 'border-radius: 14px; overflow: hidden; display:flex; flex-direction:column;';

    groupMenu.appendChild(titleDiv);
    groupMenu.appendChild(btnSplit);
    groupMenu.appendChild(btnSmart);
    groupMenu.appendChild(btnLegacy);

    sheet.style.background = 'transparent'; // Reset for gap layout
    sheet.appendChild(groupMenu);
    sheet.appendChild(btnCancel);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
    });

    function closeSheet() {
        overlay.style.opacity = '0';
        sheet.style.transform = 'translateY(100%)';
        setTimeout(() => overlay.remove(), 300);
    }
}

async function doExport(type) {
    const data = { ...localStorage };

    if (type === 'split') {
        if (!window.JSZip) { alert('JSZip 尚未加载，请检查网络或刷新页面'); return; }
        const zip = new JSZip();
        // Split strategy: Group by functionality or size
        // Simple strategy: Images in one folder, core settings in root, etc.
        // Or chunk by size (e.g. 5MB chunks)

        let chunkIndex = 0;
        let currentChunk = {};
        let currentSize = 0;
        const LIMIT = 2 * 1024 * 1024; // 2MB per chunk

        for (let key in data) {
            const val = data[key];
            const size = key.length + val.length;
            if (currentSize + size > LIMIT && Object.keys(currentChunk).length > 0) {
                zip.file(`chunk_${chunkIndex}.json`, JSON.stringify(currentChunk));
                chunkIndex++;
                currentChunk = {};
                currentSize = 0;
            }
            currentChunk[key] = val;
            currentSize += size;
        }
        // Last chunk
        if (Object.keys(currentChunk).length > 0) {
            zip.file(`chunk_${chunkIndex}.json`, JSON.stringify(currentChunk));
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });
            downloadBlob(content, `chara_backup_split_${Date.now()}.zip`);
        } catch (e) { alert('Zip 生成失败: ' + e.message); }

    } else if (type === 'smart') {
        // Single file
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        downloadBlob(blob, `chara_backup_full_${Date.now()}.json`);
    } else {
        // Legacy - Simple stringify? Same as smart but maybe prettier?
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "text/plain" });
        downloadBlob(blob, `chara_backup_legacy_${Date.now()}.txt`);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper for check
window.SettingsHandlers.isDarkMode = function () {
    return window.sysStore.get('dark_mode') !== 'false';
}


/**
 * 打开 Wi-Fi (API) 页面
 */
/**
 * 打开 Wi-Fi (API) 页面
 */
window.SettingsHandlers.openWifiPage = function (settingsApp) {
    let wifiPage = settingsApp.querySelector('.wifi-page');
    if (!wifiPage) {
        wifiPage = document.createElement('div');
        wifiPage.className = 'profile-page wifi-page';
        wifiPage.innerHTML = window.SettingsUI.renderWifiPageContent();
        settingsApp.appendChild(wifiPage);
        window.SettingsHandlers.bindWifiPageEvents(wifiPage);
    }
    requestAnimationFrame(() => {
        wifiPage.classList.add('active');
    });
}

let sessionConnected = false;

/**
 * 绑定 Wi-Fi 页事件
 */
/**
 * 绑定 Wi-Fi 页事件
 */
window.SettingsHandlers.bindWifiPageEvents = function (page) {
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
                    const container = page.querySelector('#' + containerId);
                    if (container) {
                        const currentInput = container.querySelector('input, select, .model-display');
                        const existingVal = currentInput ? (currentInput.value || currentInput.innerText) : '';
                        let currentVal = existingVal === '选择模型...' ? '' : existingVal;
                        if (!currentVal && models.length > 0) currentVal = models[0].id;

                        container.innerHTML = '';
                        const hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.dataset.key = modelInputKey;
                        hiddenInput.value = currentVal;
                        container.appendChild(hiddenInput);

                        const display = document.createElement('div');
                        display.className = 'model-display';
                        display.style.cssText = 'text-align: right; color: #007aff; font-size: 15px; width: 100%; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; margin-left: auto;';
                        display.innerText = currentVal || '选择模型...';
                        container.appendChild(display);

                        display.onclick = () => {
                            const overlay = document.createElement('div');
                            overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:200; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s;';
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
            const sliderConfig = page.querySelector('#api-temp-slider');
            if (sliderConfig) s.set('api_temperature', sliderConfig.value);
            // ...
        });
    }

    // Slider live update
    const apiTempSlider = page.querySelector('#api-temp-slider');
    const apiTempDisplay = page.querySelector('#temp-display');
    if (apiTempSlider && apiTempDisplay) {
        apiTempSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            apiTempDisplay.textContent = val.toString();
            const percent = (val / 2) * 100;
            e.target.style.background = `linear-gradient(to right, #007aff 0%, #007aff ${percent}%, #3a3a3c ${percent}%, #3a3a3c 100%)`;
        });
    }


    // Presets Logic
    const presetRow = page.querySelector('#preset-row');
    const presetDisplay = page.querySelector('#preset-display');
    const presetValueInput = page.querySelector('#preset-selector-value');
    const newPresetNameInput = page.querySelector('#new-preset-name');
    const btnSavePreset = page.querySelector('#btn-save-preset');
    const btnDelPreset = page.querySelector('#btn-del-preset');

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
            header.innerText = '选择预设';

            const closeBtn = document.createElement('div');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = 'position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#8e8e93; font-weight:normal; cursor:pointer; font-size:18px; padding:5px;';
            closeBtn.onclick = (e) => { e.stopPropagation(); closeModal(); };
            header.appendChild(closeBtn);
            modal.appendChild(header);

            const list = document.createElement('div');
            list.className = 'no-scrollbar';
            list.style.cssText = 'overflow-y:auto; flex:1; -webkit-overflow-scrolling: touch;';

            presetNames.forEach(name => {
                const item = document.createElement('div');
                item.style.cssText = `padding:12px 15px; border-bottom:1px solid ${border}; color:${text}; font-size:14px; cursor:pointer; transition:background 0.2s;`;
                item.innerText = name;
                item.onclick = () => {
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
        if (!name) { alert('请输入预设名称'); return; }
        const s = window.sysStore;
        const presets = JSON.parse(s.get('api_presets') || '{}');
        if (presets[name]) {
            if (!confirm(`预设 "${name}" 已存在，是否覆盖？`)) return;
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
        if (!name) { alert('请先选择要删除的预设'); return; }
        if (!confirm(`确定删除预设 "${name}" 吗?`)) return;
        const s = window.sysStore;
        const presets = JSON.parse(s.get('api_presets') || '{}');
        delete presets[name];
        s.set('api_presets', JSON.stringify(presets));
        presetDisplay.innerText = '选择预设...';
        presetValueInput.value = '';
    });
}

/**
 * 打开蓝牙 (语音服务) 页面
 */
/**
 * 打开蓝牙 (语音服务) 页面
 */
window.SettingsHandlers.openBluetoothPage = function (settingsApp) {
    let btPage = settingsApp.querySelector('.bluetooth-page');
    if (!btPage) {
        btPage = document.createElement('div');
        btPage.className = 'profile-page bluetooth-page';
        btPage.innerHTML = window.SettingsUI.renderBluetoothPageContent();
        settingsApp.appendChild(btPage);
        window.SettingsHandlers.bindBluetoothPageEvents(btPage);
    }
    requestAnimationFrame(() => {
        btPage.classList.add('active');
    });
}

/**
 * 绑定蓝牙页事件
 */
/**
 * 绑定蓝牙页事件
 */
window.SettingsHandlers.bindBluetoothPageEvents = function (page) {
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
 * 打开图像 (NovelAI) 页面
 */
/**
 * 打开图像 (NovelAI) 页面
 */
window.SettingsHandlers.openCellularPage = function (settingsApp) {
    let cellularPage = settingsApp.querySelector('.cellular-page');
    if (!cellularPage) {
        cellularPage = document.createElement('div');
        cellularPage.className = 'profile-page cellular-page';
        cellularPage.innerHTML = window.SettingsUI.renderCellularPageContent();
        settingsApp.appendChild(cellularPage);
        window.SettingsHandlers.bindCellularPageEvents(cellularPage);
    }
    requestAnimationFrame(() => {
        cellularPage.classList.add('active');
    });
}

/**
 * 绑定图像页事件
 */
/**
 * 绑定图像页事件
 */
window.SettingsHandlers.bindCellularPageEvents = function (page) {
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
}

/**
 * 打开后台活动页面
 */
/**
 * 打开后台活动页面
 */
window.SettingsHandlers.openHotspotPage = function (settingsApp) {
    let hotspotPage = settingsApp.querySelector('.hotspot-page');
    if (!hotspotPage) {
        hotspotPage = document.createElement('div');
        hotspotPage.className = 'profile-page hotspot-page';
        hotspotPage.innerHTML = window.SettingsUI.renderHotspotPageContent();
        settingsApp.appendChild(hotspotPage);
        window.SettingsHandlers.bindHotspotPageEvents(hotspotPage);
    }
    requestAnimationFrame(() => {
        hotspotPage.classList.add('active');
    });
}

/**
 * 绑定后台活动页事件
 */
/**
 * 绑定后台活动页事件
 */
window.SettingsHandlers.bindHotspotPageEvents = function (page) {
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
 * 打开聊天设置页面
 */
/**
 * 打开聊天设置页面
 */
window.SettingsHandlers.openChatPage = function (app) {
    const page = document.createElement('div');
    page.className = 'settings-page';
    page.innerHTML = window.SettingsUI.renderChatPageContent();
    app.appendChild(page);
    requestAnimationFrame(() => {
        page.classList.add('active');
    });
    window.SettingsHandlers.bindChatPageEvents(page);
}

/**
 * 绑定聊天页事件
 */
/**
 * 绑定聊天页事件
 */
window.SettingsHandlers.bindChatPageEvents = function (page) {
    const backBtn = page.querySelector('#chat-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            page.classList.remove('active');
            setTimeout(() => page.remove(), 350);
        });
    }
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
 * 打开字体设置页面
 */
/**
 * 打开字体设置页面
 */
window.SettingsHandlers.openFontPage = function (app) {
    const page = document.createElement('div');
    page.className = 'settings-page font-page-v5';
    page.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ios-bg); z-index: 300; transition: transform 0.3s ease; transform: translateX(100%); display: flex; flex-direction: column;";
    page.innerHTML = window.SettingsUI.renderFontPageDesignV5();
    app.appendChild(page);
    requestAnimationFrame(() => {
        page.style.transform = 'translateX(0)';
    });
    window.SettingsHandlers.bindFontPageDesignEventsV5(page);
}

/**
 * 绑定字体设计页 (V5) 事件
 */
/**
 * 绑定字体设计页 (V5) 事件
 */
window.SettingsHandlers.bindFontPageDesignEventsV5 = function (page) {
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
 * 打开外观设置页面
 */
/**
 * 打开外观设置页面
 */
window.SettingsHandlers.openAppearancePage = function (app) {
    const page = document.createElement('div');
    page.className = 'settings-page appearance-page';
    page.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ios-bg); z-index: 300; transition: transform 0.3s ease; transform: translateX(100%); display: flex; flex-direction: column;";
    page.innerHTML = window.SettingsUI.renderAppearancePageContent();
    app.appendChild(page);
    requestAnimationFrame(() => {
        page.style.transform = 'translateX(0)';
    });
    window.SettingsHandlers.bindAppearancePageEvents(page);
}

/**
 * 绑定外观页事件
 */
/**
 * 绑定外观页事件
 */
window.SettingsHandlers.bindAppearancePageEvents = function (page) {
    page.querySelector('#appearance-back').addEventListener('click', () => {
        page.style.transform = 'translateX(100%)';
        setTimeout(() => page.remove(), 350);
    });

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

    lockScreenToggle.addEventListener('click', () => lockScreenToggle.classList.toggle('on'));

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
        if (window.os && window.os.applyCustomCSS) window.os.applyCustomCSS(customCSS);
        alert('设置已保存');
    });

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
                            page.querySelector('#custom-css-input').value = config.custom_css;
                        }
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

    const mockBtns = page.querySelectorAll('.mock-btn');
    mockBtns.forEach(btn => {
        btn.addEventListener('click', () => { alert('功能开发中...'); });
    });

    const resizeImage = (file, maxWidth = 1080, quality = 0.6) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleUpload = async (type, previewEl) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Feedback
            alert('正在处理图片，请稍候...');

            try {
                // Compression (Fix for black wallpaper/storage full issues)
                const resizedBase64 = await resizeImage(file);
                updateWallpaper(type, resizedBase64, previewEl);
                alert('壁纸设置成功！');
            } catch (err) {
                console.error('Image processing failed:', err);
                alert('图片处理失败，请重试');
            }
        };
        input.click();
    };

    const handleReset = (type, previewEl) => {
        if (confirm('确定要恢复默认壁纸吗？')) {
            updateWallpaper(type, '', previewEl);
        }
    };

    const updateWallpaper = (type, src, previewEl) => {
        const key = type === 'lock' ? 'lock_screen_wallpaper' : 'home_screen_wallpaper';
        if (src) window.sysStore.set(key, src);
        else window.sysStore.remove(key);
        previewEl.style.backgroundImage = src ? `url('${src}')` : '';
        const closeBtnStyle = "position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #8e8e93; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; font-weight: bold; border: 2px solid #000; z-index: 10; cursor: pointer;";
        const wpTextStyle = "font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; pointer-events: none;";
        const label = type === 'lock' ? '锁屏壁纸' : '主屏壁纸';
        if (src) {
            previewEl.innerHTML = `<div style="${closeBtnStyle}" class="wp-reset" data-target="${type}">×</div>`;
            // Call OS to update immediately
            if (window.os) {
                if (type === 'lock' && window.os.updateLockScreenWallpaper) {
                    window.os.updateLockScreenWallpaper(src);
                } else if (type === 'home' && window.os.updateHomeScreenWallpaper) {
                    window.os.updateHomeScreenWallpaper(src);
                }
            }
        } else {
            previewEl.innerHTML = `<div style="${wpTextStyle}">点击设置<br>${label}</div>`;
            // Call OS to clear immediately (pass empty string or default)
            if (window.os) {
                if (type === 'lock' && window.os.updateLockScreenWallpaper) {
                    window.os.updateLockScreenWallpaper(''); // Or restore default logic if needed
                } else if (type === 'home' && window.os.updateHomeScreenWallpaper) {
                    // Ideally pass default wallpaper logic here, but empty checks in OS might handle it or just clear it.
                    // For now let's just leave it, reload will restore default if removed key.
                    // Or better, trigger reload of wallpapers
                    if (window.os.loadWallpapers) window.os.loadWallpapers();
                }
            }
        }
        if (src) {
            const newReset = previewEl.querySelector('.wp-reset');
            newReset.addEventListener('click', (e) => {
                e.stopPropagation();
                handleReset(type, previewEl);
            });
        }
    };

    const pLock = page.querySelector('#preview-lock');
    const pHome = page.querySelector('#preview-home');
    pLock.addEventListener('click', (e) => {
        if (e.target.classList.contains('wp-reset')) return;
        handleUpload('lock', pLock);
    });
    pHome.addEventListener('click', (e) => {
        if (e.target.classList.contains('wp-reset')) return;
        handleUpload('home', pHome);
    });

    const resets = page.querySelectorAll('.wp-reset');
    resets.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleReset(btn.dataset.target, btn.closest('[data-role]'));
        });
    });
}

/**
 * 打开通知设置页面
 */
/**
 * 打开通知设置页面
 */
window.SettingsHandlers.openNotificationPage = function (app) {
    const page = document.createElement('div');
    page.className = 'settings-page notification-page';
    page.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--ios-bg); z-index: 300; transition: transform 0.3s ease; transform: translateX(100%); display: flex; flex-direction: column;";
    page.innerHTML = window.SettingsUI.renderNotificationPageContent();
    app.appendChild(page);
    requestAnimationFrame(() => {
        page.style.transform = 'translateX(0)';
    });
    window.SettingsHandlers.bindNotificationPageEvents(page);
}

/**
 * 绑定通知页事件
 */
/**
 * 绑定通知页事件
 */
window.SettingsHandlers.bindNotificationPageEvents = function (page) {
    const s = window.sysStore;
    const builtinSounds = {
        'classic': 'https://files.catbox.moe/73u5nm.mp3',
        'block': 'https://files.catbox.moe/s7gftd.wav',
        'cute': 'https://files.catbox.moe/i3mohu.mp3'
    };
    let currentAudio = null;
    let selectedSoundId = s.get('notification_sound') || 'classic';

    page.querySelector('#notification-back').addEventListener('click', () => {
        if (currentAudio) currentAudio.pause();
        page.style.transform = 'translateX(100%)';
        setTimeout(() => page.remove(), 350);
    });

    const notificationToggle = page.querySelector('#toggle-notification');
    notificationToggle.addEventListener('click', () => {
        notificationToggle.classList.toggle('on');
        s.set('notification_enabled', notificationToggle.classList.contains('on'));
    });

    const saveBtn = page.querySelector('#notification-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => { alert('通知设置已保存'); });
    }

    const volumeSlider = page.querySelector('#notification-volume');
    const volumeDisplay = page.querySelector('#volume-display');
    const updateVolBg = (val) => {
        const percent = val * 100;
        volumeDisplay.textContent = Math.round(percent) + '%';
        volumeSlider.style.setProperty('background', `linear-gradient(to right, #007aff 0%, #007aff ${percent}%, #3a3a3c ${percent}%, #3a3a3c 100%)`, 'important');
        if (currentAudio) currentAudio.volume = val;
    };
    volumeSlider.addEventListener('input', (e) => { updateVolBg(parseFloat(e.target.value)); });
    updateVolBg(parseFloat(volumeSlider.value));

    const playSound = (soundId, audioData) => {
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
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

    const updateSelection = (newSoundId) => {
        selectedSoundId = newSoundId;
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

    page.querySelectorAll('#builtin-sounds .preset-sound').forEach(item => {
        item.addEventListener('click', () => {
            const soundId = item.dataset.soundId;
            updateSelection(soundId);
            playSound(soundId);
        });
    });

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
            let customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
            customSounds.push({ name, data: base64 });
            s.set('custom_notification_sounds', JSON.stringify(customSounds));
            refreshCustomSoundsList(page, customSounds);
            alert('✅ 提示音已添加');
        } catch (err) { alert('文件读取失败'); }
    });

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
            return `<div class="settings-item custom-sound ${isSelected ? 'selected' : ''}" data-index="${index}" style="cursor: pointer;">
                        <div class="settings-label" style="flex: 1;">${sound.name}</div>
                        <div class="sound-check" style="color: #007aff; font-size: 18px; margin-right: 10px;">${isSelected ? '✓' : ''}</div>
                        <div class="custom-sound-delete" data-index="${index}" style="color: #ff3b30; font-size: 14px; padding: 4px 8px; cursor: pointer;">删除</div>
                    </div>`;
        }).join('');
        bindCustomSoundEvents(page);
    };

    const bindCustomSoundEvents = (page) => {
        page.querySelectorAll('#custom-sounds-list .custom-sound').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('custom-sound-delete')) return;
                const index = parseInt(item.dataset.index);
                const customId = `custom_${index}`;
                updateSelection(customId);
                let customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
                if (customSounds[index]) playSound(customId, customSounds[index].data);
            });
            const delBtn = item.querySelector('.custom-sound-delete');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!confirm('确定删除这个提示音吗？')) return;
                    const index = parseInt(delBtn.dataset.index);
                    let customSounds = JSON.parse(s.get('custom_notification_sounds') || '[]');
                    customSounds.splice(index, 1);
                    s.set('custom_notification_sounds', JSON.stringify(customSounds));
                    if (selectedSoundId === `custom_${index}`) updateSelection('tri-tone');
                    refreshCustomSoundsList(page, customSounds);
                });
            }
        });
    };
    bindCustomSoundEvents(page);

    const autoSave = () => {
        s.set('notification_enabled', notificationToggle.classList.contains('on') ? 'true' : 'false');
        s.set('notification_sound', selectedSoundId);
        s.set('notification_volume', volumeSlider.value);
    };
    notificationToggle.addEventListener('click', () => setTimeout(autoSave, 100));
    volumeSlider.addEventListener('change', autoSave);
    page.querySelector('#notification-back').addEventListener('click', autoSave, { once: true });
}

/**
 * 生成经典声音 URL
 */
/**
 * 生成经典声音 URL
 */
window.SettingsHandlers.generateClassicSound = function () {
    return 'https://cdn.freesound.org/previews/709/709515_11861866-lq.mp3';
}

/**
 * 生成积木声音 URL
 */
/**
 * 生成积木声音 URL
 */
window.SettingsHandlers.generateBlockSound = function () {
    return 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3';
}

/**
 * 生成可爱声音 URL
 */
/**
 * 生成可爱声音 URL
 */
window.SettingsHandlers.generateCuteSound = function () {
    return 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3';
}


