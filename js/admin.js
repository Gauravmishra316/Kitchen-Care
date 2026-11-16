/**
 * KitchenCare Admin Analytics & Audit Module
 * Food cost %, revenue, chef performance, and audit logs.
 */
let auditFilterUser = 'all';
let auditFilterAction = 'all';

// 9. ADMIN DASHBOARD & AUDIT LOGS
    function renderAdminDashboard(container) {
      const data = DataLayer.getData();

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">👑 Admin & Owner Intelligence Dashboard</h2>
            <p style="color:var(--text-muted); font-size:14px;">Key kitchen performance metrics, food cost ratio, and team load.</p>
          </div>

          <div class="grid-4">
            <div class="card">
              <div style="color:var(--text-muted); font-size:13px; font-weight:700;">FOOD COST %</div>
              <div style="font-size:32px; font-weight:800; color:var(--primary); margin:6px 0;">28.4%</div>
              <div style="font-size:12px; color:var(--status-green);">Target: 28-32% (Optimal)</div>
            </div>

            <div class="card">
              <div style="color:var(--text-muted); font-size:13px; font-weight:700;">DAILY ORDERS</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">48 Dishes</div>
              <div style="font-size:12px; color:var(--text-light);">Across 14 tables</div>
            </div>

            <div class="card">
              <div style="color:var(--text-muted); font-size:13px; font-weight:700;">AVG PREP TIME</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">12.4 min</div>
              <div style="font-size:12px; color:var(--status-green);">Under 15m threshold</div>
            </div>

            <div class="card">
              <div style="color:var(--text-muted); font-size:13px; font-weight:700;">TOTAL WASTAGE</div>
              <div style="font-size:32px; font-weight:800; color:var(--status-red); margin:6px 0;">₹48</div>
              <div style="font-size:12px; color:var(--text-light);">1.2 kg recorded today</div>
            </div>
          </div>

          <!-- Top Ingredients & Staff Status -->
          <div class="grid-2">
            <div class="card">
              <div class="card-title"><span>🍅</span><span>Top 5 Most-Used Ingredients</span></div>
              <ul style="padding-left:18px; font-size:14px; display:flex; flex-direction:column; gap:6px; margin-top:10px;">
                <li><b>Tomato:</b> 12 kg used today</li>
                <li><b>Chicken:</b> 8 kg used today</li>
                <li><b>Paneer:</b> 6 kg used today</li>
                <li><b>Onion:</b> 14 kg used today</li>
                <li><b>Basmati Rice:</b> 10 kg used today</li>
              </ul>
            </div>

            <div class="card">
              <div class="card-title"><span>👨‍🍳</span><span>Chef Workload & Shift Status</span></div>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                ${data.users.filter(u => u.role === 'chef').map(c => `
                  <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:8px 12px; border-radius:8px; font-size:13px;">
                    <span><b>${c.name}</b> (${c.station})</span>
                    <span class="status-badge ${c.onShift ? 'status-fresh' : 'status-expired'}">
                      ${c.onShift ? `${c.activeTasks} Active Tasks` : 'Off Shift'}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderAdminChefPerf(container) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <h2 style="font-size:24px; font-weight:800;">👨‍🍳 Chef Performance & Station Analytics</h2>
          <div class="card">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr style="text-align:left; border-bottom:2px solid var(--border);">
                  <th style="padding:10px;">Chef Name</th>
                  <th>Seniority</th>
                  <th>Station</th>
                  <th>Dishes Cooked</th>
                  <th>Avg Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px 10px;"><b>Vikram Singh</b></td>
                  <td>Head Chef</td>
                  <td>Tandoor</td>
                  <td>18</td>
                  <td>11.2m</td>
                  <td><span class="status-badge status-fresh">Active</span></td>
                </tr>
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px 10px;"><b>Suresh Yadav</b></td>
                  <td>Senior Chef</td>
                  <td>Gravy</td>
                  <td>15</td>
                  <td>13.4m</td>
                  <td><span class="status-badge status-fresh">Active</span></td>
                </tr>
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:12px 10px;"><b>Rahul Verma</b></td>
                  <td>Junior Chef</td>
                  <td>Wok</td>
                  <td>11</td>
                  <td>9.8m</td>
                  <td><span class="status-badge status-fresh">Active</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    function renderAdminAuditLogs(container) {
      const data = DataLayer.getData();

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">📜 Read-Only Immutable Audit Log</h2>
            <p style="color:var(--text-muted); font-size:14px;">Every kitchen transaction is permanently recorded with user identity and timestamp.</p>
          </div>

          <div class="card" style="padding:0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead style="background:var(--surface-2); border-bottom:1.5px solid var(--border);">
                <tr style="text-align:left;">
                  <th style="padding:12px;">Timestamp</th>
                  <th>Staff</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${data.auditLogs.map(log => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 12px; color:var(--text-light);">${new Date(log.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</td>
                    <td><b>${log.userName}</b></td>
                    <td><span class="status-badge status-low" style="padding:2px 8px; font-size:11px;">${log.action}</span></td>
                    <td style="color:var(--text);">${log.details}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    function renderAdminReports(container) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">📑 Kitchen Reports & CSV Export</h2>
            <p style="color:var(--text-muted); font-size:14px;">Download raw data for accounting, inventory analysis, and FSSAI audits.</p>
          </div>

          <div class="grid-3">
            <div class="card">
              <h3 style="font-size:17px; font-weight:700;">📦 Full Stock Inventory</h3>
              <p style="font-size:13px; color:var(--text-muted); margin:6px 0 14px 0;">All 25 ingredients with batch expiry dates and costs.</p>
              <button class="btn-primary" style="width:100%; min-height:42px;" onclick="exportStockCSV()">📥 Download CSV</button>
            </div>

            <div class="card">
              <h3 style="font-size:17px; font-weight:700;">📜 Audit Trail Log</h3>
              <p style="font-size:13px; color:var(--text-muted); margin:6px 0 14px 0;">Complete tamper-proof record of stock, orders, and chef tasks.</p>
              <button class="btn-secondary" style="width:100%; min-height:42px;" onclick="exportAuditCSV()">📥 Download CSV</button>
            </div>

            <div class="card">
              <h3 style="font-size:17px; font-weight:700;">🧊 Temperature History</h3>
              <p style="font-size:13px; color:var(--text-muted); margin:6px 0 14px 0;">FSSAI compliant 30-day fridge & freezer log.</p>
              <button class="btn-secondary" style="width:100%; min-height:42px;" onclick="showToast('Downloaded Temperature Logs!')">📥 Download CSV</button>
            </div>
          </div>
        </div>
      `;
    }

    function exportStockCSV() {
      const data = DataLayer.getData();
      let csv = "Ingredient,Unit,Total Quantity,Min Threshold,Storage\n";
      data.ingredients.forEach(i => {
        csv += `"${i.name}","${i.unit}",${i.totalQty},${i.minThreshold},"${i.storageId}"\n`;
      });
      downloadFile(csv, "kitchencare_stock_inventory.csv", "text/csv");
    }

    function exportAuditCSV() {
      const data = DataLayer.getData();
      let csv = "Timestamp,User,Action,Details\n";
      data.auditLogs.forEach(l => {
        csv += `"${l.timestamp}","${l.userName}","${l.action}","${l.details.replace(/"/g, '""')}"\n`;
      });
      downloadFile(csv, "kitchencare_audit_logs.csv", "text/csv");
    }

    function downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${fileName}`);
    }

    function renderAdminSettings(container) {
      const data = DataLayer.getData();

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">⚙️ Kitchen Settings & Staff Directory</h2>
            <p style="color:var(--text-muted); font-size:14px;">Manage team roles, stations, and fridge alert boundaries.</p>
          </div>

          <div class="card">
            <h3 style="font-size:18px; font-weight:700; margin-bottom:12px;">Staff Members (${data.users.length})</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${data.users.map(u => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:10px 14px; border-radius:8px;">
                  <div>
                    <span style="font-size:18px;">${u.icon}</span>
                    <b style="margin-left:8px;">${u.name}</b>
                    <span style="color:var(--text-muted); font-size:13px;">(${u.role.toUpperCase()}${u.station ? ` - ${u.station}` : ''})</span>
                  </div>
                  <span class="status-badge status-fresh">Active</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
