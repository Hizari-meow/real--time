import { KanbanTask, COLUMNS } from './types';
import { emitDomainEvent } from '../../lib/domain-event-bus';

/**
 * Calculates summary metrics and SLA status across tasks
 */
export function calculateKanbanStats(tasks: KanbanTask[], todayStr: string) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.column === 'done').length;
  const inProgress = tasks.filter((t) => t.column === 'in_progress').length;
  const blocked = tasks.filter((t) => t.column === 'blocked').length;
  const review = tasks.filter((t) => t.column === 'review').length;
  const todo = tasks.filter((t) => t.column === 'todo').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const overdueCount = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.column !== 'done'
  ).length;

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

  return {
    total,
    done,
    inProgress,
    blocked,
    review,
    todo,
    percent,
    overdueCount,
    totalEstimated,
    totalLogged,
  };
}

/**
 * Computes calendar month grid days with padding for Monday-first weeks
 */
export function generateCalendarDays(calendarDate: Date, todayStr: string) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday as first day of week: offset calculation
  const offset = (firstDay + 6) % 7;

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Prev month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = offset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, d);
    days.push({
      dateStr: prevDate.toISOString().slice(0, 10),
      dayNum: d,
      isCurrentMonth: false,
      isToday: prevDate.toISOString().slice(0, 10) === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr: currDateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: currDateStr === todayStr,
    });
  }

  // Trailing next month padding to reach multiple of 7 (up to 35 or 42)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: nextDate.toISOString().slice(0, 10),
        dayNum: d,
        isCurrentMonth: false,
        isToday: nextDate.toISOString().slice(0, 10) === todayStr,
      });
    }
  }

  const monthLabel = `Tháng ${month + 1}, ${year}`;
  return { calendarDays: days, monthLabel };
}

/**
 * Computes the Gantt timeline range based on tasks min/max dates
 */
export function generateGanttDays(tasks: KanbanTask[], todayStr: string) {
  const allDates: string[] = [];
  tasks.forEach((t) => {
    if (t.startDate) allDates.push(t.startDate);
    if (t.dueDate) allDates.push(t.dueDate);
  });
  allDates.push(todayStr);
  allDates.sort();

  const minDate = new Date(allDates[0]);
  minDate.setDate(minDate.getDate() - 2);
  const maxDate = new Date(allDates[allDates.length - 1]);
  maxDate.setDate(maxDate.getDate() + 4);

  const days: { dateStr: string; label: string; isToday: boolean; dayName: string }[] = [];
  const curr = new Date(minDate);
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  while (curr <= maxDate) {
    const dStr = curr.toISOString().slice(0, 10);
    days.push({
      dateStr: dStr,
      label: `${curr.getDate()}/${curr.getMonth() + 1}`,
      isToday: dStr === todayStr,
      dayName: dayNames[curr.getDay()],
    });
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

/**
 * Generates and triggers download of CSV task export
 */
export function exportTasksToCSV(tasks: KanbanTask[], todayStr: string) {
  const headers = [
    'Mã công việc',
    'Tiêu đề',
    'Mô tả',
    'Giai đoạn',
    'Mức ưu tiên',
    'Người phụ trách',
    'Ngày bắt đầu',
    'Hạn hoàn thành',
    'Phụ thuộc công việc',
    'Lý do bị chặn',
    'Giờ dự kiến (h)',
    'Giờ đã làm (h)',
    'Tiến độ checklist (%)',
    'Nhãn',
    'Ngày tạo',
  ];

  const rows = tasks.map((t) => {
    const checklistTotal = t.checklist?.length || 0;
    const checklistDone = t.checklist?.filter((c) => c.completed).length || 0;
    const progressPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
    const depTask = tasks.find((d) => d.id === t.dependsOnTaskId);

    return [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${COLUMNS.find((c) => c.id === t.column)?.label || t.column}"`,
      `"${t.priority}"`,
      `"${t.assigneeName || ''}"`,
      `"${t.startDate || ''}"`,
      `"${t.dueDate || ''}"`,
      `"${depTask ? depTask.title.replace(/"/g, '""') : t.dependsOnTaskId || ''}"`,
      `"${(t.blockedReason || '').replace(/"/g, '""')}"`,
      `"${t.estimatedHours || 0}"`,
      `"${t.loggedHours || 0}"`,
      `"${progressPct}%"`,
      `"${(t.labels || []).join(', ')}"`,
      `"${new Date(t.createdAt).toLocaleDateString('vi-VN')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `bao-cao-cong-viec-${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Scans for overdue tasks and emits SLA domain events
 */
export function scanAndEmitOverdueTasks(
  tasks: KanbanTask[],
  todayStr: string,
  isManual = false,
  setAutomationToast?: (toast: { id: string; title: string } | null) => void
) {
  const overdueList = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.column !== 'done'
  );
  if (overdueList.length === 0) {
    if (isManual && setAutomationToast) {
      setAutomationToast({
        id: 'scan_ok',
        title: 'Tiến độ hoàn hảo! Hiện không có công việc nào bị quá hạn SLA.',
      });
      setTimeout(() => setAutomationToast(null), 3500);
    }
    return;
  }

  let emittedCount = 0;
  overdueList.forEach((task) => {
    const overdueDays = Math.max(
      1,
      Math.floor((Date.now() - new Date(task.dueDate!).getTime()) / 86400000)
    );
    try {
      emitDomainEvent('task.overdue', {
        task,
        status: task.column,
        priority: task.priority,
        overdueDays,
      });
      emittedCount++;
    } catch (err) {
      console.warn('Failed to emit task.overdue', err);
    }
  });

  if (emittedCount > 0 && setAutomationToast) {
    setAutomationToast({
      id: 'scan_alert',
      title: `Đã tự động kích hoạt cảnh báo SLA và thông báo cho ${emittedCount} nhiệm vụ quá hạn!`,
    });
    setTimeout(() => setAutomationToast(null), 4500);
  }
}

export function parseLabels(labelsStr: string): string[] {
  return labelsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseChecklist(
  checklistStr: string
): { id: string; text: string; completed: boolean }[] {
  return checklistStr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: 'chk_' + idx + '_' + Math.random().toString(36).substring(2, 6),
      text,
      completed: false,
    }));
}


