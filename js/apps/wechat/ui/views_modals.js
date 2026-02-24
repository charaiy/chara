/**
 * js/apps/wechat/ui/views_modals.js
 * 模态框视图渲染服务 - 负责渲染各种模态框的具体内容
 * 
 * 职责：
 * - 渲染各种模态框的HTML内容
 * - 处理模态框内的交互逻辑
 * - 提供模态框渲染函数供 modals_controller.js 调用
 * 
 * 主要模态框：
 * 1. 语音/视频通话模态框：
 *    - renderVoiceCallModal(): 语音通话界面
 *    - renderVideoCallModal(): 视频通话界面
 *    - renderCallSummaryModal(): 通话总结界面
 * 
 * 2. 转账模态框：
 *    - renderTransferModal(): 发送转账界面（由 modals_controller.js 处理）
 * 
 * 3. 位置模态框：
 *    - renderLocationModal(): 位置选择界面
 * 
 * 4. 相机模态框：
 *    - renderCameraModal(): 相机拍照界面（由 modals_controller.js 处理）
 * 
 * 5. 记忆和总结模态框：
 *    - renderMemoryModal(): 记忆管理界面（由 modals_controller.js 处理）
 *    - renderSummaryModal(): 总结界面（由 modals_controller.js 处理）
 * 
 * 6. 其他模态框：
 *    - 确认对话框
 *    - 提示输入框
 *    - 气泡菜单
 * 
 * 设计模式：
 * - modals_controller.js 负责决定渲染哪些模态框（根据State）
 * - views_modals.js 负责提供具体的渲染函数
 * - 这种分离使得模态框的显示逻辑和渲染逻辑解耦
 * 
 * 依赖：
 * - window.WeChat.App: 应用主对象
 * - window.sysStore: 数据存储
 * - window.WeChat.Services: 各种服务
 */

window.WeChat = window.WeChat || {};


window.WeChat.Views = Object.assign(window.WeChat.Views || {}, {
    renderCharacterPanel(sessionId) {
        const char = window.sysStore.getCharacter(sessionId) || {};
        const status = char.status || {};

        // v61: 同步 RelationshipGraph 的关系描述
        // 假设另外一方是 'user'。graph服务会自动回退到settings读取。
        const relSvc = window.WeChat.Services.RelationshipGraph;
        let relationText = '';
        if (relSvc) {
            // 尝试获取关系。如果不确定 User ID，暂用 'user' 占位，
            // 因为 _syncFromSettings 只要能识别出 char 就能工作。
            // [Fix] 统一使用 'USER_SELF' 作为用户ID，与 getAllNodes 保持一致
            const rel = relSvc.getRelationship(sessionId, 'USER_SELF');
            if (rel) {
                // 确定哪个是 NPC (sessionId)
                const isReversed = rel.nodeA !== sessionId;
                // 如果 isReversed 为真，说明 nodeB 是 NPC。
                // 我们想显示 "NPC 眼中的关系" (aViewOfB if A is NPC)
                relationText = isReversed ? rel.bViewOfA : rel.aViewOfB;

                // 如果还是空的，尝试取客观关系
                if (!relationText) relationText = '关系未定义';
            }
        }

        // 极简高级好感度组件
        const lastChange = parseFloat(status._last_affection_change || 0);
        const lastReason = status._last_affection_reason || '';

        // 1. 精致红色心形 SVG
        const heartSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#ff3b30" style="margin-right: 4px; filter: drop-shadow(0 1px 1px rgba(255,59,48,0.2));">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>`;

        // 2. 好感数值行（红色）
        const affectionValueStr = `<span style="font-size: 16px; font-weight: 700; color: #ff3b30; letter-spacing: -0.3px;">${status.affection || '0.0'}</span>`;

        // 3. 变化数值（一律灰色，带箭头）
        let changeIndicator = '<span style="font-size: 11px; color: #bbb; margin-left: 5px; font-weight: 400;">-</span>';
        if (lastChange > 0) {
            changeIndicator = `<span style="font-size: 11px; color: #bbb; margin-left: 5px; font-weight: 400;">↑${Math.abs(lastChange).toFixed(1)}</span>`;
        } else if (lastChange < 0) {
            changeIndicator = `<span style="font-size: 11px; color: #bbb; margin-left: 5px; font-weight: 400;">↓${Math.abs(lastChange).toFixed(1)}</span>`;
        }

        // 4. 变化原因（垂直布局，小字）
        const reasonHtml = lastReason ? `<div style="font-size: 10.5px; color: #aaa; font-weight: 400; margin-top: 2px; letter-spacing: 0.1px;">${lastReason}</div>` : '';

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeCharacterPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()">
                    <div class="wx-char-panel-header">
                        <div class="wx-char-panel-close" onclick="window.WeChat.App.closeCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                        <div class="wx-char-panel-actions">
                            <div class="wx-char-panel-action" style="color: #007aff;" onclick="window.WeChat.App.openRelationshipGraph('${char.id}')" title="进入该角色关系视角">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </div>
                            <div class="wx-char-panel-action" onclick="window.WeChat.App.openRelationshipPanel()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </div>
                            <div class="wx-char-panel-action" onclick="window.WeChat.App.openStatusHistoryPanel()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                        </div>
                    </div>

                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding-bottom: 24px; scrollbar-width: none; -ms-overflow-style: none;">
                        <style>.wx-char-panel-scrollable::-webkit-scrollbar { display: none; }</style>
                        <div class="wx-char-panel-main">
                            <img src="${char.avatar || 'assets/images/avatar_placeholder.png'}" class="wx-char-panel-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">
                            <div class="wx-char-panel-name" style="margin-bottom: 8px;">${char.name || '未知角色'}</div>
                            <div class="wx-char-panel-affection-premium" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 48px; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; line-height: 1;">
                                    ${heartSvg}
                                    ${affectionValueStr}
                                    ${changeIndicator}
                                </div>
                                ${reasonHtml}
                            </div>
                        </div>



                        <div class="wx-char-panel-cards">
                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title">
                                        <span>📍</span> 地点
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${(() => {
                if (status.location) return status.location;
                // 兜底：如果 status 中没有地点，尝试从今日日程中推断
                const schedule = status.daily_schedule || [];
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();

                const currentItem = schedule.find(item => {
                    const parts = item.time.split('-');
                    if (parts.length < 1) return false;

                    const parseTime = (t) => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + (m || 0);
                    };

                    const start = parseTime(parts[0]);
                    const end = parts[1] ? parseTime(parts[1]) : 1440;
                    return nowMinutes >= start && nowMinutes < end;
                });

                if (currentItem) {
                    // 尝试从活动内容中提取地点关键词
                    const act = currentItem.activity;
                    if (act.includes('公司') || act.includes('上班') || act.includes('办公室')) return '公司里';
                    if (act.includes('家') || act.includes('睡') || act.includes('起床')) return '家里';
                    if (act.includes('饭') || act.includes('餐')) return '餐厅/食堂';
                    if (act.includes('健身') || act.includes('运动')) return '健身房';
                    if (act.includes('路') || act.includes('地铁') || act.includes('车')) return '路上';
                    return act.split(/[，。！,;；]/)[0]; // 取第一句作为临时地点
                }

                // 最终兜底：根据时间
                const hour = now.getHours();
                if (hour >= 23 || hour < 7) return '家里卧室';
                return '准备移动中';
            })()}
                                </div>
                            </div>

                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title">
                                        <span>👕</span> 服装
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.outfit || '暂无描述')}
                                </div>
                            </div>

                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title behavior">
                                        <span>🏃</span> 行为
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.behavior || '暂无描述')}
                                </div>
                            </div>

                            <div class="wx-char-card">
                                <div class="wx-char-card-header">
                                    <div class="wx-char-card-title voice">
                                        <span>☁️</span> 心声
                                    </div>
                                </div>
                                <div class="wx-char-card-content">
                                    ${String(status.inner_voice || status.heartfelt_voice || '暂无消息')}
                                </div>
                            </div>

                            ${this._renderScheduleCard(sessionId)}
                            ${this._renderEventsCard(sessionId)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染日程卡片
     * 优先显示每日作息时间表 (daily_schedule)，其次显示事件系统中的日程
     */
    _renderScheduleCard(sessionId) {
        const char = window.sysStore.getCharacter(sessionId) || {};
        const dailySchedule = char.status?.daily_schedule;

        // 优先渲染 AI 生成的每日时间表
        if (Array.isArray(dailySchedule) && dailySchedule.length > 0) {
            const nowHour = new Date().getHours();
            const nowMin = new Date().getMinutes();
            const nowTotal = nowHour * 60 + nowMin; // 当前总分钟数

            const scheduleHtml = dailySchedule.map(item => {
                // 支持格式: { time: "8:00-9:00", activity: "起床洗漱" }
                // 或简单字符串格式: "8:00-9:00 起床洗漱"
                let time = '', activity = '';
                if (typeof item === 'string') {
                    // 从字符串中提取时间和活动
                    const match = item.match(/^(\d{1,2}:\d{2}\s*[-–~]\s*\d{1,2}:\d{2})\s+(.*)/);
                    if (match) {
                        time = match[1];
                        activity = match[2];
                    } else {
                        activity = item;
                    }
                } else if (typeof item === 'object') {
                    time = item.time || '';
                    activity = item.activity || item.content || '';
                }

                // 判断是否为当前时段
                let isCurrent = false;
                if (time) {
                    const timeParts = time.match(/(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/);
                    if (timeParts) {
                        const startTotal = parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
                        const endTotal = parseInt(timeParts[3]) * 60 + parseInt(timeParts[4]);
                        isCurrent = nowTotal >= startTotal && nowTotal < endTotal;
                    }
                }

                const highlightBg = isCurrent ? 'background: #f0f9ff; border-left: 3px solid #07c160; padding-left: 9px;' : 'padding-left: 12px;';
                const timeColor = isCurrent ? 'color: #07c160; font-weight: 600;' : 'color: #999;';
                const actColor = isCurrent ? 'color: #333; font-weight: 500;' : 'color: #666;';
                const currentBadge = isCurrent ? '<span style="font-size: 10px; background: #07c160; color: #fff; padding: 1px 5px; border-radius: 8px; margin-left: 6px;">现在</span>' : '';

                return `<div style="padding: 7px 0; border-bottom: 1px solid rgba(0,0,0,0.04); ${highlightBg}">
                    <span style="font-size: 12px; ${timeColor}; font-family: 'SF Mono', 'Menlo', monospace; letter-spacing: -0.3px;">${time}</span>${currentBadge}
                    <div style="font-size: 13px; ${actColor}; margin-top: 2px; line-height: 1.4;">${activity}</div>
                </div>`;
            }).join('');

            return `
                <div class="wx-char-card">
                    <div class="wx-char-card-header">
                        <div class="wx-char-card-title">
                            <span>📅</span> 今日日程
                        </div>
                    </div>
                    <div class="wx-char-card-content" style="padding: 4px 0;">
                        ${scheduleHtml}
                    </div>
                </div>
            `;
        }

        // 兜底：从事件系统读取日程
        const eventsService = window.WeChat.Services.Events;
        if (!eventsService) {
            return this._renderEmptyScheduleCard();
        }

        const futureSchedule = eventsService.getScheduleEvents(sessionId).slice(0, 3);

        if (futureSchedule.length === 0) {
            return this._renderEmptyScheduleCard();
        }

        const scheduleHtml = futureSchedule.map(e => {
            const info = e.scheduleInfo;
            const isToday = info.date === new Date().toISOString().split('T')[0];
            const dateLabel = isToday ? '今天' : info.date;
            return `<div style="padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="color: ${isToday ? '#07c160' : '#666'}; font-weight: ${isToday ? '600' : '400'};">${dateLabel} ${info.time || ''}</span>
                <span style="margin-left: 8px;">${info.activity}</span>
                ${info.location ? `<span style="color: #999; font-size: 11px;"> @ ${info.location}</span>` : ''}
            </div>`;
        }).join('');

        return `
            <div class="wx-char-card">
                <div class="wx-char-card-header">
                    <div class="wx-char-card-title">
                        <span>📅</span> 日程
                    </div>
                </div>
                <div class="wx-char-card-content" style="padding: 0;">
                    ${scheduleHtml}
                </div>
            </div>
        `;
    },

    /**
     * 渲染空日程卡片
     */
    _renderEmptyScheduleCard() {
        return `
            <div class="wx-char-card">
                <div class="wx-char-card-header">
                    <div class="wx-char-card-title">
                        <span>📅</span> 日程
                    </div>
                </div>
                <div class="wx-char-card-content" style="color: #999; font-style: italic;">
                    暂无日程安排
                </div>
            </div>
        `;
    },

    /**
     * 渲染事件历史卡片
     */
    _renderEventsCard(sessionId) {
        const eventsService = window.WeChat.Services.Events;
        if (!eventsService) return '';

        const events = eventsService.getEventsByParticipant(sessionId, { limit: 5 });

        // 构建事件列表HTML
        let eventsHtml;
        if (events.length === 0) {
            eventsHtml = `
                    <div class="wx-char-card-content" style="color: #999; font-style: italic;">
                        暂无共同事件
                </div>`;
        } else {
            eventsHtml = events.map(e => {
                const date = new Date(e.timestamp);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                const typeIcon = {
                    'milestone': '⭐',
                    'schedule': '📅',
                    'conversation': '💬',
                    'background': '🌙',
                    'group': '👥',
                    'offline': '🚶'
                }[e.type] || '📝';

                return `<div style="padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; align-items: flex-start; gap: 8px;">
                    <span style="flex-shrink: 0;">${typeIcon}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e.summary || '未知事件'}</div>
                        <div style="font-size: 11px; color: #999;">${dateStr}</div>
                    </div>
                </div>`;
            }).join('');
            eventsHtml = `<div class="wx-char-card-content" style="padding: 0;">${eventsHtml}</div>`;
        }

        return `
            <div class="wx-char-card">
                <div class="wx-char-card-header">
                    <div class="wx-char-card-title">
                        <span>📜</span> 近期事件
                    </div>
                    <div class="wx-char-card-action" onclick="window.WeChat.UI.Modals.openEventManager('${sessionId}')" style="font-size: 12px; color: #576b95; cursor: pointer;">
                        管理
                    </div>
                </div>
                ${eventsHtml}
            </div>
        `;
    },

    /**
     * 渲染事件管理模态框
     */
    renderEventManagerModal(sessionId) {
        const eventsService = window.WeChat.Services.Events;
        if (!eventsService) return '';

        // 获取所有相关事件
        const allEvents = eventsService.getEventsByParticipant(sessionId, { limit: 100 });

        // 纯粹的数据库视图：按时间倒序排列所有事件
        allEvents.sort((a, b) => b.timestamp - a.timestamp);

        const listHtml = allEvents.map(e => {
            const date = new Date(e.timestamp);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            const typeMap = {
                'milestone': '⭐ 里程碑',
                'schedule': '📅 日程',
                'conversation': '💬 对话',
                'background': '🌙 后台',
                'group': '👥 群聊',
                'offline': '🚶 线下'
            };
            const typeLabel = typeMap[e.type] || '📝 记录';
            const isCompressed = e.compressed ? '<span style="font-size: 10px; background: #eee; padding: 2px 4px; border-radius: 4px; color: #888; margin-left: 4px;">已压缩</span>' : '';

            // 如果是日程类型，显示具体的日程时间
            let extraInfo = '';
            if (e.type === 'schedule' && e.scheduleInfo) {
                const sDate = e.scheduleInfo.date;
                const sTime = e.scheduleInfo.time || '';
                const isCompleted = e.completed;
                const deleteLine = isCompleted ? 'text-decoration: line-through; color: #aaa;' : '';
                extraInfo = `<div style="margin-top: 4px; font-size: 13px; color: #07c160; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; display: inline-block; ${deleteLine}">
                    📅 计划于: ${sDate} ${sTime} (状态: ${isCompleted ? '已完成' : '待办'})
                </div>`;
            }

            return `
                <div class="event-item" style="background: #fff; padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <div style="font-size: 12px; color: #888;">${dateStr} · ${typeLabel}${isCompressed}</div>
                        <div style="display: flex; gap: 10px;">
                            <span onclick="window.WeChat.UI.Modals.editEvent('${e.id}', '${sessionId}')" style="color: #576b95; cursor: pointer; font-size: 12px;">编辑</span>
                            <span onclick="window.WeChat.UI.Modals.deleteEvent('${e.id}', '${sessionId}')" style="color: #fa5151; cursor: pointer; font-size: 12px;">删除</span>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #333; line-height: 1.5;">
                        ${e.summary}
                    </div>
                    ${extraInfo}
                </div>
            `;
        }).join('');

        return `
            <div class="wx-char-panel-overlay active" style="z-index: 20000 !important;" onclick="if(event.target===this) window.WeChat.UI.Modals.closeEventManager()">
                <div class="wx-char-panel" onclick="event.stopPropagation()">
                    <div class="wx-char-panel-header">
                        <div class="wx-char-panel-close" onclick="window.WeChat.UI.Modals.closeEventManager()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                        <div style="font-size: 16px; font-weight: 600;">事件日志数据库</div>
                        <div style="width: 24px;"></div>
                    </div>
                    
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; background: #f7f7f7; padding: 16px;">
                        
                        <!-- 顶部概览/操作 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <div style="font-size: 12px; color: #888;">数据库记录总数: ${allEvents.length}</div>
                            <div style="display: flex; gap: 12px;">
                                <div onclick="window.WeChat.UI.Modals.compressEvents('${sessionId}')" title="压缩历史记录" 
                                     style="width: 32px; height: 32px; background: #fff; border: 1px solid #e0e0e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #666;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="4 14 10 14 10 20"></polyline>
                                        <polyline points="20 10 14 10 14 4"></polyline>
                                        <line x1="14" y1="10" x2="21" y2="3"></line>
                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                    </svg>
                                </div>
                                <div onclick="window.WeChat.UI.Modals.addEvent('${sessionId}')" title="添加新事件"
                                     style="width: 32px; height: 32px; background: #07c160; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; box-shadow: 0 2px 6px rgba(7,193,96,0.3);">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- 列表 -->
                        <div style="margin-bottom: 24px;">
                            ${listHtml || '<div style="text-align: center; color: #999; padding: 40px;">暂无数据库记录</div>'}
                        </div>

                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 渲染事件编辑/新增弹窗
     */
    renderEventEditorModal(sessionId, eventId = null) {
        const eventsService = window.WeChat.Services.Events;
        let event = {
            type: 'conversation',
            summary: '',
            scheduleInfo: { date: '', time: '', activity: '' }
        };

        if (eventId) {
            event = eventsService.getEvent(eventId) || event;
        }

        const isSchedule = event.type === 'schedule' || !!event.scheduleInfo;
        const scheduleDisplay = isSchedule ? 'block' : 'none';

        // 还原为原生结构，仅保留 z-index 提升
        return `
            <div class="wx-char-panel-overlay active" style="z-index: 21000 !important;" onclick="if(event.target===this) window.WeChat.UI.Modals.closeEventEditor()">
                <div class="wx-char-panel" onclick="event.stopPropagation()">
                    <div class="wx-char-panel-header">
                        <div class="wx-char-panel-close" onclick="window.WeChat.UI.Modals.closeEventEditor()">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                        <div style="font-size: 16px; font-weight: 600;">${eventId ? '编辑事件' : '新增事件'}</div>
                        <div style="width: 24px;"></div>
                    </div>
                    
                    <div class="wx-char-panel-scrollable" style="padding: 20px;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">事件类型</label>
                            <select id="evt-editor-type" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: #fff;">
                                <option value="conversation" ${event.type === 'conversation' ? 'selected' : ''}>💬 普通对话</option>
                                <option value="milestone" ${event.type === 'milestone' ? 'selected' : ''}>⭐ 关系里程碑</option>
                                <option value="schedule" ${event.type === 'schedule' ? 'selected' : ''}>📅 日程安排</option>
                                <option value="background" ${event.type === 'background' ? 'selected' : ''}>🌙 后台活动</option>
                                <option value="offline" ${event.type === 'offline' ? 'selected' : ''}>🚶 线下事件</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 13px; color: #666; margin-bottom: 6px;">事件摘要</label>
                            <textarea id="evt-editor-summary" style="width: 100%; height: 80px; padding: 8px; border-radius: 6px; border: 1px solid #ddd;" placeholder="简述发生了什么...">${event.summary}</textarea>
                        </div>

                        <div style="margin-bottom: 16px; border-top: 1px solid #eee; padding-top: 10px;">
                            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                <input type="checkbox" id="evt-editor-has-schedule" ${isSchedule ? 'checked' : ''} onchange="document.getElementById('evt-schedule-box').style.display = this.checked ? 'block' : 'none'">
                                <label for="evt-editor-has-schedule" style="font-size: 13px; margin-left: 6px;">包含日程信息</label>
                            </div>
                            
                            <div id="evt-schedule-box" style="display: ${scheduleDisplay}; background: #f9f9f9; padding: 10px; border-radius: 6px;">
                                <div style="margin-bottom: 8px;">
                                    <input type="date" id="evt-sch-date" value="${event.scheduleInfo?.date || ''}" style="margin-right: 8px; padding: 4px;">
                                    <input type="time" id="evt-sch-time" value="${event.scheduleInfo?.time || ''}" style="padding: 4px;">
                                </div>
                                <input type="text" id="evt-sch-activity" value="${event.scheduleInfo?.activity || ''}" placeholder="日程内容 (如: 约会吃饭)" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                            <button onclick="window.WeChat.UI.Modals.closeEventEditor()" style="padding: 8px 16px; border-radius: 6px; background: #f2f2f2; border: none; color: #333;">取消</button>
                            <button onclick="window.WeChat.UI.Modals.saveEvent('${sessionId}', '${eventId || ''}')" style="padding: 8px 16px; border-radius: 6px; background: #07c160; border: none; color: #fff;">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },


    renderRelationshipPanel(sessionId) {
        const rel = State.pendingRelationship;
        if (!rel) return '';

        const affection = rel.affection;
        const difficulty = rel.difficulty;

        const diffText = {
            'hard': '困难模式，难加易减，每次好感度增加上限 0.1',
            'normal': '普通模式，平衡增减，每次好感度增加上限 0.5',
            'easy': '容易模式，易加难减，每次好感度增加上限 1.0'
        };

        const ladderHtml = rel.ladder_persona.map((lp, idx) => `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid #f0f0f0; position: relative;">
                <div style="display: flex; align-items: center; margin-bottom: 8px; gap: 8px;">
                    <span style="font-size: 11px; color: #999;">解锁阈值</span>
                    <input type="number" value="${lp.affection_threshold}"
                        style="width: 50px; height: 28px; background: #fff; border: 1px solid #eee; border-radius: 6px; text-align: center; font-size: 13px; outline: none;"
                        oninput="window.WeChat.App.updateLadderPersona(${idx}, 'affection_threshold', parseFloat(this.value), true)">
                    <div style="flex: 1;"></div>
                    <div style="cursor: pointer; padding: 4px; color: #ff3b30; opacity: 0.6;" onclick="window.WeChat.App.removeLadderPersona(${idx})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
                ${this._renderFieldHeader(`阶段 ${idx + 1} 表现`, `wx-rel-ladder-content-${idx}`)}
                <textarea id="wx-rel-ladder-content-${idx}" ${this._lockAttr(`wx-rel-ladder-content-${idx}`)} style="width: 100%; min-height: 50px; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 8px; box-sizing: border-box; font-size: 13px; outline: none; resize: none; line-height: 1.4; color: #333;"
                    placeholder="输入该好感阶段下的角色表现..."
                    oninput="window.WeChat.App.updateLadderPersona(${idx}, 'content', this.value, true)">${lp.content}</textarea>
            </div>
        `).join('');

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeRelationshipPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()" style="padding: 0;">
                    <!-- Header -->
                    <div style="position: relative; height: 50px; display: flex; align-items: center; padding: 0 16px; margin-top: 10px;">
                        <!-- Left: Back Button -->
                        <div style="z-index: 2; cursor: pointer; padding: 4px;" onclick="window.WeChat.App.openCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>

                        <!-- Center: Title -->
                        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 16px; font-weight: 700; color: #333; z-index: 1;">
                            关系管理
                        </div>

                        <!-- Right: Actions -->
                        <div style="margin-left: auto; z-index: 2; display: flex; gap: 12px; align-items: center;">
                            <!-- Clear/Trash Icon -->
                            <div onclick="window.WeChat.App.openConfirmationModal({title: '清空关系', content: '确定要清空所有关系设定吗？', onConfirm: () => window.WeChat.App.clearRelationshipSettings()})" style="cursor: pointer; color: #ff3b30; display: flex; align-items: center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </div>

                            <!-- AI Dice Icon -->
                            <div id="wx-rel-gen-btn" onclick="window.WeChat.App.generateFullRelationshipData()" style="cursor: pointer; color: #007aff; display: flex; align-items: center;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                    <circle cx="16" cy="8" r="2"></circle>
                                    <circle cx="8" cy="16" r="2"></circle>
                                    <circle cx="8" cy="8" r="2"></circle>
                                    <circle cx="16" cy="16" r="2"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding: 0 24px 24px 24px;">

            <!-- 好感度数值 -->
            <div style="margin-top: 15px;">
                <div style="font-size: 12px; color: #999; margin-bottom: 10px;">好感度数值</div>
                <div style="background: #fff; border-radius: 16px; padding: 20px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 700; font-size: 14px; color: #333;">当前该角色好感度</span>
                        <span style="font-weight: 700; font-size: 16px; color: #0052d9;">${affection}</span>
                    </div>
                    <input type="range" min="-100" max="100" step="0.1" value="${affection}"
                        style="width: 100%; -webkit-appearance: none; height: 6px; background: #e0e0e0; border-radius: 3px; outline: none;"
                        oninput="this.previousElementSibling.children[1].innerText = parseFloat(this.value).toFixed(1); window.WeChat.App.updatePendingRelationship('affection', parseFloat(this.value), null, true)">
                </div>
            </div>

            <!-- 攻略难度设定 -->
            <div style="margin-top: 20px;">
                <div style="font-size: 12px; color: #999; margin-bottom: 10px;">攻略难度设定</div>
                <div style="background: #fff; border-radius: 16px; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; display: flex; gap: 4px;">
                    <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'hard')"
                        style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'hard' ? '600' : '400'}; color: ${difficulty === 'hard' ? '#333' : '#999'}; background: ${difficulty === 'hard' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'hard' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                        困难
                    </div>
                    <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'normal')"
                        style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'normal' ? '600' : '400'}; color: ${difficulty === 'normal' ? '#0052d9' : '#999'}; background: ${difficulty === 'normal' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'normal' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                        普通
                    </div>
                    <div onclick="window.WeChat.App.updatePendingRelationship('difficulty', 'easy')"
                        style="flex: 1; text-align: center; padding: 10px 0; font-size: 13px; font-weight: ${difficulty === 'easy' ? '600' : '400'}; color: ${difficulty === 'easy' ? '#00a870' : '#999'}; background: ${difficulty === 'easy' ? '#fff' : 'transparent'}; border-radius: 12px; box-shadow: ${difficulty === 'easy' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'}; cursor: pointer;">
                        容易
                    </div>
                </div>
                <div style="text-align: center; font-size: 11px; color: #bbb; margin-top: 8px;">
                    ${diffText[difficulty]}
                </div>
            </div>

            <!-- 关系透镜 -->
            <div style="margin-top: 20px;">
                <div style="font-size: 13px; color: #999; margin-bottom: 12px; font-weight: 500; padding-left: 4px;">关系透镜 (决定AI如何思考)</div>
                <div style="background: #fff; border-radius: 18px; padding: 24px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid #f2f2f2;">

                    <!-- Character Lens (Flat) -->
                    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed #eee;">
                        <div style="font-size: 15px; font-weight: 700; color: #333; margin-bottom: 16px; border-left: 4px solid #0052d9; padding-left: 8px;">角色对用户</div>

                        <!-- 1. Objective Relation -->
                        <div style="margin-bottom: 12px;">
                            ${this._renderFieldHeader('客观关系定义', 'wx-rel-char-obj')}
                            <input type="text" id="wx-rel-char-obj" value="${rel.char_to_user_public_relation || ''}" placeholder="如：好友、死党、宿敌..." ${this._lockAttr('wx-rel-char-obj')}
                                style="width: 100%; height: 38px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0 10px; font-size: 14px; outline: none; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_public_relation', this.value, null, true)">
                        </div>

                        <!-- 2. Public Attitude -->
                        <div style="margin-bottom: 12px;">
                            ${this._renderFieldHeader('对外表现态度', 'wx-rel-char-pub-att')}
                            <textarea id="wx-rel-char-pub-att" placeholder="平时表现出来的样子..." ${this._lockAttr('wx-rel-char-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_public_attitude', this.value, null, true)">${rel.char_to_user_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            ${this._renderFieldHeader(`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-char-knows" ${rel.user_knows_char_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('user_knows_char_private', this.checked, null, true)">用户已识破</label></div>`, 'wx-rel-char-pvt-att')}
                            <textarea id="wx-rel-char-pvt-att" placeholder="其实心里是这么想的..." ${this._lockAttr('wx-rel-char-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_private_attitude', this.value, null, true)">${rel.char_to_user_private_attitude || ''}</textarea>
                        </div>
                    </div>

                    <!-- User Lens (Flat) -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 15px; font-weight: 700; color: #333; margin-bottom: 16px; border-left: 4px solid #7b1fa2; padding-left: 8px;">用户对角色</div>

                        <!-- 1. Objective Relation -->
                        <div style="margin-bottom: 12px;">
                            ${this._renderFieldHeader('客观关系定义', 'wx-rel-user-obj')}
                            <input type="text" id="wx-rel-user-obj" value="${rel.user_to_char_public_relation || ''}" placeholder="如：工具人..." ${this._lockAttr('wx-rel-user-obj')}
                                style="width: 100%; height: 38px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0 10px; font-size: 14px; outline: none; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_public_relation', this.value, null, true)">
                        </div>

                        <!-- 2. Public Attitude -->
                        <div style="margin-bottom: 12px;">
                            ${this._renderFieldHeader('对外表现态度', 'wx-rel-user-pub-att')}
                            <textarea id="wx-rel-user-pub-att" placeholder="平时表现出来的样子..." ${this._lockAttr('wx-rel-user-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_public_attitude', this.value, null, true)">${rel.user_to_char_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            ${this._renderFieldHeader(`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-user-knows" ${rel.char_knows_user_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('char_knows_user_private', this.checked, null, true)">角色已识破</label></div>`, 'wx-rel-user-pvt-att')}
                            <textarea id="wx-rel-user-pvt-att" placeholder="其实心里是这么想的..." ${this._lockAttr('wx-rel-user-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_private_attitude', this.value, null, true)">${rel.user_to_char_private_attitude || ''}</textarea>
                        </div>
                    </div>

                    <!-- Background Story -->
                    <div style="margin-bottom: 12px;">
                        ${this._renderFieldHeader('📅 背景故事', 'wx-rel-backstory')}
                        <textarea id="wx-rel-backstory" placeholder="两人的历史、关系变化..." ${this._lockAttr('wx-rel-backstory')}
                            style="width: 100%; height: 100px; background: #f9f7f5; border: 1px solid #eee; border-radius: 12px; padding: 12px; box-sizing: border-box; font-size: 14px; resize: none; outline: none; line-height: 1.5; color: #333;"
                            oninput="window.WeChat.App.updatePendingRelationship('backstory', this.value, null, true)">${rel.backstory || ''}</textarea>
                    </div>

                </div>
            </div>

            <!-- 阶梯人设 -->
            <div style="margin-top: 24px;">
                ${this._renderFieldHeader('关系进阶 (随好感度变化)', 'wx-rel-ladder')}
                <div id="wx-ladder-list">
                    ${ladderHtml}
                </div>
                <div onclick="window.WeChat.App.addLadderPersona()" style="border: 1.5px dashed #007aff55; border-radius: 14px; padding: 12px; display: flex; align-items: center; justify-content: center; color: #007aff; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 10px;">
                    <span style="font-size: 18px; margin-right: 4px; line-height: 18px;">+</span> 添加人设阶段
                </div>
            </div>

        </div>

        <!-- Footer Buttons -->
        <div style="display: flex; gap: 12px; padding: 16px 24px 24px 24px; background: #fff; border-bottom-left-radius: 32px; border-bottom-right-radius: 32px;">
            <div onclick="window.WeChat.App.closeRelationshipPanel()" style="flex: 1; height: 46px; background: #f2f2f2; color: #666; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; cursor: pointer;">
                取消
            </div>
            <div onclick="window.WeChat.App.saveRelationshipChanges()" style="flex: 1.4; height: 46px; background: #fff0f3; color: #ff6b81; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; cursor: pointer;">
                保存更改
            </div>
        </div>
    </div>
            </div >
    `;
    },
    renderStatusHistoryPanel(sessionId) {
        const char = window.sysStore.getCharacter(sessionId) || {};
        const history = char.status_history || [];

        let listHtml = history.map(record => {
            const timeStr = new Date(record.timestamp).toLocaleString('zh-CN', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `
                <div style="background: #fff; border-radius: 20px; padding: 16px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="font-size: 13px; color: #999; font-weight: 500;">${timeStr}</div>
                        <div style="cursor: pointer; padding: 4px; color: #ccc;" onclick="window.WeChat.App.deleteStatusHistoryRecord('${sessionId}', ${record.timestamp})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <div style="font-size: 12px; color: gold; line-height: 1.5; width: 100%;">❤️ 好感度: ${record.status?.affection || '0.0'}</div>
                        <div style="font-size: 12px; color: var(--wx-text); line-height: 1.5; width: 100%;">
                            📍 地点: ${record.status?.location || '同步中...'}
                        </div>
                        <div style="font-size: 12px; color: var(--wx-text); line-height: 1.5; width: 100%;">
                            👕 服装: ${record.status?.outfit || '暂无描述'}
                        </div>
                        <div style="font-size: 12px; color: var(--wx-text-sec); line-height: 1.5; width: 100%;">
                            🏃 行为: ${record.status?.behavior || '暂无描述'}
                        </div>
                        <div style="font-size: 11px; color: #999; line-height: 1.4; background: var(--wx-bg-alt); padding: 8px 12px; border-radius: 12px; width: 100%; margin-top: 4px; font-style: italic;">
                            心声: ${record.status?.inner_voice || '无'}
                        </div>
                    </div>
                </div>
    `;
        }).join('');

        if (history.length === 0) {
            listHtml = `
                <div style="text-align: center; padding: 60px 20px; color: #ccc;">
                    <div style="font-size: 40px; margin-bottom: 16px; opacity: 0.5;">🕒</div>
                    <div style="font-size: 14px;">暂无历史状态记录</div>
                </div>
    `;
        }

        return `
            <div class="wx-char-panel-overlay active" onclick="if(event.target===this) window.WeChat.App.closeStatusHistoryPanel()">
                <div class="wx-char-panel" onclick="event.stopPropagation()" style="padding: 0;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 10px 24px;">
                        <div style="cursor: pointer; padding: 4px; margin-left: -4px;" onclick="window.WeChat.App.openCharacterPanel()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </div>
                        <div style="font-size: 18px; font-weight: 700; color: #333;">状态历史</div>
                        <div style="width: 24px;"></div>
                    </div>

                    <!-- Scrollable Content -->
                    <div class="wx-char-panel-scrollable" style="flex: 1; overflow-y: auto; padding: 0 24px 24px 24px;">
                        <div style="margin-top: 20px;">
                            ${listHtml}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 20px 24px 24px 24px; background: #fff; border-bottom-left-radius: 32px; border-bottom-right-radius: 32px;">
                        <div onclick="window.WeChat.App.closeStatusHistoryPanel()" style="width: 100%; height: 50px; background: #f5f6f8; color: #666; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; cursor: pointer;">
                            关闭
                        </div>
                    </div>
                </div>
            </div>
    `;
    },
    renderWorldBookSelection(sessionId) {
        const char = window.sysStore.getCharacter(sessionId);
        const selectedIds = char?.settings?.world_book_ids || [];

        // Fetch all world book entries
        const entries = window.sysStore.get('chara_db_worldbook', []);
        const customGroups = window.sysStore.get('chara_db_worldbook_groups', []);

        // Group entries (Strict Sync with WorldBookApp)
        const groups = {};

        // 1. Initialize custom groups
        customGroups.forEach(g => {
            groups[g.id] = { name: g.name, entries: [], isCustom: true };
        });

        // 2. Ensure 'uncategorized' exists
        if (!groups['uncategorized']) {
            groups['uncategorized'] = { name: '未分类', entries: [], isCustom: true };
        }

        entries.forEach(e => {
            let gid = e.groupId;

            // Force strict group matching: If not a valid custom group, goto uncategorized
            if (!groups[gid] || gid === 'global' || gid === 'uncategorized') {
                gid = 'uncategorized';
            }

            // Fallback Init (Safe)
            if (!groups[gid]) {
                groups[gid] = { name: '未分类', entries: [], isCustom: true };
            }
            groups[gid].entries.push(e);
        });

        // Generate HTML
        const sortedCids = Object.keys(groups)
            .filter(gid => groups[gid].entries.length > 0) // Hide empty groups in Selector for cleaner view
            .sort((a, b) => {
                if (a === 'uncategorized') return 1;
                if (b === 'uncategorized') return -1;
                return groups[a].name.localeCompare(groups[b].name);
            });

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#000' : '#EDEDED';

        let sectionsHtml = sortedCids.map(cid => {
            const group = groups[cid];
            const itemsHtml = group.entries.map(e => {
                const checked = selectedIds.includes(e.id);
                return `
    < div class= "wx-wb-select-item" onclick = "window.WeChat.App.toggleWorldBookSelection('${e.id}')" >
                         <div style="flex:1;">
                            <div style="font-size:16px; color:var(--wx-text); font-weight:500;">${e.name}</div>
                            <div style="font-size:13px; color:var(--wx-text-sec); margin-top:2px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${e.content || '无内容'}</div>
                         </div>
                         <div class="wx-wb-checkbox ${checked ? 'checked' : ''}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                         </div>
                    </div >
    `;
            }).join('');

            return `
    < div class= "wx-wb-select-section" >
                    <div class="wx-wb-select-header">
                        ${group.name} (${group.entries.length})
                    </div>
                    <div class="wx-wb-select-body">
                        ${itemsHtml}
                    </div>
                </div >
    `;
        }).join('');

        return `
    < div class= "wx-scroller" id = "wx-view-worldbook-select" style = "background-color: ${pageBg}; padding-top: calc(var(--wx-nav-height) - 20px);" >
                < !-- < div class= "wx-nav-spacer" ></div > -->
${sectionsHtml || '<div style="padding:100px 20px; text-align:center; color:#999;">暂无世界书条目</div>'}
    <div style="height: 60px;"></div>
            </div >
    `;
    },
    renderVoiceCallModal_OLD(state) {
        if (!state.open) return '';

        const avatar = state.avatar || 'assets/images/avatar_placeholder.png';
        const name = state.name || '未知用户';
        const statusText = state.status === 'connected' ? (state.durationStr || '00:00') : (state.status === 'ended' ? '通话结束' : '正在等待对方接受邀请...');
        const isConnected = state.status === 'connected';

        const pulseClass = (state.status === 'dialing' || state.status === 'waiting') ? 'pulsing' : '';
        const blurStyle = (state.avatar) ? `background - image: url('${state.avatar}'); ` : 'background-color: #333;';

        // --- Subtitles ---
        let subtitlesHtml = '';
        if (isConnected && window.sysStore) {
            const msgs = window.sysStore.getMessagesBySession(state.sessionId);
            const recentMsgs = msgs; // All Messages
            const items = recentMsgs.map(m => {
                const isMe = (m.sender_id === 'user' || m.sender_id === 'me' || m.sender_id === 'my');
                if (m.type === 'system' || m.type === 'transfer_status') return '';
                let content = m.content;
                if (m.type === 'image') content = '[图片]';
                if (m.type === 'voice') content = '[语音]';
                return `< div class="wx-call-subtitle-item ${isMe ? 'me' : ''}" > ${content}</div > `;
            }).join('');

            if (items) {
                // [USER REQUEST] 新消息到达时，必须滚动到底部
                const scrollScript = `< img src = "" onerror = "(function() {
const el = document.getElementById('wx-call-subs');
if (!el) return;
// 新消息到达时，总是滚动到底部
setTimeout(() => {
    el.scrollTop = el.scrollHeight;
}, 10);
                }) (); this.remove(); " style="display: none; ">`;
                subtitlesHtml = `<div class="wx-call-subtitles" id="wx-call-subs">${items}${scrollScript}</div>`;
            }
        }

        // Buttons logic
        let buttonsHtml = '';

        if (state.status === 'dialing' || state.status === 'waiting') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">取消</span>
                </div>
            `;
        } else if (state.status === 'connected') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallReply()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">回复</span>
                </div>

                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">挂断</span>
                </div>
                
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallInput()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="14" y2="16"></line><line x1="18" y1="16" x2="18" y2="16"></line></svg>
                    </div>
                    <span class="wx-call-btn-label">输入</span>
                </div>
            `;
        }

        return `
            < style >
                .wx - call - modal { position: fixed!important; top: 0; left: 0; width: 100 %; height: 100 %; z - index: 10000; background: #222; display: flex; flex - direction: column; overflow: hidden; font - family: -apple - system, BlinkMacSystemFont, "Segoe UI", Roboto, sans - serif; }
                .wx - call - bg - blur { position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; background - size: cover; background - position: center; filter: blur(30px) brightness(0.6); z - index: -1; }
                .wx - call - content { position: relative; z - index: 1; height: 100 %; display: flex; flex - direction: column; }
                .wx - call - header { height: 60px; display: flex; align - items: center; padding: 0 16px; }
                .wx - call - minimize { width: 32px; height: 32px; display: flex; align - items: center; justify - content: center; background: rgba(255, 255, 255, 0.2); border - radius: 50 %; cursor: pointer; }
                .wx - call - info { flex: 1; display: flex; flex - direction: column; align - items: center; justify - content: center; transition: all 0.3s ease; }
                .wx - call - avatar { width: 100px; height: 100px; border - radius: 12px; object - fit: cover; box - shadow: 0 8px 24px rgba(0, 0, 0, 0.3); margin - bottom: 20px; }
                .wx - call - avatar.pulse { animation: wx - ripple 2s infinite; }
                .wx - call - name { font - size: 24px; font - weight: 500; margin - bottom: 12px; color: white; text - shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
                .wx - call - status { font - size: 16px; color: rgba(255, 255, 255, 0.7); font - weight: 400; }
                .wx - call - actions { width: 100 %; display: flex; justify - content: space - around; align - items: flex - end; padding: 0 40px 40px 40px; box - sizing: border - box; }
                .wx - call - btn - group { display: flex; flex - direction: column; align - items: center; gap: 12px; }
                .wx - call - btn { width: 64px; height: 64px; border - radius: 50 %; background: rgba(255, 255, 255, 0.15); backdrop - filter: blur(10px); display: flex; align - items: center; justify - content: center; cursor: pointer; color: white; }
                .wx - call - btn:active { transform: scale(0.92); background: rgba(255, 255, 255, 0.25); }
                .wx - call - btn.hangup { background: #fa5151; width: 72px; height: 72px; box - shadow: 0 4px 12px rgba(250, 81, 81, 0.3); }
                .wx - call - btn.answer { background: #07c160; width: 72px; height: 72px; box - shadow: 0 4px 12px rgba(7, 193, 96, 0.3); }
                .wx - call - btn - label { font - size: 13px; color: rgba(255, 255, 255, 0.7); text - shadow: 0 1px 2px rgba(0, 0, 0, 0.5); }
@keyframes wx - ripple { 0 % { box- shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); } 70 % { box- shadow: 0 0 0 20px rgba(255, 255, 255, 0); } 100 % { box- shadow: 0 0 0 0 rgba(255, 255, 255, 0); } }
                .wx - call - subtitles { flex: 1; width: 100 %; overflow - y: auto; padding: 20px 30px; box - sizing: border - box; display: flex; flex - direction: column; justify - content: flex - end; margin - bottom: 20px; mask - image: linear - gradient(to bottom, transparent, black 20 %); -webkit - mask - image: linear - gradient(to bottom, transparent, black 20 %); }
                .wx - call - subtitle - item { background: rgba(0, 0, 0, 0.4); backdrop - filter: blur(5px); padding: 8px 12px; border - radius: 12px; border - bottom - left - radius: 2px; margin - bottom: 12px; color: rgba(255, 255, 255, 0.95); font - size: 15px; line - height: 1.5; align - self: flex - start; max - width: 85 %; animation: wx - fade -in -up 0.3s ease - out; }
                .wx - call - subtitle - item.me { align - self: flex - end; background: rgba(7, 193, 96, 0.65); border - bottom - left - radius: 12px; border - bottom - right - radius: 2px; }
@keyframes wx - fade -in -up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style >
    <div class="wx-call-modal">
        <div class="wx-call-bg-blur" style="${blurStyle}"></div>

        <div class="wx-call-content">
            <div class="wx-call-header">
                <div class="wx-call-minimize" onclick="window.WeChat.App.minimizeVoiceCall()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </div>
            </div>

            <div class="wx-call-info" style="${subtitlesHtml ? 'margin-top: 20px; flex: 0 0 auto;' : 'flex: 1; justify-content: center; margin-top: -60px;'}">
                <img src="${avatar}" class="wx-call-avatar ${pulseClass}" onerror="this.src='assets/images/avatar_placeholder.png'">
                    <div class="wx-call-name">${name}</div>
                    <div class="wx-call-status" id="wx-call-status-text">${statusText}</div>
            </div>

            ${subtitlesHtml}

            <div class="wx-call-actions">
                ${buttonsHtml}
            </div>
        </div>
    </div>
`;
    },
    renderVoiceCallModal(state) {
        if (!state.open) return '';

        const avatar = state.avatar || 'assets/images/avatar_placeholder.png';
        const name = state.name || 'Unknown';
        const statusText = state.status === 'dialing' ? '正在等待对方接受邀请...' :
            state.status === 'connected' ? (state.durationStr || '00:00') :
                state.status === 'ended' ? '通话结束' : '...';

        const pulseClass = (state.status === 'dialing') ? 'pulsing' : '';
        const blurStyle = `background-image: url('${avatar}');`;

        // Subtitles Logic
        let subtitlesHtml = '';
        const msgs = window.sysStore ? window.sysStore.getMessagesBySession(state.sessionId) : [];
        let items = '';
        const effectiveStartTime = (state.dialStartTime || state.startTime || 0) - 2000;

        msgs.forEach(msg => {
            const isMe = msg.sender_id === 'me' || msg.sender_id === 'user' || msg.sender_id === 'my';
            const text = msg.content;

            // Only show messages from THIS call session
            if (msg.timestamp >= effectiveStartTime) {
                // 过滤系统消息和禁词风险提示（这些不应该在通话界面显示）
                if (msg.type === 'system' || msg.hidden === true) {
                    return; // 跳过系统消息
                }
                // 过滤禁词风险相关的提示消息（扩展匹配模式）
                // [USER REQUEST] 过滤"使用...替代"和"-->"等内部处理文本
                if (typeof text === 'string') {
                    // 优先检查"使用...替代"模式（使用正则表达式）
                    if (/使用.*替代/.test(text)) {
                        return; // 跳过包含"使用...替代"的消息
                    }
                    // 检查箭头符号
                    if (text.includes('-->') || text.includes('&gt;&gt;') || text.includes('>>')) {
                        return; // 跳过包含箭头符号的消息
                    }
                    // 检查其他禁词风险提示
                    const forbiddenPatterns = [
                        '禁词风险',
                        '检测到可能使用',
                        '将调整为',
                        '绝不会使用',
                        '石子/涟漪/投入',
                        '绝对禁词',
                        '相关句式',
                        '替代方案'
                    ];
                    if (forbiddenPatterns.some(pattern => text.includes(pattern))) {
                        return; // 跳过禁词风险提示
                    }
                }
                // [USER REQUEST] 通话中只显示纯文本消息，过滤表情包和拍一拍
                // 先过滤掉表情包和拍一拍（这些不应该在通话界面显示）
                if (msg.type === 'sticker' || msg.type === 'nudge') {
                    return; // 跳过表情包和拍一拍
                }
                // 只显示纯文本消息
                if (msg.type === 'text' || msg.type === 'voice_text') {
                    items += `<div class="wx-call-subtitle-item ${isMe ? 'me' : ''}">${text}</div>`;
                }
            }
        });

        if (items || state.status === 'connected') {
            // [USER REQUEST] 新消息到达时，必须滚动到底部
            const scrollScript = `<img src="x" onerror="(function() {
                const el = document.getElementById('wx-call-subs');
                if (!el) return;
                // 新消息到达时，总是滚动到底部
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                }, 50);
            })(); this.remove();" style="display:none;">`;
            subtitlesHtml = `<div class="wx-call-subtitles" id="wx-call-subs">${items}${scrollScript}</div>`;
        }

        // Buttons logic
        let buttonsHtml = '';

        if (state.status === 'dialing' || state.status === 'waiting') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">取消</span>
                </div>
            `;
        } else if (state.status === 'connected') {
            const isThinking = window.WeChat.App.State.isTyping;
            const replyIcon = isThinking ?
                `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" class="wx-spin" style="animation: wx-spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-opacity="0.2"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path>
                </svg>` :
                `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

            buttonsHtml = `
                <div class="wx-call-btn-group" id="wx-vcall-reply-btn-group" style="${isThinking ? 'pointer-events: none; opacity: 0.8;' : ''}">
                    <div class="wx-call-btn" id="wx-vcall-reply-btn" onclick="window.WeChat.App.triggerVoiceCallReply()">
                        ${replyIcon}
                    </div>
                    <span class="wx-call-btn-label">${isThinking ? '回复中' : '回复'}</span>
                </div>

                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVoiceCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">挂断</span>
                </div>
                
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVoiceCallInput()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="14" y2="16"></line><line x1="18" y1="16" x2="18" y2="16"></line></svg>
                    </div>
                    <span class="wx-call-btn-label">输入</span>
                </div>
            `;
        }

        return `
            <style>
                .wx-call-modal { position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background: #222; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                .wx-call-bg-blur { position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; background-size: cover; background-position: center; filter: blur(30px) brightness(0.6); z-index: -1; }
                .wx-call-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
                .wx-call-header { height: 60px; display: flex; align-items: center; padding: 0 16px; }
                .wx-call-minimize { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; cursor: pointer; }
                .wx-call-info { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.3s ease; }
                .wx-call-avatar { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.3); margin-bottom: 20px; }
                .wx-call-avatar.pulsing { animation: wx-ripple 2s infinite; }
                .wx-call-name { font-size: 24px; font-weight: 500; margin-bottom: 12px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                .wx-call-status { font-size: 16px; color: rgba(255,255,255,0.7); font-weight: 400; }
                .wx-call-actions { width: 100%; display: flex; justify-content: space-around; align-items: flex-end; padding: 0 40px 40px 40px; box-sizing: border-box; }
                .wx-call-btn-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .wx-call-btn { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
                .wx-call-btn:active { transform: scale(0.92); background: rgba(255,255,255,0.25); }
                .wx-call-btn.hangup { background: #fa5151; width: 72px; height: 72px; box-shadow: 0 4px 12px rgba(250,81,81,0.3); }
                .wx-call-btn.answer { background: #07c160; width: 72px; height: 72px; box-shadow: 0 4px 12px rgba(7,193,96,0.3); }
                .wx-call-btn-label { font-size: 13px; color: rgba(255,255,255,0.7); text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                @keyframes wx-ripple { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); } 70% { box-shadow: 0 0 0 20px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
                .wx-call-subtitles { flex: 1; width: 100%; overflow-y: auto; padding: 20px 30px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; margin-bottom: 20px; -webkit-overflow-scrolling: touch; }
                .wx-call-subtitle-item { background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); padding: 8px 12px; border-radius: 12px; border-bottom-left-radius: 2px; margin-bottom: 12px; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.5; align-self: flex-start; max-width: 85%; animation: wx-fade-in-up 0.3s ease-out; }
                .wx-call-subtitle-item.me { align-self: flex-end; background: rgba(7,193,96,0.65); border-bottom-left-radius: 12px; border-bottom-right-radius: 2px; }
                @keyframes wx-fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div class="wx-call-modal">
                <div class="wx-call-bg-blur" style="${blurStyle}"></div>
                
                <div class="wx-call-content">
                    <div class="wx-call-header">
                        <div class="wx-call-minimize" onclick="window.WeChat.App.minimizeVoiceCall()">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                    </div>
                    
                    <div class="wx-call-info" style="${subtitlesHtml ? 'margin-top: 20px; flex: 0 0 auto;' : 'flex: 1; justify-content: center; margin-top: -60px;'}">
                         ${state.status === 'connected' ? `
                             <!-- 真实音频流（隐藏） -->
                             <audio id="wx-voice-call-audio" autoplay playsinline style="display: none;"></audio>
                         ` : ''}
                         <img src="${avatar}" class="wx-call-avatar ${pulseClass}" onclick="window.WeChat.App.openCharacterPanel('${state.sessionId}')" style="cursor: pointer; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                         <div class="wx-call-name">${name}</div>
                         <div class="wx-call-status" id="wx-call-status-text">${statusText}</div>
                    </div>
                    
                    ${subtitlesHtml}

                    <div class="wx-call-actions">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    },
    renderVideoCallModal(state) {
        if (!state.open) return '';

        const avatar = state.avatar || 'assets/images/avatar_placeholder.png';
        const name = state.name || 'Unknown';
        const statusText = state.status === 'dialing' ? '正在等待对方接受邀请...' :
            state.status === 'connected' ? (state.durationStr || '00:00') :
                state.status === 'ended' ? '通话结束' : '...';

        const pulseClass = (state.status === 'dialing') ? 'pulsing' : '';
        const blurStyle = `background-image: url('${avatar}');`;

        // Subtitles Logic
        let subtitlesHtml = '';
        const msgs = window.sysStore ? window.sysStore.getMessagesBySession(state.sessionId) : [];
        let items = '';
        const effectiveStartTime = (state.dialStartTime || state.startTime || 0) - 2000;

        msgs.forEach(msg => {
            const isMe = msg.sender_id === 'me' || msg.sender_id === 'user' || msg.sender_id === 'my';
            const text = msg.content;

            // Only show messages from THIS call session
            if (msg.timestamp >= effectiveStartTime) {
                // 过滤系统消息和禁词风险提示（这些不应该在通话界面显示）
                if (msg.type === 'system' || msg.hidden === true) {
                    return; // 跳过系统消息
                }
                // 过滤禁词风险相关的提示消息（扩展匹配模式）
                // [USER REQUEST] 过滤"使用...替代"和"-->"等内部处理文本
                if (typeof text === 'string') {
                    // 优先检查"使用...替代"模式（使用正则表达式）
                    if (/使用.*替代/.test(text)) {
                        return; // 跳过包含"使用...替代"的消息
                    }
                    // 检查箭头符号
                    if (text.includes('-->') || text.includes('&gt;&gt;') || text.includes('>>')) {
                        return; // 跳过包含箭头符号的消息
                    }
                    // 检查其他禁词风险提示
                    const forbiddenPatterns = [
                        '禁词风险',
                        '检测到可能使用',
                        '将调整为',
                        '绝不会使用',
                        '石子/涟漪/投入',
                        '绝对禁词',
                        '相关句式',
                        '替代方案'
                    ];
                    if (forbiddenPatterns.some(pattern => text.includes(pattern))) {
                        return; // 跳过禁词风险提示
                    }
                }
                // [USER REQUEST] 通话中只显示纯文本消息，过滤表情包和拍一拍
                // 先过滤掉表情包和拍一拍（这些不应该在通话界面显示）
                if (msg.type === 'sticker' || msg.type === 'nudge') {
                    return; // 跳过表情包和拍一拍
                }
                // 只显示纯文本消息
                if (msg.type === 'text' || msg.type === 'voice_text') {
                    items += `<div class="wx-call-subtitle-item ${isMe ? 'me' : ''}">${text}</div>`;
                }
            }
        });

        if (items || state.status === 'connected') {
            // [USER REQUEST] 新消息到达时，必须滚动到底部
            const scrollScript = `<img src="x" onerror="(function() {
                const el = document.getElementById('wx-vcall-subs');
                if (!el) return;
                // 新消息到达时，总是滚动到底部
                setTimeout(() => {
                    el.scrollTop = el.scrollHeight;
                }, 50);
            })(); this.remove();" style="display:none;">`;
            subtitlesHtml = `<div class="wx-call-subtitles" id="wx-vcall-subs">${items}${scrollScript}</div>`;
        }

        // Buttons logic
        let buttonsHtml = '';

        if (state.status === 'dialing' || state.status === 'waiting') {
            buttonsHtml = `
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVideoCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">取消</span>
                </div>
            `;
        } else if (state.status === 'connected') {
            const isThinking = window.WeChat.App.State.isTyping;
            const replyIcon = isThinking ?
                `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" class="wx-spin" style="animation: wx-spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-opacity="0.2"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path>
                </svg>` :
                `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

            buttonsHtml = `
                <div class="wx-call-btn-group" id="wx-vcall-reply-btn-group" style="${isThinking ? 'pointer-events: none; opacity: 0.8;' : ''}">
                    <div class="wx-call-btn" id="wx-vcall-reply-btn" onclick="window.WeChat.App.triggerVideoCallReply()">
                        ${replyIcon}
                    </div>
                    <span class="wx-call-btn-label">${isThinking ? '回复中' : '回复'}</span>
                </div>

                <div class="wx-call-btn-group">
                    <div class="wx-call-btn hangup" onclick="window.WeChat.App.endVideoCall()">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </div>
                    <span class="wx-call-btn-label">挂断</span>
                </div>
                
                <div class="wx-call-btn-group">
                    <div class="wx-call-btn" onclick="window.WeChat.App.triggerVideoCallInput()">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6" y2="8"></line><line x1="10" y1="8" x2="10" y2="8"></line><line x1="14" y1="8" x2="14" y2="8"></line><line x1="18" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="6" y2="12"></line><line x1="10" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="14" y2="12"></line><line x1="18" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="6" y2="16"></line><line x1="10" y1="16" x2="14" y2="16"></line><line x1="18" y1="16" x2="18" y2="16"></line></svg>
                    </div>
                    <span class="wx-call-btn-label">输入</span>
                </div>
            `;
        }

        return `
            <style>
                .wx-vcall-modal { position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background: #222; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                .wx-vcall-bg-blur { position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px; background-size: cover; background-position: center; filter: blur(30px) brightness(0.6); z-index: -1; }
                .wx-vcall-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
                .wx-vcall-header { height: 60px; display: flex; align-items: center; padding: 0 16px; }
                .wx-vcall-minimize { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; cursor: pointer; }
                .wx-vcall-info { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.3s ease; }
                .wx-vcall-avatar { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.3); margin-bottom: 20px; }
                .wx-vcall-avatar.pulsing { animation: wx-ripple 2s infinite; }
                .wx-vcall-name { font-size: 24px; font-weight: 500; margin-bottom: 12px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                .wx-vcall-status { font-size: 16px; color: rgba(255,255,255,0.7); font-weight: 400; }
                .wx-vcall-actions { width: 100%; display: flex; justify-content: space-around; align-items: flex-end; padding: 0 40px 40px 40px; box-sizing: border-box; }
                .wx-call-subtitles { flex: 1; width: 100%; overflow-y: auto; padding: 20px 30px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; margin-bottom: 20px; -webkit-overflow-scrolling: touch; }
                .wx-call-subtitle-item { background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); padding: 8px 12px; border-radius: 12px; border-bottom-left-radius: 2px; margin-bottom: 12px; color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.5; align-self: flex-start; max-width: 85%; animation: wx-fade-in-up 0.3s ease-out; }
                .wx-call-subtitle-item.me { align-self: flex-end; background: rgba(7,193,96,0.65); border-bottom-left-radius: 12px; border-bottom-right-radius: 2px; }
                @keyframes wx-fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div class="wx-vcall-modal">
                <div class="wx-vcall-bg-blur" style="${blurStyle}"></div>
                
                <div class="wx-vcall-content">
                    <div class="wx-vcall-header">
                        <div class="wx-vcall-minimize" onclick="window.WeChat.App.minimizeVideoCall()">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                    </div>
                    
                    <div class="wx-vcall-info" style="${subtitlesHtml ? 'margin-top: 20px; flex: 0 0 auto;' : 'flex: 1; justify-content: center; margin-top: -60px;'}">
                         ${state.status === 'connected' ? `
                             <!-- 本地视频流（小窗口） -->
                             <video id="wx-video-call-local" autoplay playsinline muted style="position: absolute; top: 20px; right: 20px; width: 120px; height: 160px; border-radius: 8px; object-fit: cover; background: #000; z-index: 10; border: 2px solid rgba(255,255,255,0.3);"></video>
                             <!-- 远程视频流（主窗口，显示角色头像作为占位） -->
                             <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                 <img src="${avatar}" class="wx-vcall-avatar" onclick="window.WeChat.App.openCharacterPanel('${state.sessionId}')" style="cursor: pointer; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                             </div>
                         ` : `
                             <img src="${avatar}" class="wx-vcall-avatar ${pulseClass}" onclick="window.WeChat.App.openCharacterPanel('${state.sessionId}')" style="cursor: pointer; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                         `}
                         <div class="wx-vcall-name">${name}</div>
                         <div class="wx-vcall-status" id="wx-vcall-status-text">${statusText}</div>
                    </div>
                    
                    ${subtitlesHtml}

                    <div class="wx-vcall-actions">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    },
    renderCallSummaryModal(state) {
        if (!state.open) return '';

        const duration = state.duration || '00:00';
        const transcript = Array.isArray(state.transcript) ? state.transcript : [];

        const transcriptHtml = transcript.length
            ? transcript.map(item => {
                const isMe = !!item.isMe;
                const text = String(item.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<div class="wx-call-subtitle-item ${isMe ? 'me' : ''}">
                    <div style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; font-weight: 500;">${item.senderName}</div>
                    ${text}
                </div>`;
            }).join('')
            : `<div style="padding: 12px; color: #999; font-size: 13px; text-align: center;">本次通话没有记录</div>`;

        return `
            <div class="wx-modal-overlay active" style="z-index: 20006;" onclick="if(event.target===this) window.WeChat.App.closeCallSummaryModal()">
                <div class="wx-modal-container show" style="width: 330px; padding: 0; background: white; border-radius: 12px; overflow: hidden;" onclick="event.stopPropagation()">
                    <div style="padding: 14px 14px 10px 14px; border-bottom: 1px solid rgba(0,0,0,0.06);">
                        <div style="display:flex; flex-direction:column;">
                            <div style="font-size: 16px; font-weight: 600; color:#111;">通话记录</div>
                            <div style="font-size: 12px; color: #888; margin-top: 2px;">时长: ${duration}</div>
                        </div>
                    </div>

                    <div style="padding: 12px 14px 10px 14px;">
                        <div style="font-size: 13px; color:#666; margin-bottom: 8px;">通话期间记录</div>
                        <div class="wx-call-subtitles" style="max-height: 400px; display: block; overflow-y: auto; margin: 0; padding: 0 4px; mask-image: none; -webkit-mask-image: none;">
                            ${transcriptHtml}
                        </div>
                    </div>

                    <div style="display: flex; border-top: 1px solid rgba(0,0,0,0.08);">
                        <div style="flex: 1; text-align: center; padding: 14px; font-size: 16px; font-weight: 600; color: #07c160; cursor: pointer;"
                             onclick="window.WeChat.App.closeCallSummaryModal()">关闭</div>
                    </div>
                </div>
            </div>
        `;
    },
    renderPromptModal(state) {
        if (!state || !state.open) return '';

        const title = state.title || '请输入';
        const placeholder = state.placeholder || '请输入...';
        const value = state.value || '';
        const content = state.content || '';

        return `
            <div class="wx-modal-overlay active" style="z-index: 20003; background: rgba(0,0,0,0.5);" onclick="window.WeChat.App.closePromptModal()">
                <div class="wx-ios-alert" onclick="event.stopPropagation()" style="width: 280px; background: white; border-radius: 14px; overflow: hidden;">
                    <div style="padding: 20px 16px 16px 16px;">
                        <div style="font-size: 17px; font-weight: 600; text-align: center; margin-bottom: 12px; color: #333;">${title}</div>
                        ${content ? `<div style="font-size: 13px; color: #666; text-align: center; margin-bottom: 12px;">${content}</div>` : ''}
                        <input type="text" id="wx-prompt-input" value="${this.escapeQuote(value)}" placeholder="${placeholder}" 
                            style="width: 100%; height: 40px; padding: 0 12px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; outline: none; background: #f8f8f8;"
                            onclick="event.stopPropagation()"
                            onkeydown="if(event.key==='Enter') window.WeChat.App.confirmPromptModal()">
                    </div>
                    <div style="display: flex; border-top: 1px solid rgba(0,0,0,0.1);">
                        <div style="flex: 1; text-align: center; padding: 14px; font-size: 17px; color: #666; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1);"
                             onclick="window.WeChat.App.closePromptModal()">取消</div>
                        <div style="flex: 1; text-align: center; padding: 14px; font-size: 17px; font-weight: 600; color: #07c160; cursor: pointer;"
                             onclick="window.WeChat.App.confirmPromptModal()">确定</div>
                    </div>
                </div>
            </div>
        `;
    },
    renderAlertModal() {
        // 目前使用 confirmationModal 代替，这里返回空
        return '';
    },
    renderFloatingCallBubble(state) {
        if (!state.open || !state.minimized) return '';
        const char = window.sysStore ? window.sysStore.getCharacter(state.sessionId) : null;
        const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
        const duration = state.durationStr || '00:00';
        // 判断是语音通话还是视频通话
        const isVideoCall = window.State && window.State.videoCallState && window.State.videoCallState.open && window.State.videoCallState.sessionId === state.sessionId;
        const restoreFunc = isVideoCall ? 'restoreVideoCall' : 'restoreVoiceCall';
        const iconPath = isVideoCall ? 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z' : 'M12 20V10M18 15V9M6 15v-6';

        return `
            <div id="wx-vcall-mini" onclick="window.WeChat.App.${restoreFunc}()" 
                 style="position: fixed; top: 120px; right: 12px; width: 62px; height: 62px; z-index: 10001; cursor: pointer; animation: wx-pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); touch-action: none;">
                <style>
                    @keyframes wx-pop-in { from { transform: scale(0) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
                    @keyframes wx-mini-pulse { 0% { box-shadow: 0 0 0 0 rgba(7, 193, 96, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(7, 193, 96, 0); } 100% { box-shadow: 0 0 0 0 rgba(7, 193, 96, 0); } }
                </style>
                <div style="position: relative; width: 100%; height: 100%; animation: wx-mini-pulse 2s infinite;">
                    <!-- Avatar Area -->
                    <img src="${avatar}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid #07c160; object-fit: cover; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.25);">
                    
                    <!-- Duration Badge -->
                    <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); background: #07c160; color: white; font-size: 10px; padding: 2px 7px; border-radius: 10px; white-space: nowrap; font-weight: 700; box-shadow: 0 2px 5px rgba(0,0,0,0.15); letter-spacing: 0.5px;">
                        ${duration}
                    </div>

                    <!-- Call Type Indicator Overlay -->
                    <div style="position: absolute; top: 0; right: 0; background: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); border: 1px solid #eee;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#07c160" stroke-width="${isVideoCall ? '2' : '3'}" stroke-linecap="round" stroke-linejoin="round" fill="${isVideoCall ? '#07c160' : 'none'}">
                            <path d="${iconPath}"/>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    },
    renderConfirmationModal() {
        return '';
    },
    _renderFieldHeader(label, fieldId) {
        const isLocked = window.State && window.State.fieldLocks && window.State.fieldLocks[fieldId];
        const lockIcon = isLocked
            ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';

        return `
            <div class="wx-field-header" style="margin-top: 4px;">
                <div style="font-size: 13px; color: var(--wx-text-sec); font-weight: 500;">${label}</div>
                <div class="wx-field-actions" style="gap: 14px; opacity: 0.4;">
                    <div class="wx-field-action-btn dice" onclick="window.WeChat.App.randomizeField('${fieldId}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 15h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2zm8-4h-2V6h2v2zm-4 0h-2V6h2v2zm-4 0H7V6h2v2z"/></svg>
                    </div>
                    <div id="lock-btn-${fieldId}" class="wx-field-action-btn ${isLocked ? 'locked' : ''}" onclick="window.WeChat.App.toggleFieldLock('${fieldId}')">
                        ${lockIcon}
                    </div>
                    <div class="wx-field-action-btn clear" onclick="window.WeChat.App.clearField('${fieldId}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                    </div>
                </div>
            </div>
        `;
    },
});
