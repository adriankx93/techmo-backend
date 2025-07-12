const mongoose = require('mongoose');

const defectSchema = new mongoose.Schema({
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
  location: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['niski', 'średni', 'wysoki', 'krytyczny'],
    default: 'średni'
  },
  status: {
    type: String,
    enum: ['zgłoszona', 'w_trakcie', 'usunięta', 'odrzucona'],
    default: 'zgłoszona'
  },
  category: {
    type: String,
    enum: ['mechaniczna', 'elektryczna', 'hydrauliczna', 'pneumatyczna', 'inne'],
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  estimatedRepairTime: {
    type: Number, // in hours
    default: 1
  },
  actualRepairTime: {
    type: Number // in hours
  },
  repairDate: {
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
    cost: {
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

defectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Defect', defectSchema);