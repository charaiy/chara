const fs = require('fs');
const f = 'c:/Users/74497/Desktop/chara/js/apps/wechat/ui/views_moments.js';
let c = fs.readFileSync(f, 'utf8');

const startMarker = '// 关系网可视化：好友列表 + 个人视角';
const endMarker = '        }\r\n\r\n        return `';

const startIdx = c.indexOf(startMarker);
if (startIdx === -1) { console.log('FAIL: start not found'); process.exit(1); }

let lineStart = c.lastIndexOf('\n', startIdx) + 1;
let endIdx = c.indexOf('        }\r\n\r\n        return `', startIdx);
if (endIdx === -1) { console.log('FAIL: end not found'); process.exit(1); }
endIdx = endIdx + '        }'.length;

const newBlock = `        // 关系网可视化：好友列表 + 该角色的个人视角\r
        let relationshipHtml = \`<div style="font-size:13px;color:\${textSecColor};text-align:center;padding:24px 0;">该角色暂无好友</div>\`;\r
        if (window.WeChat.Services.RelationshipGraph) {\r
            const RG = window.WeChat.Services.RelationshipGraph;\r
            const rels = RG.getVisibleRelationships(charId);\r
\r
            // 过滤：只看与该角色直接相关的连线\r
            const myRels = rels.filter(r => r.nodeA === charId || r.nodeB === charId);\r
\r
            if (myRels.length > 0) {\r
                const htmlList = myRels.map(r => {\r
                    const otherId = r.nodeA === charId ? r.nodeB : r.nodeA;\r
                    const otherNode = RG.getNode(otherId);\r
                    if (!otherNode) return '';\r
\r
                    // 客观关系标签：对方在该角色眼中的身份（如：主人、同事、前任）\r
                    const objRelation = r.nodeA === charId\r
                        ? (r.aViewOfB || r.a_to_b_public_relation || '')\r
                        : (r.bViewOfA || r.b_to_a_public_relation || '');\r
\r
                    // 个人认知：该角色对对方的主观感受（如：暗恋、讨厌）\r
                    const myAttitude = r.nodeA === charId\r
                        ? (r.aTowardB || r.a_to_b_public_attitude || r.a_to_b_private_attitude || '')\r
                        : (r.bTowardA || r.b_to_a_public_attitude || r.b_to_a_private_attitude || '');\r
\r
                    const tagObj = objRelation ? \`<span style="background:\${primaryLight};color:\${primaryColor};padding:3px 8px;border-radius:6px;font-size:11px;flex-shrink:0;">\${this.escapeHtml(objRelation)}</span>\` : '';\r
                    const tagMy = myAttitude ? \`<span style="background:\${isDark ? 'rgba(255,180,100,0.12)' : 'rgba(220,120,60,0.08)'};color:\${isDark ? '#E8A870' : '#B85C30'};padding:3px 8px;border-radius:6px;font-size:11px;flex-shrink:0;">\${this.escapeHtml(myAttitude)}</span>\` : '';\r
\r
                    return \`\r
                        <div style="display:flex;align-items:center;padding:12px 24px;border-bottom:1px solid \${borderColor};">\r
                            <img src="\${otherNode.avatar || 'assets/images/avatar_placeholder.png'}" style="width:40px;height:40px;border-radius:50%;margin-right:12px;object-fit:cover;border:1px solid \${borderColor};">\r
                            <div style="flex:1;min-width:0;">\r
                                <div style="font-size:14px;font-weight:600;color:\${textColor};margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${this.escapeHtml(otherNode.name)}</div>\r
                                <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">\r
                                    \${tagObj}\${tagMy}\r
                                </div>\r
                            </div>\r
                        </div>\r
                    \`;\r
                }).join('');\r
\r
                if (htmlList.trim()) {\r
                    relationshipHtml = htmlList;\r
                }\r
            }\r
        }`;

c = c.substring(0, lineStart) + newBlock + c.substring(endIdx);
fs.writeFileSync(f, c, 'utf8');
console.log('SUCCESS');
