<script setup>
import { AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppHeaderBar from '@/components/business/AppHeaderBar.vue';
import CompletedProjectsDialog from '@/components/business/CompletedProjectsDialog.vue';
import ProjectManagementDialog from '@/components/business/ProjectManagementDialog.vue';
import TaskFormDialog from '@/components/business/TaskFormDialog.vue';
import TaskControlsBar from '@/components/business/TaskControlsBar.vue';
import TaskKanbanView from '@/components/business/TaskKanbanView.vue';
import TaskListView from '@/components/business/TaskListView.vue';
import TrashDialog from '@/components/business/TrashDialog.vue';
import {
  TASK_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  BUSINESS_LINE_FIRST,
  BUSINESS_LINE_SECOND
} from '@/constants';
import { formatSimpleDate } from '@/utils/dateTime';
import { isUrgent, getPriorityStyles, getProjectStatusStyle, getProjectStatusLabel } from '@/utils/validators';
import { useAppController } from '@/composables/useAppController';

const {
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
} = useAppController();
</script>

<template>
  <div class="h-screen w-full overflow-hidden bg-background text-foreground font-sans flex flex-col">
    <TooltipProvider :delay-duration="180">

    <input type="file" ref="fileInput" class="hidden" accept=".json" @change="handleImport"/>

    <AppHeaderBar
      :trash-count="trashTasks.length"
      @create-task="openCreateTask()"
      @open-projects="showProjectModal = true"
      @open-trash="showTrashModal = true"
    />

    <main class="flex-1 flex flex-col overflow-hidden min-h-0">
      <TaskControlsBar
        v-model:search-query="searchQuery"
        v-model:view-mode="viewMode"
        v-model:filter-status="filterStatus"
        :is-sorting-mode="isSortingMode"
        :filter-types="filterTypes"
        :task-type-options="TASK_TYPE_OPTIONS"
        @toggle-sorting="toggleSortingMode"
        @toggle-filter-type="toggleFilterType"
        @clear-filter-types="filterTypes = []"
        @remove-filter-type="removeFilterType"
        @open-completed="showCompletedModal = true"
        @export-data="handleExportData"
        @import-data="triggerImport"
      />

      <div class="flex-1 flex flex-col overflow-hidden relative min-h-0" :class="{ 'sorting-mode': isSortingMode }">
        <TaskKanbanView
          v-if="viewMode === 'project'"
          :grouped-tasks="groupedTasks"
          :is-sorting-mode="isSortingMode"
          :project-type-options="PROJECT_TYPE_OPTIONS"
          :event-type-options="EVENT_TYPE_OPTIONS"
          :get-project-status-style="getProjectStatusStyle"
          :get-project-status-label="getProjectStatusLabel"
          :format-simple-date="formatSimpleDate"
          :is-urgent="isUrgent"
          :get-priority-styles="getPriorityStyles"
          @open-create-task="openCreateTask"
          @edit-project="(proj) => { editProjectForm(proj); showProjectModal = true }"
          @delete-project="handleDeleteProject"
          @toggle-task-status="toggleTaskStatus"
          @edit-task="editTaskForm"
          @soft-delete-task="handleSoftDeleteTask"
        />

        <TaskListView
          v-else
          :flat-filtered-tasks="flatFilteredTasks"
          :find-project-by-id="findProjectById"
          :is-urgent="isUrgent"
          :get-priority-styles="getPriorityStyles"
          :format-simple-date="formatSimpleDate"
          @toggle-task-status="toggleTaskStatus"
          @edit-task="editTaskForm"
          @soft-delete-task="handleSoftDeleteTask"
          @open-create-task="openCreateTask"
        />

      </div>
    </main>

    <CompletedProjectsDialog
      v-model:open="showCompletedModal"
      :completed-projects-list="completedProjectsList"
      :format-simple-date="formatSimpleDate"
      @unarchive="unarchiveProject"
      @delete-project="handleDeleteProject"
    />

    <ProjectManagementDialog
      v-model:open="showProjectModal"
      :active-projects="activeProjects"
      :project-form="projectForm"
      :project-type-options="PROJECT_TYPE_OPTIONS"
      :event-type-options="EVENT_TYPE_OPTIONS"
      :project-status-options="PROJECT_STATUS_OPTIONS"
      :business-line-first="BUSINESS_LINE_FIRST"
      :business-line-second="BUSINESS_LINE_SECOND"
      :get-project-status-style="getProjectStatusStyle"
      :get-project-status-label="getProjectStatusLabel"
      @edit-project="editProjectForm"
      @delete-project="handleDeleteProject"
      @reset-form="resetProjectForm"
      @submit="handleProjectSubmit"
    />

    <TaskFormDialog
      v-model:open="showTaskModal"
      :editing-id="editingId"
      :form="form"
      :selectable-projects-list="selectableProjectsList"
      :task-type-options="TASK_TYPE_OPTIONS"
      @submit="handleTaskSubmit"
    />

    <TrashDialog
      v-model:open="showTrashModal"
      v-model:trash-view-mode="trashViewMode"
      :trash-tasks="trashTasks"
      :trash-projects="trashProjects"
      @restore-task="handleRestoreTask"
      @delete-task="handlePermanentDeleteTask"
      @restore-project="restoreProject"
      @delete-project="handlePermanentDeleteProject"
      @empty-trash="handleEmptyTrash"
    />

    <Transition name="slide-up">
      <div v-if="notification.show"
           class="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl border bg-foreground text-background text-sm font-medium flex items-center gap-3 z-[60]">
        <AlertCircle v-if="notification.type === 'error'" class="h-4 w-4 text-red-400"/>
        <CheckCircle2 v-else class="h-4 w-4 text-emerald-400"/>
        {{ notification.message }}
      </div>
    </Transition>
    </TooltipProvider>
  </div>
</template>

<style>
.list-enter-active, .list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px);
  }
}

.animate-shake {
  animation: shake 0.6s cubic-bezier(.36, .07, .19, .97) both;
}

.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.custom-scroll::-webkit-scrollbar {
  height: 8px;
  width: 6px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.custom-scroll:hover {
  scrollbar-color: #d4d4d8 transparent;
}

.custom-scroll:hover::-webkit-scrollbar-thumb {
  background-color: #d4d4d8;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
