const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\services\\generators.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the mangled line and expand it
const badPattern = /4\. \*\*关系字段（按实体分组）\*\*：\\r\\n.*?必须少于30字\)/;
const match = content.match(badPattern);

if (match) {
    const goodText = `4. **关系字段（按实体分组）**：
   **用户侧**：
   - char_to_user_public_relation: 用户在关系中的身份/角色（如：主人、老板、同学，少于10字）
   - user_to_char_public_attitude: 用户对角色**表现出来**的态度（少于30字）
   - user_to_char_private_attitude: 用户对角色**内心真实**的想法（少于30字）
   **角色侧**：
   - user_to_char_public_relation: 角色在关系中的身份/角色（如：私人助手、朋友，少于10字）
   - char_to_user_public_attitude: 角色对用户**表现出来**的态度（少于30字）
   - char_to_user_private_attitude: 角色对用户**内心真实**的想法（少于30字）
   - backstory: **关键**！两人的过往背景故事简述（如何相识、重要回忆），必须少于100字，作为一切关系的基础。
5. **好感度阶段(ladder_persona)**：⚠️ 这是**角色（非用户）**在不同好感度下的行为表现！生成5个阶段，每个阶段必须严格遵循角色原有性格底色，描述角色在该好感度下对用户的行为特征变化。
   - 每个阶段：affection_threshold(0, 20, 50, 80, 100) 和 content(简洁描述**角色**在该阶段的行为特征，必须少于30字)`;

    content = content.replace(match[0], goodText);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed generator prompt');
} else {
    console.log('Pattern not found');
}
