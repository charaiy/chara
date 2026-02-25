const fs = require('fs');

function fixCss() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\css\\apps\\moments.css';
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove pointer cursor from whole bg
    content = content.replace('.moments-cover-bg {\r\n    width: 100%;\r\n    height: 280px;\r\n    background-color: #2c3e50;\r\n    background-size: cover;\r\n    background-position: center;\r\n    cursor: pointer;\r\n    position: relative;\r\n}',
        '.moments-cover-bg {\r\n    width: 100%;\r\n    height: 280px;\r\n    background-color: #2c3e50;\r\n    background-size: cover;\r\n    background-position: center;\r\n    position: relative;\r\n}');

    // unix style fallback
    content = content.replace('.moments-cover-bg {\n    width: 100%;\n    height: 280px;\n    background-color: #2c3e50;\n    background-size: cover;\n    background-position: center;\n    cursor: pointer;\n    position: relative;\n}',
        '.moments-cover-bg {\n    width: 100%;\n    height: 280px;\n    background-color: #2c3e50;\n    background-size: cover;\n    background-position: center;\n    position: relative;\n}');

    fs.writeFileSync(filePath, content, 'utf8');
}

function fixIndex() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix the visibility label setting in index.js for contact picker
    // When "确定" is clicked, we want value to be '部分可见', not '私密'
    // Previous script set label perfectly but the component UI must match
    const cycleOld = `        if (cur === '\\u516c\\u5f00') { \n            el.value = '\\u79c1\\u5bc6'; label.textContent = '\\u79c1\\u5bc6'; State.momentsVisibleTo = []; \n        } else if (cur === '\\u79c1\\u5bc6') { \n            el.value = '\\u90e8\\u5206\\u53ef\\u89c1'; label.textContent = '\\u90e8\\u5206\\u53ef\\u89c1'; State.momentsVisibleTo = [];\n            this._openContactPicker(); \n        } else { \n            el.value = '\\u516c\\u5f00'; label.textContent = '\\u516c\\u5f00'; State.momentsVisibleTo = []; \n        }`;

    const cycleOld2 = `        if (cur === '\\u516c\\u5f00') { \r\n            el.value = '\\u79c1\\u5bc6'; label.textContent = '\\u79c1\\u5bc6'; State.momentsVisibleTo = []; \r\n        } else if (cur === '\\u79c1\\u5bc6') { \r\n            el.value = '\\u90e8\\u5206\\u53ef\\u89c1'; label.textContent = '\\u90e8\\u5206\\u53ef\\u89c1'; State.momentsVisibleTo = [];\r\n            this._openContactPicker(); \r\n        } else { \r\n            el.value = '\\u516c\\u5f00'; label.textContent = '\\u516c\\u5f00'; State.momentsVisibleTo = []; \r\n        }`;

    const cycleNew = `        if (cur === '\\u516c\\u5f00') { 
            el.value = '\\u79c1\\u5bc6'; label.textContent = '\\u79c1\\u5bc6'; State.momentsVisibleTo = []; 
        } else if (cur === '\\u79c1\\u5bc6') { 
            el.value = '\\u90e8\\u5206\\u53ef\\u89c1'; label.textContent = '\\u90e8\\u5206\\u53ef\\u89c1'; State.momentsVisibleTo = [];
            
            // Add a slight delay to ensure the UI updates before the picker blocks the thread
            setTimeout(() => {
                window.WeChat.App._openContactPicker(); 
            }, 10);
            
        } else { 
            el.value = '\\u516c\\u5f00'; label.textContent = '\\u516c\\u5f00'; State.momentsVisibleTo = []; 
        }`;

    if (content.includes(cycleOld)) {
        content = content.replace(cycleOld, cycleNew);
    } else if (content.includes(cycleOld2)) {
        content = content.replace(cycleOld2, cycleNew.replace(/\n/g, '\r\n'));
    }

    // Fix _openContactPicker logic when cancelling
    // Currently, if we close by clicking outside or '取消', it leaves it as "部分可见" but 0 contacts
    // We want it to be "公开" if cancelled with 0 contacts. Oh wait, it already cancels without changing if clicking outside?
    // Let's modify the picker cancel to revert if 0 selected.

    const pickerOldClose = `        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });`;
    const pickerNewClose = `        modal.addEventListener('click', (e) => { 
            if (e.target === modal) {
                modal.remove(); 
                if(!State.momentsVisibleTo || State.momentsVisibleTo.length === 0) {
                     const el = document.getElementById('wx-moments-compose-visibility');
                     const label = document.getElementById('wx-moments-visibility-label');
                     if(el && label) {
                         el.value = '\\u516c\\u5f00'; label.textContent = '\\u516c\\u5f00';
                     }
                }
            } 
        });`;
    content = content.replace(pickerOldClose, pickerNewClose);
    content = content.replace(pickerOldClose, pickerNewClose); // some files have duplicate occurrences of this logic? No, only one.

    const pickerBtnCloseOld = `<span onclick="document.getElementById('moments-contact-picker').remove();"`;
    const pickerBtnCloseNew = `<span onclick="document.getElementById('moments-contact-picker').remove(); if(!window.WeChat.State.momentsVisibleTo || window.WeChat.State.momentsVisibleTo.length === 0) { const el = document.getElementById('wx-moments-compose-visibility'); const lab = document.getElementById('wx-moments-visibility-label'); if(el && lab) { el.value = '\\u516c\\u5f00'; lab.textContent = '\\u516c\\u5f00'; } }"`;
    content = content.replace(pickerBtnCloseOld, pickerBtnCloseNew);

    fs.writeFileSync(filePath, content, 'utf8');
}

fixCss();
fixIndex();
console.log("Done");
