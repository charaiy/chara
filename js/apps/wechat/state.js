/**
 * js/apps/wechat/state.js
 * 微信应用状态管理
 * [Refactor] Extracted from index.js for better organization
 * 
 * 第一步：只提取 DEFAULT_SUMMARY_PROMPT，State 暂时保留在 index.js 中
 */

const DEFAULT_SUMMARY_PROMPT = `禁止私自编造不存在的内容!
如果遇到复杂的请如实直述，禁止去编造、改动!
**【内容核心 (最高优先级)】**: 你的summary【必须】专注于以下几点，请直接输出(不需要回答我好的）：

总结规则：
进行summary时，必须精准提取内容，不遗漏任何锚点的重要细节，完美判断角色和用户的关系发展，必须直白且如实总结时间节点和故事发展，每件事的叙述控制在最多50字左右，此外再包含重要日期+时间节点即可。

长期记忆summary格式为：
当前年份日期星期时间/具体地点，角色的第三人称总结（请使用角色名或"他/她"来称呼角色，使用"你"或用户姓名来称呼用户），禁止太过于主观!

## 示例："线上(线下）/2025年4月2日8:30，星期三，(角色名)和你聊了关于早餐的话题。"

## 精炼记忆时禁止偷懒输出token count，必须进行正确的精炼

## 图片禁止总结为"发了一张图片/个人照片"，必须说明是什么图片，如果只是表情包则禁止总结在其中!!    
## 语音通话特别说明：如果记录中出现 [语音通话] 标签的消息，说明这些对话是通话期间产生的，请将其统一总结为"我们进行了一次语音通话，聊了xx"，禁止将其总结为文字聊天后再进行通话!!`;

// Expose Defaults globally
window.WeChat = window.WeChat || {};
window.WeChat.Defaults = window.WeChat.Defaults || {
    SUMMARY_PROMPT: DEFAULT_SUMMARY_PROMPT
};
