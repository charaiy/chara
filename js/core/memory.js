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
     * 独立：执行数据库事件提取
     * @param {string} targetId
     * @param {Array} providedMsgs (可选) 指定要分析的消息列表
     * @param {Object} config (可选) 配置
     */
    async performEventExtraction(targetId, providedMsgs = null, config = null) {
        if (!window.API) return;

        const char = this.store.getCharacter(targetId);
        const userName = this.store.get('user_realname') || '用户';

        // 1. 确定配置
        const summaryConfig = config || char.settings?.summaryConfig || { databasePrompt: '' };
        const dbCustomPrompt = summaryConfig.databasePrompt || summaryConfig.event_database_prompt;

        // 2. 准备语料 (如果没有提供，默认取最近 30 条作为上下文)
        let messages = providedMsgs;
        if (!messages) {
            const allMsgs = this.store.getMessagesBySession(targetId);
            messages = allMsgs.slice(-30);
        }
        if (!messages || messages.length === 0) return;

        // 3. 构建文本 Buffer (简化版，不需要多模态，只提取文本事实)
        let textBuffer = "[对话上下文]\n";
        messages.forEach(m => {
            const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? userName : (char.name || '角色');
            const timeStr = new Date(m.timestamp).toLocaleString('zh-CN', { hour12: false });
            textBuffer += `[${timeStr}] ${sender}: ${m.content}\n`;
        });
        textBuffer += "\n[结束]\n";

        // 4. 定义 Prompt
        const dbSystemPrompt = `
你是一个无情的数据库记录员与社交网络观察家。
任务：从对话文本中提取结构化事实，并深入分析【所有参与者及被提及对象】之间的人际关系、看法、流言及视角变化。

输出且仅输出一个合法的 JSON 对象。无 Markdown。

JSON 格式要求：
{
    "summary": "简练客观的一句话概括(15字内)。",
    "type": "必须是 [conversation, schedule, milestone, background, offline] 之一",
    "schedule": null 或 { "date": "YYYY-MM-DD", "time": "HH:MM", "activity": "内容" },
    "social_graph_updates": [
        {
             "target_name": "用户" 或 "明确提及的角色名",
             "public_relation": "如：死党、情敌、互助 (仅在发生质变时填写)",
             "private_attitude": "内心对该目标的真实看法/流言/新印象 (简短)",
             "affection_delta": 0.0 // 如果是好感度变化，请给出分值(仅对目标为'用户'有用)
        }
    ]
}

${dbCustomPrompt ? `用户额外规则：${dbCustomPrompt}` : ''}

注意：
1. 你的分析主体是 ${char.name}。分析 TA 对别的人（包括用户和其他 NPC）看法的改变。
2. 即使目标人没有参与对话，只要 ${char.name} 表达了对 TA 的看法（包括背后议论、提及流言），也请在 social_graph_updates 中记录。
3. 若无任何显著变化，数组留空 []。
`;

        try {
            console.log('[Memory] Starting Standalone Database Event Extraction...');
            const dbPayload = [
                { role: 'system', content: dbSystemPrompt },
                { role: 'user', content: textBuffer }
            ];

            const dbResponse = await window.API.chat(dbPayload);

            let eventData = {};
            try {
                const cleanJson = dbResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                eventData = JSON.parse(cleanJson);
            } catch (parseError) {
                console.warn('[Memory] JSON Parse failed:', parseError);
                // Fallback
                eventData = {
                    summary: '对话记录归档',
                    type: 'conversation'
                };
            }

            // [Logic] 处理复杂的社会化关系更新 (Social Graph & Gossip)
            const updates = eventData.social_graph_updates || eventData.relationship_update;
            const updateList = Array.isArray(updates) ? updates : (updates ? [updates] : []);

            if (updateList.length > 0) {
                const relService = window.WeChat?.Services?.RelationshipGraph;

                for (const update of updateList) {
                    let targetNodeId = null;
                    const name = update.target_name || '用户';

                    // 1. 智能匹配 ID
                    if (['用户', '我', 'User', 'Me', 'Self'].some(k => name.toLowerCase().includes(k.toLowerCase()))) {
                        targetNodeId = 'USER_SELF';
                    } else {
                        // 寻找 NPC ID
                        const allChars = this.store.getAllCharacters ? this.store.getAllCharacters() : [];
                        const found = allChars.find(c => c.name === name || (c.id && c.id.toLowerCase() === name.toLowerCase()));
                        if (found) targetNodeId = found.id;
                    }

                    if (!targetNodeId) {
                        console.warn(`[Memory] Cannot find character ID for social target: ${name}`);
                        continue;
                    }

                    // 2. 更新关系网描述 (核心视角变更)
                    if (relService && relService.updateRelationship) {
                        const updateData = {};
                        if (update.public_relation || update.char_to_user_public_relation)
                            updateData.char_to_user_public_relation = update.public_relation || update.char_to_user_public_relation;

                        if (update.private_attitude || update.char_to_user_private_attitude)
                            updateData.char_to_user_private_attitude = update.private_attitude || update.char_to_user_private_attitude;

                        if (Object.keys(updateData).length > 0) {
                            // 主体是 targetId (当前角色), 客体是 targetNodeId
                            relService.updateRelationship(targetId, targetNodeId, updateData);
                            console.log(`[Memory] Social Connection Updated/Created: ${targetId} -> ${targetNodeId}`, updateData);
                        }
                    }

                    // 3. 处理好感度变化 (仅针对对用户的好感)
                    const delta = update.affection_delta || update.affection_change;
                    if (targetNodeId === 'USER_SELF' && typeof delta === 'number' && delta !== 0) {
                        const currentAffection = parseFloat(char.status?.affection || 0);
                        const newAffection = Math.round((currentAffection + delta) * 10) / 10;
                        this.store.updateCharacter(targetId, {
                            status: { ...char.status, affection: newAffection }
                        });
                    }
                }
            }

            // 写入事件账本
            const eventsService = window.WeChat?.Services?.Events;
            if (eventsService) {
                eventsService.createEvent({
                    type: eventData.type || 'conversation',
                    participants: [targetId, 'USER_SELF'],
                    summary: eventData.summary || '未命名事件',
                    scheduleInfo: eventData.schedule || null,
                    metadata: {
                        source: 'ai_social_extraction',
                        msg_count: messages.length,
                        has_social_updates: updateList.length > 0
                    }
                });
                console.log('[Memory] Database Event Logged:', eventData);
            }

        } catch (e) {
            console.error('[Memory] Event Extraction API Failed:', e);
            throw e;
        }
    },

    /**
     * 检查是否需要触发自动总结 (双重检查)
     */
    async checkAndSummarize(targetId) {
        if (targetId === 'siri') return;

        const char = this.store.getCharacter(targetId);
        if (!char) return;

        // Config Defs
        const settings = char.settings || {};
        const config = settings.summaryConfig || {};

        const narrativeEnabled = settings.summary_auto_enabled ?? config.autoEnabled ?? true;
        const narrativeThreshold = settings.summary_threshold ?? config.threshold ?? 50;

        const eventEnabled = settings.event_auto_enabled ?? config.eventAutoEnabled ?? false;
        const eventThreshold = settings.event_threshold ?? config.eventThreshold ?? 50;
        const eventSync = settings.event_sync_with_summary ?? config.eventSyncWithSummary ?? true;

        const messages = this.store.getMessagesBySession(targetId);

        // --- Check 1: Narrative Diary ---
        if (narrativeEnabled) {
            const lastSummaryTime = this.getLastSummaryTime(targetId);
            const newNarrativeMsgs = messages.filter(m => m.timestamp > lastSummaryTime);

            if (newNarrativeMsgs.length >= narrativeThreshold) {
                console.log(`[Memory] Narrative Threshold reached (${newNarrativeMsgs.length})...`);

                // 1. Perform Narrative Summary
                const runConfig = {
                    autoPrompt: settings.summary_auto_prompt ?? config.autoPrompt,
                    autoEnabled: true
                };
                await this.performSummary(targetId, newNarrativeMsgs, runConfig);

                // 2. If Sync is ON, also perform Event Extraction on the same batch
                if (eventEnabled && eventSync) {
                    console.log(`[Memory] Sync Trigger: Performing Event Extraction...`);
                    const dbConfig = {
                        databasePrompt: settings.event_database_prompt ?? config.databasePrompt
                    };
                    // Use catch to ensure narrative success isn't blocked by event failure
                    try {
                        await this.performEventExtraction(targetId, newNarrativeMsgs, dbConfig);
                        // Update event timestamp
                        this.store.updateCharacter(targetId, {
                            settings: {
                                ...this.store.getCharacter(targetId).settings, // refresh settings
                                last_event_scan_time: Date.now()
                            }
                        });
                    } catch (err) {
                        console.error('[Memory] Sync Event Extraction failed:', err);
                    }
                }
            }
        }

        // --- Check 2: Event Extraction (Independent Mode only) ---
        if (eventEnabled && !eventSync) {
            const lastEventScanTime = settings.last_event_scan_time || 0;
            const newEventMsgs = messages.filter(m => m.timestamp > lastEventScanTime);

            if (newEventMsgs.length >= eventThreshold) {
                console.log(`[Memory] Event Threshold reached (${newEventMsgs.length})...`);
                const runConfig = {
                    databasePrompt: settings.event_database_prompt ?? config.databasePrompt
                };

                await this.performEventExtraction(targetId, newEventMsgs, runConfig);

                // 更新时间戳
                this.store.updateCharacter(targetId, {
                    settings: {
                        ...settings,
                        last_event_scan_time: Date.now()
                    }
                });
            }
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
