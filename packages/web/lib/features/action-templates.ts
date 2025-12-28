/**
 * 行动模板管理
 * 仅支持个人模板，不分享
 */

import { createClient } from '../supabase/server'

export interface ActionTemplate {
  id: string
  user_id: string
  category: 'health' | 'learning' | 'project' | 'custom'
  title: string
  definition: string
  estimated_time: number | null
  created_at: string
  updated_at: string
}

/**
 * 获取用户的所有行动模板
 */
export async function getUserActionTemplates(
  userId: string,
  category?: 'health' | 'learning' | 'project' | 'custom'
): Promise<ActionTemplate[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('action_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching action templates:', error)
    return []
  }

  return data || []
}

/**
 * 创建行动模板
 */
export async function createActionTemplate(
  userId: string,
  template: {
    category: 'health' | 'learning' | 'project' | 'custom'
    title: string
    definition: string
    estimated_time?: number | null
  }
): Promise<ActionTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('action_templates')
    .insert({
      user_id: userId,
      ...template,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating action template:', error)
    return null
  }

  return data
}

/**
 * 更新行动模板
 */
export async function updateActionTemplate(
  userId: string,
  templateId: string,
  updates: {
    title?: string
    definition?: string
    estimated_time?: number | null
    category?: 'health' | 'learning' | 'project' | 'custom'
  }
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('action_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating action template:', error)
    return false
  }

  return true
}

/**
 * 删除行动模板
 */
export async function deleteActionTemplate(
  userId: string,
  templateId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('action_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting action template:', error)
    return false
  }

  return true
}

