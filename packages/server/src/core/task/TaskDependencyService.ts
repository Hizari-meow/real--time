import { getPrismaClient } from '../../storage/db.js';
import { TaskSocketManager } from './TaskSocketManager.js';

export class TaskDependencyService {
  private static instance: TaskDependencyService | null = null;
  private prisma = getPrismaClient();

  public static getInstance(): TaskDependencyService {
    if (!TaskDependencyService.instance) {
      TaskDependencyService.instance = new TaskDependencyService();
    }
    return TaskDependencyService.instance;
  }

  /**
   * Add Task Dependency with Graph Cycle Detection
   */
  public async addDependency(
    orgId: string,
    actor: { userId: string; name: string },
    taskId: string,
    dependsOnId: string,
    type: string = 'finish_to_start'
  ) {
    // 1. Cannot depend on self
    if (taskId === dependsOnId) {
      throw new Error('DEPENDENCY_SELF_REFERENCE');
    }

    // 2. Both tasks must exist and belong to the same org
    const [task, target] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.task.findUnique({ where: { id: dependsOnId } }),
    ]);

    if (!task || task.orgId !== orgId || !target || target.orgId !== orgId) {
      throw new Error('TASK_NOT_FOUND');
    }

    // 3. CYCLE DETECTION ALGORITHM:
    // Check if there is already a path from dependsOnId to taskId
    const hasCycle = await this.checkDependencyCycle(orgId, taskId, dependsOnId);
    if (hasCycle) {
      throw new Error('DEPENDENCY_CYCLE_DETECTED');
    }

    // 4. Create dependency
    const dependency = await this.prisma.taskDependency.upsert({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
      create: { taskId, dependsOnId, type },
      update: { type },
      include: { dependsOn: { select: { id: true, title: true, column: true } } },
    });

    // Record activity
    await this.prisma.taskActivity.create({
      data: {
        orgId,
        taskId,
        actorId: actor.userId,
        actorName: actor.name,
        action: 'dependency_added',
        details: `Thêm phụ thuộc vào công việc "${target.title}"`,
      },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'dependency:added',
      orgId,
      taskId,
      data: dependency,
      timestamp: new Date().toISOString(),
    });

    return dependency;
  }

  /**
   * Remove dependency
   */
  public async removeDependency(orgId: string, taskId: string, dependsOnId: string) {
    await this.prisma.taskDependency.deleteMany({
      where: { taskId, dependsOnId },
    });

    TaskSocketManager.getInstance().broadcastToOrg(orgId, {
      type: 'dependency:removed',
      orgId,
      taskId,
      data: { taskId, dependsOnId },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Check if adding (taskId -> dependsOnId) introduces a cycle.
   * BFS search: Does dependsOnId already have a dependency path reaching taskId?
   */
  public async checkDependencyCycle(orgId: string, taskId: string, dependsOnId: string): Promise<boolean> {
    // Fetch all dependencies in the org
    const allDependencies = await this.prisma.taskDependency.findMany({
      where: {
        task: { orgId },
      },
      select: {
        taskId: true,
        dependsOnId: true,
      },
    });

    // Build adjacency list: node -> outgoing edges (what node depends on)
    const adjList = new Map<string, string[]>();
    for (const d of allDependencies) {
      if (!adjList.has(d.taskId)) {
        adjList.set(d.taskId, []);
      }
      adjList.get(d.taskId)!.push(d.dependsOnId);
    }

    // Breadth-First Search starting from dependsOnId
    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) {
        return true; // Cycle detected!
      }

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adjList.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    return false;
  }
}
