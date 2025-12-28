-- 添加提醒设置到 system_states 表
-- 用于存储用户的提醒偏好

ALTER TABLE system_states 
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time TIME;

-- 添加注释
COMMENT ON COLUMN system_states.reminder_enabled IS '是否启用每日提醒';
COMMENT ON COLUMN system_states.reminder_time IS '每日提醒时间（格式: HH:MM）';

