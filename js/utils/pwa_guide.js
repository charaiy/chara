/**
 * PWA Install Guide for iOS
 * Detects if the app is running in iOS Safari and prompts the user to add to home screen.
 */
(function () {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Check if running in Safari (not Chrome or other browsers on iOS)
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent) && !/FxiOS/.test(navigator.userAgent);

    if (isIOS && isSafari && !isStandalone) {
        // Show the guide after a short delay
        setTimeout(showIOSGuide, 3000);
    }

    if (isStandalone) {
        document.documentElement.classList.add('pwa-standalone');
        // Fix for potential viewport height issues in standalone mode
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        window.addEventListener('resize', () => {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        });
    }

    function showIOSGuide() {
        // Check if user has already dismissed it recently
        const dismissed = localStorage.getItem('pwa_guide_dismissed');
        if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
            return;
        }

        const guide = document.createElement('div');
        guide.className = 'pwa-guide-overlay';
        guide.innerHTML = `
            <div class="pwa-guide-card">
                <div class="pwa-guide-header">
                    <img src="assets/icon_192.png" class="pwa-guide-icon">
                    <div class="pwa-guide-title">
                        <h3>安装 CharaOS</h3>
                        <p>获得全屏沉浸式体验</p>
                    </div>
                    <button class="pwa-guide-close">&times;</button>
                </div>
                <div class="pwa-guide-steps">
                    <div class="step">1. 点击底部菜单栏的 <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50' fill='%23007AFF'%3E%3Cpath d='M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z'/%3E%3Cpath d='M24 7h2v21h-2z'/%3E%3Cpath d='M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z'/%3E%3C/svg%3E" class="share-icon"> 按钮</div>
                    <div class="step">2. 滑动并选择 "<strong>添加到主屏幕</strong>"</div>
                    <div class="step">3. 以后从桌面直接启动</div>
                </div>
            </div>
            <div class="pwa-guide-arrow"></div>
        `;

        // Style the guide
        const style = document.createElement('style');
        style.textContent = `
            .pwa-guide-overlay {
                position: fixed;
                bottom: 20px;
                left: 0;
                width: 100%;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: none; /* Let clicks pass through outside the card */
            }
            .pwa-guide-card {
                pointer-events: auto;
                background: rgba(30, 30, 30, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 18px;
                padding: 16px;
                width: 90%;
                max-width: 360px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                color: #fff;
                font-family: -apple-system, sans-serif;
            }
            .pwa-guide-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
                position: relative;
            }
            .pwa-guide-icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
            }
            .pwa-guide-title h3 { margin: 0; font-size: 17px; font-weight: 600; }
            .pwa-guide-title p { margin: 2px 0 0; font-size: 13px; color: rgba(255,255,255,0.6); }
            .pwa-guide-close {
                position: absolute;
                top: -5px;
                right: -5px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: rgba(255,255,255,0.6);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .pwa-guide-steps {
                border-top: 1px solid rgba(255,255,255,0.1);
                padding-top: 12px;
                font-size: 14px;
                line-height: 1.5;
            }
            .step { margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
            .share-icon { width: 18px; height: 18px; vertical-align: text-bottom; background: rgba(255,255,255,0.1); padding: 2px; border-radius: 4px; }
            .pwa-guide-arrow {
                width: 20px;
                height: 20px;
                background: rgba(30, 30, 30, 0.95);
                transform: rotate(45deg);
                margin-top: -10px;
                margin-bottom: -20px; /* Hide slightly */
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                z-index: -1;
            }
            @keyframes slideUp {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(guide);

        guide.querySelector('.pwa-guide-close').onclick = () => {
            guide.style.opacity = '0';
            setTimeout(() => guide.remove(), 300);
            localStorage.setItem('pwa_guide_dismissed', Date.now());
        };
    }
})();
