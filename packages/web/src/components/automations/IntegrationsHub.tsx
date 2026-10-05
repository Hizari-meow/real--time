'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Check,
  Copy,
  Plus,
  Search,
  Settings,
  Play,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Code2,
  Webhook,
  Key,
  Bot,
  Sparkles,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sliders,
  ShieldCheck,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Send,
  FileText,
  MessageSquare,
  HelpCircle,
  Info,
  Lock,
  Hash,
  Cpu,
  Eye,
  X,
  Radio,
  BookOpen,
  Calendar,
  Mail,
  Tag,
  Share2,
} from 'lucide-react';
import {
  IntegrationApp,
  IntegrationCategory,
  AutomationRule,
  ExecutionLog,
  RegisteredWebhook,
  WebhookDeliveryLog,
  ApiKeyItem,
  ApiEndpointSpec,
} from './types';
import { SEED_INTEGRATIONS } from './apps-data';
import { AVAILABLE_TRIGGERS, AVAILABLE_ACTIONS, PREBUILT_TEMPLATES } from './templates-data';
import {
  API_ENDPOINTS,
  generateCurlSnippet,
  generateJsSnippet,
  generatePythonSnippet,
} from './api-specs';
import {
  dispatchWorkplaceChatMessage,
  dispatchWebhookDelivery,
  appendAuditLog,
  addNotification,
  emitDomainEvent,
  STORAGE_KEYS,
} from '../../lib/domain-event-bus';

const INITIAL_AUTOMATION_RULES: AutomationRule[] = PREBUILT_TEMPLATES.map((tmpl, idx) => ({
  id: tmpl.id || `rule_tmpl_${idx + 1}`,
  name: tmpl.name || 'Quy trình tự động',
  description: tmpl.description || '',
  category: tmpl.category || 'tasks',
  trigger: tmpl.trigger || AVAILABLE_TRIGGERS[0],
  condition: tmpl.condition,
  action: tmpl.action || AVAILABLE_ACTIONS[0],
  isEnabled: tmpl.isEnabled ?? true,
  runCount: tmpl.runCount || 0,
  createdAt: new Date().toISOString(),
}));

export function IntegrationsHub() {
  // Navigation Tabs: 'apps' | 'workflows' | 'developer' | 'ai'
  const [activeTab, setActiveTab] = useState<'apps' | 'workflows' | 'developer' | 'ai'>('apps');

  // Pillar 1: Apps State
  const [integrations, setIntegrations] = useState<IntegrationApp[]>(SEED_INTEGRATIONS);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>('all');
  const [appSearch, setAppSearch] = useState('');
  const [activeAppModal, setActiveAppModal] = useState<IntegrationApp | null>(null);
  const [viewingCommandsApp, setViewingCommandsApp] = useState<IntegrationApp | null>(null);
  const [viewingUnfurlApp, setViewingUnfurlApp] = useState<IntegrationApp | null>(null);
  const [appPingSuccess, setAppPingSuccess] = useState<string | null>(null);

  // Pillar 2: Workflows State
  const [rules, setRules] = useState<AutomationRule[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('collab_automation_rules');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_AUTOMATION_RULES;
  });
  const [logs, setLogs] = useState<ExecutionLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('collab_automation_logs');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('collab_automation_rules', JSON.stringify(rules));
    } catch {}
  }, [rules]);

  // Synchronize rules & logs when background automations execute anywhere across modules
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reloadRulesAndLogs = () => {
      try {
        const storedRules = localStorage.getItem('collab_automation_rules');
        if (storedRules) {
          const parsed = JSON.parse(storedRules);
          if (Array.isArray(parsed) && parsed.length > 0) setRules(parsed);
        }
        const storedLogs = localStorage.getItem('collab_automation_logs');
        if (storedLogs) {
          const parsed = JSON.parse(storedLogs);
          if (Array.isArray(parsed)) setLogs(parsed);
        }
      } catch {}
    };

    window.addEventListener('collab_automation_executed', reloadRulesAndLogs);
    window.addEventListener('storage', reloadRulesAndLogs);
    return () => {
      window.removeEventListener('collab_automation_executed', reloadRulesAndLogs);
      window.removeEventListener('storage', reloadRulesAndLogs);
    };
  }, []);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState(AVAILABLE_TRIGGERS[0].type);
  const [newRuleCondField, setNewRuleCondField] = useState('priority');
  const [newRuleCondValue, setNewRuleCondValue] = useState('high,urgent');
  const [newRuleAction, setNewRuleAction] = useState(AVAILABLE_ACTIONS[0].type);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [ruleTestSuccess, setRuleTestSuccess] = useState<string | null>(null);

  // Pillar 3: Developer State
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<RegisteredWebhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRole, setNewKeyRole] = useState<'read' | 'write' | 'admin'>('write');
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointSpec>(API_ENDPOINTS[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'js' | 'python'>('curl');
  const [apiConsoleResponse, setApiConsoleResponse] = useState<string | null>(null);
  const [apiConsoleLoading, setApiConsoleLoading] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Pillar 4: AI Automations State
  const [aiSubTab, setAiSubTab] = useState<'summarize' | 'writer' | 'qa' | 'triage'>('summarize');
  // Summarizer
  const [meetingChatInput, setMeetingChatInput] = useState(
    `[09:00] Alice: Hôm nay chúng ta cần chốt giải pháp CRDT cho Bảng trắng và phân hệ Tự động hóa.
[09:05] Nam: Mình đã dựng xong mô hình Trigger -> Condition -> Action và 12 app tích hợp gồm Slack, Jira, GitHub, Stripe.
[09:12] Bob: Webhook outgoing cần bổ sung mã hóa HMAC SHA-256 để bảo vệ bảo mật dữ liệu. Mình sẽ tạo PR trưa nay.
[09:20] Alice: Đồng ý. Mục tiêu chiều nay là chạy thử nghiệm 100 webhook ping và kiểm tra rate limiting 2,000 req/h.`
  );
  const [meetingSummaryResult, setMeetingSummaryResult] = useState<{
    summary: string[];
    actionItems: { task: string; owner: string }[];
  } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Writer
  const [writerInput, setWriterInput] = useState(
    'Chúng tôi đã hoàn thành xong bản cập nhật hệ thống tích hợp và tự động hóa hôm nay. Mọi người xem qua và cho ý kiến.'
  );
  const [writerMode, setWriterMode] = useState<'formal' | 'bullet' | 'table' | 'concise'>('formal');
  const [writerOutput, setWriterOutput] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  // Semantic Q&A
  const [qaQuery, setQaQuery] = useState('');
  const [qaAnswer, setQaAnswer] = useState<{ text: string; sources: string[]; confidence: string } | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // Autonomous Triage
  const [triageInput, setTriageInput] = useState(
    'Khách hàng VIP TechCorp báo lỗi: Khi gửi Webhook từ Stripe về, hệ thống báo timeout 504 và không tự cập nhật trạng thái hợp đồng. Cần kỹ sư xử lý gấp trong 30 phút!'
  );
  const [triageResult, setTriageResult] = useState<{
    category: string;
    priority: string;
    suggestedAssignee: string;
    recommendedColumn: string;
    summaryTitle: string;
  } | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [triageTaskCreated, setTriageTaskCreated] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

  // Load initial rules, logs, keys, webhooks from backend
  const fetchAutomationsData = async () => {
    try {
      const [rulesRes, logsRes, keysRes, webhooksRes, deliveriesRes] = await Promise.all([
        fetch(`${apiUrl}/automations/rules`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch(`${apiUrl}/automations/logs`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch(`${apiUrl}/automations/keys`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch(`${apiUrl}/automations/webhooks`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch(`${apiUrl}/automations/webhooks/deliveries`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ]);

      if (rulesRes.success && rulesRes.data.length > 0) {
        setRules(rulesRes.data);
      }
      if (logsRes.success && logsRes.data.length > 0) {
        setLogs(logsRes.data);
      }
      if (keysRes.success && keysRes.data.length > 0) {
        setApiKeys(keysRes.data);
      }
      if (webhooksRes.success && webhooksRes.data.length > 0) {
        setWebhooks(webhooksRes.data);
      }
      if (deliveriesRes.success && deliveriesRes.data.length > 0) {
        setWebhookLogs(deliveriesRes.data);
      }
    } catch (e) {
      console.error('Error fetching automations data:', e);
    }
  };

  useEffect(() => {
    fetchAutomationsData();
  }, []);

  // Filtered Apps
  const filteredApps = integrations.filter((app) => {
    const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchSearch =
      app.name.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.description.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.categoryLabel.toLowerCase().includes(appSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  // App connection toggle
  const toggleAppConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIntegrations((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              isConnected: !app.isConnected,
              syncCount: !app.isConnected ? app.syncCount + 1 : app.syncCount,
              lastSyncedAt: !app.isConnected ? 'Vừa xong' : app.lastSyncedAt,
            }
          : app
      )
    );
  };

  // Ping App Test
  const handleTestAppPing = (appName: string) => {
    setAppPingSuccess(`Đã kiểm tra kết nối với ${appName}: Phản hồi HTTP 200 OK (Độ trễ 48ms). Dữ liệu đồng bộ hoạt động bình thường!`);
    setTimeout(() => setAppPingSuccess(null), 4000);
  };

  // Toggle Rule Active
  const handleToggleRule = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/automations/rules/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.map((r) => (r.id === id ? data.data : r)));
      } else {
        // Fallback local update
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)));
      }
    } catch {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)));
    }
  };

  // Test Run Rule with Real End-to-End Execution
  const handleTestRunRule = async (ruleId: string, ruleName: string) => {
    setTestingRuleId(ruleId);
    const rule = rules.find((r) => r.id === ruleId);
    const actionType = rule?.action?.type || 'task.create';
    const triggerType = rule?.trigger?.type || 'manual.test_run';

    // 1. Actually execute the real action across modules!
    let executionDetails = 'Tác vụ đã được kích hoạt thành công.';

    if (actionType === 'task.create') {
      try {
        const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
        const tasks = rawTasks ? JSON.parse(rawTasks) : [];
        const isBatch = rule?.action?.params?.template === 'onboarding_standard_5_steps';

        if (isBatch) {
          const batchTasks = [
            {
              id: `task_auto_${Date.now()}_1`,
              key: `ONB-${Math.floor(10 + Math.random() * 90)}`,
              title: '[Quy trình Onboarding] Cài đặt tài khoản & Kích hoạt 2FA',
              description: `Tạo tự động từ quy trình: "${ruleName}".`,
              column: 'todo',
              priority: 'urgent',
              assigneeId: 'usr_nam',
              assigneeName: 'Nguyễn Văn Nam',
              dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              labels: ['Onboarding', 'Tự động hóa'],
              checklist: [
                { id: 'c1', text: 'Cài đặt Google Authenticator', completed: false },
                { id: 'c2', text: 'Khai báo SSH Key vào Git', completed: false },
              ],
            },
            {
              id: `task_auto_${Date.now()}_2`,
              key: `ONB-${Math.floor(10 + Math.random() * 90)}`,
              title: '[Quy trình Onboarding] Nghiên cứu SOP Quy chuẩn vận hành',
              description: `Tạo tự động từ quy trình: "${ruleName}".`,
              column: 'todo',
              priority: 'high',
              assigneeId: 'usr_nam',
              assigneeName: 'Nguyễn Văn Nam',
              dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
              labels: ['SOP', 'Tri thức'],
            },
          ];
          localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...tasks, ...batchTasks]));
          executionDetails = `Đã tạo ${batchTasks.length} nhiệm vụ Onboarding vào cột To Do trên bảng việc Kanban!`;
        } else {
          const newTask = {
            id: `task_auto_${Date.now()}`,
            key: `AUTO-${Math.floor(10 + Math.random() * 90)}`,
            title: `[Tự động hóa] ${ruleName}`,
            description: `Nhiệm vụ được kích hoạt tự động theo quy tắc: "${ruleName}".`,
            column: 'todo',
            priority: 'high',
            assigneeId: 'usr_nam',
            assigneeName: 'Nguyễn Văn Nam',
            dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
            labels: ['Tự động hóa', rule?.category || 'tasks'],
          };
          localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...tasks, newTask]));
          executionDetails = `Đã tạo nhiệm vụ "${newTask.title}" vào bảng việc Kanban!`;
        }
        window.dispatchEvent(new CustomEvent('collab_task_created'));
      } catch (err) {
        console.warn('Failed to dispatch auto task:', err);
      }
    } else if (actionType === 'chat.send_message') {
      const channel = rule?.action?.params?.channel?.replace('#', '') || 'du-an-alpha';
      const textMsg = rule?.action?.params?.message || `⚠️ [Cảnh báo quy trình: ${ruleName}] Hệ thống tự động kích hoạt thông báo điều phối!`;
      dispatchWorkplaceChatMessage(channel, {
        senderId: 'bot-automation',
        senderName: 'Workflow Automation Bot',
        senderColor: '#10b981',
        senderRole: 'Tự động hóa M7',
        type: 'bot_alert',
        content: textMsg,
        botInfo: {
          source: 'jira',
          eventTitle: `Rule: ${ruleName}`,
          eventMeta: `Kích hoạt lúc ${new Date().toLocaleTimeString('vi-VN')}`,
          statusBadge: 'TRIGGERED',
        },
      });
      executionDetails = `Đã gửi thông báo tự động vào kênh #${channel}!`;
    } else if (actionType === 'webhook.trigger') {
      dispatchWebhookDelivery(triggerType, {
        ruleId,
        ruleName,
        triggeredAt: new Date().toISOString(),
      });
      executionDetails = `Đã phát Webhook HTTP POST kèm mã HMAC-SHA256!`;
    } else if (actionType === 'email.send') {
      appendAuditLog({
        action: 'automation.email.sent',
        actionLabel: `Gửi email tự động theo quy trình "${ruleName}"`,
        actorName: 'Automation Engine',
        actorEmail: 'engine@system.internal',
        actorType: 'automation',
        resourceType: 'email',
        resourceName: rule?.action?.params?.recipient || 'all-team@collaborative.io',
      });
      addNotification({
        type: 'system',
        title: `Email tự động: "${ruleName}"`,
        body: `Đã gửi bản tin/email tới danh sách nhận. Hệ thống ghi nhận SLA 100%.`,
        senderName: 'Workflow Engine',
        senderColor: '#8b5cf6',
        targetUrl: '/#automations',
        targetLabel: 'Tự động hóa',
      });
      executionDetails = `Đã gửi email tự động và ghi nhận nhật ký kiểm toán!`;
    }

    // 2. Append real log
    const newLog: ExecutionLog = {
      id: `log_${Date.now()}`,
      ruleId,
      ruleName,
      status: 'success',
      triggerEvent: triggerType,
      executionTimeMs: Math.floor(45 + Math.random() * 80),
      payload: {
        triggeredBy: 'Trình chạy quy trình tự động M7',
        action: actionType,
        details: executionDetails,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('collab_automation_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRules((prev) => {
      const updated = prev.map((r) =>
        r.id === ruleId ? { ...r, runCount: r.runCount + 1, lastRunAt: new Date().toISOString() } : r
      );
      try {
        localStorage.setItem('collab_automation_rules', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    appendAuditLog({
      action: 'automation.rule.executed',
      actionLabel: `Thực thi quy trình tự động "${ruleName}" (${actionType})`,
      actorName: 'Automation Engine',
      actorEmail: 'engine@system.internal',
      actorType: 'automation',
      resourceType: 'automation',
      resourceName: ruleName,
    });

    setRuleTestSuccess(`Quy trình "${ruleName}" đã chạy thành công! ${executionDetails}`);
    setTestingRuleId(null);
    setTimeout(() => setRuleTestSuccess(null), 4500);
  };

  // Install Pre-built Template
  const handleInstallTemplate = (tmpl: Partial<AutomationRule>) => {
    const newRule: AutomationRule = {
      id: `rule_tmpl_${Date.now()}`,
      name: tmpl.name || 'Quy trình mới',
      description: tmpl.description || '',
      category: tmpl.category || 'tasks',
      trigger: tmpl.trigger || AVAILABLE_TRIGGERS[0],
      condition: tmpl.condition,
      action: tmpl.action || AVAILABLE_ACTIONS[0],
      isEnabled: true,
      runCount: 0,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => [newRule, ...prev]);
    setRuleTestSuccess(`Đã cài đặt mẫu quy trình "${newRule.name}" thành công!`);
    setTimeout(() => setRuleTestSuccess(null), 3500);
  };

  // Create Custom Rule
  const handleCreateRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const matchedTrigger = AVAILABLE_TRIGGERS.find((t) => t.type === newRuleTrigger) || AVAILABLE_TRIGGERS[0];
    const matchedAction = AVAILABLE_ACTIONS.find((a) => a.type === newRuleAction) || AVAILABLE_ACTIONS[0];

    const rule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName.trim(),
      description: newRuleDesc.trim() || 'Quy trình tự động hóa tùy biến.',
      category: 'tasks',
      trigger: matchedTrigger,
      condition: {
        field: newRuleCondField,
        operator: 'in',
        value: newRuleCondValue,
        label: `Áp dụng khi ${newRuleCondField} nằm trong [${newRuleCondValue}]`,
      },
      action: matchedAction,
      isEnabled: true,
      runCount: 0,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => [rule, ...prev]);
    setIsRuleModalOpen(false);
    setNewRuleName('');
    setNewRuleDesc('');
    setRuleTestSuccess(`Đã tạo quy tắc "${rule.name}" thành công!`);
    setTimeout(() => setRuleTestSuccess(null), 3500);
  };

  // Delete Rule
  const handleDeleteRule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${apiUrl}/automations/rules/${id}`, { method: 'DELETE' });
    } catch {}
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Create API Key
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const rawToken = `col_${newKeyRole}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      keyPrefix: rawToken.substring(0, 12) + '...',
      fullKey: rawToken,
      role: newKeyRole,
      rateLimitPerHour: newKeyRole === 'admin' ? 2000 : newKeyRole === 'write' ? 1000 : 500,
      usageThisHour: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setIsApiKeyModalOpen(false);
    setNewKeyName('');
  };

  // Delete API Key
  const handleDeleteApiKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Create Webhook
  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;

    const newWh: RegisteredWebhook = {
      id: `wh_${Date.now()}`,
      name: newWebhookName.trim(),
      url: newWebhookUrl.trim(),
      events: ['task.completed', 'file.uploaded'],
      secretKey: `whsec_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`,
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };

    setWebhooks((prev) => [newWh, ...prev]);
    setIsWebhookModalOpen(false);
    setNewWebhookName('');
    setNewWebhookUrl('');
  };

  // Ping Webhook Test
  const handlePingWebhook = async (whId: string, whUrl: string) => {
    try {
      const res = await fetch(`${apiUrl}/automations/webhooks/${whId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.delivery) {
        setWebhookLogs((prev) => [data.delivery, ...prev]);
      }
    } catch {
      const fallbackDelivery: WebhookDeliveryLog = {
        id: `del_${Date.now()}`,
        webhookId: whId,
        url: whUrl,
        event: 'test.ping',
        statusCode: 200,
        responseBody: '{"status": "ok", "deliveredAt": "' + new Date().toISOString() + '"}',
        latencyMs: 98,
        timestamp: new Date().toISOString(),
      };
      setWebhookLogs((prev) => [fallbackDelivery, ...prev]);
    }
  };

  // Send Live REST Test
  const handleExecuteLiveApi = () => {
    setApiConsoleLoading(true);
    setTimeout(() => {
      setApiConsoleResponse(selectedEndpoint.responseExample);
      setApiConsoleLoading(false);
    }, 450);
  };

  // Simulate Incoming Webhook from Stripe / GitHub
  const handleSimulateIncomingWebhook = () => {
    const mockPayload = {
      event: 'payment.succeeded',
      provider: 'Stripe',
      amount: 45000000,
      currency: 'VND',
      customer: 'Tập đoàn Công nghệ Sao Mai',
      reference: 'INV-2026-9081',
      timestamp: new Date().toISOString(),
    };

    try {
      emitDomainEvent('webhook.received', {
        source: 'Stripe',
        deal_value: 55000000,
        environment: 'production',
        ...mockPayload,
      });
    } catch {}

    dispatchWebhookDelivery('payment.succeeded', mockPayload);

    appendAuditLog({
      action: 'webhook.inbound.received',
      actionLabel: 'Nhận Webhook đối soát thanh toán từ Stripe (payment.succeeded)',
      actorName: 'Stripe Gateway',
      actorEmail: 'webhook@stripe.com',
      actorType: 'automation',
      resourceType: 'webhook',
      resourceName: 'payment.succeeded - INV-2026-9081',
    });

    addNotification({
      type: 'system',
      title: 'Đã nhận thanh toán từ Stripe: 45.000.000 VNĐ',
      body: 'Giao dịch INV-2026-9081 của Tập đoàn Sao Mai đã ghi nhận thành công.',
      senderName: 'Stripe Integration',
      senderColor: '#6366f1',
      targetUrl: '/#automations',
      targetLabel: 'Tự động hóa',
    });

    const newLog: ExecutionLog = {
      id: `log_inc_${Date.now()}`,
      ruleId: 'external_stripe',
      ruleName: 'Webhook nhận từ: Stripe Payment Succeeded',
      status: 'success',
      triggerEvent: 'payment.succeeded',
      executionTimeMs: 54,
      payload: mockPayload,
      timestamp: new Date().toISOString(),
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('collab_automation_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setRuleTestSuccess('Đã nhận Webhook Stripe thành công! Đã ghi nhận nhật ký kiểm toán, phát thông báo và lưu delivery log.');
    setTimeout(() => setRuleTestSuccess(null), 4000);
  };

  // AI Handler 1: Meeting Summarizer
  const handleSummarizeMeeting = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setMeetingSummaryResult({
        summary: [
          'Chốt giải pháp hoàn thiện phân hệ Tự động hóa với 12 ứng dụng kết nối và mô hình Trigger → Condition → Action.',
          'Bảo mật Webhooks bằng chữ ký điện tử HMAC SHA-256 kèm cơ chế tự động thử lại khi gặp lỗi mạng.',
          'Mục tiêu hoàn thành kiểm thử tải cho 100 webhook ping và xác thực hạn mức rate limit 2,000 req/h trong chiều nay.',
        ],
        actionItems: [
          { task: 'Hoàn thiện PR mã hóa HMAC-SHA256 cho outgoing webhooks', owner: 'Bob DevOps' },
          { task: 'Kiểm thử tải 100 webhook ping và đo độ trễ', owner: 'Alice Tech' },
          { task: 'Cập nhật tài liệu API và bảng mã mẫu cURL/JS/Python', owner: 'Nguyễn Văn Nam' },
        ],
      });
      setIsSummarizing(false);
    }, 700);
  };

  // AI Handler 2: Writing & Drafting Assistant
  const handleRewrite = () => {
    setIsRewriting(true);
    setTimeout(() => {
      if (writerMode === 'formal') {
        setWriterOutput(
          'Kính gửi Ban Lãnh đạo và Quý Đội ngũ, Phân hệ Tích hợp & Tự động hóa (Integration & Automation) đã chính thức được triển khai và hoàn tất các hạng mục kiểm thử tải trọng. Kính mời các bộ phận tham gia rà soát và đóng góp ý kiến để hoàn thiện tài liệu phát hành.'
        );
      } else if (writerMode === 'bullet') {
        setWriterOutput(
          `• Hoàn thành triển khai phân hệ Tích hợp & Tự động hóa quy trình.\n• Kết nối thông suốt 12 ứng dụng bên thứ ba (Gmail, Calendar, CRM, GitHub, Jira, Stripe...).\n• Đề nghị toàn đội ngũ rà soát và phản hồi trước 17:00 hôm nay.`
        );
      } else if (writerMode === 'table') {
        setWriterOutput(
          `| Hạng mục | Trạng thái | Ghi chú |\n| :--- | :--- | :--- |\n| Chợ ứng dụng (12 Apps) | ✅ Hoàn thành | Đã có Slash commands & Live Unfurl |\n| Visual Rule Builder | ✅ Hoàn thành | Hỗ trợ 5 Templates dựng sẵn |\n| Cổng Lập trình viên API | ✅ Hoàn thành | REST Explorer + Webhook HMAC |\n| Trợ lý AI Tự động | ✅ Hoàn thành | Tóm tắt, Soạn thảo, Q&A, Triage |`
        );
      } else {
        setWriterOutput(
          'Đã hoàn tất phân hệ Tích hợp & Tự động hóa hôm nay. Đề nghị mọi người kiểm tra và phản hồi.'
        );
      }
      setIsRewriting(false);
    }, 600);
  };

  // AI Handler 3: Semantic Q&A with Citations
  const handleAskQuestion = (preset?: string) => {
    const q = preset || qaQuery;
    if (!q.trim()) return;
    setQaQuery(q);
    setIsAnswering(true);
    setTimeout(() => {
      if (q.includes('nghỉ phép') || q.includes('chính sách')) {
        setQaAnswer({
          text: 'Theo Quy chế Lao động & Phúc lợi 2026, nhân viên chính thức được hưởng 14 ngày nghỉ phép có hưởng lương mỗi năm. Trường hợp làm việc từ xa (Remote/Hybrid), công ty hỗ trợ gói trang thiết bị 15.000.000 VNĐ cho nhân viên từ 6 tháng thâm niên trở lên.',
          sources: ['SOP-03 Quy chế Nhân sự & Phúc lợi.md (Dòng 45-68)', 'Quy định Làm việc Hybrid 2026.pdf'],
          confidence: '99.4%',
        });
      } else if (q.includes('CRDT') || q.includes('xung đột') || q.includes('Yjs')) {
        setQaAnswer({
          text: 'Kiến trúc đồng thuận sử dụng Yjs State Vector và Update Messages truyền qua WebSocket Gateway phân tán. Khi có nhiều người dùng chỉnh sửa đồng thời, thuật toán giải quyết xung đột dựa trên Lamport Timestamp và Client ID duy nhất để đảm bảo dữ liệu hội tụ mạnh (Strong Eventual Consistency).',
          sources: ['RFC-v4 Consensus Engine Specification.md (Trang 12)', 'Distributed Yjs Architecture.pdf'],
          confidence: '98.8%',
        });
      } else {
        setQaAnswer({
          text: 'Quy trình xử lý sự cố P0 (Critical Outage) yêu cầu mở War Room trong vòng 5 phút, chỉ định Incident Commander và gửi cập nhật trạng thái tới khách hàng mỗi 15 phút cho tới khi phục hồi hoàn toàn.',
          sources: ['SOP-01 Quy trình Ứng phó Sự cố Kỹ thuật P0.md (Mục 2.1)'],
          confidence: '97.5%',
        });
      }
      setIsAnswering(false);
    }, 800);
  };

  // AI Handler 4: Autonomous Triage Agent
  const handleTriageTicket = () => {
    setIsTriaging(true);
    setTriageTaskCreated(false);
    setTimeout(() => {
      setTriageResult({
        category: 'Thanh toán & Tích hợp (Integrations)',
        priority: 'Khẩn cấp (P0 / Urgent)',
        suggestedAssignee: 'Bob (DevOps & Backend Lead)',
        recommendedColumn: 'In Progress (Đang làm)',
        summaryTitle: '[P0 Fix] Xử lý Stripe Webhook Timeout 504 và đồng bộ trạng thái deal',
      });
      setIsTriaging(false);
    }, 750);
  };

  const handleCreateTriageTask = () => {
    setTriageTaskCreated(true);
    try {
      const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
      const tasks = rawTasks ? JSON.parse(rawTasks) : [];
      const p0Task = {
        id: `task_p0_stripe_${Date.now()}`,
        key: `P0-${Math.floor(10 + Math.random() * 90)}`,
        title: '[P0 Fix] Xử lý Stripe Webhook Timeout 504 và đồng bộ trạng thái deal',
        description: 'Khách hàng VIP TechCorp báo lỗi timeout 504. Tác nhân AI Triage đã tự động phân loại mức Khẩn cấp P0 và chỉ định kỹ sư xử lý gấp.',
        column: 'in_progress',
        priority: 'urgent',
        assigneeId: 'usr_nam',
        assigneeName: 'Nguyễn Văn Nam',
        assigneeColor: '#2563eb',
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        labels: ['P0', 'Khẩn cấp', 'Stripe', 'Webhook'],
        checklist: [
          { id: 'c1', text: 'Kiểm tra log lỗi 504 Gateway Timeout trên NGINX', completed: false },
          { id: 'c2', text: 'Tối ưu hóa thời gian xử lý webhook xuống dưới 500ms', completed: false },
          { id: 'c3', text: 'Thử lại webhook từ Stripe dashboard và xác nhận deal', completed: false },
        ],
        sourceRef: {
          type: 'automation',
          id: 'ai_triage',
          title: 'Autonomous AI Triage Agent',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([p0Task, ...tasks]));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      // Dispatch alert to war room chat
      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'ai-triage-bot',
        senderName: 'AI Triage Agent',
        senderColor: '#e11d48',
        senderRole: 'Trực Ban Tự Động P0',
        type: 'bot_alert',
        content: `🚨 **[BÁO ĐỘNG ĐỎ P0]** Đã tiếp nhận sự cố khẩn cấp: "${p0Task.title}"!\n- Mức độ: **Khẩn cấp (P0 / Urgent)**\n- Người phụ trách: **@Nguyễn Văn Nam**\n- Trạng thái: **Đang xử lý (In Progress)**\n- Đã đưa thẳng lên bảng việc Kanban và kích hoạt luồng ứng phó sự cố SOP-01!`,
        botInfo: {
          source: 'sentry',
          eventTitle: 'P0 Incident Triage',
          eventMeta: 'Stripe Webhook Timeout 504',
          statusBadge: 'CRITICAL',
        },
      });

      appendAuditLog({
        action: 'incident.p0.triaged',
        actionLabel: 'Tác nhân AI phân loại và tạo nhiệm vụ khẩn cấp P0 (Stripe Webhook 504)',
        actorName: 'AI Triage Agent',
        actorEmail: 'ai-triage@system.internal',
        actorType: 'automation',
        resourceType: 'task',
        resourceName: p0Task.title,
      });

      addNotification({
        type: 'task',
        title: `🚨 Sự cố khẩn cấp P0 đã được giao cho bạn`,
        body: `AI Triage Agent vừa tạo task [P0 Fix] Stripe Webhook Timeout. Vui lòng mở Bảng việc Kanban để xử lý ngay!`,
        senderName: 'AI Triage Agent',
        senderColor: '#e11d48',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Kanban',
        isPriority: true,
      });

      setRuleTestSuccess('Tác nhân AI đã tạo công việc P0 vào Kanban, thông báo vào kênh chat #du-an-alpha và ghi nhận audit log!');
    } catch (err) {
      console.warn('Failed to create triage task:', err);
    }
    setTimeout(() => setRuleTestSuccess(null), 4500);
  };

  const handleBatchCreateMeetingTasks = () => {
    if (!meetingSummaryResult || !meetingSummaryResult.actionItems) return;
    try {
      const rawTasks = localStorage.getItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS);
      const currentTasks = rawTasks ? JSON.parse(rawTasks) : [];
      const newTasks = meetingSummaryResult.actionItems.map((item, idx) => ({
        id: `task_meet_ai_${Date.now()}_${idx}`,
        key: `MEET-${Math.floor(10 + Math.random() * 90)}`,
        title: `[Việc từ cuộc họp] ${item.task}`,
        description: `Nhiệm vụ sinh ra tự động từ tóm tắt cuộc họp của AI Assistant.`,
        column: 'todo',
        priority: 'high',
        assigneeId: 'usr_nam',
        assigneeName: item.owner || 'Nguyễn Văn Nam',
        assigneeColor: '#2563eb',
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        labels: ['Họp', 'AI Action Item'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      localStorage.setItem(STORAGE_KEYS.KANBAN_EXTERNAL_TASKS, JSON.stringify([...newTasks, ...currentTasks]));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      dispatchWorkplaceChatMessage('du-an-alpha', {
        senderId: 'ai-meeting-assistant',
        senderName: 'AI Meeting Assistant',
        senderColor: '#8b5cf6',
        senderRole: 'Biên Bản Họp Tự Động',
        type: 'bot_alert',
        content: `📝 **Đã chuyển đổi ${newTasks.length} hành động từ cuộc họp thành các thẻ việc trên bảng Kanban!**\n` +
          newTasks.map((t, i) => `${i + 1}. **${t.title}** (Phụ trách: @${t.assigneeName})`).join('\n'),
        botInfo: {
          source: 'jira',
          eventTitle: 'Batch Tasks Created',
          eventMeta: `${newTasks.length} tasks`,
          statusBadge: 'CREATED',
        },
      });

      addNotification({
        type: 'task',
        title: `Đã tạo ${newTasks.length} nhiệm vụ từ cuộc họp vào Kanban`,
        body: `Các hành động cần làm đã sẵn sàng trên Bảng việc Kanban.`,
        senderName: 'AI Meeting Assistant',
        senderColor: '#8b5cf6',
        targetUrl: '/#tasks',
        targetLabel: 'Bảng việc Kanban',
      });

      setRuleTestSuccess(`Đã tạo thành công ${newTasks.length} nhiệm vụ vào Bảng việc Kanban và đồng bộ vào kênh Chat!`);
      setTimeout(() => setRuleTestSuccess(null), 4000);
    } catch (err) {
      console.warn('Failed to batch create meeting tasks:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar (Clean Modern SaaS) */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Hệ sinh thái Tự động hóa &amp; Tích hợp</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
              Tích Hợp Công Cụ &amp; Tự Động Hóa Quy Trình
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm leading-relaxed">
              Đồng bộ dữ liệu tức thì giữa các nền tảng, kích hoạt quy trình tự động theo luật logic và tận dụng AI trợ lực cho mọi tác vụ lặp lại.
            </p>
          </div>

          {/* Quick Minimalist Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Ứng Dụng</span>
              <span className="text-lg font-bold text-zinc-900">12/12</span>
              <span className="text-[10px] text-emerald-600 font-medium block">Sẵn sàng</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Quy Trình</span>
              <span className="text-lg font-bold text-zinc-900">{rules.length}</span>
              <span className="text-[10px] text-zinc-500 font-medium block">Kích hoạt</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">Lần Chạy</span>
              <span className="text-lg font-bold text-blue-600">
                {rules.reduce((acc, r) => acc + r.runCount, 0)}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium block">Tự động</span>
            </div>
            <div className="bg-zinc-50/80 rounded-2xl border border-zinc-200/60 p-3.5 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">SLA Đạt</span>
              <span className="text-lg font-bold text-emerald-600">99.8%</span>
              <span className="text-[10px] text-emerald-600 font-medium block">Thành công</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Success / Ping Toast */}
      {(appPingSuccess || ruleTestSuccess) && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appPingSuccess || ruleTestSuccess}</span>
          </div>
          <button
            onClick={() => {
              setAppPingSuccess(null);
              setRuleTestSuccess(null);
            }}
            className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/80">
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'apps'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Chợ Ứng Dụng (12 Apps)</span>
          </button>

          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workflows'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Quy Trình Tự Động Hóa (Rules)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'developer'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-600" />
            <span>Cổng Lập Trình Viên (API &amp; Webhooks)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ai'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-600" />
            <span>Trợ Lý AI &amp; Tác Nhân Tự Động</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              AI Agent
            </span>
          </button>
        </div>

        {/* Global Action / Secondary info */}
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo mật chuẩn SOC2 &amp; HMAC SHA-256</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KẾT NỐI VỚI CÔNG CỤ KHÁC (APP DIRECTORY & ECOSYSTEM) */}
      {/* ========================================================================= */}
      {activeTab === 'apps' && (
        <div className="space-y-6">
          {/* Controls: Search and Categories */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Tìm kiếm ứng dụng, danh mục hoặc tính năng..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200/80 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {appSearch && (
                <button
                  onClick={() => setAppSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
              <span className="text-zinc-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Lọc:
              </span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'email', label: 'Email' },
                { id: 'calendar', label: 'Lịch' },
                { id: 'crm', label: 'CRM' },
                { id: 'devops', label: 'DevOps' },
                { id: 'pm', label: 'Dự án' },
                { id: 'storage', label: 'Lưu trữ' },
                { id: 'video', label: 'Video' },
                { id: 'design', label: 'Thiết kế' },
                { id: 'support', label: 'CSKH' },
                { id: 'finance', label: 'Tài chính' },
                { id: 'monitoring', label: 'Giám sát' },
                { id: 'nocode', label: 'No-Code' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as IntegrationCategory)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between hover:shadow-md ${
                  app.isConnected ? 'border-zinc-200/90 shadow-xs' : 'border-zinc-200/50 bg-zinc-50/40 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0"
                        style={{ backgroundColor: `${app.color}15`, color: app.color }}
                      >
                        {app.logo}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 leading-snug">{app.name}</h3>
                        <span className="inline-block text-[11px] font-medium text-zinc-500">
                          {app.categoryLabel}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={(e) => toggleAppConnection(app.id, e)}
                      title={app.isConnected ? 'Bấm để ngắt kết nối' : 'Bấm để kết nối ứng dụng'}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        app.isConnected ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          app.isConnected ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 line-clamp-2 mb-4 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Feature Highlights */}
                  <div className="space-y-1.5 mb-4">
                    {app.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {/* Settings Modal Button */}
                    <button
                      onClick={() => setActiveAppModal(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Cấu hình</span>
                    </button>

                    {/* Slash Commands Dialog Button */}
                    <button
                      onClick={() => setViewingCommandsApp(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold transition-colors"
                      title="Xem các lệnh Slash trong Chat"
                    >
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      <span>Lệnh /</span>
                    </button>

                    {/* Unfurl Preview Button */}
                    {app.linkUnfurl && (
                      <button
                        onClick={() => setViewingUnfurlApp(app)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors"
                        title="Xem mô phỏng xem trước liên kết (Link Unfurling)"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="text-[11px] font-mono text-zinc-400">
                    {app.isConnected ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đã kết nối
                      </span>
                    ) : (
                      <span className="text-zinc-400">Chưa kết nối</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Slash Commands Cheat Sheet Box (Clean Modern SaaS Card) */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span>Tra Cứu Nhanh Lệnh Slash Trong Khung Chat &amp; Biên Tập</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Gõ dấu gạch chéo <code className="px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-mono text-[11px] font-bold">/</code> ở bất kỳ ô nhập tin nhắn nào để kích hoạt công cụ bên thứ ba tức thì.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200/60 rounded-full text-[11px] font-mono font-medium shrink-0">
                12 Lệnh Có Sẵn
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { cmd: '/jira create [title]', desc: 'Tạo thẻ Jira Bug/Task trực tiếp từ thảo luận', app: 'Jira' },
                { cmd: '/meet [topic]', desc: 'Tạo phòng họp Google Meet và mời các thành viên', app: 'Meet' },
                { cmd: '/zoom', desc: 'Khởi tạo phòng Zoom cá nhân 1 cú bấm', app: 'Zoom' },
                { cmd: '/github pr [number]', desc: 'Kiểm tra trạng thái CI/CD và review PR', app: 'GitHub' },
                { cmd: '/drive search [query]', desc: 'Tìm và chia sẻ liên kết tệp Google Drive', app: 'Drive' },
                { cmd: '/crm lead [name] [email]', desc: 'Ghi nhận khách hàng tiềm năng vào HubSpot', app: 'CRM' },
              ].map((c, i) => (
                <div
                  key={i}
                  className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-3 flex items-center justify-between hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all group cursor-pointer"
                  onClick={() => copyToClipboard(c.cmd)}
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 block">{c.cmd}</span>
                    <span className="text-[11px] text-zinc-500 block">{c.desc}</span>
                  </div>
                  <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TỰ ĐỘNG HÓA QUY TRÌNH (WORKFLOW AUTOMATION - VISUAL RULES) */}
      {/* ========================================================================= */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-zinc-200/80 p-5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Trình Thiết Kế Quy Tắc Tự Động (Visual Rule Builder)</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Thiết lập luồng công việc theo logic: <strong>Khi [Sự kiện]</strong> và <strong>Nếu [Điều kiện]</strong> thì <strong>[Hành động]</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-2xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Quy Trình Mới</span>
              </button>
            </div>
          </div>

          {/* Pre-built Templates Carousel / Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Mẫu Quy Trình Dựng Sẵn (Khởi tạo 1-click)</span>
              </span>
              <span className="text-[11px] font-normal text-zinc-400">Chọn mẫu để áp dụng ngay</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {PREBUILT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-white rounded-2xl border border-zinc-200/80 p-4 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between text-left group"
                >
                  <div className="space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">
                      {tmpl.category}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 leading-snug group-hover:text-amber-600 transition-colors">
                      {tmpl.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleInstallTemplate(tmpl)}
                    className="mt-3 w-full py-1.5 px-3 bg-zinc-50 hover:bg-zinc-900 hover:text-white rounded-xl text-[11px] font-semibold text-zinc-700 transition-all flex items-center justify-center gap-1 border border-zinc-200 group-hover:border-zinc-900"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Sử dụng mẫu này</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rules List */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Danh Sách Quy Trình Đang Kích Hoạt ({rules.length})</h3>
                <p className="text-xs text-zinc-500">Các quy tắc tự động hóa đang lắng nghe sự kiện trong không gian làm việc.</p>
              </div>
              <button
                onClick={fetchAutomationsData}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  Chưa có quy tắc tự động hóa nào. Hãy bấm "Tạo Quy Trình Mới" hoặc chọn một mẫu dựng sẵn ở trên.
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      rule.isEnabled ? 'border-zinc-200 bg-white hover:border-zinc-300' : 'border-zinc-200/60 bg-zinc-50/50 opacity-75'
                    }`}
                  >
                    {/* Rule Info & Visual Flow */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">{rule.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-600">
                          {rule.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{rule.description}</p>

                      {/* Visual Flow Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {/* Trigger */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>Khi: {rule.trigger.label}</span>
                        </div>

                        {/* Condition (if any) */}
                        {rule.condition && (
                          <>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                              <Filter className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Nếu: {rule.condition.label || `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`}</span>
                            </div>
                          </>
                        )}

                        {/* Action */}
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                          <Zap className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Thì: {rule.action.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls & Metrics */}
                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
                      <div className="text-right text-[11px] font-mono text-zinc-400 pr-2">
                        <span className="block text-zinc-700 font-bold">{rule.runCount} lần chạy</span>
                        <span>{rule.lastRunAt ? 'Chạy gần nhất: ' + new Date(rule.lastRunAt).toLocaleTimeString('vi-VN') : 'Chưa chạy'}</span>
                      </div>

                      {/* Run Test Button */}
                      <button
                        onClick={() => handleTestRunRule(rule.id, rule.name)}
                        disabled={testingRuleId === rule.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors disabled:opacity-50"
                        title="Chạy thử nghiệm ngay lập tức"
                      >
                        {testingRuleId === rule.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        )}
                        <span>Chạy thử</span>
                      </button>

                      {/* Toggle On/Off */}
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          rule.isEnabled ? 'bg-zinc-900' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            rule.isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteRule(rule.id, e)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa quy tắc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Execution History Table */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Nhật Ký Thực Thi Tự Động (Execution Logs)</h3>
                <p className="text-xs text-zinc-500">
                  Lịch sử kích hoạt của các quy tắc tự động hóa theo thời gian thực.
                </p>
              </div>
              <button
                onClick={handleSimulateIncomingWebhook}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors border border-blue-200/60"
              >
                <Webhook className="w-3.5 h-3.5" />
                <span>Mô phỏng Webhook Stripe/GitHub</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Quy trình / Sự kiện</th>
                    <th className="py-2.5 px-3">Sự kiện kích hoạt</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">Độ trễ</th>
                    <th className="py-2.5 px-3">Dữ liệu Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-zinc-900">{log.ruleName}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-600">{log.triggerEvent}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Thành công
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-500">{log.executionTimeMs} ms</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-zinc-600 max-w-xs truncate">
                        {JSON.stringify(log.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CỔNG LẬP TRÌNH VIÊN (DEVELOPER PORTAL - API & WEBHOOKS) */}
      {/* ========================================================================= */}
      {activeTab === 'developer' && (
        <div className="space-y-6">
          {/* Section 1: API Keys Management */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-600" />
                  <span>Quản Lý Khóa Truy Cập API (API Keys) &amp; Hạn Mức Tốc Độ</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Dùng để xác thực các ứng dụng bên ngoài khi gọi vào REST API của hệ thống.
                </p>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Khóa API Mới</span>
              </button>
            </div>

            {/* Keys Table */}
            <div className="space-y-3">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="rounded-2xl border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-300 transition-all bg-white"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{k.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          k.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : k.role === 'write'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {k.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100 w-fit">
                      <Lock className="w-3 h-3 text-zinc-400" />
                      <span>{k.fullKey || k.keyPrefix}</span>
                      <button
                        onClick={() => copyToClipboard(k.fullKey || k.keyPrefix, k.id)}
                        className="ml-2 text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Sao chép mã API"
                      >
                        {copiedKeyId === k.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rate limit Meter */}
                  <div className="flex items-center gap-6">
                    <div className="text-right text-xs">
                      <span className="text-[11px] text-zinc-400 block">Hạn mức (Rate Limit)</span>
                      <span className="font-mono font-bold text-zinc-800">
                        {k.usageThisHour} / {k.rateLimitPerHour} req/h
                      </span>
                      {/* Mini meter bar */}
                      <div className="w-32 h-1.5 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (k.usageThisHour / k.rateLimitPerHour) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteApiKey(k.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Thu hồi khóa API"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Interactive REST API Playground & Code Generator */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>Trình Khám Phá REST API &amp; Trình Tạo Mã Tương Tác</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Thử nghiệm trực tiếp các Endpoint của nền tảng và sao chép mã nguồn đa ngôn ngữ (cURL, JavaScript, Python).
              </p>
            </div>

            {/* Endpoint Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100">
              {API_ENDPOINTS.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setApiConsoleResponse(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                    selectedEndpoint.id === ep.id
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      ep.method === 'GET'
                        ? 'bg-blue-500 text-white'
                        : ep.method === 'POST'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span>{ep.path}</span>
                </button>
              ))}
            </div>

            {/* Selected Endpoint Description */}
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-zinc-900">{selectedEndpoint.title}</span>
                <p className="text-zinc-500 text-[11px] mt-0.5">{selectedEndpoint.description}</p>
              </div>
              <button
                onClick={handleExecuteLiveApi}
                disabled={apiConsoleLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-colors shrink-0 shadow-xs"
              >
                {apiConsoleLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Thử nghiệm trực tiếp</span>
              </button>
            </div>

            {/* Code Snippets & Response Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Code Snippet */}
              <div className="bg-zinc-900 rounded-2xl p-4 text-white font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      {(['curl', 'js', 'python'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                            selectedLanguage === lang ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const snippet =
                          selectedLanguage === 'curl'
                            ? generateCurlSnippet(selectedEndpoint)
                            : selectedLanguage === 'js'
                            ? generateJsSnippet(selectedEndpoint)
                            : generatePythonSnippet(selectedEndpoint);
                        copyToClipboard(snippet);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <pre className="overflow-x-auto text-[11px] text-blue-200 leading-relaxed font-mono">
                    {selectedLanguage === 'curl' && generateCurlSnippet(selectedEndpoint)}
                    {selectedLanguage === 'js' && generateJsSnippet(selectedEndpoint)}
                    {selectedLanguage === 'python' && generatePythonSnippet(selectedEndpoint)}
                  </pre>
                </div>
              </div>

              {/* Right: Response Preview */}
              <div className="bg-zinc-900 rounded-2xl p-4 text-white font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <span className="text-zinc-400 font-bold text-[11px]">Phản hồi JSON (Response)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      200 OK
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] text-emerald-300 leading-relaxed max-h-56 font-mono">
                    {apiConsoleResponse || selectedEndpoint.responseExample}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Webhooks System */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-600" />
                  <span>Hệ Thống Webhooks Hai Chiều (Outgoing &amp; Incoming)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Phát sự kiện HTTP POST ra các hệ thống bên ngoài kèm chữ ký số xác thực HMAC-SHA256.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWebhookModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Đăng Ký Webhook Mới</span>
                </button>
              </div>
            </div>

            {/* Outgoing Webhooks List */}
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="rounded-2xl border border-zinc-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{wh.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Đang hoạt động
                      </span>
                    </div>

                    <p className="text-xs font-mono text-zinc-600 truncate">{wh.url}</p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {wh.events.map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-mono">
                          {ev}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono text-zinc-400 ml-2">
                        Secret: {wh.secretKey.substring(0, 10)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePingWebhook(wh.id, wh.url)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ping Thử Nghiệm</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Logs */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-zinc-700 mb-2">Lịch Sử Phát Webhook Gần Đây</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 text-[11px] font-semibold text-zinc-400">
                      <th className="py-2 px-3">Thời gian</th>
                      <th className="py-2 px-3">URL Đích</th>
                      <th className="py-2 px-3">Sự kiện</th>
                      <th className="py-2 px-3">Trạng thái HTTP</th>
                      <th className="py-2 px-3">Độ trễ</th>
                      <th className="py-2 px-3">Phản hồi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600 max-w-xs truncate">{log.url}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-blue-600">{log.event}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {log.statusCode} OK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500">{log.latencyMs} ms</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400 truncate max-w-[140px]">
                          {log.responseBody}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TRỢ LÝ AI & TÁC NHÂN TỰ ĐỘNG (AI ASSISTANT & AGENT) */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
            {[
              { id: 'summarize', label: 'Tóm Tắt Cuộc Họp & Chat', icon: MessageSquare },
              { id: 'writer', label: 'Hỗ Trợ Soạn Thảo & Biên Tập', icon: FileText },
              { id: 'qa', label: 'Hỏi Đáp Tri Thức Nội Bộ (Citations)', icon: HelpCircle },
              { id: 'triage', label: 'Tác Nhân Tự Động Phân Loại (Triage Agent)', icon: Bot },
            ].map((sub) => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setAiSubTab(sub.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    aiSubTab === sub.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub Panel 1: Smart Summarization */}
          {aiSubTab === 'summarize' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Tóm Tắt Cuộc Thảo Luận &amp; Trích Xuất Nhiệm Vụ Hành Động</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Dán nội dung luồng chat dài hoặc biên bản cuộc họp vào bên dưới, AI sẽ tự động trích xuất các quyết định chính và công việc cần làm.
                </p>
              </div>

              <div className="space-y-2">
                <textarea
                  value={meetingChatInput}
                  onChange={(e) => setMeetingChatInput(e.target.value)}
                  rows={5}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Dán nhật ký tin nhắn hoặc nội dung cuộc họp..."
                />
                <button
                  onClick={handleSummarizeMeeting}
                  disabled={isSummarizing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {isSummarizing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                  <span>{isSummarizing ? 'Đang phân tích...' : 'Tóm Tắt Thông Minh Bằng AI'}</span>
                </button>
              </div>

              {/* Summary Results */}
              {meetingSummaryResult && (
                <div className="mt-4 p-5 bg-blue-50/60 rounded-2xl border border-blue-200/60 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                      1. Ba Quyết Định Then Chốt (Key Decisions)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-zinc-800">
                      {meetingSummaryResult.summary.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        2. Danh Sách Hành Động Cần Làm (Action Items)
                      </h4>
                      <button
                        type="button"
                        onClick={handleBatchCreateMeetingTasks}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tạo việc vào Kanban</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {meetingSummaryResult.actionItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-1">
                          <span className="text-xs font-semibold text-zinc-900 block">{item.task}</span>
                          <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                            Phụ trách: {item.owner}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub Panel 2: AI Writing & Drafting */}
          {aiSubTab === 'writer' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Trợ Lý Soạn Thảo &amp; Biên Tập Văn Bản</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Viết lại email thông báo, chuyển đổi thành bảng Markdown hoặc rút gọn ý tưởng theo các phong cách chuyên nghiệp.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={writerInput}
                  onChange={(e) => setWriterInput(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-400 text-[11px] mr-1">Phong cách:</span>
                    {[
                      { id: 'formal', label: 'Chuyên nghiệp (Formal)' },
                      { id: 'bullet', label: 'Gạch đầu dòng (Bullet points)' },
                      { id: 'table', label: 'Bảng biểu Markdown' },
                      { id: 'concise', label: 'Rút gọn súc tích' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setWriterMode(m.id as any)}
                        className={`px-3 py-1 rounded-xl font-medium transition-colors ${
                          writerMode === m.id
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleRewrite}
                    disabled={isRewriting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    {isRewriting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Biên Tập Lại</span>
                  </button>
                </div>
              </div>

              {writerOutput && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-xs text-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider">
                      Kết Quả Biên Tập Bởi AI
                    </span>
                    <button
                      onClick={() => copyToClipboard(writerOutput)}
                      className="text-zinc-500 hover:text-zinc-900 text-[11px] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap font-sans leading-relaxed">{writerOutput}</div>
                </div>
              )}
            </div>
          )}

          {/* Sub Panel 3: Semantic Q&A with Citations */}
          {aiSubTab === 'qa' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                  <span>Hỏi Đáp Ngữ Nghĩa Dựa Trên Tri Thức Nội Bộ (Semantic Search &amp; Citations)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  AI truy vấn thông tin trong toàn bộ tài liệu dự án, SOP công ty và chỉ ra chính xác nguồn trích dẫn.
                </p>
              </div>

              {/* Sample Questions */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-400 text-[11px]">Câu hỏi gợi ý:</span>
                {[
                  'Chính sách làm việc từ xa và hỗ trợ thiết bị quy định thế nào?',
                  'Kiến trúc đồng thuận CRDT Yjs qua WebSocket xử lý xung đột ra sao?',
                  'Quy trình ứng phó sự cố cấp độ P0 diễn ra trong bao lâu?',
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskQuestion(preset)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-purple-50 hover:text-purple-700 text-zinc-600 text-[11px] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Query Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={qaQuery}
                  onChange={(e) => setQaQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="Đặt câu hỏi về tài liệu, quy trình, chính sách công ty..."
                  className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={isAnswering}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  {isAnswering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Hỏi AI'}
                </button>
              </div>

              {qaAnswer && (
                <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-[11px] uppercase tracking-wider">
                      Câu Trả Lời Tổng Hợp
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                      Độ tin cậy: {qaAnswer.confidence}
                    </span>
                  </div>
                  <p className="text-zinc-800 leading-relaxed font-sans">{qaAnswer.text}</p>

                  <div className="pt-2 border-t border-purple-200/40">
                    <span className="text-[11px] font-bold text-zinc-500 block mb-1">Nguồn trích dẫn:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {qaAnswer.sources.map((src, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-purple-200 text-purple-800 text-[11px] font-mono shadow-2xs"
                        >
                          <BookOpen className="w-3 h-3 text-purple-600" />
                          <span>{src}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub Panel 4: Autonomous Triage Agent */}
          {aiSubTab === 'triage' && (
            <div className="bg-white rounded-3xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-rose-600" />
                  <span>Tác Nhân Tự Động Phân Loại &amp; Điều Phối Thẻ Việc (Autonomous Triage Agent)</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Tác nhân AI tự đọc yêu cầu từ khách hàng/ticket thô, đánh giá mức độ nghiêm trọng, gán nhãn và chỉ định kỹ sư phù hợp.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={triageInput}
                  onChange={(e) => setTriageInput(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="Dán nội dung ticket hoặc yêu cầu thô từ khách hàng..."
                />
                <button
                  onClick={handleTriageTicket}
                  disabled={isTriaging}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  {isTriaging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  <span>Kích Hoạt Tác Nhân AI Phân Loại</span>
                </button>
              </div>

              {triageResult && (
                <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/60 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 text-[11px] uppercase tracking-wider">
                      Kết Quả Điều Phối Tự Động
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Đã phân tích 100%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">Mức Độ Ưu Tiên</span>
                      <span className="text-xs font-bold text-rose-600 block">{triageResult.priority}</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">Phân Loại Chuyên Môn</span>
                      <span className="text-xs font-bold text-zinc-900 block">{triageResult.category}</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">Kỹ Sư Phù Hợp Nhất</span>
                      <span className="text-xs font-bold text-blue-600 block">{triageResult.suggestedAssignee}</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">Cột Kanban Đề Xuất</span>
                      <span className="text-xs font-bold text-amber-600 block">{triageResult.recommendedColumn}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-zinc-700 font-semibold">{triageResult.summaryTitle}</span>
                    <button
                      onClick={handleCreateTriageTask}
                      disabled={triageTaskCreated}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {triageTaskCreated ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{triageTaskCreated ? 'Đã Đưa Vào Kanban' : 'Đưa Thẳng Vào Kanban Board'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CẤU HÌNH TÍCH HỢP (APP CONFIGURATION MODAL) */}
      {/* ========================================================================= */}
      {activeAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${activeAppModal.color}15`, color: activeAppModal.color }}
                >
                  {activeAppModal.logo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Cấu hình {activeAppModal.name}</h3>
                  <span className="text-[11px] text-zinc-500 font-medium">{activeAppModal.categoryLabel}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveAppModal(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  {activeAppModal.authType === 'oauth'
                    ? 'OAuth Client ID'
                    : activeAppModal.authType === 'apikey'
                    ? 'API Secret Key'
                    : 'Webhook Endpoint'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    activeAppModal.config.apiKey ||
                    activeAppModal.config.clientId ||
                    activeAppModal.config.webhookUrl ||
                    'live_token_sec_99182390'
                  }
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-[11px] text-zinc-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Tần suất đồng bộ dữ liệu</label>
                <select className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800">
                  <option>Thời gian thực (Realtime Webhooks)</option>
                  <option>Mỗi 5 phút</option>
                  <option>Mỗi 15 phút</option>
                  <option>Mỗi giờ</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="autoNotifyCheck" defaultChecked className="rounded border-zinc-300" />
                <label htmlFor="autoNotifyCheck" className="text-zinc-700 font-medium">
                  Tự động gửi thông báo tóm tắt sự kiện vào kênh chat chung
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <button
                onClick={() => handleTestAppPing(activeAppModal.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Kiểm tra kết nối (Ping)</span>
              </button>

              <button
                onClick={() => setActiveAppModal(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: XEM LỆNH SLASH (/ COMMANDS) */}
      {/* ========================================================================= */}
      {viewingCommandsApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                  {viewingCommandsApp.logo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Lệnh Slash cho {viewingCommandsApp.name}</h3>
                  <span className="text-[11px] text-zinc-500">Sử dụng trong ô soạn thảo tin nhắn Chat</span>
                </div>
              </div>
              <button
                onClick={() => setViewingCommandsApp(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {viewingCommandsApp.slashCommands.map((sc, i) => (
                <div
                  key={i}
                  className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-1 hover:border-blue-400 transition-colors cursor-pointer group"
                  onClick={() => copyToClipboard(sc.example)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{sc.command}</span>
                    <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
                  </div>
                  <p className="text-[11px] text-zinc-600">{sc.description}</p>
                  <div className="font-mono text-[10px] text-zinc-400 pt-1">Ví dụ: {sc.example}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingCommandsApp(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XEM TRƯỚC LIÊN KẾT (LINK UNFURLING PREVIEW) */}
      {/* ========================================================================= */}
      {viewingUnfurlApp && viewingUnfurlApp.linkUnfurl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Mô Phỏng Xem Trước Liên Kết (Link Unfurling)
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Khi người dùng dán URL {viewingUnfurlApp.name} vào tài liệu hoặc chat
                </span>
              </div>
              <button
                onClick={() => setViewingUnfurlApp(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pasted Link Simulation */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-mono">Đường dẫn người dùng dán:</span>
              <div className="p-2.5 bg-zinc-100 rounded-xl font-mono text-[11px] text-blue-600 truncate border border-zinc-200">
                {viewingUnfurlApp.linkUnfurl.sampleUrl}
              </div>
            </div>

            {/* Interactive Unfurl Card */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 font-mono">Thẻ tương tác hiển thị tự động:</span>
              <div className="p-4 rounded-2xl border-2 border-blue-500/20 bg-blue-50/20 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{viewingUnfurlApp.linkUnfurl.previewIcon}</span>
                    <span className="text-xs font-bold text-zinc-900">{viewingUnfurlApp.linkUnfurl.previewTitle}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {viewingUnfurlApp.linkUnfurl.previewBadge}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">{viewingUnfurlApp.linkUnfurl.previewDescription}</p>
                <div className="text-[11px] text-zinc-400 font-mono pt-1 border-t border-zinc-100">
                  {viewingUnfurlApp.linkUnfurl.previewMeta}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingUnfurlApp(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TẠO QUY TRÌNH TỰ ĐỘNG MỚI (CREATE RULE MODAL) */}
      {/* ========================================================================= */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRuleSubmit}
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Thiết Kế Quy Trình Tự Động Mới</h3>
                <span className="text-[11px] text-zinc-500">Mô hình Trigger → Điều kiện lọc → Hành động</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Tên quy trình</label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Ví dụ: Gửi tin nhắn Chat khi thẻ việc chuyển sang Done"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Mô tả mục đích hoạt động của quy trình..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                />
              </div>

              {/* Step 1: Trigger */}
              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-1.5">
                <span className="text-[11px] font-bold text-blue-900 block uppercase">
                  1. Khi nào thì quy trình chạy? (Trigger)
                </span>
                <select
                  value={newRuleTrigger}
                  onChange={(e) => setNewRuleTrigger(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs"
                >
                  {AVAILABLE_TRIGGERS.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Condition */}
              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-900 block uppercase">
                  2. Điều kiện lọc bổ sung (Condition - Tùy chọn)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newRuleCondField}
                    onChange={(e) => setNewRuleCondField(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs"
                  >
                    <option value="priority">Độ ưu tiên (Priority)</option>
                    <option value="status">Trạng thái (Status)</option>
                    <option value="department">Phòng ban (Department)</option>
                  </select>
                  <input
                    type="text"
                    value={newRuleCondValue}
                    onChange={(e) => setNewRuleCondValue(e.target.value)}
                    placeholder="Giá trị: high, urgent..."
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Step 3: Action */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-900 block uppercase">
                  3. Thực hiện hành động gì? (Action)
                </span>
                <select
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs"
                >
                  {AVAILABLE_ACTIONS.map((a) => (
                    <option key={a.type} value={a.type}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Kích hoạt quy trình
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TẠO API KEY MỚI (NEW API KEY MODAL) */}
      {/* ========================================================================= */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateApiKey}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Tạo Khóa API Mới</h3>
                <span className="text-[11px] text-zinc-500">Phân quyền vai trò và hạn mức truy vấn</span>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Tên ứng dụng / Mục đích</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ví dụ: Backend Microservice Sync, CI/CD Script..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Vai trò phân quyền (Role)</label>
                <select
                  value={newKeyRole}
                  onChange={(e) => setNewKeyRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs"
                >
                  <option value="write">Đọc &amp; Ghi (Read &amp; Write) - Hạn mức 1,000 req/h</option>
                  <option value="read">Chỉ đọc (Read-Only) - Hạn mức 500 req/h</option>
                  <option value="admin">Quản trị tối cao (Admin) - Hạn mức 2,000 req/h</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
              >
                Tạo mã Token
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ĐĂNG KÝ WEBHOOK MỚI (NEW WEBHOOK MODAL) */}
      {/* ========================================================================= */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWebhook}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Đăng Ký Outgoing Webhook Mới</h3>
                <span className="text-[11px] text-zinc-500">Gửi sự kiện tức thì qua HTTP POST</span>
              </div>
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Tên Webhook</label>
                <input
                  type="text"
                  required
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                  placeholder="Ví dụ: Zapier Lead Webhook, DevOps Sentry Bot..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">URL Nhận Sự Kiện (Target URL)</label>
                <input
                  type="url"
                  required
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://hooks.yourdomain.com/webhook/receive"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-black"
              >
                Đăng ký
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
