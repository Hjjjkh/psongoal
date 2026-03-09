# 🎯 P ESG (Personal Execution System)

> 一个专注于"强制执行"的个人目标管理系统，通过"每日唯一承诺"机制，帮助你真正达成目标

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Zeabur](https://img.shields.io/badge/Deploy-Zeabur-6C5DD3?logo=vercel)](https://zeabur.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 项目简介

**PES** (Personal Execution System) 是一个革命性的个人目标管理系统，采用独特的"每日唯一承诺"机制，帮你将长期目标拆解为可执行的每日行动。

### 🎯 核心设计哲学

> **"一天，一个承诺，强制聚焦"**

传统待办事项应用的失败原因：
- ❌ 任务太多，选择困难
- ❌ 缺乏优先级，什么都想做
- ❌ 没有完成标准，容易拖延
- ❌ 无法坚持，动力衰减

PES 的解决方案：
- ✅ **每日唯一承诺** - 强制聚焦最重要的事
- ✅ **明确的完成标准** - 每个 Action 必须客观可判断
- ✅ **不可跳过机制** - 未完成不能推进，培养执行力
- ✅ **阶段产出导向** - 强调里程碑而非碎片任务

---

## ✨ 核心特性

| 特性 | 描述 |
|------|------|
| 🎯 **每日唯一承诺** | 每天只设定一个核心 Action，强制专注 |
| 📊 **多阶段模板** | 预定义目标模板，快速创建复杂目标 |
| 🔔 **智能提醒** | 浏览器通知，不错过每日承诺 |
| 📈 **复盘看板** | 完成率、趋势、卡住阶段一目了然 |
| 💾 **数据导出** | JSON 格式导出/导入，数据自主可控 |
| 📱 **PWA 支持** | 可安装到手机/桌面，离线使用 |
| 🔒 **多用户隔离** | 完整的多用户架构，数据安全 |
| ⚡ **性能优化** | 乐观更新、防抖、自动重试 |
| 🎨 **现代化 UI** | shadcn/ui + Tailwind，极致体验 |
| 🛡️ **TypeScript** | 完整类型定义，代码健壮性 |

---

## 🏗️ 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **框架** | Next.js 14 (App Router) | 全栈 React 框架 |
| **UI** | shadcn/ui + Tailwind CSS | 组件库与样式 |
| **认证** | Supabase Auth | 用户身份管理 |
| **数据库** | Supabase (PostgreSQL) | 数据存储 |
| **部署** | Zeabur / Vercel | 云部署平台 |
| **类型** | TypeScript 5 | 静态类型检查 |
| **状态** | React Server Components | 服务端渲染 |

---

## 📋 核心功能

### 1. 今日行动 (`/today`)
- 显示当前目标、阶段、今日唯一 Action
- 清晰的完成标准展示
- 【完成】/【未完成】交互
- 记录难度和精力状态
- 可选专注计时器

### 2. 专注空间 (`/focus`)
- 主线 Action 突出显示
- 代办任务列表管理
- 25分钟番茄钟计时器
- 直接标记完成

### 3. 目标规划 (`/goals`)
- 创建 Goal（目标）
- 为 Goal 创建 Phase（阶段）
- 为 Phase 创建 Action（行动）
- 设置当前活跃目标
- 模板快速创建

### 4. 复盘看板 (`/dashboard`)
- 连续完成天数统计
- 各 Goal 进度追踪
- 识别卡住的阶段（>7天未完成）
- 历史记录与趋势图
- 难度/精力分析

### 5. 模板库 (`/templates`)
- 系统预设模板
- 个人自定义模板
- 多阶段模板支持
- 分类管理

### 6. 设置 (`/settings`)
- 每日提醒时间配置
- 数据导出/导入 (JSON)
- 一键清空数据
- 账户管理

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm / pnpm / yarn

### 安装依赖
\`\`\`bash
npm install
# 或
pnpm install
\`\`\`

### 环境配置
1. 复制 \`.env.example\` 为 \`.env\`
2. 配置 Supabase 项目密钥
3. (可选)配置 Zeabur/Vercel 环境变量

### 本地开发
\`\`\`bash
npm run dev
# 访问 http://localhost:3000
\`\`\`

### 构建部署
\`\`\`bash
npm run build
npm run start
\`\`\`

详细部署指南请参阅 [ZEABUR_DEPLOYMENT_GUIDE.md](./ZEABUR_DEPLOYMENT_GUIDE.md)

---

## 📁 项目结构

\`\`\`
psongoal/
├── app/                 # Next.js App Router 页面
├── components/          # React 组件
├── hooks/              # 自定义 Hooks
├── lib/                # 工具库
├── packages/           # 内部包
├── public/             # 静态资源
├── supabase/           # DB 迁移和配置
├── middleware.ts       # 中间件
├── next.config.js      # Next.js 配置
├── tailwind.config.ts  # Tailwind 配置
├── tsconfig.json       # TypeScript 配置
├── package.json        # 依赖清单
└── README.md           # 项目说明
\`\`\`

---

## 🤝 贡献指南

欢迎贡献代码、提出 Issue 或改善文档！

### 开发流程
1. Fork 本仓库
2. 创建分支 (\`git checkout -b feature/YourFeature\`)
3. 提交更改 (\`git commit -m 'feat: add new feature'\`)
4. 推送分支 (\`git push origin feature/YourFeature\`)
5. 开启 Pull Request

### 代码规范
- 遵循 [Next.js 最佳实践](https://nextjs.org/docs)
- 使用 ESLint + Prettier 统一代码风格
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org)

详细开发规范请参阅根目录下的 `_` 系列文档。

---

## 📚 相关文档

- [快速开始](./快速开始.md)
- [部署指南](./ZEABUR_DEPLOYMENT_GUIDE.md)
- [Supabase 配置](./Supabase_Auth_配置修复指南.md)
- [多平台开发方案](./多平台开发方案_不影响网页版.md)
- [UX 设计分析](./UX_DESIGN_ANALYSIS.md)

---

## 🙏 致谢

- 感谢 [Next.js](https://nextjs.org) 提供优秀框架
- 感谢 [Supabase](https://supabase.com) 提供后端服务
- 感谢 [shadcn/ui](https://ui.shadcn.com) 提供精美组件
- 感谢所有为个人生产力工具做出贡献的开发者

---

## 📮 联系方式

- **项目主页**: https://github.com/Hjjjkh/psongoal
- **在线演示**: [配置 Zeabur/Vercel 后提供]
- **问题反馈**: [GitHub Issues](https://github.com/Hjjjkh/psongoal/issues)

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Hjjjkh">李国强</a> |
<a href="https://github.com/Hjjjkh/psongoal/stargazers">⭐ Star us on GitHub</a>
</div>
