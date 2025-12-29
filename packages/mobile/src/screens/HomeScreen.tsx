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
import {apiService} from '../services/api';

interface Action {
  id: string;
  title: string;
  definition?: string;
  phase_name?: string;
  goal_name?: string;
  completed_at?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCompleted, setTodayCompleted] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTodayAction();
    }, []),
  );

  const loadTodayAction = async () => {
    try {
      setLoading(true);
      // 获取目标列表，找到当前目标
      const goalsResponse = await apiService.getGoals();
      if (goalsResponse.success && goalsResponse.data) {
        const goals = goalsResponse.data as any[];
        const currentGoal = goals.find((g: any) => g.is_current);
        
        if (currentGoal) {
          // 获取复盘数据，其中包含当前行动信息
          const dashboardResponse = await apiService.getDashboardData();
          if (dashboardResponse.success && dashboardResponse.data) {
            const dashboardData = dashboardResponse.data as any;
            
            // 检查今天是否已完成
            setTodayCompleted(dashboardData.todayCompleted || false);
            
            // 如果有当前行动且今天未完成，显示行动信息
            if (!dashboardData.todayCompleted && dashboardData.currentAction) {
              const currentAction = dashboardData.currentAction;
              setAction({
                id: currentAction.id,
                title: currentAction.title,
                definition: currentAction.definition,
                phase_name: currentAction.phase_name,
                goal_name: currentGoal.name,
              });
            } else {
              setAction(null);
            }
          } else {
            // 如果获取复盘数据失败，尝试从目标数据推断
            setAction(null);
            setTodayCompleted(false);
          }
        } else {
          setAction(null);
          setTodayCompleted(false);
        }
      } else {
        setAction(null);
        setTodayCompleted(false);
      }
    } catch (error) {
      console.error('加载今日行动失败:', error);
      setAction(null);
      setTodayCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTodayAction().finally(() => setRefreshing(false));
  };

  const handleGoToFocus = () => {
    navigation.navigate('Focus');
  };

  const handleGoToGoals = () => {
    navigation.navigate('Goals');
  };

  const handleMarkIncomplete = async () => {
    if (!action) {
      return;
    }

    Alert.alert('确认', '确定要标记为未完成吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        onPress: async () => {
          try {
            const response = await apiService.markActionIncomplete(action.id);
            if (response.success) {
              Alert.alert('成功', '已标记为未完成');
              // 重新加载数据
              await loadTodayAction();
            } else {
              Alert.alert('错误', response.error || '标记未完成失败');
            }
          } catch (error) {
            console.error('标记未完成失败:', error);
            Alert.alert('错误', '标记未完成失败，请检查网络连接');
          }
        },
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <SkeletonCard />
          </View>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
      <View style={styles.content}>
        {/* 页面标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>今日唯一行动</Text>
          <Text style={styles.subtitle}>
            {todayCompleted
              ? '今天已完成行动'
              : action
              ? '专注于完成当前行动'
              : '还没有设置当前目标'}
          </Text>
        </View>

        {!action ? (
          /* 无目标状态 */
          <AnimatedCard style={styles.emptyCard}>
            <Icon name="flag" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>还没有当前目标</Text>
            <Text style={styles.emptyText}>
              请先创建目标并设置为当前目标，然后开始执行
            </Text>
            <Button
              title="去创建目标"
              onPress={handleGoToGoals}
              style={styles.emptyButton}
            />
          </AnimatedCard>
        ) : todayCompleted ? (
          /* 已完成状态 */
          <AnimatedCard style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <Icon name="check-circle" size={64} color="#34C759" />
            </View>
            <Text style={styles.completedTitle}>今日行动已完成！</Text>
            <Text style={styles.completedText}>
              你已经完成了今天的行动，继续保持！
            </Text>
            <View style={styles.completedActions}>
              <Button
                title="查看复盘"
                onPress={() => navigation.navigate('Main', {screen: 'Dashboard'})}
                variant="secondary"
                style={styles.completedButton}
              />
              <Button
                title="标记未完成"
                onPress={handleMarkIncomplete}
                variant="secondary"
                style={styles.completedButton}
              />
            </View>
          </AnimatedCard>
        ) : (
          /* 有行动状态 */
          <>
            {/* 目标上下文 */}
            <AnimatedCard delay={0} style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Icon name="flag" size={20} color="#007AFF" />
                <Text style={styles.contextText}>{action.goal_name}</Text>
              </View>
              <View style={styles.contextDivider} />
              <View style={styles.contextRow}>
                <Icon name="list" size={20} color="#34C759" />
                <Text style={styles.contextText}>{action.phase_name}</Text>
              </View>
            </AnimatedCard>

            {/* 行动卡片 */}
            <AnimatedCard delay={100} style={styles.actionCard}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              {action.definition && (
                <Text style={styles.actionDefinition}>
                  {action.definition}
                </Text>
              )}
            </AnimatedCard>

            {/* 操作按钮 */}
            <View style={styles.actions}>
              <Button
                title="进入专注空间"
                onPress={handleGoToFocus}
                style={styles.primaryButton}
              />
              <Button
                title="查看所有目标"
                onPress={handleGoToGoals}
                variant="secondary"
                style={styles.secondaryButton}
              />
            </View>

            {/* 提示信息 */}
            <AnimatedCard delay={200} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Icon name="info" size={20} color="#007AFF" />
                <Text style={styles.tipTitle}>每日唯一行动</Text>
              </View>
              <Text style={styles.tipText}>
                每天只能完成一个行动，完成后系统会自动推进到下一个行动。
                专注于当前行动，不要分心。
            </Text>
          </AnimatedCard>
        </>
        )}
      </View>
    </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
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
  completedCard: {
    alignItems: 'center',
    padding: 32,
  },
  completedIcon: {
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 8,
  },
  completedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  completedActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  completedButton: {
    flex: 1,
  },
  contextCard: {
    marginBottom: 12,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  contextDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 8,
  },
  actionCard: {
    marginBottom: 16,
    padding: 20,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    lineHeight: 30,
  },
  actionDefinition: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
  },
  actions: {
    marginBottom: 16,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    marginBottom: 12,
  },
  tipCard: {
    marginBottom: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 22,
  },
});
