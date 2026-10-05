'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  Save,
  Share2,
  Download,
  MessageSquare,
  ArrowLeft,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Send,
  Mic,
  CheckSquare,
  Sparkles,
  Filter,
  Eye,
  RefreshCw,
  Search,
  Sigma,
  ExternalLink,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  ArrowDown,
  ArrowRight as ArrowRightIcon,
  Palette,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { getCollaboratorColor } from '@collab/shared';

export interface SheetCell {
  value: string;
  formula?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
  hasComment?: boolean;
  format?: 'text' | 'currency' | 'percent' | 'number';
}

export interface SheetComment {
  id: string;
  cellCoord: string;
  authorName: string;
  authorColor: string;
  authorRole: string;
  content: string;
  timestamp: number;
  resolved: boolean;
  isSuggestion?: boolean;
  suggestedValue?: string;
  replies?: {
    id: string;
    authorName: string;
    authorColor: string;
    content: string;
    timestamp: number;
  }[];
  assignedTask?: {
    assignee: string;
    deadline: string;
  };
}

export interface CollaborativeSpreadsheetProps {
  sheetId: string;
  sheetTitle?: string;
  currentUser?: {
    id: string;
    name: string;
    color: string;
  };
}

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const DEFAULT_ROW_COUNT = 30;

// Color swatches for text & fill
const COLOR_PRESETS = [
  { name: 'Mặc định', bg: '#ffffff', text: '#18181b' },
  { name: 'Xám nhạt', bg: '#f4f4f5', text: '#52525b' },
  { name: 'Xanh dương nhạt', bg: '#eff6ff', text: '#1d4ed8' },
  { name: 'Xanh lá nhạt', bg: '#ecfdf5', text: '#15803d' },
  { name: 'Vàng hổ phách', bg: '#fef3c7', text: '#92400e' },
  { name: 'Đỏ hồng nhạt', bg: '#fff1f2', text: '#be123c' },
  { name: 'Tím nhạt', bg: '#faf5ff', text: '#6b21a8' },
];

// Seed Data ONLY for the demo sheet "sheet_fin_q4"
const SEED_FINANCIAL_GRID_DATA: Record<string, SheetCell> = {
  A1: { value: 'BÁO CÁO TÀI CHÍNH & TĂNG TRƯỞNG DOANH THU SAAS 2026', bold: true, color: '#1e3a8a', bg: '#eff6ff' },
  A2: { value: 'Đơn vị tính: USD ($) • Cập nhật: Quý 4/2026 • Phụ trách: Phòng Kế toán & Tài chính', italic: true, color: '#6b7280' },
  A3: { value: 'STT', bold: true, align: 'center', bg: '#f1f5f9' },
  B3: { value: 'Hạng Mục Chỉ Tiêu', bold: true, align: 'left', bg: '#f1f5f9' },
  C3: { value: 'Kế Hoạch Q3 ($)', bold: true, align: 'right', bg: '#f1f5f9' },
  D3: { value: 'Thực Tế Q3 ($)', bold: true, align: 'right', bg: '#ecfdf5' },
  E3: { value: 'Chênh Lệch ($)', bold: true, align: 'right', bg: '#f1f5f9' },
  F3: { value: 'Tỷ Lệ Đạt (%)', bold: true, align: 'right', bg: '#f1f5f9' },
  G3: { value: 'Trạng Thái & Ghi Chú', bold: true, align: 'left', bg: '#f1f5f9' },

  A4: { value: '1', align: 'center' },
  B4: { value: 'Doanh thu bản quyền Cá nhân (Pro)' },
  C4: { value: '35000', align: 'right' },
  D4: { value: '38200', align: 'right' },
  E4: { value: '3200', formula: '=D4-C4', align: 'right', color: '#16a34a' },
  F4: { value: '109.1%', align: 'right', bold: true, color: '#16a34a' },
  G4: { value: 'Đạt và vượt chỉ tiêu' },

  A5: { value: '2', align: 'center' },
  B5: { value: 'Doanh thu bản quyền Nhóm (Team Workspace)' },
  C5: { value: '45000', align: 'right' },
  D5: { value: '54300', align: 'right' },
  E5: { value: '9300', formula: '=D5-C5', align: 'right', color: '#16a34a' },
  F5: { value: '120.7%', align: 'right', bold: true, color: '#16a34a' },
  G5: { value: 'Nhu cầu làm việc từ xa tăng mạnh' },

  A6: { value: '3', align: 'center' },
  B6: { value: 'Doanh thu Doanh nghiệp lớn (Enterprise)' },
  C6: { value: '80000', align: 'right' },
  D6: { value: '92500', align: 'right' },
  E6: { value: '12500', formula: '=D6-C6', align: 'right', color: '#16a34a' },
  F6: { value: '115.6%', align: 'right', bold: true, color: '#16a34a' },
  G6: { value: 'Ký kết thành công 3 hợp đồng VIP' },

  A10: { value: '7', align: 'center' },
  B10: { value: 'Người dùng mới hoạt động (MAU)' },
  C10: { value: '100000', align: 'right' },
  D10: { value: '125400', align: 'right' },
  E10: { value: '25400', formula: '=D10-C10', align: 'right', color: '#16a34a' },
  F10: { value: '125.4%', align: 'right', bold: true, color: '#16a34a' },
  G10: { value: 'Chiến dịch marketing lan tỏa tốt' },

  // CELL C12: Crucial Cell highlighted in Tab 3
  A12: { value: '9', align: 'center' },
  B12: { value: 'Doanh thu SaaS thực tế (Tổng hợp)', bold: true },
  C12: {
    value: '128400',
    formula: '=SUM(D4:D6)',
    bold: true,
    align: 'right',
    bg: '#fef3c7',
    color: '#92400e',
    hasComment: true,
  },
  D12: { value: '110000', align: 'right' },
  E12: { value: '18400', formula: '=C12-D12', align: 'right', color: '#16a34a', bold: true },
  F12: { value: '116.7%', align: 'right', bold: true, color: '#16a34a' },
  G12: { value: '💬 Cần kiểm toán lại thuế GTGT trước 17h', color: '#b45309' },

  A13: { value: '10', align: 'center' },
  B13: { value: 'Chi phí hạ tầng máy chủ WebSocket (AWS/GCP)' },
  C13: { value: '25000', align: 'right' },
  D13: { value: '22100', align: 'right' },
  E13: { value: '-2900', formula: '=D13-C13', align: 'right', color: '#2563eb' },
  F13: { value: '88.4%', align: 'right', bold: true, color: '#2563eb' },
  G13: { value: 'Tối ưu bộ nén State Vector CRDT tiết kiệm 11.6%' },

  A15: { value: '12', align: 'center' },
  B15: { value: 'LỢI NHUẬN GỘP TẠM TÍNH (GROSS PROFIT)', bold: true, bg: '#f8fafc' },
  C15: { value: '135000', align: 'right', bold: true, bg: '#f8fafc' },
  D15: { value: '162900', align: 'right', bold: true, color: '#15803d', bg: '#f8fafc' },
  E15: { value: '27900', formula: '=D15-C15', align: 'right', bold: true, color: '#15803d', bg: '#f8fafc' },
  F15: { value: '120.7%', align: 'right', bold: true, color: '#15803d', bg: '#f8fafc' },
  G15: { value: 'Biên lợi nhuận gộp đạt 88%', bold: true, bg: '#f8fafc' },
};

const SEED_FINANCIAL_COMMENTS: SheetComment[] = [
  {
    id: 'cmt_sheet_c12',
    cellCoord: 'C12',
    authorName: 'Trần Thị Linh',
    authorColor: '#ec4899',
    authorRole: 'Product Manager',
    content: '@Hùng kiểm tra lại công thức ở ô C12 trước 17h nhé, số liệu doanh thu này đã tính cả thuế chưa?',
    timestamp: Date.now() - 1000 * 60 * 65,
    resolved: false,
    isSuggestion: true,
    suggestedValue: '131200',
    assignedTask: {
      assignee: 'Hùng Nguyễn',
      deadline: '17:00 03/10/2026',
    },
    replies: [
      {
        id: 'rep_c12_1',
        authorName: 'Hùng Nguyễn',
        authorColor: '#10b981',
        content: 'Em đang kiểm tra lại hệ thống ERP, trước 17h sẽ chốt số cuối cùng cho chị!',
        timestamp: Date.now() - 1000 * 60 * 25,
      },
    ],
  },
  {
    id: 'cmt_sheet_c13',
    cellCoord: 'C13',
    authorName: 'Lê Hoàng',
    authorColor: '#f59e0b',
    authorRole: 'DevOps & SRE Lead',
    content: 'Chi phí hạ tầng máy chủ $22,100 đã giảm nhờ thuật toán nén CRDT. Mục này tháng tới có thể giảm thêm 5%.',
    timestamp: Date.now() - 1000 * 60 * 120,
    resolved: true,
    replies: [],
  },
];

// Helper: Parse number from cell value
function parseNumber(val?: string): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/[\$,₫\s%]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Helper: Expand cell range (e.g. "D4:D6" -> ["D4", "D5", "D6"])
function getRangeCells(rangeStr: string): string[] {
  const parts = rangeStr.split(':').map((s) => s.trim().toUpperCase());
  if (parts.length === 1) return [parts[0]];
  const start = parts[0];
  const end = parts[1];

  const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
  const startRow = parseInt(start.match(/\d+/)?.[0] || '1', 10);
  const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
  const endRow = parseInt(end.match(/\d+/)?.[0] || '1', 10);

  const startColIdx = COLUMNS.indexOf(startCol);
  const endColIdx = COLUMNS.indexOf(endCol);
  if (startColIdx === -1 || endColIdx === -1) return [start];

  const minCol = Math.min(startColIdx, endColIdx);
  const maxCol = Math.max(startColIdx, endColIdx);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);

  const cells: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      if (COLUMNS[c]) cells.push(`${COLUMNS[c]}${r}`);
    }
  }
  return cells;
}

// Dynamic Excel Formula Evaluator
function evaluateFormula(formula: string, grid: Record<string, SheetCell>): string {
  if (!formula.startsWith('=')) return formula;
  const expr = formula.slice(1).trim();
  const upper = expr.toUpperCase();

  // 1. =SUM(...)
  const sumMatch = upper.match(/^SUM\(([^)]+)\)$/);
  if (sumMatch) {
    const range = sumMatch[1];
    const cells = range.includes(':') ? getRangeCells(range) : range.split(',').map((s) => s.trim());
    let total = 0;
    cells.forEach((c) => {
      total += parseNumber(grid[c]?.value);
    });
    return String(Math.round(total * 100) / 100);
  }

  // 2. =AVERAGE(...)
  const avgMatch = upper.match(/^AVERAGE\(([^)]+)\)$/);
  if (avgMatch) {
    const range = avgMatch[1];
    const cells = range.includes(':') ? getRangeCells(range) : range.split(',').map((s) => s.trim());
    let total = 0;
    let count = 0;
    cells.forEach((c) => {
      total += parseNumber(grid[c]?.value);
      count++;
    });
    return count > 0 ? String(Math.round((total / count) * 100) / 100) : '0';
  }

  // 3. =COUNT(...)
  const countMatch = upper.match(/^COUNT\(([^)]+)\)$/);
  if (countMatch) {
    const range = countMatch[1];
    const cells = range.includes(':') ? getRangeCells(range) : range.split(',').map((s) => s.trim());
    let count = 0;
    cells.forEach((c) => {
      if (grid[c]?.value && String(grid[c]?.value).trim() !== '') count++;
    });
    return String(count);
  }

  // 4. =MAX(...)
  const maxMatch = upper.match(/^MAX\(([^)]+)\)$/);
  if (maxMatch) {
    const range = maxMatch[1];
    const cells = range.includes(':') ? getRangeCells(range) : range.split(',').map((s) => s.trim());
    let max = -Infinity;
    cells.forEach((c) => {
      const v = parseNumber(grid[c]?.value);
      if (v > max) max = v;
    });
    return max === -Infinity ? '0' : String(max);
  }

  // 5. =MIN(...)
  const minMatch = upper.match(/^MIN\(([^)]+)\)$/);
  if (minMatch) {
    const range = minMatch[1];
    const cells = range.includes(':') ? getRangeCells(range) : range.split(',').map((s) => s.trim());
    let min = Infinity;
    cells.forEach((c) => {
      const v = parseNumber(grid[c]?.value);
      if (v < min) min = v;
    });
    return min === Infinity ? '0' : String(min);
  }

  // 6. Direct Arithmetic (e.g. =D4-C4 or =A1+B1 or =C12*1.1)
  try {
    const sanitized = upper.replace(/\b([A-M]\d{1,2})\b/g, (match) => {
      return String(parseNumber(grid[match]?.value));
    });
    if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      const result = new Function(`return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return String(Math.round(result * 100) / 100);
      }
    }
  } catch {
    return '#ERROR!';
  }

  return formula;
}

// Recalculate grid dependencies
function recalculateGrid(grid: Record<string, SheetCell>): Record<string, SheetCell> {
  const updated = { ...grid };
  for (let pass = 0; pass < 2; pass++) {
    Object.keys(updated).forEach((coord) => {
      const cell = updated[coord];
      if (cell?.formula && cell.formula.startsWith('=')) {
        const computed = evaluateFormula(cell.formula, updated);
        updated[coord] = { ...cell, value: computed };
      }
    });
  }
  return updated;
}

export function CollaborativeSpreadsheet({
  sheetId,
  sheetTitle = 'Bảng Tính Excel',
  currentUser = { id: 'usr_nam', name: 'Nguyễn Văn Nam', color: '#2563eb' },
}: CollaborativeSpreadsheetProps) {
  const isSeedDemoSheet = sheetId === 'sheet_fin_q4';

  const [title, setTitle] = useState(sheetTitle);
  const [selectedCell, setSelectedCell] = useState<string>(isSeedDemoSheet ? 'C12' : 'A1');
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');
  const [rowCount, setRowCount] = useState<number>(DEFAULT_ROW_COUNT);

  // Sheet Tabs
  const [sheetTabs, setSheetTabs] = useState([
    { id: 'tab1', name: isSeedDemoSheet ? 'Báo cáo Q3-Q4' : 'Trang tính 1' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab1');

  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState<boolean>(isSeedDemoSheet);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [colorPickerOpen, setColorPickerOpen] = useState<'text' | 'bg' | null>(null);

  // Initialize Grid Data: If creating a NEW sheet, start with a CLEAN EMPTY GRID!
  const [gridData, setGridData] = useState<Record<string, SheetCell>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collab_sheet_data_${sheetId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    // Only pre-fill demo data if it's the specific seed sheet
    if (isSeedDemoSheet) {
      return recalculateGrid(SEED_FINANCIAL_GRID_DATA);
    }
    // Brand new clean empty sheet
    return {};
  });

  // Comments state: Brand new empty sheet starts with empty comments
  const [sheetComments, setSheetComments] = useState<SheetComment[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collab_sheet_comments_${sheetId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    if (isSeedDemoSheet) {
      return SEED_FINANCIAL_COMMENTS;
    }
    return [];
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyInputActive, setReplyInputActive] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync formula bar when selecting a cell
  useEffect(() => {
    const cell = gridData[selectedCell];
    setFormulaInput(cell ? (cell.formula || cell.value) : '');
  }, [selectedCell, gridData]);

  // Persistent storage in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`collab_sheet_data_${sheetId}`, JSON.stringify(gridData));
    } catch {}
  }, [gridData, sheetId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`collab_sheet_comments_${sheetId}`, JSON.stringify(sheetComments));
    } catch {}
  }, [sheetComments, sheetId]);

  // Cell Selection
  const handleCellClick = (coord: string) => {
    if (editingCell && editingCell !== coord) {
      commitInlineEdit();
    }
    setSelectedCell(coord);
    const cell = gridData[coord];
    setFormulaInput(cell ? (cell.formula || cell.value) : '');
  };

  // Double click cell to edit inline
  const handleCellDoubleClick = (coord: string) => {
    setSelectedCell(coord);
    setEditingCell(coord);
    const cell = gridData[coord];
    setInlineValue(cell ? (cell.formula || cell.value) : '');
  };

  // Formula input change in top bar
  const handleFormulaChange = (val: string) => {
    setFormulaInput(val);
    const isFormula = val.startsWith('=');
    const computedVal = isFormula ? evaluateFormula(val, gridData) : val;

    setGridData((prev) => {
      const nextGrid = {
        ...prev,
        [selectedCell]: {
          ...(prev[selectedCell] || {}),
          formula: isFormula ? val : undefined,
          value: computedVal,
        },
      };
      return recalculateGrid(nextGrid);
    });
    setIsSaved(false);
  };

  // Commit inline edit
  const commitInlineEdit = () => {
    if (!editingCell) return;
    const val = inlineValue;
    const isFormula = val.startsWith('=');
    const computedVal = isFormula ? evaluateFormula(val, gridData) : val;

    setGridData((prev) => {
      const nextGrid = {
        ...prev,
        [editingCell]: {
          ...(prev[editingCell] || {}),
          formula: isFormula ? val : undefined,
          value: computedVal,
        },
      };
      return recalculateGrid(nextGrid);
    });
    setEditingCell(null);
    setFormulaInput(val);
    setIsSaved(false);
  };

  // Format Toggles
  const handleToggleBold = () => {
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        bold: !(prev[selectedCell]?.bold),
      },
    }));
    setIsSaved(false);
  };

  const handleToggleItalic = () => {
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        italic: !(prev[selectedCell]?.italic),
      },
    }));
    setIsSaved(false);
  };

  const handleToggleUnderline = () => {
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        underline: !(prev[selectedCell]?.underline),
      },
    }));
    setIsSaved(false);
  };

  const handleSetAlign = (align: 'left' | 'center' | 'right') => {
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        align,
      },
    }));
    setIsSaved(false);
  };

  const handleSetColor = (color: string, type: 'text' | 'bg') => {
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        [type === 'text' ? 'color' : 'bg']: color,
      },
    }));
    setColorPickerOpen(null);
    setIsSaved(false);
  };

  const handleFormatNumber = (type: 'currency' | 'percent') => {
    const raw = gridData[selectedCell]?.value || '';
    const num = parseNumber(raw);
    let formatted = raw;
    if (type === 'currency') {
      formatted = `$${num.toLocaleString('en-US')}`;
    } else if (type === 'percent') {
      formatted = `${num}%`;
    }
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        value: formatted,
      },
    }));
    setFormulaInput(formatted);
    setIsSaved(false);
    showToast(`Đã định dạng ô ${selectedCell} sang ${type === 'currency' ? 'Tiền tệ ($)' : 'Phần trăm (%)'}`);
  };

  // Insert Row / Column
  const handleInsertRow = () => {
    setRowCount((prev) => prev + 5);
    showToast('Đã thêm 5 dòng mới vào bảng tính.');
  };

  // Add Comment on selected cell
  const handleAddCommentToCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newCmt: SheetComment = {
      id: `cmt_sh_${Date.now()}`,
      cellCoord: selectedCell,
      authorName: currentUser.name,
      authorColor: currentUser.color,
      authorRole: 'Thành viên',
      content: newCommentText.trim(),
      timestamp: Date.now(),
      resolved: false,
      replies: [],
    };

    setSheetComments((prev) => [newCmt, ...prev]);

    // Mark cell has comment
    setGridData((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || {}),
        hasComment: true,
      },
    }));

    setNewCommentText('');
    showToast(`Đã ghim bình luận vào ô ${selectedCell}!`);
  };

  // Add Reply
  const handleAddReply = (commentId: string) => {
    const text = replyText[commentId]?.trim();
    if (!text) return;

    setSheetComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `rep_${Date.now()}`,
                  authorName: currentUser.name,
                  authorColor: currentUser.color,
                  content: text,
                  timestamp: Date.now(),
                },
              ],
            }
          : c
      )
    );

    setReplyText((prev) => ({ ...prev, [commentId]: '' }));
    setReplyInputActive(null);
    showToast('Đã gửi phản hồi vào chuỗi bình luận!');
  };

  // Toggle Resolve
  const handleToggleResolve = (commentId: string) => {
    setSheetComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c))
    );
    showToast('Đã cập nhật trạng thái bình luận.');
  };

  // Convert Sheet Comment to Kanban Task
  const handleConvertCommentToTask = (comment: SheetComment) => {
    try {
      const stored = localStorage.getItem('collab_kanban_external_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      const taskKey = `WEB-${Math.floor(10 + Math.random() * 89)}`;
      const deadline = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
      const cellVal = gridData[comment.cellCoord]?.value || '';

      const newTask = {
        id: `task_from_sheet_${Date.now()}`,
        key: taskKey,
        title: `[Bảng tính ${title}] Ô ${comment.cellCoord}: ${comment.content.slice(0, 35)}...`,
        description: `Nhiệm vụ chuyển từ bình luận tại ô ${comment.cellCoord} trong bảng tính "${title}":\n"${comment.content}"\nGiá trị ô hiện tại: "${cellVal}"`,
        column: 'todo' as const,
        priority: 'high' as const,
        assigneeName: currentUser.name,
        assigneeColor: currentUser.color,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: deadline,
        labels: ['Bảng tính', 'Số liệu'],
        checklist: [
          { id: 'c1', text: `Kiểm tra số liệu tại ô ${comment.cellCoord}`, completed: false },
          { id: 'c2', text: 'Cập nhật lại công thức hoặc giải trình số liệu', completed: false },
        ],
        source_ref: {
          type: 'comment' as const,
          id: comment.id,
          title: `${title} (Ô ${comment.cellCoord})`,
          url: `/sheet/${sheetId}#cell=${comment.cellCoord}`,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      tasks.push(newTask);
      localStorage.setItem('collab_kanban_external_tasks', JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('collab_task_created'));

      setSheetComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                assignedTask: {
                  assignee: currentUser.name,
                  deadline: '3 ngày tới',
                },
              }
            : c
        )
      );

      showToast(`Đã tạo nhiệm vụ ${taskKey} trên Kanban giao cho @${currentUser.name}!`);

      // Audit log
      try {
        const storedLogs = localStorage.getItem('collab_audit_logs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        logs.unshift({
          id: 'aud_' + Date.now(),
          action: `Chuyển bình luận ô ${comment.cellCoord} bảng tính "${title}" thành thẻ việc ${taskKey}`,
          userName: currentUser.name,
          userRole: 'Editor',
          module: 'Bảng tính Excel (M1)',
          timestamp: Date.now(),
          status: 'success',
        });
        localStorage.setItem('collab_audit_logs', JSON.stringify(logs.slice(0, 50)));
      } catch {}
    } catch (err) {
      console.warn('Failed to convert sheet comment to task', err);
    }
  };

  // Export CSV File
  const handleExportCSV = () => {
    let csv = '';
    // Headers
    csv += ['#', ...COLUMNS].join(',') + '\n';
    for (let r = 1; r <= rowCount; r++) {
      const rowVals = [String(r), ...COLUMNS.map((c) => {
        const val = gridData[`${c}${r}`]?.value || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })];
      csv += rowVals.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã xuất file CSV thành công!');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(gridData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu JSON thành công!');
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-zinc-900 select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Studio Header */}
      <header className="h-14 px-4 border-b border-zinc-200 bg-white flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-bold text-xs sm:text-sm text-zinc-900 bg-transparent hover:bg-zinc-100/70 focus:bg-white focus:ring-1 focus:ring-emerald-500 px-1.5 py-0.5 rounded-lg transition-all"
                  title="Nhấp để đổi tên bảng tính"
                />
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Excel Engine v2.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono pl-1">
                ID: {sheetId} • Tự động lưu đám mây
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Active Collaborators */}
          <div className="hidden sm:flex items-center -space-x-1.5 mr-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shadow-xs"
              style={{ backgroundColor: currentUser.color }}
              title={currentUser.name}
            >
              {currentUser.name.slice(0, 1)}
            </div>
            <div
              className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shadow-xs"
              title="Trần Thị Linh (Đang xem)"
            >
              L
            </div>
            <div
              className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shadow-xs"
              title="Lê Hoàng (Đang xem)"
            >
              H
            </div>
          </div>

          {/* Export Dropdown */}
          <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất file CSV chuẩn"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Xuất CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-2 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 border-l border-zinc-200 text-xs transition-colors cursor-pointer"
              title="Xuất JSON"
            >
              JSON
            </button>
          </div>

          {/* Comments Drawer Toggle */}
          <button
            onClick={() => setCommentsDrawerOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              commentsDrawerOpen
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Bình luận ({sheetComments.filter((c) => !c.resolved).length})</span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => {
              setIsSaved(true);
              showToast('Đã lưu bảng tính thành công!');
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Đã lưu' : 'Lưu lại'}</span>
          </button>
        </div>
      </header>

      {/* Spreadsheet Quick Formatting Toolbar */}
      <div className="h-10 bg-zinc-50 border-b border-zinc-200 px-4 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
        <button onClick={() => showToast('Đã hoàn tác')} className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 cursor-pointer" title="Hoàn tác (Undo)">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => showToast('Đã làm lại')} className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 cursor-pointer" title="Làm lại (Redo)">
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Font styling */}
        <button
          onClick={handleToggleBold}
          className={`p-1.5 rounded font-bold cursor-pointer transition-colors ${
            gridData[selectedCell]?.bold ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="In đậm (Bold)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleItalic}
          className={`p-1.5 rounded italic cursor-pointer transition-colors ${
            gridData[selectedCell]?.italic ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="In nghiêng (Italic)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleUnderline}
          className={`p-1.5 rounded underline cursor-pointer transition-colors ${
            gridData[selectedCell]?.underline ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="Gạch chân (Underline)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => handleSetAlign('left')}
          className={`p-1.5 rounded cursor-pointer ${
            gridData[selectedCell]?.align === 'left' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="Căn trái"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleSetAlign('center')}
          className={`p-1.5 rounded cursor-pointer ${
            gridData[selectedCell]?.align === 'center' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="Căn giữa"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleSetAlign('right')}
          className={`p-1.5 rounded cursor-pointer ${
            gridData[selectedCell]?.align === 'right' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200/70'
          }`}
          title="Căn phải"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Number Formats */}
        <button
          onClick={() => handleFormatNumber('currency')}
          className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 font-bold flex items-center gap-0.5 cursor-pointer"
          title="Định dạng tiền tệ ($)"
        >
          <DollarSign className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleFormatNumber('percent')}
          className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 font-bold flex items-center gap-0.5 cursor-pointer"
          title="Định dạng phần trăm (%)"
        >
          <Percent className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Color Popover */}
        <div className="relative">
          <button
            onClick={() => setColorPickerOpen((prev) => (prev === 'bg' ? null : 'bg'))}
            className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 flex items-center gap-1 cursor-pointer"
            title="Màu nền ô (Fill)"
          >
            <Palette className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-semibold">Tô màu</span>
          </button>
          {colorPickerOpen === 'bg' && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-40 w-44 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block px-1">Chọn màu nền</span>
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleSetColor(c.bg, 'bg')}
                  className="w-full flex items-center gap-2 px-2 py-1 hover:bg-zinc-100 rounded-lg text-xs cursor-pointer"
                >
                  <span className="w-4 h-4 rounded border border-zinc-300" style={{ backgroundColor: c.bg }} />
                  <span className="text-zinc-700 text-[11px]">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Insert Row Button */}
        <button
          onClick={handleInsertRow}
          className="p-1.5 hover:bg-zinc-200/70 rounded text-zinc-700 flex items-center gap-1 cursor-pointer"
          title="Thêm 5 dòng phía dưới"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-semibold">+ Thêm dòng</span>
        </button>

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        {/* Comment Trigger */}
        <button
          onClick={() => setCommentsDrawerOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-semibold text-[11px] cursor-pointer"
        >
          <MessageSquare className="w-3 h-3 text-amber-600" />
          <span>Ghim bình luận ô {selectedCell}</span>
        </button>
      </div>

      {/* Formula Bar (fx) */}
      <div className="h-9 bg-white border-b border-zinc-200 px-4 flex items-center gap-2 text-xs shrink-0">
        <div className="w-16 px-2 py-1 bg-zinc-100 rounded-lg border border-zinc-200 text-center font-mono font-bold text-zinc-800 text-[11px]">
          {selectedCell}
        </div>
        <div className="text-zinc-400 font-mono font-bold italic">fx</div>
        <input
          type="text"
          value={formulaInput}
          onChange={(e) => handleFormulaChange(e.target.value)}
          placeholder="Nhập công thức =SUM(A1:A5), =AVERAGE, phép tính =A1+B1 hoặc giá trị text..."
          className="flex-1 bg-transparent px-2 py-1 font-mono text-xs text-zinc-900 focus:outline-none"
        />
        <div className="text-[10px] text-zinc-400 font-mono hidden md:flex items-center gap-2">
          <span>Hỗ trợ: SUM, AVERAGE, COUNT, MAX, MIN, + - * /</span>
        </div>
      </div>

      {/* Main Spreadsheet Grid + Comments Drawer Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Spreadsheet Table Viewport */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-xs select-none">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600 font-mono text-[11px] sticky top-0 z-20 shadow-2xs">
                <th className="w-12 h-7 border border-zinc-200 bg-zinc-200/80 text-center">#</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className={`h-7 border border-zinc-200 font-semibold px-2 min-w-[120px] text-center ${
                      selectedCell.startsWith(col) ? 'bg-blue-100 text-blue-900' : 'bg-zinc-100'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, i) => i + 1).map((row) => (
                <tr key={row} className="hover:bg-zinc-50/40">
                  {/* Row Header */}
                  <td
                    className={`w-12 h-7 border border-zinc-200 text-center font-mono text-zinc-400 text-[11px] sticky left-0 z-10 ${
                      selectedCell.endsWith(String(row)) ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-zinc-100'
                    }`}
                  >
                    {row}
                  </td>

                  {/* Columns */}
                  {COLUMNS.map((col) => {
                    const coord = `${col}${row}`;
                    const cell = gridData[coord];
                    const isSelected = selectedCell === coord;
                    const isEditing = editingCell === coord;
                    const hasCmt = cell?.hasComment || sheetComments.some((c) => c.cellCoord === coord && !c.resolved);

                    return (
                      <td
                        key={coord}
                        onClick={() => handleCellClick(coord)}
                        onDoubleClick={() => handleCellDoubleClick(coord)}
                        style={{
                          backgroundColor: isSelected ? '#eff6ff' : cell?.bg || undefined,
                          color: cell?.color || undefined,
                          fontWeight: cell?.bold ? 'bold' : 'normal',
                          fontStyle: cell?.italic ? 'italic' : 'normal',
                          textDecoration: cell?.underline ? 'underline' : 'none',
                          textAlign: cell?.align || 'left',
                        }}
                        className={`h-7 border border-zinc-200 px-2 py-1 text-xs truncate relative cursor-cell transition-colors font-mono ${
                          isSelected ? 'ring-2 ring-blue-600 z-10' : ''
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={commitInlineEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                commitInlineEdit();
                                // Move down
                                const nextRow = Math.min(row + 1, rowCount);
                                setSelectedCell(`${col}${nextRow}`);
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                commitInlineEdit();
                                // Move right
                                const colIdx = COLUMNS.indexOf(col);
                                if (colIdx < COLUMNS.length - 1) {
                                  setSelectedCell(`${COLUMNS[colIdx + 1]}${row}`);
                                }
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-full h-full bg-white text-zinc-900 px-1 border-none focus:outline-none text-xs font-mono"
                          />
                        ) : (
                          <span>{cell?.value || ''}</span>
                        )}

                        {/* Comment Indicator Badge */}
                        {hasCmt && (
                          <span
                            className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[5px] border-r-[5px] border-t-amber-500 border-r-amber-500"
                            title="Có bình luận tại ô này"
                          />
                        )}

                        {/* Visual pin on C12 for demo */}
                        {isSeedDemoSheet && coord === 'C12' && (
                          <span className="absolute bottom-0.5 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center font-bold">
                            💬
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Drawer: Contextual Comments on Sheet Cells */}
        {commentsDrawerOpen && (
          <aside className="w-88 sm:w-96 bg-white border-l border-zinc-200 flex flex-col h-full shadow-lg z-30 shrink-0 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  💬
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Bình Luận Ô Bảng Tính
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Đang chọn ô: <strong className="text-blue-600">{selectedCell}</strong>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCommentsDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form for Selected Cell */}
            <form onSubmit={handleAddCommentToCell} className="p-3 border-b border-zinc-200 space-y-2 bg-white shrink-0">
              <textarea
                rows={2}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Bình luận hoặc trao đổi về ô ${selectedCell}...`}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  Gắn trực tiếp vào ô {selectedCell}
                </span>
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-3 py-1 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Đăng</span>
                </button>
              </div>
            </form>

            {/* Comments List for Sheet */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {sheetComments.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                  <p className="font-semibold text-zinc-600">Chưa có bình luận nào</p>
                  <p className="text-[11px] mt-0.5">Chọn một ô bất kỳ và để lại câu hỏi thảo luận.</p>
                </div>
              ) : (
                sheetComments.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCell(c.cellCoord)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedCell === c.cellCoord
                        ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    } ${c.resolved ? 'opacity-60 bg-zinc-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: c.authorColor }}
                        >
                          {c.authorName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900">{c.authorName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                              Ô {c.cellCoord}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400">{c.authorRole}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleResolve(c.id);
                        }}
                        className={`p-1 rounded-lg text-xs cursor-pointer ${
                          c.resolved ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-emerald-600'
                        }`}
                        title={c.resolved ? 'Mở lại bình luận' : 'Đánh dấu đã giải quyết'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-800 mb-2 leading-relaxed">{c.content}</p>

                    {/* Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                        {c.replies.map((r) => (
                          <div key={r.id} className="p-2 bg-zinc-50 rounded-xl text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900">{r.authorName}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">Vừa xong</span>
                            </div>
                            <p className="text-zinc-700">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input toggle */}
                    {replyInputActive === c.id ? (
                      <div className="mt-2 pt-2 border-t border-zinc-100 flex gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={replyText[c.id] || ''}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddReply(c.id);
                          }}
                          placeholder="Trả lời bình luận..."
                          className="flex-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAddReply(c.id)}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Gửi
                        </button>
                      </div>
                    ) : null}

                    {/* Linked Kanban Task Badge */}
                    {c.assignedTask && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-900 flex items-center justify-between shadow-2xs">
                        <span className="flex items-center gap-1.5 font-bold">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Nhiệm vụ: @{c.assignedTask.assignee}</span>
                        </span>
                        <Link
                          href="/tasks"
                          className="px-2 py-0.5 rounded bg-blue-600 text-white font-semibold text-[10px] hover:bg-blue-700 transition-colors"
                        >
                          Mở Kanban ↗
                        </Link>
                      </div>
                    )}

                    <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-between">
                      {!c.assignedTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertCommentToTask(c);
                          }}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Chuyển bình luận này thành thẻ nhiệm vụ trên Kanban"
                        >
                          <CheckSquare className="w-3 h-3" />
                          <span>Giao Task</span>
                        </button>
                      )}

                      {replyInputActive !== c.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyInputActive(c.id);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer ml-auto"
                        >
                          Phản hồi...
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Sheet Tabs Bar */}
      <footer className="h-8 bg-zinc-100 border-t border-zinc-200 px-4 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1">
          {sheetTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1 rounded-t-lg font-semibold text-xs border-t border-x transition-colors cursor-pointer ${
                activeTabId === tab.id
                  ? 'bg-white text-emerald-800 border-zinc-200 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800 border-transparent hover:bg-zinc-200/50'
              }`}
            >
              {tab.name}
            </button>
          ))}
          <button
            onClick={() => {
              const newTabNum = sheetTabs.length + 1;
              setSheetTabs((prev) => [...prev, { id: `tab${newTabNum}`, name: `Trang tính ${newTabNum}` }]);
              showToast(`Đã thêm Trang tính ${newTabNum}`);
            }}
            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
            title="Thêm trang tính mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-3">
          <span>{rowCount} dòng × {COLUMNS.length} cột</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Sẵn sàng</span>
        </div>
      </footer>
    </div>
  );
}
