const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, isProjectMember, isProjectAdmin } = require('../middleware/auth');
const {
  getProjects, getProject, createProject, updateProject, deleteProject,
  addMember, removeMember, getMembers
} = require('../controllers/projectController');

const router = express.Router();

router.use(verifyToken);

router.get('/', getProjects);

router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required.')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
}, createProject);

router.get('/:id', isProjectMember, getProject);
router.put('/:id', isProjectAdmin, updateProject);
router.delete('/:id', isProjectAdmin, deleteProject);

router.get('/:id/members', isProjectMember, getMembers);
router.post('/:id/members', isProjectAdmin, addMember);
router.delete('/:id/members/:userId', isProjectAdmin, removeMember);

module.exports = router;
