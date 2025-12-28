-- ============================================
-- 初始化系统默认目标模板
-- 注意：这个脚本需要在实际用户环境中执行
-- 建议通过 API 初始化，而不是直接执行此 SQL
-- ============================================

-- 获取第一个用户 ID（用于系统模板）
DO $$
DECLARE
  system_user_id UUID;
  health_template_id UUID;
  learning_template_id UUID;
  project_template_id UUID;
BEGIN
  -- 获取第一个用户 ID
  SELECT id INTO system_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  -- 如果没有用户，使用一个固定的 UUID（不推荐，但可以工作）
  IF system_user_id IS NULL THEN
    system_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    RAISE WARNING 'No users found, using placeholder UUID. This is not recommended.';
  END IF;
  
  -- 如果已有系统模板，跳过
  IF EXISTS (SELECT 1 FROM goal_templates WHERE is_system = TRUE LIMIT 1) THEN
    RAISE NOTICE 'System templates already exist, skipping initialization';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Initializing system templates with user_id: %', system_user_id;
  
  -- 创建健康模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'health',
    '健身目标模板',
    '基础训练阶段',
    '建立基础体能和习惯

**训练原则：**
- 循序渐进，避免过度训练
- 注重动作质量而非数量
- 保持规律性，每周至少 3-4 次',
    TRUE
  )
  RETURNING id INTO health_template_id;
  
  RAISE NOTICE 'Created health template: %', health_template_id;
  
  -- 创建健康模板的阶段
  INSERT INTO goal_template_phases (goal_template_id, name, description, order_index)
  VALUES (
    health_template_id,
    '基础训练阶段',
    '建立基础体能和习惯

**训练原则：**
- 循序渐进，避免过度训练
- 注重动作质量而非数量
- 保持规律性，每周至少 3-4 次',
    0
  )
  RETURNING id INTO health_phase_id;
  
  -- 创建健康模板的行动
  INSERT INTO goal_template_actions (goal_template_id, phase_id, title_template, definition, estimated_time, order_index)
  VALUES
    (health_template_id, health_phase_id, '核心训练 Day {n}', '完成 3 组平板支撑，每组 60 秒', 15, 0),
    (health_template_id, health_phase_id, '有氧运动 Day {n}', '完成 30 分钟慢跑或快走', 30, 1);
  
  -- 创建学习模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'learning',
    '学习目标模板',
    '基础学习阶段',
    '建立学习习惯和基础知识

**学习方法：**
- 采用主动回忆法，提高记忆效率
- 定期复习，遵循艾宾浩斯遗忘曲线
- 理论与实践相结合',
    TRUE
  )
  RETURNING id INTO learning_template_id;
  
  RAISE NOTICE 'Created learning template: %', learning_template_id;
  
  -- 创建学习模板的阶段
  INSERT INTO goal_template_phases (goal_template_id, name, description, order_index)
  VALUES (
    learning_template_id,
    '基础学习阶段',
    '建立学习习惯和基础知识

**学习方法：**
- 采用主动回忆法，提高记忆效率
- 定期复习，遵循艾宾浩斯遗忘曲线
- 理论与实践相结合',
    0
  )
  RETURNING id INTO learning_phase_id;
  
  -- 创建学习模板的行动
  INSERT INTO goal_template_actions (goal_template_id, phase_id, title_template, definition, estimated_time, order_index)
  VALUES
    (learning_template_id, learning_phase_id, '学习 Day {n}', '完成 1 小时专注学习，并记录学习笔记', 60, 0),
    (learning_template_id, learning_phase_id, '复习 Day {n}', '复习前 3 天的学习内容，完成练习题', 45, 1);
  
  -- 创建项目模板
  INSERT INTO goal_templates (user_id, category, name, phase_name, phase_description, is_system)
  VALUES (
    system_user_id,
    'project',
    '项目目标模板',
    '项目启动阶段',
    '完成项目初始化和核心功能

**项目管理要点：**
- 明确项目目标和里程碑
- 每日复盘，及时调整计划
- 保持代码质量和文档同步',
    TRUE
  )
  RETURNING id INTO project_template_id;
  
  RAISE NOTICE 'Created project template: %', project_template_id;
  
  -- 创建项目模板的阶段
  INSERT INTO goal_template_phases (goal_template_id, name, description, order_index)
  VALUES (
    project_template_id,
    '项目启动阶段',
    '完成项目初始化和核心功能

**项目管理要点：**
- 明确项目目标和里程碑
- 每日复盘，及时调整计划
- 保持代码质量和文档同步',
    0
  )
  RETURNING id INTO project_phase_id;
  
  -- 创建项目模板的行动
  INSERT INTO goal_template_actions (goal_template_id, phase_id, title_template, definition, estimated_time, order_index)
  VALUES
    (project_template_id, project_phase_id, '项目任务 Day {n}', '完成当日计划的功能开发或任务', 120, 0),
    (project_template_id, project_phase_id, '项目复盘 Day {n}', '回顾当日进度，更新项目文档', 30, 1);
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'System templates initialized successfully!';
  RAISE NOTICE 'Created 3 templates with actions';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error initializing system templates: %', SQLERRM;
END $$;

-- 验证初始化结果
SELECT 
  gt.id,
  gt.name,
  gt.category,
  gt.is_system,
  COUNT(gta.id) as action_count
FROM goal_templates gt
LEFT JOIN goal_template_actions gta ON gt.id = gta.goal_template_id
WHERE gt.is_system = TRUE
GROUP BY gt.id, gt.name, gt.category, gt.is_system
ORDER BY gt.category;

