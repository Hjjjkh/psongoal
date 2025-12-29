import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import {apiService} from '../services/api';

interface Todo {
  id: string;
  content: string;
  checked: boolean;
  created_at: string;
}

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newTodoContent, setNewTodoContent] = useState('');
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTodos();
    }, []),
  );

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTodos();
      if (response.success && response.data) {
        const todosData = response.data as Todo[];
        setTodos(todosData);
      } else {
        Alert.alert('错误', response.error || '加载待办事项失败');
      }
    } catch (error) {
      console.error('加载待办事项失败:', error);
      Alert.alert('错误', '加载待办事项失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTodos().finally(() => setRefreshing(false));
  };

  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) {
      return;
    }

    try {
      setAdding(true);
      const response = await apiService.createTodo(newTodoContent.trim());
      if (response.success && response.data) {
        await loadTodos(); // 重新加载列表
        setNewTodoContent('');
        setShowAddTodo(false);
      } else {
        Alert.alert('错误', response.error || '添加待办事项失败');
      }
    } catch (error) {
      console.error('添加待办事项失败:', error);
      Alert.alert('错误', '添加待办事项失败，请检查网络连接');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      const response = await apiService.updateTodo(todoId, !todo.checked);
      if (response.success) {
        await loadTodos(); // 重新加载列表
      } else {
        Alert.alert('错误', response.error || '更新待办事项失败');
      }
    } catch (error) {
      console.error('更新待办事项失败:', error);
      Alert.alert('错误', '更新待办事项失败，请检查网络连接');
    }
  };

  const handleDeleteTodo = (todoId: string) => {
    Alert.alert('确认删除', '确定要删除这个待办事项吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await apiService.deleteTodo(todoId);
            if (response.success) {
              await loadTodos(); // 重新加载列表
            } else {
              Alert.alert('错误', response.error || '删除失败');
            }
          } catch (error) {
            console.error('删除待办事项失败:', error);
            Alert.alert('错误', '删除失败，请检查网络连接');
          }
        },
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const activeTodos = todos.filter(t => !t.checked);
  const completedTodos = todos.filter(t => t.checked);

  return (
    <View style={styles.container}>
      {/* 添加待办事项输入框 */}
      {showAddTodo && (
        <Card style={styles.addCard}>
          <TextInput
            style={styles.addInput}
            value={newTodoContent}
            onChangeText={setNewTodoContent}
            placeholder="输入待办事项..."
            autoFocus
            multiline
          />
          <View style={styles.addActions}>
            <Button
              title="取消"
              onPress={() => {
                setShowAddTodo(false);
                setNewTodoContent('');
              }}
              variant="secondary"
              style={styles.addButton}
            />
            <Button
              title={adding ? '添加中...' : '添加'}
              onPress={handleAddTodo}
              disabled={adding || !newTodoContent.trim()}
              style={styles.addButton}
            />
          </View>
        </Card>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {!showAddTodo && (
          <View style={styles.header}>
            <Button
              title="添加待办事项"
              onPress={() => setShowAddTodo(true)}
              style={styles.addHeaderButton}
            />
          </View>
        )}

        {/* 未完成的待办事项 */}
        {activeTodos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>待完成 ({activeTodos.length})</Text>
            {activeTodos.map(todo => (
              <Card key={todo.id} style={styles.todoCard}>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleToggleTodo(todo.id)}
                  activeOpacity={0.7}>
                  <View style={styles.checkbox}>
                    {todo.checked ? (
                      <Icon name="check-circle" size={24} color="#34C759" />
                    ) : (
                      <Icon name="radio-button-unchecked" size={24} color="#C7C7CC" />
                    )}
                  </View>
                  <Text style={styles.todoText}>{todo.content}</Text>
                </TouchableOpacity>
                <IconButton
                  name="delete"
                  onPress={() => handleDeleteTodo(todo.id)}
                  color="#FF3B30"
                  size={20}
                />
              </Card>
            ))}
          </View>
        )}

        {/* 已完成的待办事项 */}
        {completedTodos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              已完成 ({completedTodos.length})
            </Text>
            {completedTodos.map(todo => (
              <Card key={todo.id} style={[styles.todoCard, styles.completedCard]}>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleToggleTodo(todo.id)}
                  activeOpacity={0.7}>
                  <View style={styles.checkbox}>
                    <Icon name="check-circle" size={24} color="#34C759" />
                  </View>
                  <Text style={[styles.todoText, styles.completedText]}>
                    {todo.content}
                  </Text>
                </TouchableOpacity>
                <IconButton
                  name="delete"
                  onPress={() => handleDeleteTodo(todo.id)}
                  color="#FF3B30"
                  size={20}
                />
              </Card>
            ))}
          </View>
        )}

        {/* 空状态 */}
        {todos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="checklist" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>还没有待办事项</Text>
            <Text style={styles.emptyText}>
              点击"添加待办事项"开始记录
            </Text>
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
  addCard: {
    margin: 16,
    marginBottom: 8,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  addHeaderButton: {
    width: '100%',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  completedCard: {
    opacity: 0.6,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
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
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});

