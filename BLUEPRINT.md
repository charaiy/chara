# CharaOS 项目蓝图 (BLUEPRINT)

## 1. 项目概述
**项目名称**: CharaOS (Chara小手机)
**核心目标**: 构建一个运行在浏览器中的高保真 iOS 仿真操作系统。核心应用为深度定制的“仿真微信”，集成 AI 角色扮演功能，同时包含微博、世界书等应用。
**技术栈**: 原生 JavaScript (ES6+), Vanilla CSS (无框架), HTML5。

## 2. 目录结构 (Directory Structure)
采用扁平化架构，核心系统文件位于 js/ 根目录，复杂应用独立文件夹。

```text
project_root/
├── index.html               # 基础容器 (#os-root)
├── css/                     # 样式层
│   ├── os.css               # iOS 系统样式 (桌面, 灵动岛, 通知, 动画)
│   ├── wechat.css           # 微信专用样式 (气泡, 朋友圈, 支付弹窗)
│   └── apps.css             # 其他 App 通用样式
├── js/
│   ├── os.js                # OS 核心逻辑 (时间, 图标渲染, App 切换)
│   ├── api.js               # LLM API 封装 (流式响应, Key 管理)
│   ├── store.js             # 数据持久化 (LocalStorage 包装)
│   ├── utils.js             # 工具函数 (时间格式化, 编码处理)
│   ├── apps/                # 应用逻辑模块
│   │   ├── wechat/          # 微信独立模块
│   │   │   ├── main.js      # 入口与路由
│   │   │   ├── chat.js      # 聊天渲染与发送
│   │   │   ├── ai.js        # AI 核心 (Prompt, 记忆)
│   │   │   └── data.js      # 数据管理 (好友, 朋友圈)
│   │   ├── weibo.js         # 微博逻辑
│   │   ├── worldbook.js     # 世界书逻辑
│   │   └── settings.js      # 设置逻辑
└── assets/                  # 静态资源 (禁止硬编码 Base64)
```

## 3. 功能需求详解 (Detailed Features)

### A. iOS 仿真桌面 (Desktop & System)
- **布局**:
  - 分页显示应用图标（支持网格布局）。
  - **Dock 栏**: 底部毛玻璃悬浮，固定 4 个常用 App。
  - **小组件**: 包含音乐播放器组件（封面、控制）。
- **交互**: App 打开/关闭缩放动画，底部 HomeBar 手势。
- **外观**: 支持深色/浅色模式，自定义壁纸。

### B. 仿真微信 (WeChat - Core App)
需像素级复刻 iOS 微信 UI。
- **基础通讯**:
  - 支持文本、表情、图片（上传）、语音（TTS）、视频（气泡+播放）。
  - 消息撤回、引用回复、长按菜单。
  - 特色功能：转账交互、拍一拍。
- **AI 角色扮演 (The Soul)**:
  - **酒馆卡导入**: 支持 Tavern Card (PNG/JSON)，必须处理 ArrayBuffer/UTF-8 防止乱码。
  - **人设管理**: 修改头像、昵称、设定。
  - **记忆系统**: 聊天记录总结，世界书词条检索。
- **社交圈**:
  - 朋友圈信息流（点赞、评论）。
  - 通讯录（字母索引）。

### C. 其他生态应用
- **微博**: 热搜榜、个人主页、发帖。
- **小剧场**: 文字剧情模式。
- **世界书**: 词条查阅与编辑。
- **淘宝**: 模拟电商活动页。
- **游戏**: HTML5 小游戏容器。

## 4. 技术约束 (Technical Constraints)
1.  **代码规范**: 严禁面条代码，必须使用 `import/export` 模块化开发。
2.  **资源管理**: 严禁将图片转为 Base64 硬编码在 JS 中，必须使用 `assets/` 或 `URL.createObjectURL`。
3.  **编码安全**: 文件上传（如酒馆卡）必须显式指定编码（UTF-8），防止中文乱码。
4.  **文档维护**: 持续维护 `BLUEPRINT.md` 作为项目真理来源。

## 5. 执行计划 (Execution Plan)

### Step 1: 蓝图与骨架 (Current)
- 生成本蓝图文件。
- 创建目录结构。
- 实现 `index.html` 和 `css/os.css`。

### Step 2: 核心系统
- 实现 `js/os.js` (图标渲染, 音乐组件)。
- 实现 `js/store.js` (数据层)。

### Step 3: 微信 UI 框架
- 搭建微信 App 基础界面 (TabBar)。
