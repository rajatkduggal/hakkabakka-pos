const API_BASE = window.POS_API_BASE || window.location.origin;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

async function loadOrders() {
  const el = document.getElementById("orders");
  if (!el) return;
  try {
    const res = await fetch(API_BASE + "/orders?source=ONLINE");
    if (!res.ok) throw new Error("Orders request failed");
    const orders = await res.json();
    el.innerHTML = "";
    if (!orders.length) {
      el.innerHTML = '<div class="empty">No online orders yet.</div>';
      return;
    }
    for (const order of orders) {
      const card = document.createElement("article");
      card.className = "order-card";
      card.innerHTML = `
        <div class="order-head">
          <div><strong>#${esc(order.order_no)}</strong><span>${esc(order.order_type)}</span></div>
          <b>₹${Number(order.total || 0).toFixed(0)}</b>
        </div>
        <div class="order-customer">${esc(order.customer_name)} · ${esc(order.customer_phone)}</div>
        <div class="order-status">Status: <b>${esc(order.status)}</b> · Payment: <b>${esc(order.payment_status)}</b></div>
        <div class="order-actions">
          <button data-id="${order.id}" data-status="ACCEPTED">Accept</button>
          <button data-id="${order.id}" data-status="PREPARING">Preparing</button>
          <button data-id="${order.id}" data-status="READY">Ready</button>
          <button data-id="${order.id}" data-status="COMPLETED">Complete</button>
        </div>`;
      el.appendChild(card);
    }
  } catch (error) {
    el.innerHTML = '<div class="empty bad">POS server connection failed. Check API/server.</div>';
    console.error(error);
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-status][data-id]");
  if (!button) return;
  button.disabled = true;
  try {
    const res = await fetch(API_BASE + "/orders/" + encodeURIComponent(button.dataset.id) + "/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: button.dataset.status })
    });
    if (!res.ok) throw new Error("Status update failed");
    await loadOrders();
  } catch (error) {
    alert("Could not update order status.");
    button.disabled = false;
  }
});

window.addEventListener("load", () => {
  loadOrders();
  setInterval(loadOrders, 10000);
});
