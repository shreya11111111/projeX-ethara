const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

async function isProjectMember(req, res, next) {
  try {
    const projectId = req.params.id || req.params.projectId;
    if (!projectId) return res.status(400).json({ message: 'Project ID required.' });

    if (req.user.role === 'Admin') return next();

    const [rows] = await pool.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this project.' });
    }

    req.projectRole = rows[0].role;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

async function isProjectAdmin(req, res, next) {
  try {
    const projectId = req.params.id || req.params.projectId;
    if (!projectId) return res.status(400).json({ message: 'Project ID required.' });

    if (req.user.role === 'Admin') return next();

    const [rows] = await pool.query(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?',
      [projectId, req.user.id, 'Admin']
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'Project admin access required.' });
    }

    req.projectRole = 'Admin';
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { verifyToken, isAdmin, isProjectMember, isProjectAdmin };
