/**
 * js/apps/wechat/services/relationship_graph.js
 * 关系网数据管理服务 - Chara OS
 * 
 * 职责：
 * - 管理角色与角色、角色与用户之间的关系数据
 * - 支持双方视角的关系描述
 * - 支持选择性可见（对哪些角色可见）
 * 
 * 数据结构 v2：
 * relationships: {
 *   "nodeA_nodeB": {
 *     id: "nodeA_nodeB",
 *     nodeA: "id1",           // 节点A的ID
 *     nodeB: "id2",           // 节点B的ID
 *     // A的视角
 *     aViewOfB: "朋友",       // A认为B是什么
 *     aTowardB: "信任",       // A对B的态度/行为
 *     // B的视角
 *     bViewOfA: "好友",       // B认为A是什么
 *     bTowardA: "友好",       // B对A的态度/行为
 *     // 可见性设置
 *     visibleTo: ["all"] | ["id1", "id2", ...],  // 对谁可见
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 * }
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.RelationshipGraph = {
    STORAGE_KEY: 'chara_relationship_graph_v2',

    /**
     * 初始化服务
     */
    init() {
        console.log('[RelationshipGraph] 服务初始化');
        // 确保数据结构存在
        if (!window.sysStore.get(this.STORAGE_KEY)) {
            window.sysStore.set(this.STORAGE_KEY, {});
        }
    },

    /**
     * 生成关系ID（确保唯一性，按字母排序）
     */
    _generateRelationId(idA, idB) {
        const sorted = [idA, idB].sort();
        return `${sorted[0]}_${sorted[1]}`;
    },

    /**
     * 获取所有关系
     */
    getAllRelationships() {
        return window.sysStore.get(this.STORAGE_KEY) || {};
    },

    /**
     * 获取两个节点之间的关系
     * [v60] 增加回退机制：如果图谱中未定义，尝试从角色档案(settings)中读取
     */
    getRelationship(idA, idB) {
        const id = this._generateRelationId(idA, idB);
        const relationships = this.getAllRelationships();
        const dbRel = relationships[id];

        // [Soft Delete Check] If marked as deleted in DB, hide it (block fallback)
        if (dbRel && dbRel.isDeleted) {
            return null;
        }

        // 尝试从角色 Settings 同步 (只针对 NPC-User 关系)
        const fallbackRel = this._syncFromSettings(idA, idB);

        if (!dbRel && !fallbackRel) return null;
        if (!dbRel) return fallbackRel;
        if (!fallbackRel) return dbRel;

        // [Fix] 深度合并：DB为空时回退到Settings
        // Spread Syntax handles empty strings ("") correctly overriding defaults
        const merged = { ...fallbackRel, ...dbRel };

        return merged;
    },

    /**
     * 从角色档案中提取临时关系数据
     */
    _syncFromSettings(idA, idB) {
        // [Fix] 更精准的 NPC vs User 判定逻辑
        const charA = window.sysStore.getCharacter(idA);
        const charB = window.sysStore.getCharacter(idB);

        let npc = null;
        let isReversed = false; // default: A is NPC, B is "Other/User"

        // 优先认定：只要能获取到 Character 对象，且 Settings 有效，它就是数据源
        if (charA && charA.settings && charA.settings.relationship) {
            npc = charA;
            isReversed = false;
        }
        else if (charB && charB.settings && charB.settings.relationship) {
            npc = charB;
            isReversed = true;
        }

        if (!npc) return null;

        const rs = npc.settings.relationship;

        // 1. 提取 NPC -> User 的数据
        const npcToUser = {
            obj: rs.char_to_user_public_relation || rs.public_relation || '', // 兼容旧字段
            pub: rs.char_to_user_public_attitude || rs.char_to_user_view || '',
            pvt: rs.char_to_user_private_attitude || '',
            known: rs.user_knows_char_private || false
        };

        // 2. 提取 User -> NPC 的数据
        const userToNpc = {
            obj: rs.user_to_char_public_relation || rs.public_relation || '',
            pub: rs.user_to_char_public_attitude || rs.user_to_char_view || '',
            pvt: rs.user_to_char_private_attitude || '',
            known: rs.char_knows_user_private || false
        };

        // 3. 映射到 A -> B (取决于谁是 NPC)
        // isReversed = true 意味着 A=User, B=NPC

        const a2b = isReversed ? userToNpc : npcToUser;
        const b2a = isReversed ? npcToUser : userToNpc;

        // 构造临时对象
        const tempRel = {
            nodeA: idA,
            nodeB: idB,

            // 新标准字段
            a_to_b_public_relation: a2b.obj,
            a_to_b_public_attitude: a2b.pub,
            a_to_b_private_attitude: a2b.pvt,
            b_knows_a_private: a2b.known,

            b_to_a_public_relation: b2a.obj,
            b_to_a_public_attitude: b2a.pub,
            b_to_a_private_attitude: b2a.pvt,
            a_knows_b_private: b2a.known,

            backstory: rs.backstory || '',
            visibleTo: ['all'],
            isTemp: true,

            // Legacy 兼容字段 (用于绘图 labeling)
            // graph drawing usually uses `aViewOfB` as the label on the line
            aViewOfB: a2b.obj,     // 显示客观关系 (e.g. 朋友)
            aTowardB: a2b.pub,     // 显示态度 (e.g. 友善)
            bViewOfA: b2a.obj,
            bTowardA: b2a.pub
        };

        // 如果全是空的，也返回 null，避免显示空线
        if (!tempRel.aViewOfB && !tempRel.aTowardB && !tempRel.bViewOfA && !tempRel.bTowardA && !tempRel.backstory) {
            return null;
        }

        return tempRel;
    },

    /**
     * 获取某个节点的所有关系
     */
    getNodeRelationships(nodeId) {
        const relationships = this.getAllRelationships();
        return Object.values(relationships).filter(
            rel => rel.nodeA === nodeId || rel.nodeB === nodeId
        );
    },

    /**
     * 获取对某个角色可见的关系
     * @param {string} viewerId - 查看者ID
     */
    getVisibleRelationships(viewerId) {
        const relationships = this.getAllRelationships();
        return Object.values(relationships).filter(rel => {
            if (!rel.visibleTo || rel.visibleTo.length === 0) return false;
            if (rel.visibleTo.includes('all')) return true;
            return rel.visibleTo.includes(viewerId);
        });
    },

    /**
     * 创建或更新关系
     */
    /**
     * 创建或更新关系
     */
    saveRelationship(data) {
        const { nodeA, nodeB, aViewOfB, aTowardB, bViewOfA, bTowardA, visibleTo = [], backstory = '' } = data; // New: backstory

        if (!nodeA || !nodeB) {
            console.error('[RelationshipGraph] 缺少必要参数');
            return null;
        }

        const id = this._generateRelationId(nodeA, nodeB);
        const relationships = this.getAllRelationships();
        const existing = relationships[id];
        const now = Date.now();

        // 确保 nodeA 和 nodeB 的顺序一致
        const sorted = [nodeA, nodeB].sort();
        const isReversed = sorted[0] !== nodeA;

        const relationship = {
            id,
            nodeA: sorted[0],
            nodeB: sorted[1],
            // 如果顺序反了，交换视角数据
            aViewOfB: (isReversed ? (bViewOfA || data.b_to_a_public_relation) : (aViewOfB || data.a_to_b_public_relation)) || '',
            aTowardB: (isReversed ? (bTowardA || data.b_to_a_public_attitude) : (aTowardB || data.a_to_b_public_attitude)) || '',
            bViewOfA: (isReversed ? (aViewOfB || data.a_to_b_public_relation) : (bViewOfA || data.b_to_a_public_relation)) || '',
            bTowardA: (isReversed ? (aTowardB || data.a_to_b_public_attitude) : (bTowardA || data.b_to_a_public_attitude)) || '',

            // 完整字段 (V2 标准) - Persistence
            a_to_b_public_relation: isReversed ? data.b_to_a_public_relation : data.a_to_b_public_relation,
            a_to_b_public_attitude: isReversed ? data.b_to_a_public_attitude : data.a_to_b_public_attitude,
            a_to_b_private_attitude: isReversed ? data.b_to_a_private_attitude : data.a_to_b_private_attitude,
            b_knows_a_private: isReversed ? data.a_knows_b_private : data.b_knows_a_private,

            b_to_a_public_relation: isReversed ? data.a_to_b_public_relation : data.b_to_a_public_relation,
            b_to_a_public_attitude: isReversed ? data.a_to_b_public_attitude : data.b_to_a_public_attitude,
            b_to_a_private_attitude: isReversed ? data.a_to_b_private_attitude : data.b_to_a_private_attitude,
            a_knows_b_private: isReversed ? data.b_knows_a_private : data.a_knows_b_private,

            visibleTo: visibleTo,
            backstory: backstory, // New
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };

        relationships[id] = relationship;
        window.sysStore.set(this.STORAGE_KEY, relationships);

        // Auto-sync removed as per user request. Use syncToSettings() manually.

        console.log('[RelationshipGraph] 已保存关系:', relationship);
        return relationship;
    },

    /**
     * [New] 增量更新关系 (用于自动化系统调用)
     * @param {string} subjectId - 发起方 (例如 NPC)
     * @param {string} objectId - 接收方 (例如 User 或另一 NPC)
     * @param {object} updateData - 要更新的字段 { char_to_user_public_relation, char_to_user_private_attitude, ... }
     */
    updateRelationship(subjectId, objectId, updateData) {
        if (!subjectId || !objectId || !updateData) {
            console.warn('[RelationshipGraph] updateRelationship called with invalid params');
            return null;
        }

        const id = this._generateRelationId(subjectId, objectId);
        const relationships = this.getAllRelationships();
        const existing = relationships[id] || this.getRelationship(subjectId, objectId) || {};

        const sorted = [subjectId, objectId].sort();
        const isSubjectA = sorted[0] === subjectId;

        const now = Date.now();

        // 准备新数据
        const newRel = {
            id,
            nodeA: sorted[0],
            nodeB: sorted[1],
            createdAt: existing.createdAt || now,
            updatedAt: now,
            visibleTo: existing.visibleTo || ['all']
        };

        // 智能字段映射
        // updateData 可能包含 char_to_user_public_relation 等字段
        // 我们需要根据 subjectId 是 A 还是 B 来决定写入哪个位置

        if (isSubjectA) {
            // Subject is A, Object is B -> A->B relationship
            newRel.a_to_b_public_relation = updateData.char_to_user_public_relation || updateData.public_relation || existing.a_to_b_public_relation || '';
            newRel.a_to_b_public_attitude = updateData.char_to_user_public_attitude || existing.a_to_b_public_attitude || '';
            newRel.a_to_b_private_attitude = updateData.char_to_user_private_attitude || updateData.private_attitude || existing.a_to_b_private_attitude || '';

            // 保留 B->A 数据
            newRel.b_to_a_public_relation = existing.b_to_a_public_relation || '';
            newRel.b_to_a_public_attitude = existing.b_to_a_public_attitude || '';
            newRel.b_to_a_private_attitude = existing.b_to_a_private_attitude || '';

            // Legacy
            newRel.aViewOfB = newRel.a_to_b_public_relation;
            newRel.aTowardB = newRel.a_to_b_public_attitude;
            newRel.bViewOfA = newRel.b_to_a_public_relation;
            newRel.bTowardA = newRel.b_to_a_public_attitude;
        } else {
            // Subject is B, Object is A -> B->A relationship
            newRel.b_to_a_public_relation = updateData.char_to_user_public_relation || updateData.public_relation || existing.b_to_a_public_relation || '';
            newRel.b_to_a_public_attitude = updateData.char_to_user_public_attitude || existing.b_to_a_public_attitude || '';
            newRel.b_to_a_private_attitude = updateData.char_to_user_private_attitude || updateData.private_attitude || existing.b_to_a_private_attitude || '';

            // 保留 A->B 数据
            newRel.a_to_b_public_relation = existing.a_to_b_public_relation || '';
            newRel.a_to_b_public_attitude = existing.a_to_b_public_attitude || '';
            newRel.a_to_b_private_attitude = existing.a_to_b_private_attitude || '';

            // Legacy
            newRel.aViewOfB = newRel.a_to_b_public_relation;
            newRel.aTowardB = newRel.a_to_b_public_attitude;
            newRel.bViewOfA = newRel.b_to_a_public_relation;
            newRel.bTowardA = newRel.b_to_a_public_attitude;
        }

        // 保留背景故事
        newRel.backstory = existing.backstory || '';

        relationships[id] = newRel;
        window.sysStore.set(this.STORAGE_KEY, relationships);

        console.log(`[RelationshipGraph] 关系增量更新: ${subjectId} -> ${objectId}`, updateData);
        return newRel;
    },

    /**
     * 删除关系
     */
    /**
     * [New] 手动同步当前关系到角色档案
     * Returns true if synced, false otherwise.
     */
    syncToSettings(idA, idB) {
        const id = this._generateRelationId(idA, idB);
        const relationships = this.getAllRelationships();
        const relationship = relationships[id];

        if (!relationship) return false;

        try {
            const sorted = [relationship.nodeA, relationship.nodeB];
            const charA = window.sysStore.getCharacter(sorted[0]);
            const charB = window.sysStore.getCharacter(sorted[1]);

            let npc = null;
            let npcRole = 'A';

            if (charA && charA.settings) { npc = charA; npcRole = 'A'; }
            else if (charB && charB.settings) { npc = charB; npcRole = 'B'; }

            if (npc) {
                const otherId = npcRole === 'A' ? sorted[1] : sorted[0];
                if (otherId === 'USER_SELF' || otherId === 'user') {
                    const rs = npc.settings.relationship || {};
                    const npcToUser = npcRole === 'A' ?
                        { obj: relationship.a_to_b_public_relation, pub: relationship.a_to_b_public_attitude, pvt: relationship.a_to_b_private_attitude, known: relationship.b_knows_a_private } :
                        { obj: relationship.b_to_a_public_relation, pub: relationship.b_to_a_public_attitude, pvt: relationship.b_to_a_private_attitude, known: relationship.a_knows_b_private };

                    const userToNpc = npcRole === 'A' ?
                        { obj: relationship.b_to_a_public_relation, pub: relationship.b_to_a_public_attitude, pvt: relationship.b_to_a_private_attitude, known: relationship.a_knows_b_private } :
                        { obj: relationship.a_to_b_public_relation, pub: relationship.a_to_b_public_attitude, pvt: relationship.a_to_b_private_attitude, known: relationship.b_knows_a_private };

                    rs.public_relation = npcToUser.obj;
                    rs.char_to_user_public_attitude = npcToUser.pub;
                    rs.char_to_user_private_attitude = npcToUser.pvt;
                    rs.user_knows_char_private = npcToUser.known;

                    rs.user_to_char_public_attitude = userToNpc.pub;
                    rs.user_to_char_private_attitude = userToNpc.pvt;
                    rs.char_knows_user_private = userToNpc.known;
                    rs.backstory = relationship.backstory;

                    rs.char_to_user_view = npcToUser.pub;
                    rs.user_to_char_view = userToNpc.pub;

                    window.sysStore.saveCharacter(npc);
                    console.log('[RelationshipGraph] Manual Sync Success:', npc.name);
                    return true;
                }
            }
        } catch (e) {
            console.warn('[RelationshipGraph] Manual Sync Failed', e);
        }
        return false;
    },

    /**
     * [New] 从角色档案手动同步到关系网 (Reset to Canon)
     */
    syncFromSettings(idA, idB) {
        const sorted = [idA, idB].sort();
        const charA = window.sysStore.getCharacter(sorted[0]);
        const charB = window.sysStore.getCharacter(sorted[1]);

        let npc = null;
        let npcRole = 'A';

        if (charA && charA.settings) { npc = charA; npcRole = 'A'; }
        else if (charB && charB.settings) { npc = charB; npcRole = 'B'; }

        if (!npc) {
            console.warn('[RelationshipGraph] No NPC found for syncFromSettings');
            return null;
        }

        const otherId = npcRole === 'A' ? sorted[1] : sorted[0];
        // Only sync if targeting User (current limitation of settings structure)
        if (otherId !== 'USER_SELF' && otherId !== 'user') {
            return null;
        }

        const rs = npc.settings.relationship || {};

        // Map Settings -> Graph Data
        // Settings standard:
        // char_to_user_public_attitude, char_to_user_private_attitude, user_knows_char_private
        // user_to_char_public_attitude, user_to_char_private_attitude, char_knows_user_private
        // public_relation

        // If npcRole is A (NPC is NodeA), then A->B is NPC->User
        // If npcRole is B (NPC is NodeB), then B->A is NPC->User

        const data = {
            nodeA: sorted[0],
            nodeB: sorted[1],
            visibleTo: ['all'], // Reset visibility? Or keep? Let's default to public as per settings implication
            backstory: rs.backstory || ''
        };

        if (npcRole === 'A') {
            // A=NPC, B=User
            data.a_to_b_public_relation = rs.public_relation || '';
            data.a_to_b_public_attitude = rs.char_to_user_public_attitude || rs.char_to_user_view || '';
            data.a_to_b_private_attitude = rs.char_to_user_private_attitude || '';
            data.b_knows_a_private = !!rs.user_knows_char_private;

            data.b_to_a_public_relation = rs.public_relation || ''; // Usually symmetric in simple view, but V2 allows diff? Keep simple.
            data.b_to_a_public_attitude = rs.user_to_char_public_attitude || rs.user_to_char_view || '';
            data.b_to_a_private_attitude = rs.user_to_char_private_attitude || '';
            data.a_knows_b_private = !!rs.char_knows_user_private;
        } else {
            // A=User, B=NPC
            // B->A is NPC->User
            data.b_to_a_public_relation = rs.public_relation || '';
            data.b_to_a_public_attitude = rs.char_to_user_public_attitude || rs.char_to_user_view || '';
            data.b_to_a_private_attitude = rs.char_to_user_private_attitude || '';
            data.a_knows_b_private = !!rs.user_knows_char_private;

            // A->B is User->NPC
            data.a_to_b_public_relation = rs.public_relation || '';
            data.a_to_b_public_attitude = rs.user_to_char_public_attitude || rs.user_to_char_view || '';
            data.a_to_b_private_attitude = rs.user_to_char_private_attitude || '';
            data.b_knows_a_private = !!rs.char_knows_user_private;
        }

        // Fill legacy for compatibility
        const isReversed = sorted[0] !== idA; // Logic check, but we used sorted[0] directly
        // actually saveRelationship handles mapping to A/B based on idA/idB props being passed? 
        // No, saveRelationship uses nodeA/nodeB from data.
        // And we constructed data with sorted A/B.

        // saveRelationship expects data to contain fields relative to nodeA/nodeB.
        // We set nodeA=sorted[0], nodeB=sorted[1].

        // Legacy fields for saveRelationship internal logic (it maps them if V2 fields missing, but we provided V2)
        // But let's be safe
        data.aViewOfB = data.a_to_b_public_relation;
        data.aTowardB = data.a_to_b_public_attitude;
        data.bViewOfA = data.b_to_a_public_relation;
        data.bTowardA = data.b_to_a_public_attitude;

        return this.saveRelationship(data);
    },

    /**
     * 删除关系
     * [Fix] 支持软删除：如果存在角色档案（Canon），则标记为 deleted 而不是物理删除，以防止回退到 Canon。
     */
    deleteRelationship(idA, idB) {
        const id = this._generateRelationId(idA, idB);
        const relationships = this.getAllRelationships();

        // Check fallback content
        const fallback = this._syncFromSettings(idA, idB);

        if (fallback) {
            // 如果有档案垫底，我们需要 "屏蔽" 它 -> Soft Delete
            relationships[id] = {
                id,
                nodeA: idA,
                nodeB: idB,
                isDeleted: true,
                updatedAt: Date.now()
            };
            console.log('[RelationshipGraph] 已软删除关系 (Masking Canon):', id);
        } else {
            // 如果没有档案，可以直接物理删除
            if (relationships[id]) {
                delete relationships[id];
                console.log('[RelationshipGraph] 已物理删除关系:', id);
            }
        }
        window.sysStore.set(this.STORAGE_KEY, relationships);
        return true;
    },

    /**
     * 获取所有节点
     */
    getAllNodes() {
        const nodes = [];
        const s = window.sysStore;

        // 添加用户节点
        nodes.push({
            id: 'USER_SELF',
            type: 'user',
            name: s.get('user_realname') || s.get('user_nickname') || '我',
            avatar: s.get('user_avatar') || 'assets/images/avatar_placeholder.png',
            isUser: true
        });

        // 添加所有角色节点
        const characters = s.getAllCharacters() || [];
        characters.forEach(char => {
            if (char.id && char.id !== 'USER_SELF') {
                nodes.push({
                    id: char.id,
                    type: 'character',
                    name: char.remark || char.real_name || char.name || '未知角色',
                    avatar: char.avatar || 'assets/images/avatar_placeholder.png',
                    isUser: false
                });
            }
        });

        return nodes;
    },

    /**
     * 获取单个节点信息
     */
    getNode(id) {
        const nodes = this.getAllNodes();
        return nodes.find(n => n.id === id);
    },

    /**
     * 获取被隐藏的节点ID列表
     */
    getHiddenNodes() {
        return window.sysStore.get('rg_hidden_nodes_v1') || [];
    },

    /**
     * 设置隐藏节点列表
     */
    setHiddenNodes(ids) {
        window.sysStore.set('rg_hidden_nodes_v1', ids || []);
    },

    /**
     * 构建关系网上下文信息（用于注入到System Prompt）
     * @param {string} targetId - 当前对话的目标角色ID
     */
    buildRelationshipContext(targetId) {
        const data = this.getGraphData();
        const nodeMap = {};
        data.nodes.forEach(n => nodeMap[n.id] = n);

        const rumors = window.sysStore.get('rg_rumors_v1') || {};
        let context = '';
        let hasContent = false;

        // 1. 遍历所有客观关系
        data.edges.forEach(rel => {
            // 权限检查
            const visibleTo = rel.visibleTo || [];
            if (!visibleTo.includes('all') && !visibleTo.includes(targetId) &&
                rel.nodeA !== targetId && rel.nodeB !== targetId) {
                return; // 不可见
            }

            const nodeA = nodeMap[rel.nodeA];
            const nodeB = nodeMap[rel.nodeB];

            if (nodeA && nodeB) {
                // ----------------------------------------------------
                // 场景区分：当事人 vs 旁观者 vs 流言信徒
                // ----------------------------------------------------
                const isParticipant = (nodeA.id === targetId || nodeB.id === targetId);
                const pairId = [rel.nodeA, rel.nodeB].sort().join('_');
                const rumorKey = `${targetId}|${pairId}`;
                const myRumor = rumors[rumorKey]; // 我是否有关于这对关系的“主观流言”？

                // ----------------------------------------------------
                // Case A: 我被流言蒙蔽 (优先展示流言)
                // ----------------------------------------------------
                if (!isParticipant && myRumor) {
                    context += `- [情报] 关于 **${nodeA.name}** 和 **${nodeB.name}** 的关系\n`;

                    // 双向主观流言
                    const viewAtoB = myRumor.contentAtoB || myRumor.content || '未知';
                    const viewBtoA = myRumor.contentBtoA || myRumor.content || '未知';

                    context += `  - **你认为**: ${nodeA.name} 对 ${nodeB.name} 是「${viewAtoB}」，${nodeB.name} 对 ${nodeA.name} 是「${viewBtoA}」\n`;

                    if (myRumor.reason) {
                        context += `  - **理由**: ${myRumor.reason}\n`;
                    }

                    context += `  > [备注]: 此为你深信不疑的情报 (可能与事实有出入)。\n`;
                    hasContent = true;
                }

                // ----------------------------------------------------
                // Case B: 我是当事人 (看到真相)
                // ----------------------------------------------------
                else if (isParticipant) {
                    const myView = (nodeA.id === targetId) ? rel.aViewOfB : rel.bViewOfA;
                    const myToward = (nodeA.id === targetId) ? rel.aTowardB : rel.bTowardA;
                    const otherNode = (nodeA.id === targetId) ? nodeB : nodeA;
                    const otherView = (nodeA.id === targetId) ? rel.bViewOfA : rel.aViewOfB;
                    const otherToward = (nodeA.id === targetId) ? rel.bTowardA : rel.aTowardB;

                    context += `- 与 **${otherNode.name}**\n`;
                    context += `  - 你的视角: 认为TA是「${myView || '?'}」，态度「${myToward || '?'}」\n`;
                    context += `  - 对方视角: 认为你是「${otherView || '?'}」，态度「${otherToward || '?'}」\n`;
                    if (rel.backstory) {
                        context += `  > [过往/备注]: ${rel.backstory.replace(/\n/g, ' ')}\n`;
                    }
                    hasContent = true;
                }

                // ----------------------------------------------------
                // Case C: 我是旁观者，且没有流言 (看到表面真相)
                // ----------------------------------------------------
                else {
                    context += `- [情报] 关于 **${nodeA.name}** 和 **${nodeB.name}** 的关系\n`;
                    // 安全过滤: 隐藏 Toward
                    context += `  - 据你所知: ${nodeA.name} 视 ${nodeB.name} 为「${rel.aViewOfB || '?'}」，反之则视作「${rel.bViewOfA || '?'}」\n`;

                    if (rel.backstory) {
                        context += `  > [已知情报]: ${rel.backstory.replace(/\n/g, ' ')}\n`;
                    }
                    hasContent = true;
                }

                context += `\n`;
            }
        });

        // 2. [New] 遍历“纯虚构流言”
        // (如果系统中根本不存在 A-B 的关系，但我却听到了谣言，也应该显示)
        // 遍历所有 rumors，如果 key 以 targetId 开头，且对应的 relationship 不在上面的循环中...
        // 暂时简化：暂不处理“无中生有”的流言（即必须先建立一条空的关系线，才能附着流言）。
        // 这样可以复用 visibleTo 逻辑。

        if (!hasContent) return '';
        return `### 社交关系网 (你所感知的世界)\n${context}`;
    },

    /**
     * 获取关系图可视化数据
     */
    getGraphData() {
        const nodes = this.getAllNodes();
        const relationships = this.getAllRelationships();
        const edgeMap = new Map();

        // 1. 初始化 DB 中的关系
        Object.values(relationships).forEach(rel => {
            if (rel.isDeleted) return; // [Fix] Filter out soft-deleted items
            edgeMap.set(rel.id, rel);
        });

        // 2. 扫描所有 Settings 里的隐含关系 (主要针对 USER_SELF)
        const userId = 'USER_SELF';

        nodes.forEach(node => {
            if (node.id === userId) return;

            // 调用 getRelationship 会自动 Merge (Settings + DB)
            const rel = this.getRelationship(node.id, userId);

            if (rel) {
                // 确保 ID 存在
                const id = rel.id || this._generateRelationId(node.id, userId);
                if (!rel.id) rel.id = id;

                // 将 Merge 后的完整对象放入 Map (覆盖掉单薄的 DB 对象)
                edgeMap.set(id, rel);
            }
        });

        const edges = Array.from(edgeMap.values()).map(rel => ({
            id: rel.id,
            nodeA: rel.nodeA,
            nodeB: rel.nodeB,
            aViewOfB: rel.aViewOfB,
            aTowardB: rel.aTowardB,
            bViewOfA: rel.bViewOfA,
            bTowardA: rel.bTowardA,
            visibleTo: rel.visibleTo,
            backstory: rel.backstory,

            // New Fields for UI
            a_to_b_public_relation: rel.a_to_b_public_relation,
            a_to_b_public_attitude: rel.a_to_b_public_attitude,
            a_to_b_private_attitude: rel.a_to_b_private_attitude,
            b_knows_a_private: rel.b_knows_a_private,
            b_to_a_public_relation: rel.b_to_a_public_relation,
            b_to_a_public_attitude: rel.b_to_a_public_attitude,
            b_to_a_private_attitude: rel.b_to_a_private_attitude,
            a_knows_b_private: rel.a_knows_b_private
        }));

        return { nodes, edges };
    },

    /**
     * [v36] 获取主观视角数据
     * @param {string} observerId - 观察者ID
     */
    getSubjectiveGraph(observerId) {
        const nodes = this.getAllNodes();
        const relationships = this.getAllRelationships();
        const rumors = window.sysStore.get('rg_rumors_v1') || {};

        let edges = [];

        // 0. [New] 获取 observer 认识的人 (Direct Neighbors)
        // 只有当我认识 A 或 B 时，我才能看到 A-B 的关系 (除非我有特别的流言)
        const myRelationships = Object.values(relationships).filter(r => r.nodeA === observerId || r.nodeB === observerId);
        const knownNodeIds = new Set([observerId]); // 包含自己
        myRelationships.forEach(r => {
            knownNodeIds.add(r.nodeA);
            knownNodeIds.add(r.nodeB);
        });

        // 1. 遍历真实关系
        Object.values(relationships).forEach(rel => {
            if (rel.isDeleted) return; // [Fix] Filter out soft-deleted items

            const pairId = [rel.nodeA, rel.nodeB].sort().join('_');
            const rumorKey = `${observerId}|${pairId}`;
            const myRumor = rumors[rumorKey];

            // 基础可见性 (Public or Explicitly allowed)
            const isPubliclyVisible = rel.visibleTo && (rel.visibleTo.includes('all') || rel.visibleTo.includes(observerId));

            // [New] 社交网络传导性 (Social Reach)
            // 即使关系是 Public 的，我也得先认识其中的人，或者处于同一个圈子才能“看见”。
            // 规则：至少认识其中一方。
            const isSociallyReachable = knownNodeIds.has(rel.nodeA) || knownNodeIds.has(rel.nodeB);

            // 最终判定：
            // 1. 我是当事人 -> Always Visible
            // 2. 有流言 -> Always Visible (我自己瞎猜的)
            // 3. 否则 -> 必须同时满足 (Public/Explicit) AND (SociallyReachable)
            const isParticipant = (rel.nodeA === observerId || rel.nodeB === observerId);

            const shouldShow = isParticipant || myRumor || (isPubliclyVisible && isSociallyReachable);

            if (shouldShow) {
                // Clone relationship as base
                // 注意：在 UI 中我们需要展示 "observer认为A是啥"
                // 这里我们简化模型：如果存在 Rumor，则用 Rumor 覆盖 aViewOfB / bViewOfA (显示为虚线)

                let edge = {
                    id: rel.id,
                    nodeA: rel.nodeA,
                    nodeB: rel.nodeB,
                    backstory: rel.backstory, // Backstory 暂时用真实的，或者也可以被 Rumor 覆盖
                    visibleTo: rel.visibleTo
                };

                if (myRumor) {
                    // 【被流言覆盖】
                    // 支持双向流言 v2
                    // 如果是旧数据(content)，则双向都使用 content
                    const contentRaw = myRumor.content;
                    edge.aViewOfB = myRumor.contentAtoB || contentRaw || '';
                    edge.bViewOfA = myRumor.contentBtoA || contentRaw || '';

                    // 确保如果有一方有值，即显示连线
                    if (!edge.aViewOfB && !edge.bViewOfA && contentRaw) {
                        edge.aViewOfB = contentRaw;
                        edge.bViewOfA = contentRaw;
                    }

                    edge.isRumor = true; // 标记位，UI 会渲染成紫色虚线
                    // 确保 UI 计算偏移时能识别到双向内容
                    // (UI层逻辑: !!edge.aViewOfB && !!edge.bViewOfA)
                } else {
                    // 【真实可见】
                    edge.aViewOfB = rel.aViewOfB;
                    edge.aTowardB = rel.aTowardB;
                    edge.bViewOfA = rel.bViewOfA;
                    edge.bTowardA = rel.bTowardA;
                    edge.isRumor = false;
                }
                edges.push(edge);
            }
        });

        // 2. (TODO) 处理“无中生有”的流言 (即 relationships 中不存在，但 rumors 中存在的 key)
        // 目前暂不处理，假设流言必须依附于已存在的（即便是空）关系上

        return { nodes, edges };
    },

    /**
     * [v36] 保存主观流言
     * @param {string} observerId - 谁的认知
     * @param {string} nodeA - 关系方A
     * @param {string} nodeB - 关系方B
     * @param {string} content - 流言内容
     */
    saveRumor(observerId, nodeA, nodeB, content) {
        const pairId = [nodeA, nodeB].sort().join('_');
        const key = `${observerId}|${pairId}`;

        const rumors = window.sysStore.get('rg_rumors_v1') || {};
        rumors[key] = {
            id: key,
            observerId,
            nodeA,
            nodeB,
            nodeA,
            nodeB,
            // 兼容 v1 简单流言
            content,
            contentAtoB: content,
            contentBtoA: content,
            updatedAt: Date.now()
        };

        window.sysStore.set('rg_rumors_v1', rumors);
        console.log(`[RelationshipGraph] Rumor implanted for ${observerId}:`, content);

        // 可选：如果真实关系不存在，创建一个空的真实关系以承载这个流言 (Ghost Relationship)
        if (!this.getRelationship(nodeA, nodeB)) {
            this.saveRelationship({
                nodeA, nodeB,
                visibleTo: [], // 对谁都不可见（除了流言持有者）
                backstory: '[Ghost Relationship for Rumor]'
            });
        }
    }
};

// 自动初始化
if (window.sysStore && window.sysStore.ready) {
    window.sysStore.ready().then(() => {
        window.WeChat.Services.RelationshipGraph.init();
    });
} else {
    setTimeout(() => {
        window.WeChat.Services.RelationshipGraph.init();
    }, 500);
}
