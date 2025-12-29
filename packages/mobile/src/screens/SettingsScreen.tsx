import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import {apiService} from '../services/api';

interface ReminderSettings {
  enabled: boolean;
  time?: string;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDataText, setImportDataText] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, []),
  );

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getReminderSettings();
      if (response.success && response.data) {
        const settings = response.data as ReminderSettings;
        setReminderEnabled(settings.enabled || false);
        setReminderTime(settings.time || '20:00');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async (value: boolean) => {
    setReminderEnabled(value);
    try {
      await apiService.updateReminderSettings(value, reminderTime);
    } catch (error) {
      Alert.alert('错误', '更新提醒设置失败');
      setReminderEnabled(!value);
    }
  };

  const handleUpdateReminderTime = async (time: string) => {
    setReminderTime(time);
    setShowTimePicker(false);
    try {
      await apiService.updateReminderSettings(reminderEnabled, time);
    } catch (error) {
      Alert.alert('错误', '更新提醒时间失败');
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      '导出数据',
      '确定要导出所有数据吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '导出',
          onPress: async () => {
            try {
              setExporting(true);
              const response = await apiService.exportData();
              if (response.success && response.data) {
                // 将数据转换为 JSON 字符串
                const jsonData = JSON.stringify(response.data, null, 2);
                
                // 在移动端，显示数据让用户复制或查看
                Alert.alert(
                  '导出成功',
                  `数据已准备就绪。数据大小：${jsonData.length} 字符。\n\n提示：完整文件导出功能需要安装额外依赖（如 react-native-share）。\n\n数据已输出到控制台，请查看。`,
                  [
                    {
                      text: '查看数据',
                      onPress: () => {
                        // 显示前500字符
                        Alert.alert('导出数据', jsonData.substring(0, 500) + '...\n\n（完整数据请查看控制台）');
                        console.log('导出数据:', jsonData);
                      },
                    },
                    {text: '确定'},
                  ],
                );
                console.log('导出数据:', jsonData);
              } else {
                Alert.alert('错误', response.error || '导出失败');
              }
            } catch (error) {
              Alert.alert('错误', '导出数据失败');
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleImportData = () => {
    Alert.alert(
      '导入数据',
      '确定要导入数据吗？这将覆盖现有数据。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '继续',
          onPress: () => {
            setShowImportModal(true);
            setImportDataText('');
          },
        },
      ],
    );
  };

  const handleConfirmImport = async () => {
    if (!importDataText.trim()) {
      Alert.alert('错误', '请输入有效的数据');
      return;
    }

    try {
      setImporting(true);
      
      // 解析 JSON 数据
      const data = JSON.parse(importDataText);
      
      // 调用导入 API
      const response = await apiService.importData(data);
      if (response.success) {
        Alert.alert('成功', '数据导入成功！');
        setShowImportModal(false);
        setImportDataText('');
      } else {
        Alert.alert('错误', response.error || '导入失败');
      }
    } catch (parseError) {
      console.error('解析数据失败:', parseError);
      Alert.alert('错误', '数据格式不正确，请检查 JSON 格式');
    } finally {
      setImporting(false);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      '确认删除',
      '确定要删除所有数据吗？此操作无法撤销。账户信息将保留。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.clearAllData();
              if (response.success) {
                Alert.alert('成功', '所有数据已删除', [
                  {
                    text: '确定',
                    onPress: () => {
                      navigation.navigate('Main', {screen: 'Goals'});
                    },
                  },
                ]);
              } else {
                Alert.alert('错误', response.error || '删除失败');
              }
            } catch (error) {
              Alert.alert('错误', '删除数据失败');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载设置...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 提醒设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>提醒设置</Text>
          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon name="notifications" size={24} color="#007AFF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>每日提醒</Text>
                  <Text style={styles.settingDescription}>
                    提醒你完成每日行动
                  </Text>
                </View>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{false: '#E5E5EA', true: '#007AFF'}}
                thumbColor="#fff"
              />
            </View>
            {reminderEnabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => setShowTimePicker(!showTimePicker)}>
                  <View style={styles.settingInfo}>
                    <Icon name="schedule" size={24} color="#007AFF" />
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>提醒时间</Text>
                      <Text style={styles.settingDescription}>{reminderTime}</Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color="#C7C7CC" />
                </TouchableOpacity>
                {showTimePicker && (
                  <View style={styles.timePicker}>
                    <TextInput
                      style={styles.timeInput}
                      value={reminderTime}
                      onChangeText={setReminderTime}
                      placeholder="HH:MM"
                      keyboardType="default"
                    />
                    <Button
                      title="确定"
                      onPress={() => handleUpdateReminderTime(reminderTime)}
                      style={styles.timeButton}
                    />
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        {/* 数据管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleExportData}
              disabled={exporting}>
              <View style={styles.settingInfo}>
                <Icon name="download" size={24} color="#34C759" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>导出数据</Text>
                  <Text style={styles.settingDescription}>
                    导出所有目标和执行记录
                  </Text>
                </View>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color="#34C759" />
              ) : (
                <Icon name="chevron-right" size={24} color="#C7C7CC" />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleImportData}
              disabled={importing}>
              <View style={styles.settingInfo}>
                <Icon name="upload" size={24} color="#007AFF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>导入数据</Text>
                  <Text style={styles.settingDescription}>
                    从文件导入数据
                  </Text>
                </View>
              </View>
              {importing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Icon name="chevron-right" size={24} color="#C7C7CC" />
              )}
            </TouchableOpacity>
          </Card>
        </View>

        {/* 危险操作 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>危险操作</Text>
          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleClearAllData}>
              <View style={styles.settingInfo}>
                <Icon name="delete-forever" size={24} color="#FF3B30" />
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, styles.dangerText]}>
                    清除所有数据
                  </Text>
                  <Text style={styles.settingDescription}>
                    删除所有目标和记录（账户信息保留）
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#C7C7CC" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* 关于信息 */}
        <View style={styles.section}>
          <Card style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <Icon name="info" size={32} color="#007AFF" />
              <Text style={styles.aboutTitle}>PsonGoal</Text>
            </View>
            <Text style={styles.aboutDescription}>
              个人目标执行系统{'\n'}
              帮助你专注于完成目标，每天进步一点点
            </Text>
            <Text style={styles.aboutVersion}>版本 0.1.0</Text>
          </Card>
        </View>
      </View>
    </ScrollView>

    {/* 导入数据 Modal */}
    <Modal
      visible={showImportModal}
      onClose={() => {
        setShowImportModal(false);
        setImportDataText('');
      }}
      title="导入数据">
      <View style={styles.importModalContent}>
        <Text style={styles.importModalText}>
          请粘贴 JSON 格式的数据：
        </Text>
        <TextInput
          style={styles.importTextInput}
          value={importDataText}
          onChangeText={setImportDataText}
          placeholder="粘贴 JSON 数据..."
          multiline
          textAlignVertical="top"
        />
        <View style={styles.importModalActions}>
          <Button
            title="取消"
            onPress={() => {
              setShowImportModal(false);
              setImportDataText('');
            }}
            variant="secondary"
            style={styles.importModalButton}
          />
          <Button
            title={importing ? '导入中...' : '导入'}
            onPress={handleConfirmImport}
            disabled={importing || !importDataText.trim()}
            style={styles.importModalButton}
          />
        </View>
      </View>
    </Modal>
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
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  settingCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 52,
  },
  timePicker: {
    padding: 16,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  timeButton: {
    minWidth: 80,
  },
  dangerText: {
    color: '#FF3B30',
  },
  aboutCard: {
    alignItems: 'center',
    padding: 24,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginLeft: 12,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  importModalContent: {
    padding: 8,
  },
  importModalText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  importTextInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 200,
    maxHeight: 300,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  importModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  importModalButton: {
    flex: 1,
  },
});
