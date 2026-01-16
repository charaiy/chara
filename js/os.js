class CharaOS {
    constructor() {
        this.initDOM();
        this.initClock();
        this.initWeather(); // New Weather Logic
        this.initInteractions();
        this.loadCustomData();
        this.initLockScreen();
        console.log('CharaOS Initialized (Local Mode)');
    }

    initDOM() {
        this.dom = {
            time: document.querySelector('.status-bar .time'),
            bigTime: document.querySelector('.big-time'),
            dateDisplay: document.querySelector('.date-display'),
            weatherDisplay: document.querySelector('.weather-display'),
            pages: document.querySelectorAll('.desktop-page'),
            dots: document.querySelectorAll('.pagination-dots .dot'),
            desktopContainer: document.querySelector('.desktop-container'),
            appIcons: document.querySelectorAll('.app-icon'),
            photoWidgets: document.querySelectorAll('.photo-widget'),
            contextMenu: document.getElementById('context-menu'),
            menuRename: document.getElementById('menu-rename'),
            menuUpload: document.getElementById('menu-upload')
        };
        this.activeElement = null;
    }

    initClock() {
        const update = () => {
            const timeStr = window.utils.getFormattedTime();
            const dateStr = window.utils.getFormattedDate();

            if (this.dom.time) this.dom.time.textContent = timeStr;
            if (this.dom.bigTime) this.dom.bigTime.textContent = timeStr;
            if (this.dom.dateDisplay) this.dom.dateDisplay.textContent = dateStr;

            const lockTime = document.getElementById('lock-time');
            const lockDate = document.getElementById('lock-date');
            if (lockTime) lockTime.textContent = timeStr;
            if (lockDate) lockDate.textContent = dateStr;

            // Mock Weather Update: If existing, could update here.
            // if (this.dom.weatherDisplay) ...

            this.updateAnalogClock();
        };
        update();
        setInterval(update, 1000);
    }

    updateAnalogClock() {
        const now = new Date();
        const s = now.getSeconds();
        const m = now.getMinutes();
        const h = now.getHours();

        const hDeg = (h % 12) * 30 + m * 0.5;
        const mDeg = m * 6;
        const sDeg = s * 6;

        const hHand = document.querySelector('.hour');
        const mHand = document.querySelector('.minute');
        const sHand = document.querySelector('.second');

        if (hHand) hHand.style.transform = `rotate(${hDeg}deg)`;
        if (mHand) mHand.style.transform = `rotate(${mDeg}deg)`;
        if (sHand) sHand.style.transform = `rotate(${sDeg}deg)`;
    }

    loadCustomData() {
        // Load theme preference
        const osRoot = document.getElementById('os-root');
        const savedTheme = window.sysStore.get('theme_mode');
        if (savedTheme === 'light') osRoot.classList.add('light-theme');

        // Load Fullscreen Preference
        if (window.sysStore.get('fullscreen_mode') === 'on') {
            osRoot.classList.add('fullscreen-mode');
        }

        // Load System Display Settings
        const showStatusBar = window.sysStore.get('show_status_bar');
        if (showStatusBar === 'false') {
            const sb = document.querySelector('.status-bar');
            if (sb) sb.style.display = 'none';
        }

        const showDynamicIsland = window.sysStore.get('show_dynamic_island');
        if (showDynamicIsland === 'false') {
            const island = document.querySelector('.dynamic-island');
            if (island) island.style.display = 'none';
        }

        this.loadWallpapers();

        // Load Font
        const savedFont = window.sysStore.get('active_font');
        if (savedFont) {
            try {
                this.applyFont(JSON.parse(savedFont));
            } catch (e) {
                console.error('Failed to load font:', e);
            }
        }

        const targets = [...this.dom.appIcons, ...this.dom.photoWidgets];
        targets.forEach(el => {
            const id = el.dataset.id || el.id;
            if (!id) return;
            const savedName = window.sysStore.get(`name_${id}`);
            if (savedName) {
                const nameEl = el.querySelector('.name');
                if (nameEl) nameEl.textContent = savedName;
            }
            const savedIcon = window.sysStore.get(`icon_${id}`);
            if (savedIcon) this.applyCustomIcon(el, savedIcon);
        });

        // Load Custom CSS
        const customCSS = window.sysStore.get('custom_css');
        if (customCSS) this.applyCustomCSS(customCSS);
    }

    applyCustomCSS(css) {
        let style = document.getElementById('user-custom-css');
        if (!style) {
            style = document.createElement('style');
            style.id = 'user-custom-css';
            document.head.appendChild(style);
        }
        style.textContent = css || '';
        console.log('Custom CSS Applied');
    }


    applyFont(fontData) {
        let style = document.getElementById('custom-font-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'custom-font-style';
            document.head.appendChild(style);
        }

        if (!fontData || !fontData.value) {
            style.textContent = '';
            return;
        }

        if (fontData.type === 'url' || fontData.type === 'local') {
            style.textContent = `
                 @font-face {
                     font-family: 'CustomFont';
                     src: url('${fontData.value}');
                     font-display: swap;
                 }
                 body, #os-root, .app-window, input, textarea, button, .settings-group, .settings-item, .settings-label, .settings-title {
                     font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                 }
             `;
        } else {
            style.textContent = `
                 body, #os-root, .app-window, input, textarea, button, .settings-group, .settings-item, .settings-label, .settings-title {
                     font-family: "${fontData.value}", -apple-system, BlinkMacSystemFont, sans-serif !important;
                 }
             `;
        }
        console.log('Font Applied:', fontData.name);
    }

    applyCustomIcon(el, base64) {
        const img = el.querySelector('.icon-img') || el.querySelector('.photo-display');
        if (img) {
            img.src = base64;
            img.classList.add('loaded');
            el.classList.add('has-photo');
        }
    }

    initInteractions() {
        const container = this.dom.desktopContainer;

        // 1. Desktop Scrolling (Mouse Drag Simulation)
        let isDown = false;
        let startX;
        let scrollLeft;

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.scrollSnapType = 'none';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });
        container.addEventListener('mouseleave', () => {
            if (!isDown) return;
            isDown = false;
            container.style.scrollSnapType = 'x mandatory';
            this.snapToNearestPage();
        });
        container.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            container.style.scrollSnapType = 'x mandatory';
            this.snapToNearestPage();
        });
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        // Update Dots
        container.addEventListener('scroll', () => {
            const width = container.offsetWidth;
            const pageIndex = Math.round(container.scrollLeft / width);
            this.updateDots(pageIndex);
        });

        // 2. Long Press Implementation
        const targets = [...this.dom.appIcons, ...this.dom.photoWidgets];
        let pressTimer;

        targets.forEach(el => {
            const startPress = (e) => {
                if (this.dom.contextMenu.classList.contains('active')) return;
                const touch = e.touches ? e.touches[0] : e;
                const menuX = touch.clientX;
                const menuY = touch.clientY;
                pressTimer = setTimeout(() => this.showContextMenu(menuX, menuY, el), 600);
            };
            const endPress = () => clearTimeout(pressTimer);

            el.addEventListener('mousedown', startPress);
            el.addEventListener('touchstart', startPress, { passive: true });
            el.addEventListener('mouseup', endPress);
            el.addEventListener('mouseleave', endPress);
            el.addEventListener('touchend', endPress);

            el.addEventListener('click', () => {
                if (this.dom.contextMenu.classList.contains('active')) return;
                this.openApp(el.dataset.id || el.id);
            });
        });

        this.dom.menuRename.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.activeElement) return;
            const id = this.activeElement.dataset.id || this.activeElement.id;
            const nameEl = this.activeElement.querySelector('.name');
            const newName = prompt("请输入新名称:", nameEl?.textContent || "");
            if (newName) {
                if (nameEl) nameEl.textContent = newName;
                window.sysStore.set(`name_${id}`, newName);
            }
            this.hideContextMenu();
        });

        this.dom.menuUpload.addEventListener('click', (e) => {
            e.stopPropagation();
            // 保存引用，因为 hideContextMenu 会清空 activeElement
            const targetElement = this.activeElement;
            this.hideContextMenu();
            this.triggerUpload(targetElement);
        });

        // 4. Background Theme Toggle (Long press empty space)
        let bgTimer;
        container.addEventListener('mousedown', (e) => {
            if (e.target === container) {
                bgTimer = setTimeout(() => {
                    const osRoot = document.getElementById('os-root');
                    const isLight = osRoot.classList.toggle('light-theme');
                    window.sysStore.set('theme_mode', isLight ? 'light' : 'dark');
                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                }, 1000);
            }
        });
        container.addEventListener('mouseup', () => clearTimeout(bgTimer));
        container.addEventListener('mouseleave', () => clearTimeout(bgTimer));

        window.addEventListener('mousedown', (e) => {
            if (!this.dom.contextMenu.contains(e.target)) this.hideContextMenu();
        });
    }

    updateDots(activeStats) {
        this.dom.dots.forEach((dot, index) => {
            if (index === activeStats) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    }

    showContextMenu(clientX, clientY, el) {
        this.activeElement = el;
        const menu = this.dom.contextMenu;
        const osRoot = document.getElementById('os-root');
        const osRect = osRoot.getBoundingClientRect();

        // 判断是 App 还是小组件
        const isApp = el.classList.contains('app-icon');
        const isWidget = el.classList.contains('photo-widget');

        // 根据类型显示/隐藏菜单项
        if (this.dom.menuRename) {
            this.dom.menuRename.style.display = isApp ? 'flex' : 'none';
        }
        if (this.dom.menuUpload) {
            this.dom.menuUpload.style.display = 'flex'; // 始终显示上传
        }

        let x = clientX;
        let y = clientY;

        const menuWidth = 140;
        const menuHeight = isApp ? 100 : 50; // 小组件菜单更小
        const margin = 20;

        if (x + menuWidth > osRect.right - margin) x = osRect.right - menuWidth - margin;
        if (x < osRect.left + margin) x = osRect.left + margin;
        if (y + menuHeight > osRect.bottom - margin) y = osRect.bottom - menuHeight - margin;
        if (y < osRect.top + margin) y = osRect.top + margin;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove('hidden');
        setTimeout(() => menu.classList.add('active'), 10);
        if (navigator.vibrate) navigator.vibrate(50);
    }

    hideContextMenu() {
        const menu = this.dom.contextMenu;
        menu.classList.remove('active');
        setTimeout(() => menu.classList.add('hidden'), 150);
        this.activeElement = null;
    }

    triggerUpload(targetElement) {
        if (!targetElement) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && targetElement) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    const id = targetElement.dataset.id || targetElement.id;
                    this.applyCustomIcon(targetElement, base64);
                    window.sysStore.set(`icon_${id}`, base64);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    snapToNearestPage() {
        const container = this.dom.desktopContainer;
        const width = container.offsetWidth;
        const index = Math.round(container.scrollLeft / width);
        container.scrollTo({
            left: index * width,
            behavior: 'smooth'
        });
    }

    initWeather() {
        // WMO Weather Codes to Chinese
        const weatherMap = {
            0: '晴', 1: '晴', 2: '多云', 3: '阴',
            45: '雾', 48: '雾',
            51: '小雨', 53: '中雨', 55: '大雨',
            61: '小雨', 63: '中雨', 65: '大雨',
            71: '小雪', 73: '中雪', 75: '大雪',
            80: '阵雨', 81: '阵雨', 82: '暴雨',
            95: '雷雨', 96: '雷伴冰雹', 99: '雷伴冰雹'
        };

        const fetchWeather = async (lat, lon, locationName) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.current_weather) {
                    const code = data.current_weather.weathercode;
                    const temp = Math.round(data.current_weather.temperature);
                    const desc = weatherMap[code] || '未知';

                    if (this.dom.weatherDisplay) {
                        this.dom.weatherDisplay.innerHTML = `<span class="weather-location">${locationName}</span> <span class="weather-icon">${desc}</span> ${temp}°C`;
                        console.log(`Weather updated: ${locationName} ${desc} ${temp}°C`);
                    }
                }
            } catch (e) {
                console.error('Weather fetch failed:', e);
                if (this.dom.weatherDisplay) {
                    this.dom.weatherDisplay.innerHTML = `<span class="weather-location">${locationName}</span> <span class="weather-icon">--</span> --°C`;
                }
            }
        };

        // Reverse Geocoding to get city name
        const getLocationName = async (lat, lon) => {
            try {
                // Use Nominatim for reverse geocoding (free, no API key)
                const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh`;
                const res = await fetch(url, { headers: { 'User-Agent': 'CharaOS/1.0' } });
                const data = await res.json();
                // Try to get city or district name
                return data.address?.city || data.address?.district || data.address?.county || data.address?.state || '未知地区';
            } catch (e) {
                console.warn('Reverse geocoding failed:', e);
                return '未知地区';
            }
        };

        // Get Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const locationName = await getLocationName(lat, lon);
                    fetchWeather(lat, lon, locationName);
                },
                (err) => {
                    console.warn('Geolocation denied, using default (Beijing)', err);
                    fetchWeather(39.9042, 116.4074, '北京'); // Default Beijing
                }
            );
        } else {
            fetchWeather(39.9042, 116.4074, '北京');
        }
    }

    openApp(appName) {
        console.log('Opening App:', appName);

        if (appName === 'dock-settings' || appName === 'settings') {
            this.openSettings();
        } else if (appName === '微信') {
            // Placeholder for Step 3
        }
    }

    openSettings() {
        // Check if exists
        let app = document.getElementById('app-settings');
        if (!app) {
            // 使用 SettingsApp 模块渲染
            app = window.SettingsApp.render();
            document.getElementById('os-root').appendChild(app);
            window.SettingsApp.bindEvents(app, () => this.closeActiveApp());
        }

        // Animate In with slight delay to ensure DOM paint
        requestAnimationFrame(() => {
            app.classList.add('active');
        });

        this.activeApp = app;

        // Update Home Bar to close
        this.toggleHomeBarAction(true);
    }

    toggleHomeBarAction(isAppOpen) {
        const homeBar = document.querySelector('.home-bar');
        // Simple touch/click handler for home bar to close app
        if (!this._homeBarHandler) {
            this._homeBarHandler = () => {
                if (this.activeApp) {
                    this.closeActiveApp();
                }
            };
            homeBar.addEventListener('click', this._homeBarHandler);
        }
    }

    closeActiveApp() {
        if (this.activeApp) {
            this.activeApp.classList.remove('active');
            setTimeout(() => {
                // Optional: remove from DOM to save memory, or keep it
                // this.activeApp.remove(); 
                this.activeApp = null;
            }, 400);
        }
    }

    initLockScreen() {
        const lockScreen = document.getElementById('lock-screen');
        const isEnabled = window.sysStore.get('lock_screen_enabled') === 'true';

        // Check if lock screen exists (it should)
        if (!lockScreen) return;

        if (!isEnabled) {
            lockScreen.classList.add('hidden');
            return;
        }

        lockScreen.classList.remove('hidden');
        this.isLocked = true;

        // Apply wallpaper
        const wp = window.sysStore.get('lock_screen_wallpaper');
        if (wp) {
            const bg = document.getElementById('lock-screen-bg');
            if (bg) bg.src = wp;
        }

        // Unlock logic
        const handleUnlock = () => {
            if (!this.isLocked) return;
            const password = window.sysStore.get('lock_screen_password');
            if (password) {
                // Show password input
                const passContainer = document.getElementById('lock-pass-container');
                const passInput = document.getElementById('lock-pass-input');
                if (passContainer) passContainer.classList.remove('hidden');
                if (passInput) {
                    passInput.focus();
                    passInput.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            if (passInput.value === password) {
                                this.unlock();
                            } else {
                                passInput.value = '';
                                passInput.placeholder = '密码错误';
                            }
                        }
                    };
                }
            } else {
                this.unlock();
            }
        };

        lockScreen.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;
            handleUnlock();
        });

        let startY;
        lockScreen.addEventListener('touchstart', e => startY = e.touches[0].clientY, { passive: true });
        lockScreen.addEventListener('touchend', e => {
            if (startY - e.changedTouches[0].clientY > 50) handleUnlock();
        });
    }

    unlock() {
        const lockScreen = document.getElementById('lock-screen');
        lockScreen.classList.add('unlocked');
        this.isLocked = false;
        setTimeout(() => {
            lockScreen.classList.add('hidden');
            lockScreen.classList.remove('unlocked');
            const passContainer = document.getElementById('lock-pass-container');
            const passInput = document.getElementById('lock-pass-input');
            if (passContainer) passContainer.classList.add('hidden');
            if (passInput) passInput.value = '';
        }, 400);
    }

    loadWallpapers() {
        const homeWp = window.sysStore.get('home_screen_wallpaper');
        if (homeWp) {
            const wp = document.querySelector('.wallpaper');
            if (wp) wp.style.setProperty('background-image', `url('${homeWp}')`, 'important');
        }
    }

    updateLockScreenWallpaper(base64) {
        const bg = document.getElementById('lock-screen-bg');
        if (bg) bg.src = base64;
    }
}


// Boot OS
window.os = new CharaOS();
