export type IntegrationCategory =
  | 'all'
  | 'email'
  | 'calendar'
  | 'crm'
  | 'devops'
  | 'pm'
  | 'storage'
  | 'video'
  | 'design'
  | 'support'
  | 'finance'
  | 'monitoring'
  | 'nocode';

export interface SlashCommand {
  command: string;
  description: string;
  example: string;
}

export interface LinkUnfurlData {
  pattern: string;
  sampleUrl: string;
  previewTitle: string;
  previewDescription: string;
  previewMeta: string;
  previewBadge: string;
  previewIcon: string;
}

export interface IntegrationApp {
  id: string;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  logo: string;
  color: string;
  description: string;
  features: string[];
  isConnected: boolean;
  authType: 'oauth' | 'apikey' | 'webhook';
  config: {
    apiKey?: string;
    webhookUrl?: string;
    clientId?: string;
    syncInterval?: string;
    autoNotify?: boolean;
  };
  slashCommands: SlashCommand[];
  linkUnfurl?: LinkUnfurlData;
  syncCount: number;
  lastSyncedAt?: string;
}

export interface AutomationTrigger {
  type: string;
  label: string;
  icon?: string;
  category?: string;
  description?: string;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'in';
  value: string;
  label: string;
}

export interface AutomationAction {
  type: string;
  label: string;
  params?: Record<string, any>;
  icon?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: 'tasks' | 'crm' | 'devops' | 'admin' | 'schedule';
  trigger: AutomationTrigger;
  condition?: AutomationCondition;
  action: AutomationAction;
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

export interface ApiEndpointSpec {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  title: string;
  description: string;
  tag: string;
  headers: Record<string, string>;
  bodyExample?: string;
  responseExample: string;
}
