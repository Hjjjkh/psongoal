/**
 * API 服务层
 * 统一管理所有API调用
 */

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://psongoal.zeabur.app/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || '请求失败',
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误',
      };
    }
  }

  // 目标相关
  async getGoals() {
    return this.request('/goals');
  }

  async createGoal(goal: {
    name: string;
    category: string;
    start_date: string;
    end_date: string;
  }) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async deleteGoal(goalId: string) {
    return this.request(`/goals/${goalId}`, {
      method: 'DELETE',
    });
  }

  async setCurrentGoal(goalId: string) {
    return this.request('/set-current-goal', {
      method: 'POST',
      body: JSON.stringify({goal_id: goalId}),
    });
  }

  // 阶段相关
  async createPhase(phase: {
    goal_id: string;
    name: string;
    description?: string;
  }) {
    return this.request('/phases', {
      method: 'POST',
      body: JSON.stringify(phase),
    });
  }

  async deletePhase(phaseId: string) {
    return this.request(`/phases/${phaseId}`, {
      method: 'DELETE',
    });
  }

  async reorderPhases(phaseIds: string[]) {
    return this.request('/phases/reorder', {
      method: 'POST',
      body: JSON.stringify({phaseIds}),
    });
  }

  // 行动相关
  async createAction(action: {
    phase_id: string;
    title: string;
    definition?: string;
  }) {
    return this.request('/actions', {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async deleteAction(actionId: string) {
    return this.request(`/actions/${actionId}`, {
      method: 'DELETE',
    });
  }

  async reorderActions(actionIds: string[]) {
    return this.request('/actions/reorder', {
      method: 'POST',
      body: JSON.stringify({actionIds}),
    });
  }

  async completeAction(actionId: string, difficulty: number, energy: number) {
    return this.request('/complete-action', {
      method: 'POST',
      body: JSON.stringify({
        actionId,
        difficulty,
        energy,
      }),
    });
  }

  async markActionIncomplete(actionId: string) {
    return this.request('/mark-incomplete', {
      method: 'POST',
      body: JSON.stringify({
        actionId,
      }),
    });
  }

  // 模板相关
  async getGoalTemplates() {
    return this.request('/goal-templates');
  }

  async getGoalTemplate(templateId: string) {
    return this.request(`/goal-templates/${templateId}`);
  }

  async createGoalFromTemplate(templateId: string) {
    return this.request('/goals/create-from-template', {
      method: 'POST',
      body: JSON.stringify({template_id: templateId}),
    });
  }

  // 复盘相关
  async getDashboardData() {
    return this.request('/dashboard');
  }

  // 设置相关
  async getReminderSettings() {
    return this.request('/reminder-settings');
  }

  async updateReminderSettings(enabled: boolean, time?: string) {
    return this.request('/reminder-settings', {
      method: 'POST',
      body: JSON.stringify({
        enabled,
        time,
      }),
    });
  }

  async exportData() {
    return this.request('/export');
  }

  async importData(data: any) {
    return this.request('/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async clearAllData() {
    return this.request('/data/clear-all', {
      method: 'DELETE',
    });
  }

  // 待办事项相关
  async getTodos() {
    return this.request('/todos');
  }

  async createTodo(content: string) {
    return this.request('/todos', {
      method: 'POST',
      body: JSON.stringify({content}),
    });
  }

  async updateTodo(todoId: string, checked: boolean) {
    return this.request(`/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({checked}),
    });
  }

  async deleteTodo(todoId: string) {
    return this.request(`/todos/${todoId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

