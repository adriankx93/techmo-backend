const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['dzienna', 'nocna', 'tygodniowa', 'miesięczna', 'awaryjna'],
    required: true
  },
  priority: {
    type: String,
    enum: ['niski', 'średni', 'wysoki', 'krytyczny'],
    default: 'średni'
  },
  status: {
    type: String,
    enum: ['nowe', 'w_trakcie', 'zakończone', 'anulowane'],
    default: 'nowe'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  actualDuration: {
    type: Number // in minutes
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  materials: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material'
    },
    quantity: {
      type: Number,
      required: true
    },
    used: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', taskSchema);