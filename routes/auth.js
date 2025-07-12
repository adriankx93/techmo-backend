const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, password, firstName, lastName, department, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      department,
      phone,
      status: 'pending'
    });

    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      message: 'Konto zostało utworzone. Oczekuje na akceptację administratora.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Błąd podczas rejestracji' });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    // Check if account is active
    if (user.status !== 'active') {
      let message = 'Konto nieaktywne';
      if (user.status === 'pending') {
        message = 'Konto oczekuje na akceptację administratora';
      } else if (user.status === 'suspended') {
        message = 'Konto zostało zawieszone';
      } else if (user.status === 'rejected') {
        message = 'Konto zostało odrzucone';
      }
      return res.status(401).json({ error: message });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Błąd podczas logowania' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('assignedTechnician', 'firstName lastName email');

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        phone: user.phone,
        assignedTechnician: user.assignedTechnician,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania danych użytkownika' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie istnieje' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(user, resetToken);
      res.json({ message: 'Link do resetowania hasła został wysłany na email' });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      res.status(500).json({ error: 'Błąd podczas wysyłania emaila' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Błąd podczas resetowania hasła' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token i hasło są wymagane' });
    }

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token nieprawidłowy lub wygasł' });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ message: 'Hasło zostało zresetowane pomyślnie' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Błąd podczas resetowania hasła' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Obecne i nowe hasło są wymagane' });
    }

    const user = await User.findById(req.user._id);
    
    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Obecne hasło jest nieprawidłowe' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Hasło zostało zmienione pomyślnie' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Błąd podczas zmiany hasła' });
  }
});

module.exports = router;