# Tasks

A fast, offline task manager built with plain JavaScript, no framework and no build step.

**Live demo:** https://ida-eng.github.io/todo-list/

## Features

- Add tasks with a due date, priority (high, medium, low) and category
- Smart views: All, Today, Overdue, To do, Completed, plus a view per category with live counts
- Overdue and due-today tasks are highlighted automatically
- Edit a task by double-clicking it; change priority or due date inline
- Search across titles and categories, and sort by due date, priority, newest or A–Z
- Drag and drop to reorder tasks in "My order"
- Undo after deleting or clearing completed tasks
- Progress ring and summary cards
- Everything is saved in the browser (localStorage), so tasks survive a refresh
- Export and import tasks as JSON
- Light and dark mode, keyboard shortcuts (`N` new task, `/` search, `Esc` cancel)
- Responsive layout for phone and desktop

## How it's built

```
index.html        markup
style.css         design tokens, light/dark themes, responsive layout
src/store.js      pure task logic (create, update, filter, sort, stats, import)
src/app.js        rendering and event handling
test/             unit tests for the task logic
```

The task logic in `src/store.js` has no DOM code: every function takes a list of tasks and returns a new one. That keeps the UI simple and makes the logic easy to test.

## Run locally

Open `index.html` through any static server, for example:

```bash
python3 -m http.server
```

## Tests

```bash
npm test   # runs node --test on the task logic (Node 18+)
```

Built by [Aida Topalli](https://ida-eng.github.io/portfolio/).
