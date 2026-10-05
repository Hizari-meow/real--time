import { ApiEndpointSpec } from './types';

export const API_ENDPOINTS: ApiEndpointSpec[] = [
  {
    id: 'ep_1',
    method: 'GET',
    path: '/api/documents',
    title: 'Lấy danh sách tất cả tài liệu',
    description: 'Trả về toàn bộ danh sách tài liệu cộng tác thời gian thực, gồm phiên bản hiện tại, chủ sở hữu và số lượng snapshot.',
    tag: 'Documents',
    headers: {
      'Authorization': 'Bearer col_live_9f8e7d6c5b4a3120ff99887766554433',
      'Content-Type': 'application/json',
    },
    responseExample: JSON.stringify(
      {
        success: true,
        data: [
          {
            id: 'doc_rfc_consensus',
            title: 'Distributed Consensus Engine RFC v4',
            currentVersion: 4,
            owner: { id: 'usr_nam', name: 'Nguyễn Văn Nam', email: 'nam@collaborative.io' },
            updatedAt: '2026-09-30T14:32:00Z',
          },
          {
            id: 'doc_arch_spec',
            title: 'Kiến trúc Hệ thống Phân tán Yjs & CRDT',
            currentVersion: 12,
            owner: { id: 'usr_alice', name: 'Alice Tech', email: 'alice@collaborative.io' },
            updatedAt: '2026-09-30T16:45:00Z',
          },
        ],
        total: 2,
      },
      null,
      2
    ),
  },
  {
    id: 'ep_2',
    method: 'POST',
    path: '/api/documents',
    title: 'Khởi tạo tài liệu cộng tác mới',
    description: 'Tạo tài liệu mới trong kho lưu trữ đám mây. Tự động khởi tạo Y.Doc CRDT và room WebSocket tương ứng.',
    tag: 'Documents',
    headers: {
      'Authorization': 'Bearer col_live_9f8e7d6c5b4a3120ff99887766554433',
      'Content-Type': 'application/json',
    },
    bodyExample: JSON.stringify(
      {
        title: 'Báo cáo Kiểm thử Tải 10,000 CCU WebSocket',
        initialContent: 'Nội dung khởi tạo bằng Markdown...',
        tags: ['Benchmark', 'Distributed', 'Q4'],
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          id: 'doc_new_9921',
          title: 'Báo cáo Kiểm thử Tải 10,000 CCU WebSocket',
          currentVersion: 1,
          wsRoom: 'workspace_doc_new_9921',
          createdAt: new Date().toISOString(),
        },
      },
      null,
      2
    ),
  },
  {
    id: 'ep_3',
    method: 'GET',
    path: '/api/tasks',
    title: 'Lấy danh sách thẻ việc (Kanban Tasks)',
    description: 'Truy vấn danh sách công việc trên bảng Kanban. Hỗ trợ lọc theo cột (To Do, In Progress, Review, Done) và người phụ trách.',
    tag: 'Tasks',
    headers: {
      'Authorization': 'Bearer col_live_9f8e7d6c5b4a3120ff99887766554433',
      'Content-Type': 'application/json',
    },
    responseExample: JSON.stringify(
      {
        success: true,
        tasks: [
          {
            id: 'task_01',
            title: 'Thiết kế giao diện bảng trắng FigJam',
            status: 'done',
            priority: 'high',
            assignee: 'Nguyễn Văn Nam',
            deadline: '2026-10-02',
          },
          {
            id: 'task_02',
            title: 'Kiểm thử hội tụ CRDT 500 client',
            status: 'in_progress',
            priority: 'urgent',
            assignee: 'Alice Tech',
            deadline: '2026-10-05',
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'ep_4',
    method: 'POST',
    path: '/api/tasks',
    title: 'Tạo thẻ việc mới trên Kanban Board',
    description: 'Thêm mới một công việc vào bảng tiến độ. Đồng bộ ngay lập tức đến màn hình của toàn bộ thành viên qua WebSocket.',
    tag: 'Tasks',
    headers: {
      'Authorization': 'Bearer col_live_9f8e7d6c5b4a3120ff99887766554433',
      'Content-Type': 'application/json',
    },
    bodyExample: JSON.stringify(
      {
        title: 'Review Pull Request: Webhooks HMAC-SHA256',
        description: 'Kiểm tra thuật toán sinh chữ ký bảo mật cho outgoing webhooks.',
        status: 'todo',
        priority: 'high',
        assigneeId: 'usr_nam',
        deadline: '2026-10-04T18:00:00Z',
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          id: 'task_auto_8819',
          title: 'Review Pull Request: Webhooks HMAC-SHA256',
          status: 'todo',
          priority: 'high',
          assignee: 'Nguyễn Văn Nam',
          createdAt: new Date().toISOString(),
        },
      },
      null,
      2
    ),
  },
  {
    id: 'ep_5',
    method: 'POST',
    path: '/api/chat/messages',
    title: 'Gửi tin nhắn vào kênh Chat Zalo',
    description: 'Gửi thông báo dạng tin nhắn văn bản hoặc thẻ tin nhắn giàu nội dung (Rich Card) vào phòng chat dự án.',
    tag: 'Chat & Notification',
    headers: {
      'Authorization': 'Bearer col_live_9f8e7d6c5b4a3120ff99887766554433',
      'Content-Type': 'application/json',
    },
    bodyExample: JSON.stringify(
      {
        channelId: 'chan_tech_eng',
        senderName: 'CI/CD Deploy Bot',
        content: '🚀 Bản build staging release-v3.4 đã sẵn sàng kiểm thử!',
        isUrgent: false,
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        messageId: 'msg_9918239',
        deliveredToMembers: 14,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    ),
  },
  {
    id: 'ep_6',
    method: 'POST',
    path: '/api/automations/incoming-webhook',
    title: 'Gửi Incoming Webhook từ hệ thống ngoài',
    description: 'Endpoint công khai để các dịch vụ như GitHub, Jira, Stripe, Zapier bắn dữ liệu sự kiện vào kích hoạt quy trình tự động.',
    tag: 'Automations',
    headers: {
      'X-Collab-Secret': 'whsec_incoming_token_8899aabbcc',
      'X-Event-Type': 'payment.succeeded',
      'Content-Type': 'application/json',
    },
    bodyExample: JSON.stringify(
      {
        event: 'payment.succeeded',
        amount: 25000000,
        currency: 'VND',
        customer: 'TechCorp Vietnam Ltd',
        reference: 'INV-2026-089',
      },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        message: 'Đã nhận và kích hoạt quy trình tự động thành công.',
        eventId: 'log_inc_172774910291',
      },
      null,
      2
    ),
  },
];

export function generateCurlSnippet(ep: ApiEndpointSpec, apiKey: string = 'col_live_9f8e7d6c5b4a3120ff99887766554433'): string {
  let curl = `curl -X ${ep.method} "https://api.collab.workspace.io${ep.path}" \\\n`;
  curl += `  -H "Authorization: Bearer ${apiKey}" \\\n`;
  curl += `  -H "Content-Type: application/json"`;

  if (ep.bodyExample && ep.method !== 'GET') {
    const singleLineBody = ep.bodyExample.replace(/\n\s*/g, ' ');
    curl += ` \\\n  -d '${singleLineBody}'`;
  }

  return curl;
}

export function generateJsSnippet(ep: ApiEndpointSpec, apiKey: string = 'col_live_9f8e7d6c5b4a3120ff99887766554433'): string {
  if (ep.method === 'GET') {
    return `// Gọi API lấy dữ liệu bằng Fetch API
const response = await fetch('https://api.collab.workspace.io${ep.path}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log('Kết quả:', data);`;
  }

  return `// Gửi yêu cầu ${ep.method} bằng Fetch API
const payload = ${ep.bodyExample || '{}'};

const response = await fetch('https://api.collab.workspace.io${ep.path}', {
  method: '${ep.method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log('Phản hồi thành công:', result);`;
}

export function generatePythonSnippet(ep: ApiEndpointSpec, apiKey: string = 'col_live_9f8e7d6c5b4a3120ff99887766554433'): string {
  if (ep.method === 'GET') {
    return `# Gọi API bằng thư viện requests trong Python
import requests

url = "https://api.collab.workspace.io${ep.path}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print("Kết quả:", data)`;
  }

  return `# Gửi dữ liệu bằng thư viện requests trong Python
import requests

url = "https://api.collab.workspace.io${ep.path}"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = ${ep.bodyExample || '{}'}

response = requests.${ep.method.toLowerCase()}(url, json=payload, headers=headers)
print("Mã trạng thái:", response.status_code)
print("Dữ liệu phản hồi:", response.json())`;
}
