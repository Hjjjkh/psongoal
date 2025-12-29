import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import {apiService} from '../services/api';

interface Action {
  id: string;
  title: string;
  definition?: string;
  phase_name?: string;
  goal_name?: string;
}

export default function FocusScreen() {
  const navigation = useNavigation<any>();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [difficulty, setDifficulty] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [showRating, setShowRating] = useState(false);
  const [todos, setTodos] = useState<any[]>([]);
  const [showTodos, setShowTodos] = useState(false);
  const [newTodoContent, setNewTodoContent] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadCurrentAction();
      loadTodos();
      return () => {
        // 清理定时器
        setIsTimerRunning(false);
      };
    }, []),
  );

  const loadTodos = async () => {
    try {
      const response = await apiService.getTodos();
      if (response.success && response.data) {
        setTodos((response.data as any[]).filter((t: any) => !t.checked));
      }
    } catch (error) {
      console.error('加载待办事项失败:', error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) {
      return;
    }

    try {
      setAddingTodo(true);
      const response = await apiService.createTodo(newTodoContent.trim());
      if (response.success) {
        setNewTodoContent('');
        await loadTodos();
      } else {
        Alert.alert('错误', response.error || '添加失败');
      }
    } catch (error) {
      Alert.alert('错误', '添加待办事项失败');
    } finally {
      setAddingTodo(false);
    }
  };

  const handleCompleteTodo = async (todoId: string) => {
    try {
      const response = await apiService.updateTodo(todoId, true);
      if (response.success) {
        await loadTodos();
      }
    } catch (error) {
      Alert.alert('错误', '完成待办事项失败');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const loadCurrentAction = async () => {
    try {
      setLoading(true);
      // 通过复盘 API 获取当前行动信息（包含在 dashboard 数据中）
      const dashboardResponse = await apiService.getDashboardData();
      if (dashboardResponse.success && dashboardResponse.data) {
        const dashboardData = dashboardResponse.data as any;
        
        // 如果有当前行动，设置行动信息
        if (dashboardData.currentAction) {
          const currentAction = dashboardData.currentAction;
          setAction({
            id: currentAction.id,
            title: currentAction.title,
            definition: currentAction.definition,
            phase_name: currentAction.phase_name,
            goal_name: currentAction.goal_name || dashboardData.currentGoal?.name,
          });
        } else {
          // 如果没有当前行动，尝试从目标列表获取
          const goalsResponse = await apiService.getGoals();
          if (goalsResponse.success && goalsResponse.data) {
            const goals = goalsResponse.data as any[];
            const currentGoal = goals.find((g: any) => g.is_current);
            if (currentGoal) {
              // 即使没有当前行动，也显示目标信息
              setAction({
                id: '',
                title: '暂无当前行动',
                definition: '请先创建阶段和行动',
                phase_name: '',
                goal_name: currentGoal.name,
              });
            } else {
              setAction(null);
            }
          } else {
            setAction(null);
          }
        }
      } else {
        // 如果获取 dashboard 失败，尝试从目标列表获取
        const goalsResponse = await apiService.getGoals();
        if (goalsResponse.success && goalsResponse.data) {
          const goals = goalsResponse.data as any[];
          const currentGoal = goals.find((g: any) => g.is_current);
          if (currentGoal) {
            setAction({
              id: '',
              title: '暂无当前行动',
              definition: '请先创建阶段和行动',
              phase_name: '',
              goal_name: currentGoal.name,
            });
          } else {
            setAction(null);
          }
        } else {
          setAction(null);
        }
      }
    } catch (error) {
      console.error('加载行动失败:', error);
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimer(0);
  };

  const handleCompleteAction = async () => {
    if (!showRating) {
      setShowRating(true);
      return;
    }

    Alert.alert(
      '确认完成',
      '确定要完成这个行动吗？完成后将无法撤销。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '完成',
          style: 'default',
          onPress: async () => {
            try {
              setCompleting(true);
              if (!action) return;
              const response = await apiService.completeAction(
                action.id,
                difficulty,
                energy,
              );
              if (response.success) {
                Alert.alert('完成！', '行动已完成，继续加油！', [
                  {
                    text: '确定',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]);
              } else {
                Alert.alert('错误', response.error || '完成行动失败，请重试');
              }
            } catch (error) {
              Alert.alert('错误', '完成行动失败，请重试');
            } finally {
              setCompleting(false);
            }
          },
        },
      ],
    );
  };

  const renderRatingStars = (
    value: number,
    onChange: (value: number) => void,
    label: string,
  ) => {
    return (
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => {
                onChange(star);
                // 触觉反馈
                if (Platform.OS === 'ios') {
                  // @ts-ignore
                  const HapticFeedback = require('../components/HapticFeedback').HapticFeedback;
                  HapticFeedback.light();
                }
              }}
              activeOpacity={0.7}>
              <Icon
                name={star <= value ? 'star' : 'star-border'}
                size={32}
                color={star <= value ? '#FF9500' : '#C7C7CC'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingValue}>{value}/5</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!action) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="inbox" size={64} color="#C7C7CC" />
        <Text style={styles.emptyTitle}>暂无当前行动</Text>
        <Text style={styles.emptyText}>
          请先设置当前目标，然后开始执行
        </Text>
        <Button
          title="去设置目标"
          onPress={() => navigation.navigate('Main', {screen: 'Goals'})}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 目标上下文 */}
        <Card style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <Icon name="flag" size={20} color="#007AFF" />
            <Text style={styles.contextText}>{action.goal_name}</Text>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextHeader}>
            <Icon name="list" size={20} color="#34C759" />
            <Text style={styles.contextText}>{action.phase_name}</Text>
          </View>
        </Card>

        {/* 行动卡片 */}
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          {action.definition && (
            <Text style={styles.actionDefinition}>{action.definition}</Text>
          )}
        </Card>

        {/* 专注计时器 */}
        <Card style={styles.timerCard}>
          <Text style={styles.timerLabel}>专注时长</Text>
          <Text style={styles.timerValue}>{formatTime(timer)}</Text>
          <View style={styles.timerControls}>
            {!isTimerRunning ? (
              <TouchableOpacity
                style={[styles.timerButton, styles.startButton]}
                onPress={handleStartTimer}>
                <Icon name="play-arrow" size={24} color="#fff" />
                <Text style={styles.timerButtonText}>开始</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.timerButton, styles.pauseButton]}
                onPress={handlePauseTimer}>
                <Icon name="pause" size={24} color="#fff" />
                <Text style={styles.timerButtonText}>暂停</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.timerButton, styles.resetButton]}
              onPress={handleResetTimer}>
              <Icon name="refresh" size={24} color="#007AFF" />
              <Text style={[styles.timerButtonText, styles.resetButtonText]}>
                重置
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* 评分区域 */}
        {showRating && (
          <Card style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>完成评分</Text>
            {renderRatingStars(difficulty, setDifficulty, '难度评分')}
            <View style={styles.ratingDivider} />
            {renderRatingStars(energy, setEnergy, '精力评分')}
          </Card>
        )}

        {/* 待办事项 */}
        <Card style={styles.todosCard}>
          <TouchableOpacity
            style={styles.todosHeader}
            onPress={() => setShowTodos(!showTodos)}
            activeOpacity={0.7}>
            <View style={styles.todosHeaderLeft}>
              <Icon name="checklist" size={20} color="#007AFF" />
              <Text style={styles.todosTitle}>
                待办事项 {todos.length > 0 && `(${todos.length})`}
              </Text>
            </View>
            <Icon
              name={showTodos ? 'expand-less' : 'expand-more'}
              size={24}
              color="#8E8E93"
            />
          </TouchableOpacity>

          {showTodos && (
            <View style={styles.todosContent}>
              {/* 添加待办事项 */}
              <View style={styles.addTodoContainer}>
                <TextInput
                  style={styles.addTodoInput}
                  value={newTodoContent}
                  onChangeText={setNewTodoContent}
                  placeholder="添加待办事项..."
                  onSubmitEditing={handleAddTodo}
                />
                <TouchableOpacity
                  style={styles.addTodoButton}
                  onPress={handleAddTodo}
                  disabled={addingTodo || !newTodoContent.trim()}>
                  {addingTodo ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Icon name="add" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* 待办事项列表 */}
              {todos.length === 0 ? (
                <Text style={styles.emptyTodosText}>暂无待办事项</Text>
              ) : (
                todos.map(todo => (
                  <TouchableOpacity
                    key={todo.id}
                    style={styles.todoItem}
                    onPress={() => handleCompleteTodo(todo.id)}
                    activeOpacity={0.7}>
                    <Icon
                      name="radio-button-unchecked"
                      size={20}
                      color="#C7C7CC"
                    />
                    <Text style={styles.todoText}>{todo.content}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </Card>

        {/* 提示信息 */}
        <Card style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Icon name="lightbulb" size={20} color="#FF9500" />
            <Text style={styles.tipTitle}>专注提示</Text>
          </View>
          <Text style={styles.tipText}>
            • 专注于当前行动，避免分心{'\n'}
            • 完成后记得记录难度和精力评分{'\n'}
            • 每天只能完成一个行动
          </Text>
        </Card>
      </ScrollView>

      {/* 底部完成按钮 */}
      <View style={styles.footer}>
        {showRating && (
          <Button
            title="取消"
            onPress={() => setShowRating(false)}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}
        <Button
          title={
            completing
              ? '完成中...'
              : showRating
              ? '确认完成'
              : '完成行动'
          }
          onPress={handleCompleteAction}
          disabled={completing}
          style={styles.completeButton}
        />
      </View>
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
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    minWidth: 160,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  contextCard: {
    marginBottom: 12,
  },
  contextHeader: {
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
    marginBottom: 12,
    padding: 20,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    lineHeight: 32,
  },
  actionDefinition: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
  },
  timerCard: {
    marginBottom: 12,
    alignItems: 'center',
    padding: 24,
  },
  timerLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  pauseButton: {
    backgroundColor: '#FF9500',
  },
  resetButton: {
    backgroundColor: '#F2F2F7',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButtonText: {
    color: '#007AFF',
  },
  tipCard: {
    marginBottom: 12,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  completeButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
    marginBottom: 12,
  },
  ratingCard: {
    marginBottom: 12,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  ratingDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 16,
  },
  todosCard: {
    marginBottom: 12,
  },
  todosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todosHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  todosContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  addTodoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addTodoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addTodoButton: {
    padding: 8,
  },
  emptyTodosText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
});
