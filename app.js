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
const pdfBtn = document.getElementById("pdfBtn");

let orders = JSON.parse(localStorage.getItem(KEY) || "[]");
let interval = null;

function save() {
    localStorage.setItem(KEY, JSON.stringify(orders));
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString("ro-RO", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString("ro-RO");
}

function localDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function minutesBetween(start, end = Date.now()) {
    return Math.max(
        0,
        Math.floor((new Date(end) - new Date(start)) / 60000)
    );
}

function getActiveOrder() {
    return orders.find(order => order.status === "waiting");
}

function showMessage(text, error = false) {
    message.textContent = text;
    message.style.color = error ? "#dc2626" : "#16a34a";
}

function updateTimer() {
    const order = getActiveOrder();

    if (!order) return;

    const minutes = minutesBetween(order.orderedAt);

    timer.textContent = `${minutes} min`;
    timerBox.classList.toggle("overdue", minutes > 15);
}

function renderActive() {
    const order = getActiveOrder();

    active.classList.toggle("hidden", !order);
    orderBtn.disabled = !!order;

    if (!order) {
        clearInterval(interval);
        return;
    }

    orderedAt.textContent = formatTime(order.orderedAt);
    activeQty.textContent = `${order.quantity.toFixed(2)} m³`;

    updateTimer();

    clearInterval(interval);
    interval = setInterval(updateTimer, 1000);
}

function renderHistory() {
    const completed = orders
        .filter(order => order.status === "completed")
        .sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));

    if (!completed.length) {
        history.innerHTML =
            '<div class="history-row">Nu există comenzi finalizate.</div>';
        return;
    }

    history.innerHTML = completed.map(order => {
        const minutes = minutesBetween(
            order.orderedAt,
            order.arrivedAt
        );

        const red = minutes > 15 ? "red" : "";

        return `
            <div class="history-row">
                <strong>${formatDate(order.orderedAt)}</strong>
                · ${order.quantity.toFixed(2)} m³
                <br>
                ${formatTime(order.orderedAt)}
                → ${formatTime(order.arrivedAt)}
                · <span class="${red}">${minutes} min</span>
            </div>
        `;
    }).join("");
}

orderBtn.addEventListener("click", () => {
    let value = quantity.value.trim().replace(",", ".");
    const amount = Number(value);

    if (!amount || amount <= 0) {
        showMessage("Introdu o cantitate validă.", true);
        return;
    }

    if (getActiveOrder()) {
        showMessage(
            "Ai deja o comandă în așteptare.",
            true
        );
        return;
    }

    orders.push({
        id: Date.now(),
        quantity: amount,
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
    const order = getActiveOrder();

    if (!order) {
        return;
    }

    order.arrivedAt = new Date().toISOString();
    order.status = "completed";

    const minutes = minutesBetween(
        order.orderedAt,
        order.arrivedAt
    );

    save();

    showMessage(
        `Betonul a sosit. Ai așteptat ${minutes} minute.`
    );

    renderActive();
    renderHistory();
});

clearBtn.addEventListener("click", () => {
    if (!confirm("Sigur vrei să ștergi istoricul?")) {
        return;
    }

    orders = orders.filter(
        order => order.status === "waiting"
    );

    save();
    renderHistory();

    showMessage("Istoricul a fost șters.");
});

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

pdfBtn.addEventListener("click", () => {
    const today = localDateKey(new Date());

    // Raportul conține DOAR comenzile finalizate de azi.
    const todayOrders = orders
        .filter(order =>
            order.status === "completed" &&
            localDateKey(order.orderedAt) === today
        )
        .sort((a, b) => new Date(a.orderedAt) - new Date(b.orderedAt));

    if (!todayOrders.length) {
        showMessage(
            "Nu există comenzi finalizate astăzi pentru raport.",
            true
        );
        return;
    }

    const total = todayOrders.reduce(
        (sum, order) => sum + order.quantity,
        0
    );

    const totalMinutes = todayOrders.reduce(
        (sum, order) =>
            sum + minutesBetween(order.orderedAt, order.arrivedAt),
        0
    );

    const average = totalMinutes / todayOrders.length;

    const rows = todayOrders.map(order => {
        const minutes = minutesBetween(
            order.orderedAt,
            order.arrivedAt
        );

        const style = minutes > 15
            ? ' style="color:#dc2626;font-weight:bold;"'
            : "";

        return `
            <tr>
                <td>${escapeHtml(formatTime(order.orderedAt))}</td>
                <td>${escapeHtml(formatTime(order.arrivedAt))}</td>
                <td>${order.quantity.toFixed(2)} m³</td>
                <td${style}>${minutes} min</td>
            </tr>
        `;
    }).join("");

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        showMessage(
            "Permite ferestrele pop-up pentru site și încearcă din nou.",
            true
        );
        return;
    }

    const reportDate = new Date().toLocaleDateString("ro-RO");

    reportWindow.document.write(`
        <!doctype html>
        <html lang="ro">
        <head>
            <meta charset="UTF-8">
            <title>Raport Beton - ${escapeHtml(reportDate)}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 35px;
                    color: #111827;
                }

                h1 {
                    text-align: center;
                    margin-bottom: 5px;
                }

                .date {
                    text-align: center;
                    color: #64748b;
                    margin-bottom: 25px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    border: 1px solid #d1d5db;
                    padding: 9px;
                    text-align: left;
                }

                th {
                    background: #f3f4f6;
                }

                .summary {
                    margin-top: 25px;
                    font-size: 16px;
                    line-height: 1.8;
                }

                @media print {
                    body {
                        margin: 15mm;
                    }
                }
            </style>
        </head>

        <body>
            <h1>RAPORT BETON</h1>

            <div class="date">
                ${escapeHtml(reportDate)}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Comandă</th>
                        <th>Sosire</th>
                        <th>Cantitate</th>
                        <th>Așteptare</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div class="summary">
                <strong>Total beton:</strong>
                ${total.toFixed(2)} m³
                <br>

                <strong>Număr comenzi:</strong>
                ${todayOrders.length}
                <br>

                <strong>Timp mediu de așteptare:</strong>
                ${average.toFixed(1)} minute
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 300);
                };
            <\/script>
        </body>
        </html>
    `);

    reportWindow.document.close();
});

renderActive();
renderHistory();
