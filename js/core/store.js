/**
 * js/core/store.js
 * * 本模块负责系统的持久化存储。
 * 已升级以支持 CharaOS 蓝图功能：消息总线与角色状态管理。
 * * @author CharaOS Team
 */

const APP_PREFIX = 'chara_os_';

class Store {
    constructor() {
        this.cache = {};
        this.init(); // 确保实例化时自动初始化
    }

    // =================================================
    // Part 1: Legacy Core (兼容旧代码 - 💀严禁修改)
    // =================================================

    get(key, defaultValue = null) {
        if (this.cache[key]) return this.cache[key];
        try {
            const value = localStorage.getItem(APP_PREFIX + key);
            if (value === null) return defaultValue;
            const parsed = JSON.parse(value);
            this.cache[key] = parsed;
            return parsed;
        } catch (e) {
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            this.cache[key] = value;
            localStorage.setItem(APP_PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage Save Failed:', e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                alert('保存失败：存储空间不足。请删除一些大图片或使用图床功能。');
            }
        }
    }

    remove(key) {
        delete this.cache[key];
        localStorage.removeItem(APP_PREFIX + key);
    }

    // =================================================
    // Part 2: Genesis Core (新功能 - 用于微信/Siri)
    // =================================================

    /**
     * 初始化存储系统
     */
    init() {
        const initialStates = {
            'chara_db_messages': [],                // 消息总线
            'chara_db_characters': {},              // 角色表
            'chara_db_world': {                     // 世界状态
                mode: 'online',
                location: 'home',
                offline_participants: []
            }
        };

        Object.keys(initialStates).forEach(key => {
            if (this.get(key) === null) {
                this.set(key, initialStates[key]);
            }
        });

        // 可选：打印日志确认初始化
        // console.log('[Store] Genesis Core Ready');
    }

    /**
     * 获取所有消息数组 (Siri 全知视角)
     * @returns {Array}
     */
    getAllMessages() {
        return this.get('chara_db_messages', []);
    }

    /**
     * 获取“我”与 targetId 的所有交互
     * 自动过滤 sender_id 或 receiver_id
     * @param {string} targetId 对方角色 ID
     */
    getMessagesBySession(targetId) {
        const messages = this.getAllMessages();
        const isMe = (id) => id === 'user' || id === 'me' || id === 'my';
        return messages.filter(m =>
            (isMe(m.sender_id) && m.receiver_id === targetId) ||
            (m.sender_id === targetId && isMe(m.receiver_id))
        );
    }

    /**
     * [Spy Mode] 获取任意两个角色之间的交互
     * 用于“查看角色手机”功能
     */
    getMessagesBetween(charA, charB) {
        const messages = this.getAllMessages();
        return messages.filter(m =>
            (m.sender_id === charA && m.receiver_id === charB) ||
            (m.sender_id === charB && m.receiver_id === charA)
        );
    }

    /**
     * 根据 ID 获取单条消息
     */
    getMessageById(id) {
        return this.getAllMessages().find(m => m.id === id) || null;
    }

    /**
     * 删除单条消息
     */
    deleteMessage(id) {
        const messages = this.getAllMessages();
        const index = messages.findIndex(m => m.id === id);
        if (index !== -1) {
            messages.splice(index, 1);
            this.set('chara_db_messages', messages);
            return true;
        }
        return false;
    }

    /**
     * 添加消息到消息总线
     * @param {Object} payload {sender_id, receiver_id, content, type}
     */
    addMessage(payload) {
        const messages = this.getAllMessages();
        const newMessage = {
            id: window.utils.generateUUID(),
            timestamp: Date.now(),
            is_recalled: false,
            read_status: {},
            ...payload // 包含 sender_id, receiver_id, content, type
        };
        messages.push(newMessage);
        this.set('chara_db_messages', messages);
        return newMessage;
    }

    /**
     * 获取特定角色对象
     */
    getCharacter(id) {
        const db = this.get('chara_db_characters', {});
        return db[id] || null;
    }

    /**
     * 更新角色状态（深度合并）
     */
    updateCharacter(id, data) {
        const db = this.get('chara_db_characters', {});
        const current = db[id] || {};
        db[id] = window.utils.deepMerge(current, data);
        this.set('chara_db_characters', db);
        return db[id];
    }

    /**
     * 删除特定角色
     */
    deleteCharacter(id) {
        const db = this.get('chara_db_characters', {});
        if (db[id]) {
            delete db[id];
            this.set('chara_db_characters', db);
            return true;
        }
        return false;
    }

    /**
     * 清空特定会话的所有消息
     * @param {string} targetId 对方角色 ID
     */
    clearMessagesBySession(targetId) {
        let messages = this.getAllMessages();
        const isMe = (id) => id === 'user' || id === 'me' || id === 'my';
        messages = messages.filter(m =>
            !((isMe(m.sender_id) && m.receiver_id === targetId) ||
                (m.sender_id === targetId && isMe(m.receiver_id)))
        );
        this.set('chara_db_messages', messages);
    }
}


// 实例化并挂载到 window
window.sysStore = new Store();