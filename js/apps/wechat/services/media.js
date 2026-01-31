/**
 * js/apps/wechat/services/media.js
 * 媒体操作服务 - 处理相机、位置、转账等媒体相关功能
 * 
 * 职责：
 * - 照片上传（从相册选择）
 * - 相机功能（拍照、前后摄像头切换）
 * - 位置分享（选择位置、发送位置）
 * - 转账功能（发送转账、接收转账、拒绝转账）
 * 
 * 功能模块：
 * 1. 照片上传：
 *    - triggerPhotoUpload(): 触发文件选择器
 *    - handlePhotoFileSelect(): 处理选中的图片文件
 * 
 * 2. 相机功能：
 *    - triggerCamera(): 打开相机模态框
 *    - initCamera(): 初始化摄像头
 *    - capturePhoto(): 拍照
 *    - switchCamera(): 切换前后摄像头
 *    - _stopCameraStream(): 停止摄像头流
 * 
 * 3. 位置功能：
 *    - triggerLocation(): 打开位置选择
 *    - sendLocation(): 发送位置信息
 *    - closeLocationModal(): 关闭位置模态框
 * 
 * 4. 转账功能：
 *    - sendTransfer(): 发送转账
 *    - handleTransferClick(): 处理转账消息点击（打开接收/拒绝模态框）
 *    - closeTransferModal(): 关闭转账模态框
 * 
 * 依赖：
 * - window.WeChat.Services.Chat: 发送消息
 * - window.sysStore: 数据存储
 * - window.WeChat.App: 应用主对象
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Media = {
    get State() { return window.WeChat.App?.State; },
    get App() { return window.WeChat.App; },

    triggerPhotoUpload() {
        let input = document.getElementById('wx-photo-upload-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'wx-photo-upload-input';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = (e) => this.handlePhotoFileSelect(e.target);
            document.body.appendChild(input);
        }
        input.click();
        this.App.toggleExtraPanel(); // Close the panel
    },

    handlePhotoFileSelect(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            window.WeChat.Services.Chat.sendMessage(dataUrl, 'image');
        };
        reader.readAsDataURL(file);
        input.value = '';
    },

    triggerCamera() {
        this.App.toggleExtraPanel(); // Close the panel
        const State = this.State;
        State.cameraModalOpen = true;
        this.App.render();
        // Delay to ensure DOM is ready
        setTimeout(() => this.initCamera(), 100);
    },

    async initCamera() {
        this._stopCameraStream(); // Stop any existing stream first

        // 1. Check Support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this._handleCameraError('SecureContextRequired');
            return;
        }

        const video = document.getElementById('wx-camera-video');
        if (!video) return;

        const State = this.State;
        try {
            // 使用真实摄像头 - 优先使用指定朝向
            let constraints = {
                video: {
                    facingMode: State.cameraFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('[Camera] 成功获取真实摄像头流');
            } catch (e) {
                console.warn("特定朝向模式失败，尝试通用约束...", e);
                // 降级：尝试通用约束（例如桌面摄像头不支持 'user'）
                constraints = {
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                };
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    console.log('[Camera] 使用通用约束成功获取摄像头流');
                } catch (e2) {
                    // 最后降级：最基本的约束
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    console.log('[Camera] 使用基本约束获取摄像头流');
                }
            }

            video.srcObject = stream;
            video.setAttribute('playsinline', 'true'); // Required for iOS
            video.setAttribute('webkit-playsinline', 'true');

            // Robust play logic
            const playVideo = async () => {
                try {
                    await video.play();
                    console.log('Camera video playing');
                } catch (e) {
                    console.error("Play failed", e);
                }
            };

            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                playVideo();
            } else {
                video.onloadedmetadata = () => {
                    playVideo();
                };
            }

            // Hide error if previously shown
            State.cameraError = null;

            // Force re-render only if we had an error before (to remove the error overlay)
            const errorOverlay = document.querySelector('.wx-modal-overlay .error-content');
            if (errorOverlay) {
                // If we were in error state, rendering will replace the error UI with the video tag.
                // We MUST re-run initCamera because the video tag is new.
                this.App.render();
                setTimeout(() => this.initCamera(), 50);
                return; // Exit current run as we are restarting
            }

        } catch (err) {
            // 使用统一错误处理
            if (window.ErrorHandler) {
                window.ErrorHandler.setContext({
                    action: 'initCamera'
                });
                window.ErrorHandler.handle(err, {
                    level: window.ErrorHandler.Level.ERROR,
                    type: window.ErrorHandler.Type.PERMISSION,
                    message: '无法访问摄像头，请检查权限设置',
                    metadata: { errorName: err.name }
                });
            } else {
                console.error("Camera access failed", err);
            }
            this._handleCameraError(err.name || 'UnknownError');
        }
    },

    _handleCameraError(errorName) {
        const State = this.State;
        State.cameraError = errorName;
        this.App.render(); // Trigger re-render to show fallback

        let msg = '无法访问摄像头';
        if (errorName === 'NotAllowedError') msg = '请在浏览器设置中允许摄像头权限';
        if (errorName === 'SecureContextRequired') msg = '当前环境不支持摄像头 (需 HTTPS 或 localhost)';
        if (errorName === 'NotFoundError') msg = '未检测到摄像头设备';

        if (window.os) window.os.showToast(msg, 'error');
    },

    switchCamera() {
        const State = this.State;
        State.cameraFacingMode = State.cameraFacingMode === 'user' ? 'environment' : 'user';
        this.initCamera();
    },

    capturePhoto() {
        const video = document.getElementById('wx-camera-video');
        if (!video) return;

        const State = this.State;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // Mirror if user facing
        if (State.cameraFacingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg');
        window.WeChat.Services.Chat.sendMessage(dataUrl, 'image');

        this.closeCameraModal();
    },

    _stopCameraStream() {
        const video = document.getElementById('wx-camera-video');
        if (video && video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
    },

    closeCameraModal() {
        this._stopCameraStream();
        const State = this.State;
        State.cameraModalOpen = false;
        this.App.render();
    },

    triggerLocation() {
        this.App.toggleExtraPanel(); // Close extra panel
        const State = this.State;
        State.locationModalOpen = true;
        this.App.render();
    },

    closeLocationModal() {
        const State = this.State;
        State.locationModalOpen = false;
        this.App.render();
    },

    sendLocation() {
        const nameInput = document.getElementById('wx-location-name');
        const remarkInput = document.getElementById('wx-location-remark');
        const distInput = document.getElementById('wx-location-dist');

        const locationName = nameInput ? nameInput.value.trim() : '';
        const remark = remarkInput ? remarkInput.value.trim() : '';
        const distance = distInput ? distInput.value.trim() : '';

        if (!locationName) {
            if (window.os) window.os.showToast('请输入位置名称', 'error');
            return;
        }

        // Construct detail string: "Remark" + " | " + "Distance"
        let detailParts = [];
        if (remark) detailParts.push(remark);
        if (distance) detailParts.push(`距你 ${distance} km`);
        const detailText = detailParts.join(' | ');

        const payload = {
            name: locationName,
            detail: detailText || locationName // Fallback
        };

        window.WeChat.Services.Chat.sendMessage(JSON.stringify(payload), 'location');

        this.closeLocationModal();
        if (window.os) window.os.showToast('位置已发送');
    },

    handleTransferClick(msgId) {
        if (!msgId) {
            console.warn('[Media] handleTransferClick: No msgId provided');
            return;
        }
        
        // [Fix] Directly use window.WeChat.App to avoid getter issues
        const App = window.WeChat.App;
        if (!App) {
            if (window.ErrorHandler) {
                window.ErrorHandler.handle(new Error('window.WeChat.App not available'), {
                    level: window.ErrorHandler.Level.ERROR,
                    type: window.ErrorHandler.Type.UNKNOWN,
                    message: '系统初始化失败',
                    showToast: false
                });
            } else {
                console.error('[Media] handleTransferClick: window.WeChat.App not available');
            }
            return;
        }
        
        if (!App.openTransferModal) {
            if (window.ErrorHandler) {
                window.ErrorHandler.handle(new Error('openTransferModal method not available'), {
                    level: window.ErrorHandler.Level.ERROR,
                    type: window.ErrorHandler.Type.UNKNOWN,
                    message: '功能未初始化',
                    showToast: false
                });
            } else {
                console.error('[Media] handleTransferClick: openTransferModal method not available');
            }
            return;
        }
        
        // Open the modal
        App.openTransferModal(msgId);
    },

    sendTransfer() {
        const amountInput = document.getElementById('wx-transfer-amount');
        const noteInput = document.getElementById('wx-transfer-note');

        const amount = amountInput ? parseFloat(amountInput.value).toFixed(2) : '0.00';
        const note = noteInput ? noteInput.value.trim() : '';

        if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
            // Button should be disabled ideally, but safety check
            return;
        }

        const payload = {
            amount: amount,
            note: note
        };

        window.WeChat.Services.Chat.sendMessage(JSON.stringify(payload), 'transfer');

        const State = this.State;
        State.transferModalOpen = false;
        this.App.render();
    },

    closeTransferModal() {
        const State = this.State;
        State.transferModalOpen = false;
        this.App.render();
    }
};
