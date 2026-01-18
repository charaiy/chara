/**
 * js/apps/wechat/services/contacts.js
 * 通讯录服务 - 管理联系人和酒馆卡片
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Contacts = {
    _contacts: [
        { id: 'file_helper', name: '文件传输助手', avatar: '', type: 'system', section: 'W' },
        { id: 'tencent', name: '微信团队', avatar: '', type: 'system', section: 'W' },
        { id: 'chara_assistant', name: 'Chara 小助手', avatar: '', type: 'bot', section: 'C' }
    ],

    /**
     * 获取所有联系人，按 A-Z 排序（简化版）
     */
    getContacts() {
        return this._contacts;
    },

    addContact(contact) {
        if (!this._contacts.find(c => c.id === contact.id)) {
            this._contacts.push(contact);
            this._contacts.sort((a, b) => (a.section || 'Z').localeCompare(b.section || 'Z'));
            this.persistContact(contact);
            return true;
        }
        return false;
    },

    removeContact(id) {
        const index = this._contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            this._contacts.splice(index, 1);
            if (window.sysStore && window.sysStore.deleteCharacter) {
                window.sysStore.deleteCharacter(id);
                window.sysStore.clearMessagesBySession(id); // Option: also clear messages? Yes, usually delete friend means clear chat too.
            }
            return true;
        }
        return false;
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
                main_persona: contact.settings?.persona || "Assistant"
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
                window.sysStore.updateCharacter(p.id, {
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    main_persona: p.settings?.persona || "Assistant"
                });
            });
        }

        fakeHumans.forEach(p => {
            if (!this._contacts.find(c => c.id === p.id)) {
                this._contacts.push(p);
            }
        });

        this._contacts.sort((a, b) => (a.section || 'Z').localeCompare(b.section || 'Z'));
    }
};

// 预加载一次
window.WeChat.Services.Contacts.loadFromTavern();
