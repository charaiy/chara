/**
 * js/apps/wechat/ui/modals_controller.js
 * 模态框协调器 - 根据State决定渲染哪些模态框
 * [Refactor] Renamed from modals.js for clarity
 * 
 * 职责：
 * - 根据应用状态（State）决定渲染哪些模态框
 * - 协调不同模态框的显示优先级
 * - 调用 views_modals.js 中的具体渲染函数
 */

window.WeChat = window.WeChat || {};
window.WeChat.UI = window.WeChat.UI || {};

window.WeChat.UI.Modals = {
    /**
     * 渲染所有弹窗模态框
     * @param {Object} State - 应用状态对象
     * @returns {string} HTML 字符串
     */
    render(State) {
        // High Priority Full Screen Modals
        let modalHtml = '';

        if (State.voiceCallState && State.voiceCallState.open) {
            if (State.voiceCallState.minimized) {
                modalHtml += window.WeChat.Views.renderFloatingCallBubble(State.voiceCallState);
            } else {
                modalHtml += window.WeChat.Views.renderVoiceCallModal(State.voiceCallState);
            }
        }

        if (State.videoCallState && State.videoCallState.open) {
            console.log('[Modals] Rendering video call modal', State.videoCallState);
            if (State.videoCallState.minimized) {
                modalHtml += window.WeChat.Views.renderFloatingCallBubble(State.videoCallState);
            } else {
                if (window.WeChat.Views && window.WeChat.Views.renderVideoCallModal) {
                    modalHtml += window.WeChat.Views.renderVideoCallModal(State.videoCallState);
                } else {
                    console.error('[Modals] renderVideoCallModal not found');
                }
            }
        }

        if (State.callSummaryModal && State.callSummaryModal.open) {
            modalHtml += window.WeChat.Views.renderCallSummaryModal(State.callSummaryModal);
        }

        if (!State.memoryModalOpen && !State.summaryModalOpen && !State.rangeModalOpen && !State.refineModalOpen && !State.bubbleMenuOpen && !State.characterPanelOpen && !State.relationshipPanelOpen && !State.statusHistoryPanelOpen && !State.cameraModalOpen && !State.locationModalOpen && !State.transferModalOpen && !State.videoCallModalOpen && !(State.confirmationModal && State.confirmationModal.open) && !(State.promptModal && State.promptModal.open)) {
            return modalHtml;
        }

        const char = window.sysStore.getCharacter(State.activeSessionId);

        // --- Transfer Modal (Full Screen Simulation) ---
        // [Fix] Only show send transfer modal if activeTransferMsgId is not set
        if (State.transferModalOpen && !State.activeTransferMsgId) {
            const avatar = char?.avatar || 'assets/images/avatar_placeholder.png';
            const name = char?.name || 'User';
            const realName = char?.real_name || '';
            const maskedName = realName ? `(* ${realName.slice(-1)})` : (name.length > 1 ? `(** ${name.slice(-1)})` : '');

            return `
                <div class="wx-modal-overlay active" style="background: #EDEDED; display: block;">
                    <!-- Nav Bar -->
                    <div style="height: 44px; padding-top: 48px; display: flex; align-items: center; padding-left: 16px; position: relative;">
                        <div onclick="window.WeChat.App.closeTransferModal()" style="width: 24px; cursor: pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </div>
                        <div style="flex: 1;"></div>
                    </div>

                    <!-- Content -->
                    <div style="padding: 20px 24px;">
                        <!-- User Info -->
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 30px;">
                            <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 6px; margin-bottom: 12px; background: #ddd;">
                            <div style="font-size: 16px; color: #000;">转账给 <span style="font-weight: 500;">${name}</span> ${maskedName}</div>
                        </div>

                        <!-- Card -->
                        <div style="background: white; border-radius: 12px; padding: 24px 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <div style="font-size: 14px; color: #000; margin-bottom: 16px;">转账金额</div>

                            <div style="display: flex; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 24px;">
                                <span style="font-size: 30px; font-weight: 600; margin-right: 8px;">¥</span>
                                <input id="wx-transfer-amount" type="number" step="0.01"
                                    style="border: none; font-size: 40px; font-weight: 600; width: 100%; outline: none; caret-color: #07C160;"
                                    placeholder="" oninput="document.getElementById('wx-transfer-btn').style.opacity = (this.value > 0 ? 1 : 0.5)">
                            </div>

                            <div style="margin-bottom: 30px;">
                                <input id="wx-transfer-note"
                                    style="border: none; font-size: 14px; width: 100%; outline: none; color: #333;"
                                    placeholder="添加备注 (50字以内)">
                            </div>

                            <div id="wx-transfer-btn" onclick="window.WeChat.App.sendTransfer()"
                                style="background: #07C160; color: white; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; cursor: pointer; opacity: 0.5; transition: opacity 0.2s;">
                                转账
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Location Modal ---
        if (State.locationModalOpen) {
            return `
                <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeLocationModal()">
                    <div class="wx-modal" onclick="event.stopPropagation()">
                        <div class="wx-modal-header">
                            <div class="wx-modal-title">发送位置</div>
                        </div>
                        <div class="wx-modal-body">
                            <div style="margin-bottom: 12px;">
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">位置名称</div>
                                <input id="wx-location-name" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：上海中心大厦" />
                            </div>
                            <div>
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">距离对方 (km)</div>
                                <input id="wx-location-dist" type="number" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：1.5" />
                            </div>
                            <div style="margin-top: 12px;">
                                <div style="font-size: 13px; color: var(--wx-text-sec); margin-bottom: 6px;">备注 (可选)</div>
                                <input id="wx-location-remark" class="wx-modal-textarea" style="height: 40px; min-height: 40px;" placeholder="例如：人均¥200、历史传说、甚至是"xx的家"" />
                            </div>
                        </div>
                        <div class="wx-modal-footer">
                            <div class="wx-modal-btn cancel" onclick="window.WeChat.App.closeLocationModal()">取消</div>
                            <div class="wx-modal-btn confirm" onclick="window.WeChat.App.sendLocation()">发送</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Camera Modal ---
        if (State.cameraModalOpen) {
            const errorMode = State.cameraError ? true : false;

            return `
                <div class="wx-modal-overlay active" style="background: black; display: flex; align-items: center; justify-content: center;">

                    ${errorMode ? `
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888;">
                            <div style="margin-bottom: 20px; font-size: 48px; opacity: 0.3;">📷</div>
                            <div style="font-size: 16px; margin-bottom: 8px;">无法启动摄像头</div>
                            <div style="font-size: 12px; opacity: 0.6; margin-bottom: 30px; text-align: center; padding: 0 40px;">
                                ${State.cameraError === 'SecureContextRequired' ? '浏览器安全限制：请使用 HTTPS 或 localhost 访问' : '请检查设备连接或权限设置'}
                            </div>
                            <!-- Fallback Upload Button -->
                            <div onclick="window.WeChat.App.triggerPhotoUpload()" style="padding: 10px 24px; background: rgba(255,255,255,0.15); border-radius: 20px; font-size: 14px; color: white; cursor: pointer; border: 1px solid rgba(255,255,255,0.2);">
                                从相册选择...
                            </div>
                        </div>
                    ` : `
                        <!-- Video Container -->
                        <video id="wx-camera-video" style="width: 100%; height: 100%; object-fit: cover; transform: ${State.cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none'};" autoplay playsinline></video>
                    `}
                    
                    <!-- Close Button Removed as per User Request -->
                    <!-- The close functionality is handled by the 'Cancel' button in the bottom controls -->

                    <!-- Bottom Controls (Hide if error) -->
                    <div style="position: absolute; bottom: 50px; width: 100%; display: flex; justify-content: center; align-items: center; gap: 60px; z-index: 10002; ${errorMode ? 'display: none !important;' : ''}">
                        <!-- Cancel / Back -->
                        <div onclick="window.WeChat.App.closeCameraModal()" style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                        </div>

                        <!-- Shutter Button -->
                        <div onclick="window.WeChat.App.capturePhoto()" style="width: 76px; height: 76px; border-radius: 50%; background: white; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 4px solid rgba(255,255,255,0.3); transition: transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: white;"></div>
                        </div>

                        <!-- Flip Camera -->
                        <div onclick="window.WeChat.App.switchCamera()" style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 .46.04.91.12 1.35"></path>
                                <path d="M4 22c0-4.42 3.58-8 8-8s8 3.58 8 8c0-.46-.04-.91-.12-1.35"></path>
                                <polyline points="16 11.65 20 10 20 14.35"></polyline>
                                <polyline points="8 12.35 4 14 4 9.65"></polyline>
                            </svg>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Memory Modal ---
        if (State.memoryModalOpen) {
            const memories = char?.memories || [];
            const existingText = State.editMemoryIndex >= 0 ? memories[State.editMemoryIndex].content : '';
            const title = `为 "${char?.name || 'User'}" ${State.editMemoryIndex >= 0 ? '编辑' : '添加'} 记忆`;

            modalHtml += `
            <div class="wx-modal-overlay active" style="z-index: 20005;" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-modal" onclick="event.stopPropagation()">
                    <div class="wx-modal-header">
                        <div class="wx-modal-title">${title}</div>
                    </div>
                    <div class="wx-modal-body">
                        <textarea id="wx-memory-input" class="wx-modal-textarea" placeholder="输入这段重要的记忆...">${existingText}</textarea>
                    </div>
                    <div class="wx-modal-footer">
                        <div class="wx-modal-btn cancel" onclick="window.WeChat.App.closeModals()">取消</div>
                        <div class="wx-modal-btn confirm" onclick="window.WeChat.App.saveMemory()">保存</div>
                    </div>
                </div>
            </div>`;
        }



        // Modal 2: Summary Management
        if (State.summaryModalOpen && !State.rangeModalOpen) {
            const promptPlaceholder = "未设置则使用系统默认规则 (精准提取锚点细节，第一人称格式)";

            const isSync = State.summaryConfig.eventSyncWithSummary !== false; // Default true

            return `
            <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-modal" onclick="event.stopPropagation()" style="background: #f2f2f7; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;">
                    
                    <!-- Sticky Header -->
                    <div class="wx-modal-header clean" style="flex-shrink: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 0.5px solid rgba(0,0,0,0.1); padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="wx-modal-title clean" style="font-size: 17px; font-weight: 600;">对话总结与记忆管理</div>
                        <div style="cursor: pointer; padding: 4px; border-radius: 50%; background: #e5e5ea; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;" onclick="window.WeChat.App.closeModals()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>

                    <!-- Scrollable Body -->
                    <div id="wx-summary-scroll-container" class="wx-ios-modal-body" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 16px 40px 16px;">

                        <!-- Section 1: Narrative Auto -->
                        <div style="margin-bottom: 24px;">
                            <div style="font-size: 13px; color: #8a8a8e; margin-bottom: 8px; padding-left: 12px; text-transform: uppercase;">叙事日记</div>
                            <div style="background: #fff; border-radius: 12px; overflow: hidden;">
                                <div class="wx-ios-row" style="padding: 14px 16px;">
                                    <div class="wx-ios-label" style="font-weight: 500;">启用自动总结</div>
                                    <div class="wx-switch ${State.summaryConfig.autoEnabled ? 'checked' : ''}" onclick="window.WeChat.Services.Summaries.toggleSummaryAuto()">
                                        <div class="wx-switch-node"></div>
                                    </div>
                                </div>

                                ${State.summaryConfig.autoEnabled ? `
                                    <div class="wx-ios-row" style="padding: 14px 16px; border-top: 0.5px solid #efefef;">
                                        <div class="wx-ios-label">触发阈值 (条)</div>
                                        <input type="number" class="wx-ios-value" style="text-align: right; color: #007aff; font-weight: 500;"
                                            value="${State.summaryConfig.threshold}" 
                                            oninput="window.WeChat.Services.Summaries.updateSummaryConfig('threshold', this.value)" />
                                    </div>
                                    <div style="padding: 12px 16px; border-top: 0.5px solid #efefef;">
                                        <div style="font-size: 12px; color: #8e8e93; margin-bottom: 8px;">个性化 Prompt (可选)</div>
                                        <textarea class="wx-ios-textarea" 
                                            style="background: #f2f2f7; border-radius: 8px; padding: 10px; font-size: 14px; min-height: 80px;"
                                            placeholder="${promptPlaceholder}"
                                            oninput="window.WeChat.Services.Summaries.updateSummaryConfig('autoPrompt', this.value)">${State.summaryConfig.autoPrompt}</textarea>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Section 2: Database Events -->
                        <div style="margin-bottom: 24px;">
                            <div style="font-size: 13px; color: #8a8a8e; margin-bottom: 8px; padding-left: 12px; text-transform: uppercase;">事实数据库</div>
                            <div style="background: #fff; border-radius: 12px; overflow: hidden;">
                                <div class="wx-ios-row" style="padding: 14px 16px;">
                                    <div class="wx-ios-label" style="font-weight: 500;">启用自动提取</div>
                                    <div class="wx-switch ${State.summaryConfig.eventAutoEnabled ? 'checked' : ''}" onclick="window.WeChat.Services.Summaries.toggleEventAuto()">
                                        <div class="wx-switch-node"></div>
                                    </div>
                                </div>

                                ${State.summaryConfig.eventAutoEnabled ? `
                                    <div class="wx-ios-row" style="padding: 14px 16px; border-top: 0.5px solid #efefef;">
                                        <div class="wx-ios-label">与日记总结同步</div>
                                        <div class="wx-switch ${isSync ? 'checked' : ''}" onclick="window.WeChat.Services.Summaries.toggleEventSync()">
                                            <div class="wx-switch-node"></div>
                                        </div>
                                    </div>

                                    ${!isSync ? `
                                        <div class="wx-ios-row" style="padding: 14px 16px; border-top: 0.5px solid #efefef;">
                                            <div class="wx-ios-label">独立触发阈值 (条)</div>
                                            <input type="number" class="wx-ios-value" style="text-align: right; color: #007aff; font-weight: 500;"
                                                value="${State.summaryConfig.eventThreshold || 50}" 
                                                placeholder="50"
                                                oninput="window.WeChat.Services.Summaries.updateSummaryConfig('eventThreshold', this.value)" />
                                        </div>
                                    ` : `
                                        <div class="wx-ios-row" style="padding: 14px 16px; border-top: 0.5px solid #efefef; background: #fafafa;">
                                            <div class="wx-ios-label" style="color: #8e8e93;">触发频率</div>
                                            <div class="wx-ios-value" style="font-size: 13px; color: #8e8e93;">跟随日记自动执行</div>
                                        </div>
                                    `}

                                    <div style="padding: 12px 16px; border-top: 0.5px solid #efefef;">
                                        <div style="font-size: 12px; color: #8e8e93; margin-bottom: 8px;">提取规则 (Prompt)</div>
                                        <textarea class="wx-ios-textarea"
                                            style="background: #f2f2f7; border-radius: 8px; padding: 10px; font-size: 14px; min-height: 80px;"
                                            placeholder="例如：提取时间、地点、参与者、动作... (留空则使用系统默认)"
                                            oninput="window.WeChat.Services.Summaries.updateSummaryConfig('databasePrompt', this.value)">${State.summaryConfig.databasePrompt || ''}</textarea>
                                    </div>
                                ` : ''}

                                <div class="wx-ios-row" style="padding: 0; border-top: 0.5px solid #efefef;">
                                    <div class="wx-ios-action-link" style="width: 100%; padding: 16px; display: flex; align-items: center; justify-content: center; color: #007aff; font-weight: 500; cursor: pointer;" onclick="window.WeChat.Services.Summaries.openSummaryRange('database')">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                                        手动选择范围并提取事件
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Manual Task -->
                        <div style="margin-bottom: 12px;">
                             <div style="font-size: 13px; color: #8a8a8e; margin-bottom: 8px; padding-left: 12px; text-transform: uppercase;">手动执行</div>
                             <div style="background: #fff; border-radius: 12px; overflow: hidden;">
                                <div style="padding: 12px 16px;">
                                    <div style="font-size: 12px; color: #8e8e93; margin-bottom: 8px;">单次日记 Prompt (可选)</div>
                                    <textarea class="wx-ios-textarea"
                                        style="background: #f2f2f7; border-radius: 8px; padding: 10px; font-size: 14px; min-height: 60px;"
                                        placeholder="例如：重点总结关于某次约会的细节..."
                                        oninput="window.WeChat.Services.Summaries.updateSummaryConfig('manualPrompt', this.value)">${State.summaryConfig.manualPrompt}</textarea>
                                </div>
                                <div class="wx-ios-row" style="padding: 0; border-top: 0.5px solid #efefef;">
                                    <div class="wx-ios-action-link" style="width: 100%; padding: 16px; display: flex; align-items: center; justify-content: center; color: #007aff; font-weight: 500; cursor: pointer;" onclick="window.WeChat.Services.Summaries.openSummaryRange('narrative')">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;"><path d="M14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59L14 6z" transform="rotate(180 12 12)" /></svg>
                                        生成日记 (支持同步)
                                    </div>
                                </div>
                             </div>
                        </div>

                    </div>
                    
                    <!-- Footer -->
                    <div style="padding: 16px; background: rgba(255,255,255,0.9); border-top: 0.5px solid rgba(0,0,0,0.1); backdrop-filter: blur(5px);">
                        <div class="wx-ios-primary-btn" style="border-radius: 12px; height: 50px; font-size: 17px; font-weight: 600;" onclick="window.WeChat.Services.Summaries.saveSummarySettings()">
                            保存并完成
                        </div>
                    </div>
                </div>
            </div>
            `;
        }

        // Modal 3: Determine Range
        if (State.rangeModalOpen) {
            return `
            <div class="wx-modal-overlay active" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-modal" onclick="event.stopPropagation()" style="width: 270px !important;">
                    <div class="wx-modal-header clean" style="padding-top: 20px !important; padding-bottom: 0 !important;">
                        <div class="wx-modal-title clean" style="font-size: 17px !important;">选择总结范围</div>
                    </div>
                    <div class="wx-ios-modal-body" style="padding: 16px; background: transparent;">
                        <div style="text-align: center; color: var(--wx-text); font-size: 13px; margin-bottom: 16px;">
                            请输入消息 ID (默认从 1 到 最新)
                        </div>

                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <input type="number" id="wx-range-start" class="wx-ios-textarea"
                                style="width: 60px; height: 36px; min-height: 0; padding: 4px; text-align: center; font-size: 16px; border: 0.5px solid var(--wx-border); background: var(--wx-bg);"
                                value="1">
                                <span style="color: var(--wx-text-sec);">至</span>
                                <input type="number" id="wx-range-end" class="wx-ios-textarea"
                                    style="width: 60px; height: 36px; min-height: 0; padding: 4px; text-align: center; font-size: 16px; border: 0.5px solid var(--wx-border); background: var(--wx-bg);"
                                    placeholder="最新" value="0">
                                </div>
                        </div>
                        <div class="wx-modal-footer" style="padding: 0; display: flex; border-top: 0.5px solid var(--wx-border); height: 44px;">
                            <div onclick="window.WeChat.App.closeModals()"
                                style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 17px; color: #007AFF; border-right: 0.5px solid var(--wx-border); font-weight: 400; cursor: pointer;">
                                取消
                            </div>
                            <div onclick="window.WeChat.App.startSummarize()"
                                style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 17px; color: #007AFF; font-weight: 600; cursor: pointer;">
                                执行
                            </div>
                        </div>
                    </div>
                </div>
        `;
        }

        // Modal 4: Refine Memory Action Sheet
        if (State.refineModalOpen) {
            const memoryCount = char?.memories?.length || 0;
            return `
            <div class="wx-modal-overlay active" style="align-items: flex-end; padding-bottom: 20px;" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-action-sheet-modal" style="width: 100% !important; max-width: 360px !important; margin: 0 auto;">
                    <div class="wx-action-sheet-group">
                        <div class="wx-action-sheet-title">选择精炼范围</div>
                        <div class="wx-action-sheet-item" onclick="window.WeChat.App.handleRefineAll()">
                            全部记忆 (${memoryCount}条)
                        </div>
                        <div class="wx-action-sheet-item" onclick="window.WeChat.App.handleRefineCustom()">
                            自定义数量...
                        </div>
                    </div>
                    <div class="wx-action-sheet-cancel" onclick="window.WeChat.App.closeModals()">
                        取消
                    </div>
                </div>
            </div>
            `;
        }

        // Modal 6: Generic Confirmation Modal (iOS Style) - High Priority Overlay
        if (State.confirmationModal && State.confirmationModal.open) {
            const { title, content, onConfirm, onCancel, confirmText, cancelText, showCancel = true } = State.confirmationModal;
            const confirmAction = typeof onConfirm === 'function' ? 'window.WeChat.App.handleModalConfirm()' : onConfirm;
            const cancelAction = typeof onCancel === 'function' ? 'window.WeChat.App.handleModalCancel()' : 'window.WeChat.App.closeConfirmationModal()';

            return modalHtml + `
                <div class="wx-modal-overlay active" style="z-index: 20002; background: rgba(0,0,0,0.4);" onclick="window.WeChat.App.closeConfirmationModal()">
                    <div class="wx-ios-alert" onclick="event.stopPropagation()">
                        ${title ? `<div class="wx-ios-alert-title">${title}</div>` : ''}
                        ${content ? `<div class="wx-ios-alert-content">${content}</div>` : ''}
                        <div class="wx-ios-alert-footer">
                            ${showCancel ? `<div class="wx-ios-alert-btn cancel" onclick="${cancelAction}">${cancelText || '取消'}</div>` : ''}
                            <div class="wx-ios-alert-btn confirm" onclick="${confirmAction}">${confirmText || '确定'}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (State.promptModal && State.promptModal.open) {
            modalHtml += `
            <div class="wx-modal-overlay active" style="align-items: flex-end; padding-bottom: 20px;" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-action-sheet" style="width: 100%; max-width: 500px; margin: 0 auto;">
                    <div class="wx-action-sheet-header">
                        <h3>${State.promptModal.title || '输入'}</h3>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${State.promptModal.content || ''}</p>
                    </div>
                    <div style="padding: 15px;">
                        <input type="text" id="wx-prompt-input" value="${State.promptModal.value || ''}" placeholder="请输入..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;" autofocus>
                    </div>
                    <div class="wx-action-sheet-actions">
                        <div class="wx-action-sheet-cancel" onclick="window.WeChat.App.closeModals()">取消</div>
                        <div class="wx-action-sheet-confirm" onclick="window.WeChat.App.confirmPrompt()">确认</div>
                    </div>
                </div>
            </div>
            `;
        }

        // --- Exclusive Panels Logic Moved to End of Function ---
        // (Deleted early returns for characterPanelOpen, relationshipPanelOpen, statusHistoryPanelOpen)

        if (State.locationModalOpen) {
            // Re-use the existing return or continue to a combined markup
            modalHtml += window.WeChat.Views.renderLocationModal ? window.WeChat.Views.renderLocationModal() : '';
        }

        // Transfer View Modal (Receiving/Details)
        if (State.transferModalOpen && State.activeTransferMsgId) {
            const msg = window.sysStore.getMessageById(State.activeTransferMsgId);
            if (msg) {
                let trans = { amount: '0.00', note: '' };
                try { trans = JSON.parse(msg.content); } catch (e) { }

                const status = msg.transfer_status || 'pending';
                const isReceived = status === 'received';
                const isRefunded = status === 'refunded';

                // UI State
                let title = '待收款';
                let statusText = '确认收款后，资金将存入零钱';

                if (isReceived) {
                    title = '已收款';
                    statusText = '已存入零钱';
                } else if (isRefunded) {
                    title = '已退款';
                    statusText = '该转账已退回';
                }

                modalHtml += `
                <div class="wx-modal-overlay active" style="z-index: 20003; align-items: center; justify-content: center;" onclick="if(event.target===this) window.WeChat.App.closeTransferModal()">
                    <div class="wx-transfer-modal" style="width: 300px; background: white; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        <div style="background: #f79e39; height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; position: relative;">
                            <div style="position: absolute; top: 10px; left: 10px; cursor: pointer;" onclick="window.WeChat.App.closeTransferModal()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </div>
                            <div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" /></svg>
                            </div>
                            <div style="font-size: 16px; margin-bottom: 5px;">${title}</div>
                        </div>
                        <div style="flex: 1; padding: 30px 20px; display: flex; flex-direction: column; align-items: center;">
                            <div style="font-size: 36px; font-weight: 600; color: #333; margin-bottom: 5px;">¥${trans.amount}</div>
                            <div style="font-size: 14px; color: #999; margin-bottom: 30px;">${trans.note || '转账给您'}</div>
                            ${(!isReceived && !isRefunded) ? `
                                <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
                                    <div onclick="window.WeChat.App.confirmReceiveTransfer()" style="width: 100%; height: 48px; background: #07c160; color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; cursor: pointer;">
                                        确认收款
                                    </div>
                                    <div onclick="window.WeChat.App.rejectTransfer()" style="width: 100%; height: 48px; background: #f5f5f5; color: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 500; cursor: pointer; border: 1px solid #e0e0e0;">
                                        拒绝
                                    </div>
                                </div>
                                <div style="font-size: 12px; color: #999; margin-top: 15px;">${statusText}</div>
                            ` : `
                                <div style="font-size: 14px; color: #999;">${statusText}</div>
                            `}
                        </div>
                    </div>
                </div>`;
            } else {
                setTimeout(() => window.WeChat.App.closeTransferModal(), 0);
            }
        }

        // --- Support Modals (Can be stacked on top of Panels or each other) ---
        if (State.memoryModalOpen) {
            const memories = char?.memories || [];
            const existingText = State.editMemoryIndex >= 0 ? memories[State.editMemoryIndex].content : '';
            const title = `为 "${char?.name || 'User'}" ${State.editMemoryIndex >= 0 ? '编辑' : '添加'} 记忆`;

            modalHtml += `
            <div class="wx-modal-overlay active" style="z-index: 20005;" onclick="if(event.target===this) window.WeChat.App.closeModals()">
                <div class="wx-modal" onclick="event.stopPropagation()">
                    <div class="wx-modal-header">
                        <div class="wx-modal-title">${title}</div>
                    </div>
                    <div class="wx-modal-body">
                        <textarea id="wx-memory-input" class="wx-modal-textarea" placeholder="输入这段重要的记忆...">${existingText}</textarea>
                    </div>
                    <div class="wx-modal-footer">
                        <div class="wx-modal-btn cancel" onclick="window.WeChat.App.closeModals()">取消</div>
                        <div class="wx-modal-btn confirm" onclick="window.WeChat.App.saveMemory()">保存</div>
                    </div>
                </div>
            </div>`;
        }

        // Modal 5: Message Bubble Menu
        if (State.bubbleMenuOpen) {
            const pos = State.bubbleMenuPos;
            const flippedClass = pos.isFlipped ? 'flipped' : '';
            return `
            <div class="wx-menu-mask active" onclick="window.WeChat.App.closeMsgMenu()"></div>
                <div class="wx-bubble-menu active ${flippedClass}" style="left: ${pos.x}px; top: ${pos.y}px;">
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.copyMsg('${State.bubbleMenuId}')">复制</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.regenerateMsg('${State.bubbleMenuId}')">重回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.recallMsg('${State.bubbleMenuId}')">撤回</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.quoteMsg('${State.bubbleMenuId}')">引用</div>
                    <div class="wx-bubble-menu-item" onclick="window.WeChat.App.multiSelectMsg()">多选</div>
                    <div class="wx-bubble-menu-item delete" onclick="window.WeChat.App.deleteMsg('${State.bubbleMenuId}')">删除</div>
                </div>
        `;
        }

        // --- Video Call Simulation (Full Screen) ---
        if (State.videoCallModalOpen) {
            const callChar = window.sysStore.getCharacter(State.activeCallSessionId);
            const avatar = callChar?.avatar || 'assets/images/avatar_placeholder.png';
            const name = callChar?.name || 'User';

            return `
            <div class="wx-modal-overlay active" style="background: #1a1a1a; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 60px 0 80px 0; z-index: 10003;">
                    <div style="text-align: center;">
                        <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        <div style="font-size: 24px; color: white; font-weight: 500; margin-bottom: 8px;">${name}</div>
                        <div style="font-size: 16px; color: rgba(255,255,255,0.6);">邀请你进行视频通话...</div>
                    </div>

                    <div style="width: 100%; padding: 0 40px; display: flex; justify-content: space-around; align-items: center;">
                        <!-- Decline -->
                        <div onclick="window.WeChat.App.closeVideoCallModal()" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ff3b30; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/></svg>
                            </div>
                            <span style="color: white; font-size: 13px;">挂断</span>
                        </div>

                        <!-- Accept -->
                        <div id="wx-vc-accept" onclick="window.WeChat.App.acceptVideoCall()" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #07c160; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.55-2.27A1 1 0 0121 8.61v6.78a1 1 0 01-1.45.89L15 14v-4zM5 8h8a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z"/></svg>
                            </div>
                            <span style="color: white; font-size: 13px;">接听</span>
                        </div>
                    </div>

                    <!--Bottom Bar-- >
            <div style="display: flex; gap: 40px; opacity: 0.8;">
                <div style="display: flex; flex-direction: column; align-items: center; font-size: 12px; color: white;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                    </div>
                    切到语音
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; font-size: 12px; color: white;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" /></svg>
                    </div>
                    模糊背景
                </div>
            </div>
                </div>
            `;
        }

        // --- Subjective Relationship Graph Modal ---
        if (State.subjectiveGraphId) {
            modalHtml += window.WeChat.Views.renderRelationshipGraph();
        }

        // --- [MOVED HERE] Event Manager Modals (Highest Priority) ---
        // 确保它们在 DOM 树的最后，覆盖在 CharacterPanel (z-index: 2000) 之上
        let eventModalsHtml = '';
        if (State.eventManagerOpen && State.activeEventSessionId) {
            eventModalsHtml += window.WeChat.Views.renderEventManagerModal(State.activeEventSessionId);
        }
        if (State.eventEditorOpen && State.activeEventSessionId) {
            eventModalsHtml += window.WeChat.Views.renderEventEditorModal(State.activeEventSessionId, State.activeEventId);
        }

        // 最终组装所用 HTML
        // 注意：如果是 Exclusive Panels (如 characterPanelOpen)，之前的逻辑是直接 return
        // 我们需要修改那部分的逻辑，或者简单地追加到最后。

        let finalHtml = modalHtml;

        // --- Exclusive Panels (One at a time) ---
        if (State.characterPanelOpen) {
            finalHtml += window.WeChat.Views.renderCharacterPanel(State.activeSessionId);
        } else if (State.relationshipPanelOpen) {
            finalHtml += window.WeChat.Views.renderRelationshipPanel(State.activeSessionId);
        } else if (State.statusHistoryPanelOpen) {
            finalHtml += window.WeChat.Views.renderStatusHistoryPanel(State.activeSessionId);
        }

        // Append Event Modals on top of everything
        finalHtml += eventModalsHtml;

        return finalHtml + (window.WeChat.Views.renderPromptModal ? window.WeChat.Views.renderPromptModal(State.promptModal) : '') + (window.WeChat.Views.renderAlertModal ? window.WeChat.Views.renderAlertModal() : '') + (window.WeChat.Views.renderConfirmationModal ? window.WeChat.Views.renderConfirmationModal() : '');
    },

    // --- Event Manager Actions ---

    openEventManager(sessionId) {
        const State = window.WeChat.App.State;
        State.eventManagerOpen = true;
        State.activeEventSessionId = sessionId;
        window.WeChat.App.render();
    },

    closeEventManager() {
        const State = window.WeChat.App.State;
        State.eventManagerOpen = false;
        State.activeEventSessionId = null;
        window.WeChat.App.render();
    },

    toggleEventComplete(eventId, sessionId) {
        window.WeChat.Services.Events.toggleEventComplete(eventId);
        window.WeChat.App.render();
    },

    addEvent(sessionId) {
        const State = window.WeChat.App.State;
        State.eventEditorOpen = true;
        State.activeEventSessionId = sessionId;
        State.activeEventId = null; // New event
        window.WeChat.App.render();
    },

    editEvent(eventId, sessionId) {
        const State = window.WeChat.App.State;
        State.eventEditorOpen = true;
        State.activeEventSessionId = sessionId;
        State.activeEventId = eventId;
        window.WeChat.App.render();
    },

    closeEventEditor() {
        const State = window.WeChat.App.State;
        State.eventEditorOpen = false;
        State.activeEventId = null;
        window.WeChat.App.render();
    },

    deleteEvent(eventId, sessionId) {
        if (confirm('确定要删除这条事件吗？此操作不可撤销。')) {
            window.WeChat.Services.Events.deleteEvent(eventId);
            if (window.os) window.os.showToast('事件已删除');
            // Refresh
            window.WeChat.App.render();
        }
    },

    saveEvent(sessionId, eventId) {
        const type = document.getElementById('evt-editor-type').value;
        const summary = document.getElementById('evt-editor-summary').value;
        const hasSchedule = document.getElementById('evt-editor-has-schedule').checked;

        let scheduleInfo = null;
        if (hasSchedule) {
            scheduleInfo = {
                date: document.getElementById('evt-sch-date').value,
                time: document.getElementById('evt-sch-time').value,
                activity: document.getElementById('evt-sch-activity').value
            };
        }

        if (!summary) {
            if (window.os) window.os.showToast('请输入事件摘要', 'error');
            return;
        }

        const eventsService = window.WeChat.Services.Events;

        if (eventId) {
            // Update
            eventsService.updateEvent(eventId, {
                type,
                summary,
                scheduleInfo
            });
            if (window.os) window.os.showToast('事件已更新');
        } else {
            // Create New
            eventsService.createEvent({
                type,
                summary,
                scheduleInfo,
                participants: [sessionId, 'USER_SELF'], // Default participants
                timestamp: Date.now()
            });
            if (window.os) window.os.showToast('事件已创建');
        }

        this.closeEventEditor();
    },

    compressEvents(sessionId) {
        if (confirm('确定要压缩旧事件吗？這将保留摘要但删除详细快照。')) {
            // 只需要压缩与该角色相关的，或者全局压缩。
            // 这里我们调用全局压缩，但可以通过参数优化
            window.WeChat.Services.Events.compressOldEvents(30, 100); // Default rules
            if (window.os) window.os.showToast('事件压缩完成');
            window.WeChat.App.render();
        }
    }
};
