import * as S from './store.js';

const KEY = 'tasks.v2';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const VIEWS = [
    { id: 'all', label: 'All tasks', icon: '☰' },
    { id: 'today', label: 'Today', icon: '☀' },
    { id: 'overdue', label: 'Overdue', icon: '!' },
    { id: 'active', label: 'To do', icon: '○' },
    { id: 'completed', label: 'Completed', icon: '✓' },
];
const CAT_COLORS = { Work: 'lav', Personal: 'peach', Study: 'sky', Health: 'mint', Shopping: 'butter' };

// ---------- state ----------
let tasks = load();
let ui = { status: 'all', category: 'all', query: '', sort: 'manual', editing: null };
let undo = null;
let toastTimer;

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (Array.isArray(saved)) return saved;
    } catch { /* storage unavailable or corrupt */ }
    return sample();
}
function save() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch { /* private mode */ }
}
function sample() {
    const d = (n) => S.todayISO(new Date(Date.now() + n * 864e5));
    let l = [];
    const add = (t) => (l = [...l, S.createTask(t)]);
    add({ title: 'Prepare slides for Monday review', due: d(0), priority: 'high', category: 'Work' });
    add({ title: 'Finish Django REST API module', due: d(2), priority: 'high', category: 'Study' });
    add({ title: 'Reply to recruiter emails', due: d(-1), priority: 'medium', category: 'Work' });
    add({ title: 'Evening run, 5 km', due: d(0), priority: 'low', category: 'Health' });
    add({ title: 'Groceries for the week', due: d(1), priority: 'low', category: 'Shopping' });
    const dentist = add({ title: 'Book dentist appointment', priority: 'medium', category: 'Personal' }).at(-1);
    l = S.toggleTask(l, dentist.id);
    return l;
}

function commit(next, message, prev) {
    if (message) {
        undo = prev ?? tasks;
        showToast(message);
    }
    tasks = next;
    save();
    render();
}

// ---------- rendering ----------
const fmtDue = (iso) => {
    if (!iso) return '';
    const today = S.todayISO();
    const tomorrow = S.todayISO(new Date(Date.now() + 864e5));
    if (iso === today) return 'Today';
    if (iso === tomorrow) return 'Tomorrow';
    const d = new Date(iso + 'T00:00');
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }) });
};

function render() {
    const st = S.stats(tasks);
    const counts = {
        all: st.total, today: st.today, overdue: st.overdue, active: st.active, completed: st.done,
    };

    $('views').innerHTML = VIEWS.map((v) => `
        <button type="button" class="view ${ui.status === v.id && ui.category === 'all' ? 'on' : ''} ${v.id === 'overdue' && st.overdue ? 'warn' : ''}" data-view="${v.id}">
            <i aria-hidden="true">${v.icon}</i><span>${v.label}</span><em>${counts[v.id] || ''}</em>
        </button>`).join('');

    $('cats').innerHTML = S.CATEGORIES.map((c) => {
        const n = tasks.filter((t) => t.category === c && !t.done).length;
        return `<button type="button" class="view ${ui.category === c ? 'on' : ''}" data-cat="${c}">
            <i class="dot ${CAT_COLORS[c]}" aria-hidden="true"></i><span>${c}</span><em>${n || ''}</em></button>`;
    }).join('');

    const title = ui.category !== 'all' ? ui.category : VIEWS.find((v) => v.id === ui.status).label;
    $('title').textContent = title;
    document.title = `${title} · Tasks`;

    $('ringFill').style.strokeDashoffset = String(113.1 * (1 - st.percent / 100));
    $('ringText').textContent = `${st.percent}%`;
    $('ring').setAttribute('aria-label', `${st.percent}% of tasks completed`);

    $('stats').innerHTML = [
        ['To do', st.active, 'lav'],
        ['Due today', st.today, 'butter'],
        ['Overdue', st.overdue, 'peach'],
        ['Done', st.done, 'mint'],
    ].map(([l, n, c]) => `<div class="stat ${c}"><b>${n}</b><span>${l}</span></div>`).join('');

    const view = S.sortTasks(
        S.filterTasks(tasks, { status: ui.category !== 'all' ? 'all' : ui.status, category: ui.category, query: ui.query }),
        ui.sort,
    );
    const draggable = ui.sort === 'manual' && !ui.query;

    $('list').innerHTML = view.map((t) => item(t, draggable)).join('');
    $('empty').hidden = view.length > 0;
    if (!view.length) {
        const searching = !!ui.query.trim();
        $('emptyTitle').textContent = searching ? 'No matching tasks' : ui.status === 'overdue' ? 'Nothing overdue' : ui.status === 'completed' ? 'Nothing completed yet' : 'All clear';
        $('emptyText').textContent = searching ? `Nothing matches “${ui.query}”.` : 'Add a task above to get started.';
    }
    $('clearDone').disabled = st.done === 0;

    if (ui.editing) {
        const input = document.querySelector(`[data-edit="${ui.editing}"]`);
        if (input) { input.focus(); input.select(); }
    }
}

function item(t, draggable) {
    const overdue = S.isOverdue(t);
    const today = S.isDueToday(t);
    const editing = ui.editing === t.id;
    return `<li class="task ${t.done ? 'done' : ''} p-${t.priority}" data-id="${t.id}" ${draggable ? 'draggable="true"' : ''}>
        ${draggable ? '<span class="grip" aria-hidden="true" title="Drag to reorder">⋮⋮</span>' : ''}
        <button type="button" class="check" data-act="toggle" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}" aria-pressed="${t.done}"></button>
        <div class="body">
            ${editing
                ? `<input class="edit" data-edit="${t.id}" value="${esc(t.title)}" maxlength="200" aria-label="Edit task title">`
                : `<span class="t">${esc(t.title)}</span>`}
            <div class="meta">
                <span class="chip ${CAT_COLORS[t.category] || 'lav'}">${esc(t.category)}</span>
                ${t.due ? `<span class="chip due ${overdue ? 'over' : today ? 'today' : ''}">${overdue ? 'Overdue · ' : ''}${fmtDue(t.due)}</span>` : ''}
                <span class="prio" title="${t.priority} priority"><i></i>${t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
            </div>
        </div>
        <div class="acts">
            <select class="mini" data-act="priority" aria-label="Priority">
                ${['high', 'medium', 'low'].map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}
            </select>
            <input class="mini" type="date" data-act="due" value="${t.due}" aria-label="Due date">
            <button type="button" class="icon-btn" data-act="edit" aria-label="Edit">✎</button>
            <button type="button" class="icon-btn del" data-act="delete" aria-label="Delete">✕</button>
        </div>
    </li>`;
}

function showToast(text) {
    $('toastText').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').hidden = true), 5000);
}

// ---------- events ----------
$('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('newTitle').value.trim();
    if (!title) return;
    const category = ui.category !== 'all' ? ui.category : $('newCategory').value;
    const due = $('newDue').value || (ui.status === 'today' ? S.todayISO() : '');
    commit(S.addTask(tasks, { title, due, priority: $('newPriority').value, category }));
    $('newTitle').value = '';
    $('newDue').value = '';
    $('newTitle').focus();
});

$('newCategory').innerHTML = S.CATEGORIES.map((c) => `<option ${c === 'Personal' ? 'selected' : ''}>${c}</option>`).join('');

document.querySelector('.side').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view],[data-cat]');
    if (!b) return;
    if (b.dataset.view) ui = { ...ui, status: b.dataset.view, category: 'all' };
    else ui = { ...ui, status: 'all', category: b.dataset.cat };
    render();
});

$('search').addEventListener('input', (e) => { ui.query = e.target.value; render(); });
$('sort').addEventListener('change', (e) => { ui.sort = e.target.value; render(); });
$('clearDone').addEventListener('click', () => {
    const n = tasks.filter((t) => t.done).length;
    commit(S.clearCompleted(tasks), `Cleared ${n} completed ${n === 1 ? 'task' : 'tasks'}`);
});

const list = $('list');
list.addEventListener('click', (e) => {
    const li = e.target.closest('.task');
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!li || !act) return;
    const id = li.dataset.id;
    if (act === 'toggle') commit(S.toggleTask(tasks, id));
    if (act === 'delete') {
        const t = tasks.find((x) => x.id === id);
        commit(S.removeTask(tasks, id), `Deleted “${t.title.slice(0, 40)}”`);
    }
    if (act === 'edit') { ui.editing = id; render(); }
});
list.addEventListener('dblclick', (e) => {
    const li = e.target.closest('.task');
    if (li && e.target.closest('.body')) { ui.editing = li.dataset.id; render(); }
});
list.addEventListener('change', (e) => {
    const li = e.target.closest('.task');
    const act = e.target.dataset.act;
    if (!li) return;
    if (act === 'priority') commit(S.updateTask(tasks, li.dataset.id, { priority: e.target.value }));
    if (act === 'due') commit(S.updateTask(tasks, li.dataset.id, { due: e.target.value }));
});
const finishEdit = (input, keep) => {
    const id = input.dataset.edit;
    ui.editing = null;
    if (keep) commit(S.updateTask(tasks, id, { title: input.value }));
    else render();
};
list.addEventListener('keydown', (e) => {
    if (e.target.dataset.edit) {
        if (e.key === 'Enter') finishEdit(e.target, true);
        if (e.key === 'Escape') finishEdit(e.target, false);
    }
});
list.addEventListener('focusout', (e) => { if (e.target.dataset.edit && ui.editing) finishEdit(e.target, true); });

// drag and drop reorder (only in "My order")
let dragId = null;
list.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.task');
    if (!li) return;
    dragId = li.dataset.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
});
list.addEventListener('dragover', (e) => {
    const li = e.target.closest('.task');
    if (!dragId || !li || li.dataset.id === dragId) return;
    e.preventDefault();
    list.querySelectorAll('.over').forEach((x) => x.classList.remove('over'));
    li.classList.add('over');
});
list.addEventListener('drop', (e) => {
    const li = e.target.closest('.task');
    if (dragId && li) { e.preventDefault(); commit(S.moveTask(tasks, dragId, li.dataset.id)); }
});
list.addEventListener('dragend', () => { dragId = null; render(); });

$('toastUndo').addEventListener('click', () => {
    if (!undo) return;
    tasks = undo;
    undo = null;
    save();
    $('toast').hidden = true;
    render();
});

$('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'tasks', version: 2, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `tasks-${S.todayISO()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const imported = S.parseImport(await file.text());
        commit([...imported, ...tasks], `Imported ${imported.length} tasks`);
    } catch (err) {
        showToast(`Import failed: ${err.message}`);
    }
    e.target.value = '';
});

$('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme !== 'dark' : !matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('tasks.theme', root.dataset.theme); } catch { /* ignore */ }
});

document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (typing) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('newTitle').focus(); }
    if (e.key === '/') { e.preventDefault(); $('search').focus(); }
});

$('today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
render();
