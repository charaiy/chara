const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. First replacement
const oldStr1 = `            // [Fix] Preserve Relationship Panel Scroll
            const relPanelScrollEl = document.querySelector('.wx-char-panel-scrollable');
            const relPanelScrollTop = relPanelScrollEl ? relPanelScrollEl.scrollTop : null;`;

const newStr1 = `            // [Fix] Preserve Relationship Panel Scroll
            const relPanelScrollEl = document.querySelector('.wx-char-panel-scrollable');
            const relPanelScrollTop = relPanelScrollEl ? relPanelScrollEl.scrollTop : null;

            // [Fix] Preserve Moments Scroll
            const momentsEl = document.getElementById('wx-view-moments');
            const momentsProfileEl = document.getElementById('wx-view-moments-profile');
            const momentsScrollTop = momentsEl ? momentsEl.scrollTop : (momentsProfileEl ? momentsProfileEl.scrollTop : null);`;

if (content.includes(oldStr1.replace(/\n/g, '\r\n'))) {
    content = content.replace(oldStr1.replace(/\n/g, '\r\n'), newStr1.replace(/\n/g, '\r\n'));
} else if (content.includes(oldStr1)) {
    content = content.replace(oldStr1, newStr1);
} else {
    console.log("oldStr1 not found");
}

// 2. Second replacement
const oldStr2 = `            // 1. Restore Relationship Panel Scroll
            if (relPanelScrollTop !== null) {
                const newRelPanel = document.querySelector('.wx-char-panel-scrollable');
                if (newRelPanel) {
                    newRelPanel.scrollTop = relPanelScrollTop;
                }
            }

            // 2. Chat Session Scroll`;

const newStr2 = `            // 1. Restore Relationship Panel Scroll
            if (relPanelScrollTop !== null) {
                const newRelPanel = document.querySelector('.wx-char-panel-scrollable');
                if (newRelPanel) {
                    newRelPanel.scrollTop = relPanelScrollTop;
                }
            }

            // [Restore Moments Scroll]
            if (momentsScrollTop !== null) {
                const newMomentsEl = document.getElementById('wx-view-moments');
                const newMomentsProfileEl = document.getElementById('wx-view-moments-profile');
                if (newMomentsEl) newMomentsEl.scrollTop = momentsScrollTop;
                if (newMomentsProfileEl) newMomentsProfileEl.scrollTop = momentsScrollTop;
            }

            // 2. Chat Session Scroll`;

if (content.includes(oldStr2.replace(/\n/g, '\r\n'))) {
    content = content.replace(oldStr2.replace(/\n/g, '\r\n'), newStr2.replace(/\n/g, '\r\n'));
} else if (content.includes(oldStr2)) {
    content = content.replace(oldStr2, newStr2);
} else {
    console.log("oldStr2 not found");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done mapping scrolls');
