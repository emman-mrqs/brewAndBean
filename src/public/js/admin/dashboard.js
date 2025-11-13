// public/js/admin/dashboard.js
(() => {
  'use strict';

  const apiUrl = "/admin/dashboard/data";

  async function fetchData() {
    try {
      const res = await fetch(apiUrl, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Network response not ok');
      const json = await res.json();
      if (!json.success) throw new Error('API error');

      const d = json.data;

      // update stats
      document.getElementById('stat-total-orders').textContent = d.totalOrders ?? 0;
      document.getElementById('stat-total-payments')?.textContent = `₱${Number(d.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
      document.getElementById('stat-total-payments')?.setAttribute('title', `₱${d.totalRevenue}`);

      document.getElementById('stat-total-payments') || null;
      document.getElementById('stat-products').textContent = d.totalProducts ?? 0;
      document.getElementById('stat-variants').textContent = `${d.totalVariants ?? 0} variants`;
      document.getElementById('stat-users').textContent = d.totalUsers ?? 0;
      document.getElementById('stat-low-stock').textContent = d.lowStockCount ?? 0;

      // refresh low-stock table
      const tbody = document.querySelector('#lowStockTable tbody');
      if (tbody) {
        tbody.innerHTML = '';
        if (d.lowStockProducts && d.lowStockProducts.length) {
          d.lowStockProducts.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>
                <div class="product-cell">
                  <div class="product-image">☕</div>
                  <span>${escapeHtml(item.product_name)}</span>
                </div>
              </td>
              <td>${escapeHtml(item.variant_name)}</td>
              <td>${Number(item.stock)} units</td>
              <td>₱${Number(item.price).toFixed(2)}</td>
              <td><span class="status-badge warning">Low Stock</span></td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td colspan="5" style="text-align:center; padding:20px;">No low-stock items</td>`;
          tbody.appendChild(tr);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }

  // minimal HTML escaping
  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // initial fetch and poll
  fetchData();
  // refresh every 30s
  setInterval(fetchData, 30000);

  // refresh button for low-stock table
  const refreshBtn = document.getElementById('refreshLowStock');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchData);
})();
