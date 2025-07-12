const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');
const Defect = require('../models/Defect');
const Material = require('../models/Material');
const { auth, isAdmin } = require('../middleware/auth');
const { sendAccountApprovedEmail, sendAccountRejectedEmail } = require('../utils/email');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth, isAdmin);

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalDefects,
      openDefects,
      totalMaterials,
      lowStockMaterials
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'active' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'zakończone' }),
      Task.countDocuments({ status: { $in: ['nowe', 'w_trakcie'] } }),
      Defect.countDocuments(),
      Defect.countDocuments({ status: { $in: ['zgłoszona', 'w_trakcie'] } }),
      Material.countDocuments({ isActive: true }),
      Material.countDocuments({ 
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minStock'] }
      })
    ]);

    // Recent activities
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    const recentDefects = await Defect.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reportedBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    res.json({
      statistics: {
        users: {
          total: totalUsers,
          pending: pendingUsers,
          active: activeUsers
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks
        },
        defects: {
          total: totalDefects,
          open: openDefects
        },
        materials: {
          total: totalMaterials,
          lowStock: lowStockMaterials
        }
      },
      recentActivities: {
        tasks: recentTasks,
        defects: recentDefects
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania danych dashboard' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('assignedTechnician', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania użytkowników' });
  }
});

// Get pending users
router.get('/users/pending', async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users: pendingUsers });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania oczekujących użytkowników' });
  }
});

// Approve user
router.post('/users/:id/approve', async (req, res) => {
  try {
    const { role, assignedTechnician, permissions } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({ error: 'Użytkownik nie oczekuje na akceptację' });
    }

    // Update user
    user.status = 'active';
    if (role) user.role = role;
    if (assignedTechnician) user.assignedTechnician = assignedTechnician;
    if (permissions) user.permissions = { ...user.permissions, ...permissions };

    await user.save();

    // Send approval email
    try {
      await sendAccountApprovedEmail(user);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({
      message: 'Użytkownik został zatwierdzony',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Błąd podczas zatwierdzania użytkownika' });
  }
});

// Reject user
router.post('/users/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({ error: 'Użytkownik nie oczekuje na akceptację' });
    }

    user.status = 'rejected';
    await user.save();

    // Send rejection email
    try {
      await sendAccountRejectedEmail(user, reason);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ message: 'Użytkownik został odrzucony' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Błąd podczas odrzucania użytkownika' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { role, status, permissions, assignedTechnician, department } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    // Update fields
    if (role) user.role = role;
    if (status) user.status = status;
    if (permissions) user.permissions = { ...user.permissions, ...permissions };
    if (assignedTechnician !== undefined) user.assignedTechnician = assignedTechnician;
    if (department) user.department = department;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('assignedTechnician', 'firstName lastName email');

    res.json({
      message: 'Użytkownik został zaktualizowany',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji użytkownika' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    // Check if user has assigned tasks or defects
    const [assignedTasks, assignedDefects] = await Promise.all([
      Task.countDocuments({ assignedTo: user._id }),
      Defect.countDocuments({ assignedTo: user._id })
    ]);

    if (assignedTasks > 0 || assignedDefects > 0) {
      return res.status(400).json({ 
        error: 'Nie można usunąć użytkownika z przypisanymi zadaniami lub usterkami' 
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Użytkownik został usunięty' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania użytkownika' });
  }
});

// Get technicians for assignment
router.get('/technicians', async (req, res) => {
  try {
    const technicians = await User.find({
      role: { $in: ['technician', 'manager'] },
      status: 'active'
    }).select('firstName lastName email role');

    res.json({ technicians });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania techników' });
  }
});

// System settings
router.get('/settings', async (req, res) => {
  try {
    // This would typically come from a settings collection
    const settings = {
      emailNotifications: true,
      autoAssignTasks: false,
      maintenanceMode: false,
      maxFileSize: 10, // MB
      allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
      taskAutoClose: 30, // days
      defectAutoEscalate: 7 // days
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania ustawień' });
  }
});

// Update system settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Here you would save to a settings collection
    // For now, just return the updated settings
    
    res.json({ 
      message: 'Ustawienia zostały zaktualizowane',
      settings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji ustawień' });
  }
});

// System logs (simplified)
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    
    // This would typically come from a logs collection
    const logs = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'User logged in',
        userId: req.user._id,
        ip: req.ip
      }
    ];

    res.json({
      logs,
      pagination: {
        current: page,
        pages: 1,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania logów' });
  }
});

module.exports = router;