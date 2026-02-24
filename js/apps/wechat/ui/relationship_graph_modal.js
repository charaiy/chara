/**
 * 关系网 - 视角模式 (Subjective Mode)
 * 入口：人物面板 → 小眼睛按钮
 * 功能：显示某个角色以为的关系网（可能包含误解、流言）
 * v1 - 完全独立的视角模式组件
 */
(function () {
    'use strict';

    var service = null;

    function getService() {
        if (!service) {
            service = window.WeChat.Services.RelationshipGraph;
        }
        return service;
    }

    // 状态
    var state = {
        isOpen: false,
        observerId: null,  // 观察者 ID
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
    // 打开视角模式（作为浮层）
    // ============================================
    function open(observerId) {
        console.log('[RG-Subjective] open:', observerId);
        if (!observerId) {
            console.warn('[RG-Subjective] observerId is required');
            return;
        }

        state.isOpen = true;
        state.observerId = observerId;
        state.selectedNodes = [];

        // 恢复视口状态
        var savedState = window.sysStore.get('rg_subjective_viewport_v1');
        if (savedState) {
            state.scale = savedState.scale || 0.9;
            state.offsetX = savedState.offsetX || 0;
            state.offsetY = savedState.offsetY || 0;
        } else {
            state.scale = 0.9;
            state.offsetX = 0;
            state.offsetY = 0;
        }

        // 渲染浮层
        renderOverlay();

        // 延迟初始化
        setTimeout(function () {
            initLayout();
            bindEvents();
            renderGraph();
        }, 100);
    }

    // ============================================
    // 渲染浮层
    // ============================================
    function renderOverlay() {
        var svc = getService();
        var nodes = svc.getAllNodes();
        var observer = nodes.find(function (n) { return n.id === state.observerId; });
        var observerName = observer ? observer.name : '未知';

        // 使用 wx-char-panel 结构以保持 UI 一致性
        // 移除内联样式，回归原生 CSS 控制
        var html = '<div class="wx-char-panel-overlay active" style="z-index: 20000 !important;" onclick="if(event.target===this) window.WeChat.UI.RelationshipGraphSubjective.close()">' +
            '<div class="wx-char-panel" onclick="event.stopPropagation()">' +

            // Header
            '<div class="wx-char-panel-header">' +
            '<div class="wx-char-panel-close" onclick="window.WeChat.UI.RelationshipGraphSubjective.close()">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</div>' +
            '<div style="font-size: 16px; font-weight: 600; letter-spacing: -0.5px;">' + esc(observerName) + ' 的视角</div>' +
            '<div style="width: 24px; cursor: pointer;" onclick="window.WeChat.UI.RelationshipGraphSubjective.resetView()">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
            '</div>' +
            '</div>' +

            // Content Body (Needs defined height via class or minimal style if panel doesn't provide it)
            // Using style="height: 100%; display: flex; flex-direction: column;" inside the panel might be safe if panel is flex itself.
            // But to "match status panel", we should probably use wx-char-panel-scrollable 
            // However, this is a graph. We'll use a wrapper that fills the panel.
            '<div style="display: flex; flex-direction: column; height: 100%;">' +

            // Hint Bar
            '<div style="background: #fcfcfc; color: #999; font-size: 12px; padding: 12px 16px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.03); letter-spacing: 0.5px;">主观认知网络 · 视角来源于 ' + esc(observerName) + '</div>' +

            // Canvas Wrapper (Occupies remaining space)
            '<div class="rg-canvas-wrapper" id="rg-subjective-canvas-wrapper" style="flex: 1; position: relative; overflow: hidden; background: #f7f7f7;">' +
            '<div class="rg-canvas" id="rg-subjective-canvas" style="transform-origin: 0 0;">' +
            '<svg class="rg-svg" id="rg-subjective-svg"></svg>' +
            '<div class="rg-nodes" id="rg-subjective-nodes"></div>' +
            '</div>' +

            '</div>' + // End Canvas Wrapper
            '</div>' + // End Inner Flex Wrapper
            '</div>' + // End Panel
            '</div>';  // End Overlay

        // 挂载到 DOM
        // 这里我们需要找到一个挂载点。modals_controller 通常是把 HTML 返回给 App.render。
        // 但 relationship_graph_modal 似乎是独立管理的？
        // 不，看 modals_controller.js，它是通过 renderRelationshipGraph() 返回字符串的。
        // 所以这里我不应该自己操作 DOM，而是应该返回 HTML 字符串，还是什么？

        // 仔细看之前的代码：它似乎设计为"组件"，但也保留了独立的 open() 方法。
        // 在 modals_controller.js 中：
        // if (State.subjectiveGraphId) { modalHtml += window.WeChat.Views.renderRelationshipGraph(); }
        // 这说明它是被 App.render() 调用的。

        // 所以这个 renderOverlay 函数**不应该直接操作 DOM**（或者它以前是直接操作的？）。
        // 让我们检查一下原来的 renderOverlay 是怎么用的。
        // 原来的 open() 调用了 renderOverlay()。
        // 原代码中并没有看到 renderOverlay 的返回值被用在哪里。
        // 让我们再读取一下文件后面的部分，看看它是怎么挂载的。

        /* 
           原来的 open()：
           renderOverlay(); 
           setTimeout(..., 100);
           
           如果这是通过 App.render() 调用的，那么 open() 只是设置状态 State.subjectiveGraphId = id。
           然后 App.render() 会调用 renderRelationshipGraph()。
           
           我们需要确认 window.WeChat.Views.renderRelationshipGraph 指向哪里。
           文件最后通常会暴露接口。
        */

        // 暂时假设这里我们需要适配 modals_controller 的模式。
        // 但既然 modals_controller 有 `window.WeChat.Views.renderRelationshipGraph()`，
        // 说明这个文件应该导出这个方法。

        // 我们先只替换 html 结构，然后在后面确认挂载方式。
        // 为了安全起见，我会查找 renderRelationshipGraph 的定义。

        // [IMPORTANT Correction]
        // 原来的 open() 函数通过改变全局 State 来触发重新渲染。
        // 所以 renderOverlay() 可能只是生成 HTML 字符串被外部调用，或者它直接插入 DOM（这与 modals_controller 冲突）。
        // 让我们看看文件底部。

        var container = document.createElement('div');
        container.id = 'rg-subjective-root';
        container.innerHTML = html;
        // v55: 挂载到 .wechat-app 容器内，防止溢出手机屏幕
        var appRoot = document.querySelector('.wechat-app');
        if (appRoot) {
            appRoot.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
    }

    // ============================================
    // 关闭
    // ============================================
    function close() {
        console.log('[RG-Subjective] close');
        state.isOpen = false;

        // 保存视口状态
        window.sysStore.set('rg_subjective_viewport_v1', {
            scale: state.scale,
            offsetX: state.offsetX,
            offsetY: state.offsetY
        });

        // 移除浮层
        var root = document.getElementById('rg-subjective-root');
        if (root) root.remove();
    }

    // ============================================
    // 初始化布局
    // ============================================
    function initLayout() {
        var wrapper = document.getElementById('rg-subjective-canvas-wrapper');
        if (!wrapper) {
            console.warn('[RG-Subjective] canvas wrapper not found');
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
        var canvas = document.getElementById('rg-subjective-canvas');
        if (canvas) {
            canvas.style.transform = 'translate(' + state.offsetX + 'px, ' + state.offsetY + 'px) scale(' + state.scale + ')';
        }
    }

    // ============================================
    // 绑定事件
    // ============================================
    function bindEvents() {
        var wrapper = document.getElementById('rg-subjective-canvas-wrapper');
        if (!wrapper) return;

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

        wrapper.addEventListener('mousemove', onMove);
        wrapper.addEventListener('mouseup', onUp);

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
        window.sysStore.set('rg_subjective_viewport_v1', {
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
            console.warn('[RG-Subjective] service not found');
            return;
        }

        var data = svc.getSubjectiveGraph(state.observerId);
        var nodes = data.nodes || [];
        var edges = data.edges || [];

        var nodeContainer = document.getElementById('rg-subjective-nodes');
        var svg = document.getElementById('rg-subjective-svg');
        if (!nodeContainer || !svg) {
            console.warn('[RG-Subjective] DOM elements not found');
            return;
        }

        nodeContainer.innerHTML = '';
        svg.innerHTML = '';

        // 识别"认识"的人（与观察者有直接连线）
        var knownSet = new Set([state.observerId]);
        edges.forEach(function (e) {
            if (e.nodeA === state.observerId) knownSet.add(e.nodeB);
            if (e.nodeB === state.observerId) knownSet.add(e.nodeA);
        });

        // 添加箭头定义
        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = '<marker id="arrow-subjective" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#666"/></marker>' +
            '<marker id="arrow-rumor" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#9c27b0"/></marker>';
        svg.appendChild(defs);

        // 渲染连线
        edges.forEach(function (edge) {
            var n1 = nodes.find(function (n) { return n.id === edge.nodeA; });
            var n2 = nodes.find(function (n) { return n.id === edge.nodeB; });
            if (!n1 || !n2) return;

            var pos1 = getNodePos(n1.id), pos2 = getNodePos(n2.id);
            var dx = pos2.x - pos1.x, dy = pos2.y - pos1.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return;

            // v57: 计算偏移量，支持双向显示
            var perpX = -dy / len * 8;
            var perpY = dx / len * 8;

            var isRumor = edge.isRumor;
            var hasAtoB = !!edge.aViewOfB;
            var hasBtoA = !!edge.bViewOfA;
            var bothHave = hasAtoB && hasBtoA;

            // 透明度逻辑：如果任一端点不认识，则连线半透明
            var isSemiTransparent = !knownSet.has(edge.nodeA) || !knownSet.has(edge.nodeB);
            var opacityStyle = isSemiTransparent ? '0.5' : '1';

            // A → B
            if (hasAtoB) {
                var offsetX = bothHave ? perpX : 0;
                var offsetY = bothHave ? perpY : 0;
                var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', pos1.x + offsetX);
                line1.setAttribute('y1', pos1.y + offsetY);
                line1.setAttribute('x2', pos2.x + offsetX);
                line1.setAttribute('y2', pos2.y + offsetY);
                line1.setAttribute('class', 'rg-edge-line' + (isRumor ? ' is-rumor' : ''));
                line1.setAttribute('marker-end', isRumor ? 'url(#arrow-rumor)' : 'url(#arrow-subjective)');
                line1.style.opacity = opacityStyle;
                line1.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line1);

                var midX1 = (pos1.x + pos2.x) / 2 + offsetX;
                var midY1 = (pos1.y + pos2.y) / 2 + offsetY - 6;
                var text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text1.setAttribute('x', midX1);
                text1.setAttribute('y', midY1);
                text1.setAttribute('class', 'rg-edge-label' + (isRumor ? ' is-rumor' : ''));
                text1.textContent = edge.aViewOfB;
                text1.style.opacity = opacityStyle;
                svg.appendChild(text1);
            }

            // B → A
            if (hasBtoA) {
                var offsetX2 = bothHave ? -perpX : 0;
                var offsetY2 = bothHave ? -perpY : 0;
                var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', pos2.x + offsetX2);
                line2.setAttribute('y1', pos2.y + offsetY2);
                line2.setAttribute('x2', pos1.x + offsetX2);
                line2.setAttribute('y2', pos1.y + offsetY2);
                line2.setAttribute('class', 'rg-edge-line' + (isRumor ? ' is-rumor' : ''));
                line2.setAttribute('marker-end', isRumor ? 'url(#arrow-rumor)' : 'url(#arrow-subjective)');
                line2.style.opacity = opacityStyle;
                line2.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line2);

                var midX2 = (pos1.x + pos2.x) / 2 + offsetX2;
                var midY2 = (pos1.y + pos2.y) / 2 + offsetY2 + 14;
                var text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text2.setAttribute('x', midX2);
                text2.setAttribute('y', midY2);
                text2.setAttribute('class', 'rg-edge-label' + (isRumor ? ' is-rumor' : ''));
                text2.textContent = edge.bViewOfA;
                text2.style.opacity = opacityStyle;
                svg.appendChild(text2);
            }

            // 没有任何方向的内容，画空线（为了能点击）
            if (!hasAtoB && !hasBtoA) {
                var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', pos1.x);
                line.setAttribute('y1', pos1.y);
                line.setAttribute('x2', pos2.x);
                line.setAttribute('y2', pos2.y);
                line.setAttribute('class', 'rg-edge rg-edge-empty');
                line.style.opacity = opacityStyle;
                line.onclick = function () { onClickEdge(edge.nodeA, edge.nodeB); };
                svg.appendChild(line);
            }
        });

        // 渲染节点
        nodes.forEach(function (node) {
            var pos = getNodePos(node.id);
            var el = document.createElement('div');
            var isSelected = state.selectedNodes.indexOf(node.id) > -1;
            var isObserver = node.id === state.observerId;
            var isKnown = knownSet.has(node.id); // 检查是否认识

            el.className = 'rg-node' + (isSelected ? ' selected' : '') + (isObserver ? ' is-observer' : '');
            el.style.left = pos.x + 'px';
            el.style.top = pos.y + 'px';

            // 如果不认识，透明度减半
            if (!isKnown) {
                el.style.opacity = '0.5';
            }

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

        var x = Math.random() * 600 + 100;
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
                showRumorModal(nodeA, nodeB);
            }
        }
    }

    // ============================================
    // 点击连线
    // ============================================
    function onClickEdge(nodeA, nodeB) {
        showRumorModal(nodeA, nodeB);
    }

    // ============================================
    // 显示流言编辑弹窗
    // ============================================
    // ============================================
    // 显示流言编辑弹窗 (双向)
    // ============================================
    function showRumorModal(nodeAId, nodeBId) {
        var svc = getService();
        var nodes = svc.getAllNodes();
        var nodeA = nodes.find(function (n) { return n.id === nodeAId; });
        var nodeB = nodes.find(function (n) { return n.id === nodeBId; });
        var observer = nodes.find(function (n) { return n.id === state.observerId; });
        if (!nodeA || !nodeB || !observer) return;

        // 获取当前流言
        var rumors = window.sysStore.get('rg_rumors_v1') || {};
        var pairId = [nodeAId, nodeBId].sort().join('_');
        var rumorKey = state.observerId + '|' + pairId;
        var existingRumor = rumors[rumorKey] || {};

        // 确定顺序，确保 A 和 B 的位置在界面上是固定的，但标签要对应
        // 这里我们直接用传入的 nodeA 和 nodeB
        // 如果存储时已经排过序，需要确认现有的 content 对应谁
        // 简单起见，我们总是以 nodeAId 和 nodeBId 的显示顺序来保存
        // 但存储 key 是排序后的。我们需要在保存时记录方向，或者 UI 上自适应

        // 为了简化，界面上显示传入的 A 和 B
        // 读取时，检查 pairId 的顺序。如果 pairId 中的 A 与传入的 nodeA 不同，说明顺序反了，需要交换内容显示
        var sortedIds = [nodeAId, nodeBId].sort();
        var isReversed = sortedIds[0] !== nodeAId; // 如果当前 A 不是排序后的第一个，说明被反转了

        var contentRaw = existingRumor.content || '';
        var valAtoB = (isReversed ? (existingRumor.contentBtoA || '') : (existingRumor.contentAtoB || '')) || contentRaw;
        var valBtoA = (isReversed ? (existingRumor.contentAtoB || '') : (existingRumor.contentBtoA || '')) || contentRaw;
        var reason = existingRumor.reason || '';

        var html = '<div class="rg-modal-overlay" onclick="if(event.target===this) window.WeChat.UI.RelationshipGraphSubjective.closeModal()">' +
            '<div class="rg-modal-card premium">' +
            '<div class="rg-modal-header">' +
            '<div class="rg-modal-title">认知修正</div>' +
            '<div class="rg-rumor-tag">当前处于 ' + esc(observer.name) + ' 的主观视角</div>' +
            '</div>' +

            '<div class="rg-modal-scrollable">' +

            '<div class="rg-edit-pair-minimal">' +
            '<div class="rg-edit-node-flat"><img src="' + esc(nodeA.avatar) + '"><span>' + esc(nodeA.name) + '</span></div>' +
            '<div class="rg-edit-sep">/</div>' +
            '<div class="rg-edit-node-flat"><img src="' + esc(nodeB.avatar) + '"><span>' + esc(nodeB.name) + '</span></div>' +
            '</div>' +

            '<div class="rg-input-field">' +
            '<label>在他看来, ' + esc(nodeA.name) + ' 对 ' + esc(nodeB.name) + ' 是</label>' +
            '<input type="text" id="rg-rumor-atob" value="' + esc(valAtoB) + '" placeholder="尚未定义..."> ' +
            '</div>' +

            '<div class="rg-input-field">' +
            '<label>在他看来, ' + esc(nodeB.name) + ' 对 ' + esc(nodeA.name) + ' 是</label>' +
            '<input type="text" id="rg-rumor-btoa" value="' + esc(valBtoA) + '" placeholder="尚未定义..."> ' +
            '</div>' +

            '<div class="rg-input-field">' +
            '<label>产生此种认知的逻辑/理由</label>' +
            '<textarea id="rg-rumor-reason" placeholder="输入其产生偏见的动机或证据..." style="height: 100px;">' + esc(reason) + '</textarea></div>' +

            '</div>' + // End scrollable

            '<div class="rg-modal-actions-flat">' +
            '<button class="rg-btn-text" onclick="window.WeChat.UI.RelationshipGraphSubjective.closeModal()">取消</button>' +
            '<button class="rg-btn-ghost" onclick="window.WeChat.UI.RelationshipGraphSubjective.deleteRumor(\'' + nodeAId + '\', \'' + nodeBId + '\')">清除偏见</button>' +
            '<button class="rg-btn-solid" onclick="window.WeChat.UI.RelationshipGraphSubjective.saveRumor(\'' + nodeAId + '\', \'' + nodeBId + '\')">确定并修改</button>' +
            '</div>' +
            '</div></div>';

        var container = document.createElement('div');
        container.id = 'rg-rumor-modal-container';
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
        var container = document.getElementById('rg-rumor-modal-container');
        if (container) container.remove();
    }

    // ============================================
    // 保存流言
    // ============================================
    function saveRumor(nodeAId, nodeBId) {
        var valAtoB = document.getElementById('rg-rumor-atob').value.trim();
        var valBtoA = document.getElementById('rg-rumor-btoa').value.trim();
        var reason = document.getElementById('rg-rumor-reason').value.trim();

        if (!valAtoB && !valBtoA && !reason) {
            deleteRumor(nodeAId, nodeBId);
            return;
        }

        var rumors = window.sysStore.get('rg_rumors_v1') || {};
        var sortedIds = [nodeAId, nodeBId].sort();
        var pairId = sortedIds.join('_');
        var rumorKey = state.observerId + '|' + pairId;
        var isReversed = sortedIds[0] !== nodeAId;

        // 保存时，要根据 ID 排序归一化
        var contentAtoB = isReversed ? valBtoA : valAtoB; // 存入 sorted A->B
        var contentBtoA = isReversed ? valAtoB : valBtoA; // 存入 sorted B->A

        rumors[rumorKey] = {
            observerId: state.observerId,
            nodeA: sortedIds[0],
            nodeB: sortedIds[1],
            contentAtoB: contentAtoB,
            contentBtoA: contentBtoA,
            reason: reason,
            updatedAt: Date.now()
        };

        window.sysStore.set('rg_rumors_v1', rumors);
        closeModal();
        renderGraph();
    }

    // ============================================
    // 删除流言
    // ============================================
    function deleteRumor(nodeAId, nodeBId) {
        var rumors = window.sysStore.get('rg_rumors_v1') || {};
        var pairId = [nodeAId, nodeBId].sort().join('_');
        var rumorKey = state.observerId + '|' + pairId;

        delete rumors[rumorKey];
        window.sysStore.set('rg_rumors_v1', rumors);
        closeModal();
        renderGraph();
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
    window.WeChat.UI.RelationshipGraphSubjective = {
        open: open,
        close: close,
        resetView: resetView,
        closeModal: closeModal,
        saveRumor: saveRumor,
        deleteRumor: deleteRumor
    };

})();
