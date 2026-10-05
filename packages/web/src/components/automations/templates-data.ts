import { AutomationRule, AutomationTrigger, AutomationAction } from './types';

export const AVAILABLE_TRIGGERS: AutomationTrigger[] = [
  {
    type: 'task.completed',
    label: 'Khi thẻ việc chuyển sang trạng thái "Hoàn thành"',
    category: 'Quản lý công việc',
    description: 'Kích hoạt ngay khi một thẻ việc trên bảng Kanban được kéo vào cột Done hoặc đánh dấu hoàn tất.',
    icon: 'CheckSquare',
  },
  {
    type: 'task.overdue',
    label: 'Khi thẻ việc quá hạn chót (Deadline Overdue)',
    category: 'Quản lý công việc',
    description: 'Kích hoạt tự động khi thời gian hiện tại vượt qua ngày hạn chót của công việc mà chưa hoàn thành.',
    icon: 'Clock',
  },
  {
    type: 'task.created',
    label: 'Khi có thẻ việc mới được tạo',
    category: 'Quản lý công việc',
    description: 'Kích hoạt bất cứ khi nào có thành viên tạo thẻ công việc mới trong bất kỳ dự án nào.',
    icon: 'PlusCircle',
  },
  {
    type: 'file.uploaded',
    label: 'Khi có tệp mới được tải lên Cloud Drive',
    category: 'Lưu trữ tệp',
    description: 'Kích hoạt khi người dùng tải lên tài liệu PDF, DOCX, ZIP hoặc ảnh vào thư mục đám mây chung.',
    icon: 'UploadCloud',
  },
  {
    type: 'message.urgent',
    label: 'Khi có tin nhắn khẩn cấp hoặc @mention trên Chat',
    category: 'Giao tiếp & Chat',
    description: 'Kích hoạt khi tin nhắn chứa từ khóa [KHẨN CẤP], [P0] hoặc được gắn cờ báo động đỏ.',
    icon: 'AlertTriangle',
  },
  {
    type: 'schedule.cron',
    label: 'Theo lịch định kỳ (Mỗi sáng 8:00 hoặc Thứ Sáu 17:00)',
    category: 'Lịch định kỳ',
    description: 'Hẹn giờ chạy tự động theo biểu thức Cron hoặc khung giờ cố định trong tuần.',
    icon: 'Calendar',
  },
  {
    type: 'webhook.received',
    label: 'Khi nhận được Webhook từ bên ngoài (GitHub, Jira, Stripe)',
    category: 'Tích hợp bên ngoài',
    description: 'Kích hoạt khi một dịch vụ bên thứ ba gửi HTTP POST payload vào endpoint webhook của bạn.',
    icon: 'Webhook',
  },
];

export const AVAILABLE_ACTIONS: AutomationAction[] = [
  {
    type: 'chat.send_message',
    label: 'Gửi tin nhắn thông báo vào kênh Chat Zalo',
    icon: 'MessageSquare',
  },
  {
    type: 'email.send',
    label: 'Gửi email tự động qua Gmail / Outlook',
    icon: 'Mail',
  },
  {
    type: 'task.create',
    label: 'Tạo thẻ việc mới trên Kanban Board',
    icon: 'CheckSquare',
  },
  {
    type: 'task.update_status',
    label: 'Cập nhật trạng thái thẻ việc hoặc gắn nhãn',
    icon: 'Tag',
  },
  {
    type: 'webhook.trigger',
    label: 'Bắn Webhook (HTTP POST) đến hệ thống khác',
    icon: 'Zap',
  },
];

export const PREBUILT_TEMPLATES: Partial<AutomationRule>[] = [
  {
    id: 'tmpl_1',
    name: 'Quy trình Tiếp nhận Nhân sự Mới (Onboarding Kit)',
    description: 'Tự động tạo 5 checklist công việc chuẩn, gửi email tài liệu văn hóa và lên lịch họp giới thiệu thành viên mới.',
    category: 'admin',
    trigger: {
      type: 'webhook.received',
      label: 'Khi phòng Nhân sự kích hoạt Onboarding cho nhân viên mới',
    },
    condition: {
      field: 'role',
      operator: 'contains',
      value: 'Engineer,Designer,PM',
      label: 'Áp dụng cho khối Công nghệ & Sản phẩm',
    },
    action: {
      type: 'task.create',
      label: 'Tạo bộ 5 thẻ việc Onboarding trong cột To Do',
      params: { template: 'onboarding_standard_5_steps', assignee: 'HR Lead' },
    },
    isEnabled: true,
    runCount: 28,
  },
  {
    id: 'tmpl_2',
    name: 'Cảnh báo & Đổi cờ khi Task quá hạn (Overdue SLA)',
    description: 'Quét tự động lúc 08:30 mỗi sáng. Nếu task quá hạn: gắn nhãn đỏ "Trễ SLA" và ping trực tiếp người phụ trách.',
    category: 'tasks',
    trigger: {
      type: 'task.overdue',
      label: 'Khi thời gian hiện tại vượt quá hạn chót (Deadline)',
    },
    condition: {
      field: 'status',
      operator: 'equals',
      value: 'in_progress',
      label: 'Chỉ kiểm tra các thẻ đang trong tiến trình thực hiện',
    },
    action: {
      type: 'chat.send_message',
      label: 'Ping cảnh báo vào kênh Chat kèm tên công việc',
      params: { channel: '#canh-bao-tien-do', message: '⚠️ Task "{task_title}" đã quá hạn {overdue_days} ngày! Đề nghị {assignee} cập nhật tiến độ.' },
    },
    isEnabled: true,
    runCount: 54,
  },
  {
    id: 'tmpl_3',
    name: 'Tự động chốt hợp đồng & Cảm ơn khách hàng (CRM Won)',
    description: 'Khi trạng thái Deal trong CRM chuyển sang "Closed Won", tự động tạo thư mục hợp đồng trên Drive và gửi email cảm ơn.',
    category: 'crm',
    trigger: {
      type: 'webhook.received',
      label: 'Khi nhận webhook Deal Won từ HubSpot / Salesforce',
    },
    condition: {
      field: 'deal_value',
      operator: 'greater_than',
      value: '50000000',
      label: 'Giá trị hợp đồng lớn hơn 50.000.000 VNĐ',
    },
    action: {
      type: 'email.send',
      label: 'Gửi thư cảm ơn khách hàng kèm phụ lục hợp đồng mẫu',
      params: { template: 'contract_thank_you_formal', notifySales: true },
    },
    isEnabled: true,
    runCount: 16,
  },
  {
    id: 'tmpl_4',
    name: 'Cảnh báo sự cố CI/CD Build Fail & Sentry Exception',
    description: 'Khi GitHub Actions build thất bại hoặc Sentry ghi nhận lỗi P0, tự động mở task sửa lỗi khẩn cấp trong 15 phút.',
    category: 'devops',
    trigger: {
      type: 'webhook.received',
      label: 'Khi GitHub Actions báo build thất bại hoặc Sentry Exception',
    },
    condition: {
      field: 'environment',
      operator: 'equals',
      value: 'production',
      label: 'Chỉ áp dụng với môi trường Production trực tiếp',
    },
    action: {
      type: 'chat.send_message',
      label: 'Gửi chuông báo động đỏ vào kênh #devops-war-room',
      params: { channel: '#devops-war-room', pingGroup: '@devops-oncall' },
    },
    isEnabled: true,
    runCount: 12,
  },
  {
    id: 'tmpl_5',
    name: 'Sao lưu & Báo cáo Tiến độ định kỳ tối Thứ Sáu',
    description: 'Vào lúc 18:00 tối thứ Sáu, tự động nén dữ liệu phiên bản tài liệu tuần và gửi email tổng kết đến toàn bộ công ty.',
    category: 'schedule',
    trigger: {
      type: 'schedule.cron',
      label: 'Định kỳ 18:00 Thứ Sáu hàng tuần (Cron: 0 18 * * 5)',
    },
    action: {
      type: 'email.send',
      label: 'Gửi bản tin tổng kết tiến độ tuần đến toàn thể nhân viên',
      params: { recipient: 'all-team@collaborative.io', autoGenerateSummary: true },
    },
    isEnabled: true,
    runCount: 40,
  },
];
