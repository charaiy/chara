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

    openSummaryRange(mode = 'narrative') {
        const State = this.State;
        State.rangeModalOpen = true;
        State.summaryRangeMode = mode; // Store mode
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

    // 以前是直接触发，现在重定向到范围选择以便更精准控制
    async handleManualEventExtraction() {
        this.openSummaryRange('database');
    },

    async startSummarize() {
        const State = this.State;
        const start = parseInt(document.getElementById('wx-range-start')?.value) || 1;
        const end = parseInt(document.getElementById('wx-range-end')?.value) || 0;
        const mode = State.summaryRangeMode || 'narrative'; // Default to narrative

        this.App.closeModals();

        const toastMsg = mode === 'database' ? '正在提取事件...' : '正在生成总结...';
        if (window.os) window.os.showToast(toastMsg, 'info', 10000);

        // Fetch messages for active session
        const msgs = window.sysStore.getMessagesBySession(State.activeSessionId);

        // Filter by range (start index 1-based logic)
        let sliceStart = Math.max(0, start - 1);
        let sliceEnd = end === 0 ? msgs.length : end;

        const targetMsgs = msgs.slice(sliceStart, sliceEnd);

        if (targetMsgs.length === 0) {
            if (window.os) window.os.showToast('该范围内没有消息', 'error');
            return;
        }

        try {
            if (mode === 'database') {
                // Database Event Extraction Mode
                await window.Core.Memory.performEventExtraction(State.activeSessionId, targetMsgs);
                if (window.os) window.os.showToast('事件提取完成', 'success');
            } else {
                // Narrative Summary Mode
                const summaryConfig = {
                    ...State.summaryConfig,
                    manualPrompt: State.summaryConfig.manualPrompt || ''
                };
                console.log('[Summaries] Starting manual summary with config:', summaryConfig);
                await window.Core.Memory.performSummary(State.activeSessionId, targetMsgs, summaryConfig);

                // [Sync Check] 手动触发日记时，如果开启了同步，顺便提取事件
                if (State.summaryConfig.eventSyncWithSummary) {
                    // 仅当事件功能整体开启时才执行
                    if (State.summaryConfig.eventAutoEnabled) {
                        if (window.os) window.os.showToast('正同步提取数据库事件...', 'info');
                        const dbConfig = {
                            databasePrompt: State.summaryConfig.databasePrompt || ''
                        };
                        // 不阻塞主流程，异步执行
                        window.Core.Memory.performEventExtraction(State.activeSessionId, targetMsgs, dbConfig)
                            .then(() => {
                                if (window.os) window.os.showToast('同步事件提取完成', 'success');
                            })
                            .catch(e => console.error('Sync Event Extraction failed:', e));
                    }
                }
            }
        } catch (e) {
            console.error('[Summaries] Operation failed:', e);
            let errorMsg = '操作失败，请重试';
            // Detailed error handling...
            if (e && e.message) {
                // ... (Simplified error mapping for readability here, but in real code keep the detailed checks if possible or just generic)
                if (e.message.includes('API')) errorMsg = 'API调用失败';
            }
            if (window.os) window.os.showToast(errorMsg, 'error');
        }
    },

    // Helper to preserve scroll position during re-render
    _renderWithScroll() {
        const container = document.getElementById('wx-summary-scroll-container');
        const top = container ? container.scrollTop : 0;
        this.App.render();
        // Restore after DOM update
        setTimeout(() => {
            const newContainer = document.getElementById('wx-summary-scroll-container');
            if (newContainer) newContainer.scrollTop = top;
        }, 0);
    },

    toggleSummaryAuto() {
        const State = this.State;
        State.summaryConfig.autoEnabled = !State.summaryConfig.autoEnabled;
        this._renderWithScroll();
    },

    toggleEventAuto() {
        const State = this.State;
        State.summaryConfig.eventAutoEnabled = !State.summaryConfig.eventAutoEnabled;
        this._renderWithScroll();
    },

    toggleEventSync() {
        const State = this.State;
        State.summaryConfig.eventSyncWithSummary = !State.summaryConfig.eventSyncWithSummary;
        this._renderWithScroll();
    },

    updateSummaryConfig(key, value) {
        const State = this.State;
        // 使用 _renderWithScroll 确保输入框输入时如果触发重绘也能保持位置(虽然input通常不重绘整个modal，但以防万一)
        // 但这里是 input event，通常只更新 State，不立即 render。如果原来的逻辑没有 render，这里也不要加。

        if (key === 'threshold') {
            State.summaryConfig.threshold = parseInt(value) || 50;
        } else if (key === 'autoPrompt') {
            State.summaryConfig.autoPrompt = value;
        } else if (key === 'manualPrompt') {
            State.summaryConfig.manualPrompt = value;
        } else if (key === 'databasePrompt') {
            State.summaryConfig.databasePrompt = value;
        } else if (key === 'eventAutoEnabled') {
            State.summaryConfig.eventAutoEnabled = value;
        } else if (key === 'eventThreshold') {
            State.summaryConfig.eventThreshold = parseInt(value) || 50;
        } else if (key === 'eventSyncWithSummary') {
            State.summaryConfig.eventSyncWithSummary = value;
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
                    summary_manual_prompt: State.summaryConfig.manualPrompt || '',
                    // 保存新的事件配置
                    event_auto_enabled: State.summaryConfig.eventAutoEnabled,
                    event_threshold: State.summaryConfig.eventThreshold,
                    event_database_prompt: State.summaryConfig.databasePrompt || '',
                    event_sync_with_summary: State.summaryConfig.eventSyncWithSummary
                }
            });
            if (window.os) window.os.showToast('总结设置已保存');
            this.App.closeModals();
        }
    }
};
