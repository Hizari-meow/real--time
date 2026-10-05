/**
 * Helper to format task for API responses
 */
export function formatTask(task: any) {
  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s: any) => s.column === 'done').length;
  const subtaskProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  let checklist: any[] = [];
  try {
    checklist = JSON.parse(task.checklistJson || '[]');
  } catch {
    checklist = [];
  }

  return {
    id: task.id,
    orgId: task.orgId,
    projectId: task.projectId || undefined,
    sprintId: task.sprintId || undefined,
    parentTaskId: task.parentTaskId || undefined,
    title: task.title,
    description: task.description,
    column: task.column,
    priority: task.priority,
    storyPoints: task.storyPoints ?? 0,
    estimatedMinutes: task.estimatedMinutes ?? 0,
    position: task.position ?? 0,
    assigneeId: task.assigneeId || undefined,
    assigneeName: task.assigneeName || undefined,
    dueDate: task.dueDate?.toISOString().slice(0, 10),
    completedAt: task.completedAt?.toISOString(),
    sourceMessageId: task.sourceMessageId || undefined,
    labels: task.labels || [],
    checklist,
    assignees: (task.assignees || []).map((a: any) => ({
      id: a.id,
      userId: a.userId,
      name: a.name,
      email: a.email,
      avatarColor: a.avatarColor,
    })),
    dependencies: (task.dependencies || []).map((d: any) => ({
      id: d.id,
      dependsOnId: d.dependsOnId,
      type: d.type,
      dependsOnTitle: d.dependsOn?.title,
      dependsOnColumn: d.dependsOn?.column,
    })),
    subtaskCount: totalSubtasks,
    completedSubtasks,
    subtaskProgress,
    commentsCount: task.comments?.length || 0,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
