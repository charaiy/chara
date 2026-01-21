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
        { url: 'https://yexingphoto.pages.dev/file/1768136740736_Screenshot_20260111_205447.jpg', tags: ['生气', '瞪眼', '愤怒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136737634_Screenshot_20260111_205522.jpg', tags: ['生气', '兔子', '愤怒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136741929_Screenshot_20260111_205539.jpg', tags: ['生气', '小猫', '炸毛'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136741756_Screenshot_20260111_205551_com_tencent_mm_LauncherUI_edit_93544481088273.jpg', tags: ['生气', '着火', '暴怒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136734039_Screenshot_20260111_205804.jpg', tags: ['生气', '小熊', '严肃'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136733584_Screenshot_20260111_205752_com_tencent_mm_LauncherUI_edit_93587278673048.jpg', tags: ['生气', '小牛', '愤怒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136740784_Screenshot_20260111_205937.jpg', tags: ['生气', '被抓', '委屈'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136735091_Screenshot_20260111_205926_com_tencent_mm_LauncherUI_edit_93674292352546.jpg', tags: ['生气', '炸毛', '发狂'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136734437_retouch_2026011121013125.png', tags: ['生气', '狗', '鄙视'] },
        { url: 'https://yexingphoto.pages.dev/file/1768136739359_retouch_2026011121014296.png', tags: ['生气', '瞪眼', '震惊'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139021673_Screenshot_20260111_213810_edit_95495254978778.jpg', tags: ['担心', '小猫', '疑惑'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139018709_retouch_2026011121424592.png', tags: ['流汗', '小猫', '尴尬'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139020561_retouch_2026011121424057.png', tags: ['流汗', '兔子', '无语'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139027012_Screenshot_20260111_214038_com_tencent_mm_LauncherUI_edit_95354401470082.jpg', tags: ['托腮', '无聊', '思考'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139027371_Screenshot_20260111_213944.jpg', tags: ['担忧', '小狗', '难过'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139019445_Screenshot_20260111_213928.jpg', tags: ['自闭', '猫', '难过'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139029536_Screenshot_20260111_214011.jpg', tags: ['吃手', '紧张', '害怕'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139031621_Screenshot_20260111_213758_com_tencent_mm_LauncherUI_edit_95243153558927.jpg', tags: ['歪嘴', '不屑', '嘲讽'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139023667_Screenshot_20260111_213852.jpg', tags: ['不开心', '沮丧', '低落'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139029388_Screenshot_20260111_213828.jpg', tags: ['垂眸', '伤心', '失落'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139995587_Screenshot_20260111_215730_com_tencent_mm_LauncherUI_edit_96380792580003.jpg', tags: ['嚎叫', '崩溃', '大哭'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139996008_Screenshot_20260111_215741.jpg', tags: ['欲言又止', '尴尬', '沉默'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139994751_Screenshot_20260111_215354.jpg', tags: ['无语', '流汗', '叹气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140000892_Screenshot_20260111_215325.jpg', tags: ['沉默', '企鹅', '呆滞'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139996639_Screenshot_20260111_215313.jpg', tags: ['无语', '兔子', '晕倒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768139994121_Screenshot_20260111_215249.jpg', tags: ['骂人', '妈的', '愤怒'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140006143_Screenshot_20260111_215231.jpg', tags: ['无语子', '阴阳怪气', '摊手'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140001372_Screenshot_20260111_215214.jpg', tags: ['死出', '白眼', '不屑'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140005257_Screenshot_20260111_215158.jpg', tags: ['无语', '牛', '怀疑人生'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140005088_Screenshot_20260111_215143.jpg', tags: ['报警', '离谱', '震惊'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140745439_Screenshot_20260111_221101_com_tencent_mm_LauncherUI_edit_97212972814946.jpg', tags: ['发疯', '失去理智', '尖叫'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140737830_Screenshot_20260111_221135.jpg', tags: ['搓手', '期待', '猥琐'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140747230_Screenshot_20260111_221123.jpg', tags: ['比心', '爱意', '喜欢'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140738148_Screenshot_20260111_221112.jpg', tags: ['去世', '勿扰', '躺平'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140743846_Screenshot_20260111_220907.jpg', tags: ['开心', '大笑', '快乐'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140744450_Screenshot_20260111_220856.jpg', tags: ['比心', '脚比心', '搞怪'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140749400_Screenshot_20260111_220843.jpg', tags: ['内耗', '纠结', '痛苦'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140747582_Screenshot_20260111_220833.jpg', tags: ['乖巧', '等你', '坐好'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140750462_Screenshot_20260111_220823.jpg', tags: ['想你', '思念', '爱你'] },
        { url: 'https://yexingphoto.pages.dev/file/1768140979886_retouch_2026011122150059.png', tags: ['疑问', '请问', '疑惑'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141622386_Screenshot_20260111_222216.jpg', tags: ['深情', '凝视', '爱'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141630574_Screenshot_20260111_222237.jpg', tags: ['深情', '对望', '暧昧'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141628156_Screenshot_20260111_222348.jpg', tags: ['暴力', '打人', '生气'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141627820_Screenshot_20260111_222407.jpg', tags: ['吹口哨', '装傻', '无辜'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141619029_Screenshot_20260111_222428.jpg', tags: ['色色', '脱衣服', '害羞'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141625979_Screenshot_20260111_222453.jpg', tags: ['欲望', '喝水', '紧张'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141628225_Screenshot_20260111_222520.jpg', tags: ['真行', '佩服', '无语'] },
        { url: 'https://yexingphoto.pages.dev/file/1768141624126_Screenshot_20260111_222532.jpg', tags: ['悲伤', '肝肠寸断', '哭'] }
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
            candidates = all.filter(s => s.tags.some(t => t.includes(meaning) || meaning.includes(t)));
        }

        if (candidates.length > 0) {
            // Randomly pick one
            const r = Math.floor(Math.random() * candidates.length);
            return candidates[r].url;
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

