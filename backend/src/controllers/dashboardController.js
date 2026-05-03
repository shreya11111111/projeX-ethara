const pool = require('../config/db');

async function getDashboard(req, res) {
  try {
    const userId = req.user.id;
    const isGlobalAdmin = req.user.role === 'Admin';

    let projectFilter = '';
    let projectParams = [];

    if (!isGlobalAdmin) {
      projectFilter = 'AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)';
      projectParams = [userId];
    }

    const [todoCount] = await pool.query(
      `SELECT COUNT(*) as count FROM tasks t WHERE t.status = 'Todo' ${projectFilter}`,
      projectParams
    );
    const [inProgressCount] = await pool.query(
      `SELECT COUNT(*) as count FROM tasks t WHERE t.status = 'In Progress' ${projectFilter}`,
      projectParams
    );
    const [doneCount] = await pool.query(
      `SELECT COUNT(*) as count FROM tasks t WHERE t.status = 'Done' ${projectFilter}`,
      projectParams
    );

    const [overdueTasks] = await pool.query(
      `SELECT t.*, u.name as assigned_to_name, p.name as project_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       JOIN projects p ON t.project_id = p.id
       WHERE t.due_date < CURDATE() AND t.status != 'Done' ${projectFilter}
       ORDER BY t.due_date ASC`,
      projectParams
    );

    const [myTasks] = await pool.query(
      `SELECT t.*, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_to = ? AND t.status != 'Done'
       ORDER BY t.due_date ASC`,
      [userId]
    );

    let totalProjects;
    if (isGlobalAdmin) {
      const [count] = await pool.query('SELECT COUNT(*) as count FROM projects');
      totalProjects = count[0].count;
    } else {
      const [count] = await pool.query(
        'SELECT COUNT(*) as count FROM project_members WHERE user_id = ?',
        [userId]
      );
      totalProjects = count[0].count;
    }

    let totalMembers;
    if (isGlobalAdmin) {
      const [count] = await pool.query('SELECT COUNT(*) as count FROM users');
      totalMembers = count[0].count;
    } else {
      const [count] = await pool.query(
        `SELECT COUNT(DISTINCT pm2.user_id) as count
         FROM project_members pm1
         JOIN project_members pm2 ON pm1.project_id = pm2.project_id
         WHERE pm1.user_id = ?`,
        [userId]
      );
      totalMembers = count[0].count;
    }

    res.json({
      tasksByStatus: {
        todo: todoCount[0].count,
        inProgress: inProgressCount[0].count,
        done: doneCount[0].count
      },
      overdueTasks,
      myTasks,
      totalProjects,
      totalMembers
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getDashboard };
