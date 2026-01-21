/**
 * js/core/memory.js
 * 记忆系统核心 (Advanced Memory System)
 * 负责管理 Siri 与角色的记忆存储、检索与自动化总结
 */

const Memory = {
    config: {
        defaultThreshold: 50, // 默认多少条未读消息触发总结
        siriId: 'siri_internal_core', // Siri 的专用记忆 ID
    },

    init() {
        console.log('[Core.Memory] Initializing...');
        this.store = window.sysStore;
        if (!this.store) {
            console.error('[Core.Memory] SysStore not found!');
        }
    },

    /**
     * 获取指定目标的记忆列表
     * @param {string} targetId - 角色ID 或 'siri'
     * @param {number} limit - 限制条数 (0为不限制)
     */
    getMemories(targetId, limit = 0) {
        if (!this.store) return [];

        let memories = [];
        if (targetId === 'siri') {
            // Siri has its own isolated storage in our design, 
            // but for now we can store it in a special system character or dedicated store key.
            // Let's use a virtual character slot for Siri for consistency if not defined otherwise.
            const siriData = this.store.getCharacter(this.config.siriId);
            memories = siriData ? (siriData.memories || []) : [];
        } else {
            const char = this.store.getCharacter(targetId);
            memories = char ? (char.memories || []) : [];
        }

        if (limit > 0) {
            return memories.slice(0, limit);
        }
        return memories;
    },

    /**
     * 添加一条记忆
     * @param {string} targetId - 角色ID 或 'siri'
     * @param {string} content - 记忆内容
     * @param {string} type - 'chat' | 'event' | 'summary' | 'manual'
     * @param {boolean} autoSummarize - 是否尝试自动触发总结检测
     */
    addMemory(targetId, content, type = 'manual', autoSummarize = true) {
        if (!content || !this.store) return;

        const timestamp = Date.now();
        const memoryItem = {
            id: 'mem_' + timestamp + '_' + Math.floor(Math.random() * 1000),
            timestamp: timestamp,
            content: content,
            type: type
        };

        let currentMemories = this.getMemories(targetId === 'siri' ? 'siri' : targetId);
        // 新记忆插入到最前面 (frontend usually displays newest first) or append?
        // Standard convention: newest is index 0.
        currentMemories.unshift(memoryItem);

        // Update Store
        if (targetId === 'siri') {
            // Ensure Siri slot exists
            let siriData = this.store.getCharacter(this.config.siriId);
            if (!siriData) {
                this.store.addCharacter({ id: this.config.siriId, name: 'Siri', memories: [] });
                siriData = this.store.getCharacter(this.config.siriId);
            }
            this.store.updateCharacter(this.config.siriId, { memories: currentMemories });
        } else {
            this.store.updateCharacter(targetId, { memories: currentMemories });
        }

        console.log(`[Memory] Added to ${targetId}:`, type, content.substring(0, 20) + '...');

        if (autoSummarize) {
            this.checkAndSummarize(targetId);
        }

        return memoryItem;
    },

    /**
     * 检查是否需要触发自动总结
     */
    async checkAndSummarize(targetId) {
        // Siri 暂时不自动总结聊天记录，因为它处理的是全局事件
        if (targetId === 'siri') return;

        const char = this.store.getCharacter(targetId);
        if (!char) return;

        // check config
        const summaryConfig = char.settings?.summaryConfig || { autoEnabled: true, threshold: 50 };
        if (!summaryConfig.autoEnabled) return;

        // 获取该角色当前的聊天记录数量 (自上次总结以来?)
        // 目前简化逻辑：如果 总消息数 % 阈值 == 0，则触发总结。
        // 或者更智能点：记忆列表里最近一条 'summary' 类型的记忆是在多少条 'chat' 之前？

        const messages = this.store.getMessagesBySession(targetId);
        const lastSummaryTime = this.getLastSummaryTime(targetId);

        // 过滤出在上次总结之后的消息
        const newMessages = messages.filter(m => m.timestamp > lastSummaryTime);

        if (newMessages.length >= summaryConfig.threshold) {
            console.log(`[Memory] Threshold reached for ${targetId} (${newMessages.length} new msgs). Triggering summary...`);
            await this.performSummary(targetId, newMessages, summaryConfig);
        }
    },

    getLastSummaryTime(targetId) {
        const memories = this.getMemories(targetId);
        const lastSummary = memories.find(m => m.type === 'summary');
        return lastSummary ? lastSummary.timestamp : 0;
    },

    /**
     * 执行总结逻辑 (LLM调用)
     */
    async performSummary(targetId, messages, config) {
        if (!window.API) return;

        const char = this.store.getCharacter(targetId);
        const userName = this.store.get('user_realname') || '用户';

        // 1. Prepare Prompt
        // 提取消息文本
        const chatLog = messages.map(m => {
            const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? userName : (char.name || '角色');
            return `${sender}: ${m.content}`;
        }).join('\n');

        const systemPrompt = config.autoPrompt || window.WeChat?.Defaults?.SUMMARY_PROMPT || "请总结以下对话的重要信息，以第一人称视角记录为长期记忆。";

        const prompt = `${systemPrompt}\n\n[对话记录开始]\n${chatLog}\n[对话记录结束]\n\n请输出总结：`;

        try {
            // 2. Call API
            console.log('[Memory] Calling AI for summary...');
            const summaryText = await window.API.chat([
                { role: 'system', content: 'You are a helpful memory assistant.' },
                { role: 'user', content: prompt }
            ]);

            // 3. Save Summary
            if (summaryText) {
                this.addMemory(targetId, summaryText, 'summary', false); // false to prevent recursive loop
                console.log('[Memory] Summary saved successfully.');
            }

        } catch (e) {
            console.error('[Memory] Summary failed:', e);
        }
    },

    /**
     * 线下事件同步接口
     * 将线下发生的事件写入相关角色的记忆
     */
    syncOfflineEvent(characterIds, eventDescription) {
        const ids = Array.isArray(characterIds) ? characterIds : [characterIds];

        ids.forEach(id => {
            // 1. 写入角色记忆 (Limited View)
            this.addMemory(id, `(线下事件) ${eventDescription}`, 'event');
        });

        // 2. 写入 Siri 记忆 (Omniscient View)
        // Siri 知道这是发生在哪些人之间的事情
        const names = ids.map(id => {
            const c = this.store.getCharacter(id);
            return c ? c.name : id;
        }).join('、');

        this.addMemory('siri', `监测到线下事件：用户与[${names}]进行了互动。事件内容：${eventDescription}`, 'event');
    },

    /**
     * 获取上下文构建用的 Prompt 片段
     * 取最近的 N 条记忆拼装
     */
    getContextPrompt(targetId, limit = 5) {
        const memories = this.getMemories(targetId, limit);
        if (memories.length === 0) return '';

        let prompt = "【相关记忆】\n";
        // Reverse to show oldest -> newest generally makes sense for context, 
        // but memories are stored newest-first.
        // So we take top N (newest), then reverse them for chronological reading.
        const chronological = [...memories].reverse();

        chronological.forEach(m => {
            const timeStr = new Date(m.timestamp).toLocaleDateString();
            prompt += `[${timeStr}] (${m.type}) ${m.content}\n`;
        });
        return prompt + "\n";
    }
};

// Mount
if (typeof window !== 'undefined') {
    window.Core = window.Core || {};
    window.Core.Memory = Memory;
    // Auto init if store is ready
    if (window.sysStore) {
        Memory.init();
    } else {
        // Wait for store? usually index.html loads store first.
        window.addEventListener('load', () => {
            if (window.sysStore) Memory.init();
        });
    }
}
