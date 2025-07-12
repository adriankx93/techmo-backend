const express = require('express');
const Material = require('../models/Material');
const { auth, checkPermission } = require('../middleware/auth');
const { materialValidation } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get materials
router.get('/', checkPermission('materials', 'view'), async (req, res) => {
  try {
    const { 
      category, 
      stockStatus, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filter = { isActive: true };
    
    if (category) filter.category = category;
    
    if (stockStatus) {
      switch (stockStatus) {
        case 'low':
          filter.$expr = { $lte: ['$currentStock', '$minStock'] };
          break;
        case 'high':
          filter.$expr = { $gte: ['$currentStock', '$maxStock'] };
          break;
        case 'normal':
          filter.$expr = { 
            $and: [
              { $gt: ['$currentStock', '$minStock'] },
              { $lt: ['$currentStock', '$maxStock'] }
            ]
          };
          break;
      }
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const materials = await Material.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Material.countDocuments(filter);

    res.json({
      materials,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania materiałów' });
  }
});

// Get single material
router.get('/:id', checkPermission('materials', 'view'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!material) {
      return res.status(404).json({ error: 'Materiał nie istnieje' });
    }

    res.json({ material });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania materiału' });
  }
});

// Create material
router.post('/', checkPermission('materials', 'create'), materialValidation, async (req, res) => {
  try {
    const materialData = {
      ...req.body,
      createdBy: req.user._id
    };

    const material = new Material(materialData);
    await material.save();

    const populatedMaterial = await Material.findById(material._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Materiał został utworzony',
      material: populatedMaterial
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Błąd podczas tworzenia materiału' });
  }
});

// Update material
router.put('/:id', checkPermission('materials', 'edit'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Materiał nie istnieje' });
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Materiał został zaktualizowany',
      material: updatedMaterial
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji materiału' });
  }
});

// Delete material
router.delete('/:id', checkPermission('materials', 'delete'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Materiał nie istnieje' });
    }

    // Soft delete - mark as inactive
    material.isActive = false;
    await material.save();

    res.json({ message: 'Materiał został usunięty' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Błąd podczas usuwania materiału' });
  }
});

// Get material categories
router.get('/categories/list', checkPermission('materials', 'view'), async (req, res) => {
  try {
    const categories = await Material.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Błąd podczas pobierania kategorii' });
  }
});

// Update stock
router.post('/:id/stock', checkPermission('materials', 'edit'), async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Materiał nie istnieje' });
    }

    if (operation === 'add') {
      material.currentStock += quantity;
    } else if (operation === 'subtract') {
      if (material.currentStock < quantity) {
        return res.status(400).json({ error: 'Niewystarczająca ilość w magazynie' });
      }
      material.currentStock -= quantity;
    }

    await material.save();

    res.json({
      message: 'Stan magazynowy został zaktualizowany',
      material
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Błąd podczas aktualizacji stanu magazynowego' });
  }
});

module.exports = router;