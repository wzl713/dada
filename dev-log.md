# Dada 开发日志

> 每次开发对话结束后追加一条记录。

---

## 2026-04-05 Session 1

### 完成内容
1. **产品设计**：确定 Dada（搭搭）为即时拼局平台 MVP，核心功能4个：登录、发布活动、浏览列表、加入活动
2. **项目结构设计**：确定 React + Vite + Supabase 技术栈，文件结构如下
   ```
   src/
     pages/        - LoginPage, ActivityList, CreateActivity
     components/   - Navbar
     styles/       - global.css
     supabaseClient.js
     App.jsx
     main.jsx
   ```
3. **数据库设计**：设计 `activities` 表、`activity_members` 表、`activities_with_count` 视图，含 RLS 策略
4. **基础框架搭建**：实际写入并 build 通过（0错误）
   - `src/main.jsx`
   - `src/App.jsx`（路由 + AuthContext）
   - `src/supabaseClient.js`
   - `src/styles/global.css`
   - `src/components/Navbar.jsx`
   - `src/pages/LoginPage.jsx`（完整登录/注册）
   - `src/pages/ActivityList.jsx`（占位）
   - `src/pages/CreateActivity.jsx`（占位）

### 待办
- [x] 在 Supabase 控制台创建项目，执行数据库 SQL
- [x] 填写 `.env.local` 的真实密钥
- [x] 实现 ActivityList.jsx
- [x] 实现 CreateActivity.jsx
- [x] 实现加入活动功能

---

## 2026-04-05 Session 2

### 完成内容
1. **Supabase 配置**：用户创建项目，获取 URL 和 anon key，写入 `.env.local`
2. **数据库建表**：用户在 SQL Editor 执行建表 SQL（activities、activity_members、视图）成功
3. **ActivityCard.jsx**：活动卡片组件，显示标题/时间/地点/人数，支持加入/已加入/已满/创建者四种状态
4. **ActivityList.jsx**：活动列表页，从 `activities_with_count` 视图读取数据，按时间排序，空态提示
5. **CreateActivity.jsx**：发布活动页，表单字段（标题、描述、地点、时间、人数），提交后跳回首页
6. **加入活动功能**：插入 `activity_members` 表，UNIQUE 约束防重复，加入后刷新列表

### 验证
- `npm run build` 通过（70 模块，0 错误）
- `npm run dev` 启动成功

### MVP 全部核心功能完成 ✅

---

## 2026-04-05 Session 3

### 完成内容
1. **数据库迁移 SQL**：`supabase-migration-friends-messages.sql`
   - `profiles` 表（用户昵称，RLS：所有人可读，本人可改）
   - `friendships` 表（好友关系，pending/accepted/rejected 三态，唯一索引防重复，RLS）
   - `messages` 表（私信，索引优化，RLS）
2. **活动详情页** `ActivityDetail.jsx`：显示完整标题/时间/地点/描述/人数，发布者信息（可点击进入 TA 主页），参与者列表（可点击进入对方主页），底部操作按钮（加入/取消/删除）
3. **他人用户主页** `UserProfile.jsx`：展示对方昵称、发布的活动列表，好友状态管理（加好友/已申请/收到申请同意拒绝/已是好友），发私信入口
4. **好友申请逻辑**：发送申请 → pending 状态，对方同意 → accepted，拒绝 → rejected，双方都能查到关系
5. **私信列表页** `MessageList.jsx`：按对方分组展示聊天会话，显示最后一条消息和时间
6. **聊天页** `ChatPage.jsx`：消息气泡 UI，非好友限制最多 5 条消息（达上限提示加好友），好友无限制，Enter 发送
7. **好友管理页** `FriendManage.jsx`：待处理好友申请（同意/拒绝），好友列表（点击进主页/发私信）
8. **Navbar 更新**：新增 💬 消息图标入口，跳转私信列表
9. **ProfilePage 更新**：新增私信入口、好友管理入口（带未读申请数 badge）
10. **ActivityCard 更新**：点击卡片进入活动详情页

### 新增文件
- `src/pages/ActivityDetail.jsx`
- `src/pages/UserProfile.jsx`
- `src/pages/MessageList.jsx`
- `src/pages/ChatPage.jsx`
- `src/pages/FriendManage.jsx`
- `supabase-migration-friends-messages.sql`

### 新增路由
| 路由 | 页面 |
|------|------|
| `/activity/:id` | 活动详情 |
| `/user/:userId` | 他人主页 |
| `/messages` | 私信列表 |
| `/messages/:userId` | 聊天页 |
| `/profile/friends` | 好友管理 |

### 验证
- `npm run build` 通过（76 模块，0 错误）

### 待办
- [ ] 用户需要在 Supabase SQL Editor 执行 `supabase-migration-friends-messages.sql`

---

## 2026-04-05 Session 4

### 完成内容
1. **编辑活动功能** `EditActivity.jsx`：创建者可修改自己发布活动的标题、描述、地点、时间、人数，权限校验（非创建者自动跳转）
2. **活动详情页增强** `ActivityDetail.jsx`：
   - 过期活动顶部红色提示「该活动已结束」
   - 活动描述独立区块展示（带分隔线）
   - 创建者底部新增「✏️ 编辑活动」按钮（过期后隐藏）
   - 过期后隐藏加入/取消/编辑操作按钮
3. **我参与的活动** `ProfilePage.jsx`：
   - 新增 Tab 切换：「我发布的」和「我加入的」
   - 各显示对应活动列表，标注过期状态
4. **活动状态管理（过期自动标记）**：
   - `ActivityCard.jsx`：过期活动显示红色「已结束」标签，卡片降低透明度，隐藏操作按钮
   - `ActivityList.jsx`：排序优化——未过期在前（按时间升序），已过期在后（最近的过期活动在前）
   - `UserProfile.jsx`：TA 发布的活动也显示过期标记

### 新增文件
- `src/pages/EditActivity.jsx`

### 新增路由
| 路由 | 页面 |
|------|------|
| `/edit/:id` | 编辑活动 |

### 修改文件
- `src/App.jsx`（新增 EditActivity 路由）
- `src/pages/ActivityDetail.jsx`（过期状态 + 编辑按钮）
- `src/pages/ProfilePage.jsx`（我发布的/我加入的 Tab）
- `src/components/ActivityCard.jsx`（过期标记）
- `src/pages/ActivityList.jsx`（排序优化）
- `src/pages/UserProfile.jsx`（过期标记）

### 验证
- `npm run build` 通过（77 模块，0 错误）

---

## 2026-04-05 Session 5

### 修复问题
1. **用户名显示为字母数字**：所有查 profiles.nickname 的地方，当 nickname 为 null 时 fallback 到 `userId.slice(0, 8)`，显示为一堆乱码。修改为 `用户XXXXXX` 格式更友好
2. **ensureProfile 增强**：不仅创建缺失的 profile，还修复已有 profile 但 nickname 为 null 的老用户
3. **页面加载不阻塞**：ensureProfile 改为后台异步执行，不再 await 阻塞 `setLoading(false)`，避免白屏

### 修改文件
- `src/App.jsx`（ensureProfile 不阻塞 + 修复空昵称）
- `src/pages/ActivityDetail.jsx`（getNickname 兜底）
- `src/pages/UserProfile.jsx`（昵称兜底 + 不再显示「用户不存在」）
- `src/pages/MessageList.jsx`（昵称兜底）
- `src/pages/ChatPage.jsx`（昵称兜底）
- `src/pages/FriendManage.jsx`（昵称兜底）

### 新增文件
- `supabase-fix-profiles.sql`（数据库触发器 + 历史数据修复）

### 验证
- `npm run build` 通过（77 模块，0 错误）

### 待办
- [ ] 用户需要在 Supabase SQL Editor 执行 `supabase-fix-profiles.sql`（自动创建触发器 + 补全历史数据）

---

## 2026-04-05 Session 6

### 新增功能
1. **消息通知系统**：
   - 新增 `notifications` 表，支持类型：加入活动、好友申请、好友通过、新私信
   - 数据库触发器自动发送通知（加入活动、好友申请、好友通过）
   - `Notifications.jsx` 通知列表页面（未读标记、全部已读、点击跳转）
   - `Navbar` 增加通知入口，带未读角标（30秒轮询）

2. **搜索/筛选**：
   - 首页搜索栏支持关键词搜索（标题+描述+地点），300ms 防抖
   - 筛选面板：活动类型（运动/学习/美食/游戏/户外/娱乐/社交/其他）、时间范围（今天/明天/本周/本月）、地点关键词
   - `ActivityCard` 显示活动类型标签
   - `CreateActivity` / `EditActivity` 增加类型选择
   - `activities` 表新增 `category` 字段

3. **图片上传**：
   - Supabase Storage 配置（avatars + covers 桶，RLS 策略）
   - `src/utils/upload.js` 上传工具（文件校验 + 自动压缩）
   - `ProfilePage` 支持上传/更换头像，所有页面统一显示真实头像
   - `CreateActivity` 支持上传活动封面图
   - `ActivityDetail` 显示封面图
   - `profiles` 表新增 `avatar_url`，`activities` 表新增 `cover_url`

4. **第三方登录**：
   - `LoginPage` 重写，支持三种登录方式切换
   - 邮箱登录/注册（原有功能）
   - 手机号 OTP 登录（signInWithOtp + verifyOtp，60秒倒计时）
   - 微信 OAuth 登录（signInWithOAuth）
   - 登录方式 Tab 切换 UI

### 新增文件
- `src/pages/Notifications.jsx`
- `src/utils/upload.js`
- `supabase-migration-features.sql`（notifications + category + avatar_url + cover_url + 触发器）
- `supabase-migration-storage.sql`（Storage buckets + RLS 策略）

### 新增路由
| 路由 | 页面 |
|------|------|
| `/notifications` | 通知列表 |

### 修改文件
- `src/App.jsx`（新增通知路由）
- `src/components/Navbar.jsx`（通知入口 + 未读角标）
- `src/pages/ActivityList.jsx`（搜索 + 筛选）
- `src/pages/CreateActivity.jsx`（封面上传 + 类型选择）
- `src/pages/EditActivity.jsx`（类型选择）
- `src/pages/ActivityDetail.jsx`（封面图 + Avatar 组件 + 类型标签）
- `src/pages/ProfilePage.jsx`（头像上传 + 通知入口）
- `src/pages/LoginPage.jsx`（手机号 + 微信登录）
- `src/pages/UserProfile.jsx`（头像显示）
- `src/pages/ChatPage.jsx`（头像显示）
- `src/pages/MessageList.jsx`（头像显示）
- `src/pages/FriendManage.jsx`（头像显示）
- `src/components/ActivityCard.jsx`（类型标签）

### 待办
- [x] 执行 `supabase-migration-features.sql`（notifications 表 + category 字段 + 触发器）
- [x] 执行 `supabase-migration-storage.sql`（Storage 桶 + RLS 策略）
- [ ] Supabase Dashboard 配置手机号 SMS Provider（如阿里云 SMS / Twilio）
- [ ] Supabase Dashboard 配置微信 OAuth（微信开放平台应用）

### 验证
- `npm run build` 通过（79 模块，0 错误）

---

## 2026-04-05 Session 7

### 完成内容
1. **SQL 文件合并**：5 个 SQL 文件合并为 `supabase-schema.sql`
   - supabase-fix-profiles.sql（已删除）
   - supabase-fix-profiles-v2.sql（已删除）
   - supabase-migration-friends-messages.sql（已删除）
   - supabase-migration-features.sql（已删除）
   - supabase-migration-storage.sql（已删除）
   - → `supabase-schema.sql`（完整数据库定义，含表、视图、触发器、RLS、Storage）

2. **项目文件清理**：
   - 删除 `ui-design.html`（早期 UI 原型，已无用）
   - 删除 `dist/`（构建产物，随时可重新 build）

### 当前项目文件结构
```
Dada/
  src/
    pages/          - 11 个页面
    components/     - 2 个组件
    styles/         - 全局样式
    utils/          - 上传工具
    supabaseClient.js
    App.jsx
    main.jsx
  supabase-schema.sql   - 唯一的数据库定义文件
  dev-log.md            - 开发日志
  package.json / vite.config.js / eslint.config.js / index.html
```

### 待办
- [ ] 配置手机号 SMS Provider（可选）
- [ ] 配置微信 OAuth（可选）

---

## 2026-04-06 Session 8（三阶段大升级）

### 第一阶段：UI/UX 全面优化
1. **全局样式重构** `global.css`：
   - CSS 变量系统（颜色、圆角、阴影）
   - 毛玻璃导航栏（backdrop-filter）
   - 按钮体系（primary/outline/ghost/accent）
   - 骨架屏 shimmer 动画
   - Toast 提示系统
   - 空态组件样式
   - 移动端 safe-area 适配
   - 平滑滚动隐藏滚动条

2. **底部 Tab 导航** `TabBar.jsx`：
   - 5 个 Tab：首页/通知/发布(中心突出)/消息/我的
   - 未读通知角标（30s 轮询）
   - 活动页面自动显示 TabBar

3. **共享组件**：
   - `Avatar.jsx`：统一头像组件
   - `Skeleton.jsx`：骨架屏（列表/详情/个人主页/消息 4 种）
   - `Toast.jsx`：Toast 提示 Provider + useToast hook

4. **Navbar 简化**：通知/消息移到底部 Tab，Navbar 只保留标题+头像

5. **工具函数** `helpers.js`：
   - `formatTime()`（今天/明天/日期格式）
   - `timeAgo()`（相对时间）
   - `formatShortTime()`
   - `getUserInfo()`

6. **各页面升级**：
   - ActivityList：骨架屏、空态插画、搜索栏美化
   - ActivityCard：封面图、覆盖层类型标签、pill 按钮
   - ActivityDetail：骨架屏、固定底部按钮、渐变加入按钮
   - CreateActivity：模板快速创建（4 个预设模板）
   - ProfilePage：骨架屏、Toast 反馈、功能列表美化
   - LoginPage：渐变背景、毛玻璃 Logo 卡片
   - Notifications：骨架屏、头像显示、相对时间
   - UserProfile：骨架屏、Toast

### 第二阶段：提升活跃度
1. **活动评论区** `CommentSection.jsx`：
   - 发送评论（触发通知给创建者）
   - 删除自己的评论
   - 用户头像+昵称+相对时间
   - 空态提示

2. **活动分享** `ShareButton.jsx`：
   - 原生 Share API（移动端分享菜单）
   - 复制链接 fallback
   - 下拉菜单 UI

3. **活动相册** `PhotoGallery.jsx`：
   - 多图上传
   - 3 列网格展示
   - 点击查看大图
   - 删除自己的照片

4. **数据库新增**：
   - `comments` 表（评论，RLS：所有人可读，本人可发/删）
   - `activity_photos` 表（照片记录）
   - `photos` Storage 桶
   - 评论通知触发器（`new_comment` 类型）

### 第三阶段：扩展场景
1. **活动模板**：
   - CreateActivity 集成 4 个预设模板（篮球/学习/剧本杀/徒步）
   - 一键填充标题、描述、类型、地点、人数

2. **积分/信誉体系**：
   - profiles 增加 `points` 和 `reputation` 字段
   - 加入活动触发器：参与者 +5 积分，创建者 +2 积分
   - ProfilePage 显示积分和信誉分
   - UserProfile 显示信誉等级标签（极佳/良好/一般/较低）

3. **数据库更新**：
   - `activities.points_reward`（积分奖励）
   - `profiles.points`、`profiles.reputation`
   - `photos` Storage 桶 + RLS
   - 积分触发器 `award_join_points`

### 新增/修改文件清单
新增：
- `src/components/Avatar.jsx`
- `src/components/TabBar.jsx`
- `src/components/Skeleton.jsx`
- `src/components/Toast.jsx`
- `src/components/CommentSection.jsx`
- `src/components/PhotoGallery.jsx`
- `src/components/ShareButton.jsx`
- `src/components/index.js`
- `src/utils/helpers.js`

修改（全部页面 + 全局样式）：
- `src/styles/global.css`
- `src/App.jsx`
- `src/components/Navbar.jsx`
- `src/pages/ActivityList.jsx`
- `src/pages/ActivityDetail.jsx`
- `src/pages/CreateActivity.jsx`
- `src/pages/EditActivity.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/ProfilePage.jsx`
- `src/pages/UserProfile.jsx`
- `src/pages/Notifications.jsx`
- `supabase-schema.sql`

### 待办（需用户在 Supabase 执行）
- [ ] 重新执行 `supabase-schema.sql`（新增 comments、activity_photos 表 + photos 桶 + 积分字段 + 新触发器）

### 验证
- `npm run build` 通过（87 模块，0 错误，0 警告）

---
