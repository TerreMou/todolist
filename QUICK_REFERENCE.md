# 快速参考指南 - Jo's TodoList v2.0

## 📁 文件导航

### Core Files
- **src/constants.js** - 所有常量（键、选项、样式）
- **src/utils/dateTime.js** - 日期时间操作
- **src/utils/validators.js** - 验证和业务规则
- **src/composables/useNotification.js** - 通知系统
- **src/composables/useStorage.js** - 数据持久化
- **src/composables/useTasks.js** - 任务管理
- **src/composables/useProjects.js** - 项目管理
- **src/App.vue** - UI 逻辑和模板

## 🎯 常见操作

### 添加新的常量
编辑 `src/constants.js`：
```javascript
export const NEW_CONSTANT = 'value';
```

### 添加新的验证规则
编辑 `src/utils/validators.js`：
```javascript
export const validateNewField = (value, showNotification) => {
  if (!condition) {
    showNotification('错误信息', 'error');
    return false;
  }
  return true;
};
```

### 扩展任务功能
编辑 `src/composables/useTasks.js`：
```javascript
const newTaskMethod = (taskId, data) => {
  // 实现逻辑
  showNotification('成功消息');
  return true;
};
```

### 添加新的日期操作
编辑 `src/utils/dateTime.js`：
```javascript
export const newDateOperation = (dateString) => {
  // 实现逻辑
  return result;
};
```

## 🔗 导入模板

### 任务操作
```javascript
import { useTasks } from '@/composables/useTasks';

const {
  activeTasks,
  createTask,
  updateTask,
  // ... 其他方法
} = useTasks(tasks, projects, showNotification);
```

### 日期处理
```javascript
import {
  combineDateTime,
  formatDate,
  extractDateFromISO,
  generateTimeOptions
} from '@/utils/dateTime';
```

### 验证函数
```javascript
import {
  validateTaskTitle,
  validateDueDate,
  isUrgent,
  getPriorityStyles
} from '@/utils/validators';
```

## 📊 数据流向

```
App.vue (UI Layer)
    ↓
Composables (Business Logic)
    ├─ useTasks
    ├─ useProjects
    ├─ useStorage
    └─ useNotification
    ↓
Utils (Helper Functions)
    ├─ dateTime.js
    └─ validators.js
    ↓
Constants (Configuration)
    └─ constants.js
    ↓
localStorage (Persistence)
```

## 🐛 调试技巧

### 查看当前状态
在 App.vue 中添加：
```javascript
watch([tasks, projects], (newVal) => {
  console.log('Tasks:', newVal[0]);
  console.log('Projects:', newVal[1]);
}, { deep: true });
```

### 测试 Composable 函数
```javascript
const { createTask } = useTasks(tasks, projects, showNotification);
createTask('测试标题', '描述', 'high', '2026-02-01T12:00:00Z', [], 'none');
```

### 验证常量值
```javascript
import { CATEGORY_OPTIONS, PRIORITY_STYLES_CONFIG } from '@/constants';
console.log('Categories:', CATEGORY_OPTIONS);
console.log('Priority Styles:', PRIORITY_STYLES_CONFIG);
```

## ✅ 代码审查清单

- [ ] 使用了正确的 Composable
- [ ] 调用了正确的工具函数
- [ ] 通知正确处理了错误情况
- [ ] 数据被正确保存到 localStorage
- [ ] 计算属性用于派生状态
- [ ] 没有在 template 中直接调用 .value
- [ ] 导入路径使用 @ 别名
- [ ] 常量使用了 constants.js 中的值

## 🚀 性能优化建议

1. **使用计算属性缓存**：派生数据应该在 computed 中
2. **避免 watch 深层监听**：仅在必要时使用 deep: true
3. **利用计算属性的依赖追踪**：让 Vue 自动优化
4. **分割大的模板**：使用子组件提高可读性
5. **惰性加载**：考虑异步组件对大型对话框

## 📝 提交规范

提交消息格式：
```
[功能|修复|优化|文档] 主题

- 详细改动说明
- 影响的文件或功能

修复 #123
```

示例：
```
[功能] 添加任务快捷键

- 添加 Ctrl+N 快速创建任务
- 添加 Ctrl+S 保存任务
- 在 utils/shortcuts.js 中实现
- 在 App.vue 中注册快捷键

修复 #42
```

## 🔗 相关文档

- [完整重构总结](./REFACTOR_SUMMARY.md)
- [Copilot 指南](./.github/copilot-instructions.md)
- [Vue 3 文档](https://vuejs.org)
- [shadcn/ui 文档](https://shadcn-vue.com)

---

**最后更新**：2026年1月29日
**版本**：v2.0
**维护者**：Jo's TodoList Team
