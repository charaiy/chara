/**
 * js/apps/worldbook/index.js
 * World Book (Lorebook) Application - Premium iOS 17 Edition
 */

window.WorldBookApp = {
    container: null,
    currentView: 'list', // 'list' or 'edit'
    editingId: null,

    // States
    isEditMode: false,
    selectedEntryIds: new Set(),
    expandedGroupIds: new Set(),

    init(container) {
        this.container = container;
        this.container.classList.add('wb-app');
        this.container.innerHTML = `
            <div id="wb-root" style="height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden;"></div>
        `;
        this.render();
    },

    /**
     * Data Providers
     */
    getEntries() {
        return window.sysStore.get('chara_db_worldbook', []);
    },

    saveEntries(entries) {
        window.sysStore.set('chara_db_worldbook', entries);
    },

    getGroups() {
        return window.sysStore.get('chara_db_worldbook_groups', []);
    },

    saveGroups(groups) {
        window.sysStore.set('chara_db_worldbook_groups', groups);
    },

    /**
     * Core Render
     */
    render() {
        const root = this.container.querySelector('#wb-root');
        if (!root) return;

        if (this.currentView === 'list') {
            root.innerHTML = this.renderListView() + this.renderModal();
        } else if (this.currentView === 'edit') {
            root.innerHTML = this.renderEditView(this.editingId);
        }
    },

    renderModal() {
        if (!this.modalState.visible) return '';
        const isConfirm = this.modalState.type === 'confirm';
        const title = isConfirm ? '确认操作' : (this.modalState.type === 'add' ? '新建分组' : '重命名分组');

        let contentHtml = '';
        if (isConfirm) {
            contentHtml = `<div style="font-size:15px; color:var(--wb-text); line-height:1.5; padding:10px 0;">${this.escapeHtml(this.modalState.message)}</div>`;
        } else {
            contentHtml = `<input id="wb-modal-input" class="wb-modal-input" value="${this.escapeHtml(this.modalState.inputValue)}" placeholder="请输入名称..." onkeydown="if(event.key==='Enter') window.WorldBookApp.confirmModal()">`;
        }

        return `
            <div class="wb-modal-overlay">
                <div class="wb-modal">
                    <div class="wb-modal-header">${title}</div>
                    <div class="wb-modal-body">
                        ${contentHtml}
                    </div>
                    <div class="wb-modal-footer">
                        <div class="wb-modal-btn cancel" onclick="window.WorldBookApp.closeModal()">取消</div>
                        <div class="wb-modal-btn confirm" onclick="window.WorldBookApp.confirmModal()">确定</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderListView() {
        const entries = this.getEntries();
        const chars = window.sysStore.get('chara_db_characters', {});
        const customGroups = this.getGroups();

        if (entries.length === 0 && !this.isEditMode) {
            return this.renderEmptyState();
        }

        const groups = {};

        // 1. Initialize custom groups
        customGroups.forEach(g => {
            groups[g.id] = { id: g.id, name: g.name, entries: [], isCustom: true };
        });

        // 2. Default Global Group
        if (!groups['global']) groups['global'] = { id: 'global', name: '全局/通用', entries: [], isCustom: false };

        // 3. Process Entries
        entries.forEach(e => {
            let gid = e.groupId || 'global';
            if (!groups[gid]) {
                let name = chars[gid]?.name || '其他角色';
                groups[gid] = { id: gid, name: name, entries: [], isCustom: false };
            }
            groups[gid].entries.push(e);
        });

        const activeGids = Object.keys(groups).filter(gid => this.isEditMode || groups[gid].entries.length > 0);

        const sortedGids = activeGids.sort((a, b) => {
            if (a === 'global') return -1;
            if (b === 'global') return 1;
            const ga = groups[a];
            const gb = groups[b];
            if (ga.isCustom && !gb.isCustom) return -1;
            if (!ga.isCustom && gb.isCustom) return 1;
            return ga.name.localeCompare(gb.name);
        });

        const sectionsHtml = sortedGids.map(gid => {
            const group = groups[gid];
            const isExpanded = this.expandedGroupIds.has(gid);

            const entriesHtml = group.entries.map(e => {
                const isSelected = this.selectedEntryIds.has(e.id);
                return `
                    <div class="wb-entry-item ${this.isEditMode ? 'selectable' : ''}" onclick="window.WorldBookApp.handleEntryClick('${e.id}', event)">
                        ${this.isEditMode ? `
                            <div class="wb-checkbox-container">
                                <div class="wb-checkbox ${isSelected ? 'selected' : ''}">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                </div>
                            </div>
                        ` : ''}
                        <div style="flex:1;">
                            <div class="wb-entry-title">${this.escapeHtml(e.name)} ${e.enabled === false ? '<span style="color:#ff3b30; font-size:12px;">(已禁用)</span>' : ''}</div>
                            <div class="wb-entry-preview">${this.escapeHtml(e.content) || '无内容'}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="wb-section">
                    <div class="wb-section-header" onclick="window.WorldBookApp.toggleExpanded('${gid}')">
                        <div style="display:flex; align-items:center; flex:1;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="wb-section-arrow" style="margin-right:8px; transform: rotate(${isExpanded ? '90deg' : '0deg'}); transition: transform 0.2s;"><path d="M8 5v14l11-7z"/></svg>
                            <span style="font-size:15px; font-weight:600;">${this.escapeHtml(group.name)}</span>
                            ${this.isEditMode && group.isCustom ? `
                                <div class="wb-section-icon-btn" style="color:var(--wb-accent);" onclick="window.WorldBookApp.renameCategory('${gid}', event)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </div>
                            ` : ''}
                        </div>
                        <div style="display:flex; align-items:center;">
                            <span class="count">${group.entries.length} 条</span>
                            ${this.isEditMode && group.isCustom ? `
                                <div class="wb-section-icon-btn" style="color:#ff3b30;" onclick="window.WorldBookApp.deleteCategory('${gid}', event)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="wb-section-body" style="display: ${isExpanded ? 'block' : 'none'}">
                        ${entriesHtml || '<div style="padding:16px; text-align:center; color:#999; font-size:13px;">空</div>'}
                    </div>
                </div>
            `;
        }).join('');

        return `
            ${this.renderHeader()}
            <div class="wb-content">
                ${sectionsHtml}
                ${this.isEditMode ? `<div class="wb-btn-primary" style="margin-top:20px; border-radius:12px;" onclick="window.WorldBookApp.addCategory()">+ 添加新分组</div>` : ''}
            </div>
            ${this.isEditMode ? this.renderEditFooter() : ''}
        `;
    },

    renderHeader() {
        return `
            <div class="wb-header">
                <div class="wb-header-btn" onclick="${this.isEditMode ? 'window.WorldBookApp.exitEditMode()' : 'window.os.closeActiveApp()'}">
                    ${this.isEditMode ? '取消' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'}
                </div>
                <div class="wb-title">世界书</div>
                <div class="wb-header-btn">
                     <span style="font-weight: 500;" onclick="window.WorldBookApp.toggleEditMode()">${this.isEditMode ? '完成' : '编辑'}</span>
                     ${!this.isEditMode ? `<span style="font-size:28px; font-weight:300; margin-left:12px;" onclick="window.WorldBookApp.createNew()">+</span>` : ''}
                </div>
            </div>
        `;
    },

    renderEmptyState() {
        return `
            ${this.renderHeader()}
            <div class="wb-content" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80%;">
                <div style="font-size:64px; margin-bottom:16px; opacity:0.5;">📖</div>
                <div style="font-size:17px; font-weight:600; color:var(--wb-text); margin-bottom:8px;">世界书还是一片空白</div>
                <div style="font-size:14px; color:var(--wb-text-sec); margin-bottom:30px; text-align:center; padding:0 40px; line-height:1.5;">记录下每一个设定，AI 将在聊天中自动同步这些知识。</div>
                <div class="wb-btn-primary" style="border-radius:12px; margin-bottom:12px; width:220px; border:0.5px solid var(--wb-border);" onclick="window.WorldBookApp.createNew()">开始添加首个条目</div>
                <div class="wb-btn-text" style="border-radius:12px; width:220px; border:0.5px solid var(--wb-border);" onclick="window.WorldBookApp.toggleEditMode()">管理分组</div>
            </div>
        `;
    },

    renderEditFooter() {
        const count = this.selectedEntryIds.size;
        return `
            <div class="wb-footer">
                <div class="wb-footer-btn" onclick="window.WorldBookApp.moveSelected()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8l3-3"/><path d="M12 10l-3-3"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>
                    <span>移动</span>
                </div>
                <div class="wb-footer-btn danger" onclick="window.WorldBookApp.deleteSelected()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <span>删除${count > 0 ? `(${count})` : ''}</span>
                </div>
            </div>
        `;
    },

    renderEditView(id) {
        const entries = this.getEntries();
        const entry = entries.find(e => e.id === id) || {
            id: null, name: '', triggers: [], content: '', enabled: true, groupId: 'global'
        };
        const isNew = !entry.id;

        const customGroups = this.getGroups();
        const chars = window.sysStore.get('chara_db_characters', {});

        let groupsHtml = `<option value="global" ${entry.groupId === 'global' ? 'selected' : ''}>全局/通用</option>`;
        customGroups.forEach(g => {
            groupsHtml += `<option value="${g.id}" ${entry.groupId === g.id ? 'selected' : ''}>${g.name}</option>`;
        });
        Object.keys(chars).forEach(cid => {
            groupsHtml += `<option value="${cid}" ${entry.groupId === cid ? 'selected' : ''}>[角色] ${chars[cid].name}</option>`;
        });

        return `
            <div class="wb-edit-view">
                <div class="wb-header">
                    <div class="wb-header-btn" onclick="window.WorldBookApp.cancelEdit()">取消</div>
                    <div class="wb-title">${isNew ? '新建条目' : '编辑条目'}</div>
                    <div class="wb-header-btn" style="font-weight:600;" onclick="window.WorldBookApp.saveCurrent()">保存</div>
                </div>
                <div class="wb-content">
                    <div class="wb-label">分类</div>
                    <div class="wb-form-group">
                        <div class="wb-input-container">
                            <select id="wb-edit-group" class="wb-input" style="appearance: none; -webkit-appearance: none;">
                                ${groupsHtml}
                            </select>
                        </div>
                    </div>

                    <div class="wb-label">条目信息</div>
                    <div class="wb-form-group" style="margin-bottom:0;">
                        <div class="wb-input-container" style="border-bottom:none; border-radius:12px 12px 0 0;">
                            <input type="text" id="wb-edit-name" class="wb-input" value="${this.escapeHtml(entry.name)}" placeholder="条目名称">
                        </div>
                        <div class="wb-input-container" style="border-radius:0 0 12px 12px;">
                            <input type="text" id="wb-edit-triggers" class="wb-input" value="${this.escapeHtml(entry.triggers?.join(', ') || '')}" placeholder="触发词 (逗号隔开)">
                        </div>
                    </div>

                    <div class="wb-label" style="margin-top:24px;">正文内容</div>
                    <div class="wb-form-group">
                        <div class="wb-input-container" style="border-radius:12px;">
                            <textarea id="wb-edit-content" class="wb-textarea" placeholder="在此输入世界书内容...">${this.escapeHtml(entry.content)}</textarea>
                        </div>
                    </div>

                    <div class="wb-toggle-row" style="border-radius:12px;">
                        <span>启用此条目</span>
                        <label class="switch">
                            <input type="checkbox" id="wb-edit-enabled" ${entry.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>

                    ${!isNew ? `<div class="wb-btn-danger" style="border-radius:12px; margin:0;" onclick="window.WorldBookApp.deleteCurrent('${id}')">删除此条目</div>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Actions
     */
    toggleExpanded(gid) {
        if (this.expandedGroupIds.has(gid)) {
            this.expandedGroupIds.delete(gid);
        } else {
            this.expandedGroupIds.add(gid);
        }
        this.render();
    },

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        if (!this.isEditMode) this.selectedEntryIds.clear();
        this.render();
    },

    exitEditMode() {
        this.isEditMode = false;
        this.selectedEntryIds.clear();
        this.render();
    },

    handleEntryClick(id, event) {
        if (this.isEditMode) {
            if (this.selectedEntryIds.has(id)) this.selectedEntryIds.delete(id);
            else this.selectedEntryIds.add(id);
            this.render();
        } else {
            this.openEdit(id);
        }
    },

    // --- Modal Logic Enhanced ---
    modalState: {
        visible: false,
        type: 'add', // 'add', 'rename', 'confirm'
        targetId: null,
        inputValue: '',
        message: '',
        onConfirm: null
    },

    openModal(type, targetId = null, initialValue = '') {
        this.modalState = { visible: true, type, targetId, inputValue: initialValue, message: '', onConfirm: null };
        this.render();
        if (type !== 'confirm') {
            setTimeout(() => {
                const input = document.getElementById('wb-modal-input');
                if (input) input.focus();
            }, 50);
        }
    },

    openConfirmModal(message, onConfirm) {
        this.modalState = {
            visible: true,
            type: 'confirm',
            targetId: null,
            inputValue: '',
            message: message,
            onConfirm: onConfirm
        };
        this.render();
    },

    closeModal() {
        this.modalState.visible = false;
        this.render();
    },

    confirmModal() {
        if (this.modalState.type === 'confirm') {
            if (this.modalState.onConfirm) this.modalState.onConfirm();
            this.closeModal();
            return;
        }

        const value = document.getElementById('wb-modal-input').value.trim();
        if (!value) {
            alert('请输入名称'); // Safe fallback or show error on modal
            return;
        }

        if (this.modalState.type === 'add') {
            const groups = this.getGroups();
            const id = 'cat_' + Date.now();
            groups.push({ id, name: value });
            this.saveGroups(groups);
            this.expandedGroupIds.add(id);
        } else if (this.modalState.type === 'rename') {
            const groups = this.getGroups();
            const g = groups.find(x => x.id === this.modalState.targetId);
            if (g) {
                g.name = value;
                this.saveGroups(groups);
            }
        }
        this.closeModal();
    },

    addCategory() {
        this.openModal('add');
    },

    renameCategory(id, event) {
        if (event) event.stopPropagation();
        const groups = this.getGroups();
        const g = groups.find(x => x.id === id);
        if (g) this.openModal('rename', id, g.name);
    },

    deleteCategory(id, event) {
        if (event) event.stopPropagation();
        this.openConfirmModal('确定删除此分组吗？其中的条目将移至全局。', () => {
            const entries = this.getEntries();
            entries.forEach(e => { if (e.groupId === id) e.groupId = 'global'; });
            this.saveEntries(entries);
            let groups = this.getGroups();
            groups = groups.filter(x => x.id !== id);
            this.saveGroups(groups);
            this.expandedGroupIds.delete(id);
            this.render(); // Re-render after deletion
        });
    },

    deleteSelected() {
        if (this.selectedEntryIds.size === 0) return;
        this.openConfirmModal(`确定删除选中的 ${this.selectedEntryIds.size} 个条目吗？`, () => {
            let entries = this.getEntries();
            entries = entries.filter(e => !this.selectedEntryIds.has(e.id));
            this.saveEntries(entries);
            this.selectedEntryIds.clear();
            this.render(); // Re-render after deletion
        });
    },

    moveSelected() {
        if (this.selectedEntryIds.size === 0) return;
        const customGroups = this.getGroups();
        const chars = window.sysStore.get('chara_db_characters', {});
        let options = customGroups.map(g => `${g.id}: ${g.name}`);
        options.unshift('global: 全局/通用');
        Object.keys(chars).forEach(cid => options.push(`${cid}: [角色] ${chars[cid].name}`));
        const choice = prompt('请输入目标分组 ID:\n' + options.join('\n'));
        if (choice) {
            const targetId = choice.split(':')[0].trim();
            let entries = this.getEntries();
            entries.forEach(e => { if (this.selectedEntryIds.has(e.id)) e.groupId = targetId; });
            this.saveEntries(entries);
            this.selectedEntryIds.clear();
            this.expandedGroupIds.add(targetId);
            this.render();
        }
    },

    createNew() { this.editingId = null; this.currentView = 'edit'; this.render(); },
    openEdit(id) { this.editingId = id; this.currentView = 'edit'; this.render(); },
    cancelEdit() { this.currentView = 'list'; this.render(); },
    saveCurrent() {
        const name = document.getElementById('wb-edit-name').value;
        const triggersStr = document.getElementById('wb-edit-triggers').value;
        const content = document.getElementById('wb-edit-content').value;
        const enabled = document.getElementById('wb-edit-enabled').checked;
        const groupId = document.getElementById('wb-edit-group').value;
        if (!name) { alert('请输入条目名称'); return; }
        const triggers = triggersStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
        const entries = this.getEntries();
        if (this.editingId) {
            const idx = entries.findIndex(e => e.id === this.editingId);
            if (idx !== -1) entries[idx] = { ...entries[idx], name, triggers, content, enabled, groupId, updatedAt: Date.now() };
        } else {
            entries.push({ id: window.utils ? window.utils.generateUUID() : 'wb_' + Date.now(), name, triggers, content, enabled, groupId, createdAt: Date.now(), updatedAt: Date.now() });
        }
        this.saveEntries(entries);
        this.expandedGroupIds.add(groupId);
        this.currentView = 'list';
        this.render();
    },
    deleteCurrent(id) {
        if (confirm('确定要删除此条目吗？')) {
            let entries = this.getEntries();
            entries = entries.filter(e => e.id !== id);
            this.saveEntries(entries);
            this.currentView = 'list';
            this.render();
        }
    },
    escapeHtml(str) {
        if (!str) return '';
        if (typeof str !== 'string') return String(str);
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
};
