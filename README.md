# Dada（搭搭）- 活动社交平台

基于 React + Vite + Supabase 的线下活动社交平台，帮助用户发现和加入身边的各类活动。

![React](https://img.shields.io/badge/React-18-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5-green.svg)
![Supabase](https://img.shields.io/badge/Supabase-grey.svg)

---

## 功能特点

- 📋 **活动浏览**：发现附近的各类活动（篮球、学习、剧本杀、徒步等）
- ➕ **创建活动**：支持活动模板快速创建，自定义时间地点
- 📷 **活动相册**：多图上传，记录活动精彩瞬间
- 💬 **活动评论**：实时评论互动，触发通知
- 🔔 **通知系统**：评论、加入、被踢出等事件通知
- 🎁 **积分系统**：加入活动获得积分，积累信誉
- 📤 **活动分享**：一键分享活动到微信、朋友圈等

---

## 技术栈

- **前端**：React 18 + Vite + React Router
- **后端**：Supabase（PostgreSQL + Auth + Storage + Realtime）
- **样式**：CSS Variables + 毛玻璃效果 + 移动端适配

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Supabase

在 [Supabase](https://supabase.com) 创建项目后：

1. 将 `supabase-schema.sql` 中的 SQL 在 Supabase 控制台的 SQL Editor 中执行
2. 创建 `.env.local` 文件：

```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase anon key
```

### 3. 运行

```bash
npm run dev
```

---

## 项目结构

```
src/
├── components/       # 共享组件（Avatar, Navbar, TabBar, Toast 等）
├── pages/            # 页面组件
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   ├── ActivityDetail.jsx
│   ├── CreateActivity.jsx
│   └── ProfilePage.jsx
├── lib/
│   └── supabaseClient.js   # Supabase 客户端
├── utils/
│   └── helpers.js          # 工具函数
├── App.jsx
├── App.css
└── main.jsx
```

---

## 数据库

使用 Supabase PostgreSQL，主要表：

- `profiles` - 用户信息（含积分、信誉）
- `activities` - 活动信息
- `activity_members` - 活动成员关系
- `comments` - 活动评论
- `activity_photos` - 活动相册
- `notifications` - 通知

详细 Schema 见 `supabase-schema.sql`

---

## License

MIT
