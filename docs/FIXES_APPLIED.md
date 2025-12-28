# 修复应用说明

## 🔧 已修复的问题

### 1. 模板库服务器错误

#### 问题描述
- 选择模板库时出现服务器错误
- 可能是数据库表不存在或 RLS 策略问题

#### 修复内容
1. **增强 API 错误处理** (`app/api/action-templates/route.ts`)
   - 添加表不存在错误检测（错误码 42P01）
   - 返回更详细的错误信息
   - 区分不同类型的错误

2. **增强前端错误处理** (`components/action-template-selector.tsx`)
   - 添加响应状态检查
   - 添加友好的错误提示
   - 处理表不存在的情况

#### 为什么选择模板库功能
根据功能合理性分析：

**合理性评分**：⭐⭐⭐⭐ (4/5)

**符合核心理念**：
- ✅ **降低使用门槛**：帮助用户快速创建行动
- ✅ **个人使用**：模板库是个人功能，不分享
- ✅ **不破坏简单性**：放在不显眼位置，需要时访问
- ✅ **增强用户体验**：减少重复输入

**实施位置**：
- ✅ 在规划页面（`/goals`）添加入口
- ✅ 放在页面底部，不显眼位置
- ✅ 在创建行动时可以使用模板

**功能设计**：
- ✅ 仅个人模板，不分享
- ✅ 支持分类（health/learning/project/custom）
- ✅ 可以创建、查看、删除模板
- ✅ 在创建行动时可以选择模板

---

### 2. 时区处理问题（待修复）

#### 问题描述
- 使用 `toISOString()` 返回 UTC 时间，可能不是用户本地时间
- 不同时区的用户可能看到不同的"今天"

#### 当前实现
- `lib/utils.ts:108-109` - `formatDateForInput` 使用 `toISOString()`
- `lib/system-state.ts:192` - 使用 `toISOString().split('T')[0]`
- `app/today/page.tsx:58` - 使用 `toISOString().split('T')[0]`
- `app/api/complete-action/route.ts:76` - 使用 `toISOString().split('T')[0]`

#### 修复建议
**方案1**：统一使用 UTC（推荐，简单）
- 所有日期比较使用 UTC
- 在用户界面显示时转换为本地时间
- 优点：简单，一致
- 缺点：用户可能困惑

**方案2**：使用用户时区（复杂）
- 获取用户时区设置
- 所有日期计算使用用户时区
- 优点：用户体验好
- 缺点：复杂，需要时区设置功能

**推荐**：方案1（统一使用 UTC），在界面上明确说明

---

### 3. 状态更新原子性问题（待修复）

#### 问题描述
- 完成行动时，先更新 `daily_executions`，再更新 `actions.completed_at`
- 如果第二步失败，数据不一致

#### 当前实现
- `lib/system-state.ts:229-257` - 分两步更新

#### 修复建议
**方案**：使用数据库函数（PostgreSQL 函数）
```sql
CREATE OR REPLACE FUNCTION complete_action_and_advance(
  p_user_id UUID,
  p_action_id UUID,
  p_difficulty INTEGER,
  p_energy INTEGER,
  p_date DATE
) RETURNS JSON AS $$
DECLARE
  v_next_action_id UUID;
BEGIN
  -- 原子操作：在事务中完成所有更新
  -- 1. 更新 daily_executions
  -- 2. 更新 actions.completed_at
  -- 3. 获取下一个行动
  -- 返回结果
END;
$$ LANGUAGE plpgsql;
```

**当前状态**：需要创建数据库函数

---

### 4. 并发完成处理（部分修复）

#### 问题描述
- 如果用户快速点击完成按钮，可能同时发送多个请求
- 两个请求可能都通过检查（时间窗口）

#### 当前实现
- API 层检查（`complete-action/route.ts:66-93`）
- 系统状态层检查（`system-state.ts:206-227`）
- 数据库唯一约束（`daily_executions` 表）

#### 修复状态
- ✅ 已有双重检查
- ✅ 已有数据库唯一约束
- ⚠️ 但可能仍有时间窗口问题

#### 进一步修复建议
- 使用数据库锁或乐观锁
- 或依赖数据库唯一约束（当前方案）

---

### 5. 系统状态一致性（待修复）

#### 问题描述
- 如果行动/阶段被删除，系统状态可能不一致

#### 当前实现
- `system_states.current_action_id → actions.id` (ON DELETE SET NULL)
- `system_states.current_phase_id → phases.id` (ON DELETE SET NULL) - 但未设置外键约束
- `system_states.current_goal_id → goals.id` (ON DELETE SET NULL) - 但未设置外键约束

#### 修复建议
**方案**：添加外键约束
```sql
ALTER TABLE system_states
ADD CONSTRAINT fk_system_states_current_phase_id
FOREIGN KEY (current_phase_id) REFERENCES phases(id) ON DELETE SET NULL;

ALTER TABLE system_states
ADD CONSTRAINT fk_system_states_current_goal_id
FOREIGN KEY (current_goal_id) REFERENCES goals(id) ON DELETE SET NULL;
```

**当前状态**：需要添加外键约束

---

## 📋 修复优先级

### 已修复
1. ✅ **模板库服务器错误** - 增强错误处理

### 待修复（高优先级）
2. ⚠️ **时区处理** - 需要统一时区处理逻辑
3. ⚠️ **状态更新原子性** - 需要创建数据库函数
4. ⚠️ **系统状态一致性** - 需要添加外键约束

### 已部分修复
5. ✅ **并发完成处理** - 已有双重检查和唯一约束

---

## 🎯 下一步

### 立即执行
1. ✅ 测试模板库功能，确认错误已修复
2. ⚠️ 执行数据库迁移（如果未执行）
3. ⚠️ 检查 RLS 策略（如果未启用）

### 后续修复
1. 统一时区处理逻辑
2. 创建数据库函数确保原子性
3. 添加外键约束确保一致性

