const KEY="beton_monitor_orders_v1";
const $=id=>document.getElementById(id);
const quantity=$("quantity"),orderBtn=$("orderBtn"),arrivedBtn=$("arrivedBtn"),active=$("active"),orderedAt=$("orderedAt"),activeQty=$("activeQty"),timer=$("timer"),timerBox=$("timerBox"),history=$("history"),message=$("message"),clearBtn=$("clearBtn"),pdfBtn=$("pdfBtn");
let orders=JSON.parse(localStorage.getItem(KEY)||"[]"),interval=null;
function save(){localStorage.setItem(KEY,JSON.stringify(orders))}
function time(d){return new Date(d).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})}
function date(d){return new Date(d).toLocaleDateString("ro-RO")}
function mins(a,b=Date.now()){return Math.max(0,Math.floor((new Date(b)-new Date(a))/60000))}
function current(){return orders.find(o=>o.status==="waiting")}
function msg(t,e=false){message.textContent=t;message.style.color=e?"#dc2626":"#16a34a"}
function tick(){let o=current();if(!o)return;let m=mins(o.orderedAt);timer.textContent=m+" min";timerBox.classList.toggle("overdue",m>15)}
function renderActive(){let o=current();active.classList.toggle("hidden",!o);orderBtn.disabled=!!o;if(!o){clearInterval(interval);return}orderedAt.textContent=time(o.orderedAt);activeQty.textContent=o.quantity.toFixed(2)+" m³";tick();clearInterval(interval);interval=setInterval(tick,1000)}
function renderHistory(){let a=orders.filter(o=>o.status==="completed").reverse();if(!a.length){history.innerHTML='<div class="history-row">Nu există comenzi finalizate.</div>';return}history.innerHTML=a.map(o=>{let m=mins(o.orderedAt,o.arrivedAt);return `<div class="history-row"><strong>${date(o.orderedAt)}</strong> · ${o.quantity.toFixed(2)} m³<br>${time(o.orderedAt)} → ${time(o.arrivedAt)} · <span class="${m>15?"red":""}">${m} min</span></div>`}).join("")}
orderBtn.onclick=()=>{let v=quantity.value.trim().replace(",","."),n=Number(v);if(!n||n<=0)return msg("Introdu o cantitate validă.",true);if(current())return msg("Ai deja o comandă în așteptare.",true);orders.push({id:Date.now(),quantity:n,orderedAt:new Date().toISOString(),arrivedAt:null,status:"waiting"});save();quantity.value="";msg("Comanda a fost înregistrată.");renderActive()};
arrivedBtn.onclick=()=>{let o=current();if(!o)return;o.arrivedAt=new Date().toISOString();o.status="completed";let m=mins(o.orderedAt,o.arrivedAt);save();msg(`Betonul a sosit. Ai așteptat ${m} minute.`);renderActive();renderHistory()};
clearBtn.onclick=()=>{if(!confirm("Sigur vrei să ștergi istoricul?"))return;orders=orders.filter(o=>o.status==="waiting");save();renderHistory();msg("Istoricul a fost șters.")};

pdfBtn.onclick=()=>{
 const a=orders.filter(o=>o.status==="completed");
 if(!a.length)return msg("Nu există comenzi finalizate pentru raport.",true);
 const total=a.reduce((s,o)=>s+o.quantity,0), totalM=a.reduce((s,o)=>s+mins(o.orderedAt,o.arrivedAt),0), avg=totalM/a.length;
 const rows=a.map(o=>{let m=mins(o.orderedAt,o.arrivedAt);return `<tr><td>${date(o.orderedAt)}</td><td>${time(o.orderedAt)}</td><td>${time(o.arrivedAt)}</td><td>${o.quantity.toFixed(2)} m³</td><td class="${m>15?"red":""}">${m} min</td></tr>`}).join("");
 const w=window.open("","_blank");
 if(!w)return msg("Permite ferestrele pop-up pentru site.",true);
 w.document.write(`<!doctype html><html lang="ro"><head><meta charset="UTF-8"><title>Raport Beton</title><style>body{font-family:Arial;margin:30px;color:#111}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eee}.red{color:#dc2626;font-weight:bold}.summary{margin-top:22px;line-height:1.8}@media print{body{margin:15mm}}</style></head><body><h1>RAPORT BETON</h1><p style="text-align:center">Generat: ${new Date().toLocaleString("ro-RO")}</p><table><thead><tr><th>Data</th><th>Comandă</th><th>Sosire</th><th>Cantitate</th><th>Așteptare</th></tr></thead><tbody>${rows}</tbody></table><div class="summary"><b>Total beton:</b> ${total.toFixed(2)} m³<br><b>Număr comenzi:</b> ${a.length}<br><b>Timp mediu:</b> ${avg.toFixed(1)} minute</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
 w.document.close();
};
renderActive();renderHistory();