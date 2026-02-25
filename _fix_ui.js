const fs = require('fs');

function fixViewsMoments() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\ui\\views_moments.js';
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove old settingsBtnHtml definition and usage
    content = content.replace(/const settingsBtnHtml.*?:\s*'';/s, '');
    content = content.replace(/\$\{settingsBtnHtml\}/g, '');

    // Transform timeline cover bg onclick
    const mainTimelineCoverOld = `<div class="moments-cover-bg" \r\n                         style="\${userCover ? \`background-image:url(\${userCover})\` : ''}"\r\n                         onclick="window.WeChat.App.changeMomentsCover('USER_SELF')">\r\n                        \${!userCover ? '<div class="moments-cover-placeholder">点击更换封面</div>' : ''}\r\n                    </div>`;
    const mainTimelineCoverNew = `<div class="moments-cover-bg" \r\n                         style="\${userCover ? \`background-image:url(\${userCover})\` : ''}">\r\n                        <div class="moments-cover-clickable-center" onclick="window.WeChat.App.changeMomentsCover('USER_SELF')">\r\n                            \${!userCover ? '点击更换封面' : ''}\r\n                        </div>\r\n                    </div>`;

    // Transform profile cover bg onclick
    const profileCoverOld = `<div class="moments-cover-bg" \r\n                         style="\${coverImage ? \`background-image:url(\${coverImage})\` : ''}"\r\n                         onclick="window.WeChat.App.changeMomentsCover('\${this.escapeQuote(targetId)}')">\r\n                        \${!coverImage ? '<div class="moments-cover-placeholder">点击更换封面</div>' : ''}\r\n                    </div>`;
    const profileCoverNew = `<div class="moments-cover-bg" \r\n                         style="\${coverImage ? \`background-image:url(\${coverImage})\` : ''}">\r\n                        <div class="moments-cover-clickable-center" onclick="window.WeChat.App.changeMomentsCover('\${this.escapeQuote(targetId)}')">\r\n                            \${!coverImage ? '点击更换封面' : ''}\r\n                        </div>\r\n                    </div>`;

    content = content.replace(mainTimelineCoverOld.replace(/\r\n/g, '\n'), mainTimelineCoverNew.replace(/\r\n/g, '\n'));
    content = content.replace(mainTimelineCoverOld, mainTimelineCoverNew);

    content = content.replace(profileCoverOld.replace(/\r\n/g, '\n'), profileCoverNew.replace(/\r\n/g, '\n'));
    content = content.replace(profileCoverOld, profileCoverNew);

    fs.writeFileSync(filePath, content, 'utf8');
}

function fixIndexJs() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\index.js';
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add rightIcon === 'settings'
    if (!content.includes('rightIcon === \'settings\'')) {
        const iconDone = `else if (rightIcon === 'done') rightBtnContent = \`<span style="color:var(--wx-green); font-size:16px; font-weight:600;">完成</span>\`;`;
        const iconSettings = `else if (rightIcon === 'settings') rightBtnContent = \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\`;\n        `;
        content = content.replace(iconDone, iconDone + '\n        ' + iconSettings);
    }

    // 2. Fix publish button wrap (min-width: 44px instead of width: 44px)
    const btnOld = `cursor:pointer; width: 44px;">\${rightBtnContent}`;
    const btnNew = `cursor:pointer; min-width: 44px; padding-left:4px;">\${rightBtnContent}`;
    content = content.replace(btnOld, btnNew);

    // 3. Set moments_profile right action
    const currentTabCodeOld = `            } else if (State.currentTab === 'moments_profile') {
                navTitle = '';
                contentHtml = Views.renderMomentsProfile(State.momentsProfileTarget || 'USER_SELF');
                rightIcon = null;
                showBack = true;`;

    const currentTabCodeNew = `            } else if (State.currentTab === 'moments_profile') {
                navTitle = '';
                contentHtml = Views.renderMomentsProfile(State.momentsProfileTarget || 'USER_SELF');
                if (State.momentsProfileTarget && State.momentsProfileTarget !== 'USER_SELF') {
                    rightIcon = 'settings';
                    rightAction = \`window.WeChat.App.openMomentsSettings('\${State.momentsProfileTarget}')\`;
                } else {
                    rightIcon = null;
                }
                showBack = true;`;
    content = content.replace(currentTabCodeOld.replace(/\n/g, '\r\n'), currentTabCodeNew.replace(/\n/g, '\r\n'));
    content = content.replace(currentTabCodeOld, currentTabCodeNew);

    // 4. Update cycleVisibility
    const cycleOld = `    cycleVisibility() {
        const el = document.getElementById('wx-moments-compose-visibility');
        const label = document.getElementById('wx-moments-visibility-label');
        if (!el || !label) return;
        const cur = el.value;
        if (cur === '\u516c\u5f00') { el.value = '\u79c1\u5bc6'; label.textContent = '\u79c1\u5bc6'; State.momentsVisibleTo = []; }
        else if (cur === '\u79c1\u5bc6') { this._openContactPicker(); }
        else { el.value = '\u516c\u5f00'; label.textContent = '\u516c\u5f00'; State.momentsVisibleTo = []; }
    }`;

    const cycleNew = `    cycleVisibility() {
        const el = document.getElementById('wx-moments-compose-visibility');
        const label = document.getElementById('wx-moments-visibility-label');
        if (!el || !label) return;
        const cur = el.value;
        if (cur === '\\u516c\\u5f00') { 
            el.value = '\\u79c1\\u5bc6'; label.textContent = '\\u79c1\\u5bc6'; State.momentsVisibleTo = []; 
        } else if (cur === '\\u79c1\\u5bc6') { 
            el.value = '\\u90e8\\u5206\\u53ef\\u89c1'; label.textContent = '\\u90e8\\u5206\\u53ef\\u89c1'; State.momentsVisibleTo = [];
            this._openContactPicker(); 
        } else { 
            el.value = '\\u516c\\u5f00'; label.textContent = '\\u516c\\u5f00'; State.momentsVisibleTo = []; 
        }
    }`;
    content = content.replace(cycleOld.replace(/\n/g, '\r\n'), cycleNew.replace(/\n/g, '\r\n'));
    content = content.replace(cycleOld, cycleNew);

    fs.writeFileSync(filePath, content, 'utf8');
}

function fixCss() {
    const filePath = 'c:\\Users\\74497\\Desktop\\chara\\css\\apps\\moments.css';
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove old .moments-profile-settings-btn
    content = content.replace(/\/\* ==========================================\s+个人朋友圈设置按钮\s+========================================== \*\/\s+\.moments-profile-settings-btn \{[\s\S]*?opacity: 0\.7;\s+\}/, '');

    // Add .moments-cover-clickable-center
    const newCss = `
/* ==========================================
   Clickable Center Area For Cover
   ========================================== */
.moments-cover-clickable-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    cursor: pointer;
    z-index: 1;
}
`;
    if (!content.includes('.moments-cover-clickable-center')) {
        content += newCss;
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

fixViewsMoments();
fixIndexJs();
fixCss();
console.log('Fixes applied.');
