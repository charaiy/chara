/**
 * js/apps/wechat/services/stickers.js
 * 表情管理服务 - 负责存储和获取用户自定义表情
 * [Upgraded] Supports Semantic Tags for AI
 */

window.WeChat = window.WeChat || {};
window.WeChat.Services = window.WeChat.Services || {};

window.WeChat.Services.Stickers = {
    // 默认表情包 (带语义标注)
    defaults: [
        { url: 'https://yexingphoto.pages.dev/file/1768136740736_Screenshot_20260111_205447.jpg', tags: ['生气瞪眼'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136737634_Screenshot_20260111_205522.jpg', tags: ['兔子生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136741929_Screenshot_20260111_205539.jpg', tags: ['小猫生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136741756_Screenshot_20260111_205551_com_tencent_mm_LauncherUI_edit_93544481088273.jpg', tags: ['猫生气（头上着火）'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136734039_Screenshot_20260111_205804.jpg', tags: ['小熊生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136733584_Screenshot_20260111_205752_com_tencent_mm_LauncherUI_edit_93587278673048.jpg', tags: ['小牛生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136740784_Screenshot_20260111_205937.jpg', tags: ['生气（被抓住版）'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136735091_Screenshot_20260111_205926_com_tencent_mm_LauncherUI_edit_93674292352546.jpg', tags: ['猫咪炸毛生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136734437_retouch_2026011121013125.png', tags: ['狗生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136739359_retouch_2026011121014296.png', tags: ['瞪眼生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139021673_Screenshot_20260111_213810_edit_95495254978778.jpg', tags: ['小猫担心'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139018709_retouch_2026011121424592.png', tags: ['小猫流汗'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139020561_retouch_2026011121424057.png', tags: ['兔子流汗'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139027012_Screenshot_20260111_214038_com_tencent_mm_LauncherUI_edit_95354401470082.jpg', tags: ['猫咪托腮'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139027371_Screenshot_20260111_213944.jpg', tags: ['小狗担忧'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139019445_Screenshot_20260111_213928.jpg', tags: ['猫自闭'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139029536_Screenshot_20260111_214011.jpg', tags: ['担心到吃手手'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139031621_Screenshot_20260111_213758_com_tencent_mm_LauncherUI_edit_95243153558927.jpg', tags: ['歪嘴担忧'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139023667_Screenshot_20260111_213852.jpg', tags: ['不开心'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139029388_Screenshot_20260111_213828.jpg', tags: ['猫咪垂眸担忧'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139995587_Screenshot_20260111_215730_com_tencent_mm_LauncherUI_edit_96380792580003.jpg', tags: ['小狗嚎叫'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139996008_Screenshot_20260111_215741.jpg', tags: ['欲言又止中'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139994751_Screenshot_20260111_215354.jpg', tags: ['小猫无语'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140000892_Screenshot_20260111_215325.jpg', tags: ['企鹅沉默'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139996639_Screenshot_20260111_215313.jpg', tags: ['兔子无语'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139994121_Screenshot_20260111_215249.jpg', tags: ['妈的'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140006143_Screenshot_20260111_215231.jpg', tags: ['无语子'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140001372_Screenshot_20260111_215214.jpg', tags: ['又整这死出'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140005257_Screenshot_20260111_215158.jpg', tags: ['牛无语'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140005088_Screenshot_20260111_215143.jpg', tags: ['有些时候真的想报警'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140745439_Screenshot_20260111_221101_com_tencent_mm_LauncherUI_edit_97212972814946.jpg', tags: ['失去理智'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140737830_Screenshot_20260111_221135.jpg', tags: ['邪恶搓手手'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140747230_Screenshot_20260111_221123.jpg', tags: ['小猫比心'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140738148_Screenshot_20260111_221112.jpg', tags: ['已去世勿扰'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140743846_Screenshot_20260111_220907.jpg', tags: ['开心'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140744450_Screenshot_20260111_220856.jpg', tags: ['用脚比心'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140749400_Screenshot_20260111_220843.jpg', tags: ['内耗'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140747582_Screenshot_20260111_220833.jpg', tags: ['在门口等你'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140750462_Screenshot_20260111_220823.jpg', tags: ['想你啦'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140979886_retouch_2026011122150059.png', tags: ['我请问呢'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141622386_Screenshot_20260111_222216.jpg', tags: ['超他妈深情'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141630574_Screenshot_20260111_222237.jpg', tags: ['深情对望'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141628156_Screenshot_20260111_222348.jpg', tags: ['想打人'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141627820_Screenshot_20260111_222407.jpg', tags: ['吹口哨'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141619029_Screenshot_20260111_222428.jpg', tags: ['脱衣服'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141625979_Screenshot_20260111_222453.jpg', tags: ['欲望爆棚'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141628225_Screenshot_20260111_222520.jpg', tags: ['你可真行'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141624126_Screenshot_20260111_222532.jpg', tags: ['小女子肝肠寸断'] }
    ],

    getKey() { return 'wx_custom_stickers_v2'; }, // Upgraded key for new version

    /**
     * 获取所有表情 (URLs only for legacy UI compatibility)
     */
    getAllURLOnly() {
        return this.getAll().map(s => s.url);
    },

    /**
     * 获取所有完整表情对象
     */
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

        // Migrate Old Data if needed (string[] -> object[])
        if (custom.length > 0 && typeof custom[0] === 'string') {
            custom = custom.map(url => ({ url, tags: ['自定义', '收藏'] }));
            window.sysStore.set(this.getKey(), JSON.stringify(custom));
        }

        const defaults = this.defaults;

        // Filter out excluded (by URL)
        const excluded = this.getExcluded();
        const allDefaults = defaults.filter(item => !excluded.includes(item.url));

        return [...allDefaults, ...custom];
    },

    /**
     * 获取用于 AI Prompt 的表情列表描述
     * Returns: "- [开心]: 包含 x 张相关表情"
     */
    getAIStickerRef() {
        const stickers = this.getAll();
        const tagMap = {};

        stickers.forEach(s => {
            s.tags.forEach(t => {
                if (!tagMap[t]) tagMap[t] = 0;
                tagMap[t]++;
            });
        });

        // 选出 Top 30 常用标签
        const tags = Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1]) // 按数量降序
            .slice(0, 30)
            .map(([tag]) => tag);

        return tags.map(t => `- [${t}]`).join(', ');
    },

    /**
     * 根据含义查找表情 URL
     * @param {string} meaning - "开心", "生气", etc.
     */
    findUrlByMeaning(meaning) {
        if (!meaning) return null;

        const all = this.getAll();
        // 1. 精确匹配
        let candidates = all.filter(s => s.tags.includes(meaning));

        // 2. 模糊匹配 (如果没找到)
        if (candidates.length === 0) {
            // Clean meaning of punctuation for matching
            const cleanM = String(meaning).toLowerCase().replace(/[\[\]\(\)\-\,\.\!\?，。！？]/g, '').trim();
            if (!cleanM) return null;

            candidates = all.filter(s => s.tags.some(t => {
                const tag = String(t).toLowerCase();
                return tag.includes(cleanM) || cleanM.includes(tag);
            }));
        }

        if (candidates.length > 0) {
            // [Anti-Repetition] Filter out recently used stickers
            if (!this._recentList) this._recentList = [];

            // Try to find candidates not in recent list
            const freshCandidates = candidates.filter(c => !this._recentList.includes(c.url));

            // Use fresh ones if available, otherwise fallback to all to avoid breaking
            const pool = freshCandidates.length > 0 ? freshCandidates : candidates;

            const r = Math.floor(Math.random() * pool.length);
            const chosenUrl = pool[r].url;

            // Update History (Keep last 5)
            this._recentList.push(chosenUrl);
            if (this._recentList.length > 5) {
                this._recentList.shift();
            }

            return chosenUrl;
        }

        return null;
    },

    /**
     * 添加自定义表情
     */
    add(urls) {
        if (!Array.isArray(urls)) urls = [urls];
        let current = this.getCustomOnly();
        let count = 0;

        urls.forEach(url => {
            // Check duplicates
            if (!current.find(s => s.url === url) && !this.defaults.find(s => s.url === url)) {
                // Default tags for new uploads
                current.push({ url, tags: ['自定义', '收藏', '未分类'] });
                count++;
            }
        });

        if (count > 0) window.sysStore.set(this.getKey(), JSON.stringify(current));
        return count;
    },

    /**
     * 移除表情
     */
    remove(url) {
        let current = this.getCustomOnly();
        const index = current.findIndex(s => s.url === url);

        if (index > -1) {
            current.splice(index, 1);
            window.sysStore.set(this.getKey(), JSON.stringify(current));
            return true;
        }

        // Soft delete defaults
        if (this.defaults.find(s => s.url === url)) {
            const excluded = this.getExcluded();
            if (!excluded.includes(url)) {
                excluded.push(url);
                window.sysStore.set(this.getKey() + '_excluded', JSON.stringify(excluded));
            }
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
            // Ensure object structure
            return parsed.map(item => typeof item === 'string' ? { url: item, tags: ['自定义'] } : item);
        } catch (e) { return []; }
    },

    // Legacy support for older code calling getAll (return string[]?)
    // No, we changed the API. Make sure UI code is updated or valid.
};

