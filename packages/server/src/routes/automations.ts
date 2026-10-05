import { Router, Request, Response } from 'express';

export const automationsRouter = Router();

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: 'tasks' | 'crm' | 'devops' | 'admin' | 'schedule';
  trigger: {
    type: 'task.completed' | 'task.overdue' | 'task.created' | 'file.uploaded' | 'message.urgent' | 'schedule.cron' | 'webhook.received';
    label: string;
    params?: Record<string, any>;
  };
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'in';
    value: string;
    label: string;
  };
  action: {
    type: 'chat.send_message' | 'email.send' | 'task.create' | 'task.update_status' | 'webhook.trigger';
    label: string;
    params?: Record<string, any>;
  };
  isEnabled: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'success' | 'failed';
  triggerEvent: string;
  executionTimeMs: number;
  payload: Record<string, any>;
  timestamp: string;
}

export interface RegisteredWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secretKey: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  url: string;
  event: string;
  statusCode: number;
  responseBody: string;
  latencyMs: number;
  timestamp: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  role: 'read' | 'write' | 'admin';
  rateLimitPerHour: number;
  usageThisHour: number;
  createdAt: string;
  expiresAt: string;
}

// In-Memory Database for Automations
let rules: AutomationRule[] = [
  {
    id: 'rule_1',
    name: 'Thông báo kênh Chat khi Task hoàn tất',
    description: 'Tự động gửi tin nhắn chúc mừng và thông báo vào nhóm Zalo khi thẻ việc chuyển sang Done.',
    category: 'tasks',
    trigger: {
      type: 'task.completed',
      label: 'Khi thẻ việc chuyển sang trạng thái "Hoàn thành"',
    },
    condition: {
      field: 'priority',
      operator: 'in',
      value: 'high,urgent',
      label: 'Chỉ áp dụng với công việc Ưu tiên cao hoặc Khẩn cấp',
    },
    action: {
      type: 'chat.send_message',
      label: 'Gửi tin nhắn vào kênh #thông-báo-chung',
      params: { channel: '#thông-báo-chung', template: '🎉 Thẻ việc "{task_title}" đã hoàn tất bởi {assignee}!' },
    },
    isEnabled: true,
    runCount: 42,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'rule_2',
    name: 'Cảnh báo và đổi cờ khi Task quá hạn',
    description: 'Tự động gắn nhãn "Trễ hạn" và gửi email nhắc nhở người phụ trách nếu deadline đã qua.',
    category: 'tasks',
    trigger: {
      type: 'task.overdue',
      label: 'Khi thời gian hiện tại vượt quá hạn chót (Deadline)',
    },
    action: {
      type: 'task.update_status',
      label: 'Gắn thẻ nhãn "Trễ hạn" và gửi email cảnh báo',
      params: { tag: 'Trễ hạn', notifyAssignee: true },
    },
    isEnabled: true,
    runCount: 18,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: '2026-09-16T10:00:00Z',
  },
  {
    id: 'rule_3',
    name: 'Tự tạo Task Review khi có GitHub Pull Request',
    description: 'Mỗi khi lập trình viên mở PR mới trên GitHub, tự động tạo thẻ review trong cột To Do của Kanban.',
    category: 'devops',
    trigger: {
      type: 'webhook.received',
      label: 'Khi nhận sự kiện webhook pull_request.opened từ GitHub',
    },
    action: {
      type: 'task.create',
      label: 'Tạo thẻ việc Kanban mới trong cột To Do',
      params: { column: 'To Do', priority: 'high', title: 'Review PR: {pr_title}' },
    },
    isEnabled: true,
    runCount: 65,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    createdAt: '2026-09-18T14:30:00Z',
  },
  {
    id: 'rule_4',
    name: 'Tạo hồ sơ CRM & gửi email khi khách điền form',
    description: 'Khách hàng đăng ký trên Landing Page -> Tự lưu vào HubSpot CRM và gửi email cảm ơn trong 5 giây.',
    category: 'crm',
    trigger: {
      type: 'webhook.received',
      label: 'Khi có lượt gửi biểu mẫu đăng ký tư vấn khách hàng',
    },
    action: {
      type: 'email.send',
      label: 'Gửi email xác nhận kèm tài liệu giới thiệu giải pháp',
      params: { template: 'welcome_kit', sendToClient: true },
    },
    isEnabled: true,
    runCount: 124,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: '2026-09-20T09:15:00Z',
  },
  {
    id: 'rule_5',
    name: 'Tự động tạo task "Báo cáo tuần" sáng thứ Hai',
    description: 'Vào lúc 08:00 sáng mỗi thứ Hai, tự tạo công việc định kỳ nhắc các trưởng bộ phận nộp báo cáo.',
    category: 'schedule',
    trigger: {
      type: 'schedule.cron',
      label: 'Định kỳ 08:00 sáng Thứ Hai hàng tuần (Cron: 0 8 * * 1)',
    },
    action: {
      type: 'task.create',
      label: 'Tạo thẻ "Tổng kết & Báo cáo tiến độ tuần"',
      params: { column: 'To Do', priority: 'medium' },
    },
    isEnabled: true,
    runCount: 8,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdAt: '2026-09-01T08:00:00Z',
  },
];

let executionLogs: ExecutionLog[] = [
  {
    id: 'log_101',
    ruleId: 'rule_1',
    ruleName: 'Thông báo kênh Chat khi Task hoàn tất',
    status: 'success',
    triggerEvent: 'task.completed',
    executionTimeMs: 142,
    payload: { taskId: 'task_88', title: 'Thiết kế giao diện bảng trắng FigJam', assignee: 'Nguyễn Văn Nam' },
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'log_102',
    ruleId: 'rule_3',
    ruleName: 'Tự tạo Task Review khi có GitHub Pull Request',
    status: 'success',
    triggerEvent: 'pull_request.opened',
    executionTimeMs: 235,
    payload: { repo: 'real-time-collab', prNumber: 42, title: 'feat: add CRDT WebSockets gateway' },
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'log_103',
    ruleId: 'rule_4',
    ruleName: 'Tạo hồ sơ CRM & gửi email khi khách điền form',
    status: 'success',
    triggerEvent: 'lead.registered',
    executionTimeMs: 310,
    payload: { email: 'ceo@techstartup.vn', company: 'TechCorp Vietnam', interest: 'Enterprise Plan' },
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

let registeredWebhooks: RegisteredWebhook[] = [
  {
    id: 'wh_1',
    name: 'Zapier Lead & CRM Integration',
    url: 'https://hooks.zapier.com/hooks/catch/1982341/b841a9/',
    events: ['task.completed', 'file.uploaded'],
    secretKey: 'whsec_zapier_live_9a8b7c6d5e4f3a2b1c',
    isEnabled: true,
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'wh_2',
    name: 'Discord / Slack DevOps Alert Webhook',
    url: 'https://discord.com/api/webhooks/12893819283/aBcDeFgHiJkLmNoP',
    events: ['task.overdue', 'message.urgent'],
    secretKey: 'whsec_discord_live_3f2e1d4c5b6a7988',
    isEnabled: true,
    createdAt: '2026-09-18T16:20:00Z',
  },
];

let webhookDeliveries: WebhookDeliveryLog[] = [
  {
    id: 'del_1',
    webhookId: 'wh_1',
    url: 'https://hooks.zapier.com/hooks/catch/1982341/b841a9/',
    event: 'task.completed',
    statusCode: 200,
    responseBody: '{"status": "success", "attempt": 1}',
    latencyMs: 185,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'del_2',
    webhookId: 'wh_2',
    url: 'https://discord.com/api/webhooks/12893819283/aBcDeFgHiJkLmNoP',
    event: 'message.urgent',
    statusCode: 200,
    responseBody: '{"ok": true}',
    latencyMs: 95,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

let apiKeys: ApiKeyItem[] = [
  {
    id: 'key_1',
    name: 'Production Server Token (Backend App)',
    keyPrefix: 'col_live_9f8e...',
    fullKey: 'col_live_9f8e7d6c5b4a3120ff99887766554433',
    role: 'admin',
    rateLimitPerHour: 2000,
    usageThisHour: 342,
    createdAt: '2026-09-01T00:00:00Z',
    expiresAt: '2027-09-01T00:00:00Z',
  },
  {
    id: 'key_2',
    name: 'CI/CD GitHub Action Runner',
    keyPrefix: 'col_ci_3a4b...',
    fullKey: 'col_ci_3a4b5c6d7e8f9012aabbccddeeff0011',
    role: 'write',
    rateLimitPerHour: 500,
    usageThisHour: 48,
    createdAt: '2026-09-10T12:00:00Z',
    expiresAt: '2027-03-10T12:00:00Z',
  },
];

// ============================================================================
// 1. WORKFLOW RULES ENDPOINTS
// ============================================================================

// GET /api/automations/rules
automationsRouter.get('/rules', (req: Request, res: Response) => {
  res.json({ success: true, data: rules });
});

// POST /api/automations/rules
automationsRouter.post('/rules', (req: Request, res: Response) => {
  const { name, description, category, trigger, condition, action } = req.body;
  if (!name || !trigger || !action) {
    return res.status(400).json({ success: false, error: 'Tên quy tắc, Trigger và Action là bắt buộc.' });
  }

  const newRule: AutomationRule = {
    id: `rule_${Date.now()}`,
    name,
    description: description || '',
    category: category || 'tasks',
    trigger,
    condition,
    action,
    isEnabled: true,
    runCount: 0,
    createdAt: new Date().toISOString(),
  };

  rules.unshift(newRule);
  res.status(201).json({ success: true, data: newRule });
});

// PATCH /api/automations/rules/:id/toggle
automationsRouter.patch('/rules/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const rule = rules.find((r) => r.id === id);
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy quy tắc tự động.' });
  }

  rule.isEnabled = !rule.isEnabled;
  res.json({ success: true, data: rule });
});

// POST /api/automations/rules/:id/test (Run test execution)
automationsRouter.post('/rules/:id/test', (req: Request, res: Response) => {
  const { id } = req.params;
  const rule = rules.find((r) => r.id === id);
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy quy tắc.' });
  }

  rule.runCount += 1;
  rule.lastRunAt = new Date().toISOString();

  const newLog: ExecutionLog = {
    id: `log_${Date.now()}`,
    ruleId: rule.id,
    ruleName: rule.name,
    status: 'success',
    triggerEvent: rule.trigger.type,
    executionTimeMs: Math.floor(Math.random() * 150) + 50,
    payload: {
      testRun: true,
      triggeredBy: 'Manual Test Execution',
      result: `Hành động [${rule.action.label}] đã được chạy thử nghiệm thành công!`,
    },
    timestamp: new Date().toISOString(),
  };

  executionLogs.unshift(newLog);
  res.json({ success: true, message: 'Đã chạy thử nghiệm quy tắc thành công!', log: newLog });
});

// DELETE /api/automations/rules/:id
automationsRouter.delete('/rules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  rules = rules.filter((r) => r.id !== id);
  res.json({ success: true, message: 'Đã xóa quy tắc thành công.' });
});

// ============================================================================
// 2. EXECUTION LOGS ENDPOINTS
// ============================================================================

// GET /api/automations/logs
automationsRouter.get('/logs', (req: Request, res: Response) => {
  res.json({ success: true, data: executionLogs });
});

// ============================================================================
// 3. WEBHOOKS ENDPOINTS
// ============================================================================

// GET /api/automations/webhooks
automationsRouter.get('/webhooks', (req: Request, res: Response) => {
  res.json({ success: true, data: registeredWebhooks });
});

// POST /api/automations/webhooks
automationsRouter.post('/webhooks', (req: Request, res: Response) => {
  const { name, url, events } = req.body;
  if (!name || !url) {
    return res.status(400).json({ success: false, error: 'Tên webhook và URL là bắt buộc.' });
  }

  const newWebhook: RegisteredWebhook = {
    id: `wh_${Date.now()}`,
    name,
    url,
    events: events && events.length > 0 ? events : ['task.completed', 'file.uploaded'],
    secretKey: `whsec_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`,
    isEnabled: true,
    createdAt: new Date().toISOString(),
  };

  registeredWebhooks.unshift(newWebhook);
  res.status(201).json({ success: true, data: newWebhook });
});

// POST /api/automations/webhooks/:id/test (Ping test webhook)
automationsRouter.post('/webhooks/:id/test', (req: Request, res: Response) => {
  const { id } = req.params;
  const wh = registeredWebhooks.find((w) => w.id === id);
  if (!wh) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy webhook.' });
  }

  const delivery: WebhookDeliveryLog = {
    id: `del_${Date.now()}`,
    webhookId: wh.id,
    url: wh.url,
    event: 'test.ping',
    statusCode: 200,
    responseBody: '{"status": "ok", "deliveredAt": "' + new Date().toISOString() + '"}',
    latencyMs: Math.floor(Math.random() * 120) + 40,
    timestamp: new Date().toISOString(),
  };

  webhookDeliveries.unshift(delivery);
  res.json({ success: true, message: 'Đã gửi gói tin webhook kiểm tra (200 OK)!', delivery });
});

// GET /api/automations/webhooks/deliveries
automationsRouter.get('/webhooks/deliveries', (req: Request, res: Response) => {
  res.json({ success: true, data: webhookDeliveries });
});

// DELETE /api/automations/webhooks/:id
automationsRouter.delete('/webhooks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  registeredWebhooks = registeredWebhooks.filter((w) => w.id !== id);
  res.json({ success: true, message: 'Đã xóa webhook.' });
});

// POST /api/automations/incoming-webhook (Endpoint for external apps like GitHub, Jira, Zapier)
automationsRouter.post('/incoming-webhook', (req: Request, res: Response) => {
  const payload = req.body;
  const event = req.headers['x-event-type'] || 'custom.event';

  const newLog: ExecutionLog = {
    id: `log_inc_${Date.now()}`,
    ruleId: 'external_webhook',
    ruleName: `Incoming Webhook: ${event}`,
    status: 'success',
    triggerEvent: String(event),
    executionTimeMs: 45,
    payload,
    timestamp: new Date().toISOString(),
  };

  executionLogs.unshift(newLog);
  res.json({ success: true, message: 'Đã nhận và kích hoạt quy trình tự động thành công.', eventId: newLog.id });
});

// ============================================================================
// 4. API KEYS ENDPOINTS
// ============================================================================

// GET /api/automations/keys
automationsRouter.get('/keys', (req: Request, res: Response) => {
  res.json({ success: true, data: apiKeys });
});

// POST /api/automations/keys
automationsRouter.post('/keys', (req: Request, res: Response) => {
  const { name, role, rateLimitPerHour } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Tên API key là bắt buộc.' });
  }

  const rawToken = `col_${role || 'write'}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

  const newKey: ApiKeyItem = {
    id: `key_${Date.now()}`,
    name,
    keyPrefix: rawToken.substring(0, 12) + '...',
    fullKey: rawToken,
    role: role || 'write',
    rateLimitPerHour: rateLimitPerHour || 1000,
    usageThisHour: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  };

  apiKeys.unshift(newKey);
  res.status(201).json({ success: true, data: newKey });
});

// DELETE /api/automations/keys/:id
automationsRouter.delete('/keys/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  apiKeys = apiKeys.filter((k) => k.id !== id);
  res.json({ success: true, message: 'Đã thu hồi API key thành công.' });
});
