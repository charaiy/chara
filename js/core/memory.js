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

        // 1. Prepare System Prompt
        let systemPrompt = config.autoPrompt || window.WeChat?.Defaults?.SUMMARY_PROMPT || "请总结对话，以第一人称视角记录。";
        const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
        // [CRITICAL FIX] 明确告诉 AI 两个时间的区别
        systemPrompt += `\n\n【时间处理严格规定】：
1. 这里的 "当前执行时间: ${nowStr}" 仅供你计算 "昨天"、"前天" 等相对概念，**绝不可作为 Summary 的时间头**！
2. 生成的 "年份日期星期时间" 必须提取自 **下方对话记录中的实际时间戳 [YYYY/... ]**。
3. 如果对话跨越也必须标明！不要把昨天发生的事写成今天！
4. 例子：如果对话发生在昨天23:00，你的Summary必须写 "202x年x月x日23:00(昨天实际日期)..."，而不能写今天的日期。`;

        systemPrompt += `\n\n【其它要求】：\n1. 总结精简(100字内)。\n2. 遇到表情包请描述含义。`;

        // 2. Build Multimodal Content
        let userContentParts = [];
        let currentTextBuffer = systemPrompt + "\n\n[对话记录开始]\n";

        messages.forEach(m => {
            const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? userName : (char.name || '角色');
            const timeStr = new Date(m.timestamp).toLocaleString('zh-CN', { hour12: false }); // Add explicit time

            if (m.type === 'image' || m.type === 'sticker') {
                // Flush text buffer
                if (currentTextBuffer) {
                    userContentParts.push({ type: 'text', text: currentTextBuffer });
                    currentTextBuffer = "";
                }

                // Add Context for Image - Explicitly label as Sticker or Image for the AI
                const label = m.type === 'sticker' ? '[发送了表情包]' : '[发送了图片]';
                userContentParts.push({ type: 'text', text: `\n[${timeStr}] ${sender} ${label}:\n` });

                // Add Image Part
                // Ensure it is a valid URL or Base64. 
                // Note: Some local base64 might be too large, but we try.
                userContentParts.push({
                    type: 'image_url',
                    image_url: { url: m.content }
                });

                currentTextBuffer += "\n"; // Padding after image
            } else {
                // Normal Text
                currentTextBuffer += `[${timeStr}] ${sender}: ${m.content}\n`;
            }
        });

        currentTextBuffer += "\n[对话记录结束]\n\n请输出总结：";
        userContentParts.push({ type: 'text', text: currentTextBuffer });

        try {
            // 3. Call API with Multimodal payload
            console.log('[Memory] Calling AI (Vision) for summary...');

            // Construct the messages structure. 
            // Note: We merge everything into one 'user' message with multiple parts for maximum compatibility with standard Vision APIs.
            const messagesPayload = [
                {
                    role: 'user',
                    content: userContentParts
                }
            ];

            const summaryText = await window.API.chat(messagesPayload);

            // 4. Save Summary
            if (summaryText) {
                this.addMemory(targetId, summaryText, 'summary', false);
                console.log('[Memory] Summary saved successfully.');
                if (window.os) window.os.showToast('长期记忆已更新', 'success');
            }

        } catch (e) {
            console.error('[Memory] Summary failed:', e);
            if (window.os) window.os.showToast('总结失败，请检查网络或配置', 'error');
            throw e;
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
