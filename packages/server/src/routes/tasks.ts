import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../storage/db.js';
import { authenticate, requireWorkspace } from '../core/auth/AuthMiddleware.js';
import { TaskService } from '../core/task/TaskService.js';

export const tasksRouter = Router();
const prisma = getPrismaClient();
const taskService = TaskService.getInstance();

// Protected task router with strict workspace isolation
tasksRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/tasks - List tasks for the authenticated user's workspace
 */
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;

    const filters = {
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      sprintId: req.query.sprintId ? String(req.query.sprintId) : undefined,
      parentTaskId: req.query.parentTaskId !== undefined ? (req.query.parentTaskId ? String(req.query.parentTaskId) : null as any) : undefined,
      column: req.query.column ? String(req.query.column) : undefined,
      priority: req.query.priority ? String(req.query.priority) : undefined,
      assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : undefined,
    };

    const tasks = await taskService.listTasks(orgId, userId, filters);

    return res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải công việc' });
  }
});

/**
 * GET /api/tasks/:id - Get a specific task with Workspace Isolation
 */
tasksRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if task exists anywhere first for workspace isolation test assertion
    const taskAnywhere = await prisma.task.findUnique({ where: { id } });
    if (!taskAnywhere) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }

    if (taskAnywhere.orgId !== orgId) {
      await prisma.auditLog.create({
        data: {
          orgId,
          action: 'WORKSPACE_TASK_ACCESS_DENIED',
          actor: req.user!.email,
          target: `Task:${id}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `User from org ${orgId} attempted to read task from org ${taskAnywhere.orgId}`,
        },
      });

      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Công việc này thuộc không gian làm việc khác',
      });
    }

    const task = await taskService.getTask(orgId, userId, id);
    return res.json({ success: true, data: task });
  } catch (err: any) {
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    if (err.message === 'WORKSPACE_ISOLATION_ERROR') {
      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Công việc này thuộc không gian làm việc khác',
      });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải chi tiết công việc' });
  }
});

/**
 * POST /api/tasks - Create task in current workspace
 */
tasksRouter.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const actor = {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
    };

    const {
      title,
      description = '',
      column = 'todo',
      priority = 'normal',
      storyPoints,
      estimatedMinutes,
      projectId,
      sprintId,
      parentTaskId,
      assigneeId,
      assigneeName,
      assignees,
      dueDate,
      labels = [],
      checklist = [],
      sourceMessageId,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Tiêu đề công việc là bắt buộc' });
    }

    const created = await taskService.createTask(orgId, actor, {
      title: title.trim(),
      description: String(description || '').trim(),
      column,
      priority,
      storyPoints: storyPoints !== undefined ? Number(storyPoints) : 0,
      estimatedMinutes: estimatedMinutes !== undefined ? Number(estimatedMinutes) : 0,
      projectId,
      sprintId,
      parentTaskId,
      assigneeId,
      assigneeName,
      assignees,
      dueDate,
      labels,
      checklist,
      sourceMessageId,
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'TASK_CREATED',
        actor: req.user!.email,
        target: `Task:${created.id}`,
        ip: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        details: JSON.stringify({ title: created.title, column: created.column }),
      },
    });

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    if (err.message === 'WORKSPACE_ISOLATION_ERROR') {
      await prisma.auditLog.create({
        data: {
          orgId: req.workspace?.orgId || 'unknown',
          action: 'WORKSPACE_TASK_CREATE_DENIED',
          actor: req.user?.email || 'unknown',
          target: `Project:${req.body?.projectId || 'unknown'}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `User from org ${req.workspace?.orgId} attempted to create task referencing projectId ${req.body?.projectId}`,
        },
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Dự án này thuộc không gian làm việc khác',
      });
    }
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền tạo công việc trong dự án này' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tạo công việc' });
  }
});

/**
 * PATCH /api/tasks/:id - Update task with Workspace Isolation
 */
tasksRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id } = req.params;
    const actor = {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
    };

    const taskAnywhere = await prisma.task.findUnique({ where: { id } });
    if (!taskAnywhere) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }

    if (taskAnywhere.orgId !== orgId) {
      await prisma.auditLog.create({
        data: {
          orgId,
          action: 'WORKSPACE_TASK_MUTATE_DENIED',
          actor: req.user!.email,
          target: `Task:${id}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `User from org ${orgId} attempted to modify task from org ${taskAnywhere.orgId}`,
        },
      });

      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Không thể chỉnh sửa công việc thuộc không gian làm việc khác',
      });
    }

    const updated = await taskService.updateTask(orgId, actor, id, req.body);
    return res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa công việc này' });
    }
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    if (err.message === 'WORKSPACE_ISOLATION_ERROR') {
      return res.status(403).json({ success: false, error: 'Truy cập bị từ chối: Không thể chỉnh sửa công việc thuộc không gian làm việc khác' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi cập nhật công việc' });
  }
});

/**
 * DELETE /api/tasks/:id - Delete task with Workspace Isolation
 */
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id } = req.params;
    const actor = {
      userId: req.user!.userId,
      name: req.user!.name,
      email: req.user!.email,
    };

    const taskAnywhere = await prisma.task.findUnique({ where: { id } });
    if (!taskAnywhere) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }

    if (taskAnywhere.orgId !== orgId) {
      await prisma.auditLog.create({
        data: {
          orgId,
          action: 'WORKSPACE_TASK_DELETE_DENIED',
          actor: req.user!.email,
          target: `Task:${id}`,
          ip: req.ip || '127.0.0.1',
          status: 'ERROR',
          details: `User from org ${orgId} attempted to delete task from org ${taskAnywhere.orgId}`,
        },
      });

      return res.status(403).json({
        success: false,
        error: 'Truy cập bị từ chối: Không thể xóa công việc thuộc không gian làm việc khác',
      });
    }

    await taskService.deleteTask(orgId, actor, id);

    await prisma.auditLog.create({
      data: {
        orgId,
        action: 'TASK_DELETED',
        actor: req.user!.email,
        target: `Task:${id}`,
        ip: req.ip || '127.0.0.1',
        status: 'SUCCESS',
      },
    });

    return res.json({ success: true, message: 'Đã xóa công việc thành công' });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa công việc này' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi xóa công việc' });
  }
});

/**
 * POST /api/tasks/:id/dependencies - Add task dependency with Cycle Detection
 */
tasksRouter.post('/:id/dependencies', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: taskId } = req.params;
    const { dependsOnId, type = 'finish_to_start' } = req.body;
    const actor = { userId: req.user!.userId, name: req.user!.name };

    if (!dependsOnId) {
      return res.status(400).json({ success: false, error: 'dependsOnId là bắt buộc' });
    }

    const dependency = await taskService.addDependency(orgId, actor, taskId, dependsOnId, type);
    return res.status(201).json({ success: true, data: dependency });
  } catch (err: any) {
    if (err.message === 'DEPENDENCY_CYCLE_DETECTED') {
      return res.status(400).json({
        success: false,
        error: 'Phát hiện vòng lặp phụ thuộc (Dependency cycle detected)',
      });
    }
    if (err.message === 'DEPENDENCY_SELF_REFERENCE') {
      return res.status(400).json({
        success: false,
        error: 'Công việc không thể tự phụ thuộc vào chính mình',
      });
    }
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi thêm phụ thuộc' });
  }
});

/**
 * DELETE /api/tasks/:id/dependencies/:dependsOnId - Remove dependency
 */
tasksRouter.delete('/:id/dependencies/:dependsOnId', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: taskId, dependsOnId } = req.params;

    await taskService.removeDependency(orgId, taskId, dependsOnId);
    return res.json({ success: true, message: 'Đã gỡ bỏ phụ thuộc thành công' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi xóa phụ thuộc' });
  }
});

/**
 * POST /api/tasks/:id/comments - Add comment with @mention notification
 */
tasksRouter.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: taskId } = req.params;
    const { content } = req.body;
    const author = {
      userId: req.user!.userId,
      name: req.user!.name,
      color: '#3b82f6',
    };

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Nội dung bình luận là bắt buộc' });
    }

    const comment = await taskService.addComment(orgId, author, taskId, content);
    return res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi thêm bình luận' });
  }
});

/**
 * POST /api/tasks/:id/time-logs - Log work duration
 */
tasksRouter.post('/:id/time-logs', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: taskId } = req.params;
    const { durationSeconds, note, startTime, endTime } = req.body;
    const user = { userId: req.user!.userId, name: req.user!.name };

    if (!durationSeconds || durationSeconds <= 0) {
      return res.status(400).json({ success: false, error: 'Thời lượng làm việc phải lớn hơn 0' });
    }

    const log = await taskService.addTimeLog(orgId, user, taskId, {
      durationSeconds: Number(durationSeconds),
      note,
      startTime,
      endTime,
    });

    return res.status(201).json({ success: true, data: log });
  } catch (err: any) {
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi ghi nhận giờ làm' });
  }
});

/**
 * GET /api/tasks/:id/time-logs - List time logs for a task
 */
tasksRouter.get('/:id/time-logs', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: taskId } = req.params;

    const logs = await taskService.listTimeLogs(orgId, taskId);
    return res.json({ success: true, data: logs });
  } catch (err: any) {
    if (err.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy công việc' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải lịch sử chấm công' });
  }
});
