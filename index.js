const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- DEMO baza użytkowników (login: admin / hasło: test1234)
const USERS = [
  { username: "admin", password: "test1234", name: "Administrator" },
  { username: "tech1", password: "pass1", name: "Technik Jan" }
];

// --- DEMO baza danych (RAM)
let tasks = [
  { id: 1, desc: "Sprawdzenie systemu SAP", type: "dzienna", done: false, remark: "", assignedTo: "" },
  { id: 2, desc: "Przegląd centrali wentylacyjnej", type: "nocna", done: true, remark: "OK", assignedTo: "Jan" },
];
let defects = [
  { id: 1, desc: "Wyciek przy kotle", status: "zgłoszona", priority: "wysoki", location: "Kotłownia" },
  { id: 2, desc: "Drzwi się nie domykają", status: "usunięta", priority: "średni", location: "Magazyn" },
];
let materials = [
  { id: 1, name: "Uszczelka 16mm" },
  { id: 2, name: "Filtr F7" }
];

// --- Funkcja tworząca "token" (nieprawdziwy JWT, ale wystarczy do frontendu)
function makeToken(username) {
  return Buffer.from(username + "|" + Date.now()).toString("base64");
}
function checkToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [username] = decoded.split("|");
    return USERS.find(u => u.username === username);
  } catch { return null; }
}

// --- Logowanie użytkownika
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
  const token = makeToken(user.username);
  res.json({ token, user: { name: user.name, username: user.username } });
});

// --- Middleware autoryzacji
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : h;
  const user = checkToken(token);
  if (!user) return res.status(401).json({ error: "Brak autoryzacji" });
  req.user = user;
  next();
}

// --- Zadania
app.get("/tasks", auth, (req, res) => res.json(tasks));
app.put("/tasks/:id", auth, (req, res) => {
  const id = +req.params.id;
  tasks = tasks.map(t => t.id === id ? { ...t, ...req.body } : t);
  res.json(tasks.find(t => t.id === id));
});

// --- Usterki
app.get("/defects", auth, (req, res) => res.json(defects));
app.put("/defects/:id", auth, (req, res) => {
  const id = +req.params.id;
  defects = defects.map(d => d.id === id ? { ...d, ...req.body } : d);
  res.json(defects.find(d => d.id === id));
});

// --- Materiały
app.get("/materials", auth, (req, res) => res.json(materials));
app.delete("/materials/:id", auth, (req, res) => {
  const id = +req.params.id;
  materials = materials.filter(m => m.id !== id);
  res.json({ ok: true });
});

// --- Serwer
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("CMMS backend running on port", PORT);
});
