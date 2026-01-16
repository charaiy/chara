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
        } catch (e) { }
    }

    remove(key) {
        delete this.cache[key];
        localStorage.removeItem(APP_PREFIX + key);
    }
}

window.sysStore = new Store();
