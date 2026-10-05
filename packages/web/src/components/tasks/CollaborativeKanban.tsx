'use client';

import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProjectModal } from './ProjectModal';
import { SprintModal } from './SprintModal';
import { BurndownChartModal } from './BurndownChartModal';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskHeaderToolbar } from './TaskHeaderToolbar';
import { KanbanBoardView } from './KanbanBoardView';
import { TaskListView } from './TaskListView';
import { TaskCalendarView } from './TaskCalendarView';
import { TaskGanttView } from './TaskGanttView';
import { TaskMetricsView } from './TaskMetricsView';
import { CreateTaskModal } from './CreateTaskModal';
import { useKanbanState } from './useKanbanState';

interface CollaborativeKanbanProps {
  currentUser?: { id: string; name: string; color: string };
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8080/api`
    : 'http://localhost:8080/api');

export function CollaborativeKanban({
  currentUser,
}: CollaborativeKanbanProps) {
  const { user: authUser, workspace, token } = useAuth();
  const effectiveUser = useMemo(() => {
    if (authUser) {
      return { id: authUser.userId, name: authUser.name, color: '#3b82f6' };
    }
    if (currentUser && currentUser.id) {
      return currentUser;
    }
    return { id: '', name: 'Guest', color: '#94a3b8' };
  }, [authUser, currentUser]);

  const k = useKanbanState({ effectiveUser, workspace, token });

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 min-h-screen font-sans text-zinc-900 selection:bg-blue-100 selection:text-blue-900">
      <TaskHeaderToolbar
        onlineUsers={k.onlineUsers}
        projects={k.projects}
        sprints={k.sprints}
        selectedProjectId={k.selectedProjectId}
        setSelectedProjectId={k.setSelectedProjectId}
        selectedSprintId={k.selectedSprintId}
        setSelectedSprintId={k.setSelectedSprintId}
        setIsProjectModalOpen={k.setIsProjectModalOpen}
        setIsSprintModalOpen={k.setIsSprintModalOpen}
        currentSprintForBurndown={k.currentSprintForBurndown}
        setSelectedBurndownSprint={k.setSelectedBurndownSprint}
        handleExportCSV={k.handleExportCSV}
        openCreateModal={k.openCreateModal}
        stats={k.stats}
        searchQuery={k.searchQuery}
        setSearchQuery={k.setSearchQuery}
        filterColumn={k.filterColumn}
        setFilterColumn={k.setFilterColumn}
        filterPriority={k.filterPriority}
        setFilterPriority={k.setFilterPriority}
        filterAssignee={k.filterAssignee}
        setFilterAssignee={k.setFilterAssignee}
        availableUsers={k.availableUsers}
        viewMode={k.viewMode}
        setViewMode={k.setViewMode}
        handleTriggerScanOverdue={k.handleTriggerScanOverdue}
        autoNotifyDone={k.autoNotifyDone}
        setAutoNotifyDone={k.setAutoNotifyDone}
        automationToast={k.automationToast}
        exportToast={k.exportToast}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 overflow-x-auto">
        {k.viewMode === 'board' && (
          <KanbanBoardView
            filteredTasks={k.filteredTasks}
            todayStr={k.todayStr}
            openCreateModal={k.openCreateModal}
            openEditModal={k.openEditModal}
            setSelectedDetailTask={k.setSelectedDetailTask}
            handleDeleteTask={k.handleDeleteTask}
            handleMoveColumn={k.handleMoveColumn}
            handleToggleChecklist={k.handleToggleChecklist}
            getDependencyTask={k.getDependencyTask}
          />
        )}

        {k.viewMode === 'list' && (
          <TaskListView
            filteredTasks={k.filteredTasks}
            todayStr={k.todayStr}
            openEditModal={k.openEditModal}
            handleDeleteTask={k.handleDeleteTask}
            handleMoveColumn={k.handleMoveColumn}
            getDependencyTask={k.getDependencyTask}
          />
        )}

        {k.viewMode === 'calendar' && (
          <TaskCalendarView
            monthLabel={k.monthLabel}
            calendarDate={k.calendarDate}
            setCalendarDate={k.setCalendarDate}
            calendarDays={k.calendarDays}
            tasks={k.tasks}
            openCreateModal={k.openCreateModal}
            openEditModal={k.openEditModal}
          />
        )}

        {k.viewMode === 'gantt' && (
          <TaskGanttView
            ganttDays={k.ganttDays}
            filteredTasks={k.filteredTasks}
            getDependencyTask={k.getDependencyTask}
            openEditModal={k.openEditModal}
          />
        )}

        {k.viewMode === 'metrics' && (
          <TaskMetricsView
            stats={k.stats}
            tasks={k.tasks}
            availableUsers={k.availableUsers}
            openEditModal={k.openEditModal}
          />
        )}
      </main>

      {/* Modal Create / Edit Task */}
      <CreateTaskModal
        isOpen={k.isCreateModalOpen}
        onClose={() => k.setIsCreateModalOpen(false)}
        editingTask={k.editingTask}
        createTaskError={k.createTaskError}
        handleSaveTask={k.handleSaveTask}
        projects={k.projects}
        sprints={k.sprints}
        formProjectId={k.formProjectId}
        setFormProjectId={k.setFormProjectId}
        formSprintId={k.formSprintId}
        setFormSprintId={k.setFormSprintId}
        formTitle={k.formTitle}
        setFormTitle={k.setFormTitle}
        formDescription={k.formDescription}
        setFormDescription={k.setFormDescription}
        formColumn={k.formColumn}
        setFormColumn={k.setFormColumn}
        formPriority={k.formPriority}
        setFormPriority={k.setFormPriority}
        formStoryPoints={k.formStoryPoints}
        setFormStoryPoints={k.setFormStoryPoints}
        formBlockedReason={k.formBlockedReason}
        setFormBlockedReason={k.setFormBlockedReason}
        formAssigneeId={k.formAssigneeId}
        setFormAssigneeId={k.setFormAssigneeId}
        availableUsers={k.availableUsers}
        formDependsOnTaskId={k.formDependsOnTaskId}
        setFormDependsOnTaskId={k.setFormDependsOnTaskId}
        tasks={k.tasks}
        formStartDate={k.formStartDate}
        setFormStartDate={k.setFormStartDate}
        formDueDate={k.formDueDate}
        setFormDueDate={k.setFormDueDate}
        formEstimatedHours={k.formEstimatedHours}
        setFormEstimatedHours={k.setFormEstimatedHours}
        formLoggedHours={k.formLoggedHours}
        setFormLoggedHours={k.setFormLoggedHours}
        formLabels={k.formLabels}
        setFormLabels={k.setFormLabels}
        formChecklist={k.formChecklist}
        setFormChecklist={k.setFormChecklist}
      />

      {/* Task Detail Modal */}
      {k.selectedDetailTask && (
        <TaskDetailModal
          task={k.selectedDetailTask}
          allTasks={k.tasks}
          projects={k.projects}
          sprints={k.sprints}
          workspaceMembers={k.workspaceMembers}
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          currentUserId={effectiveUser.id}
          currentUserName={effectiveUser.name}
          onClose={() => k.setSelectedDetailTask(null)}
          onTaskUpdated={(updatedTask) => {
            k.setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
            k.setSelectedDetailTask(updatedTask);
          }}
          onTaskDeleted={(taskId) => {
            k.setTasks((prev) => prev.filter((t) => t.id !== taskId));
            k.setSelectedDetailTask(null);
          }}
        />
      )}

      {/* Project Management Modal */}
      {k.isProjectModalOpen && (
        <ProjectModal
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          currentUserRole={workspace?.role}
          projects={k.projects}
          onProjectCreated={(newProj) => {
            k.setProjects((prev) => [newProj, ...prev]);
            k.setSelectedProjectId(newProj.id);
          }}
          onProjectUpdated={(updatedProj) => {
            k.setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
          }}
          onClose={() => k.setIsProjectModalOpen(false)}
        />
      )}

      {/* Sprint Planning Modal */}
      {k.isSprintModalOpen && (
        <SprintModal
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          projects={k.projects}
          activeProjectId={k.selectedProjectId}
          sprints={k.sprints}
          onSprintCreated={(newSprint) => {
            k.setSprints((prev) => [newSprint, ...prev]);
            k.setSelectedSprintId(newSprint.id);
          }}
          onSprintUpdated={(updatedSprint) => {
            k.setSprints((prev) => prev.map((s) => (s.id === updatedSprint.id ? updatedSprint : s)));
          }}
          onViewBurndown={(sprint) => {
            k.setIsSprintModalOpen(false);
            k.setSelectedBurndownSprint(sprint);
          }}
          onClose={() => k.setIsSprintModalOpen(false)}
        />
      )}

      {/* Burndown Chart Modal */}
      {k.selectedBurndownSprint && (
        <BurndownChartModal
          sprint={k.selectedBurndownSprint}
          apiBase={API_BASE}
          token={token}
          orgId={workspace?.orgId || 'org_main'}
          onClose={() => k.setSelectedBurndownSprint(null)}
        />
      )}
    </div>
  );
}
