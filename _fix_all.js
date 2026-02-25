const fs = require('fs');

// =============================================
// 1. Fix views_modals.js: color + section order
// =============================================
const modalsPath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\ui\\views_modals.js';
let modals = fs.readFileSync(modalsPath, 'utf8');

// 1a. Swap section order: move 角色→用户 above 用户→角色
// Find both sections and swap them
const sec1Start = '<!-- Character Lens (Flat) -->';
const sec1End = '</div>\r\n\r\n                    <!-- User Lens (Flat) -->';
const sec2EndMarker = '<!-- Background Story -->';

const idx1 = modals.indexOf(sec1Start);
const idxSec2Start = modals.indexOf('<!-- User Lens (Flat) -->');
const idxSec2End = modals.indexOf(sec2EndMarker);

if (idx1 >= 0 && idxSec2Start >= 0 && idxSec2End >= 0) {
    // Extract section 1 (用户→角色) - from <!-- Character Lens --> to just before <!-- User Lens -->
    // We need to find the closing </div> of section 1 that comes right before <!-- User Lens -->
    const beforeSec1 = modals.substring(0, idx1);

    // Find the div wrapper that contains section 1
    // Section 1 starts from <!-- Character Lens (Flat) --> and ends with </div> before <!-- User Lens -->
    const sec1Content = modals.substring(idx1, idxSec2Start).trimEnd();
    // Remove the trailing newlines to get clean section boundary
    const cleanSec1 = sec1Content.replace(/\s+$/, '\r\n\r\n                    ');

    // Section 2 from <!-- User Lens (Flat) --> to just before <!-- Background Story -->
    const sec2Content = modals.substring(idxSec2Start, idxSec2End).trimEnd();
    const cleanSec2 = sec2Content.replace(/\s+$/, '\r\n\r\n                    ');

    const afterSec2 = modals.substring(idxSec2End);

    // Swap: put section 2 first, then section 1
    modals = beforeSec1 + cleanSec2 + cleanSec1 + afterSec2;
    console.log('Step 1a: Sections swapped');
} else {
    console.log('ERROR: Could not find section markers', idx1, idxSec2Start, idxSec2End);
}

// 1b. Change colors: blue (#0052d9) → coffee (#8B7355), purple (#7b1fa2) → lighter coffee (#A0896C)
modals = modals.replace(/border-left: 4px solid #0052d9/g, 'border-left: 4px solid #A0896C');
modals = modals.replace(/border-left: 4px solid #7b1fa2/g, 'border-left: 4px solid #8B7355');

fs.writeFileSync(modalsPath, modals, 'utf8');
console.log('Step 1b: Colors updated');

// =============================================
// 2. Fix clearRelationshipSettings in index.js:
//    Also delete from RelationshipGraph + rumors
// =============================================
const indexPath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
let index = fs.readFileSync(indexPath, 'utf8');

// 2a. Fix clearRelationshipSettings to also clear graph + rumors
const oldClear = `clearRelationshipSettings() {
        if (!State.pendingRelationship) return;

        // Reset to defaults
        State.pendingRelationship = {
            affection: 0.0,
            difficulty: 'normal',
            ladder_persona: [],
            public_relation: '',
            char_to_user_public_attitude: '',
            char_to_user_private_attitude: '',
            user_knows_char_private: false,
            user_to_char_public_attitude: '',
            user_to_char_private_attitude: '',
            char_knows_user_private: false,
            backstory: ''
        };

        if (window.os) window.os.showToast('设定已清空，请保存生效');
        this.render();
    },`;

const newClear = `clearRelationshipSettings() {
        if (!State.pendingRelationship) return;
        const sessionId = State.activeSessionId;

        // Reset to defaults
        State.pendingRelationship = {
            affection: 0.0,
            difficulty: 'normal',
            ladder_persona: [],
            public_relation: '',
            char_to_user_public_relation: '',
            user_to_char_public_relation: '',
            char_to_user_public_attitude: '',
            char_to_user_private_attitude: '',
            user_knows_char_private: false,
            user_to_char_public_attitude: '',
            user_to_char_private_attitude: '',
            char_knows_user_private: false,
            backstory: ''
        };

        // 同步删除关系网数据
        if (sessionId && window.WeChat?.Services?.RelationshipGraph) {
            window.WeChat.Services.RelationshipGraph.deleteRelationship(sessionId, 'USER_SELF');
            console.log('[App] 已从关系网删除:', sessionId);
        }

        // 同步清除该角色相关的所有 rumor（认知修正）
        if (sessionId) {
            const rumors = window.sysStore?.get('rg_rumors_v1') || {};
            const keysToDelete = Object.keys(rumors).filter(key => {
                const parts = key.split('|');
                if (parts.length !== 2) return false;
                const pairId = parts[1];
                return pairId.includes(sessionId);
            });
            keysToDelete.forEach(k => delete rumors[k]);
            if (keysToDelete.length > 0) {
                window.sysStore.set('rg_rumors_v1', rumors);
                console.log('[App] 已清除相关 rumor:', keysToDelete.length, '条');
            }
        }

        if (window.os) window.os.showToast('设定已清空，请保存生效');
        this.render();
    },`;

const nOldClear = oldClear.replace(/\r\n/g, '\n');
const nIndex = index.replace(/\r\n/g, '\n');
if (nIndex.includes(nOldClear)) {
    index = nIndex.replace(nOldClear, newClear.replace(/\r\n/g, '\n'));
    index = index.replace(/\n/g, '\r\n');
    console.log('Step 2a: clearRelationshipSettings fixed');
} else {
    console.log('ERROR: clearRelationshipSettings not found');
}

// 2b. Fix performClearChatHistory to also delete graph + rumors + moments when !isKeep
const oldPerformClear = `                if (window.os) window.os.showToast('聊天记录与所有关系设定已清除');`;
const newPerformClear = `                // 同步删除关系网、rumor 和朋友圈数据
                if (window.WeChat?.Services?.RelationshipGraph) {
                    window.WeChat.Services.RelationshipGraph.deleteRelationship(sessionId, 'USER_SELF');
                }
                // 清除该角色相关的所有 rumor
                const rumors = window.sysStore?.get('rg_rumors_v1') || {};
                Object.keys(rumors).filter(key => key.split('|')[1]?.includes(sessionId))
                    .forEach(k => delete rumors[k]);
                window.sysStore.set('rg_rumors_v1', rumors);

                // 清除该角色的所有朋友圈内容
                if (window.WeChat?.Services?.Moments) {
                    const allPosts = window.WeChat.Services.Moments.getPosts({ authorId: sessionId, limit: 999 });
                    allPosts.forEach(p => window.WeChat.Services.Moments.deletePost(p.id));
                    console.log('[App] 已清除朋友圈:', allPosts.length, '条');
                }

                if (window.os) window.os.showToast('聊天记录与所有关系设定已清除');`;

if (index.includes(oldPerformClear)) {
    index = index.replace(oldPerformClear, newPerformClear);
    console.log('Step 2b: performClearChatHistory fixed');
} else {
    console.log('ERROR: performClearChatHistory toast not found');
}

fs.writeFileSync(indexPath, index, 'utf8');
console.log('All done!');
