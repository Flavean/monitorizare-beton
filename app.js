const KEY = "beton_monitor_orders_v1";

const quantity = document.getElementById("quantity");
const orderBtn = document.getElementById("orderBtn");
const arrivedBtn = document.getElementById("arrivedBtn");
const active = document.getElementById("active");
const orderedAt = document.getElementById("orderedAt");
const activeQty = document.getElementById("activeQty");
const timer = document.getElementById("timer");
const timerBox = document.getElementById("timerBox");
const history = document.getElementById("history");
const message = document.getElementById("message");
const clearBtn = document.getElementById("clearBtn");

let orders = JSON.parse(localStorage.getItem(KEY) || "[]");
let interval = null;

function save() {
  localStorage.setItem(KEY, JSON.stringify(orders));
}

function time(date) {
  return new Date(date).toLocaleTimeString("ro-RO", {hour: "2-digit", minute: "2-digit"});
}

function minutesBetween(a, b = Date.now()) {
  return Math.max(0, Math.floor((new Date(b) - new Date(a)) / 60000));
}

function activeOrder() {
  return orders.find(o => o.status === "waiting");
}

function showMessage(text, error = false) {
  message.textContent = text;
  message.style.color = error ? "#dc2626" : "#16a34a";
}

function updateTimer() {
  const order = activeOrder();
  if (!order) return;

  const mins = minutesBetween(order.orderedAt);
  timer.textContent = `${mins} min`;
  timerBox.classList.toggle("overdue", mins > 15);
}

function renderActive() {
  const order = activeOrder();
  active.classList.toggle("hidden", !order);
  orderBtn.disabled = !!order;

  if (!order) {
    clearInterval(interval);
    return;
  }

  orderedAt.textContent = time(order.orderedAt);
  activeQty.textContent = `${order.quantity} m³`;
  updateTimer();

  clearInterval(interval);
  interval = setInterval(updateTimer, 1000);
}

function renderHistory() {
  const completed = orders.filter(o => o.status === "completed").reverse();

  if (!completed.length) {
    history.innerHTML = '<div class="history-row">Nu există comenzi finalizate.</div>';
    return;
  }

  history.innerHTML = completed.map(o => {
    const mins = minutesBetween(o.orderedAt, o.arrivedAt);
    const red = mins > 15 ? "red" : "";
    const date = new Date(o.orderedAt).toLocaleDateString("ro-RO");

    return `<div class="history-row">
      <strong>${date}</strong> · ${o.quantity} m³<br>
      ${time(o.orderedAt)} → ${time(o.arrivedAt)}
      · <span class="${red}">${mins} min</span>
    </div>`;
  }).join("");
}

orderBtn.addEventListener("click", () => {
  const value = Number(quantity.value);

  if (!value || value <= 0) {
    showMessage("Introdu o cantitate validă.", true);
    return;
  }

  if (activeOrder()) {
    showMessage("Ai deja o comandă în așteptare.", true);
    return;
  }

  orders.push({
    id: Date.now(),
    quantity: value,
    orderedAt: new Date().toISOString(),
    arrivedAt: null,
    status: "waiting"
  });

  save();
  quantity.value = "";
  showMessage("Comanda a fost înregistrată.");
  renderActive();
  renderHistory();
});

arrivedBtn.addEventListener("click", () => {
  const order = activeOrder();
  if (!order) return;

  order.arrivedAt = new Date().toISOString();
  order.status = "completed";

  const mins = minutesBetween(order.orderedAt, order.arrivedAt);
  save();

  showMessage(`Betonul a sosit. Ai așteptat ${mins} minute.`);
  renderActive();
  renderHistory();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Sigur vrei să ștergi istoricul?")) return;

  orders = orders.filter(o => o.status === "waiting");
  save();
  renderHistory();
  showMessage("Istoricul a fost șters.");
});

renderActive();
renderHistory();
