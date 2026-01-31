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
        // [USER REQUEST] 手动总结时必须使用总结规则
        // 判断是否为手动总结：如果 config 中有 manualPrompt 字段（即使为空字符串），则认为是手动总结
        const isManualSummary = 'manualPrompt' in config;
        let basePrompt;
        
        if (isManualSummary) {
            // 手动总结：优先使用 manualPrompt，如果为空或未设置则使用默认总结规则
            if (config.manualPrompt && config.manualPrompt.trim()) {
                basePrompt = config.manualPrompt;
                console.log('[Memory] Manual summary: Using custom manual prompt');
            } else {
                basePrompt = window.WeChat?.Defaults?.SUMMARY_PROMPT || "请总结对话，以第三人称视角记录。";
                console.log('[Memory] Manual summary: Using default summary prompt');
            }
        } else {
            // 自动总结：使用 autoPrompt 或默认规则
            basePrompt = config.autoPrompt || window.WeChat?.Defaults?.SUMMARY_PROMPT || "请总结对话，以第三人称视角记录。";
            console.log('[Memory] Auto summary: Using auto prompt or default');
        }
        
        const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
        // [CRITICAL FIX] 明确告诉 AI 两个时间的区别
        let systemPrompt = basePrompt;
        // 只有在自动总结时才添加时间处理规则（手动总结时，如果用户自定义了规则，应该已经包含时间处理）
        if (!isManualSummary) {
            systemPrompt += `\n\n【时间处理严格规定】：
1. 这里的 "当前执行时间: ${nowStr}" 仅供你计算 "昨天"、"前天" 等相对概念，**绝不可作为 Summary 的时间头**！
2. 生成的 "年份日期星期时间" 必须提取自 **下方对话记录中的实际时间戳 [YYYY/... ]**。
3. 如果对话跨越也必须标明！不要把昨天发生的事写成今天！
4. 例子：如果对话发生在昨天23:00，你的Summary必须写 "202x年x月x日23:00(昨天实际日期)..."，而不能写今天的日期。`;
        }
        // [FIX] 明确要求使用第三人称
        systemPrompt += `\n\n【视角要求（强制）】：
1. **必须使用第三人称**：使用角色名或"他/她"来称呼角色，使用"你"或用户姓名来称呼用户。
2. 禁止使用第一人称（"我"）来总结角色自己的行为。
3. 示例格式："2025年4月2日8:30，星期三，（角色名）和你聊了关于早餐的话题。"`;

        systemPrompt += `\n\n【图片和表情包识别要求（强制）】：
1. **表情包识别**：如果对话中包含表情包，你必须准确识别表情包的含义（如"生气"、"开心"、"担心"等），并在总结中明确描述。禁止使用"发送了表情包"这种模糊描述。
2. **图片识别**：如果对话中包含图片，你必须仔细观察图片内容，准确描述图片中的内容（人物、物品、场景等），禁止编造不存在的内容。
3. **禁止编造**：如果图片无法清晰识别，请如实说明"图片内容不清晰"或"无法识别"，绝不可编造图片内容。`;

        systemPrompt += `\n\n【其它要求】：\n1. 总结精简(100字内)。\n2. 所有总结必须使用第三人称。`;

        // 2. Build Multimodal Content
        // [FIX] 检查是否真的需要多模态格式（是否有图片/表情包）
        const hasMultimodalContent = messages.some(m => m.type === 'image' || m.type === 'sticker');
        let userContentParts = [];
        let currentTextBuffer = systemPrompt + "\n\n[对话记录开始]\n";

        messages.forEach(m => {
            const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? userName : (char.name || '角色');
            const timeStr = new Date(m.timestamp).toLocaleString('zh-CN', { hour12: false });
            // [FIX] 安全处理 content，避免 undefined/null 导致的问题
            const safeContent = (m.content != null) ? String(m.content) : '';

            if (m.type === 'image' || m.type === 'sticker') {
                // [USER REQUEST] 表情包必须能识别正确含义
                let label = '';
                let description = '';
                
                if (m.type === 'sticker') {
                    // 尝试从 Stickers 服务获取表情包的含义标签
                    if (window.WeChat && window.WeChat.Services && window.WeChat.Services.Stickers) {
                        const allStickers = window.WeChat.Services.Stickers.getAll();
                        const sticker = allStickers.find(s => s.url === safeContent);
                        if (sticker && sticker.tags && sticker.tags.length > 0) {
                            // 过滤掉"自定义"、"收藏"等元数据标签，只保留含义标签
                            const meaningTags = sticker.tags.filter(t => !['自定义', '收藏', '未分类'].includes(t));
                            if (meaningTags.length > 0) {
                                description = `[表情包含义: ${meaningTags.join(', ')}]`;
                            }
                        }
                    }
                    label = description ? `[发送了表情包 ${description}]` : '[发送了表情包]';
                } else {
                    label = '[发送了图片]';
                }
                
                const imageText = `[${timeStr}] ${sender} ${label}: ${safeContent}\n`;
                
                // 同时添加到多模态格式和文本缓冲区（用于回退）
                if (currentTextBuffer) {
                    userContentParts.push({ type: 'text', text: currentTextBuffer });
                    currentTextBuffer = "";
                }
                userContentParts.push({ type: 'text', text: `\n${imageText}` });
                userContentParts.push({ type: 'image_url', image_url: { url: safeContent } });
                
                // [FIX] 也在文本缓冲区中保留图片描述，以便回退到纯文本格式时使用
                currentTextBuffer += imageText;
            } else if (m.type === 'voice_text' || m.type === 'voice') {
                // [Logic] Mark as Voice Call to prevent AI from thinking it was a text chat
                // [FIX] 如果 content 为空，使用默认描述
                const voiceContent = safeContent || '[语音通话内容]';
                currentTextBuffer += `[${timeStr}] ${sender} [语音通话]: ${voiceContent}\n`;
            } else if (m.type === 'call_summary') {
                // [Logic] Integrate call metadata
                let data = {};
                try { 
                    if (safeContent) {
                        data = JSON.parse(safeContent);
                    }
                } catch (e) { }
                currentTextBuffer += `[${timeStr}] 系统提示: ${sender} 与你进行了一次通话 (时长: ${data.duration || '未知'})\n`;
            } else {
                // [FIX] 确保所有文本消息的 content 都被安全处理
                currentTextBuffer += `[${timeStr}] ${sender}: ${safeContent}\n`;
            }
        });

        currentTextBuffer += "\n[对话记录结束]\n\n请输出总结：";
        
        // [FIX] 只在需要多模态格式时才填充 userContentParts
        if (hasMultimodalContent) {
            userContentParts.push({ type: 'text', text: currentTextBuffer });
        }

        try {
            // 3. Call API with appropriate format
            // [USER REQUEST] 修复：有图片/表情包时也要能总结
            // [FIX] 如果包含图片/表情包，尝试使用多模态格式；如果失败则回退到纯文本格式
            let summaryText = null;
            let messagesPayload;
            
            if (hasMultimodalContent) {
                console.log('[Memory] Calling AI (Vision) for summary with multimodal content...');
                console.log('[Memory] Multimodal content parts:', userContentParts.length);
                console.log('[Memory] System prompt emphasizes: image recognition, sticker meaning, third-person perspective');
                
                // 尝试使用多模态格式
                try {
                    messagesPayload = [
                        {
                            role: 'user',
                            content: userContentParts
                        }
                    ];
                    summaryText = await window.API.chat(messagesPayload);
                } catch (multimodalError) {
                    console.warn('[Memory] Multimodal summary failed, falling back to text-only format:', multimodalError);
                    // 回退到纯文本格式（只使用文本描述，不包含图片）
                    console.log('[Memory] Falling back to text-only summary...');
                    messagesPayload = [
                        {
                            role: 'user',
                            content: currentTextBuffer
                        }
                    ];
                    summaryText = await window.API.chat(messagesPayload);
                }
            } else {
                console.log('[Memory] Calling AI for text-only summary...');
                // Use simple text format when no images/stickers
                messagesPayload = [
                    {
                        role: 'user',
                        content: currentTextBuffer
                    }
                ];
                summaryText = await window.API.chat(messagesPayload);
            }

            // 4. Save Summary
            if (summaryText) {
                this.addMemory(targetId, summaryText, 'summary', false);
                console.log('[Memory] Summary saved successfully.');
                if (window.os) window.os.showToast('长期记忆已更新', 'success');
                
                // [USER REQUEST] 实时刷新UI，不需要手动刷新页面
                if (window.WeChat && window.WeChat.App && window.WeChat.App.render) {
                    window.WeChat.App.render();
                }
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
