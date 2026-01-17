// =========================================
// Settings Managers Module
// 包含 BackgroundActivityManager 和 ThemeManager
// =========================================

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
