const fs = require('fs');
const filePath = 'c:\\Users\\74497\\Desktop\\chara\\js\\apps\\wechat\\ui\\views_modals.js';
let content = fs.readFileSync(filePath, 'utf8');

// 需要把两个区域的态度字段交换
// 用户→角色 区域应包含：用户身份 + 用户的态度 + 用户的想法
// 角色→用户 区域应包含：角色身份 + 角色的态度 + 角色的想法

// 定位"用户→角色"区域的态度部分 (line 709-723)
// 当前: char_to_user_public_attitude, user_knows_char_private, char_to_user_private_attitude
// 应改: user_to_char_public_attitude, char_knows_user_private, user_to_char_private_attitude

// 定位"角色→用户"区域的态度部分 (line 739-753)
// 当前: user_to_char_public_attitude, char_knows_user_private, user_to_char_private_attitude
// 应改: char_to_user_public_attitude, user_knows_char_private, char_to_user_private_attitude

// Section 1 (用户→角色): attitude block
const sec1AttOld = `                        <!-- 2. Public Attitude -->
                        <div style="margin-bottom: 12px;">
                            \${this._renderFieldHeader('对外表现态度', 'wx-rel-char-pub-att')}
                            <textarea id="wx-rel-char-pub-att" placeholder="平时表现出来的样子..." \${this._lockAttr('wx-rel-char-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_public_attitude', this.value, null, true)">\${rel.char_to_user_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            \${this._renderFieldHeader(\`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-char-knows" \${rel.user_knows_char_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('user_knows_char_private', this.checked, null, true)">用户已识破</label></div>\`, 'wx-rel-char-pvt-att')}
                            <textarea id="wx-rel-char-pvt-att" placeholder="其实心里是这么想的..." \${this._lockAttr('wx-rel-char-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_private_attitude', this.value, null, true)">\${rel.char_to_user_private_attitude || ''}</textarea>
                        </div>`;

// Section 1 should now show USER's attitude fields
const sec1AttNew = `                        <!-- 2. Public Attitude (用户对角色的态度) -->
                        <div style="margin-bottom: 12px;">
                            \${this._renderFieldHeader('对外表现态度', 'wx-rel-user-pub-att')}
                            <textarea id="wx-rel-user-pub-att" placeholder="用户平时对角色表现出来的样子..." \${this._lockAttr('wx-rel-user-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_public_attitude', this.value, null, true)">\${rel.user_to_char_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            \${this._renderFieldHeader(\`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-user-knows" \${rel.char_knows_user_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('char_knows_user_private', this.checked, null, true)">角色已识破</label></div>\`, 'wx-rel-user-pvt-att')}
                            <textarea id="wx-rel-user-pvt-att" placeholder="用户其实心里是这么想的..." \${this._lockAttr('wx-rel-user-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_private_attitude', this.value, null, true)">\${rel.user_to_char_private_attitude || ''}</textarea>
                        </div>`;

// Section 2 attitude block
const sec2AttOld = `                        <!-- 2. Public Attitude -->
                        <div style="margin-bottom: 12px;">
                            \${this._renderFieldHeader('对外表现态度', 'wx-rel-user-pub-att')}
                            <textarea id="wx-rel-user-pub-att" placeholder="平时表现出来的样子..." \${this._lockAttr('wx-rel-user-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_public_attitude', this.value, null, true)">\${rel.user_to_char_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            \${this._renderFieldHeader(\`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-user-knows" \${rel.char_knows_user_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('char_knows_user_private', this.checked, null, true)">角色已识破</label></div>\`, 'wx-rel-user-pvt-att')}
                            <textarea id="wx-rel-user-pvt-att" placeholder="其实心里是这么想的..." \${this._lockAttr('wx-rel-user-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('user_to_char_private_attitude', this.value, null, true)">\${rel.user_to_char_private_attitude || ''}</textarea>
                        </div>`;

// Section 2 should now show CHARACTER's attitude fields
const sec2AttNew = `                        <!-- 2. Public Attitude (角色对用户的态度) -->
                        <div style="margin-bottom: 12px;">
                            \${this._renderFieldHeader('对外表现态度', 'wx-rel-char-pub-att')}
                            <textarea id="wx-rel-char-pub-att" placeholder="角色平时对用户表现出来的样子..." \${this._lockAttr('wx-rel-char-pub-att')}
                                style="width: 100%; height: 50px; background: #fdfdfd; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 10px; font-size: 14px; resize: none; outline: none; line-height: 1.4; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_public_attitude', this.value, null, true)">\${rel.char_to_user_public_attitude || ''}</textarea>
                        </div>

                        <!-- 3. True Thought & Checkbox -->
                        <div style="margin-top: 16px;">
                            \${this._renderFieldHeader(\`<div style="display:flex; align-items:center; white-space:nowrap;"><span style="color: #d32f2f; margin-right:12px;">内心真实想法 (秘密)</span><label style="font-weight:400; font-size:9px; color:#999; display:flex; align-items:center; cursor:pointer; background:none; padding:0; border:none;"><input type="checkbox" id="wx-rel-char-knows" \${rel.user_knows_char_private ? 'checked' : ''} style="margin-right:4px; width:12px; height:12px; accent-color:#999; opacity:0.6;" onclick="window.WeChat.App.updatePendingRelationship('user_knows_char_private', this.checked, null, true)">用户已识破</label></div>\`, 'wx-rel-char-pvt-att')}
                            <textarea id="wx-rel-char-pvt-att" placeholder="角色其实心里是这么想的..." \${this._lockAttr('wx-rel-char-pvt-att')}
                                style="width: 100%; height: 54px; background: #fffafa; border: 1px solid #ffcdd2; border-radius: 10px; padding: 10px; font-size: 14px; resize: none; outline: none; line-height: 1.5; transition: all 0.2s;"
                                oninput="window.WeChat.App.updatePendingRelationship('char_to_user_private_attitude', this.value, null, true)">\${rel.char_to_user_private_attitude || ''}</textarea>
                        </div>`;

// Normalize line endings for matching
const normalize = s => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const normContent = normalize(content);
const normOld1 = normalize(sec1AttOld);
const normOld2 = normalize(sec2AttOld);

if (normContent.includes(normOld1) && normContent.includes(normOld2)) {
    // Replace section 1 first (appears earlier in file)
    let result = normContent.replace(normOld1, normalize(sec1AttNew));
    result = result.replace(normOld2, normalize(sec2AttNew));
    // Restore CRLF
    result = result.replace(/\n/g, '\r\n');
    fs.writeFileSync(filePath, result, 'utf8');
    console.log('SUCCESS: Swapped attitude fields between sections');
} else {
    if (!normContent.includes(normOld1)) console.log('ERROR: Section 1 block not found');
    if (!normContent.includes(normOld2)) console.log('ERROR: Section 2 block not found');
}
