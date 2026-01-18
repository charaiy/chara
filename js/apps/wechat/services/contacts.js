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

    /**
     * 尝试从 OS Store 读取酒馆卡片并转化为联系人
     */
    loadFromTavern() {
        // 模拟：从 store 获取 (实际此时我们直接伪造几个，因为没接真实后端)
        const fakeHumans = [
            {
                id: 'alice',
                name: 'Alice',
                avatar: 'assets/images/avatar_placeholder.png',
                section: 'A',
                // Add persona for API Chat
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

        // Ensure these characters exist in System Store (Real DB)
        // This fixes the issue where "fake" characters were ghost entities not known by the Chat Service
        if (window.sysStore && window.sysStore.updateCharacter) {
            fakeHumans.forEach(p => {
                window.sysStore.updateCharacter(p.id, {
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    main_persona: p.settings?.persona || "Asssitant"
                });
            });
        }

        // 合并去重 (Local View)
        fakeHumans.forEach(p => {
            if (!this._contacts.find(c => c.id === p.id)) {
                this._contacts.push(p);
            }
        });

        // 简单排序
        this._contacts.sort((a, b) => a.section.localeCompare(b.section));
    }
};

// 预加载一次
window.WeChat.Services.Contacts.loadFromTavern();
