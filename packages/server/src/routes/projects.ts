import { Router, Request, Response } from 'express';
import { authenticate, requireWorkspace } from '../core/auth/AuthMiddleware.js';
import { ProjectService } from '../core/task/ProjectService.js';
import { SprintService } from '../core/task/SprintService.js';

export const projectsRouter = Router();
const projectService = ProjectService.getInstance();
const sprintService = SprintService.getInstance();

// All project routes require authentication and workspace isolation
projectsRouter.use(authenticate, requireWorkspace());

/**
 * GET /api/projects - List all projects in workspace
 */
projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const includeArchived = req.query.includeArchived === 'true';

    const projects = await projectService.listProjects(orgId, userId, includeArchived);
    return res.json({ success: true, count: projects.length, data: projects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải danh sách dự án' });
  }
});

/**
 * POST /api/projects - Create a new project
 */
projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { name, key, description, spaceId, status } = req.body;

    if (!name || !key) {
      return res.status(400).json({ success: false, error: 'Tên dự án và mã (Key) là bắt buộc' });
    }

    const project = await projectService.createProject(orgId, userId, {
      name,
      key,
      description,
      spaceId,
      status,
    });

    return res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    if (err.message === 'PROJECT_KEY_ALREADY_EXISTS') {
      return res.status(400).json({ success: false, error: 'Mã dự án (Key) đã tồn tại trong workspace' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tạo dự án' });
  }
});

/**
 * GET /api/projects/:id - Get project detail
 */
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const project = await projectService.getProject(orgId, userId, id);
    return res.json({ success: true, data: project });
  } catch (err: any) {
    if (err.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy dự án' });
    }
    if (err.message === 'WORKSPACE_ISOLATION_ERROR') {
      return res.status(403).json({ success: false, error: 'Truy cập bị từ chối: Dự án thuộc không gian làm việc khác' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tải thông tin dự án' });
  }
});

/**
 * PATCH /api/projects/:id - Update project
 */
projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const updated = await projectService.updateProject(orgId, userId, id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên dự án mới có quyền chỉnh sửa thông tin dự án' });
    }
    if (err.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy dự án' });
    }
    if (err.message === 'WORKSPACE_ISOLATION_ERROR') {
      return res.status(403).json({ success: false, error: 'Truy cập bị từ chối: Dự án thuộc không gian làm việc khác' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi cập nhật dự án' });
  }
});

/**
 * POST /api/projects/:id/archive - Archive or restore project
 */
projectsRouter.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;
    const isArchived = req.body.isArchived !== false;

    const updated = await projectService.archiveProject(orgId, userId, id, isArchived);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên dự án mới có quyền lưu trữ dự án' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi lưu trữ dự án' });
  }
});

/**
 * DELETE /api/projects/:id - Delete project
 */
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    await projectService.deleteProject(orgId, userId, id);
    return res.json({ success: true, message: 'Đã xóa dự án thành công' });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên dự án mới có quyền xóa dự án' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi xóa dự án' });
  }
});

/**
 * POST /api/projects/:id/members - Add member to project
 */
projectsRouter.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const actorUserId = req.user!.userId;
    const { id: projectId } = req.params;
    const { userId: targetUserId, role = 'member' } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'userId của thành viên là bắt buộc' });
    }

    const member = await projectService.addMember(orgId, actorUserId, projectId, targetUserId, role);
    return res.status(201).json({ success: true, data: member });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên dự án mới có quyền thêm thành viên' });
    }
    if (err.message === 'USER_NOT_IN_WORKSPACE') {
      return res.status(400).json({ success: false, error: 'Người dùng không thuộc không gian làm việc này' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi thêm thành viên vào dự án' });
  }
});

/**
 * DELETE /api/projects/:id/members/:userId - Remove member from project
 */
projectsRouter.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const actorUserId = req.user!.userId;
    const { id: projectId, userId: targetUserId } = req.params;

    await projectService.removeMember(orgId, actorUserId, projectId, targetUserId);
    return res.json({ success: true, message: 'Đã xóa thành viên khỏi dự án' });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên dự án mới có quyền xóa thành viên' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi xóa thành viên khỏi dự án' });
  }
});

/**
 * POST /api/projects/:id/sprints - Create sprint in project
 */
projectsRouter.post('/:id/sprints', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id: projectId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Tên sprint, ngày bắt đầu và ngày kết thúc là bắt buộc' });
    }

    const sprint = await sprintService.createSprint(orgId, userId, projectId, {
      name,
      goal,
      startDate,
      endDate,
    });

    return res.status(201).json({ success: true, data: sprint });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền tạo Sprint trong dự án này' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tạo sprint' });
  }
});

/**
 * Sprint Routes (Mounted at /api/sprints via export or sub-route)
 */
export const sprintsRouter = Router();
sprintsRouter.use(authenticate, requireWorkspace());

/**
 * POST /api/sprints/:id/start - Start sprint
 */
sprintsRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const sprint = await sprintService.startSprint(orgId, userId, id);
    return res.json({ success: true, data: sprint });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền kích hoạt Sprint' });
    }
    if (err.message === 'SPRINT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sprint' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi bắt đầu sprint' });
  }
});

/**
 * POST /api/sprints/:id/complete - Complete sprint
 */
sprintsRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const sprint = await sprintService.completeSprint(orgId, userId, id);
    return res.json({ success: true, data: sprint });
  } catch (err: any) {
    if (err.message === 'PROJECT_PERMISSION_DENIED') {
      return res.status(403).json({ success: false, error: 'Chỉ Quản trị viên mới có quyền kết thúc Sprint' });
    }
    if (err.message === 'SPRINT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sprint' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi hoàn thành sprint' });
  }
});

/**
 * POST /api/sprints/:id/tasks - Assign tasks to sprint
 */
sprintsRouter.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const userId = req.user!.userId;
    const { id: sprintId } = req.params;
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ success: false, error: 'taskIds phải là một mảng' });
    }

    const result = await sprintService.assignTasksToSprint(orgId, userId, sprintId, taskIds);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi giao task vào sprint' });
  }
});

/**
 * GET /api/sprints/:id/burndown - Real Burndown calculation
 */
sprintsRouter.get('/:id/burndown', async (req: Request, res: Response) => {
  try {
    const orgId = req.workspace!.orgId;
    const { id: sprintId } = req.params;

    const burndown = await sprintService.getBurndownData(orgId, sprintId);
    return res.json({ success: true, data: burndown });
  } catch (err: any) {
    if (err.message === 'SPRINT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sprint' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi tính toán biểu đồ Burndown' });
  }
});
