/**
 * store.js
 * LocalStorage wrapper for persistence
 */

const APP_PREFIX = 'chara_os_';

class Store {
    constructor() {
        this.cache = {};
    }

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
}

window.sysStore = new Store();
