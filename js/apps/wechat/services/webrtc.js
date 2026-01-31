/**
 * js/apps/wechat/services/webrtc.js
 * WebRTC 音视频通话服务 - 提供真实的麦克风和摄像头访问
 * 
 * 职责：
 * - 获取本地媒体流（摄像头和麦克风）
 * - 管理媒体流的生命周期
 * - 绑定媒体流到DOM元素
 * - 控制媒体流的开关（视频/音频）
 * - 切换前后摄像头
 * 
 * 功能模块：
 * 1. 媒体流获取：
 *    - getLocalStream(): 获取本地媒体流
 *    - startVideoCall(): 启动视频通话（视频+音频）
 *    - startVoiceCall(): 启动语音通话（仅音频）
 *    - stopLocalStream(): 停止媒体流
 * 
 * 2. 媒体流绑定：
 *    - attachLocalVideo(): 绑定视频流到video元素
 *    - attachLocalAudio(): 绑定音频流到audio元素
 * 
 * 3. 媒体流控制：
 *    - toggleVideo(): 切换视频开关
 *    - toggleAudio(): 切换音频开关
 *    - switchCamera(): 切换前后摄像头
 * 
 * 4. 工具函数：
 *    - endCall(): 结束通话并释放资源
 *    - isSupported(): 检查浏览器是否支持WebRTC
 * 
 * 使用场景：
 * - 真实音视频通话（如果启用WebRTC功能）
 * - 目前主要用于模拟通话，但提供真实媒体流接口
 * 
 * 注意：
 * - 此服务提供底层WebRTC API
 * - 上层通话逻辑由 calls.js 处理
 * - 如果不需要真实媒体流，可以不使用此服务
 * 
 * 依赖：
 * - navigator.mediaDevices: 浏览器媒体设备API
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.WebRTC = {
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isCallActive: false,

    /**
     * 初始化并获取本地媒体流（摄像头和麦克风）
     * @param {boolean} video - 是否需要视频
     * @param {boolean} audio - 是否需要音频
     * @returns {Promise<MediaStream>}
     */
    async getLocalStream(video = true, audio = true) {
        try {
            const constraints = {
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false,
                audio: audio ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] 获取媒体流失败:', error);
            throw error;
        }
    },

    /**
     * 停止本地媒体流
     */
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }
    },

    /**
     * 将本地视频流绑定到 video 元素
     * @param {string|HTMLElement} videoElementId - video 元素的 ID 或元素本身
     */
    attachLocalVideo(videoElementId) {
        const videoEl = typeof videoElementId === 'string' 
            ? document.getElementById(videoElementId)
            : videoElementId;
        
        if (videoEl && this.localStream) {
            videoEl.srcObject = this.localStream;
            videoEl.muted = true; // 本地视频静音避免回音
            videoEl.play().catch(err => console.error('[WebRTC] 播放视频失败:', err));
        }
    },

    /**
     * 将本地音频流绑定到 audio 元素
     * @param {string|HTMLElement} audioElementId - audio 元素的 ID 或元素本身
     */
    attachLocalAudio(audioElementId) {
        const audioEl = typeof audioElementId === 'string'
            ? document.getElementById(audioElementId)
            : audioElementId;
        
        if (audioEl && this.localStream) {
            audioEl.srcObject = this.localStream;
            audioEl.play().catch(err => console.error('[WebRTC] 播放音频失败:', err));
        }
    },

    /**
     * 开始视频通话（获取摄像头和麦克风）
     */
    async startVideoCall() {
        try {
            await this.getLocalStream(true, true);
            this.isCallActive = true;
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] 启动视频通话失败:', error);
            this.isCallActive = false;
            throw error;
        }
    },

    /**
     * 开始语音通话（只获取麦克风）
     */
    async startVoiceCall() {
        try {
            await this.getLocalStream(false, true);
            this.isCallActive = true;
            return this.localStream;
        } catch (error) {
            console.error('[WebRTC] 启动语音通话失败:', error);
            this.isCallActive = false;
            throw error;
        }
    },

    /**
     * 结束通话并释放资源
     */
    endCall() {
        this.stopLocalStream();
        this.isCallActive = false;
    },

    /**
     * 切换摄像头开关
     */
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    },

    /**
     * 切换麦克风开关
     */
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    },

    /**
     * 切换前后摄像头（仅移动设备）
     */
    async switchCamera() {
        if (!this.localStream) return false;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return false;

        try {
            const constraints = videoTrack.getConstraints();
            const facingMode = constraints.facingMode === 'user' ? 'environment' : 'user';
            
            await videoTrack.applyConstraints({ facingMode });
            return true;
        } catch (error) {
            console.error('[WebRTC] 切换摄像头失败:', error);
            return false;
        }
    },

    /**
     * 检查浏览器是否支持 WebRTC
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
};
