const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\ui\\views_moments.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the compressed likes template
const bad = `return \`<div class="moments-likes-row">\\r\\n            <span class="moments-likes-icon">\\u2661</span>\\r\\n            <span class="moments-likes-names">\${names}</span>\\r\\n        </div>\``;

const good = `return \`<div class="moments-likes-row">
            <span class="moments-likes-icon">\u2661</span>
            <span class="moments-likes-names">\${names}</span>
        </div>\``;

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed likes template');
} else {
    console.log('Target not found');
}
