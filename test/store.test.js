import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/store.js';

const T = '2026-11-21';
const seed = () => {
    let l = [];
    l = S.addTask(l, { title: 'Write report', due: '2026-11-20', priority: 'high', category: 'Work' }, 1);
    l = S.addTask(l, { title: 'Gym', due: T, priority: 'low', category: 'Health' }, 2);
    l = S.addTask(l, { title: 'Buy milk', priority: 'medium', category: 'Shopping' }, 3);
    return l;
};

test('createTask trims and validates the title', () => {
    assert.equal(S.createTask({ title: '  Hello ' }).title, 'Hello');
    assert.throws(() => S.createTask({ title: '   ' }));
    assert.equal(S.createTask({ title: 'x', priority: 'urgent' }).priority, 'medium');
});

test('toggle marks done and records completion time', () => {
    const l = seed();
    const t = S.toggleTask(l, l[0].id, 99).find((x) => x.id === l[0].id);
    assert.equal(t.done, true);
    assert.equal(t.completedAt, 99);
});

test('update keeps the old title when the new one is empty', () => {
    const l = seed();
    assert.equal(S.updateTask(l, l[0].id, { title: '  ' })[0].title, l[0].title);
});

test('overdue and today are detected, done tasks are never overdue', () => {
    const l = seed();
    const st = S.stats(l, T);
    assert.equal(st.overdue, 1);
    assert.equal(st.today, 1);
    const report = l.find((t) => t.title === 'Write report');
    assert.equal(S.stats(S.toggleTask(l, report.id), T).overdue, 0);
});

test('filters combine status, category and search', () => {
    const l = seed();
    assert.equal(S.filterTasks(l, { status: 'overdue' }, T).length, 1);
    assert.equal(S.filterTasks(l, { category: 'Health' }, T)[0].title, 'Gym');
    assert.equal(S.filterTasks(l, { query: 'MILK' }, T).length, 1);
});

test('sort by priority puts high first and completed last', () => {
    let l = seed();
    assert.equal(S.sortTasks(l, 'priority')[0].title, 'Write report');
    l = S.toggleTask(l, l.find((t) => t.title === 'Write report').id);
    assert.equal(S.sortTasks(l, 'priority').at(-1).title, 'Write report');
});

test('moveTask reorders and ignores unknown ids', () => {
    const l = seed();
    const moved = S.moveTask(l, l[2].id, l[0].id);
    assert.equal(moved[0].id, l[2].id);
    assert.equal(S.moveTask(l, 'nope', l[0].id), l);
});

test('import accepts exported files and skips bad rows', () => {
    const out = S.parseImport(JSON.stringify({ tasks: [{ title: 'A', done: true }, { title: '' }, null] }));
    assert.equal(out.length, 1);
    assert.equal(out[0].done, true);
    assert.throws(() => S.parseImport('{"x":1}'));
});
