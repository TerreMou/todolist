# Jo's TodoList - AI Coding Guidelines

## Project Overview
This is a Vue 3 todo list application using shadcn/ui components (reka-ui), Tailwind CSS, and localStorage for persistence. The app manages tasks with title, description, priority, due dates, and categories.

## Architecture Patterns
- **Single-file app**: All business logic resides in `src/App.vue` (~700 lines), organized into logical sections
- **UI components**: Reusable shadcn/ui primitives in `src/components/ui/` with variant exports (CVA-based styling)
- **Styling**: Tailwind CSS with CSS variables for theming, `cn()` utility for class merging
- **State management**: Vue 3 Composition API with reactive refs and computed properties
- **Persistence**: localStorage with JSON serialization, soft delete to trash with 30-day auto-cleanup
- **Code organization**: Extracted constants, utility functions, then core logic (state, computed), then operations

## Key Constants & Configurations
```javascript
STORAGE_KEY: 'jos-todo-list-data'
CATEGORY_OPTIONS: ['MKT', 'Event', 'Payment', 'Others']  // Fixed categories
TRASH_RETENTION_DAYS: 30                                 // Auto-delete older trash
NOTIFICATION_DURATION: 3000                              // Toast timeout (ms)
DEFAULT_TIME: '12:00'                                    // Default task time

PRIORITY_STYLES_CONFIG: {
  high: 'border-red-500/30 bg-red-100 text-red-700 hover:bg-red-200',
  medium: 'border-orange-500/30 bg-orange-100 text-orange-700 hover:bg-orange-200',
  low: 'border-blue-500/30 bg-blue-100 text-blue-700 hover:bg-blue-200',
  none: 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
}
```

## Utility Functions (Extracted for Reusability)
- `combineDateTime()` - Merges date (CalendarDate) + time string to ISO format
- `extractDateFromISO(isoString)` - Parses ISO date to Reka UI CalendarDate
- `extractTimeFromISO(isoString)` - Extracts HH:mm from ISO datetime
- `formatDate(iso)` - Formats ISO datetime for display with zhCN locale
- `isUrgent(task)` - Checks if task due within 3 days (animates with shake)
- `getPriorityStyles(priority)` - Returns Tailwind class string for priority badges
- `validateTaskTitle(title)` - Validates task title with error notification
- `validateDueDate(dueDate, isEditing)` - Prevents past dates on creation
- `showNotification(msg, type)` - Auto-hiding toast (3s default)

## Data Structures
```javascript
// Task object (complete schema)
{
  id: Date.now(),                    // Unique ID
  title: string,                     // Required, displays as badge if ≤20 chars
  desc: string,                      // Optional description (line-clamp-2 in UI)
  priority: 'high'|'medium'|'low'|'none',
  dueDate: ISO8601 string,           // Combined date+time
  categories: string[],              // Multi-select from CATEGORY_OPTIONS
  completed: boolean,                // Toggle via click checkbox
  isDeleted: boolean,                // Soft delete flag
  deletedAt: ISO8601 string,         // Timestamp of deletion
  createdAt: ISO8601 string
}
```

## Filtering & Sorting Behavior
1. **Search** - Full-text on title + desc (case-insensitive)
2. **Status filter** - all/active/completed
3. **Category filter** - Multi-select with Command palette
4. **Sort order** (when filtered):
   - Completed tasks last
   - Urgent tasks (≤3 days) first, with amber highlight + shake animation
   - Then by priority: high → medium → low → none
   - Finally by due date ascending

## Common Patterns & Implementation
- **Task card states**: `completed` → opacity-50 + line-through, `urgent` → amber border + shake
- **Form submission**: Validate title → validate dueDate → create/update → reset form → notify
- **Category handling**: Always check `Array.isArray(t.categories)` for backward compatibility
- **Date handling**: Use `combineDateTime()` for form submission, `extractDateFromISO()` for editing
- **Notifications**: Call `showNotification()` after operations with auto-hide after 3s
- **Transitions**: Vue `<TransitionGroup>` for list animations (350ms ease), slide-up for toasts

## Development Workflow
- **Start dev server**: `npm run dev` (Vite with hot reload)
- **Build**: `npm run build` (outputs to `dist/`, validates with Vite + Vue compiler)
- **Preview**: `npm run preview` (serve built files locally)
- **Add UI component**: Copy from shadcn/ui docs, place in `src/components/ui/{name}/`, export in `index.js`

## Critical Gotchas
- **Date parsing**: Reka UI Calendar's `v-model` returns CalendarDate objects (has `.toString()` method), NOT native Date
- **ISO format**: When combining date + time, use `combineDateTime()` to avoid timezone issues
- **Category array safety**: Always check `Array.isArray(t.categories)` - older tasks may have undefined
- **Trash cleanup**: Automatically runs on `onMounted()` - deletes items older than 30 days
- **Form reset**: Must call `resetForm()` explicitly after submit to clear all fields including categories
- **Priority ordering**: `priorityMap = { high: 3, medium: 2, low: 1, none: 0 }` - sort DESC (higher number first)
- **Duplicate function names**: When refactoring, ensure functions aren't declared twice (check tool functions section)</content>
<parameter name="filePath">/Users/terremou/Desktop/todolist-main/.github/copilot-instructions.md