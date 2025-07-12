const express = require('express');
const Defect = require('../models/Defect');
const { auth, checkPermission } = require('../middleware/auth');
const { defectValidation } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get defects
router.get('/', checkPermission('defects', 'view'), async (req, res) => {
  try {
    const { 
      status, 
      category, 
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
      filter.reportedBy = req.user._id;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
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

    const defects = await Defect.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('materials.material', 'name unit')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Defect.countDocuments(filter);

    res.json({
      defects,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get defects error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania usterek' });
  }
});

// Get single defect
router.get('/:id', checkPermission('defects', 'view'), async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id)
      .populate('reportedBy', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('materials.material', 'name unit unitPrice');

    if (!defect) {
      return res.status(404).json({ error: 'Usterka nie istnieje' });
    }

    // Check if user can view this defect
    if (req.user.role === 'technician' && defect.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do tej usterki' });
    }

    if (req.user.role === 'operator' && defect.reportedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do tej usterki' });
    }

    res.json({ defect });
  } catch (error) {
    console.error('Get defect error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania usterki' });
  }
});

// Create defect
router.post('/', checkPermission('defects', 'create'), defectValidation, async (req, res) => {
  try {
    const defectData = {
      ...req.body,
      reportedBy: req.user._id
    };

    const defect = new Defect(defectData);
    await defect.save();

    const populatedDefect = await Defect.findById(defect._id)
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('materials.material', 'name unit');

    res.status(201).json({
      message: 'Usterka zostało zgłoszona',
      defect: populatedDefect
    });
  } catch (error) {
    console.error('Create defect error:', error);
    res.status(500).json({ error: 'Błąd podczas zgłaszania usterki' });
  }
});

// Update defect
router.put('/:id', checkPermission('defects', 'edit'), async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) {
      return res.status(404).json({ error: 'Usterka nie istnieje' });
    }

    // Check permissions
    if (req.user.role === 'technician' && defect.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Brak uprawnień do edycji tej usterki' });
    }

    // Handle status changes
    if (req.body.status === 'usunięta' && !defect.completedAt) {
      req.body.completedAt = new Date();
    }

    const updatedDefect = await Defect.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('materials.material', 'name unit');

    res.json({
      message: 'Usterka została zaktualizowana',
      defect: updatedDefect
    });
  } catch (error) {
    console.error('Update defect error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji usterki' });
  }
});

// Delete defect
router.delete('/:id', checkPermission('defects', 'delete'), async (req, res) => {
  try {
    const defect = await Defect.findById(req.params.id);
    if (!defect) {
      return res.status(404).json({ error: 'Usterka nie istnieje' });
    }

    await Defect.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usterka została usunięta' });
  } catch (error) {
    console.error('Delete defect error:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania usterki' });
  }
});

module.exports = router;