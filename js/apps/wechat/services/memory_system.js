/**
 * js/apps/wechat/services/memory_system.js
 * 记忆系统服务 - 处理角色记忆的增删改查、总结和精炼功能
 * [Refactor] Merged from memories.js and summaries.js for better organization
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

// Expose both namespaces for backward compatibility
window.WeChat.Services.Memories = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    openMemoryManagement(sessionId) {
        const State = this.State;
        State.prevTab = State.currentTab;
        State.currentTab = 'memory_management';

        // Robust ID Handling
        if (sessionId && sessionId !== 'undefined' && sessionId !== 'null' && typeof sessionId === 'string') {
            State.activeSessionId = sessionId;
        } else if (!State.activeSessionId && window.sysStore) {
            // Fallback to stored session if none active
            State.activeSessionId = window.sysStore.get('wx_last_session');
        } else if (!State.activeSessionId) {
            console.error('No active session ID for memory management');
            return; // Can't open without ID
        }

        console.log('Opening Memory Management for:', State.activeSessionId);
        this.App.render();
    },

    addMemory(sessionId) {
        const State = this.State;
        State.memoryModalOpen = true;
        State.editMemoryIndex = -1;
        this.App.render();
    },

    editMemory(sessionId, index) {
        const State = this.State;
        State.memoryModalOpen = true;
        State.editMemoryIndex = index;
        this.App.render();
    },

    saveMemory() {
        const State = this.State;
        const text = document.getElementById('wx-memory-input')?.value;
        if (!text) {
            if (window.os) window.os.showToast('请输入记忆内容', 'error');
            return;
        }

        const sessionId = State.activeSessionId;
        const char = window.sysStore.getCharacter(sessionId);
        const memories = char.memories || [];

        if (State.editMemoryIndex >= 0) {
            // Edit existing
            memories[State.editMemoryIndex].content = text;
            memories[State.editMemoryIndex].timestamp = Date.now();
        } else {
            // Add new
            memories.unshift({
                id: Date.now(),
                content: text,
                timestamp: Date.now()
            });
        }

        window.sysStore.updateCharacter(sessionId, { memories });
        this.App.closeModals();
        this.App.render();
    },

    deleteMemory(sessionId, index) {
        this.App.openConfirmationModal({
            title: "删除记忆",
            content: "确定要删除这条记忆吗？",
            onConfirm: `window.WeChat.App.performDeleteMemory('${sessionId}', ${index})`
        });
    },

    performDeleteMemory(sessionId, index) {
        const char = window.sysStore.getCharacter(sessionId);
        const memories = char.memories || [];
        memories.splice(index, 1);
        window.sysStore.updateCharacter(sessionId, { memories });
        this.App.closeConfirmationModal();
        this.App.render();
    }
};

window.WeChat.Services.Summaries = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    openSummaryManagement() {
        const State = this.State;
        State.summaryModalOpen = true;
        this.App.render();
    },

    openSummaryRange() {
        const State = this.State;
        State.rangeModalOpen = true;
        this.App.render();
    },

    openRefineModal() {
        const State = this.State;
        State.refineModalOpen = true;
        this.App.render();
    },

    handleRefineAll() {
        const State = this.State;
        const count = window.sysStore.getCharacter(State.activeSessionId)?.memories?.length || 0;
        if (window.os) window.os.showToast(`开始精炼全部 ${count} 条记忆...`);
        this.App.closeModals();
    },

    handleRefineCustom() {
        this.App.openPromptModal({
            title: '精炼记忆',
            content: '请输入要精炼的记忆数量:',
            value: '',
            onConfirm: (input) => {
                if (input) {
                    if (window.os) window.os.showToast(`开始精炼 ${input} 条记忆...`);
                    this.App.closeModals();
                }
            }
        });
    },

    async startSummarize() {
        const State = this.State;
        const start = parseInt(document.getElementById('wx-range-start')?.value) || 1;
        const end = parseInt(document.getElementById('wx-range-end')?.value) || 0;

        this.App.closeModals();

        if (window.os) window.os.showToast('正在生成总结...', 'info', 10000);

        // Fetch messages for active session
        const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);

        // Filter by range (start index 1-based logic)
        // Range: start -> end (0 means till end)
        let sliceStart = Math.max(0, start - 1);
        let sliceEnd = end === 0 ? msgs.length : end;

        const targetMsgs = msgs.slice(sliceStart, sliceEnd);

        if (targetMsgs.length === 0) {
            if (window.os) window.os.showToast('该范围内没有消息', 'error');
            return;
        }

        try {
            // [USER REQUEST] 手动总结时必须调用API用总结规则开始总结
            // 确保传递的配置中包含 manualPrompt 字段，以标识这是手动总结
            const summaryConfig = {
                ...State.summaryConfig,
                manualPrompt: State.summaryConfig.manualPrompt || '' // 确保 manualPrompt 字段存在（即使为空）
            };
            console.log('[Summaries] Starting manual summary with config:', summaryConfig);
            await window.Core.Memory.performSummary(State.activeSessionId, targetMsgs, summaryConfig);
            // Success toast is handled inside performSummary
        } catch (e) {
            console.error('[Summaries] Summary failed:', e);
            // 提供更详细的错误提示
            let errorMsg = '总结失败，请重试';
            if (e && e.message) {
                if (e.message.includes('503') || e.message.includes('服务暂时不可用')) {
                    errorMsg = '总结失败：服务暂时不可用，请稍后重试';
                } else if (e.message.includes('500')) {
                    errorMsg = '总结失败：API 服务器错误，请稍后重试';
                } else if (e.message.includes('429')) {
                    errorMsg = '总结失败：请求过于频繁，请稍后重试';
                } else if (e.message.includes('网络') || e.message.includes('Network')) {
                    errorMsg = '总结失败：网络连接问题，请检查网络';
                } else if (e.message.includes('API')) {
                    // 从错误信息中提取具体原因
                    const match = e.message.match(/API错误.*?:\s*(.+)/);
                    if (match && match[1]) {
                        errorMsg = `总结失败：${match[1]}`;
                    } else {
                        errorMsg = '总结失败：API 调用失败，请检查配置';
                    }
                }
            }
            if (window.os) window.os.showToast(errorMsg, 'error');
        }
    },

    toggleSummaryAuto() {
        const State = this.State;
        State.summaryConfig.autoEnabled = !State.summaryConfig.autoEnabled;
        this.App.render();
    },

    updateSummaryConfig(key, value) {
        const State = this.State;
        if (key === 'threshold') {
            State.summaryConfig.threshold = parseInt(value) || 50;
        } else if (key === 'autoPrompt') {
            State.summaryConfig.autoPrompt = value;
        } else if (key === 'manualPrompt') {
            State.summaryConfig.manualPrompt = value;
        }
    },

    saveSummarySettings() {
        const State = this.State;
        if (window.sysStore && State.activeSessionId) {
            const char = window.sysStore.getCharacter(State.activeSessionId);
            const settings = char?.settings || {};
            window.sysStore.updateCharacter(State.activeSessionId, {
                settings: {
                    ...settings,
                    summary_auto_enabled: State.summaryConfig.autoEnabled,
                    summary_threshold: State.summaryConfig.threshold,
                    summary_auto_prompt: State.summaryConfig.autoPrompt || '',
                    summary_manual_prompt: State.summaryConfig.manualPrompt || ''
                }
            });
            if (window.os) window.os.showToast('总结设置已保存');
            this.App.closeModals();
        }
    }
};
