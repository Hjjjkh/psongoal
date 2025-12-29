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
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import SkeletonCard from '../components/SkeletonCard';
import AnimatedCard from '../components/AnimatedCard';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconButton from '../components/IconButton';
import {apiService} from '../services/api';

interface Goal {
  id: string;
  name: string;
  category: 'health' | 'learning' | 'project' | 'custom';
  status: 'active' | 'completed' | 'paused';
  is_current?: boolean;
  phases_count?: number;
  completed_phases?: number;
}

export default function GoalsScreen() {
  const navigation = useNavigation<any>();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
    }, []),
  );

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGoals();
      if (response.success && response.data) {
        const goalsData = response.data as any[];
        const formattedGoals: Goal[] = goalsData.map((g: any) => ({
          id: g.id,
          name: g.name,
          category: g.category || 'custom',
          status: g.status || 'active',
          is_current: g.is_current || false,
          phases_count: g.phases?.length || 0,
          completed_phases: g.phases?.filter((p: any) => p.completed).length || 0,
        }));
        setGoals(formattedGoals);
      }
    } catch (error) {
      console.error('加载目标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGoals().finally(() => setRefreshing(false));
  };

  const handleSetCurrent = async (goalId: string) => {
    try {
      const response = await apiService.setCurrentGoal(goalId);
      if (response.success) {
        Alert.alert('成功', '已设置为当前目标');
        loadGoals();
      } else {
        Alert.alert('错误', response.error || '设置失败，请重试');
      }
    } catch (error) {
      Alert.alert('错误', '设置失败，请重试');
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      '确认删除',
      `确定要删除目标"${goal.name}"吗？此操作无法撤销。`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteGoal(goal.id);
              if (response.success) {
                Alert.alert('成功', '目标已删除');
                loadGoals();
              } else {
                Alert.alert('错误', response.error || '删除失败，请重试');
              }
            } catch (error) {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ],
    );
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

  const getStatusText = (status: string) => {
    const texts: {[key: string]: string} = {
      active: '进行中',
      completed: '已完成',
      paused: '已暂停',
    };
    return texts[status] || '未知';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonCard />
        </View>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部操作栏 */}
      <View style={styles.header}>
        <Text style={styles.title}>目标管理</Text>
        <IconButton
          name="add"
          onPress={() => navigation.navigate('CreateGoal')}
          size={28}
          color="#007AFF"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="flag" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>还没有目标</Text>
            <Text style={styles.emptyText}>
              点击右上角 + 号，从模板库创建你的第一个目标
            </Text>
            <Button
              title="去模板库"
              onPress={() => navigation.navigate('Main', {screen: 'Templates'})}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          goals.map((goal, index) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => navigation.navigate('GoalDetail', {goalId: goal.id})}
              activeOpacity={0.7}>
              <AnimatedCard delay={index * 50} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                <View style={styles.goalIconContainer}>
                  <Icon
                    name={getCategoryIcon(goal.category)}
                    size={24}
                    color={getCategoryColor(goal.category)}
                  />
                </View>
                <View style={styles.goalInfo}>
                  <View style={styles.goalTitleRow}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    {goal.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>当前</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.goalMeta}>
                    <Text style={styles.goalStatus}>
                      {getStatusText(goal.status)}
                    </Text>
                    {goal.phases_count && (
                      <Text style={styles.goalPhases}>
                        {goal.completed_phases || 0}/{goal.phases_count} 阶段
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.goalActions}>
                  {!goal.is_current && goal.status === 'active' && (
                    <IconButton
                      name="play-arrow"
                      onPress={() => handleSetCurrent(goal.id)}
                      color="#34C759"
                      size={24}
                    />
                  )}
                  <IconButton
                    name="delete"
                    onPress={() => handleDeleteGoal(goal)}
                    color="#FF3B30"
                    size={24}
                  />
                </View>
              </View>

              {/* 进度条 */}
              {goal.phases_count && goal.phases_count > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            ((goal.completed_phases || 0) /
                              goal.phases_count) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </AnimatedCard>
            </TouchableOpacity>
          ))
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 160,
  },
  goalCard: {
    margin: 16,
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
  goalActions: {
    flexDirection: 'row',
    gap: 4,
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});
