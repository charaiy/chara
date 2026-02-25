const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\services\\moments.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到被压缩成一行的 prompt 并替换为正确的多行模板字符串
const badLine = `const prompt = \`# 朋友圈点赞/评论决策\\r\\n你现在是 \\\\"$\{reactor.name}\\\\"。\\r\\n你看到了 \\\\"$\{postAuthor.name}\\\\" 发布的内容: \\\\"$\{post.content}\\\\"。\\r\\n\\r\\n背景:\\r\\n- 你的性格: $\{reactor.main_persona || '正常'}\\r\\n- 你们的关系: $\{relInfo.summary}\\r\\n- 你对TA的视角: $\{relInfo.reactorView || '普通朋友'}\\r\\n$\{existingComments.length > 0 ? '\\\\\\\\n已有的评论:\\\\\\\\n' + existingComments.join('\\\\\\\\n') : ''}\\r\\n\\r\\n任务: 决定是否点赞或评论。\\r\\n1. 必须完全符合人设。高冷的人很少评论，恋人通常会点赞。\\r\\n2. 评论要简短(15字内)。\\r\\n\\r\\n输出格式(JSON):\\r\\n{ \\\\"like\\\\": true/false, \\\\"comment\\\\": \\\\"内容或空\\\\" }\\r\\n只输出 JSON。\``;

const goodBlock = `const prompt = \`# 朋友圈点赞/评论决策
你现在是 "\${reactor.name}"。
你看到了 "\${postAuthor.name}" 发布的内容: "\${post.content}"。

背景:
- 你的性格: \${reactor.main_persona || '正常'}
- 你们的关系: \${relInfo.summary}
- 你对TA的视角: \${relInfo.reactorView || '普通朋友'}
\${existingComments.length > 0 ? '\\n已有的评论:\\n' + existingComments.join('\\n') : ''}

任务: 决定是否点赞或评论。
1. 必须完全符合人设。高冷的人很少评论，恋人通常会点赞。
2. 评论要简短(15字内)。

输出格式(JSON):
{ "like": true/false, "comment": "内容或空" }
只输出 JSON。\``;

// Use a simpler approach: find the line that starts with the compressed prompt
const lines = content.split('\n');
let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const prompt = `# 朋友圈点赞/评论决策\\r\\n')) {
        targetIdx = i;
        break;
    }
}

if (targetIdx >= 0) {
    // Get the indentation
    const indent = lines[targetIdx].match(/^(\s*)/)[1];
    const goodLines = goodBlock.split('\n').map((line, idx) => {
        if (idx === 0) return indent + line;
        return line;
    });
    lines[targetIdx] = goodLines.join('\n');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Fixed prompt at line', targetIdx + 1);
} else {
    console.log('Target line not found');
}
