const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the mangled line
const badStr = `public_relation: rel.char_to_user_public_relation, // [Fix] Legacy Alignment\\r\\n                char_to_user_public_relation: rel.char_to_user_public_relation, // 用户身份\\r\\n                user_to_char_public_relation: rel.user_to_char_public_relation, // 角色身份`;

const goodStr = `public_relation: rel.char_to_user_public_relation, // [Fix] Legacy Alignment\r\n                char_to_user_public_relation: rel.char_to_user_public_relation, // 用户身份\r\n                user_to_char_public_relation: rel.user_to_char_public_relation, // 角色身份`;

if (content.includes(badStr)) {
    content = content.replace(badStr, goodStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed mangled lines in index.js');
} else {
    console.log('Target string not found');
}
