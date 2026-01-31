/**
 * js/apps/wechat/services/contacts.js
 * 联系人管理服务 - 管理联系人、关系生成和删除
 * 
 * 职责：
 * - 联系人CRUD操作（获取、添加、删除、持久化）
 * - 从酒馆加载默认联系人
 * - 关联人物生成（基于现有角色生成新角色）
 * - 联系人删除时的记忆清理（清理其他角色人设中的提及）
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

/**
 * 联系人服务 - 基础联系人管理
 */
window.WeChat.Services.Contacts = {
    _contacts: [],

    /**
     * 获取所有联系人，按 A-Z 排序（动态同步版）
     * @returns {Array} 排序后的联系人列表
     */
    getContacts() {
        const systemContacts = this._contacts.filter(c => c.type === 'system' || c.type === 'bot');
        const dbCharacters = [];

        if (window.sysStore && window.sysStore.get) {
            const db = window.sysStore.get('chara_db_characters', {});
            Object.values(db).forEach(char => {
                // 排除已经被包含在 systemContacts 里的（如果有 id 冲突）
                if (!systemContacts.find(sc => sc.id === char.id)) {
                    dbCharacters.push({
                        id: char.id,
                        name: char.remark || char.name || 'Unknown',
                        realName: char.name,
                        // 如果没有头像，给个默认占位
                        avatar: char.avatar || 'assets/images/avatar_placeholder.png',
                        section: (char.remark || char.name || '#').charAt(0).toUpperCase(),
                        type: 'user', // Default type
                        ...char
                    });
                }
            });
        }

        // 合并系统联系人和数据库角色
        const all = [...systemContacts, ...dbCharacters];

        // 排序 (with null safety for file:// compatibility)
        return all.filter(c => c && c.id).sort((a, b) => {
            const secA = a.section || '#';
            const secB = b.section || '#';
            const idA = a.id || '';
            const idB = b.id || '';
            if (secA === secB) return idA.localeCompare(idB);
            if (secA === '#') return 1;
            if (secB === '#') return -1;
            return secA.localeCompare(secB);
        });
    },

    /**
     * 添加联系人
     * @param {Object} contact - 联系人对象
     * @returns {boolean} 是否成功
     */
    addContact(contact) {
        // 保存到 Store
        this.persistContact(contact);
        return true;
    },

    /**
     * 删除联系人
     * @param {string} id - 联系人ID
     * @returns {boolean} 是否成功
     */
    removeContact(id) {
        // 1. Try to remove from local cache (system contacts)
        const index = this._contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            this._contacts.splice(index, 1);
        }

        // 2. Always remove from persistence (DB)
        if (window.sysStore && window.sysStore.deleteCharacter) {
            window.sysStore.deleteCharacter(id);
            if (window.sysStore.clearMessagesBySession) {
                window.sysStore.clearMessagesBySession(id);
            }
        }

        return true;
    },

    /**
     * 持久化联系人到存储
     * @param {Object} contact - 联系人对象
     */
    persistContact(contact) {
        if (window.sysStore && window.sysStore.updateCharacter) {
            window.sysStore.updateCharacter(contact.id, {
                id: contact.id,
                name: contact.name, // Display name
                real_name: contact.realName || '',
                remark: contact.remark || '',
                nickname: contact.nickname || '',
                avatar: contact.avatar || '',
                main_persona: contact.settings?.persona || "Assistant",
                gender: contact.gender || '',
                wxid: contact.wxid || ''
            });
        }
    },

    /**
     * 从酒馆加载默认联系人（示例数据）
     */
    loadFromTavern() {
        const fakeHumans = [
            {
                id: 'alice',
                name: 'Alice',
                avatar: 'assets/images/avatar_placeholder.png',
                section: 'A',
                settings: { persona: "You are Alice. You are a helpful assistant." }
            },
            {
                id: 'bob',
                name: 'Bob',
                avatar: '',
                section: 'B',
                settings: { persona: "You are Bob. You are a cool guy." }
            },
            {
                id: 'jerry',
                name: 'Jerry',
                avatar: '',
                section: 'J',
                settings: { persona: "You are Jerry. You like cheese." }
            }
        ];

        if (window.sysStore && window.sysStore.updateCharacter) {
            fakeHumans.forEach(p => {
                // Check if exists to preserve user edits (avatar, nickname, etc.)
                const existing = window.sysStore.getCharacter(p.id);
                if (existing) {
                    // Update only if missing critical fields or merge safely
                    window.sysStore.updateCharacter(p.id, {
                        id: p.id,
                        name: existing.name || p.name,
                        avatar: existing.avatar || p.avatar,
                        main_persona: existing.main_persona || p.settings?.persona || "Assistant"
                    });
                } else {
                    // New insert
                    window.sysStore.updateCharacter(p.id, {
                        id: p.id,
                        name: p.name,
                        avatar: p.avatar,
                        main_persona: p.settings?.persona || "Assistant"
                    });
                }
            });
        }

        // [Optimization] No need to push to this._contacts anymore, 
        // as getContacts() now dynamically reads from sysStore.
        // The persistContact logic above has already saved them to the DB.
    }
};

/**
 * 关系管理服务 - 处理关联人物生成和联系人删除时的记忆清理
 * [Backward Compatibility] 保持独立的命名空间以兼容现有代码
 */
window.WeChat.Services.Relationships = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    /**
     * 打开关联人物生成对话框
     * @param {string} sourceUserId - 源用户ID（基于此用户生成关联角色）
     */
    async openAssociatedGen(sourceUserId) {
        let char = window.sysStore.getCharacter(sourceUserId);

        // Support for User Self
        if (!char && sourceUserId === 'USER_SELF') {
            const s = window.sysStore;
            char = {
                id: 'USER_SELF',
                name: s.get('user_nickname') || s.get('user_realname') || '我',
                nickname: s.get('user_nickname') || '我',
                main_persona: s.get('user_persona') || '',
                avatar: s.get('user_avatar')
            };
        }

        if (!char) return;

        this.App.openPromptModal({
            title: '关联人物',
            content: `想要生成一个与【${char.nickname || char.name}】什么关系的角色？\n(例如：的前女友、的宿敌、的债主)`,
            value: '的',
            onConfirm: (relation) => {
                if (!relation) return;

                // 1. Create Placeholder Character
                const newCharId = 'gen_' + Date.now();
                const placeholderName = `正在创建中...`;

                // Save initial placeholder
                window.sysStore.updateCharacter(newCharId, {
                    id: newCharId,
                    name: placeholderName,
                    avatar: 'assets/images/avatar_placeholder.png',
                    main_persona: '正在后台生成中，请稍候...\n\n(您可以离开此页面，生成完成后会自动通知您)',
                    remark: `与 ${char.name} 是 ${relation} 关系`
                });

                // 2. Navigate to New Settings Page
                const State = this.State;
                State.activeSessionId = newCharId;
                State.activeUserId = newCharId; // [Fix] Set activeUserId so render() knows which char to show
                State.currentTab = 'persona_settings';

                this.App.render(); // Let the main router handle the view switch

                // 3. Start Background Generation
                if (window.os) window.os.showToast(`后台任务启动：正在生成【${char.name}】的${relation}...`, 'info', 4000);

                // Non-blocking call
                this.App.generateAssociatedInBackground(newCharId, char, relation);
            }
        });
    },

    /**
     * 删除联系人（显示确认对话框）
     * @param {string} userId - 要删除的用户ID
     */
    deleteFriend(userId) {
        this.App.openConfirmationModal({
            title: '删除联系人',
            content: '确定删除该联系人吗？此操作将删除联系人信息及所有聊天记录。',
            onConfirm: `window.WeChat.App.performDeleteFriend('${userId}')`
        });
    },

    /**
     * 执行删除联系人操作（包含记忆清理）
     * @param {string} userId - 要删除的用户ID
     */
    performDeleteFriend(userId) {
        if (window.WeChat.Services && window.WeChat.Services.Contacts) {
            // [Memory Cleanup] Remove mentions of this character from others
            const charToDelete = window.sysStore.getCharacter(userId);
            if (charToDelete) {
                const names = [charToDelete.name, charToDelete.nickname, charToDelete.real_name, charToDelete.remark]
                    .filter(n => n && n.length > 1);

                const allChars = window.sysStore.get('chara_db_characters', {});
                Object.values(allChars).forEach(c => {
                    if (c.id === userId) return;
                    let persona = c.main_persona || '';
                    let changed = false;

                    // 1. Remove blocks added by [SourceUpdate]
                    // Regex helps find blocks that starts with "新增人际关系" or "生活图谱 - 补充" 
                    // and contain any of the deleted names
                    names.forEach(name => {
                        const blockRegex = new RegExp(`[\\n\\s]*(?:【新增人际关系】|\\[生活图谱 - 补充\\])[\\s\\S]*?${name}[\\s\\S]*?(?=\\n\\n|【新增人际关系】|\\[生活图谱 - 补充\\]|$)`, 'g');
                        if (blockRegex.test(persona)) {
                            persona = persona.replace(blockRegex, '').trim();
                            changed = true;
                        }
                    });

                    // 2. Fallback: line-by-line check for mentions if not in blocks
                    if (!changed) {
                        const lines = persona.split('\n');
                        const newLines = lines.filter(line => !names.some(name => line.includes(name)));
                        if (newLines.length !== lines.length) {
                            persona = newLines.join('\n').trim();
                            changed = true;
                        }
                    }

                    if (changed) {
                        window.sysStore.updateCharacter(c.id, { main_persona: persona });
                    }
                });

                // Also cleanup User context if needed
                const s = window.sysStore;
                let userPersona = s.get('user_persona') || '';
                names.forEach(name => {
                    const blockRegex = new RegExp(`[\\n\\s]*(?:【新增人际关系】|\\[生活图谱 - 补充\\])[\\s\\S]*?${name}[\\s\\S]*?(?=\\n\\n|$)`, 'g');
                    userPersona = userPersona.replace(blockRegex, '').trim();
                });
                s.set('user_persona', userPersona);
            }

            const success = window.WeChat.Services.Contacts.removeContact(userId);
            if (success) {
                if (window.os) window.os.showToast('该角色及其关联记忆已清除');
                const State = this.State;
                State.currentTab = 1; // Go back to Contacts
                this.App.closeConfirmationModal();
                this.App.render();
            }
        }
    }
};

// 预加载一次默认联系人
window.WeChat.Services.Contacts.loadFromTavern();
