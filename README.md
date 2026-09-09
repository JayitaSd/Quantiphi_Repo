# Currency Converter

A simple full-stack currency converter with live rates, 30-day trend chart, favorites, and a travel budgeting comparison mode.

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript (Chart.js via CDN)
- **Backend:** Node.js + Express
- **Database:** SQLite (via Node's built-in `node:sqlite` module — no native compilation required)
- **Exchange rates:** [Frankfurter API](https://www.frankfurter.app/) (free, no API key needed)

## Project Structure

```
.
├── backend/
│   ├── server.js
│   ├── package.json
│   └── data.db          (auto-created on first run)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md
```

## Setup & Run

### Backend

```bash
cd backend
npm install
npm start
```

Runs on `http://localhost:5000`. Requires **Node.js v22+** for built-in SQLite support.

### Frontend

No build step — just open `frontend/index.html` directly in your browser. It calls the backend at `localhost:5000`, so make sure the backend is running first.

## Features

- **Dual Converter:** Convert any amount between two currencies with live rates
- **Trend Chart:** 30-day historical rate line chart for the selected currency pair
- **Favorites:** Save and quickly reload frequently used currency pairs
- **Travel Budgeting Mode:** Toggle to see one amount converted into 5 major currencies (EUR, GBP, JPY, INR, AUD) at once

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rates?base=&target=&amount=` | Live conversion |
| GET | `/api/history?base=&target=` | 30-day rate history |
| GET | `/api/travel?base=&amount=` | Multi-currency comparison |
| GET | `/api/favorites` | List saved favorites |
| POST | `/api/favorites` | Add a favorite pair |
| DELETE | `/api/favorites/:id` | Remove a favorite |