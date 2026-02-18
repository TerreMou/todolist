import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { parseDate } from '@internationalized/date';
import Sortable from 'sortablejs';
import { useNotification } from '@/composables/useNotification';
import { useProjects } from '@/composables/useProjects';
import { useStorage } from '@/composables/useStorage';
import { useTasks } from '@/composables/useTasks';

export const useAppController = () => {
  const tasks = ref([]);
  const projects = ref([]);
  const editingId = ref(null);
  const isHydrating = ref(true);

  const showTrashModal = ref(false);
  const showProjectModal = ref(false);
  const showTaskModal = ref(false);
  const showCompletedModal = ref(false);
  const showStorageSettings = ref(false);
  const showDataConflictPrompt = ref(false);

  const storageLoading = ref(false);
  const conflictResolving = ref(false);
  const magicKeyInput = ref('');

  const trashViewMode = ref('tasks');

  const form = ref({
    title: '',
    desc: '',
    contact: '',
    priority: 'low',
    date: undefined,
    taskType: '',
    projectId: ''
  });

  const projectForm = ref({
    id: null,
    title: '',
    desc: '',
    status: 'not_started',
    startDate: undefined,
    endDate: undefined,
    projectType: '',
    eventType: '',
    businessLine: ''
  });

  const searchQuery = ref('');
  const filterStatus = ref('all');
  const filterTypes = ref([]);
  const viewMode = ref('project');
  const isSortingMode = ref(false);
  const fileInput = ref(null);

  const { notification, showNotification } = useNotification();
  const {
    STORAGE_MODES,
    storageMode,
    canUseRemote,
    storageStatus,
    storageMessage,
    magicKey,
    conflictState,
    snapshots,
    setMode,
    setMagicKey,
    clearMagicKey,
    resolveConflict,
    restoreSnapshot,
    loadFromLocalStorage,
    saveToLocalStorage,
    syncToRemote,
    exportData,
    importData
  } = useStorage();

  const {
    activeTasks,
    trashTasks,
    getSortedFilteredTasks,
    createTask,
    updateTask,
    toggleTaskStatus,
    prepareTaskForEdit,
    softDeleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyTaskTrash,
    getProjectTaskStats
  } = useTasks(tasks, projects, showNotification);

  const {
    activeProjects,
    trashProjects,
    completedProjectsList,
    selectableProjects,
    createProject,
    updateProject,
    unarchiveProject,
    restoreProject,
    confirmSoftDeleteProject,
    confirmPermanentDeleteProject,
    emptyProjectTrash
  } = useProjects(projects, tasks, showNotification);

  const isSameId = (a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return String(a) === String(b);
  };

  const findProjectById = (projectId) => activeProjects.value.find(p => isSameId(p.id, projectId));

  const groupedTasks = computed(() => {
    const groups = [];
    const filteredTasksBySearch = getSortedFilteredTasks(
      activeTasks.value,
      searchQuery.value,
      filterStatus.value,
      filterTypes.value
    );
    const filteredTasksWithoutSearch = getSortedFilteredTasks(
      activeTasks.value,
      '',
      filterStatus.value,
      filterTypes.value
    );
    const query = searchQuery.value.trim().toLowerCase();

    const inboxTasks = filteredTasksBySearch.filter(t => !t.projectId || t.projectId === 'none');
    groups.push({
      type: 'inbox',
      data: {
        id: 'none',
        title: '未归档任务',
        desc: '不属于任何特定项目的独立任务',
        status: 'active'
      },
      tasks: inboxTasks,
      progress: 0
    });

    const sortedProjects = [...activeProjects.value]
      .filter(p => p.status !== 'completed')
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    sortedProjects.forEach(proj => {
      const projectMatched = query && proj.title.toLowerCase().includes(query);
      const sourceTasks = projectMatched ? filteredTasksWithoutSearch : filteredTasksBySearch;
      const projTasks = sourceTasks.filter(t => isSameId(t.projectId, proj.id));
      const stats = getProjectTaskStats(proj.id);

      groups.push({
        type: 'project',
        data: proj,
        tasks: projTasks,
        progress: stats.progress
      });
    });

    if (!query) return groups;

    return groups.filter(g => {
      const hasMatchingTasks = g.tasks.length > 0;
      const isProjectMatch = g.data.title.toLowerCase().includes(query);
      return hasMatchingTasks || isProjectMatch;
    });
  });

  const flatFilteredTasks = computed(() =>
    getSortedFilteredTasks(
      activeTasks.value,
      searchQuery.value,
      filterStatus.value,
      filterTypes.value
    )
  );

  const selectableProjectsList = computed(() =>
    selectableProjects(editingId.value ? form.value.projectId : null)
  );

  const conflictSummary = computed(() => conflictState.value?.summary || null);
  const storageModeLabel = computed(() =>
    storageMode.value === STORAGE_MODES.LOCAL_ONLY ? '仅本地' : '云端自动同步'
  );
  const storageStatusLabel = computed(() => {
    const map = {
      local_only: '当前仅保存在本地',
      idle: '等待连接云端',
      remote_ready: '已连接云端',
      remote_error: '云端不可用，已回退本地',
      conflict: '检测到本地与云端不一致'
    };
    return map[storageStatus.value] || '状态未知';
  });

  const formatConflictDateTime = (value) => {
    if (!value) return '未知';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '未知';
    return d.toLocaleString();
  };

  onMounted(async () => {
    storageLoading.value = true;
    const loaded = await loadFromLocalStorage();
    tasks.value = loaded.tasks;
    projects.value = loaded.projects;
    magicKeyInput.value = magicKey.value || '';
    showDataConflictPrompt.value = storageStatus.value === 'conflict';
    isHydrating.value = false;
    storageLoading.value = false;
  });

  watch([tasks, projects], () => {
    if (isHydrating.value) return;
    saveToLocalStorage(tasks.value, projects.value);
  }, { deep: true });

  watch(storageStatus, (nextStatus) => {
    showDataConflictPrompt.value = nextStatus === 'conflict';

    if (nextStatus === 'remote_error') {
      showNotification(storageMessage.value || '远程不可用，已回退本地', 'error');
    }
  });

  const resetForm = () => {
    form.value = {
      title: '',
      desc: '',
      contact: '',
      priority: 'low',
      date: undefined,
      taskType: '',
      projectId: ''
    };
    editingId.value = null;
  };

  const resetProjectForm = () => {
    projectForm.value = {
      id: null,
      title: '',
      desc: '',
      status: 'not_started',
      startDate: undefined,
      endDate: undefined,
      projectType: '',
      eventType: '',
      businessLine: ''
    };
  };

  const handleExportData = () => {
    exportData(tasks.value, projects.value, showNotification);
  };

  const triggerImport = () => {
    fileInput.value?.click();
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const success = importData(parsed, tasks, projects, showNotification);
        if (success) {
          resetForm();
          resetProjectForm();
        }
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const openCreateTask = (projectId = 'none') => {
    resetForm();
    form.value.projectId = projectId === 'none' ? '' : projectId;
    showTaskModal.value = true;
  };

  const handleTaskSubmit = () => {
    const finalDueDate = form.value.date ? form.value.date.toString() : '';
    let success = false;

    if (editingId.value) {
      success = updateTask(
        editingId.value,
        form.value.title,
        form.value.desc,
        form.value.priority,
        finalDueDate,
        form.value.taskType,
        form.value.contact,
        form.value.projectId
      );
    } else {
      success = createTask(
        form.value.title,
        form.value.desc,
        form.value.priority,
        finalDueDate,
        form.value.taskType,
        form.value.contact,
        form.value.projectId
      );
    }

    if (!success) return;

    editingId.value = null;
    showTaskModal.value = false;
    resetForm();
  };

  const editTaskForm = (task) => {
    const formData = prepareTaskForEdit(task);
    form.value = formData;
    editingId.value = task.id;
    showTaskModal.value = true;
  };

  const handleProjectSubmit = () => {
    if (projectForm.value.id) {
      updateProject(
        projectForm.value.id,
        projectForm.value.title,
        projectForm.value.desc,
        projectForm.value.status,
        projectForm.value.startDate,
        projectForm.value.endDate,
        projectForm.value.projectType,
        projectForm.value.eventType,
        projectForm.value.businessLine
      );
    } else {
      createProject(
        projectForm.value.title,
        projectForm.value.desc,
        projectForm.value.status,
        projectForm.value.startDate,
        projectForm.value.endDate,
        projectForm.value.projectType,
        projectForm.value.eventType,
        projectForm.value.businessLine
      );
    }

    resetProjectForm();
    showProjectModal.value = false;
  };

  const editProjectForm = (proj) => {
    projectForm.value = {
      id: proj.id,
      title: proj.title,
      desc: proj.desc,
      status: proj.status || 'not_started',
      startDate: proj.startDate ? parseDate(proj.startDate) : undefined,
      endDate: proj.endDate ? parseDate(proj.endDate) : undefined,
      projectType: proj.projectType || '',
      eventType: proj.eventType || '',
      businessLine: proj.businessLine || ''
    };
  };

  const handleDeleteProject = (projectId) => {
    confirmSoftDeleteProject(projectId);
  };

  const handlePermanentDeleteProject = (projectId) => {
    confirmPermanentDeleteProject(projectId);
  };

  const toggleFilterType = (cat) => {
    const index = filterTypes.value.indexOf(cat);
    if (index === -1) {
      filterTypes.value.push(cat);
    } else {
      filterTypes.value.splice(index, 1);
    }
  };

  const removeFilterType = (cat) => {
    filterTypes.value = filterTypes.value.filter(c => c !== cat);
  };

  const initSortable = async () => {
    if (viewMode.value !== 'project' || !isSortingMode.value) return;

    await nextTick();

    const container = document.querySelector('.kanban-container');
    if (!container) return;

    Sortable.create(container, {
      group: 'projects',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'drag-item',
      onEnd: () => {
        const projectsInOrder = Array.from(container.children)
          .map(el => parseInt(el.dataset.projectId))
          .filter(id => !isNaN(id));

        projectsInOrder.forEach((projectId, index) => {
          const proj = projects.value.find(p => p.id === projectId);
          if (proj) {
            proj.sortOrder = index * 1000;
          }
        });

        saveToLocalStorage(tasks.value, projects.value);
        showNotification('项目排序已更新');
      }
    });
  };

  const toggleSortingMode = () => {
    isSortingMode.value = !isSortingMode.value;
    if (isSortingMode.value) {
      initSortable();
    }
  };

  const handleSoftDeleteTask = (taskId) => {
    softDeleteTask(taskId);
  };

  const handleRestoreTask = (taskId) => {
    restoreTask(taskId);
  };

  const handlePermanentDeleteTask = (taskId) => {
    permanentDeleteTask(taskId);
  };

  const handleEmptyTrash = () => {
    if (trashViewMode.value === 'tasks') {
      emptyTaskTrash();
    } else {
      emptyProjectTrash();
    }
  };

  const openStorageSettings = () => {
    magicKeyInput.value = magicKey.value || '';
    showStorageSettings.value = true;
  };

  const closeStorageSettings = () => {
    showStorageSettings.value = false;
  };

  const applyStorageMode = async (mode) => {
    setMode(mode);

    if (mode === STORAGE_MODES.LOCAL_ONLY) {
      showNotification('已切换为本地模式');
      return;
    }

    if (!magicKey.value.trim()) {
      showNotification('请先输入密钥再连接远程', 'error');
      return;
    }

    storageLoading.value = true;
    const loaded = await loadFromLocalStorage({ detectConflict: true });
    if (storageStatus.value !== 'conflict') {
      tasks.value = loaded.tasks;
      projects.value = loaded.projects;
      showNotification('远程数据已加载');
    }
    storageLoading.value = false;
  };

  const submitMagicKey = async () => {
    const candidate = magicKeyInput.value.trim();
    if (!candidate) {
      showNotification('请输入密钥', 'error');
      return;
    }

    storageLoading.value = true;
    setMagicKey(candidate);

    if (storageMode.value === STORAGE_MODES.LOCAL_ONLY) {
      setMode(STORAGE_MODES.REMOTE_AUTO);
    }

    const loaded = await loadFromLocalStorage({ detectConflict: true });
    if (storageStatus.value !== 'conflict') {
      tasks.value = loaded.tasks;
      projects.value = loaded.projects;
      showNotification('远程数据库连接成功');
    }

    storageLoading.value = false;
  };

  const switchToLocalOnly = () => {
    clearMagicKey();
    setMode(STORAGE_MODES.LOCAL_ONLY);
    magicKeyInput.value = '';
    showNotification('已切换到本地模式');
  };

  const useLocalConflictData = async () => {
    if (!conflictState.value) return;
    conflictResolving.value = true;
    try {
      const selected = await resolveConflict('local');
      tasks.value = selected.tasks;
      projects.value = selected.projects;
      showDataConflictPrompt.value = false;
      showNotification('已保留本地数据并同步到远程');
    } catch {
      showNotification(storageMessage.value || '处理冲突失败', 'error');
    } finally {
      conflictResolving.value = false;
    }
  };

  const useRemoteConflictData = async () => {
    if (!conflictState.value) return;
    conflictResolving.value = true;
    try {
      const selected = await resolveConflict('remote');
      tasks.value = selected.tasks;
      projects.value = selected.projects;
      showDataConflictPrompt.value = false;
      showNotification('已采用远程数据');
    } catch {
      showNotification(storageMessage.value || '处理冲突失败', 'error');
    } finally {
      conflictResolving.value = false;
    }
  };

  const restoreFromSnapshot = async (snapshotId) => {
    const restored = restoreSnapshot(snapshotId);
    if (!restored) {
      showNotification('快照不存在', 'error');
      return;
    }

    tasks.value = restored.tasks;
    projects.value = restored.projects;
    showNotification('已恢复本地快照');

    if (canUseRemote.value) {
      try {
        await syncToRemote(restored.tasks, restored.projects);
        showNotification('已将快照同步到远程');
      } catch {
        showNotification('快照已恢复到本地，远程同步失败', 'error');
      }
    }
  };

  return {
    notification,
    fileInput,
    editingId,
    STORAGE_MODES,
    storageMode,
    storageStatus,
    storageMessage,
    canUseRemote,
    snapshots,
    conflictSummary,
    storageModeLabel,
    storageStatusLabel,
    formatConflictDateTime,
    showTrashModal,
    showProjectModal,
    showTaskModal,
    showCompletedModal,
    showStorageSettings,
    showDataConflictPrompt,
    storageLoading,
    conflictResolving,
    magicKeyInput,
    trashViewMode,
    form,
    projectForm,
    searchQuery,
    filterStatus,
    filterTypes,
    viewMode,
    isSortingMode,
    activeProjects,
    completedProjectsList,
    trashProjects,
    trashTasks,
    groupedTasks,
    flatFilteredTasks,
    selectableProjectsList,
    findProjectById,
    openCreateTask,
    handleTaskSubmit,
    editTaskForm,
    handleProjectSubmit,
    editProjectForm,
    handleDeleteProject,
    handlePermanentDeleteProject,
    toggleFilterType,
    removeFilterType,
    toggleSortingMode,
    toggleTaskStatus,
    handleSoftDeleteTask,
    handleRestoreTask,
    handlePermanentDeleteTask,
    handleEmptyTrash,
    openStorageSettings,
    closeStorageSettings,
    applyStorageMode,
    submitMagicKey,
    switchToLocalOnly,
    useLocalConflictData,
    useRemoteConflictData,
    restoreFromSnapshot,
    unarchiveProject,
    restoreProject,
    handleExportData,
    triggerImport,
    handleImport,
    resetProjectForm
  };
};
