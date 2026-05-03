import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useUser } from '../context/AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', status: 'Todo', priority: 'Medium', assigned_to: '', due_date: ''
  });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'Member' });

  const isProjectAdmin = user?.role === 'Admin' ||
    members.some(m => m.id === user?.id && m.role === 'Admin');

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes, memberRes] = await Promise.all([
        apiClient.get(`/projects/${id}`),
        apiClient.get(`/tasks/project/${id}`),
        apiClient.get(`/projects/${id}/members`)
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
      setMembers(memberRes.data);
    } catch (err) {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await apiClient.put(`/tasks/${taskId}`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'Todo', priority: 'Medium', assigned_to: '', due_date: '' });
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : ''
    });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...taskForm,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null
      };
      if (editingTask) {
        await apiClient.put(`/tasks/${editingTask.id}`, payload);
      } else {
        await apiClient.post(`/tasks/project/${id}`, payload);
      }
      setShowTaskModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      console.error(err);
    }
  };

  const openAddMember = () => {
    setShowMemberModal(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/projects/${id}/members`, {
        userId: parseInt(memberForm.userId),
        role: memberForm.role
      });
      setShowMemberModal(false);
      setMemberForm({ userId: '', role: 'Member' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await apiClient.delete(`/projects/${id}/members/${userId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Loading project...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!project) return <div className="error-msg">Project not found.</div>;

  return (
    <div className="project-view">
      <div className="page-header">
        <div>
          <h2 className="page-title">{project.name}</h2>
          <p className="project-desc">{project.description}</p>
          <span className="project-owner-label">Owner: {project.owner_name}</span>
        </div>
        {isProjectAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={openCreateTask}>+ New Task</button>
            <button className="btn btn-danger" onClick={handleDeleteProject}>Delete Project</button>
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="section">
        <h3 className="section-title">Tasks ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p className="empty-text">No tasks yet.</p>
        ) : (
          <div className="task-table">
            <div className="task-table-header">
              <span>Title</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Assigned To</span>
              <span>Due Date</span>
              <span>Actions</span>
            </div>
            {tasks.map(task => (
              <div key={task.id} className="task-table-row">
                <span className="task-title-cell">{task.title}</span>
                <span>
                  <select
                    className={`status-select badge-${task.status.toLowerCase().replace(' ', '-')}`}
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </span>
                <span>
                  <span className={`badge badge-priority-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </span>
                <span>{task.assigned_to_name || 'Unassigned'}</span>
                <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
                <span className="task-actions">
                  {isProjectAdmin && (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditTask(task)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Members ({members.length})</h3>
          {isProjectAdmin && (
            <button className="btn btn-secondary" onClick={openAddMember}>+ Add Member</button>
          )}
        </div>
        <div className="members-table">
          <div className="members-table-header">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            {isProjectAdmin && <span>Actions</span>}
          </div>
          {members.map(member => (
            <div key={member.id} className="members-table-row">
              <span>{member.name}</span>
              <span>{member.email}</span>
              <span><span className={`badge badge-role-${member.role.toLowerCase()}`}>{member.role}</span></span>
              {isProjectAdmin && (
                <span>
                  {member.id !== project.owner_id && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveMember(member.id)}>Remove</button>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task' : 'Create Task'}</h3>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  placeholder="Task title"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To</label>
                  <select value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Member</h3>
              <button className="modal-close" onClick={() => setShowMemberModal(false)}>&times;</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>User ID</label>
                <input
                  type="number"
                  value={memberForm.userId}
                  onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                  required
                  placeholder="Enter user ID"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
