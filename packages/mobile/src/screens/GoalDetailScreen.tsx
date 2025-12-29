import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import {apiService} from '../services/api';

interface Phase {
  id: string;
  name: string;
  description?: string;
  order_index: number;
  actions: Action[];
}

interface Action {
  id: string;
  title: string;
  definition?: string;
  order_index: number;
  completed_at?: string;
}

interface Goal {
  id: string;
  name: string;
  category: string;
  status: string;
  phases: Phase[];
}

export default function GoalDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const goalId = route.params?.goalId;
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      if (goalId) {
        loadGoalDetail();
      }
    }, [goalId]),
  );

  const loadGoalDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGoals();
      if (response.success && response.data) {
        const goals = response.data as any[];
        const foundGoal = goals.find((g: any) => g.id === goalId);
        if (foundGoal) {
          // getGoals API 应该已经返回了完整的 phases 和 actions 数据
          // 如果 phases 存在但 actions 不在其中，需要单独加载
          let phases = foundGoal.phases || [];
          
          // 确保每个 phase 都有 actions 数组
          phases = phases.map((phase: any) => ({
            ...phase,
            actions: phase.actions || [],
          }));
          
          setGoal({
            id: foundGoal.id,
            name: foundGoal.name,
            category: foundGoal.category,
            status: foundGoal.status,
            phases: phases,
          });
        } else {
          Alert.alert('错误', '未找到目标');
          navigation.goBack();
        }
      } else {
        Alert.alert('错误', response.error || '加载目标详情失败');
      }
    } catch (error) {
      console.error('加载目标详情失败:', error);
      Alert.alert('错误', '加载目标详情失败，请检查网络连接');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGoalDetail();
  };

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleAddPhase = () => {
    navigation.navigate('CreatePhase', {goalId});
  };

  const handleAddAction = (phaseId: string) => {
    navigation.navigate('CreateAction', {phaseId});
  };

  const handleDeletePhase = (phaseId: string) => {
    Alert.alert('确认删除', '确定要删除这个阶段吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await apiService.deletePhase(phaseId);
            if (response.success) {
              loadGoalDetail();
            } else {
              Alert.alert('错误', response.error || '删除失败');
            }
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const handleDeleteAction = (actionId: string) => {
    Alert.alert('确认删除', '确定要删除这个行动吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await apiService.deleteAction(actionId);
            if (response.success) {
              loadGoalDetail();
            } else {
              Alert.alert('错误', response.error || '删除失败');
            }
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  // 阶段排序功能
  const handleMovePhaseUp = async (phaseIndex: number) => {
    if (phaseIndex === 0) return; // 已经是第一个，无法上移
    
    const sortedPhases = [...goal.phases].sort((a, b) => a.order_index - b.order_index);
    const newPhases = [...sortedPhases];
    [newPhases[phaseIndex - 1], newPhases[phaseIndex]] = [newPhases[phaseIndex], newPhases[phaseIndex - 1]];
    
    const phaseIds = newPhases.map(p => p.id);
    
    try {
      const response = await apiService.reorderPhases(phaseIds);
      if (response.success) {
        loadGoalDetail();
      } else {
        Alert.alert('错误', response.error || '排序失败');
      }
    } catch (error) {
      console.error('排序阶段失败:', error);
      Alert.alert('错误', '排序失败，请检查网络连接');
    }
  };

  const handleMovePhaseDown = async (phaseIndex: number) => {
    const sortedPhases = [...goal.phases].sort((a, b) => a.order_index - b.order_index);
    if (phaseIndex === sortedPhases.length - 1) return; // 已经是最后一个，无法下移
    
    const newPhases = [...sortedPhases];
    [newPhases[phaseIndex], newPhases[phaseIndex + 1]] = [newPhases[phaseIndex + 1], newPhases[phaseIndex]];
    
    const phaseIds = newPhases.map(p => p.id);
    
    try {
      const response = await apiService.reorderPhases(phaseIds);
      if (response.success) {
        loadGoalDetail();
      } else {
        Alert.alert('错误', response.error || '排序失败');
      }
    } catch (error) {
      console.error('排序阶段失败:', error);
      Alert.alert('错误', '排序失败，请检查网络连接');
    }
  };

  // 行动排序功能
  const handleMoveActionUp = async (phaseId: string, actionIndex: number) => {
    const phase = goal.phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const sortedActions = [...phase.actions].sort((a, b) => a.order_index - b.order_index);
    if (actionIndex === 0) return; // 已经是第一个，无法上移
    
    const newActions = [...sortedActions];
    [newActions[actionIndex - 1], newActions[actionIndex]] = [newActions[actionIndex], newActions[actionIndex - 1]];
    
    const actionIds = newActions.map(a => a.id);
    
    try {
      const response = await apiService.reorderActions(actionIds);
      if (response.success) {
        loadGoalDetail();
      } else {
        Alert.alert('错误', response.error || '排序失败');
      }
    } catch (error) {
      console.error('排序行动失败:', error);
      Alert.alert('错误', '排序失败，请检查网络连接');
    }
  };

  const handleMoveActionDown = async (phaseId: string, actionIndex: number) => {
    const phase = goal.phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const sortedActions = [...phase.actions].sort((a, b) => a.order_index - b.order_index);
    if (actionIndex === sortedActions.length - 1) return; // 已经是最后一个，无法下移
    
    const newActions = [...sortedActions];
    [newActions[actionIndex], newActions[actionIndex + 1]] = [newActions[actionIndex + 1], newActions[actionIndex]];
    
    const actionIds = newActions.map(a => a.id);
    
    try {
      const response = await apiService.reorderActions(actionIds);
      if (response.success) {
        loadGoalDetail();
      } else {
        Alert.alert('错误', response.error || '排序失败');
      }
    } catch (error) {
      console.error('排序行动失败:', error);
      Alert.alert('错误', '排序失败，请检查网络连接');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: {[key: string]: string} = {
      health: 'fitness-center',
      learning: 'school',
      project: 'work',
      custom: 'edit',
    };
    return icons[category] || 'flag';
  };

  const getCategoryColor = (category: string) => {
    const colors: {[key: string]: string} = {
      health: '#34C759',
      learning: '#007AFF',
      project: '#AF52DE',
      custom: '#8E8E93',
    };
    return colors[category] || '#8E8E93';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="error" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>目标不存在</Text>
        <Button
          title="返回"
          onPress={() => navigation.goBack()}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {/* 目标头部 */}
        <Card style={styles.headerCard}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, {backgroundColor: `${getCategoryColor(goal.category)}20`}]}>
              <Icon
                name={getCategoryIcon(goal.category)}
                size={32}
                color={getCategoryColor(goal.category)}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.goalName}>{goal.name}</Text>
              <View style={styles.goalMeta}>
                <Text style={styles.goalStatus}>{goal.status === 'active' ? '进行中' : goal.status === 'completed' ? '已完成' : '已暂停'}</Text>
                <Text style={styles.goalPhases}>
                  {goal.phases.length} 个阶段
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* 阶段列表 */}
        <View style={styles.phasesContainer}>
          {goal.phases.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="list" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>还没有阶段</Text>
              <Button
                title="添加第一个阶段"
                onPress={handleAddPhase}
                style={styles.emptyButton}
              />
            </Card>
          ) : (
            goal.phases
              .sort((a, b) => a.order_index - b.order_index)
              .map((phase, index) => (
                <Card key={phase.id} style={styles.phaseCard}>
                  <TouchableOpacity
                    onPress={() => togglePhase(phase.id)}
                    activeOpacity={0.7}>
                    <View style={styles.phaseHeader}>
                      <View style={styles.phaseNumber}>
                        <Text style={styles.phaseNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.phaseInfo}>
                        <Text style={styles.phaseName}>{phase.name}</Text>
                        {phase.description && (
                          <Text style={styles.phaseDescription} numberOfLines={1}>
                            {phase.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.phaseActions}>
                        {/* 排序按钮 */}
                        <IconButton
                          name="arrow-upward"
                          onPress={() => handleMovePhaseUp(index)}
                          color="#8E8E93"
                          size={18}
                          disabled={index === 0}
                        />
                        <IconButton
                          name="arrow-downward"
                          onPress={() => handleMovePhaseDown(index)}
                          color="#8E8E93"
                          size={18}
                          disabled={index === goal.phases.length - 1}
                        />
                        <IconButton
                          name="add"
                          onPress={() => handleAddAction(phase.id)}
                          color="#007AFF"
                          size={20}
                        />
                        <IconButton
                          name="delete"
                          onPress={() => handleDeletePhase(phase.id)}
                          color="#FF3B30"
                          size={20}
                        />
                        <Icon
                          name={
                            expandedPhases.has(phase.id)
                              ? 'expand-less'
                              : 'expand-more'
                          }
                          size={24}
                          color="#8E8E93"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {expandedPhases.has(phase.id) && (
                    <View style={styles.actionsContainer}>
                      {phase.actions.length === 0 ? (
                        <View style={styles.emptyActions}>
                          <Text style={styles.emptyActionsText}>
                            还没有行动
                          </Text>
                          <Button
                            title="添加行动"
                            onPress={() => handleAddAction(phase.id)}
                            variant="secondary"
                            style={styles.addActionButton}
                          />
                        </View>
                      ) : (
                        phase.actions
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((action, actionIndex) => (
                            <View key={action.id} style={styles.actionItem}>
                              <View style={styles.actionNumber}>
                                <Text style={styles.actionNumberText}>
                                  {index + 1}.{actionIndex + 1}
                                </Text>
                              </View>
                              <View style={styles.actionInfo}>
                                <View style={styles.actionHeader}>
                                  <Text style={styles.actionTitle}>
                                    {action.title}
                                  </Text>
                                  {action.completed_at && (
                                    <View style={styles.completedBadge}>
                                      <Icon name="check-circle" size={16} color="#34C759" />
                                    </View>
                                  )}
                                </View>
                                {action.definition && (
                                  <Text style={styles.actionDefinition}>
                                    {action.definition}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.actionActions}>
                                {/* 排序按钮 */}
                                <IconButton
                                  name="arrow-upward"
                                  onPress={() => handleMoveActionUp(phase.id, actionIndex)}
                                  color="#8E8E93"
                                  size={16}
                                  disabled={actionIndex === 0}
                                />
                                <IconButton
                                  name="arrow-downward"
                                  onPress={() => handleMoveActionDown(phase.id, actionIndex)}
                                  color="#8E8E93"
                                  size={16}
                                  disabled={actionIndex === phase.actions.length - 1}
                                />
                                <IconButton
                                  name="delete"
                                  onPress={() => handleDeleteAction(action.id)}
                                  color="#FF3B30"
                                  size={18}
                                />
                              </View>
                            </View>
                          ))
                      )}
                    </View>
                  )}
                </Card>
              ))
          )}
        </View>

        {/* 添加阶段按钮 */}
        {goal.phases.length > 0 && (
          <View style={styles.addPhaseContainer}>
            <Button
              title="添加阶段"
              onPress={handleAddPhase}
              variant="secondary"
              style={styles.addPhaseButton}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F2F2F7',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyButton: {
    marginTop: 24,
    minWidth: 160,
  },
  scrollView: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  goalStatus: {
    fontSize: 14,
    color: '#8E8E93',
  },
  goalPhases: {
    fontSize: 14,
    color: '#8E8E93',
  },
  phasesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 24,
  },
  phaseCard: {
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  phaseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  emptyActions: {
    alignItems: 'center',
    padding: 16,
  },
  emptyActionsText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  addActionButton: {
    minWidth: 120,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  actionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  actionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  actionInfo: {
    flex: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  completedBadge: {
    marginLeft: 8,
  },
  actionDefinition: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  addPhaseContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  addPhaseButton: {
    width: '100%',
  },
});

