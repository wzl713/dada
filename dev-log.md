# Dada 开发日志
密码：wzl100100wzl

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
- [ ] 在 Supabase 控制台创建项目，执行数据库 SQL
- [ ] 填写 `.env.local` 的真实密钥
- [ ] 实现 ActivityList.jsx
- [ ] 实现 CreateActivity.jsx
- [ ] 实现加入活动功能

---
