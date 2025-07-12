const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true // szt, kg, m, l, etc.
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0
  },
  minStock: {
    type: Number,
    required: true,
    default: 0
  },
  maxStock: {
    type: Number,
    required: true,
    default: 100
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 0
  },
  supplier: {
    name: String,
    contact: String,
    email: String,
    phone: String
  },
  location: {
    warehouse: String,
    shelf: String,
    bin: String
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

materialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for stock status
materialSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= this.minStock) return 'low';
  if (this.currentStock >= this.maxStock) return 'high';
  return 'normal';
});

module.exports = mongoose.model('Material', materialSchema);