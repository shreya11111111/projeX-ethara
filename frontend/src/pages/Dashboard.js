import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/dashboard')
      .then(res => setStats(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats) return <div className="error-msg">Failed to load dashboard.</div>;

  return (
    <div className="overview">
      <h2 className="page-title">Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalProjects}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card stat-todo">
          <div className="stat-number">{stats.tasksByStatus.todo}</div>
          <div className="stat-label">Todo</div>
        </div>
        <div className="stat-card stat-progress">
          <div className="stat-number">{stats.tasksByStatus.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card stat-done">
          <div className="stat-number">{stats.tasksByStatus.done}</div>
          <div className="stat-label">Done</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>My Tasks</h3>
          {stats.myTasks.length === 0 ? (
            <p className="empty-text">No pending tasks assigned to you.</p>
          ) : (
            <div className="task-list-simple">
              {stats.myTasks.map(task => (
                <div key={task.id} className="task-item-simple">
                  <div className="task-info">
                    <span className="task-title">{task.title}</span>
                    <span className="task-project">{task.project_name}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>
                      {task.status}
                    </span>
                    <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="task-due">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h3>Overdue Tasks</h3>
          {stats.overdueTasks.length === 0 ? (
            <p className="empty-text">No overdue tasks.</p>
          ) : (
            <div className="task-list-simple">
              {stats.overdueTasks.map(task => (
                <div key={task.id} className="task-item-simple overdue">
                  <div className="task-info">
                    <span className="task-title">{task.title}</span>
                    <span className="task-project">{task.project_name}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>
                      {task.status}
                    </span>
                    {task.due_date && (
                      <span className="task-due overdue-date">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assigned_to_name && (
                      <span className="task-assignee">{task.assigned_to_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
