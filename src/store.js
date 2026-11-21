// Pure task logic: no DOM, so it can be unit-tested with `node --test`.

export const PRIORITIES = { high: 3, medium: 2, low: 1 };
export const CATEGORIES = ['Work', 'Personal', 'Study', 'Health', 'Shopping'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const todayISO = (now = new Date()) => {
    const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
};

export function createTask({ title, due = '', priority = 'medium', category = 'Personal', notes = '' }, now = Date.now()) {
    const clean = String(title ?? '').trim();
    if (!clean) throw new Error('Task title is required');
    if (!(priority in PRIORITIES)) priority = 'medium';
    return { id: uid(), title: clean.slice(0, 200), due, priority, category, notes, done: false, createdAt: now, completedAt: null };
}

export const addTask = (tasks, input, now) => [createTask(input, now), ...tasks];

export const updateTask = (tasks, id, patch) =>
    tasks.map((t) => (t.id === id ? { ...t, ...patch, title: (patch.title ?? t.title).trim() || t.title } : t));

export const toggleTask = (tasks, id, now = Date.now()) =>
    tasks.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: t.done ? null : now } : t));

export const removeTask = (tasks, id) => tasks.filter((t) => t.id !== id);

export const clearCompleted = (tasks) => tasks.filter((t) => !t.done);

export function moveTask(tasks, fromId, toId) {
    const from = tasks.findIndex((t) => t.id === fromId);
    const to = tasks.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0 || from === to) return tasks;
    const next = [...tasks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export const isOverdue = (t, today = todayISO()) => !t.done && !!t.due && t.due < today;
export const isDueToday = (t, today = todayISO()) => !t.done && t.due === today;

export function filterTasks(tasks, { status = 'all', query = '', category = 'all' } = {}, today = todayISO()) {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
        if (status === 'active' && t.done) return false;
        if (status === 'completed' && !t.done) return false;
        if (status === 'today' && !isDueToday(t, today)) return false;
        if (status === 'overdue' && !isOverdue(t, today)) return false;
        if (category !== 'all' && t.category !== category) return false;
        if (q && !`${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(q)) return false;
        return true;
    });
}

export function sortTasks(tasks, by = 'manual') {
    const list = [...tasks];
    const due = (t) => t.due || '9999-12-31';
    if (by === 'due') list.sort((a, b) => due(a).localeCompare(due(b)) || PRIORITIES[b.priority] - PRIORITIES[a.priority]);
    if (by === 'priority') list.sort((a, b) => PRIORITIES[b.priority] - PRIORITIES[a.priority] || due(a).localeCompare(due(b)));
    if (by === 'newest') list.sort((a, b) => b.createdAt - a.createdAt);
    if (by === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    // completed tasks always sink to the bottom
    return list.sort((a, b) => Number(a.done) - Number(b.done));
}

export function stats(tasks, today = todayISO()) {
    const done = tasks.filter((t) => t.done).length;
    return {
        total: tasks.length,
        done,
        active: tasks.length - done,
        overdue: tasks.filter((t) => isOverdue(t, today)).length,
        today: tasks.filter((t) => isDueToday(t, today)).length,
        percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
}

export function parseImport(text) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.tasks;
    if (!Array.isArray(list)) throw new Error('File has no task list');
    return list
        .filter((t) => t && typeof t.title === 'string' && t.title.trim())
        .map((t) => ({ ...createTask(t), done: !!t.done, createdAt: Number(t.createdAt) || Date.now(), completedAt: t.completedAt ?? null }));
}
