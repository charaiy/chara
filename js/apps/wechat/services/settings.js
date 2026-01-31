/**
 * js/apps/wechat/services/settings.js
 * 设置服务 - 统一管理所有设置相关的功能
 * [Refactor] Merged from chat_config.js and profile_settings.js for better organization
 * 
 * 职责：
 * - 聊天配置（背景、记忆限制、黑名单等）
 * - 用户/角色资料设置（人设、资料、语音视频设置等）
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

/**
 * 聊天配置服务 - 处理聊天相关的设置
 * [Backward Compatibility] 保持独立的命名空间以兼容现有代码
 */
window.WeChat.Services.ChatConfig = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    /**
     * 设置聊天背景（从相册选择）
     * @param {string} sessionId - 会话ID
     */
    setChatBackground(sessionId) {
        // 创建隐藏的文件输入元素
        let input = document.getElementById('wx-chat-background-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'wx-chat-background-input';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    if (window.sysStore && sessionId) {
                        window.sysStore.updateCharacter(sessionId, { chat_background: dataUrl });
                        if (this.App && this.App.render) {
                            this.App.render();
                        }
                        if (window.os) window.os.showToast('背景设置成功');
                    }
                };
                reader.readAsDataURL(file);
                // 重置input以便可以再次选择同一文件
                input.value = '';
            };
            document.body.appendChild(input);
        }
        input.click();
    },

    /**
     * 移除聊天背景
     * @param {string} sessionId - 会话ID
     */
    removeChatBackground(sessionId) {
        if (window.sysStore) {
            window.sysStore.updateCharacter(sessionId, { chat_background: null });
            this.App.render();
            if (window.os) window.os.showToast('背景已移除');
        }
    },

    /**
     * 设置上下文记忆量
     * @param {string} sessionId - 会话ID
     */
    setContextMemoryLimit(sessionId) {
        const char = window.sysStore?.getCharacter(sessionId);
        const currentLimit = char?.settings?.memory_limit || 200;

        this.App.openPromptModal({
            title: '上下文记忆量',
            content: '请输入上下文记忆量 (保留最近多少条消息):',
            value: currentLimit,
            onConfirm: (val) => {
                const limit = parseInt(val);
                if (!isNaN(limit) && limit >= 0) {
                    window.sysStore.updateCharacter(sessionId, {
                        settings: { memory_limit: limit }
                    });
                    this.App.render();
                } else {
                    if (window.os) window.os.showToast('请输入有效的数字', 'error');
                }
            }
        });
    },

    /**
     * 切换黑名单状态
     * @param {string} userId - 用户ID
     * @param {boolean} isBlacklisted - 是否加入黑名单
     */
    toggleBlacklist(userId, isBlacklisted) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(userId, { is_blacklisted: isBlacklisted });
            this.App.render(); // Refresh UI
        }
    },

    /**
     * 切换独立后台活动
     * @param {string} sessionId - 会话ID
     * @param {boolean} isEnabled - 是否启用
     */
    toggleIndependentBgActivity(sessionId, isEnabled) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            const char = window.sysStore.getCharacter(sessionId);
            const settings = char?.settings || {};
            settings.bg_activity_enabled = isEnabled;
            // Ensure threshold exists
            if (isEnabled && settings.bg_activity_threshold === undefined) {
                settings.bg_activity_threshold = 30;
            }
            window.sysStore.updateCharacter(sessionId, { settings: settings });
            this.App.render();
        }
    },

    /**
     * 设置独立后台活动阈值
     * @param {string} sessionId - 会话ID
     * @param {number} value - 阈值（分钟）
     */
    setIndependentBgThreshold(sessionId, value) {
        const minutes = parseInt(value);
        if (isNaN(minutes) || minutes < 1) return;
        if (window.sysStore && window.sysStore.updateCharacter) {
            const char = window.sysStore.getCharacter(sessionId);
            const settings = char?.settings || {};
            settings.bg_activity_threshold = minutes;
            window.sysStore.updateCharacter(sessionId, { settings: settings });
        }
    }
};

/**
 * 用户/角色资料设置服务 - 处理角色人设、用户资料等设置的保存
 * [Backward Compatibility] 保持独立的命名空间以兼容现有代码
 */
window.WeChat.Services.ProfileSettings = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    /**
     * 保存角色人设设置
     * @param {string} userId - 用户ID
     * @param {Object} data - 设置数据
     * @param {boolean} silent - 是否静默保存（不显示提示）
     */
    savePersonaSettings(userId, data, silent = false) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            const displayName = data.remark || data.nickname || data.realName || userId;
            window.sysStore.updateCharacter(userId, {
                name: displayName,
                real_name: data.realName,
                remark: data.remark,
                nickname: data.nickname,
                main_persona: data.persona,
                species: data.species || '',
                gender: data.gender || '',
                wxid: data.wxid || ('wxid_' + Math.random().toString(36).substring(2, 10)),
                bio: data.bio || '',
                region: data.region || '',
                settings: {
                    birthday: data.birthday || '',
                    age: data.age || '',
                    period_start: data.periodStart || '',
                    region_mapping: data.regionMapping || '',
                    wealth_level: data.wealth || ''
                }
            });
            // Update current chat title if it's the active session
            const State = this.State;
            if (State.activeSessionId === userId) {
                State.chatTitle = displayName;
            }
        }
        if (!silent) {
            if (window.os) window.os.showToast('保存成功');
            this.App.goBack(); // Return to previous page
        }
    },

    /**
     * 保存用户个人资料设置
     * @param {Object} data - 设置数据
     * @param {boolean} silent - 是否静默保存
     */
    saveMyProfileSettings(data, silent = false) {
        if (window.sysStore && window.sysStore.set) {
            window.sysStore.set('user_realname', data.realName);
            window.sysStore.set('user_nickname', data.nickname); // nickname is the display name
            window.sysStore.set('user_gender', data.gender);
            window.sysStore.set('user_species', data.species);
            window.sysStore.set('user_persona', data.persona);
            window.sysStore.set('user_birthday', data.birthday);
            window.sysStore.set('user_age', data.age);
            window.sysStore.set('user_period_start', data.periodStart);
            window.sysStore.set('user_bio', data.bio);
            window.sysStore.set('user_region', data.region);
            window.sysStore.set('user_wealth', data.wealth);

            let wxid = data.wxid;
            if (!wxid) {
                const existing = window.sysStore.get('user_wxid');
                wxid = existing || ('wxid_' + Math.random().toString(36).substring(2, 10));
            }
            window.sysStore.set('user_wxid', wxid);
        }
        if (!silent) {
            if (window.os) window.os.showToast('个人资料已更新');
            this.App.goBack();
        }
    },

    /**
     * 保存语音视频设置
     * @param {string} sessionId - 会话ID
     * @param {Object} data - 设置数据
     */
    saveVoiceVideoSettings(sessionId, data) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(sessionId, {
                voice_settings: {
                    voiceId: data.voiceId,
                    languageBoost: data.languageBoost,
                    speechRate: data.speechRate,
                    visualCallEnabled: data.visualCallEnabled,
                    useRealCamera: data.useRealCamera,
                    voiceAccessEnabled: data.voiceAccessEnabled,
                    peerCallImage: data.peerCallImage,
                    myCallImage: data.myCallImage
                }
            });
        }
        if (window.os) window.os.showToast('设置已保存');
        this.App.goBack();
    }
};
