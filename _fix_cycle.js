const fs = require('fs');

function fix() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure we replace the cycleVisibility logic to "部分可见" when opening contact picker
    const oldCode = `        if (cur === '公开') { el.value = '私密'; label.textContent = '私密'; State.momentsVisibleTo = []; }
        else if (cur === '私密') { this._openContactPicker(); }
        else { el.value = '公开'; label.textContent = '公开'; State.momentsVisibleTo = []; }`;

    const oldCode2 = `        if (cur === '公开') { el.value = '私密'; label.textContent = '私密'; State.momentsVisibleTo = []; }
        else if (cur === '私密') { 
            el.value = '部分可见'; label.textContent = '部分可见'; State.momentsVisibleTo = [];
            
            // Add a slight delay to ensure the UI updates before the picker blocks the thread
            setTimeout(() => {
                window.WeChat.App._openContactPicker(); 
            }, 10);
            
        } else { 
            el.value = '公开'; label.textContent = '公开'; State.momentsVisibleTo = []; 
        }`;

    const newCode = `        if (cur === '公开') { 
            el.value = '私密'; label.textContent = '私密'; State.momentsVisibleTo = []; 
        }
        else if (cur === '私密') { 
            el.value = '部分可见'; label.textContent = '部分可见'; State.momentsVisibleTo = []; 
            setTimeout(() => window.WeChat.App._openContactPicker(), 10); 
        }
        else { 
            el.value = '公开'; label.textContent = '公开'; State.momentsVisibleTo = []; 
        }`;

    if (content.includes(oldCode)) {
        content = content.replace(oldCode, newCode);
    } else if (content.includes(oldCode2)) {
        content = content.replace(oldCode2, newCode);
    } else {
        // Handle line endings
        const oldCodeCRLF = oldCode.replace(/\n/g, '\r\n');
        if (content.includes(oldCodeCRLF)) {
            content = content.replace(oldCodeCRLF, newCode.replace(/\n/g, '\r\n'));
        } else {
            const oldCode2CRLF = oldCode2.replace(/\n/g, '\r\n');
            if (content.includes(oldCode2CRLF)) {
                content = content.replace(oldCode2CRLF, newCode.replace(/\n/g, '\r\n'));
            }
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

fix();
console.log('Fixed cycleVisibility logic');
