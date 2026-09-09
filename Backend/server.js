const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // v2 (CommonJS)
const { DatabaseSync } = require("node:sqlite"); // built into Node 22+/24, no install needed

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = "https://api.frankfurter.app";

// ---------- SQLite setup (built-in, no native compile) ----------
const db = new DatabaseSync("data.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base TEXT NOT NULL,
    target TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base TEXT, target TEXT, amount REAL, converted REAL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ---------- Helpers ----------
const fmtDate = (d) => d.toISOString().split("T")[0];

// ---------- Routes ----------

// Live conversion
app.get("/api/rates", async (req, res) => {
  try {
    const { base = "USD", target = "EUR", amount = 1 } = req.query;
    const r = await fetch(`${API_BASE}/latest?from=${base}&to=${target}&amount=${amount}`);
    const data = await r.json();
    const converted = data.rates[target];
    const rate = converted / amount;

    db.prepare(
      "INSERT INTO history_cache (base, target, amount, converted) VALUES (?,?,?,?)"
    ).run(base, target, Number(amount), converted);

    res.json({ base, target, amount: Number(amount), rate, converted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch rate" });
  }
});

// 30-day trend
app.get("/api/history", async (req, res) => {
  try {
    const { base = "USD", target = "EUR" } = req.query;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const r = await fetch(
      `${API_BASE}/${fmtDate(start)}..${fmtDate(end)}?from=${base}&to=${target}`
    );
    const data = await r.json();
    const history = Object.entries(data.rates).map(([date, obj]) => ({
      date,
      rate: obj[target],
    }));
    res.json(history);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Travel budgeting mode - compare against 5 major currencies
app.get("/api/travel", async (req, res) => {
  try {
    const { base = "USD", amount = 100 } = req.query;
    const targets = ["EUR", "GBP", "JPY", "INR", "AUD"].filter((c) => c !== base);
    const r = await fetch(`${API_BASE}/latest?from=${base}&to=${targets.join(",")}&amount=${amount}`);
    const data = await r.json();
    const table = Object.entries(data.rates).map(([currency, converted]) => ({
      currency,
      converted,
      rate: converted / amount,
    }));
    res.json({ base, amount: Number(amount), table });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch travel comparison" });
  }
});

// Favorites CRUD
app.get("/api/favorites", (req, res) => {
  const rows = db.prepare("SELECT * FROM favorites").all();
  res.json(rows);
});

app.post("/api/favorites", (req, res) => {
  const { base, target } = req.body;
  const info = db
    .prepare("INSERT INTO favorites (base, target) VALUES (?,?)")
    .run(base, target);
  res.json({ id: Number(info.lastInsertRowid), base, target });
});

app.delete("/api/favorites/:id", (req, res) => {
  db.prepare("DELETE FROM favorites WHERE id = ?").run(Number(req.params.id));
  res.json({ deleted: true });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));