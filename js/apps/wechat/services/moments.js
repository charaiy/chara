/**
 * js/apps/wechat/services/moments.js
 * 朋友圈核心数据服务 - Chara OS
 * 
 * 职责：
 * - 朋友圈帖子 CRUD（发布、删除、获取）
 * - AI 自动发朋友圈（基于角色频率/风格设置）
 * - 点赞 / 评论互动（角色之间、角色与用户）
 * - 角色朋友圈设置管理（发布频率、风格）
 * - 与关系网、视角、人设、个性签名等联动
 * 
 * 数据结构：
 * MomentPost {
 *   id: string,                    // 唯一标识
 *   authorId: string,              // 发布者ID ('USER_SELF' 或 角色ID)
 *   content: string,               // 文字内容
 *   images: string[],              // 图片列表 (base64 或 URL)
 *   timestamp: number,             // 发布时间戳
 *   likes: string[],               // 点赞者ID列表
 *   comments: MomentComment[],     // 评论列表
 *   visibility: string,            // 可见性: 'all' | 'partial' | 'private'
 *   visibleTo: string[],           // 可见者列表（partial时用）
 *   location: string,              // 位置信息
 *   isAIGenerated: boolean,        // 是否AI生成
 * }
 * 
 * MomentComment {
 *   id: string,
 *   authorId: string,
 *   replyTo: string|null,          // 回复谁的评论ID（null表示直接评论）
 *   replyToAuthorId: string|null,  // 被回复者ID
 *   content: string,
 *   timestamp: number,
 * }
 * 
 * CharMomentSettings {
 *   frequency: string,             // 'high' | 'medium' | 'low' | 'never'
 *   style: string,                 // 自定义风格描述
 *   lastAutoPost: number,          // 上次自动发布时间
 *   coverImage: string,            // 朋友圈封面图
 * }
 * 
 * 依赖：
 * - window.sysStore: 数据存储
 * - window.WeChat.Services.RelationshipGraph: 关系网
 * - window.WeChat.Services.Contacts: 联系人
 * - window.Core.Api: API调用
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Moments = {
    STORAGE_KEY: 'chara_moments_v1',
    SETTINGS_KEY: 'chara_moments_settings_v1',
    COVER_KEY: 'chara_moments_covers_v1',

    // ==========================================
    // 初始化
    // ==========================================
    init() {
        if (!window.sysStore) return;
        // 确保存储结构存在
        if (!window.sysStore.get(this.STORAGE_KEY)) {
            window.sysStore.set(this.STORAGE_KEY, []);
        }
        if (!window.sysStore.get(this.SETTINGS_KEY)) {
            window.sysStore.set(this.SETTINGS_KEY, {});
        }
        if (!window.sysStore.get(this.COVER_KEY)) {
            window.sysStore.set(this.COVER_KEY, {});
        }
        console.log('[Moments] 朋友圈服务初始化完成');

        // 初始化时清理一次过期旧帖子，释放存储空间
        this.compressOldPosts();

        // 启动后台发帖轮询
        if (!this._backgroundThreadStarted) {
            this._backgroundThreadStarted = true;
            // 短启动延迟，让UI渲染完毕
            setTimeout(() => {
                this.checkAutoPost(); // 运行一次
                setInterval(async () => {
                    if (this._isCheckingAutoPost) return;
                    this._isCheckingAutoPost = true;
                    try {
                        await this.checkAutoPost();
                    } finally {
                        this._isCheckingAutoPost = false;
                    }
                }, 3 * 60 * 1000); // 3分钟检查一次
            }, 10000);
        }
    },

    // ==========================================
    // 帖子 CRUD
    // ==========================================

    /**
     * 获取所有帖子（按时间倒序）
     * @param {object} options - { limit, authorId, viewerId }
     * @returns {Array} 帖子列表
     */
    getPosts(options = {}) {
        const { limit = 50, authorId = null, viewerId = 'USER_SELF' } = options;
        let posts = [...window.sysStore.get(this.STORAGE_KEY, [])];

        // 按作者过滤
        if (authorId) {
            posts = posts.filter(p => p.authorId === authorId);
        }

        // 可见性过滤（基于视角）
        if (viewerId) {
            posts = posts.filter(p => this._isVisibleTo(p, viewerId));
        }

        // 按时间倒序
        posts.sort((a, b) => b.timestamp - a.timestamp);

        // 限制数量
        if (limit) {
            posts = posts.slice(0, limit);
        }
        return posts;
    },

    /**
     * 获取最近朋友圈动态摘要 (用于聊天Prompt上下文)
     * @param {string} viewerId - 观察者角色ID
     * @param {number} limit - 摘要帖子数量
     */
    getRecentFeedSummary(viewerId, limit = 3) {
        const posts = this.getPosts({ viewerId, limit });
        if (posts.length === 0) return '最近朋友圈没有新动态。';

        return posts.map(p => {
            const author = this.getAuthorName(p.authorId);
            const time = this.formatTime(p.timestamp);
            let summary = `[${time}] ${author}发布 (ID: ${p.id}): "${p.content.substring(0, 50)}${p.content.length > 50 ? '...' : ''}"`;
            if (p.comments.length > 0) {
                const rs = p.comments.slice(-2).map(c => `${this.getAuthorName(c.authorId)}: ${c.content}`).join('; ');
                summary += ` (评论: ${rs})`;
            }
            return summary;
        }).join('\n');
    },

    /**
     * 获取单个帖子
     */
    getPost(postId) {
        const posts = window.sysStore.get(this.STORAGE_KEY, []);
        return posts.find(p => p.id === postId) || null;
    },

    /**
     * 发布朋友圈
     * @param {object} data - { authorId, content, images, location, visibility, visibleTo }
     * @returns {object} 创建的帖子
     */
    createPost(data) {
        const post = {
            id: 'moment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            authorId: data.authorId || 'USER_SELF',
            content: data.content || '',
            images: data.images || [],
            timestamp: data.timestamp || Date.now(),
            likes: [],
            comments: [],
            visibility: data.visibility || 'all',
            visibleTo: data.visibleTo || [],
            location: data.location || '',
            isAIGenerated: data.isAIGenerated || false,
        };

        const posts = window.sysStore.get(this.STORAGE_KEY, []);
        posts.push(post);
        window.sysStore.set(this.STORAGE_KEY, posts);

        // 自动压缩旧帖子，防止无限增长
        this.compressOldPosts();

        console.log(`[Moments] 新帖子发布: ${post.authorId} - "${post.content.substring(0, 20)}..."`);
        return post;
    },

    /**
     * 删除帖子
     */
    deletePost(postId) {
        let posts = window.sysStore.get(this.STORAGE_KEY, []);
        posts = posts.filter(p => p.id !== postId);
        window.sysStore.set(this.STORAGE_KEY, posts);
    },

    // ==========================================
    // 互动：点赞 / 评论
    // ==========================================

    /**
     * 切换点赞
     * @param {string} postId
     * @param {string} userId - 点赞者ID
     * @returns {boolean} 是否已点赞（切换后状态）
     */
    toggleLike(postId, userId = 'USER_SELF') {
        const posts = window.sysStore.get(this.STORAGE_KEY, []);
        const post = posts.find(p => p.id === postId);
        if (!post) return false;

        const idx = post.likes.indexOf(userId);
        if (idx >= 0) {
            post.likes.splice(idx, 1);
            window.sysStore.set(this.STORAGE_KEY, posts);
            return false;
        } else {
            post.likes.push(userId);
            window.sysStore.set(this.STORAGE_KEY, posts);
            return true;
        }
    },

    /**
     * 添加评论
     * @param {string} postId
     * @param {object} commentData - { authorId, content, replyTo, replyToAuthorId }
     * @returns {object|null} 创建的评论
     */
    addComment(postId, commentData) {
        const posts = window.sysStore.get(this.STORAGE_KEY, []);
        const post = posts.find(p => p.id === postId);
        if (!post) return null;

        const comment = {
            id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            authorId: commentData.authorId || 'USER_SELF',
            replyTo: commentData.replyTo || null,
            replyToAuthorId: commentData.replyToAuthorId || null,
            content: commentData.content || '',
            timestamp: Date.now(),
        };

        post.comments.push(comment);
        window.sysStore.set(this.STORAGE_KEY, posts);
        return comment;
    },

    /**
     * 删除评论
     */
    deleteComment(postId, commentId) {
        const posts = window.sysStore.get(this.STORAGE_KEY, []);
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        post.comments = post.comments.filter(c => c.id !== commentId);
        window.sysStore.set(this.STORAGE_KEY, posts);
    },

    // ==========================================
    // 角色朋友圈设置
    // ==========================================

    /**
     * 获取角色的朋友圈设置
     */
    getCharSettings(charId) {
        const all = window.sysStore.get(this.SETTINGS_KEY, {});
        return all[charId] || {
            frequency: 'medium',
            style: '',
            lastAutoPost: 0,
        };
    },

    /**
     * 保存角色的朋友圈设置
     */
    saveCharSettings(charId, settings) {
        const all = window.sysStore.get(this.SETTINGS_KEY, {});
        all[charId] = { ...(all[charId] || {}), ...settings };
        window.sysStore.set(this.SETTINGS_KEY, all);
    },

    // ==========================================
    // 封面管理
    // ==========================================

    /**
     * 获取封面图
     * @param {string} ownerId - 'USER_SELF' 或角色ID
     */
    getCoverImage(ownerId) {
        const covers = window.sysStore.get(this.COVER_KEY, {});
        return covers[ownerId] || '';
    },

    /**
     * 设置封面图
     */
    setCoverImage(ownerId, imageDataUrl) {
        const covers = window.sysStore.get(this.COVER_KEY, {});
        covers[ownerId] = imageDataUrl;
        window.sysStore.set(this.COVER_KEY, covers);
    },

    // ==========================================
    // AI 自动发朋友圈
    // ==========================================

    /**
     * 获取频率对应的间隔时间（毫秒）
     */
    _getFrequencyInterval(frequency) {
        if (frequency === 'never') return Infinity;

        // Custom hours processing
        const hours = parseFloat(frequency);
        if (!isNaN(hours) && hours > 0) {
            return hours * 60 * 60 * 1000;
        }

        // Legacy compatibility
        switch (frequency) {
            case 'high': return 2 * 60 * 60 * 1000;       // 2小时
            case 'medium': return 6 * 60 * 60 * 1000;     // 6小时
            case 'low': return 24 * 60 * 60 * 1000;       // 24小时
            default: return 6 * 60 * 60 * 1000;
        }
    },

    /**
     * 检查并触发所有角色的自动发朋友圈
     * 应该在后台定期调用
     */
    async checkAutoPost() {
        const isBgActivity = window.sysStore?.get('bg_activity_enabled') === 'true';
        if (!isBgActivity) {
            return; // 后台活跃总开关未开启，什么都不做
        }

        const contacts = window.WeChat?.Services?.Contacts?.getContacts() || [];
        for (const contact of contacts) {
            if (contact.type === 'system') continue;
            try {
                await this._checkAndAutoPostForChar(contact.id);
            } catch (e) {
                console.warn(`[Moments] 角色 ${contact.id} 自动发朋友圈失败:`, e);
            }
            // 错峰停顿，避免并发请求风暴
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }
    },

    /**
     * 检查单个角色是否需要自动发朋友圈
     */
    async _checkAndAutoPostForChar(charId) {
        const settings = this.getCharSettings(charId);
        if (settings.frequency === 'never') return;

        const interval = this._getFrequencyInterval(settings.frequency);
        const now = Date.now();

        // 引入错峰：如果之前没发过，赋予一个随机的上次发送时间，防止全部在一瞬间触发
        if (!settings.lastAutoPost || settings.lastAutoPost === 0) {
            const staggeredLastPost = now - interval + Math.floor(Math.random() * interval);
            this.saveCharSettings(charId, { lastAutoPost: staggeredLastPost });
            return;
        }

        const missedTime = now - settings.lastAutoPost;
        if (missedTime < interval) return;

        // 如果积压了太久 (超过 1.5 倍周期没发，通常代表系统曾长期关闭或刚重启)
        if (missedTime > interval * 1.5) {
            // [New Feature] 离线补偿机制：让他们根据流逝的时间，模拟在离线期间发的朋友圈
            const missedCycles = Math.floor(missedTime / interval);

            // 为了兼顾 API 和用户感受，只有当用户切到聊天页和这个角色说话，我们再悄悄生成。
            // 因此，不在后台立刻发，而是把需要补偿的“历史时间戳”记在本地等待触发。
            if (missedCycles >= 1 && Math.random() < 0.7) { // 70% 概率触发补偿
                const historyDelay = Math.floor(Math.random() * (missedTime - interval)) + interval;
                const historicalTime = now - historyDelay;

                settings.pendingMissedPosts = settings.pendingMissedPosts || [];
                settings.pendingMissedPosts.push(historicalTime);
            }

            // 更新本次轮询后的下一次发帖计时器 (打散分布)
            const staggeredLastPost = now - interval + Math.floor(Math.random() * interval);
            settings.lastAutoPost = staggeredLastPost;
            this.saveCharSettings(charId, settings);
            return; // 结束本轮检测，不消耗API
        }

        // 触发 AI 生成
        await this.generateMomentForChar(charId);
    },

    /**
     * 检查并消耗待办历史帖子（用户触发）
     */
    async _checkMissedPostsOnInteraction(charId) {
        const settings = this.getCharSettings(charId);
        if (settings.pendingMissedPosts && settings.pendingMissedPosts.length > 0) {
            // 取出一个历史时间点
            const historicalTime = settings.pendingMissedPosts.shift();
            this.saveCharSettings(charId, settings); // 消费掉

            console.log(`[Moments] 交互触发：角色 ${charId} 补偿发布离线朋友圈 (模拟发于 ${new Date(historicalTime).toLocaleString()})`);

            // 将补偿标志传入生成器，AI会根据这个时间点生成回忆
            await this.generateMomentForChar(charId, '根据当时流逝的时间，记录一下当时的感悟或事件。不要暴露你是“补发”的，语气就是活在那个当下的瞬间', historicalTime);
        }
    },

    /**
     * AI 生成角色朋友圈内容
     * @param {string} charId - 角色ID
     * @param {string} topic - (可选) 主题
     * @param {number} forceTimestamp - (可选) 强制指定发布时间（用于离线补偿）
     * @returns {object|null} 生成的帖子
     */
    async generateMomentForChar(charId, topic = null, forceTimestamp = null) {
        const char = window.sysStore?.getCharacter(charId);
        if (!char) return null;

        const api = window.Core?.Api;
        if (!api) {
            console.warn('[Moments] API 服务不可用');
            return null;
        }

        // 构建朋友圈专用 Prompt
        const prompt = this._buildMomentPrompt(charId, char, forceTimestamp);
        const userPrompt = topic ? `请发布一条关于“${topic}”的朋友圈动态。` : '请发布一条朋友圈动态。';

        try {
            const response = await api.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.9 });

            if (!response) return null;

            // 解析 AI 响应
            const parsed = this._parseAIResponse(response);
            if (!parsed) return null;

            // 创建帖子
            const post = this.createPost({
                authorId: charId,
                content: parsed.content,
                images: parsed.images || [],
                location: parsed.location || '',
                isAIGenerated: true,
                timestamp: forceTimestamp || Date.now(),
            });

            // 更新上次自动发布时间，如果是补偿贴，不重置真实计时器
            if (!forceTimestamp) {
                this.saveCharSettings(charId, { lastAutoPost: Date.now() });
            }

            // 触发其他角色的互动反应
            setTimeout(() => {
                this._triggerReactions(post);
            }, 3000 + Math.random() * 10000);

            return post;

        } catch (e) {
            console.error(`[Moments] AI 生成朋友圈失败 (${charId}):`, e);
            return null;
        }
    },

    /**
     * 构建朋友圈专用 Prompt
     */
    _buildMomentPrompt(charId, char, forceTimestamp = null) {
        const settings = this.getCharSettings(charId);
        const now = forceTimestamp ? new Date(forceTimestamp) : new Date();
        const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const currentOutfit = char.status?.outfit || '日常服装';
        const currentLocation = char.status?.location || '某个地方';
        const innerVoice = char.status?.inner_voice || '';
        const mood = char.status?.mood || '平静';
        const bio = char.bio || '';

        // 获取最近几条该角色的朋友圈（避免重复）
        const recentPosts = this.getPosts({ authorId: charId, limit: 5 });
        const recentContents = recentPosts.map(p => `- "${p.content.substring(0, 40)}"`).join('\n');

        // 获取关系网信息（影响发朋友圈风格）
        let relationContext = '';
        if (window.WeChat.Services.RelationshipGraph) {
            const rels = window.WeChat.Services.RelationshipGraph.getNodeRelationships(charId);
            if (rels && rels.length > 0) {
                const relSummary = rels.slice(0, 5).map(r => {
                    const otherNode = window.WeChat.Services.RelationshipGraph.getNode(
                        r.nodeA === charId ? r.nodeB : r.nodeA
                    );
                    const otherName = otherNode?.name || '某人';
                    const rel = r.nodeA === charId ? r.viewAToB : r.viewBToA;
                    return `${otherName}: ${rel || '普通关系'}`;
                }).join(', ');
                relationContext = `\n关系网: ${relSummary}`;
            }
        }

        // 风格指示
        const styleHint = settings.style
            ? `\n**发朋友圈风格特征**: ${settings.style}`
            : '';

        return `# 角色朋友圈发布任务

你是 "${char.name}"（${char.nickname || char.name}）。

## 角色人设
${char.main_persona || '一个正常的现代人'}

## 当前状态
- 时间: ${timeStr}
- 地点: ${currentLocation}
- 服装: ${currentOutfit}
- 心情: ${mood}
- 个性签名: ${bio}
${innerVoice ? `- 内心: ${innerVoice}` : ''}
${relationContext}
${styleHint}

## 最近发过的朋友圈（避免重复）
${recentContents || '(暂无)'}

## 任务
请写一条符合你人设的朋友圈动态。

⚠️ 严格社交准则与内容偏好:
1. **去用户中心化 (关键)**: 你的朋友圈是为了记录 **你自己的生活**。90% 的内容应关于你的工作吐槽、专业心得、兴趣爱好（运动/阅读/美食）、此时此刻的所在地或神态。只有你在恋爱脑或发生重大互动后，才可能发关于对方的内容。
2. **内容类型多样化**: 随机从以下类型中选择（需符合当下场景和人设）:
   - **文字型**: 纯感慨、段子或吐槽。
   - **图文型**: 必须包含 \`images\` 数组。
   - **音乐分享**: 形式如 "分享歌曲: [歌名]"，并配上你的听后感。
   - **链接/文章**: 比如同事转发行业动态，八卦角色转发娱乐新闻。
   - **地点签到**: \`location\` 字段记录你当下的具体场景。
3. **图文比例控制**: 约有 50% 的概率不带任何图片。
4. **现实分寸**: 克制性格的角色绝不会公开宣泄负面情绪或产生争执。

## 输出格式（JSON）
{
  "type": "text / images / music / link",
  "content": "朋友圈文字内容",
  "images": ["图片描述1", ...],
  "location": "可选：当前具体位置",
  "visibility": "all / private / partial"
}
只输出 JSON。`;
    },

    /**
     * 解析 AI 响应中的 JSON
     */
    _parseAIResponse(response) {
        try {
            // 尝试从响应中提取 JSON
            let jsonStr = response;

            // 清理 markdown 包裹
            const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (mdMatch) jsonStr = mdMatch[1];

            // 清理前后多余内容
            jsonStr = jsonStr.trim();
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
            }

            const data = JSON.parse(jsonStr);
            return {
                content: data.content || '',
                images: Array.isArray(data.images) ? data.images : [],
                location: data.location || '',
            };
        } catch (e) {
            console.warn('[Moments] 解析朋友圈响应失败:', e);
            // 降级：把整个响应当文字内容
            if (response && response.length < 500) {
                return { content: response.trim(), images: [], location: '' };
            }
            return null;
        }
    },

    // ==========================================
    // 互动反应系统（深度整合关系网）
    // ==========================================

    /**
     * 解析关系信息，返回更易读的分类
     */
    _getRelationInfo(reactorId, posterId, rel) {
        const info = {
            summary: '普通朋友',
            isLover: false,
            isCrush: false,
            isClose: false,
            isEnemy: false,
            isCold: false,
            isNormal: true,
            // 保留双向原始数据，供 prompt 使用
            reactorView: '',  // reactor 对 poster 的视角
            posterView: ''    // poster 对 reactor 的视角
        };

        if (!rel) return info;

        // 确定方向：reactor 在这条关系中是 nodeA 还是 nodeB
        const isReactorA = rel.nodeA === reactorId;

        // 提取 reactor→poster 的单向视角（关系标签 + 态度）
        const reactorRelation = isReactorA
            ? (rel.aViewOfB || rel.a_to_b_public_relation || '')
            : (rel.bViewOfA || rel.b_to_a_public_relation || '');
        const reactorAttitude = isReactorA
            ? (rel.aTowardB || rel.a_to_b_public_attitude || rel.a_to_b_private_attitude || '')
            : (rel.bTowardA || rel.b_to_a_public_attitude || rel.b_to_a_private_attitude || '');

        // 提取 poster→reactor 的视角（仅供上下文参考，不影响互动判定）
        const posterRelation = isReactorA
            ? (rel.bViewOfA || rel.b_to_a_public_relation || '')
            : (rel.aViewOfB || rel.a_to_b_public_relation || '');
        const posterAttitude = isReactorA
            ? (rel.bTowardA || rel.b_to_a_public_attitude || rel.b_to_a_private_attitude || '')
            : (rel.aTowardB || rel.a_to_b_public_attitude || rel.a_to_b_private_attitude || '');

        info.reactorView = (reactorRelation + ' ' + reactorAttitude).trim();
        info.posterView = (posterRelation + ' ' + posterAttitude).trim();

        // 只用 reactor 自己的视角来判定互动意愿
        const myView = (reactorRelation + reactorAttitude).toLowerCase();

        if (/恋人|情侣|死心塌地|一生挚爱|男朋友|女朋友/.test(myView)) {
            info.isLover = true; info.summary = '恋人关系';
        } else if (/暗恋|喜欢|好感|倾慕|单相思/.test(myView)) {
            info.isCrush = true; info.summary = '暗恋/好感';
        } else if (/好友|闺蜜|兄弟|死党|挚友|知己|铁磁/.test(myView)) {
            info.isClose = true; info.summary = '亲密好友';
        } else if (/仇人|讨厌|死对头|不和|敌人|厌恶|眼中钉|宿敌/.test(myView)) {
            info.isEnemy = true; info.summary = '关系恶劣';
        } else if (/冷淡|陌生|无感|路人/.test(myView)) {
            info.isCold = true; info.summary = '冷淡关系';
        }

        if (info.isLover || info.isCrush || info.isClose || info.isEnemy) info.isNormal = false;
        return info;
    },

    /**
     * 基于关系网、好感度和人设判断角色是否应该对帖子做出【点赞/评论】反应
     */
    _shouldReact(reactorId, posterId) {
        const rel = window.WeChat?.Services?.RelationshipGraph?.getRelationship(reactorId, posterId);
        const relInfo = this._getRelationInfo(reactorId, posterId, rel);

        // 获取当前好感度 (0-100)
        let affection = 0;
        if (posterId === 'USER_SELF') {
            const reactor = window.sysStore?.getCharacter(reactorId);
            affection = parseFloat(reactor?.status?.affection || 0);
            if (isNaN(affection)) affection = 0;
        }

        // 基础概率设定 (Base Probabilities)
        let baseProb = 0.05; // 默认普通路人 5% 互动率

        if (posterId === 'USER_SELF') {
            // 对用户的关系加成
            if (relInfo.isLover) baseProb = 0.45; // 恋人有约 45% 概率互动
            else if (relInfo.isClose) baseProb = 0.25; // 密友约 25%
            else if (relInfo.isCrush) baseProb = 0.35; // 暗恋会更关注，约 35%
            else if (relInfo.isEnemy) baseProb = 0.10; // 仇人偶尔视奸或嘲讽
            else if (relInfo.isCold) baseProb = 0.02; // 冷淡的基本不回

            // 好感度加成 (0好感不加, 100好感增加 50% 的原始概率)
            baseProb *= (1 + (affection / 200));
        } else {
            // 角色与角色之间的互动 (更低，毕竟不是主角)
            if (relInfo.isLover) baseProb = 0.3;
            else if (relInfo.isClose) baseProb = 0.15;
            else if (relInfo.isEnemy) baseProb = 0.08;
        }

        // 人设调节系数 (Persona Multiplier)
        const reactor = window.sysStore?.getCharacter(reactorId);
        const persona = (reactor?.main_persona || '').toLowerCase();

        // 性格冷淡或工作繁忙的人设，互动率再减半
        if (/高冷|克制|理智|冷淡|傲慢|冷漠|繁忙/.test(persona)) {
            baseProb *= 0.5;
        }
        // 性格热情或八卦的人设，互动率提升
        if (/热情|话痨|八卦|外向|活泼/.test(persona)) {
            baseProb *= 1.5;
        }

        // 最终裁定
        const finalProb = Math.min(0.8, baseProb); // 最高封顶 80%
        return Math.random() < finalProb;
    },

    /**
     * 触发互动反应
     * @param {object} post - 如果提供，则全员探测该贴
     * @param {string} actorId - 如果提供，则该角色探测所有可见贴（用于聊天顺便触发）
     */
    async _triggerReactions(post = null, actorId = null) {
        const api = window.Core?.Api;
        if (!api) return;

        const moments = this;

        // 逻辑 A：特定角色刷朋友圈 (省API高效模式)
        if (actorId && !post) {
            const visiblePosts = this.getPosts({ viewerId: actorId, limit: 10 });
            for (const p of visiblePosts) {
                // 已经互动过就不再刷了
                if (p.likes.includes(actorId) || p.comments.some(c => c.authorId === actorId)) continue;

                // 决定是否互动
                if (this._shouldReact(actorId, p.authorId)) {
                    const delay = 1000 + Math.random() * 5000;
                    setTimeout(() => moments._generateReaction(actorId, p), delay);
                }
            }
            return;
        }

        // 逻辑 B：全员探测新贴 (发布瞬间模式)
        if (post) {
            const freshPost = this.getPost(post.id);
            if (!freshPost) return;
            const contacts = window.WeChat?.Services?.Contacts?.getContacts() || [];

            for (const contact of contacts) {
                if (contact.type === 'system' || contact.id === post.authorId) continue;
                if (!this._isVisibleTo(freshPost, contact.id)) continue;

                if (this._shouldReact(contact.id, post.authorId)) {
                    const delay = 5000 + Math.random() * 20000;
                    setTimeout(() => moments._generateReaction(contact.id, freshPost), delay);
                }
            }
            // 启动后续多轮评论循环（仅限能看见该帖子的角色参与盖楼）
            const validReactors = contacts.filter(c => c.id !== post.authorId && this._isVisibleTo(freshPost, c.id));
            setTimeout(() => this._multiRoundCommentLoop(post.id, validReactors, 0), 25000);
        }
    },

    /**
     * 多轮评论互动循环 (增加被动触发限制和面子因素)
     */
    async _multiRoundCommentLoop(postId, reactors, round, maxRounds = 6) {
        if (round >= maxRounds) {
            await this._updateRelationshipsFromComments(postId);
            return;
        }

        const freshPost = this.getPost(postId);
        if (!freshPost || freshPost.comments.length === 0) return;

        let hadNewComment = false;

        for (const reactor of reactors) {
            // 计算当前角色的动态轮数上限 (Dynamic Max Rounds)
            const rel = window.WeChat?.Services?.RelationshipGraph?.getRelationship(reactor.id, freshPost.authorId);
            const relInfo = this._getRelationInfo(reactor.id, freshPost.authorId, rel);

            let myMaxRounds = 1; // 默认普通关系，回一句就消失
            if (relInfo.isLover || relInfo.isClose) myMaxRounds = 6;
            if (relInfo.isEnemy) myMaxRounds = 3; // 朋友圈吵架很丢人，即便仇人也多在3轮内结束

            // 人设对轮数的影响 (性格克制、地位高的人即使关系好也极少回复超过2轮)
            const persona = (reactor.main_persona || '').toLowerCase();
            if (/克制|高冷|理智|冷淡|地位高|傲慢|体面/.test(persona)) {
                myMaxRounds = Math.min(myMaxRounds, 2);
            }

            if (round >= myMaxRounds) continue;

            // 查找专门针对我的新消息，且只能看到"我"的好友发出的评论
            const visibleComments = freshPost.comments.filter(c => this._isFriend(reactor.id, c.authorId));
            const lastMyComment = [...visibleComments].reverse().find(c => c.authorId === reactor.id);
            const newsForMe = visibleComments.filter(c =>
                (c.replyToAuthorId === reactor.id || c.content.includes(`@${reactor.name}`)) &&
                (!lastMyComment || c.timestamp > lastMyComment.timestamp)
            );

            // 重要限制：如果我已经是可见评论里最后一个回复者，绝不继续刷屏
            if (lastMyComment && visibleComments.length > 0 && visibleComments[visibleComments.length - 1].authorId === reactor.id) {
                continue;
            }

            // 介入判断：如果没有针对我的回复，但我还没评论过且关系紧密/对立，可能“插嘴”
            let targetCmt = null;
            if (newsForMe.length > 0) {
                targetCmt = newsForMe[0];
            } else if (!lastMyComment) {
                // 如果我还没说话，按概率决定是否“插嘴”
                if (this._shouldReact(reactor.id, freshPost.authorId)) {
                    // 尝试找一条可见的评论去互动
                    const otherVisibleCmts = visibleComments.filter(c => c.authorId !== reactor.id);
                    if (otherVisibleCmts.length > 0) {
                        targetCmt = otherVisibleCmts[Math.floor(Math.random() * otherVisibleCmts.length)];
                    }
                }
            }

            if (!targetCmt) continue;

            // 设定回复概率：随着轮数增加，为了“面子”和“到此为止”，概率大幅衰减
            let replyProb = 0.5;
            if (round > 2) replyProb *= 0.4; // 第三轮后概率减半
            if (round > 4) replyProb *= 0.2; // 最后阶段极难触发

            if (Math.random() > replyProb) continue;

            await new Promise(r => setTimeout(r, 3000 + Math.random() * 8000));

            try {
                const replied = await this._generateCommentReply(reactor.id, freshPost, targetCmt, null);
                if (replied) hadNewComment = true;
            } catch (e) {
                console.warn('[Moments] comment loop fail:', e);
            }
        }

        if (hadNewComment) {
            await new Promise(r => setTimeout(r, 6000 + Math.random() * 8000));
            // 递归调用下一轮
            await this._multiRoundCommentLoop(postId, reactors, round + 1, maxRounds);
        } else {
            await this._updateRelationshipsFromComments(postId);
        }
    },

    /**
     * 基于帖子评论互动更新角色间关系和记忆
     * 分析评论中的冲突/亲密，更新关系视角
     */
    async _updateRelationshipsFromComments(postId) {
        const post = this.getPost(postId);
        if (!post || post.comments.length < 2) return;

        const RG = window.WeChat?.Services?.RelationshipGraph;
        if (!RG) return;
        const api = window.Core?.Api;
        if (!api) return;

        // 找出有互动的角色对（排除用户）
        const pairs = new Set();
        for (const cmt of post.comments) {
            if (cmt.replyToAuthorId && cmt.authorId !== 'USER_SELF' && cmt.replyToAuthorId !== 'USER_SELF') {
                const pair = [cmt.authorId, cmt.replyToAuthorId].sort().join('|');
                pairs.add(pair);
            }
        }

        for (const pairKey of pairs) {
            const [idA, idB] = pairKey.split('|');
            const charA = window.sysStore?.getCharacter(idA);
            const charB = window.sysStore?.getCharacter(idB);
            if (!charA || !charB) continue;

            // 收集两人之间的评论
            const exchanges = post.comments.filter(c =>
                (c.authorId === idA && c.replyToAuthorId === idB) ||
                (c.authorId === idB && c.replyToAuthorId === idA)
            ).map(c => {
                const name = c.authorId === idA ? charA.name : charB.name;
                return name + ': ' + c.content;
            });

            if (exchanges.length < 2) continue; // 至少有来有回才算互动

            const postAuthorName = this.getAuthorName(post.authorId);

            // 用AI分析这次互动对关系的影响
            try {
                const prompt = `# 朋友圈互动客观分析
分析以下两人在 "${postAuthorName}" 朋友圈评论区的对话演回：

对话内容:
${exchanges.join('\n')}

任务：以客观、中立的视角评估此次互动。
1. 总结互动原因（如果是吵架，需简短说明争端起因）。
2. 判断双方私人态度（Attitude）的微调。
3. 如果发生冲突，记录为“【线上朋友圈争执】”。

请输出 JSON:
{
  "summary": "客观总结互动原因(20字内)，例如：【线上朋友圈争执】因对方评价其生活方式过于高调而产生口角",
  "a_attitude_change": "A对B最新的客观评价",
  "b_attitude_change": "B对A最新的客观评价",
  "tension": "low/medium/high"
}
只输出 JSON。`;

                const resp = await api.chat([
                    { role: 'system', content: prompt }
                ], { temperature: 0.3 }); // 降低温度以提高客观性

                if (resp) {
                    const result = JSON.parse(resp.match(/\{[\s\S]*\}/)[0]);

                    // 更新关系 Private Attitude
                    if (result.a_attitude_change) RG.updateRelationship(idA, idB, { private_attitude: result.a_attitude_change });
                    if (result.b_attitude_change) RG.updateRelationship(idB, idA, { private_attitude: result.b_attitude_change });

                    // 将总结记入背景故事 (可选：如果关系网支持追加背景)
                    console.log(`[Moments] 互动归档: ${result.summary}`);
                }
            } catch (e) {
                console.warn('[Moments] 关系更新分析失败:', e);
            }
        }
    },

    /**
     * AI 生成角色对帖子的互动（点赞/评论）
     */
    async _generateReaction(reactorId, post) {
        const reactor = window.sysStore?.getCharacter(reactorId);
        const postAuthor = post.authorId === 'USER_SELF'
            ? { name: window.sysStore?.get('user_realname') || '用户' }
            : window.sysStore?.getCharacter(post.authorId);
        if (!reactor || !postAuthor) return;
        const api = window.Core?.Api;
        if (!api) return;

        const rel = window.WeChat?.Services?.RelationshipGraph?.getRelationship(reactorId, post.authorId);
        const relInfo = this._getRelationInfo(reactorId, post.authorId, rel);

        const existingComments = post.comments
            .filter(c => this._isFriend(reactorId, c.authorId))
            .map(c => {
                const n = this.getAuthorName(c.authorId);
                return n + ': ' + c.content;
            });

        const prompt = `# 朋友圈点赞/评论决策
你现在是 "${reactor.name}"。
你看到了 "${postAuthor.name}" 发布的内容: "${post.content}"。

背景:
- 你的性格: ${reactor.main_persona || '正常'}
- 你们的关系: ${relInfo.summary}
- 你对TA的视角: ${relInfo.reactorView || '普通朋友'}
${existingComments.length > 0 ? '\n已有的评论:\n' + existingComments.join('\n') : ''}

任务: 决定是否点赞或评论。
1. 必须完全符合人设。高冷的人很少评论，恋人通常会点赞。
2. 评论要简短(15字内)。

输出格式(JSON):
{ "like": true/false, "comment": "内容或空" }
只输出 JSON。`;

        try {
            const response = await api.chat([
                { role: 'system', content: prompt }
            ], { temperature: 0.8 });
            if (!response) return;

            let jsonStr = response;
            const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (mdMatch) jsonStr = mdMatch[1];
            jsonStr = jsonStr.trim();
            const js = jsonStr.indexOf('{');
            const je = jsonStr.lastIndexOf('}');
            if (js >= 0 && je > js) jsonStr = jsonStr.substring(js, je + 1);

            const data = JSON.parse(jsonStr);

            if (data.like) this.toggleLike(post.id, reactorId);
            if (data.comment && typeof data.comment === 'string' && data.comment.trim() !== '') {
                this.addComment(post.id, {
                    authorId: reactorId,
                    content: data.comment.trim(),
                });
            }
            if (window.WeChat?.App?.render) window.WeChat.App.render();
        } catch (e) {
            console.warn('[Moments] 互动生成失败:', e);
        }
    },

    /**
     * AI 生成角色对其他角色的评论回复（支持互动深度分析）
     */
    async _generateCommentReply(reactorId, post, targetComment, relInfo = null) {
        const reactor = window.sysStore?.getCharacter(reactorId);
        const targetAuthor = targetComment.authorId === 'USER_SELF'
            ? { name: window.sysStore?.get('user_realname') || '用户' }
            : window.sysStore?.getCharacter(targetComment.authorId);
        if (!reactor || !targetAuthor) return false;
        const api = window.Core?.Api;
        if (!api) return false;

        // 如果没有提供 relInfo，则实时计算
        if (!relInfo) {
            const rel = window.WeChat?.Services?.RelationshipGraph?.getRelationship(reactorId, targetComment.authorId);
            relInfo = this._getRelationInfo(reactorId, targetComment.authorId, rel);
        }

        const postAuthorName = this.getAuthorName(post.authorId);

        let toneHint = '回复礼貌正常。';
        if (relInfo.isEnemy) toneHint = '你的回复带有阴阳怪气或不满。';
        else if (relInfo.isClose) toneHint = '关系很好，可以开玩笑。';
        else if (relInfo.isLover) toneHint = '回复甜蜜亲昵。';

        // 构建完整的评论上下文（隔离非共同好友）
        const allComments = post.comments
            .filter(c => this._isFriend(reactorId, c.authorId))
            .map(c => {
                let n = c.authorId === 'USER_SELF' ? (window.sysStore?.get('user_realname') || '我') : (window.sysStore?.getCharacter(c.authorId)?.name || c.authorId);
                let rp = '';
                // 如果回复的人是自己的好友，才显示"回复xxx"的信息，否则在真实微信中也是丢失这部分上下文的
                if (c.replyToAuthorId && this._isFriend(reactorId, c.replyToAuthorId)) {
                    const rn = c.replyToAuthorId === 'USER_SELF' ? (window.sysStore?.get('user_realname') || '我') : (window.sysStore?.getCharacter(c.replyToAuthorId)?.name || c.replyToAuthorId);
                    rp = '回复 ' + rn + ': ';
                }
                return n + ': ' + rp + c.content;
            }).join('\n');

        // 检查用户是否有劝架行为
        const userMediated = post.comments.some(c => c.authorId === 'USER_SELF' && c.timestamp > (targetComment.timestamp || 0));
        let mediateHint = '';
        if (userMediated && relInfo.isEnemy) mediateHint = '\n注意: 帖子作者已经在劝架了，你可能会收敛一些。';

        const prompt = `# 朋友圈评论回复建议
你现在是 "${reactor.name}"。
你正在查看 "${postAuthorName}" 的朋友圈。

背景信息:
- 你的完整人设: ${reactor.main_persona || '无'}
- 你与对方 (${targetAuthor.name}) 的公众关系: ${relInfo.viewAToB || '普通朋友'}
- 你与对方的私人交情: ${relInfo.summary}
- 评论区上下文:
${allComments}

⚠️ 微信朋友圈社交潜规则 (必须遵守):
1. **体面第一**: 朋友圈是半公开熟人社交。如果你的性格是克制、温柔、高冷或社会地位高的，即便你极度厌恶对方，你也绝不会表现得像泼妇或键盘侠。你会选择冷处理、阴阳怪气地客套、或者根本不理。
2. **场景分寸**: 如果对方是你的同事或长辈，你的语气必须带有相应的职场分寸或晚辈礼节。
3. **真实感**: 朋友圈回复一般很短 (3-15字)。不是恋爱脑的情况下，多发和自己、和内容本身相关的评论，少围着别人转。
4. **拒绝刷屏**: 除非是你在热恋中或正在进行激辩，否则不要连续回复。

请生成你的回复：
{
  "reply": "回复内容",
  "action": "reply / ignore / like",
  "reason": "简述为何这样回复(基于身份分寸和面子)"
}
只输出 JSON。`;

        try {
            const response = await api.chat([
                { role: 'system', content: prompt },
                { role: 'user', content: '请回复。' }
            ], { temperature: 0.85 });
            if (!response) return false;

            let jsonStr = response;
            const mdMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (mdMatch) jsonStr = mdMatch[1];
            jsonStr = jsonStr.trim();
            const js = jsonStr.indexOf('{');
            const je = jsonStr.lastIndexOf('}');
            if (js >= 0 && je > js) jsonStr = jsonStr.substring(js, je + 1);

            const data = JSON.parse(jsonStr);

            if (data.reply && data.reply.trim()) {
                this.addComment(post.id, {
                    authorId: reactorId,
                    content: data.reply.trim(),
                    replyTo: targetComment.id,
                    replyToAuthorId: targetComment.authorId,
                });
                if (window.WeChat?.App?.render) window.WeChat.App.render();
                return true;
            }
            return false;
        } catch (e) {
            console.warn('[Moments] 角色 ' + reactorId + ' 回复评论失败:', e);
            return false;
        }
    },

    // ==========================================
    // 用户发帖后触发角色互动
    // ==========================================

    /**
     * 用户发帖后，触发角色互动
     */
    async triggerReactionsForUserPost(post) {
        return this._triggerReactions(post);
    },

    // ==========================================
    // 辅助方法
    // ==========================================

    /**
     * 判断帖子对某人是否可见
     */
    _isVisibleTo(post, viewerId) {
        // 非好友不可见朋友圈
        if (!this._isFriend(viewerId, post.authorId)) return false;

        const v = post.visibility || 'all';
        if (v === 'all' || v === '公开') return true;
        if (v === 'private' || v === '私密') return post.authorId === viewerId;
        if (v === 'partial' || v === '部分可见') {
            return (post.visibleTo || []).includes(viewerId) || post.authorId === viewerId;
        }
        return true;
    },

    /**
     * 判断 viewerId 是否能在朋友圈看到 targetId 的互动（是否是好友）
     * 用户默认是所有人的好友。
     */
    _isFriend(viewerId, targetId) {
        if (viewerId === targetId) return true;
        if (viewerId === 'USER_SELF' || targetId === 'USER_SELF') return true;
        const rel = window.WeChat?.Services?.RelationshipGraph?.getRelationship(viewerId, targetId);
        return !!rel;
    },

    /**
     * 获取作者显示名
     */
    getAuthorName(authorId) {
        if (authorId === 'USER_SELF') {
            return window.sysStore?.get('user_nickname')
                || window.sysStore?.get('user_realname')
                || '我';
        }
        const char = window.sysStore?.getCharacter(authorId);
        return char?.nickname || char?.remark || char?.name || authorId;
    },

    /**
     * 获取作者头像
     */
    getAuthorAvatar(authorId) {
        if (authorId === 'USER_SELF') {
            return window.sysStore?.get('user_avatar') || 'assets/images/avatar_placeholder.png';
        }
        const char = window.sysStore?.getCharacter(authorId);
        return char?.avatar || 'assets/images/avatar_placeholder.png';
    },

    /**
     * 获取作者签名
     */
    getAuthorBio(authorId) {
        if (authorId === 'USER_SELF') {
            return window.sysStore?.get('user_bio') || '';
        }
        const char = window.sysStore?.getCharacter(authorId);
        return char?.bio || '';
    },

    /**
     * 格式化时间显示（仿微信朋友圈时间格式）
     */
    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days === 1) return '昨天';
        if (days < 7) return `${days}天前`;

        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const currentYear = new Date().getFullYear();

        if (year === currentYear) {
            return `${month}月${day}日`;
        }
        return `${year}年${month}月${day}日`;
    },

    /**
     * 压缩旧帖子（只保留最近N条）
     */
    compressOldPosts(maxCount = 200) {
        let posts = window.sysStore.get(this.STORAGE_KEY, []);
        if (posts.length > maxCount) {
            posts.sort((a, b) => b.timestamp - a.timestamp);
            posts = posts.slice(0, maxCount);
            window.sysStore.set(this.STORAGE_KEY, posts);
            console.log(`[Moments] 压缩旧帖子，保留 ${maxCount} 条`);
        }
    },
};

// 自动初始化
if (window.sysStore && window.sysStore.ready) {
    window.sysStore.ready().then(() => {
        window.WeChat.Services.Moments.init();
    });
} else {
    setTimeout(() => {
        window.WeChat.Services.Moments.init();
    }, 500);
}
