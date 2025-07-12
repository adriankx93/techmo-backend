# CMMS Backend - Zaawansowany System Zarządzania Konserwacją

## Opis

Zaawansowany backend dla systemu CMMS (Computerized Maintenance Management System) z pełnym systemem zarządzania użytkownikami, rolami i uprawnieniami.

## Funkcjonalności

### System Użytkowników
- **Rejestracja przez email** - użytkownicy rejestrują się podając email i hasło
- **Akceptacja przez admina** - nowi użytkownicy czekają na akceptację administratora
- **System ról**: Admin, Manager, Technician, Operator
- **Granularne uprawnienia** - szczegółowe kontrolowanie dostępu do funkcji
- **Przypisywanie techników** - admin może przypisać użytkowników do konkretnych techników

### Panel Administratora
- **Dashboard z statystykami** - przegląd systemu w czasie rzeczywistym
- **Zarządzanie użytkownikami** - akceptacja, odrzucanie, edycja uprawnień
- **Zarządzanie rolami i uprawnieniami**
- **Logi systemowe**
- **Ustawienia systemu**

### Zarządzanie Zadaniami
- **CRUD operacje** na zadaniach
- **Przypisywanie zadań** do techników
- **Różne typy zadań**: dzienna, nocna, tygodniowa, miesięczna, awaryjna
- **Priorytety i statusy**
- **Materiały przypisane do zadań**
- **Załączniki**

### Zarządzanie Usterkami
- **Zgłaszanie usterek** przez operatorów
- **Przypisywanie do techników**
- **Kategorie**: mechaniczna, elektryczna, hydrauliczna, pneumatyczna
- **Śledzenie kosztów napraw**
- **Historia napraw**

### Zarządzanie Materiałami
- **Katalog materiałów** z kategoriami
- **Zarządzanie stanem magazynowym**
- **Alerty o niskim stanie**
- **Dostawcy i lokalizacje**
- **Kody kreskowe**

## Instalacja

1. **Klonowanie repozytorium**
```bash
git clone <repository-url>
cd cmms-backend
```

2. **Instalacja zależności**
```bash
npm install
```

3. **Konfiguracja środowiska**
```bash
cp .env.example .env
```

Edytuj plik `.env` i ustaw:
- `MONGODB_URI` - połączenie z MongoDB
- `JWT_SECRET` - sekretny klucz dla JWT
- `EMAIL_*` - konfiguracja SMTP dla emaili
- `FRONTEND_URL` - URL frontendu

4. **Uruchomienie MongoDB**
Upewnij się, że MongoDB jest uruchomione lokalnie lub skonfiguruj połączenie z MongoDB Atlas.

5. **Seed bazy danych** (opcjonalne)
```bash
npm run seed
```

6. **Uruchomienie serwera**
```bash
# Produkcja
npm start

# Rozwój (z nodemon)
npm run dev
```

## Domyślni Użytkownicy

Po uruchomieniu `npm run seed` utworzeni zostaną domyślni użytkownicy:

- **Admin**: admin@cmms.com / admin123
- **Manager**: manager@cmms.com / manager123
- **Technician 1**: tech1@cmms.com / tech123
- **Technician 2**: tech2@cmms.com / tech123
- **Operator**: operator@cmms.com / operator123

**⚠️ WAŻNE: Zmień domyślne hasła po pierwszym logowaniu!**

## API Endpoints

### Autoryzacja
- `POST /api/auth/register` - Rejestracja nowego użytkownika
- `POST /api/auth/login` - Logowanie
- `GET /api/auth/me` - Pobranie danych aktualnego użytkownika
- `POST /api/auth/forgot-password` - Reset hasła
- `POST /api/auth/reset-password` - Ustawienie nowego hasła
- `POST /api/auth/change-password` - Zmiana hasła

### Panel Administratora
- `GET /api/admin/dashboard` - Statystyki dashboard
- `GET /api/admin/users` - Lista użytkowników
- `GET /api/admin/users/pending` - Użytkownicy oczekujący na akceptację
- `POST /api/admin/users/:id/approve` - Akceptacja użytkownika
- `POST /api/admin/users/:id/reject` - Odrzucenie użytkownika
- `PUT /api/admin/users/:id` - Edycja użytkownika
- `DELETE /api/admin/users/:id` - Usunięcie użytkownika
- `GET /api/admin/technicians` - Lista techników
- `GET /api/admin/settings` - Ustawienia systemu
- `PUT /api/admin/settings` - Aktualizacja ustawień

### Zadania
- `GET /api/tasks` - Lista zadań
- `GET /api/tasks/:id` - Szczegóły zadania
- `POST /api/tasks` - Utworzenie zadania
- `PUT /api/tasks/:id` - Aktualizacja zadania
- `DELETE /api/tasks/:id` - Usunięcie zadania
- `POST /api/tasks/:id/assign` - Przypisanie zadania

### Usterki
- `GET /api/defects` - Lista usterek
- `GET /api/defects/:id` - Szczegóły usterki
- `POST /api/defects` - Zgłoszenie usterki
- `PUT /api/defects/:id` - Aktualizacja usterki
- `DELETE /api/defects/:id` - Usunięcie usterki

### Materiały
- `GET /api/materials` - Lista materiałów
- `GET /api/materials/:id` - Szczegóły materiału
- `POST /api/materials` - Utworzenie materiału
- `PUT /api/materials/:id` - Aktualizacja materiału
- `DELETE /api/materials/:id` - Usunięcie materiału
- `GET /api/materials/categories/list` - Lista kategorii
- `POST /api/materials/:id/stock` - Aktualizacja stanu magazynowego

## System Uprawnień

### Role i ich domyślne uprawnienia:

**Admin**
- Pełny dostęp do wszystkich funkcji
- Zarządzanie użytkownikami
- Konfiguracja systemu

**Manager**
- Zarządzanie zadaniami i usterkami
- Przypisywanie zadań
- Przeglądanie raportów
- Ograniczone zarządzanie materiałami

**Technician**
- Przeglądanie i edycja przypisanych zadań
- Zgłaszanie i edycja usterek
- Przeglądanie materiałów

**Operator**
- Przeglądanie zadań
- Zgłaszanie usterek
- Ograniczony dostęp do materiałów

## Bezpieczeństwo

- **Rate limiting** - ograniczenie liczby żądań
- **Helmet.js** - zabezpieczenia HTTP headers
- **JWT tokeny** - bezpieczna autoryzacja
- **Bcrypt** - hashowanie haseł
- **Walidacja danych** - express-validator
- **CORS** - konfiguracja cross-origin requests

## Powiadomienia Email

System automatycznie wysyła emaile:
- Powitanie po rejestracji
- Powiadomienie o akceptacji konta
- Powiadomienie o odrzuceniu konta
- Reset hasła

## Rozwój

### Struktura projektu
```
├── models/          # Modele MongoDB (User, Task, Defect, Material)
├── routes/          # Endpointy API
├── middleware/      # Middleware (auth, validation)
├── utils/           # Narzędzia pomocnicze (email)
├── scripts/         # Skrypty (seed)
├── index.js         # Główny plik serwera
└── package.json     # Zależności i skrypty
```

### Dodawanie nowych funkcji
1. Utwórz model w `models/`
2. Dodaj routes w `routes/`
3. Dodaj middleware jeśli potrzebne
4. Zaktualizuj uprawnienia w `models/User.js`

## Monitoring i Logi

- Health check endpoint: `GET /api/health`
- Logi błędów w konsoli
- Graceful shutdown przy SIGTERM/SIGINT

## Wsparcie

W przypadku problemów:
1. Sprawdź logi serwera
2. Zweryfikuj konfigurację `.env`
3. Upewnij się, że MongoDB jest dostępne
4. Sprawdź uprawnienia użytkowników

## Licencja

MIT License