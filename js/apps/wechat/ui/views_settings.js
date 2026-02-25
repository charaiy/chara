/**
 * js/apps/wechat/ui/views_settings.js
 * 设置视图渲染服务 - 负责渲染各种设置页面
 * 
 * 职责：
 * - 渲染角色资料设置页面
 * - 渲染用户个人资料设置页面
 * - 渲染角色面板（好感度、心情、心声等）
 * - 渲染关系设置面板
 * - 渲染状态历史面板
 * - 渲染语音视频设置页面
 * 
 * 主要页面：
 * 1. 角色资料设置（persona_settings）：
 *    - 基本信息（姓名、昵称、备注等）
 *    - 人设编辑
 *    - 其他设置（性别、物种、地区等）
 * 
 * 2. 用户个人资料（my_profile_settings）：
 *    - 用户基本信息
 *    - 用户人设
 * 
 * 3. 角色面板（character_panel）：
 *    - 显示角色当前状态（好感度、心情等）
 *    - 心声显示
 *    - 当前服装、位置、日程
 * 
 * 4. 关系设置（relationship_panel）：
 *    - 公开关系设置
 *    - 双方看法设置
 * 
 * 5. 语音视频设置（voice_video_settings）：
 *    - 语音设置（语音ID、语速等）
 *    - 视频通话设置
 * 
 * 依赖：
 * - window.sysStore: 数据存储
 * - window.WeChat.Components: 通用组件
 * - window.WeChat.App: 应用主对象
 */

window.WeChat = window.WeChat || {};


window.WeChat.Views = Object.assign(window.WeChat.Views || {}, {
    renderUserProfile(userId, name = 'User') {

        // Fetch Real Data
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const user = {
            id: userId,
            name: char?.name || name,
            avatar: char?.avatar || 'assets/images/avatar_placeholder.png',
            nickname: char?.nickname || '无',
            realName: char?.real_name || '未知',
            // Default display if not set: generate consistent hash-based ID for viewing, or random? 
            // User requested default logic. Since we changed save logic, let's just display what is there.
            // If missing, show placeholder that hints it will be generated.
            wxid: char?.wxid || ('wxid_' + (char?.id || userId).slice(-8)),
            gender: char?.gender || '',
            region: char?.region || '未知地区',
            age: char?.settings?.age || ''
        };

        const genderHtml = this._renderGenderIcon(user.gender);

        return `
            <div class="wx-view-container" id="wx-view-profile" style="background-color: var(--wx-bg);">
                <div class="wx-nav-spacer"></div>
                
                <!-- Profile Header -->
                <div style="background: var(--wx-cell-bg); padding: 24px 24px 24px 24px; display: flex; align-items: flex-start; margin-bottom: 0;">
                    <img src="${user.avatar}" style="width: 60px; height: 60px; border-radius: 6px; margin-right: 16px; object-fit: cover;" onerror="this.src='assets/images/avatar_placeholder.png'">
                    <div style="flex: 1; min-width: 0; padding-top: 2px;">
                        <div style="font-size: 20px; font-weight: 500; color: var(--wx-text); margin-bottom: 6px; display: flex; align-items: center; line-height: 1.1;">
                            ${user.name}
                            ${genderHtml}
                            ${user.age ? `<span style="font-size: 12px; color: var(--wx-text-sec); background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 4px; margin-left: 6px; font-weight: normal;">${user.age}岁</span>` : ''}
                        </div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 3px; opacity: 0.8;">微信号：${user.wxid}</div>
                        <div style="font-size: 13px; color: var(--wx-text-sec); opacity: 0.8;">真名：${user.realName}</div>
                    </div>
                </div>

                <!-- Friend Info Section -->
                <div class="wx-cell-group" style="margin-top: 0; margin-bottom: 0;">
                     <div class="wx-cell" onclick="window.WeChat.App.openPersonaSettings('${user.id}')" style="padding: 12px 24px 12px 24px; cursor: pointer;">
                        <div class="wx-cell-content" style="font-size: 17px; font-weight: 400; color: var(--wx-text);">朋友资料</div>
                         <div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                         </div>
                    </div>
                </div>


                <!-- Description Block (Full Width Separator) -->
                <div style="background-color: var(--wx-cell-bg);">
                    <!-- Full width separator -->
                    <div style="height: 1px; background-color: rgba(0,0,0,0.05); width: 100%;"></div>
                    <!-- Text container with padding -->
                    <div style="padding: 10px 24px 16px 24px; font-size: 12px; color: var(--wx-text-sec); line-height: 1.4;">
                        添加朋友的备注名、电话、标签、备忘、照片等，并设置朋友权限。
                    </div>
                </div>

                <!-- Moments Cell (With Gap) -->
                <div class="wx-cell-group" style="margin-top: 8px;">
                    <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.openMomentsProfile('${user.id}')" style="padding: 12px 24px; cursor: pointer;">
                         <div class="wx-cell-content" style="font-size: 17px; font-weight: 400; color: var(--wx-text);">朋友圈</div>
                         <div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                         </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="wx-cell-group" style="margin-top: 8px;">
                     <!-- Send Message (Rounder Bubble) -->
                    <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.openChat('${user.id}')" style="justify-content: center; cursor: pointer; padding: 16px 0;">
                        <div style="display: flex; align-items: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 6px; flex-shrink: 0;">
                                 <!-- Circular Bubble Body with Tail -->
                                 <path d="M12 3.5C6.75 3.5 2.5 7.08 2.5 11.5c0 2.4 1.3 4.56 3.42 5.98L5.17 19.96c-.12.4.31.74.67.52l3.04-1.71c.98.39 2.03.61 3.12.61 5.25 0 9.5-3.58 9.5-8 0-4.42-4.25-8-9.5-8z" stroke="#576b95" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
                                 <!-- 3 Dots -->
                                 <circle cx="8" cy="11.5" r="1.2" fill="#576b95"/>
                                 <circle cx="12" cy="11.5" r="1.2" fill="#576b95"/>
                                 <circle cx="16" cy="11.5" r="1.2" fill="#576b95"/>
                            </svg>
                            <span style="font-size: 17px; font-weight: 400; color: #576b95;">发消息</span>
                        </div>
                    </div>
                    <!-- Video Call (Outline Camera) -->
                    <div class="wx-cell" style="justify-content: center; cursor: pointer; padding: 16px 0;">
                        <div style="display: flex; align-items: center;">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#576b95" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; flex-shrink: 0;">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            <span style="font-size: 17px; font-weight: 400; color: #576b95;">音视频通话</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderMyProfileSettings() {
        const s = window.sysStore;
        const realName = s.get('user_realname') || '';
        const nickname = s.get('user_nickname') || '';
        const gender = s.get('user_gender') || '';
        const wxid = s.get('user_wxid') || '';
        const species = s.get('user_species') || '';
        const persona = s.get('user_persona') || '';

        const isDark = s.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-my-profile" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${s.get('user_avatar') || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload()"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>

                    ${this._renderFieldHeader('我的真名', 'wx-my-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-real-name" ${this._lockAttr('wx-my-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：陈晓明" value="${realName}" />
                    </div>

                    ${this._renderFieldHeader('所在地 (影响角色的感应)', 'wx-my-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-region" ${this._lockAttr('wx-my-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、东京、云端" value="${s.get('user_region') || ''}" />
                    </div>

                    ${this._renderFieldHeader('财富/社会地位 (自定义)', 'wx-my-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-wealth" ${this._lockAttr('wx-my-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：学生、打工人、继承人" value="${s.get('user_wealth') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的物种', 'wx-my-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-species" ${this._lockAttr('wx-my-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：人类、猫娘、AI" value="${species}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-my-gender" ${this._lockAttr('wx-my-gender')} onchange="document.getElementById('wx-my-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                            <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
                            <option value="other" ${gender === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('我的生日', 'wx-my-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-birthday" ${this._lockAttr('wx-my-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：10月24日" value="${s.get('user_birthday') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的年龄', 'wx-my-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-age" type="number" ${this._lockAttr('wx-my-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" value="${s.get('user_age') || ''}" />
                    </div>

                    <div id="wx-my-period-box" style="display: ${gender === 'female' ? 'block' : 'none'};">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-my-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-my-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-my-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：1" value="${s.get('user_period_start') || ''}" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('我的网名', 'wx-my-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-my-nickname" ${this._lockAttr('wx-my-nickname')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：Kitten" value="${nickname}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-wxid" ${this._lockAttr('wx-my-wxid')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="留空则自动生成" value="${wxid}" />
                    </div>

                    ${this._renderFieldHeader('个性签名 (Bio)', 'wx-my-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-my-bio" ${this._lockAttr('wx-my-bio')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入你的签名" value="${s.get('user_bio') || ''}" />
                    </div>

                    ${this._renderFieldHeader('我的全局人设 (User Persona)', 'wx-my-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-my-persona" ${this._lockAttr('wx-my-persona')}
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此设置你的全局人设，所有角色都能感知到...">${persona}</textarea>
                    </div>
                </div>

                 <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveMyProfileSettings({
                        realName: document.getElementById('wx-my-real-name').value,
                        nickname: document.getElementById('wx-my-nickname').value,
                        gender: document.getElementById('wx-my-gender').value,
                        birthday: document.getElementById('wx-my-birthday').value,
                        age: document.getElementById('wx-my-age').value,
                        periodStart: document.getElementById('wx-my-period-start').value,
                        bio: document.getElementById('wx-my-bio').value,
                        region: document.getElementById('wx-my-region').value,
                        wealth: document.getElementById('wx-my-wealth').value,
                        wxid: document.getElementById('wx-my-wxid').value,
                        species: document.getElementById('wx-my-species').value,
                        persona: document.getElementById('wx-my-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
                    </div>
                    
                    <div onclick="window.WeChat.App.openAssociatedGen('USER_SELF')" 
                         style="background-color: var(--wx-cell-bg); color: var(--wx-text); text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer; margin-top: 16px;">
                        生成我的关联人物 (如: 我的青梅竹马)
                    </div>
                </div>
            </div>
        `;
    },
    renderVoiceVideoSettings(sessionId) {
        const char = (window.sysStore && window.sysStore.getCharacter) ? window.sysStore.getCharacter(sessionId) : null;
        const vs = {
            ...(char?.voice_settings || {}),
            ...(char?.video_settings || {})
        };

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';
        const cellBg = isDark ? '#1C1C1E' : '#FFFFFF';

        return `
            <div class="wx-scroller" id="wx-view-voice-video-settings" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 20px;">
                    <div style="background: ${cellBg}; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; margin-bottom: 24px;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="margin-right: 12px; color: #576b95;">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
                            </svg>
                            <span style="font-size: 18px; font-weight: 600; color: var(--wx-text);">语音与视频</span>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 8px;">Minimax 语音ID</div>
                            <div style="background: var(--wx-bg); border-radius: 8px; padding: 12px; border: 1px solid var(--wx-border);">
                                <input id="wx-vs-voice-id" 
                                    style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                    placeholder="例如：male-01" value="${vs.voiceId || ''}" />
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 8px;">Minimax 语言增强</div>
                            <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">增强对特定语言或方言的识别能力。通常选择“自动判断”即可。</div>
                            <div style="background: var(--wx-bg); border-radius: 8px; padding: 12px; border: 1px solid #333; display: flex; align-items: center;">
                                <select id="wx-vs-lang-boost" style="flex: 1; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none; appearance: none;">
                                    <option value="none" ${vs.languageBoost === 'none' ? 'selected' : ''}>无（默认）</option>
                                    <option value="zh" ${vs.languageBoost === 'zh' ? 'selected' : ''}>中文增强</option>
                                    <option value="en" ${vs.languageBoost === 'en' ? 'selected' : ''}>英文增强</option>
                                </select>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="opacity: 0.5;"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 15px; color: #888; margin-bottom: 12px;">语音语速: <span id="wx-vs-speed-val">${vs.speechRate || 0.9}</span></div>
                            <input id="wx-vs-speed" type="range" min="0.5" max="2.0" step="0.1" value="${vs.speechRate || 0.9}" 
                                oninput="document.getElementById('wx-vs-speed-val').innerText = this.value"
                                style="width: 100%; height: 24px; appearance: none; background: #ffe4e6; border-radius: 12px; outline: none;" />
                            <style>
                                #wx-vs-speed::-webkit-slider-thumb {
                                    appearance: none;
                                    width: 24px;
                                    height: 24px;
                                    background: #ff5a5f;
                                    border: 4px solid white;
                                    border-radius: 50%;
                                    cursor: pointer;
                                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                                }
                            </style>
                        </div>

                        <div style="height: 1px; background: rgba(0,0,0,0.05); margin: 24px 0; border-bottom: 1px dashed rgba(0,0,0,0.1);"></div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <span style="font-size: 16px; color: var(--wx-text);">可视化视频通话界面</span>
                            <div class="wx-switch ${vs.visualCallEnabled ? 'checked' : ''}" id="wx-vs-visual-call" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>

                        <div id="wx-vs-visual-call-details" style="display: ${vs.visualCallEnabled ? 'block' : 'none'}; margin-bottom: 24px;">
                            <div style="display: flex; gap: 16px;">
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 14px; color: #888; margin-bottom: 8px;">对方画面</div>
                                    <div onclick="window.WeChat.App.triggerCallImageUpload('${sessionId}', 'peer')" style="aspect-ratio: 9/16; background: var(--wx-bg); border: 1px dashed var(--wx-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                        <img id="wx-vc-peer-img" src="${vs.peerCallImage || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${vs.peerCallImage ? 'block' : 'none'};">
                                        <div style="display: ${vs.peerCallImage ? 'none' : 'flex'}; flex-direction: column; align-items: center;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            <span style="font-size: 12px; color: #888; margin-top: 4px;">点击上传</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="flex: 1; text-align: center;">
                                    <div style="font-size: 14px; color: #888; margin-bottom: 8px;">我的画面</div>
                                    <div onclick="window.WeChat.App.triggerCallImageUpload('${sessionId}', 'my')" style="aspect-ratio: 9/16; background: var(--wx-bg); border: 1px dashed var(--wx-border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                        <img id="wx-vc-my-img" src="${vs.myCallImage || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${vs.myCallImage ? 'block' : 'none'};">
                                        <div style="display: ${vs.myCallImage ? 'none' : 'flex'}; flex-direction: column; align-items: center;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            <span style="font-size: 12px; color: #888; margin-top: 4px;">点击上传</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <span style="font-size: 16px; color: var(--wx-text);">我的画面使用真实摄像头</span>
                            <div class="wx-switch ${vs.useRealCamera ? 'checked' : ''}" id="wx-vs-real-camera" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 16px; color: var(--wx-text);">开启语音接入</span>
                            <div class="wx-switch ${vs.voiceAccessEnabled ? 'checked' : ''}" id="wx-vs-voice-access" onclick="this.classList.toggle('checked')">
                                <div class="wx-switch-node"></div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 32px; padding: 0 4px;">
                        <div onclick="window.WeChat.App.saveVoiceVideoSettings('${sessionId}', {
                            voiceId: document.getElementById('wx-vs-voice-id').value,
                            languageBoost: document.getElementById('wx-vs-lang-boost').value,
                            speechRate: parseFloat(document.getElementById('wx-vs-speed').value),
                            visualCallEnabled: document.getElementById('wx-vs-visual-call').classList.contains('checked'),
                            useRealCamera: document.getElementById('wx-vs-real-camera').classList.contains('checked'),
                            voiceAccessEnabled: document.getElementById('wx-vs-voice-access').classList.contains('checked'),
                            peerCallImage: document.getElementById('wx-vc-peer-img').src,
                            myCallImage: document.getElementById('wx-vc-my-img').src
                        })" 
                             style="background-color: #07c160; color: white; text-align: center; padding: 14px; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);">
                            保存设置
                        </div>
                    </div>
                </div>
            </div>
            <script>
                // Dynamic visibility toggle for visuals
                document.getElementById('wx-vs-visual-call').addEventListener('click', function() {
                    const details = document.getElementById('wx-vs-visual-call-details');
                    details.style.display = this.classList.contains('checked') ? 'block' : 'none';
                });
            </script>
        `;
    },
    renderPersonaSettings(userId) {
        // Load existing data from sysStore
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const realName = char?.real_name || '';
        const remark = char?.remark || '';
        const nickname = char?.nickname || '';
        const wxid = char?.wxid || '';
        const species = char?.species || '';
        const gender = char?.gender || '';
        const persona = char?.main_persona || '';

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-scroller" id="wx-view-persona" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="${char?.avatar || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload('${userId}')"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>
                    ${this._renderFieldHeader('角色备注 (只有你知道)', 'wx-edit-remark')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-remark" ${this._lockAttr('wx-edit-remark')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" value="${remark}" />
                    </div>

                    ${this._renderFieldHeader('角色真名 (系统识别用)', 'wx-edit-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-real-name" ${this._lockAttr('wx-edit-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" value="${realName}" />
                    </div>

                    ${this._renderFieldHeader('所在地 (展示名)', 'wx-edit-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-region" ${this._lockAttr('wx-edit-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：云深不知处" value="${char?.region || ''}" />
                    </div>

                    ${this._renderFieldHeader('现实映射地区 (影响时差/天气)', 'wx-edit-region-mapping')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-region-mapping" ${this._lockAttr('wx-edit-region-mapping')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、东京、伦敦" value="${char?.settings?.region_mapping || ''}" />
                    </div>

                    ${this._renderFieldHeader('财富状况 (自定义词条)', 'wx-edit-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-wealth" ${this._lockAttr('wx-edit-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：名门望族、赤贫、顶级财阀" value="${char?.settings?.wealth_level || ''}" />
                    </div>

                    ${this._renderFieldHeader('物种', 'wx-edit-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-species" ${this._lockAttr('wx-edit-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：人类、猫娘、AI" value="${species}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-edit-gender" ${this._lockAttr('wx-edit-gender')} onchange="document.getElementById('wx-edit-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male" ${gender === 'male' ? 'selected' : ''}>男</option>
                            <option value="female" ${gender === 'female' ? 'selected' : ''}>女</option>
                            <option value="other" ${gender === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('角色生日', 'wx-edit-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-birthday" ${this._lockAttr('wx-edit-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：7月7日" value="${char?.settings?.birthday || ''}" />
                    </div>

                    ${this._renderFieldHeader('角色年龄', 'wx-edit-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-age" type="number" ${this._lockAttr('wx-edit-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" value="${char?.settings?.age || ''}" />
                    </div>

                    <div id="wx-edit-period-box" style="display: ${gender === 'female' ? 'block' : 'none'};">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-edit-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-edit-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-edit-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：15" value="${char?.settings?.period_start || ''}" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('角色在网络上的名字', 'wx-edit-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-edit-nickname" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：大不列颠小厨娘" value="${nickname}" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-wxid" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="默认自动生成，可手动修改" value="${wxid}" />
                    </div>

                    ${this._renderFieldHeader('角色在网络上的签名', 'wx-edit-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-edit-bio" 
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入角色的签名" value="${char?.bio || ''}" />
                    </div>

                    ${this._renderFieldHeader('角色人设 (System Prompt)', 'wx-edit-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-edit-persona" 
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入角色的性格、背景故事或回复风格...">${persona}</textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.savePersonaSettings('${userId}', {
                        realName: document.getElementById('wx-edit-real-name').value,
                        remark: document.getElementById('wx-edit-remark').value,
                        nickname: document.getElementById('wx-edit-nickname').value,
                        wxid: document.getElementById('wx-edit-wxid').value,
                        species: document.getElementById('wx-edit-species').value,
                        gender: document.getElementById('wx-edit-gender').value,
                        gender: document.getElementById('wx-edit-gender').value,
                        birthday: document.getElementById('wx-edit-birthday').value,
                        age: document.getElementById('wx-edit-age').value,
                        periodStart: document.getElementById('wx-edit-period-start').value,
                        periodStart: document.getElementById('wx-edit-period-start').value,
                        bio: document.getElementById('wx-edit-bio').value,
                        region: document.getElementById('wx-edit-region').value,
                        regionMapping: document.getElementById('wx-edit-region-mapping').value,
                        wealth: document.getElementById('wx-edit-wealth').value,
                        persona: document.getElementById('wx-edit-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer; margin-bottom: 16px;">
                        保存设置
                    </div>
                    
                    <div onclick="window.WeChat.App.openAssociatedGen('${userId}')" 
                         style="background-color: var(--wx-cell-bg); color: var(--wx-text); text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        生成关联人物 (如: 他的朋友/宿敌)
                    </div>
                </div>
            </div>
        `;
    },
    renderAddFriend() {
        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';
        const appState = window.WeChat.App.State;

        return `
            <div class="wx-scroller" id="wx-view-add-friend" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 16px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img id="wx-add-friend-avatar" src="${appState.newFriendAvatar || 'assets/images/avatar_placeholder.png'}" 
                             onclick="window.WeChat.App.triggerAvatarUpload('new_friend')"
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        <div style="font-size: 13px; color: var(--wx-text-sec); margin-top: 8px;">点击更换头像</div>
                    </div>
                    ${this._renderFieldHeader('角色备注 (只有你知道)', 'wx-add-friend-remark')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-remark" ${this._lockAttr('wx-add-friend-remark')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：呆毛王" />
                    </div>

                    ${this._renderFieldHeader('角色真名 (系统识别用)', 'wx-add-friend-real-name')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-real-name" ${this._lockAttr('wx-add-friend-real-name')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：阿尔托莉雅·潘德拉贡" />
                    </div>

                    ${this._renderFieldHeader('所在地 (展示名)', 'wx-add-friend-region')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-region" ${this._lockAttr('wx-add-friend-region')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：赛博朋克城" />
                    </div>

                    ${this._renderFieldHeader('现实映射地区 (影响时差/天气)', 'wx-add-friend-region-mapping')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-region-mapping" ${this._lockAttr('wx-add-friend-region-mapping')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：上海、伦敦、纽约" />
                    </div>

                    ${this._renderFieldHeader('财富状况', 'wx-add-friend-wealth')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-wealth" ${this._lockAttr('wx-add-friend-wealth')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：豪门、月光族" />
                    </div>

                    ${this._renderFieldHeader('物物种', 'wx-add-friend-species')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-species" ${this._lockAttr('wx-add-friend-species')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            value="人类" placeholder="如：人类、猫娘" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">性别</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <select id="wx-add-friend-gender" ${this._lockAttr('wx-add-friend-gender')} onchange="document.getElementById('wx-add-period-box').style.display = (this.value === 'female' ? 'block' : 'none')" style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;">
                            <option value="">未设置</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                            <option value="other">其他</option>
                        </select>
                    </div>

                    ${this._renderFieldHeader('角色生日', 'wx-add-friend-birthday')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-birthday" ${this._lockAttr('wx-add-friend-birthday')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：7月7日" />
                    </div>

                    ${this._renderFieldHeader('角色年龄', 'wx-add-friend-age')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-age" type="number" ${this._lockAttr('wx-add-friend-age')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="如：18" />
                    </div>

                    <div id="wx-add-period-box" style="display: none;">
                        ${this._renderFieldHeader('生理期起始日 (每月几号)', 'wx-add-friend-period-start')}
                        <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                            <input id="wx-add-friend-period-start" type="number" min="1" max="31" ${this._lockAttr('wx-add-friend-period-start')}
                                style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                                placeholder="如：15" />
                        </div>
                    </div>

                    ${this._renderFieldHeader('角色网名 (角色对外展示的名号)', 'wx-add-friend-nickname')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <input id="wx-add-friend-nickname" ${this._lockAttr('wx-add-friend-nickname')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                        placeholder="如：大不列颠小厨娘" />
                    </div>

                    <div style="font-size: 14px; color: var(--wx-text-sec); margin-bottom: 8px;">微信号 (WeChat ID)</div>
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-wxid" ${this._lockAttr('wx-add-friend-wxid')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="留空则自动生成" />
                    </div>

                    ${this._renderFieldHeader('个性签名 (Bio)', 'wx-add-friend-bio')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                        <input id="wx-add-friend-bio" ${this._lockAttr('wx-add-friend-bio')}
                            style="width: 100%; border: none; background: transparent; font-size: 16px; color: var(--wx-text); outline: none;"
                            placeholder="在此输入角色的签名" />
                    </div>

                    ${this._renderFieldHeader('角色人设 (System Prompt)', 'wx-add-friend-persona')}
                    <div style="background: var(--wx-cell-bg); border-radius: 8px; padding: 12px;">
                        <textarea id="wx-add-friend-persona" ${this._lockAttr('wx-add-friend-persona')}
                            style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-size: 16px; color: var(--wx-text); outline: none; line-height: 1.5;"
                            placeholder="在此输入角色的性格、背景故事或回复风格..."></textarea>
                    </div>
                </div>

                <div style="padding: 20px 24px 40px 24px;">
                    <div onclick="window.WeChat.App.saveNewFriend({
                        avatar: document.getElementById('wx-add-friend-avatar').src,
                        realName: document.getElementById('wx-add-friend-real-name').value,
                        remark: document.getElementById('wx-add-friend-remark').value,
                        nickname: document.getElementById('wx-add-friend-nickname').value,
                        wxid: document.getElementById('wx-add-friend-wxid').value,
                        species: document.getElementById('wx-add-friend-species').value,
                        gender: document.getElementById('wx-add-friend-gender').value,
                        gender: document.getElementById('wx-add-friend-gender').value,
                        birthday: document.getElementById('wx-add-friend-birthday').value,
                        age: document.getElementById('wx-add-friend-age').value,
                        periodStart: document.getElementById('wx-add-friend-period-start').value,
                        periodStart: document.getElementById('wx-add-friend-period-start').value,
                        bio: document.getElementById('wx-add-friend-bio').value,
                        region: document.getElementById('wx-add-friend-region').value,
                        regionMapping: document.getElementById('wx-add-friend-region-mapping').value,
                        wealth: document.getElementById('wx-add-friend-wealth').value,
                        persona: document.getElementById('wx-add-friend-persona').value
                    })" 
                         style="background-color: #07c160; color: white; text-align: center; padding: 12px; border-radius: 8px; font-size: 17px; font-weight: 500; cursor: pointer;">
                        保存设置
                    </div>
                </div>
            </div>
        `;
    },
    renderFriendSettings(userId) {
        const char = (window.sysStore && window.sysStore.getCharacter)
            ? window.sysStore.getCharacter(userId)
            : null;

        const isBlacklisted = char?.is_blacklisted === true;

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';
        const pageBg = isDark ? '#111111' : '#EDEDED';

        return `
            <div class="wx-view-container" id="wx-view-settings" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '设置朋友资料', showArrow: true, onClick: `window.WeChat.App.openPersonaSettings('${userId}')` })}
                    ${this._renderCell({ text: '朋友权限', showArrow: true })}
                    ${this._renderCell({ text: '把他(她)推荐给朋友', showArrow: true })}
                    ${this._renderCell({ text: '添加到桌面', showArrow: true })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderSwitchCell('设为星标朋友', false)}
                </div>

                <div class="wx-cell-group">
                     ${this._renderSwitchCell('加入黑名单', isBlacklisted, `window.WeChat.App.toggleBlacklist('${userId}', !${isBlacklisted})`)}
                     ${this._renderCell({ text: '投诉', showArrow: true })}
                </div>
                
                <div class="wx-cell-group">
                    <div class="wx-cell wx-hairline-bottom" onclick="window.WeChat.App.deleteFriend('${userId}')" style="justify-content: center; cursor: pointer; background-color: var(--wx-cell-bg);">
                        <span style="font-size: 17px; font-weight: 600; color: var(--wx-red);">删除</span>
                    </div>
                </div>
            </div>
        `;
    },
    renderContactList() {
        const contacts = (window.WeChat.Services && window.WeChat.Services.Contacts)
            ? window.WeChat.Services.Contacts.getContacts()
            : [];

        // Debug: Log contacts count
        console.log('[Views] renderContactList: contacts count =', contacts.length);

        // Sort contacts by section (A-Z, #)
        contacts.sort((a, b) => {
            // Force non-alpha initial chars to '#'
            let sectionA = (a.section && /^[A-Za-z]$/.test(a.section)) ? a.section.toUpperCase() : '#';
            let sectionB = (b.section && /^[A-Za-z]$/.test(b.section)) ? b.section.toUpperCase() : '#';

            if (sectionA === sectionB) return a.name.localeCompare(b.name);
            if (sectionA === '#') return 1;
            if (sectionB === '#') return -1;
            return sectionA.localeCompare(sectionB);
        });

        let listHtml = '';
        let lastSection = null;

        contacts.forEach(c => {
            // Force render logic to also adhere to this
            const rawSection = c.section || '#';
            const section = /^[A-Za-z]$/.test(rawSection) ? rawSection.toUpperCase() : '#';

            if (section !== lastSection) {
                // Render Section Header
                listHtml += `
                    <div style="padding: 8px 16px; font-size: 11px; color: var(--wx-text-sec);">
                        ${section}
                    </div>
                `;
                lastSection = section;
            }

            listHtml += this._renderCell({
                text: c.name,
                iconColor: c.type === 'system' ? '#fa9d3b' : '#eee',
                iconType: 'user_avatar',
                showArrow: false,
                onClick: `window.WeChat.App.openUserProfile('${this.escapeQuote(c.id)}', '${this.escapeQuote(c.name)}')`,
                avatar: c.avatar
            });
        });

        // Show empty state if no contacts
        if (contacts.length === 0) {
            listHtml = `
                <div style="text-align: center; padding: 60px 20px; color: var(--wx-text-sec);">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📇</div>
                    <div style="font-size: 15px;">暂无联系人</div>
                    <div style="font-size: 13px; margin-top: 8px; opacity: 0.7;">点击右上角"+"添加朋友</div>
                </div>
            `;
        }

        return `
            <div class="wx-view-container" id="wx-view-contacts" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
               <div style="padding-top: 10px;">
                    ${this._renderSimpleCell('新的朋友', '#fa9d3b', 'contact_add')}
                    ${this._renderSimpleCell('群聊', '#07c160', 'group')}
                    ${this._renderSimpleCell('标签', '#2782d7', 'tag')}
                    ${this._renderSimpleCell('公众号', '#2782d7', 'offical')}
                    ${listHtml}
               </div>
            </div>
        `;
    },
    renderDiscover() {
        return `
            <div class="wx-view-container" id="wx-view-discover" onclick="window.WeChat.App.closeAllPanels()">
                <div class="wx-nav-spacer" style="height: calc(var(--wx-nav-height) - 10px);"></div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '朋友圈', iconColor: '#e0e0e0', iconType: 'moments', showArrow: true, onClick: 'window.WeChat.App.openMoments()' })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '视频号', iconColor: '#fa9d3b', iconType: 'video', showArrow: true })}
                    ${this._renderCell({ text: '关系网', iconColor: '#07c160', iconType: 'relationship', showArrow: true, onClick: 'window.WeChat.App.openRelationshipGraph()' })}
                    ${this._renderCell({ text: '直播', iconColor: '#fa9d3b', iconType: 'live', showArrow: true })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '扫一扫', iconColor: '#2782d7', iconType: 'scan', showArrow: true })}
                    ${this._renderCell({ text: '听一听', iconColor: '#fbeb4d', iconType: 'listen', showArrow: true })}
                </div>
                <div class="wx-cell-group">
                    ${this._renderCell({ text: '小程序', iconColor: '#7d90a9', iconType: 'mini', showArrow: true })}
                </div>
            </div>
        `;
    },
    renderMe_OLD() {
        const s = window.sysStore;
        const userAvatar = (s && s.get('user_avatar')) || 'assets/images/avatar_placeholder.png';
        const nickname = (s && s.get('user_nickname')) || (s && s.get('user_realname')) || 'User';
        const userGender = (s && s.get('user_gender')) || '';
        const userWxid = (s && s.get('user_wxid')) || 'wxid_chara_os_001';

        const genderHtml = this._renderGenderIcon(userGender);

        return `
            <div class="wx-scroller" id="wx-view-me">
                <!-- <div class="wx-nav-spacer"></div> -->
                <div class="wx-profile-header" onclick="window.WeChat.App.openMyProfileSettings()" style="cursor: pointer;">
                    <img src="${userAvatar}" class="wx-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0x.79LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" />
                    <div class="wx-profile-info">
                        <div class="wx-profile-name">${nickname}${genderHtml}</div>
                        <div class="wx-profile-id">
                            <div class="wx-profile-id-row">
                                <span>微信号：${userWxid}</span>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 8px; opacity: 0.5;"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm2 2h2v2h-2v-2z" fill="currentColor"/></svg>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 4px; opacity: 0.3;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                     <div class="wx-cell-arrow"></div>
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({
            text: '服务',
            iconColor: '#07c160',
            iconType: 'service',
            showArrow: true,
            extra: '<span style="font-size:11px; color:var(--wx-text-sec); margin-right:8px;">支付</span>'
        })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderCell({ text: '收藏', iconColor: '#fa9d3b', iconType: 'fav', showArrow: true })}
                     ${this._renderCell({ text: '朋友圈', iconColor: '#2782d7', iconType: 'moments_blue', showArrow: true })}
                     ${this._renderCell({ text: '卡包', iconColor: '#2782d7', iconType: 'card', showArrow: true })}
                     ${this._renderCell({ text: '表情', iconColor: '#ffc300', iconType: 'sticker', showArrow: true })}
                </div>

                <div class="wx-cell-group" style="margin-bottom: 30px;">
                    ${this._renderCell({ text: '设置', iconColor: '#2782d7', iconType: 'settings', showArrow: true })}
                </div>
            </div>
        `;
    },
    renderMe() {
        const s = window.sysStore;
        const userAvatar = (s && s.get('user_avatar')) || 'assets/images/avatar_placeholder.png';
        const nickname = (s && s.get('user_nickname')) || (s && s.get('user_realname')) || 'User';
        const userGender = (s && s.get('user_gender')) || '';
        const userWxid = (s && s.get('user_wxid')) || 'wxid_chara_os_001';

        const genderHtml = this._renderGenderIcon(userGender);

        return `
            <div class="wx-scroller" id="wx-view-me">
                <!-- <div class="wx-nav-spacer"></div> -->
                <div class="wx-profile-header" onclick="window.WeChat.App.openMyProfileSettings()" style="cursor: pointer;">
                    <img src="${userAvatar}" class="wx-avatar" style="object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='" />
                    <div class="wx-profile-info">
                        <div class="wx-profile-name" style="font-weight:600; display: flex; align-items: center;">${nickname}${genderHtml}</div>
                        <div class="wx-profile-id">
                            <div class="wx-profile-id-row">
                                <span>微信号：${userWxid}</span>
                                <svg viewBox="0 0 24 24" width="16" height="16" style="margin-left: 4px; opacity: 0.3;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="wx-cell-group">
                    ${this._renderCell({
            text: '服务',
            iconColor: '#07c160',
            iconType: 'service',
            showArrow: true,
            extra: '<span style="font-size:11px; color:var(--wx-text-sec); margin-right:8px;">支付</span>'
        })}
                </div>

                <div class="wx-cell-group">
                     ${this._renderCell({ text: '收藏', iconColor: '#fa9d3b', iconType: 'fav', showArrow: true })}
                     ${this._renderCell({ text: '朋友圈', iconColor: '#2782d7', iconType: 'moments_blue', showArrow: true, onClick: "window.WeChat.App.openMomentsProfile('USER_SELF')" })}
                     ${this._renderCell({ text: '卡包', iconColor: '#2782d7', iconType: 'card', showArrow: true })}
                     ${this._renderCell({ text: '表情', iconColor: '#ffc300', iconType: 'sticker', showArrow: true })}
                </div>

                <div class="wx-cell-group" style="margin-bottom: 30px;">
                    ${this._renderCell({ text: '设置', iconColor: '#2782d7', iconType: 'settings', showArrow: true })}
                </div>
            </div>
        `;
    },
    // --- Helpers ---
    _renderSwitchCell(text, checked = false, onClick = '') {
        const action = onClick ? `onclick="${onClick}; event.stopPropagation();"` : "onclick=\"this.classList.toggle('checked')\"";
        return `
            <div class="wx-cell wx-hairline-bottom" style="justify-content: space-between;">
                <div class="wx-cell-text" style="font-size: 16px; color: var(--wx-text);">${text}</div>
                <div class="wx-switch ${checked ? 'checked' : ''}" ${action}>
                    <div class="wx-switch-node"></div>
                </div>
            </div>
        `;
    },

    _renderSimpleCell(text, color, type) {
        return this._renderCell({ text, iconColor: color, iconType: type, showArrow: false });
    },

    /**
     * Helper to return 'disabled' if a field is currently locked in State
     */
    _lockAttr(fieldId) {
        return (window.State && window.State.fieldLocks && window.State.fieldLocks[fieldId]) ? 'disabled' : '';
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    escapeQuote(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'");
    },

    _renderGenderIcon(gender) {
        if (!gender) return '';

        // Male: Blue Silhouette with Shirt Collar
        if (gender === 'male') {
            return `
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-left:6px;">
                    <g fill="none" fill-rule="evenodd">
                        <path fill="#267dcc" d="M12,4 C14.7614237,4 17,6.23857625 17,9 C17,11.7614237 14.7614237,14 12,14 C9.23857625,14 7,11.7614237 7,9 C7,6.23857625 9.23857625,4 12,4 Z M12,15 C16.418278,15 20,16.790861 20,19 L20,21 L4,21 L4,19 C4,16.790861 7.581722,15 12,15 Z"/>
                        <path fill="#FFFFFF" opacity="0.9" d="M12,15 L14.5,19 L9.5,19 L12,15 Z" />
                    </g>
                </svg>
            `;
        }

        // Female: Pink Silhouette with Bob Hair and Collar
        if (gender === 'female') {
            return `
                <svg width="18" height="18" viewBox="0 0 24 24" style="margin-left:6px;">
                    <g fill="none" fill-rule="evenodd">
                         <!-- Hair & Face Base -->
                        <path fill="#ff4d4f" d="M12,4 C15.5,4 17.5,6.5 17.5,9.5 C17.5,12.5 16,14.5 13.5,14.5 L10.5,14.5 C8,14.5 6.5,12.5 6.5,9.5 C6.5,6.5 8.5,4 12,4 Z M12,15 C16.418278,15 20,16.790861 20,19 L20,21 L4,21 L4,19 C4,16.790861 7.581722,15 12,15 Z"/>
                        <!-- Bow Tie / Collar -->
                        <path fill="#FFFFFF" opacity="0.9" d="M12,15.5 C13,16.2 14.2,16 14.8,15.5 L14.8,16.5 C14,17.2 13,17 12,16.2 C11,17 10,17.2 9.2,16.5 L9.2,15.5 C9.8,16 11,16.2 12,15.5 Z"/>
                    </g>
                </svg>
            `;
        }

        return '';
    },

    _renderCell({ text, iconColor, iconType, showArrow, extra = '', onClick = '', avatar = '' }) {
        let iconHtml = '';
        if (iconType === 'user_avatar') {
            const src = avatar || 'assets/images/avatar_placeholder.png';
            iconHtml = `<img src="${src}" style="width:36px; height:36px; border-radius:4px; margin-right:12px; flex-shrink:0; background:${iconColor}; object-fit: cover;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYzIuMjEgMCA0LTEuNzkgNC00cy0xLjc5LTQtNC00LTQgMS43OS00IDQgMS43OSA0IDQgNHptMCAyYy0yLjY3IDAtOCAxLjM0LTggNHYyaDE2di0yYzAtMi42Ni01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">`;
        } else if (iconType) {
            let svgContent = '';
            switch (iconType) {
                case 'service': svgContent = '<path d="M4 6h16v12H4z" fill="white" fill-opacity="0.8"/>'; break;
                case 'moments': svgContent = '<circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" fill="none"/>'; break;
                case 'settings': svgContent = '<circle cx="12" cy="12" r="4" stroke="white" stroke-width="2"/>'; break;
                case 'scan': svgContent = '<path d="M4 4h4v2H4v4H2V4h2zm14 0h2v6h-2V6h-4V4h4zm0 16h-4v-2h4v-4h2v6h-2zM4 20h4v2H4h-2v-6h2v4z" fill="white"/>'; break;
                case 'listen': svgContent = '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>'; break;
                case 'contact_add': svgContent = '<path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="white"/>'; break;
                case 'group': svgContent = '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="white"/>'; break;
                case 'tag': svgContent = '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill="white"/>'; break;
                case 'offical': svgContent = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="white"/>'; break;
                case 'relationship': svgContent = '<circle cx="6" cy="6" r="3" fill="white"/><circle cx="18" cy="6" r="3" fill="white"/><circle cx="12" cy="18" r="3" fill="white"/><line x1="8" y1="7" x2="11" y2="16" stroke="white" stroke-width="1.5"/><line x1="16" y1="7" x2="13" y2="16" stroke="white" stroke-width="1.5"/><line x1="8" y1="6" x2="16" y2="6" stroke="white" stroke-width="1.5"/>'; break;
                case 'video': svgContent = '<path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" fill="white"/>'; break;
                case 'live': svgContent = '<circle cx="12" cy="12" r="2" fill="white"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" stroke="white" stroke-width="2" fill="none"/>'; break;
                case 'mini': svgContent = '<rect x="3" y="3" width="18" height="18" rx="3" stroke="white" stroke-width="2" fill="none"/><circle cx="8" cy="16" r="2" fill="white"/><circle cx="16" cy="16" r="2" fill="white"/>'; break;
                default: svgContent = '<rect x="6" y="6" width="12" height="12" fill="white"/>';
            }
            const iconStyle = `display:flex; align-items:center; justify-content:center; background-color:${iconColor}; width:36px; height:36px; border-radius:4px; margin-right:12px; flex-shrink:0;`;
            iconHtml = `<div style="${iconStyle}"><svg viewBox="0 0 24 24" style="width:20px; height:20px">${svgContent}</svg></div>`;
        }

        const arrowHtml = showArrow ?
            `<div class="wx-cell-arrow-custom" style="margin-left: 4px; display: flex; align-items: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
             </div>` : '';

        return `
            <div class="wx-cell wx-hairline-bottom" onclick="${onClick}" style="${onClick ? 'cursor:pointer;' : ''}">
                ${iconHtml}
                <div class="wx-cell-content" style="font-size:16px;">${this.escapeHtml(text)}</div>
                ${extra}
                ${arrowHtml}
            </div>
        `;
    },
});
