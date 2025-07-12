const express = require('express');
const Task = require('../models/Task');
const { auth, checkPermission } = require('../middleware/auth');
const { taskValidation } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get tasks
router.get('/', checkPermission('tasks', 'view'), async (req, res) => {
  try {
    const { 
      status, 
      type, 
      priority, 
      assignedTo, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    // Apply filters based on user role
    if (req.user.role === 'technician') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'operator') {
      filter.createdBy = req.user._id;
    }

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('materials.material', 'name unit')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania zadań' });
  }
});

// Get single task
router.get('/:id', checkPermission('tasks', 'view'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('materials.material', 'name unit unitPrice');

    if (!task) {
      return res.status(404).json({ error: 'Zadanie nie istnieje' });
    }

    // Check if user can view this task
    if (req.user.role === 'technician' && task.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do tego zadania' });
    }

    if (req.user.role === 'operator' && task.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do tego zadania' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania zadania' });
  }
});

// Create task
router.post('/', checkPermission('tasks', 'create'), taskValidation, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id
    };

    const task = new Task(taskData);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('materials.material', 'name unit');

    res.status(201).json({
      message: 'Zadanie zostało utworzone',
      task: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Błąd podczas tworzenia zadania' });
  }
});

// Update task
router.put('/:id', checkPermission('tasks', 'edit'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Zadanie nie istnieje' });
    }

    // Check permissions
    if (req.user.role === 'technician' && task.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do edycji tego zadania' });
    }

    // Handle status changes
    if (req.body.status === 'zakończone' && !task.completedAt) {
      req.body.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('materials.material', 'name unit');

    res.json({
      message: 'Zadanie zostało zaktualizowane',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji zadania' });
  }
});

// Delete task
router.delete('/:id', checkPermission('tasks', 'delete'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Zadanie nie istnieje' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zadanie zostało usunięte' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania zadania' });
  }
});

// Assign task
router.post('/:id/assign', checkPermission('tasks', 'assign'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'w_trakcie' },
      { new: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!task) {
      return res.status(404).json({ error: 'Zadanie nie istnieje' });
    }

    res.json({
      message: 'Zadanie zostało przypisane',
      task
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Błąd podczas przypisywania zadania' });
  }
});

module.exports = router;