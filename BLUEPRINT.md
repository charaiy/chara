# CharaOS (Ultimate Edition) - 系统架构蓝图

## 1. 系统架构 (System Architecture)

### 1.1 核心设计理念
- **模块化 (Modularity)**: 强制分离关注点，UI 与 逻辑解耦。
- **数据驱动 (Data-Driven)**: 所有状态变更通过统一的数据流处理。
- **全知智能 (Omniscience)**: Siri 作为系统级守护进程，拥有最高权限读取核心数据。

### 1.2 目录结构 (Directory Structure)

```
project_root/
├── index.html                   # 系统入口 (Bootloader)
├── css/
│   ├── os.css                   # 系统级样式 (Dock, StatusBar, Island, Notifications)
│   ├── apps/
│   │   ├── settings.css         # 设置应用独立样式
│   │   ├── wechat.css           # 微信完整样式表
│   │   ├── weibo.css
│   │   ├── netease.css
│   │   └── ...
│   └── components/              # 通用组件样式
│       ├── buttons.css
│       ├── cards.css
│       └── typography.css
├── js/
│   ├── core/
│   │   ├── os.js                # OS Kernel (任务调度, 窗口管理, 时间流)
│   │   ├── siri.js              # [System Service] Siri 智能体核心
│   │   ├── store.js             # 统一数据存储层 (IndexedDB/LocalStorage Wrapper)
│   │   ├── api.js               # LLM Network Layer (OpenAI/Claude 适配器)
│   │   └── event_bus.js         # 系统级事件总线 (Pub/Sub)
│   ├── apps/
│   │   ├── settings/            # [Refactor Target] 设置应用
│   │   │   ├── index.js         # App Entry
│   │   │   ├── router.js        # 设置内路由
│   │   │   ├── api.js           # 设置相关数据接口
│   │   │   ├── pages/           # 具体设置页逻辑
│   │   │   │   ├── display.js
│   │   │   │   ├── general.js
│   │   │   │   ├── siri_cfg.js  # [NEW] Siri 设置
│   │   │   │   └── about.js
│   │   ├── wechat/              # [Core App] 模拟微信
│   │   │   ├── index.js         # [Entry] 应用入口
│   │   │   ├── services/        # [Logic Layer] 纯业务逻辑
│   │   │   │   ├── chat.js      # 消息收发, 记忆总结
│   │   │   │   ├── contacts.js  # 通讯录, 关系网, 酒馆卡导入
│   │   │   │   └── moments.js   # 朋友圈逻辑
│   │   │   ├── ui/              # [View Layer] 纯 DOM 操作
│   │   │   │   ├── views.js     # 主要页面渲染
│   │   │   │   ├── bubbles.js   # 气泡渲染工厂
│   │   │   │   └── components.js# 通用组件
│   │   │   └── extensions/      # [Plugin Layer] 独立功能扩展
│   │   │       ├── redpacket.js # 钱包, 转账, 亲属卡
│   │   │       └── voice_call.js# 语音/视频通话模拟
│   │   ├── character_phone/     # [Core App] 角色手机查看器
│   │   │   ├── index.js
│   │   │   └── viewer.js
│   │   ├── music/               # 网易云音乐
│   │   ├── offline/             # 线下活动模拟器
│   │   └── worldbook/           # 世界书/图鉴
│   └── utils/
│       ├── dom.js               # 下层 DOM 操作封装
│       ├── helpers.js           # 通用工具函数 (UUID, Merge)
│       ├── time.js              # 时间/日期管理
│       └── tavern.js            # 酒馆卡 (PNG) 解析
└── assets/
    ├── icons/
    ├── wallpapers/
    └── sounds/
```

## 2. 数据结构定义 (Data Structures)

### 2.1 User (玩家/主控)
```json
{
  "id": "user_001",
  "name": "Admin",
  "avatar": "assets/avatars/user.jpg",
  "settings": {
    "theme": "dark",
    "fontSize": 16,
    "wallpapers": {
      "lock": "wp_01.jpg",
      "home": "wp_02.jpg"
    }
  },
  "wallet": {
    "balance": 5000.00,
    "transactions": []
  }
}
```

### 2.2 Character (NPC 角色)
```json
{
  "id": "char_kafka_01",
  "name": "Kafka",
  "avatar": "assets/avatars/kafka.jpg",
  "personality": {
    "description": "优雅、神秘、喜爱听大提琴",
    "traits": ["elegant", "mysterious"],
    "voice_id": "v_kafka_01"
  },
  "relationships": {
    "user_001": { "affinity": 50, "status": "friendly" },
    "char_blade_02": { "affinity": 80, "status": "partner" }
  },
  "state": {
    "mood": "calm",
    "current_activity": "listening_music",
    "location": "home"
  },
  "memory": {
    "short_term": [],
    "long_term": ["summary_001", "summary_002"]
  }
}
```

### 2.3 Message (统一消息格式)
**CRITICAL**: `Character Phone` 功能依赖此结构的统一性。无论是 A 发给 B，还是 B 发给 A，都存储在同一个 Message 表中，仅通过 query 筛选。

```json
{
  "id": "msg_uuid_v4",
  "timestamp": 1705461600000,
  "sender_id": "char_kafka_01",
  "receiver_id": "user_001", // 或 group_id
  "type": "text", // text, image, voice, video_call, red_packet, system
  "content": {
    "text": "最近有空吗？",
    "src": null, // 图片或音频路径
    "meta": null // 转账金额、通话时长等元数据
  },
  "status": "read", // sent, delivered, read
  "context_id": "ctx_001" // 用于关联上下文摘要
}
```

### 2.4 SiriState (系统智能体状态)
```json
{
  "active": true,
  "config": {
    "personality_mode": "tsundere", // cold, gentle, tsundere, crazy
    "wake_word": "Hey Siri",
    "voice_enabled": true
  },
  "evolution": {
    "level": 3,
    "experience": 450, // 经验值，通过互动获取
    "affinity": 60     // 好感度
  },
  "memory_access": {
    "authorized_apps": ["wechat", "notes", "photos", "calendar"],
    "last_scan": 1705462000000
  }
}
```

## 3. 开发路线图 (Development Roadmap)

### Phase 1: Foundation & Refactoring (当前阶段)
- [ ] **重构 Settings**: 将 4000+ 行 `settings.js` 拆分为模块化结构。
- [ ] **建立 Core OS**: 完善 `os.js` 和 `store.js`，确保应用生命周期管理稳定。
- [ ] **实现 Siri 设置**: 在设置中增加 Siri 配置页。

### Phase 2: The Social Web (微信核心)
- [ ] **WeChat UI 复刻**: 1:1 还原 iOS 微信界面。
- [ ] **消息系统**: 实现统一的消息存储与收发逻辑。
- [ ] **角色手机 (Spy Mode)**: 实现基于 unified message store 的多视角查看器。

### Phase 3: Soul & Intelligence (Siri 集成)
- [ ] **Siri 唤醒与交互**: 实现长按触发、语音/文字输入界面。
- [ ] **全知逻辑连接**: 编写 Siri 读取 `store.js` 数据的接口。
- [ ] **LLM API 对接**: 对接实际的大模型接口，驱动角色回复和 Siri 思考。

### Phase 4: Ecosystem Expansion (生态完善)
- [ ] **朋友圈 (Moments)**: 基于关系网的动态生成。
- [ ] **其他应用**: 网易云、微博、世界书。
- [ ] **线下模式**: 图文冒险类交互。

## 4. Immediate Tasks (执行清单)
1.  备份现有 `js/apps/settings.js`。
2.  创建 `js/apps/settings/` 下的子文件 (`index.js`, `router.js`, `pages/*.js`)。
3.  迁移代码逻辑，同时清理无用代码。
4.  更新 `index.html` 引入新的模块入口。
