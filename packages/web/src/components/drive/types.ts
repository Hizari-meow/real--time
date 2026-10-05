export type FileCategory = 'document' | 'image' | 'spreadsheet' | 'snapshot' | 'code' | 'archive' | 'other';
export type FilePermission = 'viewer' | 'commenter' | 'editor' | 'owner';

export interface FileVersionItem {
  version: number;
  nameTag?: string; // e.g. "Bản gửi khách 15/09", "Bản duyệt cuối"
  size: number;
  updatedAt: string;
  updatedBy: string;
  changeSummary: string;
}

export interface CloudFileItem {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  folderId?: string; // Folder it belongs to
  updatedAt: string;
  url: string;
  ownerId?: string;
  ownerName: string;
  permission: FilePermission;
  isStarred?: boolean;
  isDeleted?: boolean; // In trash
  deletedAt?: string;
  shareSettings?: {
    linkAccess: 'anyone' | 'organization' | 'restricted';
    allowDownload: boolean;
    hasPassword?: boolean;
    password?: string;
    expiresAt?: string;
  };
  versions: FileVersionItem[];
  previewContent?: {
    textSample?: string;
    tableRows?: string[][];
    imageSrc?: string;
    pdfPages?: number;
  };
}

export interface CloudFolder {
  id: string;
  name: string;
  category: 'team' | 'project' | 'personal';
  color: string;
  fileCount: number;
  totalSize: number;
  ownerName: string;
  updatedAt: string;
}

export const INITIAL_FOLDERS: CloudFolder[] = [
  {
    id: 'fld-1',
    name: 'Dự án Alpha (Core Gateway)',
    category: 'project',
    color: '#3b82f6',
    fileCount: 12,
    totalSize: 45000000,
    ownerName: 'Nguyễn Văn Nam',
    updatedAt: '2026-10-03T08:00:00.000Z',
  },
  {
    id: 'fld-2',
    name: 'Thiết kế & UI/UX Figma',
    category: 'team',
    color: '#ec4899',
    fileCount: 8,
    totalSize: 32000000,
    ownerName: 'Trần Thị Linh',
    updatedAt: '2026-10-02T18:00:00.000Z',
  },
  {
    id: 'fld-3',
    name: 'Tài liệu Kỹ thuật & SOP',
    category: 'team',
    color: '#10b981',
    fileCount: 15,
    totalSize: 28000000,
    ownerName: 'Lê Hoàng',
    updatedAt: '2026-10-02T06:00:00.000Z',
  },
  {
    id: 'fld-4',
    name: 'Hợp đồng & Khách hàng VIP',
    category: 'personal',
    color: '#8b5cf6',
    fileCount: 6,
    totalSize: 18000000,
    ownerName: 'Nguyễn Văn Nam',
    updatedAt: '2026-10-01T06:00:00.000Z',
  },
];

export const INITIAL_FILES: CloudFileItem[] = [
  {
    id: 'f-1',
    name: 'Kien_truc_He_thong_Mesh_Gateway_v2.pdf',
    key: 'docs/Kien_truc_He_thong_Mesh_Gateway_v2.pdf',
    size: 2457600,
    mimeType: 'application/pdf',
    category: 'document',
    folderId: 'fld-1',
    updatedAt: '2026-10-03T07:00:00.000Z',
    url: '#',
    ownerId: 'usr_nam',
    ownerName: 'Nguyễn Văn Nam',
    permission: 'editor',
    isStarred: true,
    isDeleted: false,
    shareSettings: {
      linkAccess: 'anyone',
      allowDownload: true,
    },
    versions: [
      {
        version: 2,
        nameTag: 'Bản nghiệm thu kỹ thuật',
        size: 2457600,
        updatedAt: '2026-10-03T07:00:00.000Z',
        updatedBy: 'Nguyễn Văn Nam',
        changeSummary: 'Bổ sung sơ đồ định tuyến NGINX và cụm 3 node Redis Pub/Sub',
      },
      {
        version: 1,
        size: 1980000,
        updatedAt: '2026-10-01T06:00:00.000Z',
        updatedBy: 'Nguyễn Văn Nam',
        changeSummary: 'Khởi tạo tài liệu kiến trúc sơ bộ',
      },
    ],
    previewContent: {
      pdfPages: 6,
      textSample:
        'Tài liệu đặc tả kiến trúc kỹ thuật hệ thống Real-time Collaborative Workspace. Phân bổ tải qua WebSocket Gateway, xử lý xung đột toán học CRDT Yjs và sao lưu liên tục vào cụm lưu trữ MinIO S3.',
    },
  },
  {
    id: 'f-2',
    name: 'Bang_Ke_Kinh_Phi_Du_An_Q3_2026.xlsx',
    key: 'docs/Bang_Ke_Kinh_Phi_Du_An_Q3_2026.xlsx',
    size: 1540000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'spreadsheet',
    folderId: 'fld-4',
    updatedAt: '2026-10-03T02:00:00.000Z',
    url: '#',
    ownerId: 'usr_nam',
    ownerName: 'Nguyễn Văn Nam',
    permission: 'editor',
    isStarred: true,
    isDeleted: false,
    shareSettings: {
      linkAccess: 'organization',
      allowDownload: true,
      hasPassword: true,
      password: 'Collab@2026',
    },
    versions: [
      {
        version: 1,
        nameTag: 'Bản chốt kế toán',
        size: 1540000,
        updatedAt: '2026-10-03T02:00:00.000Z',
        updatedBy: 'Nguyễn Văn Nam',
        changeSummary: 'Dự toán hạ tầng máy chủ phân tán và chi phí kiểm thử tải',
      },
    ],
  },
  {
    id: 'f-3',
    name: 'Wireframe_Giao_Dien_Zalo_Workspace_SaaS.png',
    key: 'images/Wireframe_Giao_Dien_Zalo_Workspace_SaaS.png',
    size: 3200000,
    mimeType: 'image/png',
    category: 'image',
    folderId: 'fld-2',
    updatedAt: '2026-10-02T16:00:00.000Z',
    url: '#',
    ownerId: 'usr_mai',
    ownerName: 'Trần Thị Mai',
    permission: 'editor',
    isStarred: false,
    isDeleted: false,
    versions: [
      {
        version: 1,
        size: 3200000,
        updatedAt: '2026-10-02T16:00:00.000Z',
        updatedBy: 'Trần Thị Mai',
        changeSummary: 'Thiết kế bố cục Zinc SaaS cho Chat và Whiteboard',
      },
    ],
  },
  {
    id: 'f-4',
    name: 'SOP_Huong_Dan_Deploy_Cluster_NGINX_Docker.docx',
    key: 'docs/SOP_Huong_Dan_Deploy_Cluster_NGINX_Docker.docx',
    size: 780000,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    folderId: 'fld-3',
    updatedAt: '2026-10-02T04:00:00.000Z',
    url: '#',
    ownerId: 'usr_long',
    ownerName: 'Lê Hoàng Long',
    permission: 'commenter',
    isStarred: false,
    isDeleted: false,
    versions: [
      {
        version: 1,
        size: 780000,
        updatedAt: '2026-10-02T04:00:00.000Z',
        updatedBy: 'Lê Hoàng Long',
        changeSummary: 'Quy trình vận hành chuẩn docker compose production',
      },
    ],
    previewContent: {
      textSample:
        'Hướng dẫn quy trình vận hành và triển khai cụm dịch vụ phân tán. Bao gồm cấu hình SSL Let’s Encrypt, chứng thực token JWT và cấu hình Redis clustering.',
    },
  },
  {
    id: 'f-5',
    name: 'Snapshot_State_Vector_Room_Kanban_v4.bin',
    key: 'snapshots/Room_Kanban_v4.bin',
    size: 25600,
    mimeType: 'application/octet-stream',
    category: 'snapshot',
    folderId: 'fld-1',
    updatedAt: '2026-10-03T09:00:00.000Z',
    url: '#',
    ownerId: 'sys',
    ownerName: 'SnapshotManager (System)',
    permission: 'owner',
    isStarred: false,
    isDeleted: false,
    versions: [
      {
        version: 4,
        size: 25600,
        updatedAt: '2026-10-03T09:00:00.000Z',
        updatedBy: 'System Auto-Save',
        changeSummary: 'Tự động chụp bản lưu nhị phân sau 100 thao tác kéo thẻ',
      },
      {
        version: 3,
        size: 21200,
        updatedAt: '2026-10-03T05:00:00.000Z',
        updatedBy: 'System Auto-Save',
        changeSummary: 'Snapshot định kỳ',
      },
    ],
  },
  {
    id: 'f-6',
    name: 'Database_Schema_Migration_v3.sql',
    key: 'archives/Database_Schema_Migration_v3.sql',
    size: 145000,
    mimeType: 'text/plain',
    category: 'code',
    folderId: 'fld-3',
    updatedAt: '2026-10-01T04:00:00.000Z',
    url: '#',
    ownerId: 'usr_nam',
    ownerName: 'Nguyễn Văn Nam',
    permission: 'editor',
    isStarred: false,
    isDeleted: false,
    versions: [
      {
        version: 1,
        size: 145000,
        updatedAt: '2026-10-01T04:00:00.000Z',
        updatedBy: 'Nguyễn Văn Nam',
        changeSummary: 'Tạo bảng document_snapshots, users và task_items',
      },
    ],
    previewContent: {
      textSample: `-- PostgreSQL Migration Script v3
CREATE TABLE IF NOT EXISTS cloud_files (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(512) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
  },
  {
    id: 'f-7',
    name: 'Hop_Dong_Hop_Tac_Phat_Trien_2026.pdf',
    key: 'docs/Hop_Dong_Hop_Tac_Phat_Trien_2026.pdf',
    size: 1890000,
    mimeType: 'application/pdf',
    category: 'document',
    folderId: 'fld-4',
    updatedAt: '2026-09-30T08:00:00.000Z',
    url: '#',
    ownerId: 'usr_nam',
    ownerName: 'Nguyễn Văn Nam',
    permission: 'owner',
    isStarred: true,
    isDeleted: false,
    shareSettings: {
      linkAccess: 'restricted',
      allowDownload: false,
      expiresAt: '2026-12-31',
    },
    versions: [
      {
        version: 1,
        nameTag: 'Bản ký kết chính thức',
        size: 1890000,
        updatedAt: '2026-09-30T08:00:00.000Z',
        updatedBy: 'Nguyễn Văn Nam',
        changeSummary: 'Ký thỏa thuận khung hợp tác dịch vụ đám mây',
      },
    ],
  },
];

