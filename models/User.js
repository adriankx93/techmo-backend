const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'technician', 'operator'],
    default: 'operator'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'rejected'],
    default: 'pending'
  },
  permissions: {
    tasks: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      assign: { type: Boolean, default: false }
    },
    defects: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    materials: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    users: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false }
    }
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  department: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update updatedAt field
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = {
          tasks: { view: true, create: true, edit: true, delete: true, assign: true },
          defects: { view: true, create: true, edit: true, delete: true },
          materials: { view: true, create: true, edit: true, delete: true },
          users: { view: true, create: true, edit: true, delete: true },
          reports: { view: true, create: true }
        };
        break;
      case 'manager':
        this.permissions = {
          tasks: { view: true, create: true, edit: true, delete: false, assign: true },
          defects: { view: true, create: true, edit: true, delete: false },
          materials: { view: true, create: true, edit: true, delete: false },
          users: { view: true, create: false, edit: false, delete: false },
          reports: { view: true, create: true }
        };
        break;
      case 'technician':
        this.permissions = {
          tasks: { view: true, create: true, edit: true, delete: false, assign: false },
          defects: { view: true, create: true, edit: true, delete: false },
          materials: { view: true, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
          reports: { view: true, create: false }
        };
        break;
      case 'operator':
        this.permissions = {
          tasks: { view: true, create: false, edit: false, delete: false, assign: false },
          defects: { view: true, create: true, edit: false, delete: false },
          materials: { view: true, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false },
          reports: { view: false, create: false }
        };
        break;
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);