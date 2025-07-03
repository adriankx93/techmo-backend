require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const { Parser } = require("json2csv");
const twilio = require("twilio");
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const app = express();
const db = new sqlite3.Database("db.sqlite");
app.use(cors());
app.use(bodyParser.json());

// Tabele
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desc TEXT,
    type TEXT,
    done INTEGER,
    remark TEXT,
    missing TEXT,
    assignedTo TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS defects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desc TEXT,
    status TEXT,
    reportedBy TEXT,
    priority TEXT,
    location TEXT,
    imageUrl TEXT,
    comment TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    user TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

function logAction(action, user = "system") {
  db.run("INSERT INTO logs (action, user) VALUES (?, ?)", [action, user]);
}

// Zadania
app.get("/tasks", (req, res) => {
  db.all("SELECT * FROM tasks", (err, rows) => res.json(rows));
});
app.post("/tasks", (req, res) => {
  const { desc, type, assignedTo, user } = req.body;
  db.run(
    "INSERT INTO tasks (desc, type, done, remark, missing, assignedTo) VALUES (?, ?, 0, '', '', ?)",
    [desc, type, assignedTo || ""],
    function (err) {
      logAction(`Dodano zadanie: ${desc}`, user || "Nieznany");
      res.json({ id: this.lastID });
    }
  );
});
app.put("/tasks/:id", (req, res) => {
  const { done, remark, missing, assignedTo, user } = req.body;
  db.run(
    "UPDATE tasks SET done=?, remark=?, missing=?, assignedTo=? WHERE id=?",
    [done ? 1 : 0, remark, missing, assignedTo || "", req.params.id],
    function (err) {
      logAction(
        `Edytowano zadanie [${req.params.id}], status: ${done ? "wykonano" : "nie wykonano"}`,
        user || "Nieznany"
      );
      res.json({ updated: true });
    }
  );
});

// Usterki
app.get("/defects", (req, res) => {
  db.all("SELECT * FROM defects", (err, rows) => res.json(rows));
});
app.post("/defects", (req, res) => {
  const { desc, reportedBy, priority, location, imageUrl, comment } = req.body;
  db.run(
    "INSERT INTO defects (desc, status, reportedBy, priority, location, imageUrl, comment) VALUES (?, 'zgłoszona', ?, ?, ?, ?, ?)",
    [desc, reportedBy, priority || "średni", location || "", imageUrl || "", comment || ""],
    function (err) {
      logAction(`Dodano usterkę: ${desc}`, reportedBy || "Nieznany");
      if (priority === "wysoki" && process.env.ALERT_PHONE) {
        twilioClient.messages.create({
          body: `ALERT! Nowa krytyczna usterka: ${desc} (${location || "Brak lokalizacji"})`,
          from: process.env.TWILIO_PHONE,
          to: process.env.ALERT_PHONE
        });
      }
      res.json({ id: this.lastID });
    }
  );
});
app.put("/defects/:id", (req, res) => {
  const { status, user } = req.body;
  db.run(
    "UPDATE defects SET status=? WHERE id=?",
    [status, req.params.id],
    function (err) {
      logAction(`Zmieniono status usterki [${req.params.id}]: ${status}`, user || "Nieznany");
      res.json({ updated: true });
    }
  );
});

// Materiały
app.get("/materials", (req, res) => {
  db.all("SELECT * FROM materials", (err, rows) => res.json(rows));
});
app.post("/materials", (req, res) => {
  const { name, user } = req.body;
  db.run("INSERT OR IGNORE INTO materials (name) VALUES (?)", [name], function (err) {
    logAction(`Zgłoszono brak materiału: ${name}`, user || "Nieznany");
    res.json({ id: this.lastID });
  });
});
app.delete("/materials/:id", (req, res) => {
  db.run("DELETE FROM materials WHERE id=?", [req.params.id], function (err) {
    logAction(`Usunięto materiał o id ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Logi
app.get("/logs", (req, res) => {
  db.all("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100", (err, rows) => res.json(rows));
});

// Raporty
app.get("/report/tasks.csv", (req, res) => {
  db.all("SELECT * FROM tasks", (err, rows) => {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("tasks_report.csv");
    res.send(csv);
  });
});
app.get("/report/defects.csv", (req, res) => {
  db.all("SELECT * FROM defects", (err, rows) => {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("defects_report.csv");
    res.send(csv);
  });
});

// QR zgłoszenia
app.post("/defects/qr", (req, res) => {
  const { qrLocation, desc, reportedBy, priority } = req.body;
  db.run(
    "INSERT INTO defects (desc, status, reportedBy, priority, location) VALUES (?, 'zgłoszona', ?, ?, ?)",
    [desc, reportedBy || "QR-User", priority || "średni", qrLocation || "QR"],
    function (err) {
      logAction(`Usterka przez QR: ${desc} (${qrLocation})`, reportedBy || "QR-User");
      res.json({ id: this.lastID });
    }
  );
});

// Webhook IoT
app.post("/iot-webhook", (req, res) => {
  const { type, desc, location } = req.body;
  if (type && desc) {
    db.run(
      "INSERT INTO defects (desc, status, reportedBy, priority, location) VALUES (?, 'zgłoszona', 'IoT', 'wysoki', ?)",
      [`[IoT] ${desc}`, location || ""],
      function (err) {
        logAction(`Usterka z IoT: ${desc} (${location})`, "IoT");
        res.json({ id: this.lastID });
      }
    );
  } else {
    res.status(400).json({ error: "type & desc required" });
  }
});

app.listen(4000, () => console.log("API działa na http://localhost:4000"));
