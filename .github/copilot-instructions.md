# Jo's TodoList - AI Coding Guidelines

## Project Overview
This is a Vue 3 todo list application using shadcn/ui components (reka-ui), Tailwind CSS, and localStorage for persistence. The app manages tasks with title, description, priority, due dates, and categories.

## Architecture Patterns
- **Single-file app**: All business logic resides in `src/App.vue` (635+ lines)
- **UI components**: Reusable shadcn/ui primitives in `src/components/ui/` with variant exports
- **Styling**: Tailwind CSS with CSS variables for theming, `cn()` utility for class merging
- **State management**: Vue 3 Composition API with reactive refs and computed properties
- **Persistence**: localStorage with JSON serialization, soft delete to trash

## Key Conventions
- **Component imports**: Use `@/components/ui/{component}` for shadcn components
- **Icon usage**: Import from `lucide-vue-next`, e.g., `import { CheckCircle2 } from 'lucide-vue-next'`
- **Date handling**: Use `date-fns` with `zhCN` locale, combine date/time with `combineDateTime()`
- **Form state**: Reactive `form` object with validation in `handleSubmit()`
- **Task sorting**: Completed last, then urgent (≤3 days), then by priority (high>medium>low), then due date
- **Categories**: Fixed array `['MKT', 'Event', 'Payment', 'Others']`, multi-select with checkboxes

## Development Workflow
- **Start dev server**: `npm run dev` (Vite with hot reload)
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview**: `npm run preview` (serve built files)
- **Add UI component**: Copy from shadcn/ui docs, place in `src/components/ui/{name}/`, export in `index.js`

## Common Patterns
- **Task card rendering**: Use `Card` with conditional classes for completed/urgent states
- **Priority styling**: Map priorities to Tailwind classes in `getPriorityStyles()`
- **Filtering**: Combine search (title/desc), status (all/active/completed), and category filters
- **Notifications**: Use `showNotification()` for user feedback with auto-hide
- **Transitions**: Vue `<TransitionGroup>` for list animations, custom CSS for shake effect

## Data Structures
```javascript
// Task object
{
  id: Date.now(),
  title: string,
  desc: string,
  priority: 'high'|'medium'|'low'|'none',
  dueDate: ISO string,
  categories: string[],
  completed: boolean,
  isDeleted: boolean,
  createdAt: ISO string
}
```

## Gotchas
- **Date parsing**: Reka UI Calendar returns `CalendarDate` objects, convert with `.toString()` for date-fns
- **Category handling**: Always check `Array.isArray(t.categories)` for backward compatibility
- **Trash cleanup**: Auto-delete trash items older than 30 days on app load
- **Form reset**: Call `resetForm()` after successful submit to clear state</content>
<parameter name="filePath">/Users/terremou/Desktop/todolist-main/.github/copilot-instructions.md