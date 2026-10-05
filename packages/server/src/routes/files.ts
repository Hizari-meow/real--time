import { Router, Request, Response } from 'express';
import { S3StorageService } from '../storage/s3-client.js';

export const filesRouter = Router();

export interface FileItem {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  category: 'document' | 'image' | 'archive' | 'snapshot' | 'other';
  updatedAt: string;
  url: string;
  ownerName: string;
}

// Demo static file index merged with MinIO S3 list
const staticDemoFiles: FileItem[] = [
  {
    id: 'f-1',
    name: 'Kien_truc_He_thong_Mesh_v2.pdf',
    key: 'docs/Kien_truc_He_thong_Mesh_v2.pdf',
    size: 2457600,
    mimeType: 'application/pdf',
    category: 'document',
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    url: '/files/download/Kien_truc_He_thong_Mesh_v2.pdf',
    ownerName: 'Nguyễn Văn Nam',
  },
  {
    id: 'f-2',
    name: 'Wireframe_Zalo_Workspace_Dark.png',
    key: 'images/Wireframe_Zalo_Workspace_Dark.png',
    size: 1048576,
    mimeType: 'image/png',
    category: 'image',
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    url: '/files/download/Wireframe_Zalo_Workspace_Dark.png',
    ownerName: 'Trần Thị Linh',
  },
  {
    id: 'f-3',
    name: 'SOP_Deploy_Cluster_NGINX_Redis.docx',
    key: 'docs/SOP_Deploy_Cluster_NGINX_Redis.docx',
    size: 524288,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    updatedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    url: '/files/download/SOP_Deploy_Cluster_NGINX_Redis.docx',
    ownerName: 'Lê Hoàng',
  },
];

// GET /api/files - List all cloud files
filesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const s3 = S3StorageService.getInstance();
    const s3Objects = await s3.listFiles();

    const mappedS3Files: FileItem[] = s3Objects.map((obj, idx) => {
      const name = obj.key.split('/').pop() || obj.key;
      const isSnapshot = obj.key.startsWith('snapshots/');
      return {
        id: `s3-${idx}`,
        name,
        key: obj.key,
        size: obj.size,
        mimeType: isSnapshot ? 'application/octet-stream' : 'application/octet-stream',
        category: isSnapshot ? 'snapshot' : 'other',
        updatedAt: obj.lastModified ? obj.lastModified.toISOString() : new Date().toISOString(),
        url: `/api/files/download/${encodeURIComponent(obj.key)}`,
        ownerName: 'Hệ thống tự động',
      };
    });

    const combined = [...staticDemoFiles, ...mappedS3Files];
    res.json({ success: true, count: combined.length, data: combined });
  } catch (err: any) {
    res.json({ success: true, count: staticDemoFiles.length, data: staticDemoFiles });
  }
});

// POST /api/files/upload - Upload file simulation/storage
filesRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { name, contentBase64, mimeType = 'application/octet-stream', category = 'other', ownerName = 'Nguyễn Văn Nam' } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'File name is required' });
    }

    const key = `uploads/${Date.now()}-${name}`;
    const buffer = contentBase64 ? Buffer.from(contentBase64, 'base64') : Buffer.from('mock file content');

    const s3 = S3StorageService.getInstance();
    await s3.uploadFile(key, buffer, mimeType);

    const newFile: FileItem = {
      id: `f-${Date.now()}`,
      name,
      key,
      size: buffer.length,
      mimeType,
      category: category as any,
      updatedAt: new Date().toISOString(),
      url: `/api/files/download/${encodeURIComponent(key)}`,
      ownerName,
    };

    staticDemoFiles.unshift(newFile);
    res.status(201).json({ success: true, data: newFile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/files/:key
filesRouter.delete('/:key', async (req: Request, res: Response) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const s3 = S3StorageService.getInstance();
    await s3.deleteObject(key);

    const initialLen = staticDemoFiles.length;
    const filtered = staticDemoFiles.filter((f) => f.key !== key);
    staticDemoFiles.length = 0;
    staticDemoFiles.push(...filtered);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
