/**
 * js/apps/wechat/services/events.js
 * 事件账本系统 - Chara OS
 * 
 * 核心概念：
 * - 事件(Event)是新的一等公民，替代"消息+关系"双层结构
 * - 每个重要对话/互动产生一个事件条目
 * - 事件自动关联多个参与者，天然支持多人关系
 * - 事件包含关系变化、状态快照、日程信息
 * 
 * 数据结构：
 * events: {
 *   "event_xxxxx": {
 *     id: "event_xxxxx",
 *     timestamp: 1700000000,
 *     type: "conversation" | "background" | "group" | "offline" | "schedule",
 *     participants: ["charA", "charB", "USER_SELF"],
 *     summary: "三人在咖啡厅讨论了项目进展",
 *     relationshipChanges: [
 *       { from: "charA", to: "charB", viewChange: "+信任", attitudeChange: 0.5 }
 *     ],
 *     statusSnapshots: {
 *       "charA": { outfit: "工作装", behavior: "翻阅笔记本", inner_voice: "..." }
 *     },
 *     scheduleInfo: { date: "2026-02-05", time: "14:00", activity: "约会" },
 *     visibleTo: ["charA", "charB", "USER_SELF"]
 *   }
 * }
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Events = {
    STORAGE_KEY: 'chara_events_v1',

    /**
     * 初始化事件系统
     */
    init() {
        console.log('[Events] Initializing event ledger system...');
        this._ensureStorage();
    },

    _ensureStorage() {
        if (!window.sysStore.get(this.STORAGE_KEY)) {
            window.sysStore.set(this.STORAGE_KEY, {});
        }
    },

    /**
     * 生成唯一事件ID
     */
    _generateId() {
        return 'event_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    },

    /**
     * 获取所有事件
     */
    getAllEvents() {
        return window.sysStore.get(this.STORAGE_KEY) || {};
    },

    /**
     * 获取单个事件
     */
    getEvent(eventId) {
        const events = this.getAllEvents();
        return events[eventId] || null;
    },

    /**
     * 创建新事件
     * @param {Object} eventData 事件数据
     * @returns {Object} 创建的事件对象
     */
    createEvent(eventData) {
        const events = this.getAllEvents();
        const id = eventData.id || this._generateId();

        const event = {
            id: id,
            timestamp: eventData.timestamp || Date.now(),
            type: eventData.type || 'conversation',
            participants: eventData.participants || [],
            summary: eventData.summary || '',
            relationshipChanges: eventData.relationshipChanges || [],
            statusSnapshots: eventData.statusSnapshots || {},
            scheduleInfo: eventData.scheduleInfo || null,
            visibleTo: eventData.visibleTo || eventData.participants || [],
            metadata: eventData.metadata || {}
        };

        events[id] = event;
        window.sysStore.set(this.STORAGE_KEY, events);

        console.log(`[Events] Created event: ${id}`, event);

        // 触发关系变化处理
        if (event.relationshipChanges && event.relationshipChanges.length > 0) {
            this._processRelationshipChanges(event);
        }

        // 触发状态更新
        if (event.statusSnapshots && Object.keys(event.statusSnapshots).length > 0) {
            this._processStatusSnapshots(event);
        }

        return event;
    },

    /**
     * 处理事件中的关系变化
     * 
     * 核心逻辑（罗生门保护）：
     * - 如果 from/to 包含 USER_SELF 或事件发起者 → 当事人，修改客观关系
     * - 如果 from/to 都是第三方 → 旁观者，只修改流言（不污染真实世界）
     */
    _processRelationshipChanges(event) {
        const rgService = window.WeChat.Services.RelationshipGraph;
        if (!rgService) return;

        const originatingChar = event.metadata?.originatingChar;

        event.relationshipChanges.forEach(change => {
            const { from, to, viewChange, attitudeChange } = change;
            if (!from || !to) return;

            // 判断是否为当事人（关系涉及用户或发起者）
            const isParticipant = (
                from === 'USER_SELF' || to === 'USER_SELF' ||
                from === originatingChar || to === originatingChar
            );

            if (isParticipant) {
                // =============================================
                // 当事人场景：修改客观关系
                // =============================================
                let rel = rgService.getRelationship(from, to);

                if (!rel) {
                    rel = {
                        nodeA: from < to ? from : to,
                        nodeB: from < to ? to : from,
                        aViewOfB: '认识',
                        bViewOfA: '认识',
                        aTowardB: '中性',
                        bTowardA: '中性',
                        visibleTo: [from, to],
                        backstory: `通过事件 ${event.id} 建立关系`
                    };
                }

                const isReversed = from > to;
                if (viewChange) {
                    if (isReversed) {
                        rel.bViewOfA = viewChange;
                    } else {
                        rel.aViewOfB = viewChange;
                    }
                }

                if (attitudeChange !== undefined) {
                    rel.changeLog = rel.changeLog || [];
                    rel.changeLog.push({
                        timestamp: event.timestamp,
                        eventId: event.id,
                        change: attitudeChange,
                        reason: event.summary
                    });
                    if (rel.changeLog.length > 50) {
                        rel.changeLog = rel.changeLog.slice(-50);
                    }
                }

                if (!rel.visibleTo) rel.visibleTo = [];
                if (!rel.visibleTo.includes(from)) rel.visibleTo.push(from);
                if (!rel.visibleTo.includes(to)) rel.visibleTo.push(to);

                rgService.saveRelationship(rel);
                console.log(`[Events] Updated OBJECTIVE relationship: ${from} -> ${to}`);

            } else {
                // =============================================
                // 旁观者场景：只修改流言（罗生门保护）
                // 不会影响真实世界的 B 和 C 的关系！
                // =============================================
                const rumors = window.sysStore.get('rg_rumors_v1') || {};
                const pairId = [from, to].sort().join('_');
                const key = `${originatingChar}|${pairId}`;
                const existing = rumors[key] || {};

                const sortedIds = [from, to].sort();
                const isReversed = sortedIds[0] !== from;

                rumors[key] = {
                    ...existing,
                    observerId: originatingChar,
                    nodeA: sortedIds[0],
                    nodeB: sortedIds[1],
                    contentAtoB: isReversed ? (existing.contentBtoA || viewChange) : (viewChange || existing.contentAtoB),
                    contentBtoA: isReversed ? (viewChange || existing.contentAtoB) : (existing.contentBtoA || viewChange),
                    reason: event.summary || existing.reason || '',
                    updatedAt: Date.now()
                };
                rumors[key].content = rumors[key].contentAtoB;

                window.sysStore.set('rg_rumors_v1', rumors);
                console.log(`[Events] Updated RUMOR (罗生门): ${originatingChar} believes ${from} -> ${to} is "${viewChange}"`);
            }
        });
    },

    /**
     * 处理事件中的状态快照
     */
    _processStatusSnapshots(event) {
        Object.entries(event.statusSnapshots).forEach(([charId, snapshot]) => {
            if (charId === 'USER_SELF') return; // 用户不需要状态更新

            const char = window.sysStore.getCharacter(charId);
            if (!char) return;

            const oldStatus = char.status || {};
            const newStatus = { ...oldStatus };

            if (snapshot.outfit) newStatus.outfit = snapshot.outfit;
            if (snapshot.behavior) newStatus.behavior = snapshot.behavior;
            if (snapshot.inner_voice) newStatus.inner_voice = snapshot.inner_voice;

            window.sysStore.updateCharacter(charId, { status: newStatus });
        });
    },

    /**
     * 获取某角色参与的所有事件
     * @param {string} participantId 参与者ID
     * @param {Object} options 选项 { limit, type, since }
     */
    getEventsByParticipant(participantId, options = {}) {
        const events = this.getAllEvents();
        const { limit = 50, type = null, since = 0 } = options;

        let result = Object.values(events)
            .filter(e => {
                // 参与者过滤
                if (!e.participants.includes(participantId)) return false;
                // 类型过滤
                if (type && e.type !== type) return false;
                // 时间过滤
                if (e.timestamp < since) return false;
                return true;
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        return limit > 0 ? result.slice(0, limit) : result;
    },

    /**
     * 获取多人共同参与的事件
     * @param {Array} participantIds 参与者ID数组
     */
    getSharedEvents(participantIds) {
        const events = this.getAllEvents();

        return Object.values(events)
            .filter(e => {
                // 所有指定参与者都必须在事件中
                return participantIds.every(id => e.participants.includes(id));
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    },

    /**
     * 获取日程事件
     * @param {string} charId 角色ID
     * @param {string} date 日期 YYYY-MM-DD
     */
    getScheduleEvents(charId, date = null) {
        const events = this.getAllEvents();
        const today = date || new Date().toISOString().split('T')[0];

        return Object.values(events)
            .filter(e => {
                if (!e.scheduleInfo) return false;
                if (!e.participants.includes(charId)) return false;
                if (date && e.scheduleInfo.date !== date) return false;
                // 只返回未来或今天的日程
                if (e.scheduleInfo.date < today) return false;
                return true;
            })
            .sort((a, b) => {
                // 按日期+时间排序
                const aKey = `${a.scheduleInfo.date} ${a.scheduleInfo.time || '00:00'}`;
                const bKey = `${b.scheduleInfo.date} ${b.scheduleInfo.time || '00:00'}`;
                return aKey.localeCompare(bKey);
            });
    },

    /**
     * 获取今日日程
     */
    getTodaySchedule(charId) {
        const today = new Date().toISOString().split('T')[0];
        return this.getScheduleEvents(charId, today);
    },

    /**
     * 压缩旧事件（保留摘要，删除详情）
     * @param {number} maxAge 最大保留天数
     * @param {number} maxCount 最大保留数量
     */
    compressOldEvents(maxAge = 30, maxCount = 100) {
        const events = this.getAllEvents();
        const now = Date.now();
        const cutoff = now - maxAge * 24 * 60 * 60 * 1000;

        const eventList = Object.values(events).sort((a, b) => b.timestamp - a.timestamp);

        let count = 0;
        eventList.forEach(event => {
            count++;
            if (count > maxCount || event.timestamp < cutoff) {
                // 压缩：只保留核心信息
                events[event.id] = {
                    id: event.id,
                    timestamp: event.timestamp,
                    type: event.type,
                    participants: event.participants,
                    summary: event.summary,
                    compressed: true
                };
            }
        });

        window.sysStore.set(this.STORAGE_KEY, events);
        console.log(`[Events] Compressed events older than ${maxAge} days or exceeding ${maxCount} count`);
    },

    /**
     * 更新事件
     * @param {string} eventId
     * @param {Object} updates 需要更新的字段
     */
    updateEvent(eventId, updates) {
        const events = this.getAllEvents();
        if (!events[eventId]) return false;

        events[eventId] = {
            ...events[eventId],
            ...updates,
            // 确保 ID 不被修改
            id: eventId
        };

        window.sysStore.set(this.STORAGE_KEY, events);
        console.log(`[Events] Updated event: ${eventId}`, updates);
        return events[eventId];
    },

    /**
     * 删除事件
     */
    deleteEvent(eventId) {
        const events = this.getAllEvents();
        if (events[eventId]) {
            delete events[eventId];
            window.sysStore.set(this.STORAGE_KEY, events);
            return true;
        }
        return false;
    },

    /**
     * 切换事件完成状态（用于日程打钩）
     */
    toggleEventComplete(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return false;

        return this.updateEvent(eventId, {
            completed: !event.completed
        });
    },

    /**
     * 从AI输出创建事件（用于 chat.js 调用）
     * @param {Object} action AI输出的动作对象
     * @param {string} currentCharId 当前对话的角色ID
     */
    createEventFromAIAction(action, currentCharId) {
        // 解析AI输出的事件数据
        const eventData = {
            type: action.event_type || 'conversation',
            participants: action.participants || [currentCharId, 'USER_SELF'],
            summary: action.summary || action.content || '',
            relationshipChanges: action.relationship_changes || [],
            statusSnapshots: action.status_snapshots || {},
            scheduleInfo: action.schedule || null,
            metadata: {
                source: 'ai_action',
                originatingChar: currentCharId
            }
        };

        // 如果AI提供了状态更新，添加到快照
        if (action.status) {
            eventData.statusSnapshots[currentCharId] = action.status;
        }

        return this.createEvent(eventData);
    },

    /**
     * 生成用于 Prompt 注入的事件上下文
     * @param {string} charId 角色ID
     * @param {number} limit 最大事件数
     */
    buildEventContext(charId, limit = 10) {
        const events = this.getEventsByParticipant(charId, { limit });

        if (events.length === 0) {
            return '（暂无共同事件记录）';
        }

        const lines = events.map(e => {
            const date = new Date(e.timestamp).toLocaleDateString('zh-CN');
            const participants = e.participants.filter(p => p !== charId && p !== 'USER_SELF');
            const othersStr = participants.length > 0 ? `（涉及: ${participants.join(', ')}）` : '';
            return `- [${date}] ${e.summary}${othersStr}`;
        });

        return lines.join('\n');
    },

    /**
     * 生成日程上下文
     */
    buildScheduleContext(charId) {
        const schedule = this.getScheduleEvents(charId);

        if (schedule.length === 0) {
            return '（暂无日程安排）';
        }

        const lines = schedule.slice(0, 5).map(e => {
            const info = e.scheduleInfo;
            return `- ${info.date} ${info.time || ''}: ${info.activity}${info.location ? ` @ ${info.location}` : ''}`;
        });

        return lines.join('\n');
    }
};

// 初始化
if (window.sysStore) {
    window.WeChat.Services.Events.init();
}
