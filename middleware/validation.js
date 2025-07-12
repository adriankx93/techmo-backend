const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Błędy walidacji',
      details: errors.array()
    });
  }
  next();
};

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Nieprawidłowy adres email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Hasło musi mieć co najmniej 6 znaków'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Imię musi mieć co najmniej 2 znaki'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nazwisko musi mieć co najmniej 2 znaki'),
  handleValidationErrors
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Nieprawidłowy adres email'),
  body('password')
    .notEmpty()
    .withMessage('Hasło jest wymagane'),
  handleValidationErrors
];

const taskValidation = [
  body('title')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Opis musi mieć co najmniej 10 znaków'),
  body('type')
    .isIn(['dzienna', 'nocna', 'tygodniowa', 'miesięczna', 'awaryjna'])
    .withMessage('Nieprawidłowy typ zadania'),
  handleValidationErrors
];

const defectValidation = [
  body('title')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Opis musi mieć co najmniej 10 znaków'),
  body('location')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Lokalizacja jest wymagana'),
  body('category')
    .isIn(['mechaniczna', 'elektryczna', 'hydrauliczna', 'pneumatyczna', 'inne'])
    .withMessage('Nieprawidłowa kategoria'),
  handleValidationErrors
];

const materialValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nazwa musi mieć co najmniej 2 znaki'),
  body('category')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Kategoria jest wymagana'),
  body('unit')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Jednostka jest wymagana'),
  body('currentStock')
    .isNumeric()
    .withMessage('Stan magazynowy musi być liczbą'),
  body('unitPrice')
    .isNumeric()
    .withMessage('Cena jednostkowa musi być liczbą'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  taskValidation,
  defectValidation,
  materialValidation,
  handleValidationErrors
};