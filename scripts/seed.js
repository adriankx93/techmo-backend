require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Defect = require('../models/Defect');
const Material = require('../models/Material');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmms_db');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Task.deleteMany({}),
      Defect.deleteMany({}),
      Material.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Create users
    const admin = new User({
      email: 'admin@cmms.com',
      password: 'admin123',
      firstName: 'Administrator',
      lastName: 'Systemu',
      role: 'admin',
      status: 'active',
      department: 'IT'
    });

    const manager = new User({
      email: 'manager@cmms.com',
      password: 'manager123',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: 'manager',
      status: 'active',
      department: 'Maintenance'
    });

    const technician1 = new User({
      email: 'tech1@cmms.com',
      password: 'tech123',
      firstName: 'Piotr',
      lastName: 'Nowak',
      role: 'technician',
      status: 'active',
      department: 'Maintenance',
      phone: '+48 123 456 789'
    });

    const technician2 = new User({
      email: 'tech2@cmms.com',
      password: 'tech123',
      firstName: 'Anna',
      lastName: 'Wiśniewska',
      role: 'technician',
      status: 'active',
      department: 'Electrical',
      phone: '+48 987 654 321'
    });

    const operator = new User({
      email: 'operator@cmms.com',
      password: 'operator123',
      firstName: 'Marek',
      lastName: 'Zieliński',
      role: 'operator',
      status: 'active',
      department: 'Production'
    });

    await Promise.all([
      admin.save(),
      manager.save(),
      technician1.save(),
      technician2.save(),
      operator.save()
    ]);
    console.log('Created users');

    // Create materials
    const materials = [
      {
        name: 'Uszczelka gumowa 16mm',
        description: 'Uszczelka do pomp wodnych',
        category: 'Uszczelki',
        unit: 'szt',
        currentStock: 25,
        minStock: 10,
        maxStock: 100,
        unitPrice: 15.50,
        supplier: {
          name: 'Hydro-Parts Sp. z o.o.',
          contact: 'Jan Kowalski',
          email: 'zamowienia@hydroparts.pl',
          phone: '+48 22 123 45 67'
        },
        location: {
          warehouse: 'A',
          shelf: '3',
          bin: 'B2'
        },
        createdBy: admin._id
      },
      {
        name: 'Filtr powietrza F7',
        description: 'Filtr do centrali wentylacyjnej',
        category: 'Filtry',
        unit: 'szt',
        currentStock: 8,
        minStock: 5,
        maxStock: 50,
        unitPrice: 125.00,
        supplier: {
          name: 'Vent-Tech',
          contact: 'Anna Nowak',
          email: 'sprzedaz@venttech.pl',
          phone: '+48 61 789 12 34'
        },
        location: {
          warehouse: 'B',
          shelf: '1',
          bin: 'A1'
        },
        createdBy: admin._id
      },
      {
        name: 'Olej hydrauliczny ISO 46',
        description: 'Olej do systemów hydraulicznych',
        category: 'Oleje',
        unit: 'l',
        currentStock: 200,
        minStock: 50,
        maxStock: 500,
        unitPrice: 12.50,
        supplier: {
          name: 'Oil-Service',
          contact: 'Piotr Wiśniewski',
          email: 'biuro@oilservice.pl',
          phone: '+48 12 345 67 89'
        },
        location: {
          warehouse: 'C',
          shelf: '2',
          bin: 'C3'
        },
        createdBy: admin._id
      }
    ];

    const savedMaterials = await Material.insertMany(materials);
    console.log('Created materials');

    // Create tasks
    const tasks = [
      {
        title: 'Przegląd pompy wodnej nr 1',
        description: 'Rutynowy przegląd pompy wodnej w kotłowni. Sprawdzenie uszczelnień, łożysk i wydajności.',
        type: 'tygodniowa',
        priority: 'średni',
        status: 'nowe',
        location: 'Kotłownia - Pompa nr 1',
        estimatedDuration: 120,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: manager._id,
        assignedTo: technician1._id,
        materials: [
          {
            material: savedMaterials[0]._id,
            quantity: 2,
            used: 0
          }
        ]
      },
      {
        title: 'Wymiana filtrów w centrali wentylacyjnej',
        description: 'Wymiana filtrów F7 w centrali wentylacyjnej na dachu budynku głównego.',
        type: 'miesięczna',
        priority: 'wysoki',
        status: 'w_trakcie',
        location: 'Dach - Centrala wentylacyjna',
        estimatedDuration: 90,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdBy: manager._id,
        assignedTo: technician2._id,
        materials: [
          {
            material: savedMaterials[1]._id,
            quantity: 4,
            used: 2
          }
        ]
      },
      {
        title: 'Kontrola systemu hydraulicznego',
        description: 'Sprawdzenie poziomu oleju, ciśnienia i szczelności systemu hydraulicznego prasy.',
        type: 'dzienna',
        priority: 'średni',
        status: 'zakończone',
        location: 'Hala produkcyjna - Prasa hydrauliczna',
        estimatedDuration: 45,
        actualDuration: 50,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: operator._id,
        assignedTo: technician1._id,
        remarks: 'Wszystko w normie. Uzupełniono olej hydrauliczny.'
      }
    ];

    await Task.insertMany(tasks);
    console.log('Created tasks');

    // Create defects
    const defects = [
      {
        title: 'Wyciek oleju z pompy hydraulicznej',
        description: 'Zauważono wyciek oleju hydraulicznego pod pompą główną. Wyciek jest niewielki ale stały.',
        location: 'Hala produkcyjna - Pompa hydrauliczna główna',
        priority: 'wysoki',
        status: 'zgłoszona',
        category: 'hydrauliczna',
        reportedBy: operator._id,
        assignedTo: technician1._id,
        estimatedCost: 250.00,
        estimatedRepairTime: 3,
        materials: [
          {
            material: savedMaterials[0]._id,
            quantity: 1,
            cost: 15.50
          }
        ]
      },
      {
        title: 'Uszkodzony wyłącznik awaryjny',
        description: 'Wyłącznik awaryjny przy stanowisku nr 3 nie działa prawidłowo. Przycisk się zacina.',
        location: 'Hala produkcyjna - Stanowisko nr 3',
        priority: 'krytyczny',
        status: 'w_trakcie',
        category: 'elektryczna',
        reportedBy: operator._id,
        assignedTo: technician2._id,
        estimatedCost: 150.00,
        estimatedRepairTime: 2,
        repairDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Hałas w wentylatorze',
        description: 'Wentylator w centrali wentylacyjnej wydaje nietypowe dźwięki. Możliwe zużycie łożysk.',
        location: 'Dach - Centrala wentylacyjna',
        priority: 'średni',
        status: 'usunięta',
        category: 'mechaniczna',
        reportedBy: technician2._id,
        assignedTo: technician1._id,
        estimatedCost: 300.00,
        actualCost: 280.00,
        estimatedRepairTime: 4,
        actualRepairTime: 3.5,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        remarks: 'Wymieniono łożyska wentylatora. Problem rozwiązany.'
      }
    ];

    await Defect.insertMany(defects);
    console.log('Created defects');

    console.log('\n=== SEED COMPLETED ===');
    console.log('Default users created:');
    console.log('Admin: admin@cmms.com / admin123');
    console.log('Manager: manager@cmms.com / manager123');
    console.log('Technician 1: tech1@cmms.com / tech123');
    console.log('Technician 2: tech2@cmms.com / tech123');
    console.log('Operator: operator@cmms.com / operator123');
    console.log('\nPlease change default passwords after first login!');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDatabase();