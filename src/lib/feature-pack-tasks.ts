// In-memory task store for the feature-pack tasks API.
// The Prisma schema has no generic Task model and this pack must not run a
// DB migration, so tasks live in process memory (reset on restart).
import type { PackTask } from './feature-pack';

const store = new Map<string, PackTask>();
let seq = 0;

export function listTasks(createdBy?: string): PackTask[] {
  const all = [...store.values()].sort((a, b) => b.id.localeCompare(a.id));
  return createdBy ? all.filter((t) => t.createdBy === createdBy) : all;
}
export function createTask(data: Omit<PackTask, 'id'>): PackTask {
  seq += 1;
  const task: PackTask = { ...data, id: `task-${seq}` };
  store.set(task.id, task);
  return task;
}
export function updateTask(id: string, patch: Partial<PackTask>, createdBy?: string): PackTask | null {
  const current = store.get(id);
  if (!current) return null;
  if (createdBy && current.createdBy !== createdBy) return null;
  const next = { ...current, ...patch, id: current.id, createdBy: current.createdBy };
  store.set(id, next);
  return next;
}
