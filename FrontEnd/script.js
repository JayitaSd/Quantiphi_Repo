const API = "http://localhost:5000/api";
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD", "CHF"];

const baseSel = document.getElementById("base");
const targetSel = document.getElementById("target");
const amountInput = document.getElementById("amount");
const resultEl = document.getElementById("result");
const favBtn = document.getElementById("favBtn");
const favList = document.getElementById("favList");
const travelToggle = document.getElementById("travelToggle");
const travelSection = document.getElementById("travelSection");
const travelTableBody = document.querySelector("#travelTable tbody");

let chart;

function populateDropdowns() {
  CURRENCIES.forEach((c) => {
    baseSel.innerHTML += `<option value="${c}">${c}</option>`;
    targetSel.innerHTML += `<option value="${c}">${c}</option>`;
  });
  baseSel.value = "USD";
  targetSel.value = "EUR";
}

async function convert() {
  const base = baseSel.value;
  const target = targetSel.value;
  const amount = amountInput.value || 1;
  const res = await fetch(`${API}/rates?base=${base}&target=${target}&amount=${amount}`);
  const data = await res.json();
  resultEl.textContent = `${amount} ${base} = ${data.converted?.toFixed(2)} ${target} (rate: ${data.rate?.toFixed(4)})`;
  loadTrend();
}

async function loadTrend() {
  const base = baseSel.value;
  const target = targetSel.value;
  const res = await fetch(`${API}/history?base=${base}&target=${target}`);
  const data = await res.json();

  const labels = data.map((d) => d.date);
  const rates = data.map((d) => d.rate);

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: `${base}/${target}`, data: rates, borderColor: "#2563eb", tension: 0.3 }],
    },
    options: { plugins: { legend: { display: false } } },
  });
}

async function loadFavorites() {
  const res = await fetch(`${API}/favorites`);
  const favs = await res.json();
  favList.innerHTML = "";
  favs.forEach((f) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${f.base} → ${f.target}</span><span>✕</span>`;
    li.querySelector("span:first-child").onclick = () => {
      baseSel.value = f.base;
      targetSel.value = f.target;
      convert();
    };
    li.querySelector("span:last-child").onclick = async (e) => {
      e.stopPropagation();
      await fetch(`${API}/favorites/${f.id}`, { method: "DELETE" });
      loadFavorites();
    };
    favList.appendChild(li);
  });
}

async function addFavorite() {
  await fetch(`${API}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base: baseSel.value, target: targetSel.value }),
  });
  loadFavorites();
}

async function loadTravel() {
  const base = baseSel.value;
  const amount = amountInput.value || 1;
  const res = await fetch(`${API}/travel?base=${base}&amount=${amount}`);
  const data = await res.json();
  travelTableBody.innerHTML = "";
  data.table.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.currency}</td><td>${row.converted.toFixed(2)}</td><td>${row.rate.toFixed(4)}</td>`;
    travelTableBody.appendChild(tr);
  });
}

// Events
baseSel.addEventListener("change", convert);
targetSel.addEventListener("change", convert);
amountInput.addEventListener("input", () => {
  convert();
  if (travelToggle.checked) loadTravel();
});
favBtn.addEventListener("click", addFavorite);
travelToggle.addEventListener("change", () => {
  travelSection.classList.toggle("hidden", !travelToggle.checked);
  if (travelToggle.checked) loadTravel();
});

// Init
populateDropdowns();
convert();
loadFavorites();