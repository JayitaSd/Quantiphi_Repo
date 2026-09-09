const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // v2 (CommonJS)
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const API_BASE = "https://api.frankfurter.app";
const DB_FILE = path.join(__dirname, "data.json");

// ---------- Simple JSON-file "database" ----------
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { favorites: [], history_cache: [], nextFavId: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

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

    const db = loadDB();
    db.history_cache.push({
      base, target, amount: Number(amount), converted,
      timestamp: new Date().toISOString(),
    });
    saveDB(db);

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
  const db = loadDB();
  res.json(db.favorites);
});

app.post("/api/favorites", (req, res) => {
  const { base, target } = req.body;
  const db = loadDB();
  const fav = { id: db.nextFavId++, base, target };
  db.favorites.push(fav);
  saveDB(db);
  res.json(fav);
});

app.delete("/api/favorites/:id", (req, res) => {
  const db = loadDB();
  db.favorites = db.favorites.filter((f) => f.id !== Number(req.params.id));
  saveDB(db);
  res.json({ deleted: true });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));