/**
 * js/utils/helpers.js
 * General utility functions
 * Core system utilities (UUID, Object manipulation)
 */

window.utils = window.utils || {};

Object.assign(window.utils, {
    generateId: function () {
        return Math.random().toString(36).substr(2, 9);
    },

    generateUUID: function () {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    isObject: function (item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    },

    deepMerge: function (target, source) {
        const output = { ...target };
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
});
