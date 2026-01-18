window.WeChat.Extensions.RedPacket = {
    init: function () {
        console.log("[Extension] RedPacket Loaded");
    },

    /**
     * 打开红包
     */
    open: function (status) {
        if (status === 'opened') {
            alert("这个红包已经领过了");
            return;
        }

        // 模拟开红包动画
        // 显示全屏红包弹窗 (Overlay)
        const overlay = document.getElementById('wx-overlay');
        overlay.innerHTML = `
            <div class="red-packet-modal" style="background:#d95940; width:300px; height:450px; border-radius:12px; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center;">
                <div class="rp-top" style="background:#e65e5e; width:150%; height:300px; border-radius:50%; margin-top:-100px; box-shadow:0 4px 10px rgba(0,0,0,0.2);"></div>
                <div class="rp-avatar" style="width:60px; height:60px; border-radius:6px; background:#fff; position:absolute; top:80px; z-index:10;">
                    <img src="assets/avatars/kafka.jpg" style="width:100%; height:100%; border-radius:6px;">
                </div>
                <div class="rp-msg" style="position:absolute; top:150px; color:#fce7b2; font-size:18px;">恭喜发财，大吉大利</div>
                
                <div class="rp-btn-open" onclick="window.WeChat.Extensions.RedPacket._doOpen(this)" 
                    style="width:80px; height:80px; background:#fce7b2; border-radius:50%; position:absolute; top:250px; display:flex; align-items:center; justify-content:center; font-size:30px; color:#333; cursor:pointer; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                    開
                </div>

                <div class="rp-close" onclick="document.getElementById('wx-overlay').style.display='none'" style="position:absolute; bottom:10px; color:rgba(255,255,255,0.7); cursor:pointer;">✕</div>
            </div>
        `;
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
    },

    /**
     * 执行开红包逻辑
     */
    _doOpen: function (btn) {
        // 旋转动画
        btn.style.transition = 'transform 1s';
        btn.style.transform = 'rotateY(360deg)';

        setTimeout(() => {
            // 存入钱包
            const amount = (Math.random() * 200).toFixed(2);
            this.addToWallet(parseFloat(amount));

            alert(`你领取了 ¥${amount}`);
            document.getElementById('wx-overlay').style.display = 'none';
        }, 1000);
    },

    /**
     * 钱包操作
     */
    addToWallet: function (amount) {
        if (window.sysStore) {
            const current = window.sysStore.user.wallet ? window.sysStore.user.wallet.balance : 0;
            // sysStore.updateUserWallet(current + amount);
            console.log(`[Wallet] Received +${amount}, New Balance: ${current + amount}`);
        }
    },

    // 亲属卡支付逻辑
    payWithFamilyCard: function (charId, amount) {
        console.log(`[FamilyCard] Paying ${amount} using card from ${charId}`);
        // 触发通知
        if (window.WeChat.Services.Chat) {
            window.WeChat.Services.Chat.sendMessage(charId, `[系统] 我使用了你的亲属卡支付了 ¥${amount}`, 'text');
        }
    }
};
