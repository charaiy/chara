/**
 * js/apps/wechat/services/generators.js
 * AI 生成服务 - 处理角色生成、人设随机化、关联人物生成等功能
 * 
 * 职责：
 * - 角色人设数据收集和验证
 * - 角色生成（新角色、关联角色）
 * - 人设字段随机化（基于AI生成）
 * - JSON解析和错误处理
 * 
 * 依赖：
 * - window.sysStore: 数据存储
 * - window.WeChat.App: 应用主对象
 * - window.Core.Api: API调用
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Generators = {
    /**
     * 健壮的 JSON 解析函数，处理控制字符问题
     */
    _parseJsonSafely(jsonStr) {
        if (!jsonStr) return null;

        // 辅助函数：清理 JSON 字符串中的控制字符
        const cleanJsonString = (str) => {
            // 移除未转义的控制字符（保留已转义的 \n, \t 等）
            return str.replace(/[\x00-\x1F\x7F]/g, (char) => {
                const code = char.charCodeAt(0);
                const escapeMap = {
                    9: '\\t',   // tab
                    10: '\\n',  // newline
                    13: '\\r',  // carriage return
                };
                return escapeMap[code] || '';
            });
        };

        try {
            // 第一次尝试：直接解析
            return JSON.parse(jsonStr);
        } catch (e1) {
            try {
                // 第二次尝试：清理控制字符后解析
                const cleaned = cleanJsonString(jsonStr);
                return JSON.parse(cleaned);
            } catch (e2) {
                try {
                    // 第三次尝试：移除所有控制字符
                    const removed = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');
                    return JSON.parse(removed);
                } catch (e3) {
                    // 使用统一错误处理
                    if (window.ErrorHandler) {
                        window.ErrorHandler.handle(e3, {
                            level: window.ErrorHandler.Level.WARNING,
                            type: window.ErrorHandler.Type.PARSE,
                            message: 'JSON解析失败',
                            showToast: false,
                            metadata: { jsonSnippet: jsonStr.substring(0, 500) }
                        });
                    } else {
                        console.error('[Generators] JSON parse failed after all attempts:', e3);
                        console.error('[Generators] JSON snippet:', jsonStr.substring(0, 500));
                    }
                    return null;
                }
            }
        }
    },

    /**
     * 收集人设数据，支持从 DOM 或 Store 中读取（确保背景生成有效）
     */
    _collectPersonaData(prefix, userId = null) {
        const s = window.sysStore;
        const char = userId ? s?.getCharacter(userId) : null;

        // 辅助函数：优先读取 DOM，其次读取 Store (Character 或 Global User)
        const getVal = (fieldK, storeK, isSetting = false) => {
            const el = document.getElementById(prefix + fieldK);
            if (el) return el.value;

            // Fallback 1: 角色数据 (针对现有好友)
            let result = '';
            if (char) {
                result = (isSetting ? char.settings?.[storeK] : char[storeK]) || '';
            }
            // Fallback 2: 全局用户数据 (针对 "我" 的资料)
            else if (prefix === 'wx-my-' && s) {
                result = s.get('user_' + storeK) || '';
            }

            // [Fix] 如果结果是一个对象（常出现在地理位置 field），提取其文字描述
            if (typeof result === 'object' && result !== null) {
                return result.name || result.label || result.text || JSON.stringify(result);
            }
            return result;
        };

        return {
            realName: getVal('real-name', 'real_name'),
            remark: getVal('remark', 'remark'),
            nickname: getVal('nickname', 'nickname'),
            persona: getVal('persona', 'main_persona'),
            gender: getVal('gender', 'gender'),
            species: getVal('species', 'species'),
            wxid: getVal('wxid', 'wxid'),
            bio: getVal('bio', 'bio'),
            region: getVal('region', 'region'),
            regionMapping: getVal('region-mapping', 'region_mapping', true),
            wealth: getVal('wealth', 'wealth_level', true),
            birthday: getVal('birthday', 'birthday', true),
            age: getVal('age', 'age', true),
            periodStart: getVal('period-start', 'period_start', true)
        };
    },

    async randomizeAllUnlocked(type, targetFieldId = null) {
        const State = window.WeChat.App.State;
        let prefix = '';
        if (type === 'my') prefix = 'wx-my-';
        else if (type === 'persona') prefix = 'wx-edit-';
        else if (type === 'add') prefix = 'wx-add-friend-';
        else if (type === 'rel') prefix = 'wx-rel-';

        const fieldKeys = [
            'real-name', 'bio', 'region', 'region-mapping', 'wealth',
            'species', 'birthday', 'age', 'nickname', 'persona',
            'gender', 'period-start',
            // [Rel V1 Legacy]
            'public_relation',
            // [Rel V2 New IDs]
            'char-obj', 'char-pub-att', 'char-pvt-att',
            'user-obj', 'user-pub-att', 'user-pvt-att',
            'backstory'
        ];

        const userId = (type === 'persona' || type === 'rel') ? (State.activeUserId || State.activeSessionId) : null;
        const currentData = this._collectPersonaData(prefix, userId);

        // 1. 收集目标字段与上下文 (优先从 currentData 读取，即使 DOM 不存在也能生成)
        const fields = [];
        const targets = [];

        fieldKeys.forEach(k => {
            const id = prefix + k;
            const isLocked = !!State.fieldLocks?.[id];

            // 映射 internal key (e.g. real-name -> realName)
            const internalK = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const value = currentData[internalK] || '';

            const fieldInfo = { key: k, internalKey: internalK, id: id, value: value, isLocked: isLocked };
            fields.push(fieldInfo);

            if (!isLocked && (!targetFieldId || targetFieldId === id)) {
                targets.push(fieldInfo);
            }
        });

        // 阶梯人设处理 (支持后台读取)
        if (type === 'rel') {
            const rel = State.pendingRelationship;
            const ladderCount = rel?.ladder_persona?.length || 0;
            for (let i = 0; i < ladderCount; i++) {
                const id = `wx-rel-ladder-content-${i}`;
                const isLocked = !!State.fieldLocks?.[id];
                const value = rel.ladder_persona[i].content || '';
                const fieldInfo = { key: `ladder-content-${i}`, id: id, value: value, isLocked: isLocked, idx: i };
                fields.push(fieldInfo);

                if (!isLocked && (!targetFieldId || targetFieldId === id || targetFieldId === 'wx-rel-ladder')) {
                    targets.push(fieldInfo);
                }
            }
        }

        if (targets.length === 0) return;

        // 2. 加载反馈
        const btnId = targetFieldId ? (targetFieldId.startsWith('wx-rel-ladder') ? 'wx-rel-gen-btn' : `lock-btn-${targetFieldId}`) : 'wx-nav-gen-btn';
        const btn = document.getElementById(btnId);
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `<svg class="wx-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: wx-spin 1s linear infinite;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
            btn.style.pointerEvents = 'none';
        }

        if (window.os) window.os.showToast(targetFieldId ? 'AI 正在思考中...' : 'AI 正在构思全套人设...', 'info', 5000);

        // [UI Feedback] Set target fields to "Generating..." status
        targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (el) {
                if (el.tagName === 'SELECT') {
                    // Temporarily add a "Generating" option if needed or just set text
                    const originalText = el.options[el.selectedIndex]?.text;
                    el.setAttribute('data-original-text', originalText);
                    // Use a simple prompt/placeholder approach
                } else {
                    el.value = '正在生成中...';
                }
                el.style.opacity = '0.6';
            }
        });

        // 3. 构建 Prompt
        let contextStr = fields.map(f => `- ${f.key}: ${f.value || '(未填写)'}${f.isLocked ? ' [已锁定]' : ''}`).join('\n');

        // [Associated Character Generation Logic]
        if (type === 'add' && State.genContext) {
            contextStr += `\n\n[关联人物生成上下文]\n你正在生成的人物是【${State.genContext.sourceName}】的【${State.genContext.relation}】。\n${State.genContext.sourceName}的人设概要：\n${State.genContext.sourcePersona}\n\n[关联生成特殊指令]\n1. **独立人格要求**：尽管该角色与【${State.genContext.sourceName}】有关联，但他/她必须是一个**完全独立、鲜活且具有完整人生轨迹**的个体。他/她应有属于自己的核心驱动力、社交圈和不为人知的秘密，而非仅仅作为源角色的附属品或剧情工具人。\n2. 请在【生活图谱 - 人际关系】中，明确写出与【${State.genContext.sourceName}】的关系。\n3. 在输出的最后（JSON闭合之后），请额外附带一段给源人物【${State.genContext.sourceName}】的更新文本，格式如下：\n\n[SourceUpdate]\n在此输出一段文本，这段文本将被追加到【${State.genContext.sourceName}】的人设中的"人际关系"部分，用于描述他/她与这位新角色的关系。\n[/SourceUpdate]`;
        }

        const targetKeys = targets.map(t => t.key).join(', ');

        const prompt = `你是一个能够洞察灵魂的剧本作家。你的任务是基于碎片信息，构建一个极其鲜活、复杂且高度自洽的虚拟角色档案。

[已知信息]
${contextStr}

[生成任务]
请为字段 ${targetKeys} 生成内容。

[核心创作戒律]
1.  **拒绝文艺范与人机感**：文字必须"说人话"。严禁堆砌华丽但空洞的辞藻，严禁使用翻译腔或AI特有的程式化感叹。想象你是在写一份真实的档案或一个活生生的人的小传，语感要自然、平实、通俗，具备生活气息。读起来应当像真人手写的一样流畅，而非AI生成的范文。
2.  **反模版化**：拒绝刻板印象。尤其是在亲密关系中，严禁默认使用"回避型依恋"。请根据背景随机分配依恋人格（如：安全型、渴望型、恐惧型或完全的直球火热型）。
3.  **视觉非扁平化**：不要只用"顶级神颜/帅气"这种空洞词汇。请描述一种具有辨识度的美或丑，重点在于"骨相、肤质、独有的神态与气场（ Aura）"。无论是惊艳、清透、粗犷还是普普通通，都要写出它带给人的具体压迫感、亲和力或吸引力。
4.  **硬性字数控制 (TOKEN LIMIT)**：Roleplay Prompt (Persona) 必须充实，总字数**必须严格控制在 1000 字以上，1300 字以下**。严禁超过 1300 字（约 2000 Tokens），请通过物理删除无意义的形容词来提升信息浓度，拒绝任何废话。
5.    - 人格一致性（核心红线）：阶段性人设的表现必须严禁遵循主要人设的性格底色。如果主要人设是"情感缺失"或"理性至上"，那么即使在最高好感阶段，也应当表现为该性格下的特有偏好（如：更优先的数据交互、特殊的行为允许），**严禁出现违背人设的感性爆发或性格剧变**。
6.  **排版要求 (Formatting)**：在 main_persona 等文本字段中，**请务必使用 Markdown 的无序列表符号 (* 或 -) 进行分点**，确保内容结构清晰。请避免输出成一大段不分行的文字。

[禁词检测与强制替换 (Strict Forbidden List)]
1. 分类避讳清单 (用更生动的描写替代):
   - 模糊陈腐: 一丝、一抹、似乎、不易察觉、闪过
   - 侵略刻板: 不容置喙、小东西、你是我的、猎物、猎人、小妞儿、共犯
   - 粗俗生理: 甜腻、肉刃、邪火、饥渴、哭腔、低吼
   - 俗套淫语: "你是谁的？"、"叫我名字"、"再叫一次"、身体诚实

2. 绝对禁令 (Rigorous Ban List):
   - 🚫 严禁词汇 (Verboten): 石子、羽毛、涟漪、投入、泛起、不易察觉、泛白、抛入、落在、冲击波、炸弹、真空、撕裂、激起、微妙、死寂、手术刀、花蕊、蓓蕾、精密仪器、机器、粉碎机、心率、精确、变量、逻辑、bug、锚点、架构、模块
   - 🚫 严禁句式:
     - "像一个xx投入xx泛起xx" (如"像石子投入湖中泛起涟漪")
     - "他(终于)动了"、"迈开长腿"
     - 禁止使用"逻辑、变量、精密、模块"等词描述状态或性格。
     - 禁止将人物比喻为物体（如：他是一台机器、一把手术刀、没有感情的杀手）

3. 强制自检机制 (Self-Correction):
   - 在生成结束前，必须进行自检。如果发现上述词汇，立即替换。
   - 格式要求：在JSON之前，输出一段注释：
     <!-- 禁词风险X: 检测到可能使用[禁词A]。将调整为[替代方案B]。绝不会使用"石子/涟漪/投入"或"逻辑/变量/锚点"等绝对禁词。 -->

[Persona 内容结构]
请将以下核心属性合并后写入 persona 字段。
**严禁在字段内容中重复输出字段名。直接输出内容细节。**

- **档案与特征**：基本信息及极具辨识度的外貌气场、穿搭习惯。
- **生平与现状**：简洁的编年史（童年、校园、职业生涯至今）。
- **多维性格**：对外社交面具、对内真实心声、冲突下的应激反应。
- **精神内核**：欲望驱动力、处事底线、核心观念体系（三观）。
- **生活图谱**：日常作息、NSFW观念。**人际关系（如是关联生成，重点描写与源人物的独立契合/冲突）**。
- **扮演指南**：核心特质摘要、禁忌行为、标志性口头禅。

[Metadata Fields]
- nickname: 网络 ID (字数 < 7)
- bio: 签名 (字数 < 20)
- region: 微信显示地区
- region_mapping: 真实城市 English Name
- wealth_level: 财富标签 (4字以内)
- remark: 用户备注

[Relationship & Ladder]
- public_relation: 社会外壳关系。
- char_to_user_public/secret: 明面与私下对用户的真实态度（需符合逻辑进化）。
- ladder_persona: 生成 5 个阶段的情感/行为边界演变（严禁越界或 OOC）。

[输出格式]
严格输出 JSON 对象。
**字数红线**：Persona 文本不得超过 **800 字** (约 1200 Tokens)。请通过剥离修饰词、使用短句来维持极高信息密度。
**格式红线**：严禁在 persona 字段内再次嵌套 JSON 字串。

输出 JSON：`;

        const Api = window.Core?.Api || window.API;
        if (!Api) {
            if (btn) { btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; }
            return;
        }

        try {
            const response = await Api.chat([{ role: 'user', content: prompt }]);
            let data = null;

            // [Source Character Update Logic] - Parse and apply source update if present
            const sourceUpdateMatch = response.match(/\[SourceUpdate\]([\s\S]*?)\[\/SourceUpdate\]/);
            if (sourceUpdateMatch && State.genContext && State.genContext.sourceId) {
                const updateText = sourceUpdateMatch[1].trim();
                const sourceChar = window.sysStore.getCharacter(State.genContext.sourceId);

                if (sourceChar && updateText) {
                    console.log('[Associated Gen] Updating source character:', sourceChar.name);

                    // Append to main_persona smartly
                    let newPersona = sourceChar.main_persona || '';
                    if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                        // Try to append near the existing section if possible, otherwise just append to end
                        newPersona += `\n\n【新增人际关系】\n${updateText}`;
                    } else {
                        // Create section if missing
                        newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updateText}`;
                    }

                    // Save source character immediately
                    window.sysStore.updateCharacter(sourceChar.id, {
                        ...sourceChar,
                        main_persona: newPersona
                    });

                    if (window.os) window.os.showToast(`已同步更新【${sourceChar.name || '源角色'}】的人际关系`, 'success', 4000);
                }
            }

            // Clean response for JSON parsing (remove the special block)
            const cleanResponse = response.replace(/\[SourceUpdate\][\s\S]*?\[\/SourceUpdate\]/, '');
            const match = cleanResponse.match(/\{[\s\S]*\}/);

            if (match) {
                data = this._parseJsonSafely(match[0]);
                if (!data) {
                    // Fallback: 尝试从整个响应中提取
                    const first = cleanResponse.indexOf('{');
                    const last = cleanResponse.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        data = this._parseJsonSafely(cleanResponse.substring(first, last + 1));
                    }
                }
            }

            if (!data) {
                throw new Error("AI 返回内容不包含有效的 JSON 格式，请重试");
            }

            if (data) {
                // 4. 应用修改
                targets.forEach(t => {
                    const possibleKeys = [t.key, t.key.replace(/-/g, '_'), t.key.replace(/_/g, '-')];
                    let val = null;
                    for (const pk of possibleKeys) {
                        if (data[pk] !== undefined) { val = data[pk]; break; }
                    }

                    if (val !== null) {
                        // [Fix] 确保填入 DOM 的是字符串，防止出现 [object Object]
                        let displayVal = val;
                        if (typeof val === 'object' && val !== null) {
                            displayVal = val.name || val.label || val.text || JSON.stringify(val);
                        }

                        // [Robust Fix] 如果 AI 抽风在字段内容里又套了一层 JSON (比如 {"persona": "{\"persona\":..."})
                        // 或者 displayVal 看起来像是一段冗余的 JSON 代码块
                        if (typeof displayVal === 'string' && displayVal.trim().startsWith('{') && displayVal.includes(':')) {
                            try {
                                const nested = JSON.parse(displayVal);
                                const nestedKeys = Object.keys(nested);
                                if (nestedKeys.length === 1 && (nestedKeys[0] === t.key || nestedKeys[0] === 'persona' || nestedKeys[0] === 'main_persona')) {
                                    displayVal = nested[nestedKeys[0]];
                                }
                            } catch (e) { /* Not a valid nested JSON, keep as is */ }
                        }

                        // 更新中间对象
                        if (t.internalKey) currentData[t.internalKey] = displayVal;
                        if (t.idx !== undefined && type === 'rel') State.pendingRelationship.ladder_persona[t.idx].content = displayVal;

                        // 更新 DOM (如果可见)
                        const el = document.getElementById(t.id);
                        if (el) {
                            if (el.tagName === 'SELECT') {
                                const searchVal = String(displayVal).toLowerCase();
                                for (let i = 0; i < el.options.length; i++) {
                                    if (el.options[i].value.toLowerCase() === searchVal) { el.value = el.options[i].value; break; }
                                }
                            } else {
                                el.value = displayVal;
                            }
                            el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                // 5. 持久化存储 (使用更新后的 currentData)
                if (type === 'persona' && userId) {
                    window.WeChat.App.savePersonaSettings(userId, currentData, true);
                } else if (type === 'my') {
                    window.WeChat.App.saveMyProfileSettings(currentData, true);
                } else if (type === 'rel' && State.activeSessionId) {
                    window.WeChat.App.saveRelationshipChanges(true);
                }

                window.WeChat.App.render(); // 刷新 UI
                if (window.os) window.os.showToast(targetFieldId ? '生成完成' : '全套人设补全完成', 'success');
            }
        } catch (e) {
            console.error('[AI] Generation Failed:', e);
            const errMsg = e.message || '未知错误';
            if (window.os) window.os.showToast(`生成失败: ${errMsg}`, 'error', 5000);
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
            }
            // Reset Styles
            targets.forEach(t => {
                const el = document.getElementById(t.id);
                if (el) el.style.opacity = '1';
            });
        }
    },

    async generateAssociatedInBackground(targetId, sourceChar, relation) {
        const State = window.WeChat.App.State;
        try {
            // A. Construct Prompts
            const contextStr = [
                `[关联人物生成上下文]`,
                `你正在生成的人物是【${sourceChar.nickname || sourceChar.name}】的【${relation}】。`,
                `${sourceChar.nickname || sourceChar.name}的人设概要：`,
                sourceChar.main_persona || '(无详实人设)',
                `\n[关联生成特殊指令]`,
                `1. 【独立性原则】：这是一个有血有肉、独立存在的人，拥有自己完整的人生轨迹、职业和社交圈。此人绝不是源人物的附庸。请确保其人设的丰富度与源人物相当。`,
                `2. 【备注(remark)生成规则】：这是用户（玩家）在微信通讯录里给这个人打的备注。`,
                `   - 场景：用户刚加上这个人。`,
                `   - 格式：必须是真实的"人名"或"身份标签"（如"陈总"、"小王"、"房东太太"）。`,
                `   - 禁止：绝对不要写成"${sourceChar.name}的朋友"或"${relation}"这种描述性句子。角色本身并不知道用户给了他什么备注。`,
                `3. 请在【生活图谱 - 人际关系】中，明确写出与【${sourceChar.name}】的关系。`,
                `4. 在输出的最后（JSON闭合之后），请额外附带一段给源人物【${sourceChar.name}】的更新文本，格式如下：`,
                `[SourceUpdate]`,
                `在此输出一段文本，这段文本将被追加到【${sourceChar.name}】的人设中的"人际关系"部分，用于描述他/她与这位新角色的关系。`,
                `[/SourceUpdate]`
            ].join('\n');

            const fullPrompt = `你是一个能够洞察灵魂的剧本作家。你的任务是基于关联请求，构建一个极其鲜活、复杂且高度自洽的虚拟角色档案。
            
[已知信息]
${contextStr}

[核心创作戒律]
1. 反模版化与深度自洽：拒绝刻板印象。严禁默认使用"回避型"。如果设定的人物是"理智型"或"情感缺失"，其行为逻辑应贯穿始终。对于此类人，高好感表现应呈现为其逻辑体系内的偏袒与特权，而非性格突变。
2. 视觉特征与气场：禁止使用"帅气/美貌"等空洞标签。请通过具体的皮相描述（如笔挺的鼻梁、略显冷淡的眉眼）、神态细节以及特有的气场氛围（如温润如玉、带有危险气息的优雅、随性散漫感）来构建视觉印象。
3. 拒绝AI腔：禁止出现任何技术性、元指令或文学评论类词汇。
4. 【阶段进化规律】：如果生成好感阶梯，表现必须严谨遵循人设底色。情感缺失者即便好感满值也应保持其特有逻辑，禁止情感突变。
5. 内容量：Roleplay Prompt (Persona) 必须充实。
6. 排版要求 (Formatting)：在 main_persona 等文本字段中，**必须使用 \n 进行分行**，使内容结构清晰，禁止输出成一大坨文字。

[禁词检测与强制替换 (Strict Forbidden List)]
1. 分类避讳清单 (用更生动的描写替代):
   - 模糊陈腐: 一丝、一抹、似乎、不易察觉、闪过
   - 侵略刻板: 不容置喙、小东西、你是我的、猎物、猎人、小妞儿、共犯
   - 粗俗生理: 甜腻、肉刃、邪火、饥渴、哭腔、低吼
   - 俗套淫语: "你是谁的？"、"叫我名字"、"再叫一次"、身体诚实

2. 绝对禁令 (Rigorous Ban List):
   - 🚫 严禁词汇 (Verboten): 石子、羽毛、涟漪、投入、泛起、不易察觉、泛白、抛入、落在、冲击波、炸弹、真空、撕裂、激起、微妙、死寂、手术刀、花蕊、蓓蕾、精密仪器、机器、粉碎机、心率、精确、变量、逻辑、bug、锚点
   - 🚫 严禁句式:
     - "像一个xx投入xx泛起xx" (如"像石子投入湖中泛起涟漪")
     - "他(终于)动了"、"迈开长腿"
     - 禁止使用"心率、逻辑、锚点"等词描述状态。
     - 禁止将人物比喻为物体（如：他是一台机器、一把手术刀、没有感情的杀手）

3. 强制自检机制 (Self-Correction):
   - 在生成结束前，必须进行自检。如果发现上述词汇，立即替换。
   - 格式要求：在JSON之前，输出一段注释：
     <!-- 禁词风险X: 检测到可能使用[禁词A]。将调整为[替代方案B]。绝不会使用"石子/涟漪/投入"或"逻辑/变量/锚点"等绝对禁词。 -->

[Persona (main_persona) 内容结构 - 纯文本设定]
请生成 main_persona 字段，包含：基础档案、编年史、性格透视、深层心理、核心观念、生活图谱(含人际关系)、数字通讯生态、AI扮演指南。
**注意：不要包含 Social Profile 字段。**

[Metadata Fields (必须严格遵守的格式)]
请作为独立 JSON key 返回，并严格遵循以下语言和格式要求：
- species (物种): 必须是中文 (如: 人类, 吸血鬼, AI)。
- wealth_level (财富状况): 必须是中文短语 (如: 负债累累, 财务自由)。
- bio (微信个性签名): 必须是角色自己写的网络签名（句子），严禁写成"高冷/霸道"这种标签！
- region (展示地区): 必须是中文 (如: 中国 上海)。
- region_mapping (现实映射): 必须是真实存在的城市英文名 (如: Shanghai, Tokyo, New York)，用于天气/时区同步。
- nickname (网名): 短小精悍。
- remark (备注): 必须是中文称呼 (如: 陈总, 房东太太)。
- real_name: 真名。
- age: 数字。
- gender: male/female/other。
- birthday: 格式如 "7月7日"。

[输出格式]
Strict JSON Object.`;

            const Api = window.Core?.Api || window.API;
            if (!Api) throw new Error('API not ready');

            // B. Call API
            const response = await Api.chat([{ role: 'user', content: fullPrompt }]);

            // C. Source Update
            // Try to separate based on [SourceUpdate] tag
            const parts = response.split('[SourceUpdate]');
            const jsonPart = parts[0];
            const updatePart = parts.length > 1 ? parts[1].replace('[/SourceUpdate]', '').trim() : null;

            if (updatePart) {
                if (sourceChar.id === 'USER_SELF') {
                    // Special handling for User Self
                    const s = window.sysStore;
                    const currentPersona = s.get('user_persona') || '';
                    let newPersona = currentPersona;
                    if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                        newPersona += `\n\n【新增人际关系】\n${updatePart}`;
                    } else {
                        newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updatePart}`;
                    }
                    s.set('user_persona', newPersona);
                    if (window.os) window.os.showToast(`双向同步：已更新【我】的记忆`, 'success');
                } else {
                    // Standard Character handling
                    const freshSource = window.sysStore.getCharacter(sourceChar.id);
                    if (freshSource) {
                        let newPersona = freshSource.main_persona || '';
                        if (newPersona.includes('人际关系') || newPersona.includes('Life Graph')) {
                            newPersona += `\n\n【新增人际关系】\n${updatePart}`;
                        } else {
                            newPersona += `\n\n[生活图谱 - 补充]\n人际关系：${updatePart}`;
                        }
                        window.sysStore.updateCharacter(freshSource.id, { ...freshSource, main_persona: newPersona });
                        if (window.os) window.os.showToast(`双向同步：已更新【${freshSource.name}】的记忆`, 'success');
                    }
                }
            }

            const cleanResponse = jsonPart; // Use jsonPart directly
            let data = null;

            try {
                const match = cleanResponse.match(/\{[\s\S]*\}/);
                if (match) {
                    data = this._parseJsonSafely(match[0]);
                } else {
                    const first = cleanResponse.indexOf('{');
                    const last = cleanResponse.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        data = this._parseJsonSafely(cleanResponse.substring(first, last + 1));
                    }
                }
            } catch (e) {
                console.error('Background Gen JSON Error', e);
                console.error('Response snippet:', cleanResponse.substring(0, 500));
            }

            // D. Save & Update
            if (data) {
                window.sysStore.updateCharacter(targetId, {
                    id: targetId,
                    name: data.remark || data.nickname || data.realName || 'New Character',
                    real_name: data.real_name || data.real_name, // Fix key
                    remark: data.remark,
                    nickname: data.nickname, // Important
                    bio: data.bio,
                    main_persona: data.persona || data.main_persona,
                    species: data.species,
                    gender: data.gender,
                    region: data.region,
                    wxid: 'wxid_' + Math.random().toString(36).substring(2, 10),
                    settings: {
                        age: data.age,
                        birthday: data.birthday,
                        wealth_level: data.wealth || data.wealth_level,
                        region_mapping: data.region_mapping || data.regionMapping
                    }
                });

                if (window.os) window.os.showToast(`关联人物生成完成！已存入通讯录。`, 'success', 5000);

                // E. Refresh if user is still watching
                if (State.activeSessionId === targetId) {
                    window.WeChat.App.render(); // Trigger full page refresh to update View
                }
            } else {
                if (window.os) window.os.showToast('生成格式解析失败，请重试', 'error');
            }

        } catch (err) {
            console.error(err);
            if (window.os) window.os.showToast('后台生成任务出错', 'error');
        }
    },

    async generateFullRelationshipData() {
        const State = window.WeChat.App.State;
        // [Fix] 立即捕获当前会话和数据的引用，防止在 AI 思考期间切换页面导致数据错乱
        const sessionId = State.activeSessionId;
        const rel = State.pendingRelationship;
        if (!sessionId || !rel) return;

        // 1. Visual Loading State
        const btn = document.getElementById('wx-rel-gen-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `
            <svg class="wx-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: wx-spin 1s linear infinite;">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            生成中...
    `;
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.7';
        }

        const fieldMap = {
            'char_to_user_public_relation': 'wx-rel-char-obj',
            'char_to_user_public_attitude': 'wx-rel-char-pub-att',
            'char_to_user_private_attitude': 'wx-rel-char-pvt-att',
            'user_to_char_public_relation': 'wx-rel-user-obj',
            'user_to_char_public_attitude': 'wx-rel-user-pub-att',
            'user_to_char_private_attitude': 'wx-rel-user-pvt-att',
            'backstory': 'wx-rel-backstory'
        };

        const contextParts = [];
        for (const [key, id] of Object.entries(fieldMap)) {
            const isLocked = !!State.fieldLocks?.[id];
            const value = rel[key] || "(未填写)";
            contextParts.push(`- ${key}: ${value}${isLocked ? " [已锁定]" : " [待生成]"} `);
        }

        const char = window.sysStore.getCharacter(sessionId);
        const charPersona = char?.main_persona || "未知人设";
        const charMeta = {
            age: char?.settings?.age || '不详',
            gender: char?.gender || '不详',
            species: char?.species || '人类',
            wealth: char?.settings?.wealth_level || '不详'
        };

        // [User Request] 获取用户完整人设（关系透镜双向读取）
        const s = window.sysStore;
        const userName = s.get('user_nickname') || s.get('user_realname') || '用户';
        const userPersona = s.get('user_persona') || '普通人，设定待补充';
        const userMeta = {
            age: s.get('user_age') || '不详',
            gender: s.get('user_gender') || '不详',
            species: s.get('user_species') || '人类',
            wealth: s.get('user_wealth') || '不详'
        };

        // [Fix] 获取聊天记录作为上下文参考，使用用户设定的上下文条数
        const memoryLimit = char?.settings?.memory_limit || 200;
        const chatHistory = s.getMessagesBySession ? s.getMessagesBySession(sessionId) : [];
        // 取最近 memory_limit 条消息作为参考
        const recentMessages = chatHistory.slice(-memoryLimit);
        let chatContext = '';
        if (recentMessages.length > 0) {
            const chatSummary = recentMessages.map(m => {
                const sender = (m.sender_id === 'user' || m.sender_id === 'me') ? '用户' : char?.name || '角色';
                let content = m.content;
                // 简化特殊消息类型
                if (m.type === 'image') content = '[发送了图片]';
                else if (m.type === 'sticker') content = '[发送了表情]';
                else if (m.type === 'voice') content = '[发送了语音]';
                else if (m.type === 'transfer') {
                    try {
                        const trans = JSON.parse(m.content);
                        content = `[转账 ${trans.amount}元: ${trans.note || ''}]`;
                    } catch (e) {
                        content = '[转账]';
                    }
                }
                return `${sender}: ${content}`;
            }).join('\n');
            chatContext = `\n\n[最近聊天记录参考（${recentMessages.length}条）]\n${chatSummary}\n\n**重要**：请仔细分析上述聊天记录，了解双方的实际互动模式、语气、话题和关系发展情况，确保生成的关系设定与真实的聊天氛围相符。`;
        }

        if (window.os) window.os.showToast('正在多维度分析双向设定...', 'info', 3000);

        const prompt = `请基于双方完整的人设档案（包括所有设定和现有关系）、聊天记录和当前关系状态，生成简洁、自然的关系设定。**核心原则：必须严格保持角色原有的性格底色，不得极端化或改变角色本质。必须仔细参考双方人设中的人际关系信息，确保生成的关系设定与双方的整体社交网络和关系背景完全契合。**

[角色 A: ${char?.name || '角色'}]
- 元数据: 年龄 ${charMeta.age}, 性别 ${charMeta.gender}, 族群 ${charMeta.species}, 经济状况 ${charMeta.wealth}
- 完整人设（包含人际关系）: ${charPersona}

[角色 B: ${userName}(用户)]
- 元数据: 年龄 ${userMeta.age}, 性别 ${userMeta.gender}, 族群 ${userMeta.species}, 经济状况 ${userMeta.wealth}
- 完整人设（包含人际关系）: ${userPersona}
${chatContext}

[关系当前状态]
${contextParts.join('\n')}

[生成要求]
1. **参考完整上下文**：必须仔细参考以下所有信息：
   - 双方的所有人设信息（包括性格、背景、现有关系设定、人际关系等）
   - **聊天记录中的实际互动情况**（语气、话题、关系发展、双方表现出的态度等）
   - 确保生成的关系设定与双方的人设和实际聊天表现完全契合
   - 特别注意人设中提到的"人际关系"、"生活图谱"等部分，这些信息对理解角色的社交背景至关重要
2. **保持角色底色**：生成的关系设定必须完全符合角色原有的性格特质，不得为了"戏剧张力"而改变角色的本质。如果角色是理性冷静的，关系设定也应保持理性；如果角色是温和的，关系设定也应保持温和。
3. **简洁自然**：描述要简洁、生活化，避免过度渲染或极端化表达。使用日常语言，像真实的人在描述关系。
4. **关系字段（按实体分组）**：
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
   - 每个阶段：affection_threshold(0, 20, 50, 80, 100) 和 content(简洁描述**角色**在该阶段的行为特征，必须少于30字)

[输出格式]
仅输出 JSON 对象：
{
    "char_to_user_public_relation": "...",
    "char_to_user_public_attitude": "...",
    "char_to_user_private_attitude": "...",
    "user_to_char_public_relation": "...",
    "user_to_char_public_attitude": "...",
    "user_to_char_private_attitude": "...",
    "backstory": "...",
    "ladder_persona": [
        { "affection_threshold": 0, "content": "..." },
        { "affection_threshold": 20, "content": "..." },
        { "affection_threshold": 50, "content": "..." },
        { "affection_threshold": 80, "content": "..." },
        { "affection_threshold": 100, "content": "..." }
    ]
}

[禁止事项]
- 严禁改变角色的性格底色
- 严禁使用极端化、戏剧化的表达
- 严禁出现技术性词汇：逻辑、变量、bug、锚点、精密、阶梯、设定、描写、映射、模块、架构

输出 JSON：`;

        const Api = window.Core?.Api || window.API;
        if (!Api) {
            if (btn) { btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; }
            return;
        }

        try {
            console.log('[RelationshipGen] Sending prompt with dual personas...');
            const response = await Api.chat([{ role: 'user', content: prompt }]);
            console.log('[RelationshipGen] Raw Response:', response);

            let data = null;
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                data = this._parseJsonSafely(match[0]);
                if (!data) {
                    console.warn('[RelationshipGen] First JSON parse attempt failed, trying substring.');
                    const first = response.indexOf('{');
                    const last = response.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        data = this._parseJsonSafely(response.substring(first, last + 1));
                        if (!data) {
                            console.error('[RelationshipGen] All JSON parse attempts failed.');
                        }
                    }
                }
            }

            if (data) {
                console.log('[RelationshipGen] Parsed Data:', data);
                // 4. 应用修改 (使用局部变量 rel)
                for (const [key, id] of Object.entries(fieldMap)) {
                    if (!State.fieldLocks?.[id]) {
                        const possibleKeys = [key, key.replace(/_/g, '-'), key.replace(/-/g, '_')];
                        let val = null;
                        for (const pk of possibleKeys) {
                            if (data[pk] !== undefined) { val = data[pk]; break; }
                        }
                        if (val !== null) rel[key] = val;
                    }
                }

                if (!State.fieldLocks?.['wx-rel-ladder']) {
                    const ladderVal = data.ladder_persona || data.ladder;
                    if (Array.isArray(ladderVal)) {
                        console.log('[RelationshipGen] Applying ladder_persona:', ladderVal);
                        rel.ladder_persona = ladderVal.map(item => ({
                            affection_threshold: item.affection_threshold ?? item.threshold ?? 0,
                            content: item.content || item.performance || item.desc || '...'
                        }));
                    } else {
                        console.warn('[RelationshipGen] ladder_persona is not an array or missing.');
                    }
                }

                if (window.os) window.os.showToast('✨ 关系设定已完成', 'success');
                // [Fix] 显式传递 sessionId 和 rel，确保异步保存准确
                window.WeChat.App.saveRelationshipChanges(true, sessionId, rel);
                window.WeChat.App.render();
            } else {
                throw new Error("Invalid JSON structure in AI response");
            }
        } catch (e) {
            console.error('[RelationshipGen] Failed:', e);
            const errMsg = e.message || '未知错误';
            if (window.os) window.os.showToast(`生成失败: ${errMsg}`, 'error', 5000);
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            }
        }
    }
};
