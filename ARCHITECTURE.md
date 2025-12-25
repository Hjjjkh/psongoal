# 系统架构说明

## 整体架构

个人目标执行系统（PES）采用前后端分离的架构，使用 Next.js 作为全栈框架，Supabase 作为后端服务。

```
┌─────────────────┐
│   Next.js App   │
│  (App Router)   │
├─────────────────┤
│  - /today       │  ← 核心执行页面
│  - /goals       │  ← 规划页面
│  - /dashboard   │  ← 复盘页面
│  - /auth/login  │  ← 认证页面
└────────┬────────┘
         │
         │ API Routes
         │
┌────────▼────────┐
│   Supabase     │
│  (PostgreSQL)  │
├────────────────┤
│  - Goals       │
│  - Phases      │
│  - Actions     │
│  - Executions  │
│  - SystemState │
└────────────────┘
```

## 数据流

### 1. 用户认证流程
```
用户登录 → Supabase Auth → 获取 Session → 存储 Cookie → 访问受保护页面
```

### 2. 今日行动流程
```
访问 /today → 获取 SystemState → 获取当前 Action → 显示完成标准
用户完成 → 调用 API → 记录 Execution → 推进到下一个 Action → 更新 SystemState
```

### 3. 目标规划流程
```
访问 /goals → 创建 Goal → 创建 Phase → 创建 Action → 设置当前目标
设置当前目标 → 更新 SystemState → 跳转到 /today
```

## 核心逻辑：SystemState 推进

### 推进规则
1. **完成检查**: 只有今天标记为"完成"的 Action 才能推进
2. **顺序执行**: Action 必须按 `order_index` 顺序完成
3. **阶段切换**: 当前 Phase 的最后一个 Action 完成后，自动切换到下一个 Phase 的第一个 Action
4. **目标完成**: 所有 Phase 完成后，SystemState 保持不变，等待用户手动设置新目标

### 推进逻辑代码位置
- `lib/system-state.ts`: 核心推进逻辑
- `app/api/complete-action/route.ts`: 完成 Action 的 API 端点

### 关键函数
- `getNextAction()`: 获取下一个 Action（如果当前已完成）
- `completeActionAndAdvance()`: 完成当前 Action 并推进
- `markActionIncomplete()`: 标记未完成（不推进）

## 数据库设计

### 表关系
```
Goal (1) ──→ (N) Phase
Phase (1) ──→ (N) Action
Action (1) ──→ (N) DailyExecution
User (1) ──→ (1) SystemState
```

### 关键约束
- SystemState 每个用户只有一行（id=1）
- Action 必须按 order_index 顺序执行
- DailyExecution 每天每个 Action 只能有一条记录（UNIQUE constraint）

## 安全机制

### Row Level Security (RLS)
所有表都启用了 RLS，确保用户只能访问自己的数据：
- Goals: `user_id = auth.uid()`
- Phases: 通过 Goal 的 user_id 验证
- Actions: 通过 Phase → Goal 的 user_id 验证
- DailyExecutions: `user_id = auth.uid()`
- SystemState: `user_id = auth.uid()`

### API 路由保护
所有 API 路由都检查用户认证：
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## 页面结构

### /today（核心页面）
- **服务端组件**: 获取当前 Action 数据
- **客户端组件**: TodayView 处理用户交互
- **功能**: 显示唯一 Action，记录完成情况

### /goals（规划页面）
- **服务端组件**: 获取所有 Goals 及其关联数据
- **客户端组件**: GoalsView 处理 CRUD 操作
- **功能**: 创建 Goal/Phase/Action，设置当前目标

### /dashboard（复盘页面）
- **服务端组件**: 计算统计信息
- **客户端组件**: DashboardView 展示数据
- **功能**: 显示进度、连续天数、卡住的阶段

## 技术选型理由

### Next.js App Router
- 支持服务端组件，减少客户端 JavaScript
- 内置 API Routes，无需单独后端
- 优秀的开发体验和性能

### Supabase
- 开箱即用的 PostgreSQL 数据库
- 内置认证系统
- Row Level Security 保障数据安全
- 实时能力（未来可扩展）

### shadcn/ui
- 基于 Radix UI，无障碍性好
- 可定制性强
- 组件质量高

## 扩展性考虑

### 未来可扩展功能
1. **实时同步**: 使用 Supabase Realtime
2. **移动端**: 使用 React Native 或 PWA
3. **数据分析**: 添加更详细的统计图表
4. **提醒功能**: 集成通知系统
5. **协作功能**: 支持团队目标（需要重构数据模型）

### 性能优化
- 使用 Next.js Image 优化图片（如需要）
- 实现数据缓存策略
- 使用 React Query 管理客户端状态（如需要）

