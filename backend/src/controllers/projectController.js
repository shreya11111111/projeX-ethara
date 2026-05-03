const pool = require('../config/db');

async function getProjects(req, res) {
  try {
    let query;
    let params = [];

    if (req.user.role === 'Admin') {
      query = `
        SELECT p.*, u.name as owner_name,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        ORDER BY p.created_at DESC
      `;
    } else {
      query = `
        SELECT p.*, u.name as owner_name,
          (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    }

    const [projects] = await pool.query(query, params);
    res.json(projects);
  } catch (err) {
    console.error('GetProjects error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getProject(req, res) {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, u.name as owner_name
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(projects[0]);
  } catch (err) {
    console.error('GetProject error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function createProject(req, res) {
  try {
    const { name, description } = req.body;

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, req.user.id, 'Admin']
    );

    const [project] = await pool.query(
      `SELECT p.*, u.name as owner_name
       FROM projects p JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json(project[0]);
  } catch (err) {
    console.error('CreateProject error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function updateProject(req, res) {
  try {
    const { name, description } = req.body;

    await pool.query(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );

    const [project] = await pool.query(
      `SELECT p.*, u.name as owner_name
       FROM projects p JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    res.json(project[0]);
  } catch (err) {
    console.error('UpdateProject error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function deleteProject(req, res) {
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error('DeleteProject error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function addMember(req, res) {
  try {
    const { userId, role } = req.body;
    const projectId = req.params.id;

    const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User is already a member.' });
    }

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, userId, role || 'Member']
    );

    res.status(201).json({ message: 'Member added.', user: users[0] });
  } catch (err) {
    console.error('AddMember error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function removeMember(req, res) {
  try {
    const { id: projectId, userId } = req.params;

    const [project] = await pool.query('SELECT owner_id FROM projects WHERE id = ?', [projectId]);
    if (project.length > 0 && project[0].owner_id === parseInt(userId)) {
      return res.status(400).json({ message: 'Cannot remove the project owner.' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );

    res.json({ message: 'Member removed.' });
  } catch (err) {
    console.error('RemoveMember error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getMembers(req, res) {
  try {
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY pm.role DESC, u.name ASC`,
      [req.params.id]
    );

    res.json(members);
  } catch (err) {
    console.error('GetMembers error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, removeMember, getMembers
};
