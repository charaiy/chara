/**
 * utils.js
 * General utility functions
 */

window.utils = {
    getFormattedTime: function () {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    getFormattedDate: function () {
        const now = new Date();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[now.getDay()];
        return `周${weekDay} ${month}月${date}日`;
    },

    generateId: function () {
        return Math.random().toString(36).substr(2, 9);
    }
};
