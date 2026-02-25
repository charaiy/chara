/**
 * js/apps/wechat/ui/views_moments.js
 * 朋友圈视图渲染 - Chara OS
 * 
 * 高度还原真实微信朋友圈UI：
 * - Timeline 主页：封面区 + 头像昵称 + 签名 + 帖子流
 * - 个人朋友圈：同上布局（查看指定角色的帖子）
 * - 发布页："发表文字"，所在位置/提醒谁看/谁可以看
 * - 角色朋友圈设置页
 * 
 * 帖子功能：
 * - 长文折叠展开（"全文"/"收起"）
 * - 图片网格（1/4/9/多种布局）
 * - 点赞列表（蓝色名字，逗号分隔）
 * - 评论列表（支持回复）
 * - 操作菜单（赞/评论/删除弹出）
 * - 位置信息
 */

window.WeChat = window.WeChat || {};
window.WeChat.Views = Object.assign(window.WeChat.Views || {}, {

    // ==========================================
    // 朋友圈主时间线
    // ==========================================
    renderMoments() {
        const M = window.WeChat.Services.Moments;
        if (!M) return '<div style="padding:40px;text-align:center;color:#999;">朋友圈服务未加载</div>';

        const posts = M.getPosts({ limit: 50, viewerId: 'USER_SELF' });

        // 用户信息
        const userAvatar = window.sysStore?.get('user_avatar') || 'assets/images/avatar_placeholder.png';
        const userNickname = window.sysStore?.get('user_nickname') || window.sysStore?.get('user_realname') || '我';
        const userBio = window.sysStore?.get('user_bio') || '';
        const userCover = M.getCoverImage('USER_SELF') || '';

        const postsHtml = posts.length > 0
            ? posts.map(post => this._renderMomentPost(post)).join('')
            : `<div class="moments-empty">
                <div style="font-size:48px;margin-bottom:16px;opacity:0.3;">\u{1f4f7}</div>
                <div style="font-size:15px;">还没有朋友圈动态</div>
                <div style="font-size:13px;margin-top:6px;opacity:0.6;">点击右上角相机发布，或让角色自动发朋友圈</div>
               </div>`;

        return `
            <div class="wx-scroller moments-timeline" id="wx-view-moments">
                <!-- 封面区域 -->
                <div class="moments-cover-section">
                    <div class="moments-cover-bg" 
                         style="${userCover ? `background-image:url(${userCover})` : ''}">
                        <div class="moments-cover-clickable-center" onclick="window.WeChat.App.changeMomentsCover('USER_SELF')">
                            ${!userCover ? '点击更换封面' : ''}
                        </div>
                    </div>
                    <div class="moments-cover-user">
                        <span class="moments-cover-name">${this.escapeHtml(userNickname)}</span>
                        <img class="moments-cover-avatar" src="${userAvatar}" 
                             onclick="window.WeChat.App.openMomentsProfile('USER_SELF')"
                             onerror="this.src='assets/images/avatar_placeholder.png'" />
                    </div>
                </div>
                <!-- 个性签名 -->
                <div class="moments-cover-bio-area">
                    ${userBio ? `<span class="moments-cover-bio-text">${this.escapeHtml(userBio)}</span>` : ''}
                </div>

                <!-- 帖子列表 -->
                <div class="moments-posts-list">
                    ${postsHtml}
                </div>

                <div class="moments-footer-text">
                    — 以上是全部动态 —
                </div>
            </div>
        `;
    },

    // ==========================================
    // 单条朋友圈帖子渲染
    // ==========================================
    _renderMomentPost(post) {
        const M = window.WeChat.Services.Moments;
        const authorName = M.getAuthorName(post.authorId);
        const authorAvatar = M.getAuthorAvatar(post.authorId);
        const timeStr = M.formatTime(post.timestamp);
        const isMe = post.authorId === 'USER_SELF';

        // 文字内容（长文折叠展开）
        let contentHtml = '';
        if (post.content) {
            const isLong = post.content.length > 140;
            if (isLong) {
                const shortText = post.content.substring(0, 140);
                contentHtml = `
                    <div class="moments-post-content" id="mpc-${post.id}">
                        <span class="moments-text-short">${this._formatMomentContent(shortText)}...</span>
                        <span class="moments-text-full" style="display:none">${this._formatMomentContent(post.content)}</span>
                    </div>
                    <div class="moments-expand-btn" onclick="
                        var el=document.getElementById('mpc-${post.id}');
                        var s=el.querySelector('.moments-text-short');
                        var f=el.querySelector('.moments-text-full');
                        if(s.style.display!=='none'){s.style.display='none';f.style.display='inline';this.textContent='\u6536\u8d77';}
                        else{s.style.display='inline';f.style.display='none';this.textContent='\u5168\u6587';}
                    ">\u5168\u6587</div>`;
            } else {
                contentHtml = `<div class="moments-post-content">${this._formatMomentContent(post.content)}</div>`;
            }
        }

        // 图片网格
        let imagesHtml = '';
        if (post.images && post.images.length > 0) {
            const imgCount = post.images.length;
            const gridClass = imgCount === 1 ? 'single' : (imgCount <= 4 ? 'grid-2' : 'grid-3');
            imagesHtml = `
                <div class="moments-images ${gridClass}">
                    ${post.images.map((img, i) => {
                const isUrl = img.startsWith('data:') || img.startsWith('http') || img.startsWith('blob:') || img.startsWith('/');
                if (isUrl) {
                    return `<div class="moments-img-item" onclick="window.WeChat.App.previewMomentImage('${post.id}', ${i})">
                                <img src="${img}" alt="" />
                            </div>`;
                } else {
                    return `<div class="moments-img-item moments-img-placeholder" title="${this.escapeHtml(img)}">
                                <div class="moments-img-desc">${this.escapeHtml(img.substring(0, 30))}</div>
                            </div>`;
                }
            }).join('')}
                </div>
            `;
        }

        // 互动区
        const likesHtml = this._renderMomentLikes(post);
        const commentsHtml = this._renderMomentComments(post);
        const hasInteractions = post.likes.length > 0 || post.comments.length > 0;
        const interactionsHtml = hasInteractions ? `
            <div class="moments-interactions">
                ${likesHtml}
                ${post.likes.length > 0 && post.comments.length > 0 ? '<div class="moments-interaction-divider"></div>' : ''}
                ${commentsHtml}
            </div>
        ` : '';

        // 位置（和时间在同一行）
        const locationStr = post.location
            ? `<span class="moments-location-inline">\u00a0\u00a0${this.escapeHtml(post.location)}</span>`
            : '';

        return `
            <div class="moments-post" id="moment-${post.id}">
                <img class="moments-post-avatar" src="${authorAvatar}" 
                     onclick="window.WeChat.App.openMomentsProfile('${this.escapeQuote(post.authorId)}')"
                     onerror="this.src='assets/images/avatar_placeholder.png'" />
                <div class="moments-post-body">
                    <div class="moments-post-author" 
                         onclick="window.WeChat.App.openMomentsProfile('${this.escapeQuote(post.authorId)}')"
                    >${this.escapeHtml(authorName)}</div>
                    
                    ${contentHtml}
                    
                    ${imagesHtml}

                    <div class="moments-post-footer">
                        <div class="moments-post-meta">
                            <span class="moments-post-time">${timeStr}</span>
                            ${locationStr}
                        </div>
                        <div class="moments-action-btn" onclick="event.stopPropagation();window.WeChat.App.toggleMomentsActionMenu('${post.id}')">
                            <svg width="22" height="18" viewBox="0 0 22 18"><rect x="0" y="3" width="22" height="12" rx="3" fill="var(--wx-text-sec)" opacity="0.12"/><circle cx="7.5" cy="9" r="1.3" fill="var(--wx-text-sec)" opacity="0.4"/><circle cx="14.5" cy="9" r="1.3" fill="var(--wx-text-sec)" opacity="0.4"/></svg>
                        </div>
                    </div>

                    <!-- 操作菜单 -->
                    <div class="moments-action-menu" id="moments-menu-${post.id}" style="display:none;">
                        <div class="moments-action-item" onclick="window.WeChat.App.toggleMomentLike('${post.id}')">
                            ${post.likes.includes('USER_SELF') ? '\u2764\uFE0F 取消' : '\uD83E\uDD0D 赞'}
                        </div>
                        <div class="moments-action-divider-v"></div>
                        <div class="moments-action-item" onclick="window.WeChat.App.startMomentComment('${post.id}')">
                            \uD83D\uDCAC 评论
                        </div>
                        ${isMe ? `<div class="moments-action-divider-v"></div>
                        <div class="moments-action-item" onclick="window.WeChat.App.deleteMoment('${post.id}')">
                            \uD83D\uDDD1\uFE0F 删除
                        </div>` : ''}
                    </div>

                    ${interactionsHtml}
                </div>
            </div>
        `;
    },

    /**
     * 渲染点赞列表
     */
    _renderMomentLikes(post) {
        if (post.likes.length === 0) return '';
        const M = window.WeChat.Services.Moments;
        const names = post.likes.map(id => {
            const name = M.getAuthorName(id);
            return `<span class="moments-like-name" onclick="window.WeChat.App.openMomentsProfile('${this.escapeQuote(id)}')">${this.escapeHtml(name)}</span>`;
        }).join('\uFF0C');

        return `<div class="moments-likes-row">
            <span class="moments-likes-icon">♡</span>
            <span class="moments-likes-names">${names}</span>
        </div>`;
    },

    /**
     * 渲染评论列表
     */
    _renderMomentComments(post) {
        if (post.comments.length === 0) return '';
        const M = window.WeChat.Services.Moments;

        const items = post.comments.map(cmt => {
            const authorName = M.getAuthorName(cmt.authorId);
            let replyPart = '';
            if (cmt.replyToAuthorId) {
                const replyToName = M.getAuthorName(cmt.replyToAuthorId);
                replyPart = `<span class="moments-cmt-reply">\u56DE\u590D</span><span class="moments-cmt-name" onclick="event.stopPropagation();window.WeChat.App.openMomentsProfile('${this.escapeQuote(cmt.replyToAuthorId)}')">${this.escapeHtml(replyToName)}</span>`;
            }

            return `<div class="moments-comment-item" onclick="window.WeChat.App.startMomentReply('${post.id}', '${cmt.id}', '${this.escapeQuote(cmt.authorId)}')">
                <span class="moments-cmt-name" onclick="event.stopPropagation();window.WeChat.App.openMomentsProfile('${this.escapeQuote(cmt.authorId)}')">${this.escapeHtml(authorName)}</span>${replyPart}\uFF1A<span class="moments-cmt-content">${this.escapeHtml(cmt.content)}</span>
            </div>`;
        }).join('');

        return `<div class="moments-comments-list">${items}</div>`;
    },

    /**
     * 格式化朋友圈文本内容
     */
    _formatMomentContent(content) {
        if (!content) return '';
        let safe = this.escapeHtml(content);
        safe = safe.replace(/\n/g, '<br>');
        safe = safe.replace(/#([^#]+)#/g, '<span class="moments-hashtag">#$1#</span>');
        return safe;
    },

    // ==========================================
    // 个人朋友圈页面（有封面）
    // ==========================================
    renderMomentsProfile(targetId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return '<div style="padding:40px;text-align:center;color:#999;">朋友圈服务未加载</div>';

        const isMe = targetId === 'USER_SELF';
        const authorName = M.getAuthorName(targetId);
        const authorAvatar = M.getAuthorAvatar(targetId);
        const authorBio = M.getAuthorBio(targetId);
        const coverImage = M.getCoverImage(targetId) || '';

        // 获取该角色/用户的朋友圈
        const posts = M.getPosts({ authorId: targetId, viewerId: 'USER_SELF', limit: 50 });

        // 角色设置按钮


        const postsHtml = posts.length > 0
            ? posts.map(post => this._renderMomentPost(post)).join('')
            : `<div class="moments-empty">
                <div style="font-size:40px;margin-bottom:12px;opacity:0.3;">\u{1f4f7}</div>
                <div>${isMe ? '\u4f60\u8fd8\u6ca1\u6709\u53d1\u8fc7\u670b\u53cb\u5708' : `${this.escapeHtml(authorName)} \u8fd8\u6ca1\u6709\u53d1\u8fc7\u670b\u53cb\u5708`}</div>
               </div>`;

        return `
            <div class="wx-scroller moments-timeline moments-profile-page" id="wx-view-moments-profile">
                <!-- 封面区域 -->
                <div class="moments-cover-section">
                    <div class="moments-cover-bg" 
                         style="${coverImage ? `background-image:url(${coverImage})` : ''}"
                         onclick="window.WeChat.App.changeMomentsCover('${this.escapeQuote(targetId)}')">
                        ${!coverImage ? '<div class="moments-cover-placeholder">\u70b9\u51fb\u66f4\u6362\u5c01\u9762</div>' : ''}
                    </div>
                    <div class="moments-cover-user">
                        <span class="moments-cover-name">${this.escapeHtml(authorName)}</span>
                        <img class="moments-cover-avatar" src="${authorAvatar}" 
                             onerror="this.src='assets/images/avatar_placeholder.png'" />
                    </div>
                    
                </div>
                <!-- 个性签名 -->
                <div class="moments-cover-bio-area">
                    ${authorBio ? `<span class="moments-cover-bio-text">${this.escapeHtml(authorBio)}</span>` : ''}
                </div>

                <!-- 帖子列表 -->
                <div class="moments-posts-list">
                    ${postsHtml}
                </div>

                <div class="moments-footer-text">
                    — 以上是全部动态 —
                </div>
            </div>
        `;
    },

    // ==========================================
    // 朋友圈设置页面（角色频率/风格）
    // ==========================================
    renderMomentsSettings(charId) {
        const M = window.WeChat.Services.Moments;
        if (!M) return '';

        const char = window.sysStore?.getCharacter(charId);
        const charName = char?.name || charId;
        const settings = M.getCharSettings(charId);

        // Map legacy values to hours
        let displayHours = '';
        if (settings.frequency && settings.frequency !== 'never') {
            if (settings.frequency === 'high') displayHours = '2';
            else if (settings.frequency === 'medium') displayHours = '6';
            else if (settings.frequency === 'low') displayHours = '24';
            else displayHours = settings.frequency;
        }

        const isDark = window.sysStore && window.sysStore.get('dark_mode') !== 'false';

        // 浅咖/白色系主题设定
        const pageBg = isDark ? '#111111' : '#FDFDFB'; // 米白色背景
        const cellBg = isDark ? '#1C1C1E' : '#FFFFFF';
        const primaryColor = isDark ? '#D4B895' : '#8B7355'; // 咖啡色主色调
        const primaryLight = isDark ? 'rgba(212,184,149,0.15)' : 'rgba(139,115,85,0.08)';
        const borderColor = isDark ? '#333333' : '#EAE3D9';
        const textColor = isDark ? '#EEEEEE' : '#333333';
        const textSecColor = isDark ? '#888888' : '#8D8273';
        const shadow = isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 24px rgba(139,115,85,0.06)';

        // 关系网可视化：好友列表 + 该角色的个人视角
        let relationshipHtml = `<div style="font-size:13px;color:${textSecColor};text-align:center;padding:24px 0;">该角色暂无好友</div>`;
        if (window.WeChat.Services.RelationshipGraph) {
            const RG = window.WeChat.Services.RelationshipGraph;
            const rels = RG.getVisibleRelationships(charId);

            // 过滤：只看与该角色直接相关的连线
            const myRels = rels.filter(r => r.nodeA === charId || r.nodeB === charId);

            if (myRels.length > 0) {
                // 获取该角色的性别代词
                const charGender = char?.gender || '';
                const charPronoun = /女|female/i.test(charGender) ? '她' : '他';

                // 获取 rumor 数据
                const rumors = window.sysStore?.get('rg_rumors_v1') || {};

                const htmlList = myRels.map(r => {
                    const otherId = r.nodeA === charId ? r.nodeB : r.nodeA;
                    const otherNode = RG.getNode(otherId);
                    if (!otherNode) return '';

                    // 客观关系标签：对方在该角色眼中的身份（如：主人、同事、前任）
                    const objRelation = r.nodeA === charId
                        ? (r.aViewOfB || r.a_to_b_public_relation || '')
                        : (r.bViewOfA || r.b_to_a_public_relation || '');

                    // 主观视角：从 rumor 系统读取认知修正数据
                    const sortedIds = [charId, otherId].sort();
                    const pairId = sortedIds.join('_');
                    const rumorKey = `${charId}|${pairId}`;
                    const rumor = rumors[rumorKey];

                    let myViewOfOther = ''; // 该角色对对方的认知
                    let myBeliefOfOtherView = ''; // 该角色认为对方怎么看自己

                    if (rumor) {
                        const isReversed = sortedIds[0] !== charId;
                        // charId → otherId 的认知
                        myViewOfOther = isReversed
                            ? (rumor.contentBtoA || '')
                            : (rumor.contentAtoB || '');
                        // otherId → charId 的认知（在角色的主观视角下）
                        myBeliefOfOtherView = isReversed
                            ? (rumor.contentAtoB || '')
                            : (rumor.contentBtoA || '');
                    }

                    // 如果 rumor 没有数据，回退到关系态度字段
                    if (!myViewOfOther) {
                        myViewOfOther = r.nodeA === charId
                            ? (r.aTowardB || r.a_to_b_public_attitude || r.a_to_b_private_attitude || '')
                            : (r.bTowardA || r.b_to_a_public_attitude || r.b_to_a_private_attitude || '');
                    }

                    // 构建主观视角描述文本
                    let subjectiveText = '';
                    const otherName = this.escapeHtml(otherNode.name);
                    if (myViewOfOther && myBeliefOfOtherView) {
                        subjectiveText = `${charPronoun}${this.escapeHtml(myViewOfOther)}${otherName}，${charPronoun}认为${otherName}把${charPronoun}当${this.escapeHtml(myBeliefOfOtherView)}`;
                    } else if (myViewOfOther) {
                        subjectiveText = `${charPronoun}对${otherName}：${this.escapeHtml(myViewOfOther)}`;
                    } else if (myBeliefOfOtherView) {
                        subjectiveText = `${charPronoun}认为${otherName}把${charPronoun}当${this.escapeHtml(myBeliefOfOtherView)}`;
                    }

                    const tagObj = objRelation ? `<span style="background:${primaryLight};color:${primaryColor};padding:3px 8px;border-radius:6px;font-size:11px;flex-shrink:0;">${this.escapeHtml(objRelation)}</span>` : '';
                    const tagSubjective = subjectiveText ? `<span style="background:${isDark ? 'rgba(255,180,100,0.12)' : 'rgba(220,120,60,0.08)'};color:${isDark ? '#E8A870' : '#B85C30'};padding:3px 8px;border-radius:6px;font-size:11px;flex-shrink:0;line-height:1.4;">${subjectiveText}</span>` : '';

                    return `
                        <div style="display:flex;align-items:center;padding:12px 24px;border-bottom:1px solid ${borderColor};">
                            <img src="${otherNode.avatar || 'assets/images/avatar_placeholder.png'}" style="width:40px;height:40px;border-radius:50%;margin-right:12px;object-fit:cover;border:1px solid ${borderColor};">
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:14px;font-weight:600;color:${textColor};margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(otherNode.name)}</div>
                                <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                                    ${tagObj}${tagSubjective}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                if (htmlList.trim()) {
                    relationshipHtml = htmlList;
                }
            }
        }

        return `
            <style>
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .moment-setting-input:focus { border-color: ${primaryColor} !important; }
            </style>
            <div class="wx-scroller" id="wx-view-moments-settings" style="background-color: ${pageBg};">
                <div class="wx-nav-spacer"></div>
                
                <div style="padding: 20px;">
                    <!-- 头部信息 -->
                    <div style="text-align:center;margin-bottom:28px;">
                        <img src="${char?.avatar || 'assets/images/avatar_placeholder.png'}" 
                             style="width:76px;height:76px;border-radius:20px;object-fit:cover;box-shadow:${shadow};border:3px solid ${cellBg};" />
                        <div style="font-size:18px;font-weight:600;color:${textColor};margin-top:14px;">${this.escapeHtml(charName)}</div>
                        <div style="font-size:13px;color:${textSecColor};margin-top:4px;letter-spacing:0.5px;">社交动态管理</div>
                    </div>

                    <!-- 发布频率 -->
                    <div style="background:${cellBg};border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:${shadow};border:1px solid ${borderColor};">
                        <div style="display:flex;align-items:center;margin-bottom:16px;">
                            <div style="width:4px;height:16px;background:${primaryColor};border-radius:2px;margin-right:8px;"></div>
                            <div style="font-size:16px;font-weight:600;color:${textColor};">发布频率</div>
                        </div>
                        
                        <div style="display:flex;align-items:center;background:${pageBg};border-radius:12px;padding:12px 16px;border:1px solid ${borderColor};transition:border-color 0.3s;" class="moment-setting-input" onclick="document.getElementById('wx-moments-freq-input').focus()">
                            <input type="number" id="wx-moments-freq-input" value="${displayHours}" 
                                placeholder="0"
                                style="font-size:17px;font-weight:600;color:${primaryColor};width:60px;background:transparent;border:none;outline:none;text-align:center;">
                            <div style="font-size:15px;color:${textColor};margin-left:8px;">小时发送一条动态</div>
                        </div>
                        
                        <div style="font-size:12px;color:${textSecColor};margin-top:14px;display:flex;align-items:center;">
                            <svg style="width:14px;height:14px;margin-right:6px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            留空或设为0则代表关闭自动发布
                        </div>
                    </div>

                    <!-- 发布灵感/风格 -->
                    <div style="background:${cellBg};border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:${shadow};border:1px solid ${borderColor};">
                        <div style="display:flex;align-items:center;margin-bottom:16px;">
                            <div style="width:4px;height:16px;background:${primaryColor};border-radius:2px;margin-right:8px;"></div>
                            <div style="font-size:16px;font-weight:600;color:${textColor};">内容偏好与风格</div>
                        </div>
                        <textarea id="wx-moments-style" class="moment-setting-input"
                            style="width:100%;height:100px;border:1px solid ${borderColor};background:${pageBg};border-radius:12px;padding:16px;font-size:14px;color:${textColor};outline:none;resize:none;overflow:hidden;line-height:1.6;box-sizing:border-box;transition:border-color 0.3s;"
                            placeholder="描述她的社交展现偏好，例如：&#10;照片滤镜、语言习惯、经常出没的场景等..."
                        >${settings.style || ''}</textarea>
                        <div style="font-size:12px;color:${textSecColor};margin-top:12px;">
                            留空将交由角色自身心智系统推演决定
                        </div>
                    </div>

                    <!-- 好友列表与视角可视化 -->
                    <div style="background:${cellBg};border-radius:16px;overflow:hidden;margin-bottom:28px;box-shadow:${shadow};border:1px solid ${borderColor};">
                        <div style="padding:24px 24px 16px;">
                            <div style="display:flex;align-items:center;">
                                <div style="width:4px;height:16px;background:${primaryColor};border-radius:2px;margin-right:8px;"></div>
                                <div style="font-size:16px;font-weight:600;color:${textColor};">好友列表</div>
                            </div>
                            <div style="font-size:12px;color:${textSecColor};margin-top:8px;">${this.escapeHtml(charName)} 的好友视角（客观关系 + 主观视角）</div>
                        </div>
                        <div style="max-height:320px;overflow-y:auto;padding-bottom:12px;" class="hide-scrollbar">
                            ${relationshipHtml}
                        </div>
                    </div>

                    <!-- 操作区域 -->
                    <div style="display:flex;gap:12px;">
                        <div onclick="window.WeChat.App.generateMomentForChar('${this.escapeQuote(charId)}')"
                             style="flex:1;background:${pageBg};color:${primaryColor};border:1px solid ${primaryColor};text-align:center;padding:16px;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                            立即分享
                        </div>
                        
                        <div onclick="window.WeChat.App.saveMomentsSettings('${this.escapeQuote(charId)}')"
                             style="flex:1.5;background:${primaryColor};color:#FFFFFF;text-align:center;padding:16px;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 6px 16px rgba(139,115,85,0.3);">
                            保存偏好
                        </div>
                    </div>
                    <div style="height:40px;"></div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // 发布朋友圈页面
    // ==========================================
    renderMomentsCompose() {
        return `
            <div class="wx-scroller moments-compose-page" id="wx-view-moments-compose">
                <div class="wx-nav-spacer"></div>
                <div class="moments-compose-body">
                    <!-- 文字输入区 -->
                    <textarea id="wx-moments-compose-text" class="moments-compose-textarea"
                        placeholder="\u8fd9\u4e00\u523b\u7684\u60f3\u6cd5..."></textarea>

                    <!-- 图片预览/上传区 -->
                    <div id="wx-moments-compose-images" class="moments-compose-images">
                        <div class="moments-compose-add-img" onclick="window.WeChat.App.addMomentImage()">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5" stroke-linecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- 底部设置区域 -->
                <div class="moments-compose-settings">
                    <!-- 所在位置 -->
                    <div class="moments-compose-cell">
                        <div class="moments-compose-cell-left">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wx-text-sec)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
                            </svg>
                            <span>\u6240\u5728\u4f4d\u7f6e</span>
                        </div>
                        <div class="moments-compose-cell-right">
                            <input id="wx-moments-compose-location" class="moments-compose-location-input"
                                   placeholder="" />
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>

                    <!-- 提醒谁看 -->
                    <div class="moments-compose-cell">
                        <div class="moments-compose-cell-left">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wx-text-sec)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                            </svg>
                            <span>\u63d0\u9192\u8c01\u770b</span>
                        </div>
                        <div class="moments-compose-cell-right">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>

                    <!-- 谁可以看（点击切换） -->
                    <div class="moments-compose-cell" onclick="window.WeChat.App.cycleVisibility()">
                        <div class="moments-compose-cell-left">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wx-text-sec)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            <span>\u8c01\u53ef\u4ee5\u770b</span>
                        </div>
                        <div class="moments-compose-cell-right">
                            <input type="hidden" id="wx-moments-compose-visibility" value="\u516c\u5f00" />
                            <span id="wx-moments-visibility-label" style="color:var(--wx-text);font-size:14px;">\u516c\u5f00</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 19l6.5-7L9 5" stroke="#B2B2B2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
});
