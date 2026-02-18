<script setup>
import { ref } from 'vue';
import { AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { Eye, EyeOff } from 'lucide-vue-next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  STORAGE_MODES,
  storageMode,
  storageStatus,
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
  storageMessage,
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
  submitMagicKey,
  openStorageSettings,
  closeStorageSettings,
  applyStorageMode,
  useLocalConflictData,
  useRemoteConflictData,
  restoreFromSnapshot,
  unarchiveProject,
  restoreProject,
  handleExportData,
  triggerImport,
  handleImport,
  resetProjectForm
} = useAppController();

const showStorageKey = ref(false);
</script>

<template>
  <div class="h-dvh w-full overflow-hidden bg-background text-foreground font-sans flex flex-col">
    <TooltipProvider :delay-duration="180">

    <input type="file" ref="fileInput" class="hidden" accept=".json" @change="handleImport"/>

    <AppHeaderBar
      :trash-count="trashTasks.length"
      @create-task="openCreateTask()"
      @open-projects="showProjectModal = true"
      @open-key-config="openStorageSettings"
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
           class="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[420px] px-4 sm:px-5 py-3 rounded-xl shadow-2xl border bg-foreground text-background text-sm font-medium flex items-center gap-3 z-[60]">
        <AlertCircle v-if="notification.type === 'error'" class="h-4 w-4 text-red-400"/>
        <CheckCircle2 v-else class="h-4 w-4 text-emerald-400"/>
        {{ notification.message }}
      </div>
    </Transition>

    <Transition name="fade-overlay">
      <div
        v-if="storageLoading"
        class="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm flex items-center justify-center px-4"
      >
        <div class="w-full max-w-sm rounded-xl border bg-background shadow-xl p-5">
          <div class="flex items-center gap-3">
            <span class="loading-spinner" />
            <div class="space-y-1">
              <p class="text-sm font-medium">正在连接数据库...</p>
              <p class="text-xs text-muted-foreground">请稍候，正在同步最新数据</p>
            </div>
          </div>
          <div class="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div class="loading-bar h-full w-1/3 rounded-full bg-primary/70" />
          </div>
        </div>
      </div>
    </Transition>

    <div
      v-if="showStorageSettings"
      class="fixed inset-0 z-[80] bg-background/90 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div class="w-full max-w-xl rounded-xl border bg-background shadow-xl p-4 sm:p-6 space-y-4 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">存储设置</h2>
          <p class="text-sm text-muted-foreground">你可以一直本地使用，也可以连接云端自动同步。</p>
        </div>

        <div class="rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          <div>当前模式：{{ storageModeLabel }}</div>
          <div>同步状态：{{ storageStatusLabel }}</div>
        </div>

        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">模式切换</p>
          <div class="flex flex-wrap gap-2">
            <Button
              :variant="storageMode === STORAGE_MODES.LOCAL_ONLY ? 'default' : 'outline'"
              size="sm"
              @click="applyStorageMode(STORAGE_MODES.LOCAL_ONLY)"
            >
              仅本地保存
            </Button>
            <Button
              :variant="storageMode === STORAGE_MODES.REMOTE_AUTO ? 'default' : 'outline'"
              size="sm"
              @click="applyStorageMode(STORAGE_MODES.REMOTE_AUTO)"
            >
              云端自动同步
            </Button>
          </div>
        </div>

        <div class="relative">
          <Input
            v-model="magicKeyInput"
            :type="showStorageKey ? 'text' : 'password'"
            autocomplete="off"
            placeholder="输入或更新云端密钥（回车应用）"
            class="pr-10"
            @keyup.enter="submitMagicKey"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            @click="showStorageKey = !showStorageKey"
          >
            <Eye v-if="!showStorageKey" class="h-4 w-4" />
            <EyeOff v-else class="h-4 w-4" />
          </button>
        </div>

        <p
          v-if="storageMessage"
          class="text-xs"
          :class="storageStatus === 'remote_error' ? 'text-red-500' : 'text-muted-foreground'"
        >
          {{ storageMessage }}
        </p>

        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">本地快照恢复</p>
          <div v-if="snapshots.length === 0" class="text-xs text-muted-foreground">暂无快照</div>
          <div v-else class="space-y-2">
            <div v-for="item in snapshots" :key="item.id" class="rounded-md border px-3 py-2 text-xs flex items-center justify-between gap-2 sm:gap-3">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.reason }}</p>
                <p class="text-muted-foreground">{{ formatConflictDateTime(item.createdAt) }}</p>
              </div>
              <Button variant="outline" size="sm" @click="restoreFromSnapshot(item.id)">恢复</Button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button :disabled="storageLoading" @click="closeStorageSettings">完成</Button>
        </div>
      </div>
    </div>

    <div
      v-if="showDataConflictPrompt"
      class="fixed inset-0 z-[90] bg-background/90 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div class="w-full max-w-lg rounded-xl border bg-background shadow-xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="space-y-1">
          <h2 class="text-lg font-semibold">发现数据冲突</h2>
          <p class="text-sm text-muted-foreground">
            本地数据与远程数据库不一致，请选择要保留的版本。
          </p>
        </div>

        <div class="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground leading-5">
          选择“使用本地数据”会用当前浏览器数据覆盖远程数据库；选择“使用远程数据”会用云端数据覆盖当前本地缓存。
        </div>
        <div v-if="conflictSummary" class="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground leading-5 space-y-1">
          <p>本地：任务 {{ conflictSummary.localTaskCount }} / 项目 {{ conflictSummary.localProjectCount }} / 更新时间 {{ formatConflictDateTime(conflictSummary.localUpdatedAt) }}</p>
          <p>远程：任务 {{ conflictSummary.remoteTaskCount }} / 项目 {{ conflictSummary.remoteProjectCount }} / 更新时间 {{ formatConflictDateTime(conflictSummary.remoteUpdatedAt) }}</p>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button variant="outline" :disabled="conflictResolving" @click="useRemoteConflictData">
            使用远程数据
          </Button>
          <Button :disabled="conflictResolving" @click="useLocalConflictData">
            {{ conflictResolving ? '处理中...' : '使用本地数据' }}
          </Button>
        </div>
      </div>
    </div>
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-track {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(340%);
  }
}

@keyframes fade-overlay-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.18s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 2px solid hsl(var(--muted-foreground) / 0.25);
  border-top-color: hsl(var(--primary));
  animation: spin 0.8s linear infinite;
  flex: 0 0 auto;
}

.loading-bar {
  animation: loading-track 1.2s ease-in-out infinite;
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
