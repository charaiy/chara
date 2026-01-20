/**
 * js/apps/wechat/services/stickers.js
 * 表情管理服务 - 负责存储和获取用户自定义表情
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Stickers = {
    // 默认表情包
    defaults: [
        'https://yexingphoto.pages.dev/file/1768136740736_Screenshot_20260111_205447.jpg', // 生气瞪眼
        'https://yexingphoto.pages.dev/file/1768136737634_Screenshot_20260111_205522.jpg', // 兔子生气
        'https://yexingphoto.pages.dev/file/1768136741929_Screenshot_20260111_205539.jpg', // 小猫生气
        'https://yexingphoto.pages.dev/file/1768136741756_Screenshot_20260111_205551_com_tencent_mm_LauncherUI_edit_93544481088273.jpg', // 头上着火
        'https://yexingphoto.pages.dev/file/1768136734039_Screenshot_20260111_205804.jpg', // 小熊生气
        'https://yexingphoto.pages.dev/file/1768136733584_Screenshot_20260111_205752_com_tencent_mm_LauncherUI_edit_93587278673048.jpg', // 小牛生气
        'https://yexingphoto.pages.dev/file/1768136740784_Screenshot_20260111_205937.jpg', // 生气被抓住
        'https://yexingphoto.pages.dev/file/1768136735091_Screenshot_20260111_205926_com_tencent_mm_LauncherUI_edit_93674292352546.jpg', // 炸毛生气
        'https://yexingphoto.pages.dev/file/1768136734437_retouch_2026011121013125.png', // 狗生气
        'https://yexingphoto.pages.dev/file/1768136739359_retouch_2026011121014296.png', // 瞪眼生气
        'https://yexingphoto.pages.dev/file/1768139021673_Screenshot_20260111_213810_edit_95495254978778.jpg', // 小猫担心
        'https://yexingphoto.pages.dev/file/1768139018709_retouch_2026011121424592.png', // 小猫流汗
        'https://yexingphoto.pages.dev/file/1768139020561_retouch_2026011121424057.png', // 兔子流汗
        'https://yexingphoto.pages.dev/file/1768139027012_Screenshot_20260111_214038_com_tencent_mm_LauncherUI_edit_95354401470082.jpg', // 托腮
        'https://yexingphoto.pages.dev/file/1768139027371_Screenshot_20260111_213944.jpg', // 小狗担忧
        'https://yexingphoto.pages.dev/file/1768139019445_Screenshot_20260111_213928.jpg', // 猫自闭
        'https://yexingphoto.pages.dev/file/1768139029536_Screenshot_20260111_214011.jpg', // 吃手手
        'https://yexingphoto.pages.dev/file/1768139031621_Screenshot_20260111_213758_com_tencent_mm_LauncherUI_edit_95243153558927.jpg', // 歪嘴
        'https://yexingphoto.pages.dev/file/1768139023667_Screenshot_20260111_213852.jpg', // 不开心
        'https://yexingphoto.pages.dev/file/1768139029388_Screenshot_20260111_213828.jpg', // 垂眸
        'https://yexingphoto.pages.dev/file/1768139995587_Screenshot_20260111_215730_com_tencent_mm_LauncherUI_edit_96380792580003.jpg', // 嚎叫
        'https://yexingphoto.pages.dev/file/1768139996008_Screenshot_20260111_215741.jpg', // 欲言又止
        'https://yexingphoto.pages.dev/file/1768139994751_Screenshot_20260111_215354.jpg', // 无语
        'https://yexingphoto.pages.dev/file/1768140000892_Screenshot_20260111_215325.jpg', // 企鹅沉默
        'https://yexingphoto.pages.dev/file/1768139996639_Screenshot_20260111_215313.jpg', // 兔子无语
        'https://yexingphoto.pages.dev/file/1768139994121_Screenshot_20260111_215249.jpg', // 妈的
        'https://yexingphoto.pages.dev/file/1768140006143_Screenshot_20260111_215231.jpg', // 无语子
        'https://yexingphoto.pages.dev/file/1768140001372_Screenshot_20260111_215214.jpg', // 死出
        'https://yexingphoto.pages.dev/file/1768140005257_Screenshot_20260111_215158.jpg', // 牛无语
        'https://yexingphoto.pages.dev/file/1768140005088_Screenshot_20260111_215143.jpg', // 报警
        'https://yexingphoto.pages.dev/file/1768140745439_Screenshot_20260111_221101_com_tencent_mm_LauncherUI_edit_97212972814946.jpg', // 失去理智
        'https://yexingphoto.pages.dev/file/1768140737830_Screenshot_20260111_221135.jpg', // 搓手手
        'https://yexingphoto.pages.dev/file/1768140747230_Screenshot_20260111_221123.jpg', // 比心
        'https://yexingphoto.pages.dev/file/1768140738148_Screenshot_20260111_221112.jpg', // 去世勿扰
        'https://yexingphoto.pages.dev/file/1768140743846_Screenshot_20260111_220907.jpg', // 开心
        'https://yexingphoto.pages.dev/file/1768140744450_Screenshot_20260111_220856.jpg', // 脚比心
        'https://yexingphoto.pages.dev/file/1768140749400_Screenshot_20260111_220843.jpg', // 内耗
        'https://yexingphoto.pages.dev/file/1768140747582_Screenshot_20260111_220833.jpg', // 门口等你
        'https://yexingphoto.pages.dev/file/1768140750462_Screenshot_20260111_220823.jpg', // 想你啦
        'https://yexingphoto.pages.dev/file/1768140979886_retouch_2026011122150059.png', // 我请问呢
        'https://yexingphoto.pages.dev/file/1768141622386_Screenshot_20260111_222216.jpg', // 深情
        'https://yexingphoto.pages.dev/file/1768141630574_Screenshot_20260111_222237.jpg', // 深情对望
        'https://yexingphoto.pages.dev/file/1768141628156_Screenshot_20260111_222348.jpg', // 想打人
        'https://yexingphoto.pages.dev/file/1768141627820_Screenshot_20260111_222407.jpg', // 吹口哨
        'https://yexingphoto.pages.dev/file/1768141619029_Screenshot_20260111_222428.jpg', // 脱衣服
        'https://yexingphoto.pages.dev/file/1768141625979_Screenshot_20260111_222453.jpg', // 欲望
        'https://yexingphoto.pages.dev/file/1768141628225_Screenshot_20260111_222520.jpg', // 真行
        'https://yexingphoto.pages.dev/file/1768141624126_Screenshot_20260111_222532.jpg'  // 肝肠寸断
    ],

    getKey() { return 'wx_custom_stickers'; },

    getAll() {
        const stored = window.sysStore.get(this.getKey());
        let custom = [];
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            custom = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Stickers Load Error:', e);
            custom = [];
        }

        const defaults = this.defaults || [];

        // Filter out excluded defaults
        const excluded = this.getExcluded ? this.getExcluded() : [];
        const allDefaults = defaults.filter(url => !excluded.includes(url));

        return [...allDefaults, ...custom];
    },

    add(urls) {
        if (!Array.isArray(urls)) urls = [urls];
        let current = this.getCustomOnly();
        let count = 0;
        urls.forEach(url => {
            if (url && !current.includes(url) && !this.defaults.includes(url)) {
                current.push(url);
                count++;
            }
        });
        if (count > 0) window.sysStore.set(this.getKey(), JSON.stringify(current));
        return count;
    },

    remove(url) {
        let current = this.getCustomOnly();
        const index = current.indexOf(url);
        if (index > -1) {
            current.splice(index, 1);
            window.sysStore.set(this.getKey(), JSON.stringify(current));
            return true;
        }
        // Also allow removing from defaults by exclusion list? (Or just ignore for now as defaults are "system")
        // For now, users can only remove custom stickers, or we treat defaults as read-only.
        // User request: "click then delete". So we should allow deleting defaults too if the user wants.
        // Since we can't delete from code, we can add to an "exclusion" list.
        // But for simplicity, let's assume "defaults" are just initial seed data.
        // Better strategy: Copy defaults to custom on first load? No.
        // Let's implement exclusion list or just say "System stickers cannot be deleted"
        if (this.defaults.includes(url)) {
            // "Soft delete" for defaults using exclusion list
            const excluded = this.getExcluded();
            excluded.push(url);
            window.sysStore.set(this.getKey() + '_excluded', JSON.stringify(excluded));
            return true;
        }
        return false;
    },

    getExcluded() {
        const stored = window.sysStore.get(this.getKey() + '_excluded');
        try { return stored ? JSON.parse(stored) : []; } catch (e) { return []; }
    },

    getCustomOnly() {
        const stored = window.sysStore.get(this.getKey());
        try {
            const parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    },

    clearCustom() { window.sysStore.set(this.getKey(), '[]'); window.sysStore.set(this.getKey() + '_excluded', '[]'); }
};
