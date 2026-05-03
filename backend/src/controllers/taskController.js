const pool = require('../config/db');

async function getTasksByProject(req, res) {
  try {
    const projectId = req.params.projectId;

    let query = `
      SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = ?
    `;
    let params = [projectId];

    if (req.user.role !== 'Admin') {
      const [membership] = await pool.query(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );

      if (membership.length > 0 && membership[0].role === 'Member') {
        query += ' AND t.assigned_to = ?';
        params.push(req.user.id);
      }
    }

    query += ' ORDER BY t.created_at DESC';

    const [tasks] = await pool.query(query, params);
    res.json(tasks);
  } catch (err) {
    console.error('GetTasks error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function createTask(req, res) {
  try {
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    const projectId = req.params.projectId;

    const [result] = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, title, description || '', status || 'Todo', priority || 'Medium',
       assigned_to || null, due_date || null, req.user.id]
    );

    const [task] = await pool.query(
      `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users c ON t.created_by = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json(task[0]);
  } catch (err) {
    console.error('CreateTask error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getTask(req, res) {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users c ON t.created_by = c.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json(tasks[0]);
  } catch (err) {
    console.error('GetTask error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function updateTask(req, res) {
  try {
    const { title, description, status, priority, assigned_to, due_date } = req.body;

    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const task = existing[0];

    if (req.user.role !== 'Admin') {
      const [membership] = await pool.query(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [task.project_id, req.user.id]
      );

      if (membership.length > 0 && membership[0].role === 'Member') {
        if (task.assigned_to !== req.user.id) {
          return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
        }
        await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status || task.status, req.params.id]);
        const [updated] = await pool.query(
          `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
           FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN users c ON t.created_by = c.id WHERE t.id = ?`,
          [req.params.id]
        );
        return res.json(updated[0]);
      }
    }

    await pool.query(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?,
       assigned_to = ?, due_date = ? WHERE id = ?`,
      [title || task.title, description !== undefined ? description : task.description,
       status || task.status, priority || task.priority,
       assigned_to !== undefined ? assigned_to : task.assigned_to,
       due_date !== undefined ? due_date : task.due_date,
       req.params.id]
    );

    const [updated] = await pool.query(
      `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
       FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users c ON t.created_by = c.id WHERE t.id = ?`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error('UpdateTask error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function deleteTask(req, res) {
  try {
    const [existing] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('DeleteTask error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getTasksByProject, createTask, getTask, updateTask, deleteTask };
