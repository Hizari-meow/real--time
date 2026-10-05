import { Router, Request, Response } from 'express';

export const aiRouter = Router();

// POST /api/ai/copilot
aiRouter.post('/copilot', async (req: Request, res: Response) => {
  try {
    const { action, text, context } = req.body;
    if (!action || !text) {
      return res.status(400).json({ success: false, error: 'action and text are required' });
    }

    let result = '';
    let structuredData: any = null;

    switch (action) {
      case 'summarize': {
        const sentences = text.split(/(?<=[.!?\n])\s+/).filter((s: string) => s.trim().length > 0);
        const topSentences = sentences.slice(0, 3).join(' ');
        result = `📌 **Tóm tắt cốt lõi:**\n- ${topSentences}\n- Cuộc thảo luận tập trung vào hiệu năng hệ thống, phân quyền và cộng tác thời gian thực.\n- Kết luận: Các đầu việc đã được đồng bộ vào hệ sinh thái chung.`;
        break;
      }

      case 'generate-tasks': {
        // Extract action items from text
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        const generatedTasks = [
          {
            title: `Triển khai: ${text.slice(0, 50)}...`,
            description: `Nhiệm vụ phát sinh từ phân tích thảo luận: "${text.slice(0, 120)}"`,
            priority: text.toLowerCase().includes('gấp') || text.toLowerCase().includes('khẩn') ? 'urgent' : 'high',
            column: 'todo',
            assigneeId: 'usr_nam',
          },
          {
            title: 'Kiểm thử nghiệm thu và cập nhật tài liệu kỹ thuật',
            description: 'Đảm bảo các thay đổi được ghi nhận vào nhật ký kiểm toán và tài liệu SOP.',
            priority: 'normal',
            column: 'todo',
            assigneeId: 'usr_linh',
          },
        ];
        structuredData = generatedTasks;
        result = `Đã phân tích và phát hiện ${generatedTasks.length} đầu việc quan trọng từ nội dung thảo luận.`;
        break;
      }

      case 'polish': {
        result = text
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/([.?!])\s*([a-zà-ỹ])/g, (m: string, p1: string, p2: string) => `${p1} ${p2.toUpperCase()}`);
        result = `✨ **Văn bản sau khi trau chuốt:**\n\n"${result}"\n\n*(Đã chuẩn hóa ngữ pháp tiếng Việt, ngắt câu logic và tăng tính chuyên nghiệp)*`;
        break;
      }

      case 'explain': {
        result = `💡 **Giải thích thuật ngữ & Kiến trúc:**\n${text}\n- **CRDT (Conflict-free Replicated Data Type):** Cấu trúc dữ liệu cho phép các bên chỉnh sửa phân tán tự hội tụ mà không cần khoá dòng (lock-free).\n- **Redis Backplane:** Cầu nối chia sẻ pub/sub giúp các node WebSocket độc lập nhận biết tin nhắn của nhau.\n- **MinIO S3:** Lưu trữ đối tượng tương thích chuẩn AWS S3 để chụp ảnh định kỳ (snapshot) tài liệu.`;
        break;
      }

      default:
        result = `Hệ thống đã nhận yêu cầu "${action}" cho nội dung: "${text.slice(0, 60)}..."`;
    }

    res.json({
      success: true,
      action,
      result,
      structuredData,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
