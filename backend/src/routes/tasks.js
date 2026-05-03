const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, isProjectMember, isProjectAdmin } = require('../middleware/auth');
const {
  getTasksByProject, createTask, getTask, updateTask, deleteTask
} = require('../controllers/taskController');

const router = express.Router();

router.use(verifyToken);

router.get('/project/:projectId', isProjectMember, getTasksByProject);

router.post('/project/:projectId', isProjectAdmin, [
  body('title').trim().notEmpty().withMessage('Task title is required.')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
}, createTask);

router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
