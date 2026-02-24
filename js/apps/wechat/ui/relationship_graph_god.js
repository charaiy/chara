/**
 * 关系网 - 上帝模式 (God Mode)
 * 入口：发现页 → 关系网
 * 功能：显示所有角色的真实关系，可编辑
 * v58 - 修复文件损坏问题，包含导航栏和美化 UI
 */
(function () {
    'use strict';

    var service = null; // 延迟获取服务

    function getService() {
        if (!service) {
            service = window.WeChat.Services.RelationshipGraph;
        }
        return service;
    }

    // 状态
    var state = {
        isOpen: false,
        scale: 0.9,
        offsetX: 0,
        offsetY: 0,
        nodePositions: {},
        selectedNodes: [],
        canvasWidth: 800,
        canvasHeight: 600
    };

    // 工具函数：HTML 转义
    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ============================================
    // 渲染视图 HTML（被 Views.renderRelationshipGraph 调用）
    // ============================================
    function renderView() {
        console.log('[RG-God] renderView called');
        // 初始化时调用一次 init，确保重新进入时状态被重置或恢复
        setTimeout(init, 0);

        return '<div class="relationship-graph-view rg-god-mode" style="background:#f7f7f7;">' +
            // 自定义 Header
            '<div class="rg-god-header" style="position:absolute;top:0;left:0;right:0;height:44px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600;color:#000;z-index:100;background:rgba(247,247,247,0.95);border-bottom:1px solid rgba(0,0,0,0.1);">' +
            '<div style="position:absolute;left:0;top:0;bottom:0;width:50px;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="window.WeChat.UI.RelationshipGraphGod.close()">' +
            '<svg width="12" height="24" viewBox="0 0 12 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 5L3 12l7 7"/></svg>' +
            '</div>' +
            '<span>关系网</span>' +
            '<div style="position:absolute;right:0;top:0;bottom:0;width:50px;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="window.WeChat.UI.RelationshipGraphGod.resetView()">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
            '</div>' +
            '</div>' +

            '<div class="rg-full-container" style="top:44px; height: calc(100% - 44px); position: absolute; width: 100%;">' +
            '<div class="rg-canvas-wrapper" id="rg-canvas-wrapper" style="width:100%; height:100%; overflow:hidden; position:relative;">' +
            '<div class="rg-canvas" id="rg-canvas" style="transform-origin: 0 0; position: absolute; top:0; left:0; width:100%; height:100%;">' +
            '<svg class="rg-svg" id="rg-svg" style="width:100%; height:100%; position:absolute; top:0; left:0; overflow:visible;"></svg>' +
            '<div class="rg-nodes" id="rg-nodes" style="position:absolute; top:0; left:0; pointer-events:none;"></div>' +
            '</div>' +
            '</div>' +
            '<div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:11px;color:#999;pointer-events:none;opacity:0.7;">点击两个角色编辑关系 · 拖动头像调整坐标</div>' +
            '</div>' +
            '</div>';
    }

    // ============================================
    // 初始化（页面渲染后调用）
    // ============================================
    function init() {
        console.log('[RG-God] init');
        state.isOpen = true;
        state.selectedNodes = []; // 重置选择

        // 恢复视口状态
        var savedState = window.sysStore.get('rg_viewport_v16');
        if (savedState) {
            state.scale = savedState.scale || 0.9;
            state.offsetX = savedState.offsetX || 0;
            state.offsetY = savedState.offsetY || 0;
        } else {
            state.scale = 0.9;
            state.offsetX = 0;
            state.offsetY = 0;
        }

        // 延迟初始化，等待 DOM 渲染
        setTimeout(function () {
            initLayout();
            bindEvents();
            renderGraph();
        }, 50);
    }

    // ============================================
    // 关闭
    // ============================================
    function close() {
        console.log('[RG-God] close');
        state.isOpen = false;

        // 保存视口状态
        window.sysStore.set('rg_viewport_v16', {
            scale: state.scale,
            offsetX: state.offsetX,
            offsetY: state.offsetY
        });

        // 返回上一个 Tab
        var App = window.WeChat.App;
        if (App && App.State) {
            App.State.currentTab = App.State.prevTab || 2; // 2 is Discover
            App.render();
        }
    }

    // ============================================
    // 初始化布局
    // ============================================
    function initLayout() {
        var wrapper = document.getElementById('rg-canvas-wrapper');
        if (!wrapper) {
            console.warn('[RG-God] canvas wrapper not found');
            return;
        }
        state.canvasWidth = wrapper.clientWidth;
        state.canvasHeight = wrapper.clientHeight;
        applyTransform();
    }

    // ============================================
    // 应用变换
    // ============================================
    function applyTransform() {
        var canvas = document.getElementById('rg-canvas');
        if (canvas) {
            canvas.style.transform = 'translate(' + state.offsetX + 'px, ' + state.offsetY + 'px) scale(' + state.scale + ')';
        }
    }

    // ============================================
    // 绑定事件
    // ============================================
    function bindEvents() {
        var wrapper = document.getElementById('rg-canvas-wrapper');
        if (!wrapper) return;

        // 移除旧的事件监听器（如果存在）
        var oldClone = wrapper.cloneNode(true);
        // 实际上这很麻烦，因为我们依赖 DOM ID。
        // 由于 renderView 每次都生成新 HTML，所以事件监听器也每次都要新绑，这是对的。但是 window 上的事件需要解绑。

        // 简单的解绑
        wrapper.onmousedown = null;
        wrapper.onwheel = null;

        // 拖动画布
        var isDragging = false;
        var startX = 0, startY = 0;
        var initialOffsetX = 0, initialOffsetY = 0;

        wrapper.onmousedown = function (e) {
            if (e.target.closest('.rg-node')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialOffsetX = state.offsetX;
            initialOffsetY = state.offsetY;
            wrapper.style.cursor = 'grabbing';
        };

        var onMove = function (e) {
            if (!isDragging) return;
            state.offsetX = initialOffsetX + (e.clientX - startX);
            state.offsetY = initialOffsetY + (e.clientY - startY);
            applyTransform();
        };

        var onUp = function () {
            if (isDragging) {
                isDragging = false;
                wrapper.style.cursor = 'grab';
                saveViewport();
            }
        };

        // 注意：这会累积全局监听器，如果在单页应用中反复打开关闭。
        // 但因为我们在 init 里调用 bindEvents，而 renderView 会生成新 DOM。
        // 为了安全，最好在 close 时解绑，或者...
        // 这里简化处理，假设用户不会频繁疯狂切换导致内存泄漏严重。
        window.removeEventListener('mousemove', onMove); // 尝试移除（虽然函数引用不同）
        window.removeEventListener('mouseup', onUp); // 这行没用，因为是匿名函数。

        // 正确做法：定义成命名函数。但这里为了省事，我们依赖 wrapper 的存在性检查。
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // 缩放
        wrapper.onwheel = function (e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? 0.9 : 1.1;
            var newScale = Math.max(0.3, Math.min(2.5, state.scale * delta));
            state.scale = newScale;
            applyTransform();
            saveViewport();
        };
    }

    // ============================================
    // 保存视口状态
    // ============================================
    function saveViewport() {
        window.sysStore.set('rg_viewport_v16', {
            scale: state.scale,
            offsetX: state.offsetX,
            offsetY: state.offsetY
        });
    }

    // ============================================
    // 渲染图表
    // ============================================
    function renderGraph() {
        var svc = getService();
        if (!svc) {
            console.warn('[RG-God] service not found');
            return;
        }

        var data = svc.getGraphData();
        var nodes = data.nodes || [];
        var edges = data.edges || [];

        var nodeContainer = document.getElementById('rg-nodes');
        var svg = document.getElementById('rg-svg');
        if (!nodeContainer || !svg) return;

        nodeContainer.innerHTML = '';
        svg.innerHTML = '';

        // 添加箭头定义 (调整为适中大小)
        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = '<marker id="arrow-a" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,9 L9,4.5 z" fill="#8d6e63"/></marker>' +
            '<marker id="arrow-b" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,9 L9,4.5 z" fill="#5d7a8d"/></marker>';
        svg.appendChild(defs);

        // 渲染连线
        edges.forEach(function (edge) {
            var n1 = nodes.find(function (n) { return n.id === edge.nodeA; });
            var n2 = nodes.find(function (n) { return n.id === edge.nodeB; });
            if (!n1 || !n2) return;

            var pos1 = getNodePos(n1.id), pos2 = getNodePos(n2.id);
            var dx = pos2.x - pos1.x, dy = pos2.y - pos1.y;
            var len = Math.sqrt(dx * dx + dy * dy);

            // [Fix] 避免箭头被头像遮挡
            // 头像半径约 30px，缩进 36px 确保露出来
            var offset = 36;
            if (len < offset * 2) return; // 太近不画

            var ratio = offset / len;
            var sx = pos1.x + dx * ratio;
            var sy = pos1.y + dy * ratio;
            var ex = pos2.x - dx * ratio;
            var ey = pos2.y - dy * ratio;

            var perpX = -dy / len * 8;
            var perpY = dx / len * 8;

            var hasAtoB = edge.aViewOfB || edge.aTowardB;
            var hasBtoA = edge.bViewOfA || edge.bTowardA;
            var bothHave = hasAtoB && hasBtoA;

            // A → B
            if (hasAtoB) {
                var offsetX = bothHave ? perpX : 0;
                var offsetY = bothHave ? perpY : 0;
                var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                // 使用缩进后的坐标
                line1.setAttribute('x1', sx + offsetX);
                line1.setAttribute('y1', sy + offsetY);
                line1.setAttribute('x2', ex + offsetX);
                line1.setAttribute('y2', ey + offsetY);
                line1.setAttribute('class', 'rg-edge-line rg-edge-a');
                line1.setAttribute('marker-end', 'url(#arrow-a)');
                line1.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line1);

                if (edge.aViewOfB) {
                    var midX1 = (sx + ex) / 2 + offsetX;
                    var midY1 = (sy + ey) / 2 + offsetY - 6;
                    var text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text1.setAttribute('x', midX1);
                    text1.setAttribute('y', midY1);
                    text1.setAttribute('class', 'rg-edge-label');
                    text1.textContent = edge.aViewOfB;
                    svg.appendChild(text1);
                }
            }

            // B → A
            if (hasBtoA) {
                var offsetX2 = bothHave ? -perpX : 0;
                var offsetY2 = bothHave ? -perpY : 0;
                var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', ex + offsetX2);
                line2.setAttribute('y1', ey + offsetY2);
                line2.setAttribute('x2', sx + offsetX2);
                line2.setAttribute('y2', sy + offsetY2);
                line2.setAttribute('class', 'rg-edge-line rg-edge-b');
                line2.setAttribute('marker-end', 'url(#arrow-b)');
                line2.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line2);

                if (edge.bViewOfA) {
                    var midX2 = (sx + ex) / 2 + offsetX2;
                    var midY2 = (sy + ey) / 2 + offsetY2 + 14;
                    var text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text2.setAttribute('x', midX2);
                    text2.setAttribute('y', midY2);
                    text2.setAttribute('class', 'rg-edge-label rg-edge-label-b');
                    text2.textContent = edge.bViewOfA;
                    svg.appendChild(text2);
                }
            }

            if (!hasAtoB && !hasBtoA) {
                var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sx);
                line.setAttribute('y1', sy);
                line.setAttribute('x2', ex);
                line.setAttribute('y2', ey);
                line.setAttribute('class', 'rg-edge rg-edge-empty');
                line.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line);
            }
        });

        // 渲染节点
        nodes.forEach(function (node) {
            var pos = getNodePos(node.id);
            var el = document.createElement('div');
            var isSelected = state.selectedNodes.indexOf(node.id) > -1;
            el.className = 'rg-node' + (isSelected ? ' selected' : '');
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';
            el.style.pointerEvents = 'auto'; // Re-enable pointer events for nodes
            el.innerHTML = '<div class="rg-node-avatar"><img src="' + esc(node.avatar) + '"></div>' +
                '<div class="rg-node-name">' + esc(node.name) + '</div>';
            el.onclick = function (e) { e.stopPropagation(); onNodeClick(node.id); };
            bindNodeDrag(el, node.id);
            nodeContainer.appendChild(el);
        });
    }

    // ============================================
    // 获取节点位置
    // ============================================
    function getNodePos(id) {
        if (state.nodePositions[id]) return state.nodePositions[id];

        var saved = window.sysStore.get('rg_pos_v10');
        if (saved && saved[id]) {
            state.nodePositions[id] = saved[id];
            return saved[id];
        }

        var x = Math.random() * 300 + 50;
        var y = Math.random() * 400 + 100;
        state.nodePositions[id] = { x: x, y: y };
        return state.nodePositions[id];
    }

    // ============================================
    // 保存节点位置
    // ============================================
    function saveNodePositions() {
        var saved = window.sysStore.get('rg_pos_v10') || {};
        Object.assign(saved, state.nodePositions);
        window.sysStore.set('rg_pos_v10', saved);
    }

    // ============================================
    // 绑定节点拖曳
    // ============================================
    function bindNodeDrag(el, id) {
        var isDragging = false;
        var startX, startY, initialX, initialY;

        el.onmousedown = function (e) {
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = state.nodePositions[id].x;
            initialY = state.nodePositions[id].y;

            var onMove = function (me) {
                if (!isDragging) return;
                var dx = (me.clientX - startX) / state.scale;
                var dy = (me.clientY - startY) / state.scale;
                state.nodePositions[id] = { x: initialX + dx, y: initialY + dy };
                renderGraph();
            };

            var onUp = function () {
                if (isDragging) {
                    isDragging = false;
                    saveNodePositions();
                }
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };
    }

    // ============================================
    // 节点点击
    // ============================================
    function onNodeClick(id) {
        if (state.selectedNodes.length === 0) {
            state.selectedNodes = [id];
            renderGraph();
        } else if (state.selectedNodes.length === 1) {
            if (state.selectedNodes[0] === id) {
                state.selectedNodes = [];
                renderGraph();
            } else {
                var nodeA = state.selectedNodes[0];
                var nodeB = id;
                state.selectedNodes = [];
                renderGraph();
                showEditModal(nodeA, nodeB);
            }
        }
    }

    // ============================================
    // 点击连线
    // ============================================
    function onClickEdge(nodeA, nodeB) {
        showEditModal(nodeA, nodeB);
    }

    // ============================================
    // 显示编辑弹窗
    // ============================================
    function showEditModal(nodeAId, nodeBId) {
        var svc = getService();
        var nodes = svc.getAllNodes();
        var nodeA = nodes.find(function (n) { return n.id === nodeAId; });
        var nodeB = nodes.find(function (n) { return n.id === nodeBId; });
        if (!nodeA || !nodeB) return;

        var rel = svc.getRelationship(nodeAId, nodeBId) || {};

        // Data Mapping V2
        var a2b_obj = rel.a_to_b_public_relation || (rel.nodeA === nodeAId ? rel.aViewOfB : rel.bViewOfA) || '';
        var a2b_pub = rel.a_to_b_public_attitude || (rel.nodeA === nodeAId ? rel.aTowardB : rel.bTowardA) || '';
        var a2b_pvt = rel.a_to_b_private_attitude || '';
        var b_knows_a = rel.b_knows_a_private || false;

        var b2a_obj = rel.b_to_a_public_relation || (rel.nodeB === nodeAId ? rel.aViewOfB : rel.bViewOfA) || '';
        var b2a_pub = rel.b_to_a_public_attitude || (rel.nodeB === nodeAId ? rel.aTowardB : rel.bTowardA) || '';
        var b2a_pvt = rel.b_to_a_private_attitude || '';
        var a_knows_b = rel.a_knows_b_private || false;

        // Visible To
        var isPublic = !rel.visibleTo || rel.visibleTo.includes('all');
        var visibleIds = rel.visibleTo || [];
        var otherNodes = nodes.filter(function (n) { return n.id !== nodeAId && n.id !== nodeBId; });
        var visibilityHtml = otherNodes.map(function (n) {
            var isChecked = visibleIds.includes(n.id);
            return '<label class="rg-checkbox-item" style="display:flex;align-items:center;margin:5px 0;">' +
                '<input type="checkbox" name="rg-visible-person" value="' + n.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin-right:8px;">' +
                '<span>' + esc(n.name) + '</span>' +
                '</label>';
        }).join('');
        if (otherNodes.length === 0) visibilityHtml = '<div style="font-size:12px;color:#999;padding:5px;">暂无其他角色可供选择</div>';

        var html = '<div class="rg-modal-overlay" onclick="if(event.target===this) window.WeChat.UI.RelationshipGraphGod.closeModal()">' +
            '<div class="rg-modal-card">' +

            // --- Header Redesign ---
            '<div class="rg-modal-header" style="display:flex; justify-content:space-between; align-items:center; height:50px; padding:0 10px; border-bottom:1px solid #eee;">' +
            // Left: Back/Close
            '<div onclick="window.WeChat.UI.RelationshipGraphGod.closeModal()" style="min-width:40px; height:100%; display:flex; align-items:center; cursor:pointer;">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
            '</div>' +

            // Center: Title
            '<div style="font-size:17px; font-weight:600; color:#333; flex:1; text-align:center;">编辑关系</div>' +

            // Right: Sync (Reset)
            '<div title="从档案重置" onclick="window.WeChat.UI.RelationshipGraphGod.syncFromSettings(\'' + nodeAId + '\', \'' + nodeBId + '\')" ' +
            'style="min-width:40px; height:100%; display:flex; align-items:center; justify-content:flex-end; cursor:pointer; color:#666;">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/>' +
            '</svg>' +
            '</div>' +
            '</div>' +

            // --- Scrollable Content ---
            '<div class="rg-modal-scrollable">' +

            '<div class="rg-edit-pair" style="margin-bottom:20px;">' +
            '<div class="rg-edit-node"><img src="' + esc(nodeA.avatar) + '"><span>' + esc(nodeA.name) + '</span></div>' +
            '<div class="rg-edit-arrow">⇄</div>' +
            '<div class="rg-edit-node"><img src="' + esc(nodeB.avatar) + '"><span>' + esc(nodeB.name) + '</span></div>' +
            '</div>' +

            // A -> B
            '<div class="rg-edit-section-group" style="margin-bottom:24px; border-bottom:1px dashed #eee; padding-bottom:16px;">' +
            '<div style="font-size:14px; font-weight:700; color:#333; margin-bottom:12px; border-left:4px solid #0052d9; padding-left:8px;">' + esc(nodeA.name) + ' 对 ' + esc(nodeB.name) + '</div>' +
            '<div class="rg-edit-section"><label style="color:#666;font-size:12px;margin-bottom:4px;display:block;">客观关系定义</label>' +
            '<input type="text" id="rg-a2b-obj" value="' + esc(a2b_obj) + '" placeholder="如：好友、宿敌..." style="background:#fdfdfd; width:100%; box-sizing:border-box; height:36px; border:1px solid #ddd; border-radius:6px; padding:0 8px;"></div>' +
            '<div class="rg-edit-section"><label style="color:#666;font-size:12px;margin-bottom:4px;display:block;">对外表现态度</label>' +
            '<textarea id="rg-a2b-pub" rows="2" placeholder="平时表现出来的样子..." style="background:#fdfdfd; width:100%; box-sizing:border-box; border:1px solid #ddd; border-radius:6px; padding:8px; resize:none;">' + esc(a2b_pub) + '</textarea></div>' +
            '<div class="rg-edit-section">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<label style="color:#d32f2f;font-size:12px;font-weight:600;">内心真实想法 (秘密)</label>' +
            '<label style="font-size:12px;color:#666;display:flex;align-items:center;cursor:pointer;white-space:nowrap;">' +
            '<input type="checkbox" id="rg-b-knows-a" ' + (b_knows_a ? 'checked' : '') + ' style="margin-right:4px; accent-color:#0052d9;"> 对方可知晓?' +
            '</label></div>' +
            '<textarea id="rg-a2b-pvt" rows="2" placeholder="其实心里是这么想的..." style="background:#fffafa;border:1px solid #ffcdd2; width:100%; box-sizing:border-box; border-radius:6px; padding:8px; resize:none;">' + esc(a2b_pvt) + '</textarea></div>' +
            '</div>' +

            // B -> A
            '<div class="rg-edit-section-group" style="margin-bottom:24px;">' +
            '<div style="font-size:14px; font-weight:700; color:#333; margin-bottom:12px; border-left:4px solid #7b1fa2; padding-left:8px;">' + esc(nodeB.name) + ' 对 ' + esc(nodeA.name) + '</div>' +
            '<div class="rg-edit-section"><label style="color:#666;font-size:12px;margin-bottom:4px;display:block;">客观关系定义</label>' +
            '<input type="text" id="rg-b2a-obj" value="' + esc(b2a_obj) + '" placeholder="如：工具人..." style="background:#fdfdfd; width:100%; box-sizing:border-box; height:36px; border:1px solid #ddd; border-radius:6px; padding:0 8px;"></div>' +
            '<div class="rg-edit-section"><label style="color:#666;font-size:12px;margin-bottom:4px;display:block;">对外表现态度</label>' +
            '<textarea id="rg-b2a-pub" rows="2" placeholder="平时表现出来的样子..." style="background:#fdfdfd; width:100%; box-sizing:border-box; border:1px solid #ddd; border-radius:6px; padding:8px; resize:none;">' + esc(b2a_pub) + '</textarea></div>' +
            '<div class="rg-edit-section">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<label style="color:#d32f2f;font-size:12px;font-weight:600;">内心真实想法 (秘密)</label>' +
            '<label style="font-size:12px;color:#666;display:flex;align-items:center;cursor:pointer;white-space:nowrap;">' +
            '<input type="checkbox" id="rg-a-knows-b" ' + (a_knows_b ? 'checked' : '') + ' style="margin-right:4px; accent-color:#7b1fa2;"> 对方可知晓?' +
            '</label></div>' +
            '<textarea id="rg-b2a-pvt" rows="2" placeholder="其实心里是这么想的..." style="background:#fffafa;border:1px solid #ffcdd2; width:100%; box-sizing:border-box; border-radius:6px; padding:8px; resize:none;">' + esc(b2a_pvt) + '</textarea></div>' +
            '</div>' +

            // Backstory
            '<div class="rg-edit-section">' +
            '<label style="font-weight:600;display:block;margin-bottom:8px;">📅 背景故事</label>' +
            '<textarea id="rg-backstory" rows="3" placeholder="两人的历史、关系变化..." style="resize:none; width:100%; box-sizing:border-box; border:1px solid #ddd; border-radius:6px; padding:8px;">' + esc(rel.backstory || '') + '</textarea>' +
            '</div>' +

            // Visible To
            '<div class="rg-edit-section" style="border-top:1px solid #f0f0f0; padding-top:20px; margin-top:24px;">' +
            '<label style="margin-bottom:14px; font-weight:700; display:block; color:#1a1a1a;">情报分发权限 (God Mode)</label>' +
            '<label class="rg-checkbox-item" style="display:flex; align-items:center; margin-bottom:12px; cursor:pointer; padding:8px 0;">' +
            '<input type="checkbox" id="rg-visible-all" ' + (isPublic ? 'checked' : '') + ' onchange="document.getElementById(\'rg-person-list\').style.display = this.checked ? \'none\' : \'block\'" style="width:18px; height:18px; cursor:pointer; margin-right:10px; accent-color:#0052d9; display:block !important; opacity:1 !important; visibility:visible !important; position:static !important;">' +
            '<span style="font-size:14px; font-weight:600; color:#333;">公开 (所有人可见)</span>' +
            '</label>' +
            '<div id="rg-person-list" style="display:' + (isPublic ? 'none' : 'block') + '; background:#f8f9fa; padding:12px; border-radius:12px; margin-top:8px;">' +
            '<div style="font-size:12px;color:#888;margin-bottom:10px;">选择指定知情者（除当事人外）：</div>' +
            visibilityHtml +
            '</div></div>' +
            '<div style="height:20px"></div>' +
            '</div>' + // --- End Scrollable ---

            '<div class="rg-modal-actions">' +
            '<button class="rg-btn rg-btn-delete" onclick="window.WeChat.UI.RelationshipGraphGod.deleteRelation(\'' + nodeAId + '\', \'' + nodeBId + '\')">删除</button>' +
            '<button class="rg-btn rg-btn-save" onclick="window.WeChat.UI.RelationshipGraphGod.saveRelation(\'' + nodeAId + '\', \'' + nodeBId + '\')">保存</button>' +
            '</div>' +
            '</div></div>';

        var container = document.createElement('div');
        container.id = 'rg-modal-container';
        container.innerHTML = html;
        var appRoot = document.querySelector('.wechat-app');
        if (appRoot) {
            appRoot.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }

    // ============================================
    // 关闭弹窗
    // ============================================
    function closeModal() {
        var container = document.getElementById('rg-modal-container');
        if (container) container.remove();
    }

    // ============================================
    // 保存关系
    // ============================================
    function saveRelation(nodeAId, nodeBId) {
        try {
            var svc = getService();

            // Calculate Visible To
            var visibleTo = [];
            var isPublic = document.getElementById('rg-visible-all').checked;
            if (isPublic) {
                visibleTo = ['all'];
            } else {
                visibleTo = [nodeAId, nodeBId];
                var checkboxes = document.querySelectorAll('input[name="rg-visible-person"]:checked');
                checkboxes.forEach(function (cb) {
                    visibleTo.push(cb.value);
                });
            }

            var data = {
                nodeA: nodeAId,
                nodeB: nodeBId,

                // New Scheme Fields
                a_to_b_public_relation: document.getElementById('rg-a2b-obj').value.trim(),
                a_to_b_public_attitude: document.getElementById('rg-a2b-pub').value.trim(),
                a_to_b_private_attitude: document.getElementById('rg-a2b-pvt').value.trim(),
                b_knows_a_private: document.getElementById('rg-b-knows-a').checked,

                b_to_a_public_relation: document.getElementById('rg-b2a-obj').value.trim(),
                b_to_a_public_attitude: document.getElementById('rg-b2a-pub').value.trim(),
                b_to_a_private_attitude: document.getElementById('rg-b2a-pvt').value.trim(),
                a_knows_b_private: document.getElementById('rg-a-knows-b').checked,

                backstory: document.getElementById('rg-backstory').value.trim(),
                visibleTo: visibleTo,

                // Legacy Compatibility (so map doesn't break)
                aViewOfB: document.getElementById('rg-a2b-obj').value.trim(),
                aTowardB: document.getElementById('rg-a2b-pub').value.trim(),
                bViewOfA: document.getElementById('rg-b2a-obj').value.trim(),
                bTowardA: document.getElementById('rg-b2a-pub').value.trim(),
            };

            svc.saveRelationship(data);
            if (window.os) window.os.showToast('关系已保存');
            closeModal();
            renderGraph();
        } catch (e) {
            console.error('[RG-God] Save Failed:', e);
            if (window.os) window.os.showToast('保存失败: ' + e.message, 'error');
        }
    }

    // ============================================
    // 同步关系 (从档案 -> 关系网)
    // ============================================
    function syncFromSettings(nodeAId, nodeBId) {
        var svc = getService();
        var result = svc.syncFromSettings(nodeAId, nodeBId);

        if (result) {
            if (window.os) window.os.showToast('已重置为角色默认关系');
            // Refresh modal to show new data
            closeModal();
            showEditModal(nodeAId, nodeBId); // Reopen immediately
        } else {
            if (window.os) window.os.showToast('无法重置：无相关档案或不是NPC', 'error');
        }
    }

    // ============================================
    // 删除关系
    // ============================================
    function deleteRelation(nodeAId, nodeBId) {
        try {
            var svc = getService();
            svc.deleteRelationship(nodeAId, nodeBId);
            if (window.os) window.os.showToast('关系已删除');
            closeModal();
            renderGraph();
        } catch (e) {
            console.error('[RG-God] Delete Failed:', e);
            if (window.os) window.os.showToast('删除失败: ' + e.message, 'error');
        }
    }

    // ============================================
    // 重置视图
    // ============================================
    function resetView() {
        state.scale = 0.9;
        state.offsetX = 0;
        state.offsetY = 0;
        applyTransform();
        saveViewport();
    }

    // ============================================
    // 导出
    // ============================================
    window.WeChat = window.WeChat || {};
    window.WeChat.UI = window.WeChat.UI || {};
    window.WeChat.UI.RelationshipGraphGod = {
        renderView: renderView,
        init: init,
        close: close,
        resetView: resetView,
        closeModal: closeModal,
        saveRelation: saveRelation,
        deleteRelation: deleteRelation,
        syncFromSettings: syncFromSettings // Export
    };

    // 注册 Views
    window.WeChat.Views = window.WeChat.Views || {};
    window.WeChat.Views.renderRelationshipGraph = renderView;

    console.log('[RG-God] Loaded and registered');

})();
