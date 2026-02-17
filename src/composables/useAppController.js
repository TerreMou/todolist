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

  const showTrashModal = ref(false);
  const showProjectModal = ref(false);
  const showTaskModal = ref(false);
  const showCompletedModal = ref(false);

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
  const { loadFromLocalStorage, saveToLocalStorage, exportData, importData } = useStorage();
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
    const filteredTasks = getSortedFilteredTasks(
      activeTasks.value,
      searchQuery.value,
      filterStatus.value,
      filterTypes.value
    );

    const inboxTasks = filteredTasks.filter(t => !t.projectId || t.projectId === 'none');
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
      const projTasks = filteredTasks.filter(t => isSameId(t.projectId, proj.id));
      const stats = getProjectTaskStats(proj.id);

      groups.push({
        type: 'project',
        data: proj,
        tasks: projTasks,
        progress: stats.progress
      });
    });

    if (!searchQuery.value.trim()) return groups;

    const query = searchQuery.value.toLowerCase();
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

  onMounted(() => {
    const { tasks: loadedTasks, projects: loadedProjects } = loadFromLocalStorage();
    tasks.value = loadedTasks;
    projects.value = loadedProjects;
  });

  watch([tasks, projects], () => {
    saveToLocalStorage(tasks.value, projects.value);
  }, { deep: true });

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
    confirmSoftDeleteProject(projectId, true);
  };

  const handlePermanentDeleteProject = (projectId) => {
    confirmPermanentDeleteProject(projectId, true);
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

  return {
    notification,
    fileInput,
    editingId,
    showTrashModal,
    showProjectModal,
    showTaskModal,
    showCompletedModal,
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
    unarchiveProject,
    restoreProject,
    handleExportData,
    triggerImport,
    handleImport,
    resetProjectForm
  };
};
