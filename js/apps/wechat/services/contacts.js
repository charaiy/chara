/**
 * js/apps/wechat/services/contacts.js
 * 通讯录服务 - 管理联系人和酒馆卡片
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Contacts = {
    _contacts: [],

    /**
     * 获取所有联系人，按 A-Z 排序（简化版）
     */
    /**
     * 获取所有联系人，按 A-Z 排序（动态同步版）
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

    addContact(contact) {
        // 保存到 Store
        this.persistContact(contact);
        return true;
    },

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

    loadFromTavern() {
        // ... existing loadFromTavern logic ...
        // (Keeping it as is for compatibility, but making it more robust)
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
                    // Update only if missing critical fields or merge safely?
                    // For now, let's just NOT overwrite avatar if it exists
                    window.sysStore.updateCharacter(p.id, {
                        id: p.id,
                        // If existing name is different (user renamed), keep it? 
                        // Or just ensure we don't zero out the avatar.
                        // Let's preserve everything user might have changed.
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

// 预加载一次
window.WeChat.Services.Contacts.loadFromTavern();
