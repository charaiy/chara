/**
 * js/apps/wechat/services/notifications.js
 * 微信通知系统 - 管理红点、未读数、免打扰等逻辑
 * 
 * 核心规则：
 * 1. 强提醒（红底白字数字）：未开启免打扰的聊天
 *    - 1-99: 显示具体数字
 *    - 超过99: 显示 ··· (三个白点)
 * 2. 弱提醒（小红点）：开启免打扰的聊天
 * 3. @提醒：即使免打扰也会特殊处理
 * 4. Tab Bar数字：只计算强提醒的总和，超过99显示 ···
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Notifications = {

    /**
     * 获取指定会话的未读信息
     * @param {string} sessionId - 会话ID
     * @returns {Object} { count: number, hasAtMe: boolean, isMuted: boolean }
     */
    getUnreadInfo(sessionId) {
        if (!window.sysStore) {
            return { count: 0, hasAtMe: false, isMuted: false };
        }

        const char = window.sysStore.getCharacter(sessionId);
        if (!char) {
            return { count: 0, hasAtMe: false, isMuted: false };
        }

        // 获取未读数
        const unreadCount = char.unread_count || 0;

        // 获取免打扰状态
        const isMuted = char.is_muted === true;

        // 获取@提醒状态
        const hasAtMe = char.has_at_me === true;

        return {
            count: unreadCount,
            hasAtMe: hasAtMe,
            isMuted: isMuted
        };
    },

    /**
     * 设置会话的未读数
     * @param {string} sessionId 
     * @param {number} count 
     */
    setUnreadCount(sessionId, count) {
        if (!window.sysStore) return;

        const char = window.sysStore.getCharacter(sessionId);
        if (!char) return;

        window.sysStore.updateCharacter(sessionId, {
            unread_count: Math.max(0, count)
        });

        // 更新UI
        this.refreshNotifications();
    },

    /**
     * 增加未读数
     * @param {string} sessionId 
     * @param {number} increment 
     */
    incrementUnread(sessionId, increment = 1) {
        const info = this.getUnreadInfo(sessionId);
        this.setUnreadCount(sessionId, info.count + increment);
    },

    /**
     * 清空未读数
     * @param {string} sessionId 
     */
    clearUnread(sessionId) {
        if (!window.sysStore) return;

        window.sysStore.updateCharacter(sessionId, {
            unread_count: 0,
            has_at_me: false
        });

        this.refreshNotifications();
    },

    /**
     * 设置@提醒状态
     * @param {string} sessionId 
     * @param {boolean} hasAtMe 
     */
    setAtMeStatus(sessionId, hasAtMe) {
        if (!window.sysStore) return;

        window.sysStore.updateCharacter(sessionId, {
            has_at_me: hasAtMe
        });

        this.refreshNotifications();
    },

    /**
     * 切换免打扰状态
     * @param {string} sessionId 
     * @param {boolean} muted 
     */
    toggleMute(sessionId, muted) {
        if (!window.sysStore) return;

        window.sysStore.updateCharacter(sessionId, {
            is_muted: muted
        });

        this.refreshNotifications();
    },

    /**
     * 渲染未读标记（用于聊天列表）
     * @param {string} sessionId 
     * @returns {string} HTML字符串
     */
    renderUnreadBadge(sessionId) {
        const info = this.getUnreadInfo(sessionId);

        if (info.count === 0) {
            return '';
        }

        // 免打扰且无@提醒：显示小红点
        if (info.isMuted && !info.hasAtMe) {
            return `<div class="wx-badge-dot" style="
                position: absolute;
                top: 8px;
                right: 12px;
                width: 8px;
                height: 8px;
                background-color: #FA5151;
                border-radius: 50%;
            "></div>`;
        }

        // 强提醒：显示数字
        let displayText = '';
        if (info.count <= 99) {
            displayText = info.count.toString();
        } else {
            displayText = '···';
        }

        return `<div class="wx-badge-count" style="
            position: absolute;
            top: 8px;
            right: 12px;
            min-width: 18px;
            height: 18px;
            background-color: #FA5151;
            color: white;
            font-size: 11px;
            font-weight: 500;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            box-sizing: border-box;
        ">${displayText}</div>`;
    },

    /**
     * 获取Tab Bar的总未读数
     * 只计算非免打扰的会话
     * @returns {number}
     */
    getTotalUnreadCount() {
        if (!window.sysStore) return 0;

        const allChars = window.sysStore.getAllCharacters();
        let total = 0;

        allChars.forEach(char => {
            const info = this.getUnreadInfo(char.id);

            // 只统计强提醒（非免打扰 或 有@提醒）
            if (!info.isMuted || info.hasAtMe) {
                total += info.count;
            }
        });

        return total;
    },

    /**
     * 渲染Tab Bar的未读数字
     * @returns {string} HTML字符串
     */
    renderTabBadge() {
        const total = this.getTotalUnreadCount();

        if (total === 0) {
            return '';
        }

        let displayText = '';
        if (total <= 99) {
            displayText = total.toString();
        } else {
            displayText = '···';
        }

        return `<div class="wx-tab-badge" style="
            position: absolute;
            top: 2px;
            right: 8px;
            min-width: 16px;
            height: 16px;
            background-color: #FA5151;
            color: white;
            font-size: 10px;
            font-weight: 600;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            box-sizing: border-box;
        ">${displayText}</div>`;
    },

    /**
     * 渲染发现页的红点系统
     * @param {string} type - 'moments' | 'video' | 'live'
     * @returns {string} HTML字符串
     */
    renderDiscoverBadge(type) {
        if (!window.sysStore) return '';

        const discoverData = window.sysStore.get(`discover_${type}`) || {};

        // 朋友圈逻辑
        if (type === 'moments') {
            const hasNewPost = discoverData.has_new_post === true;
            const hasInteraction = discoverData.has_interaction === true;
            const interactionAvatar = discoverData.interaction_avatar || '';

            // 优先显示互动（头像+红点）
            if (hasInteraction && interactionAvatar) {
                return `<div style="position: relative; margin-right: 8px;">
                    <img src="${interactionAvatar}" style="
                        width: 32px;
                        height: 32px;
                        border-radius: 4px;
                    " />
                    <div style="
                        position: absolute;
                        top: -2px;
                        right: -2px;
                        width: 10px;
                        height: 10px;
                        background-color: #FA5151;
                        border: 2px solid var(--wx-cell-bg);
                        border-radius: 50%;
                    "></div>
                </div>`;
            }

            // 其次显示新动态（红点）
            if (hasNewPost) {
                return `<div class="wx-discover-dot" style="
                    position: absolute;
                    top: 16px;
                    right: 40px;
                    width: 8px;
                    height: 8px;
                    background-color: #FA5151;
                    border-radius: 50%;
                "></div>`;
            }
        }

        // 视频号/看一看：简单红点
        if (type === 'video' || type === 'live') {
            const hasNew = discoverData.has_new === true;

            if (hasNew) {
                return `<div class="wx-discover-dot" style="
                    position: absolute;
                    top: 16px;
                    right: 40px;
                    width: 8px;
                    height: 8px;
                    background-color: #FA5151;
                    border-radius: 50%;
                "></div>`;
            }
        }

        return '';
    },

    /**
     * 处理新消息到达
     * @param {string} sessionId 
     * @param {Object} message - 消息对象
     */
    handleNewMessage(sessionId, message) {
        // 如果当前正在查看该会话，不增加未读数
        const currentSessionId = window.WeChat?.App?.State?.activeSessionId;
        if (currentSessionId === sessionId) {
            return;
        }

        // 检测是否@我
        const hasAtMe = this.detectAtMe(message);

        // 增加未读数
        this.incrementUnread(sessionId, 1);

        // 设置@提醒
        if (hasAtMe) {
            this.setAtMeStatus(sessionId, true);
        }
    },

    /**
     * 检测消息是否@我
     * @param {Object} message 
     * @returns {boolean}
     */
    detectAtMe(message) {
        if (!message || !message.content) return false;

        const userName = (window.sysStore && window.sysStore.get('user_realname')) || '你';

        // 检测 @用户名 或 @我
        const patterns = [
            `@${userName}`,
            '@我',
            '@all',
            '@所有人'
        ];

        return patterns.some(pattern => message.content.includes(pattern));
    },

    /**
     * 刷新所有通知UI
     */
    refreshNotifications() {
        // 触发微信App的UI更新
        if (window.WeChat && window.WeChat.App && window.WeChat.App.render) {
            window.WeChat.App.render();
        }
    },

    /**
     * 获取会话预览文本（用于聊天列表）
     * 特殊处理@提醒的显示
     * @param {string} sessionId 
     * @returns {string}
     */
    getPreviewText(sessionId) {
        if (!window.sysStore) return '';

        const messages = window.sysStore.getMessagesBySession(sessionId);
        if (messages.length === 0) return '';

        const lastMsg = messages[messages.length - 1];
        const info = this.getUnreadInfo(sessionId);

        // 如果免打扰但有@提醒，特殊显示
        if (info.isMuted && info.hasAtMe) {
            return `<span style="color: #FA5151; font-weight: 500;">[有人@我]</span> ${lastMsg.content}`;
        }

        // 普通消息
        if (lastMsg.type === 'image') {
            return '[图片]';
        } else if (lastMsg.type === 'sticker') {
            return '[表情]';
        } else {
            return lastMsg.content;
        }
    },

    /**
     * 初始化测试数据（可选，用于演示）
     */
    initTestData() {
        if (!window.sysStore) return;

        const testSessions = ['char1', 'char2', 'char3'];

        testSessions.forEach((id, index) => {
            const char = window.sysStore.getCharacter(id);
            if (char) {
                window.sysStore.updateCharacter(id, {
                    unread_count: (index + 1) * 10,
                    is_muted: index === 2, // 第三个设为免打扰
                    has_at_me: index === 2  // 第三个有@提醒
                });
            }
        });

        console.log('[Notifications] Test data initialized');
    }
};

// 初始化
if (typeof window !== 'undefined') {
    console.log('[WeChat.Services.Notifications] Loaded');
}
