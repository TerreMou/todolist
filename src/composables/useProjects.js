import { computed } from 'vue';
import { validateProjectTitle } from '@/utils/validators';

/**
 * 项目管理 composable
 * @param {Ref} projectsRef - 项目数组 ref
 * @param {Ref} tasksRef - 任务数组 ref
 * @param {Function} showNotification - 通知函数
 * @returns {Object} 项目相关的状态和方法
 */
export const useProjects = (projectsRef, tasksRef, showNotification) => {
  // 计算属性
  const activeProjects = computed(() => projectsRef.value.filter(p => !p.isDeleted));
  const trashProjects = computed(() => projectsRef.value.filter(p => p.isDeleted));
  const completedProjectsList = computed(() =>
    projectsRef.value.filter(p => !p.isDeleted && p.status === 'completed')
  );

  /**
   * 获取可选择的项目（排除已完成的，除非正在编辑）
   */
  const selectableProjects = (editingProjectId) => {
    return activeProjects.value.filter(p => {
      const isCompleted = p.status === 'completed';
      const isCurrentEditingProject = editingProjectId && editingProjectId === p.id;
      return !isCompleted || isCurrentEditingProject;
    });
  };

  /**
   * 创建新项目
   */
  const createProject = (title, desc, status, startDate, endDate) => {
    if (!validateProjectTitle(title, showNotification)) return false;

    const startStr = startDate ? startDate.toString() : null;
    const endStr = endDate ? endDate.toString() : null;

    projectsRef.value.push({
      id: Date.now(),
      title,
      desc,
      status: status || 'not_started',
      startDate: startStr,
      endDate: endStr,
      isDeleted: false,
      createdAt: new Date().toISOString()
    });

    showNotification('项目已创建');
    return true;
  };

  /**
   * 更新项目
   */
  const updateProject = (projectId, title, desc, status, startDate, endDate) => {
    if (!validateProjectTitle(title, showNotification)) return false;

    const index = projectsRef.value.findIndex(p => p.id === projectId);
    if (index === -1) return false;

    const startStr = startDate ? startDate.toString() : null;
    const endStr = endDate ? endDate.toString() : null;

    projectsRef.value[index] = {
      ...projectsRef.value[index],
      title,
      desc,
      status,
      startDate: startStr,
      endDate: endStr
    };

    showNotification('项目已更新');
    return true;
  };

  /**
   * 更改项目状态
   */
  const updateProjectStatus = (projectId, status) => {
    const project = projectsRef.value.find(p => p.id === projectId);
    if (project) {
      project.status = status;
      return true;
    }
    return false;
  };

  /**
   * 将项目从已完成状态移回进行中
   */
  const unarchiveProject = (projectId) => {
    const project = projectsRef.value.find(p => p.id === projectId);
    if (project) {
      project.status = 'in_progress';
      showNotification('项目已移回看板');
      return true;
    }
    return false;
  };

  /**
   * 获取项目关联的待处理任务数
   */
  const getProjectTaskCount = (projectId, excludeDeleted = true) => {
    return tasksRef.value.filter(t => {
      if (excludeDeleted && t.isDeleted) return false;
      return t.projectId === projectId;
    }).length;
  };

  /**
   * 软删除项目
   */
  const softDeleteProject = (projectId) => {
    const project = projectsRef.value.find(p => p.id === projectId);
    if (project) {
      project.isDeleted = true;
      project.deletedAt = new Date().toISOString();
      showNotification('项目已移至回收站');
      return true;
    }
    return false;
  };

  /**
   * 恢复项目和相关任务
   */
  const restoreProject = (projectId) => {
    const project = projectsRef.value.find(p => p.id === projectId);
    if (project) {
      project.isDeleted = false;
      project.deletedAt = null;

      let count = 0;
      tasksRef.value.forEach(t => {
        if (t.projectId === projectId && t.isDeleted) {
          t.isDeleted = false;
          t.deletedAt = null;
          count++;
        }
      });

      showNotification(`项目及 ${count} 个任务已恢复`);
      return true;
    }
    return false;
  };

  /**
   * 软删除项目（处理关联任务）
   * @param {number} projectId - 项目 ID
   * @param {boolean} deleteTasks - 是否同时删除任务
   */
  const confirmSoftDeleteProject = (projectId, deleteTasks = false) => {
    const project = projectsRef.value.find(p => p.id === projectId);
    if (!project) return false;

    project.isDeleted = true;
    project.deletedAt = new Date().toISOString();

    if (deleteTasks) {
      // 同时把任务移到回收站
      let count = 0;
      tasksRef.value.forEach(t => {
        if (t.projectId === projectId && !t.isDeleted) {
          t.isDeleted = true;
          t.deletedAt = new Date().toISOString();
          count++;
        }
      });
      showNotification(`项目及 ${count} 个任务已移至回收站`);
    } else {
      // 任务解绑
      tasksRef.value.forEach(t => {
        if (t.projectId === projectId) {
          t.projectId = null;
        }
      });
      showNotification('项目已移至回收站，关联任务已解绑');
    }

    return true;
  };

  /**
   * 永久删除项目
   * @param {number} projectId - 项目 ID
   * @param {boolean} deleteTasks - 是否同时删除任务
   */
  const confirmPermanentDeleteProject = (projectId, deleteTasks = false) => {
    if (deleteTasks) {
      // 删除关联的任务
      tasksRef.value = tasksRef.value.filter(t => t.projectId !== projectId);
    } else {
      // 解绑任务
      tasksRef.value.forEach(t => {
        if (t.projectId === projectId) {
          t.projectId = null;
        }
      });
    }

    // 删除项目
    projectsRef.value = projectsRef.value.filter(p => p.id !== projectId);
    showNotification('项目已永久删除');
    return true;
  };

  /**
   * 清空项目回收站
   */
  const emptyProjectTrash = () => {
    const deletedProjectIds = projectsRef.value
      .filter(p => p.isDeleted)
      .map(p => p.id);

    projectsRef.value = projectsRef.value.filter(p => !p.isDeleted);
    tasksRef.value = tasksRef.value.filter(
      t => !(t.isDeleted && deletedProjectIds.includes(t.projectId))
    );

    showNotification('回收站已清空');
  };

  return {
    activeProjects,
    trashProjects,
    completedProjectsList,
    selectableProjects,
    createProject,
    updateProject,
    updateProjectStatus,
    unarchiveProject,
    getProjectTaskCount,
    softDeleteProject,
    restoreProject,
    confirmSoftDeleteProject,
    confirmPermanentDeleteProject,
    emptyProjectTrash
  };
};
