/**
 * KitchenCare Waiter Floor & Table Lifecycle Module
 * Table ordering, pass pickup queue, 38-dish menu, canvas scribble pad & billing settlement.
 */
// 7. MULTI-WAITER TABLE SELECTION, STATUS LIFECYCLE & ORDERING
    let activeTable = 'Table 1';
    let currentCart = [];
    let waiterPersonalNotes = '';
    let waiterScribbleDataUrl = null;
    let waiterSelectedTags = [];
    let waiterInputTab = 'scribble'; // 'scribble' or 'type'
    let waiterCategoryFilter = 'All';
    let waiterSearchTerm = '';
    let waiterTableFilter = 'all'; // 'all' | 'my' | 'ready' | 'served' | 'billing' | 'vacant' | 'cleaning'
    let selectedPayMethod = 'UPI';

    // Scribble Pad Engine State
    let scribbleIsDrawing = false;
    let scribbleColor = '#0f172a';
    let scribbleWidth = 3;
    let scribbleIsEraser = false;
    let scribbleHistory = [];

    // Switch active waiter seamlessly
    function switchActiveWaiter(waiterId) {
      const data = DataLayer.getData();
      const waiter = data.users.find(u => u.id === waiterId);
      if (waiter) {
        currentUser = waiter;
        document.getElementById('currentUserName').textContent = waiter.name;
        document.getElementById('currentRoleTitle').textContent = 'WAITER';
        const quickSwitch = document.getElementById('quickRoleSwitch');
        if (quickSwitch) quickSwitch.value = waiterId;
        showToast(`Switched active server to ${waiter.name}`, '🍽️');
        renderCurrentScreen();
      }
    }

    function renderWaiterTableSelect(container) {
      const data = DataLayer.getData();
      const tables = data.tables || DataLayer.getDefaultTables();
      const allOrders = data.orders || [];

      // Find ready orders needing waiter pickup at pass
      const readyOrders = allOrders.filter(o => o.status === 'ready');
      
      // Calculate filter counts
      const myTablesCount = tables.filter(t => t.waiterName === currentUser.name && t.status !== 'vacant').length;
      const readyCount = tables.filter(t => t.status === 'ready').length;
      const servedCount = tables.filter(t => t.status === 'served').length;
      const billingCount = tables.filter(t => t.status === 'billing').length;
      const vacantCount = tables.filter(t => t.status === 'vacant').length;
      const cleaningCount = tables.filter(t => t.status === 'cleaning').length;

      // Filtered tables list
      let filteredTables = tables;
      if (waiterTableFilter === 'my') {
        filteredTables = tables.filter(t => t.waiterName === currentUser.name && t.status !== 'vacant');
      } else if (waiterTableFilter === 'ready') {
        filteredTables = tables.filter(t => t.status === 'ready');
      } else if (waiterTableFilter === 'served') {
        filteredTables = tables.filter(t => t.status === 'served');
      } else if (waiterTableFilter === 'billing') {
        filteredTables = tables.filter(t => t.status === 'billing');
      } else if (waiterTableFilter === 'vacant') {
        filteredTables = tables.filter(t => t.status === 'vacant');
      } else if (waiterTableFilter === 'cleaning') {
        filteredTables = tables.filter(t => t.status === 'cleaning');
      }

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Top Bar: Multiple Waiters on Duty Switcher & Stats -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; background:var(--surface); padding:16px 20px; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:26px;">🍽️</span>
                <h2 style="font-size:24px; font-weight:800; color:var(--text);">Dining Tables & Service Floor</h2>
              </div>
              <p style="color:var(--text-muted); font-size:14px; margin-top:2px;">
                All servers have shared access to tables. Pick up ready food, update dining progress, and settle bills.
              </p>
            </div>

            <!-- Waiter Switcher Pill -->
            <div style="display:flex; align-items:center; gap:10px; background:var(--surface-2); padding:6px 14px; border-radius:24px; border:1.5px solid var(--border);">
              <span style="font-size:13px; font-weight:700; color:var(--text-muted);">Current Server:</span>
              <select onchange="switchActiveWaiter(this.value)" style="min-height:36px; padding:2px 12px; font-size:14px; font-weight:800; border-radius:18px; border:1px solid var(--border); background:var(--surface); color:var(--primary); cursor:pointer;">
                ${data.users.filter(u => u.role === 'waiter').map(w => `
                  <option value="${w.id}" ${currentUser.id === w.id ? 'selected' : ''}>🍽️ ${w.name} (PIN: ${w.pin})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- 🚨 HIGH PRIORITY: FOOD READY AT PASS PICKUP QUEUE -->
          ${readyOrders.length > 0 ? `
            <div class="card" style="border:2px solid var(--status-green); background: linear-gradient(135deg, rgba(22,163,74,0.12) 0%, rgba(255,255,255,0.95) 100%); padding:18px; box-shadow:0 8px 24px rgba(22,163,74,0.15);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:28px;">🔔</span>
                  <div>
                    <h3 style="font-size:18px; font-weight:800; color:var(--status-green);">
                      FOOD READY FOR PICKUP AT PASS (${readyOrders.length} ${readyOrders.length === 1 ? 'Table' : 'Tables'})
                    </h3>
                    <p style="font-size:13px; color:var(--text-muted);">Chef has finished plating. Pick up and deliver to guests immediately.</p>
                  </div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
                ${readyOrders.map(ord => `
                  <div style="background:var(--surface); border:1.5px solid var(--status-green); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:18px; font-weight:800; color:var(--text);">${ord.table}</span>
                      <span class="status-badge status-fresh" style="font-size:12px;">Plated by Chef ${ord.chefName}</span>
                    </div>

                    <div style="font-size:13px; color:var(--text); font-weight:600; background:var(--surface-2); padding:6px 10px; border-radius:6px;">
                      ${ord.dishes.map(d => `${d.qty}x ${d.name}`).join(', ')}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                      <span style="font-size:12px; color:var(--text-muted);">Assigned: <b>${ord.waiterName || 'Any Server'}</b></span>
                      <button class="btn-primary" style="min-height:38px; padding:6px 14px; font-size:13px; font-weight:700;" onclick="waiterMarkOrderServed('${ord.id}')">
                        🍽️ Pick Up & Mark Served
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Table Filter Pills -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'all' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}" onclick="waiterTableFilter='all'; renderCurrentScreen();">
              All Tables (${tables.length})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'my' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}" onclick="waiterTableFilter='my'; renderCurrentScreen();">
              👤 My Active Tables (${myTablesCount})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'ready' ? 'background:var(--status-green); color:#fff; border-color:var(--status-green); font-weight:700;' : ''}" onclick="waiterTableFilter='ready'; renderCurrentScreen();">
              🔔 Pickup Ready (${readyCount})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'served' ? 'background:#3b82f6; color:#fff; border-color:#3b82f6; font-weight:700;' : ''}" onclick="waiterTableFilter='served'; renderCurrentScreen();">
              🍽️ Dining (${servedCount})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'billing' ? 'background:var(--status-amber); color:#fff; border-color:var(--status-amber); font-weight:700;' : ''}" onclick="waiterTableFilter='billing'; renderCurrentScreen();">
              🧾 Bill / Pay (${billingCount})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'vacant' ? 'background:var(--text); color:#fff; border-color:var(--text); font-weight:700;' : ''}" onclick="waiterTableFilter='vacant'; renderCurrentScreen();">
              ⚪ Vacant (${vacantCount})
            </button>
            <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterTableFilter === 'cleaning' ? 'background:#a855f7; color:#fff; border-color:#a855f7; font-weight:700;' : ''}" onclick="waiterTableFilter='cleaning'; renderCurrentScreen();">
              🧹 Cleaning (${cleaningCount})
            </button>
          </div>

          <!-- Dynamic Tables Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
            ${filteredTables.map(tbl => {
              const activeOrder = allOrders.find(o => o.table === tbl.id && o.status !== 'completed' && o.status !== 'paid');
              const status = tbl.status || (activeOrder ? activeOrder.status : 'vacant');

              // Status styles & labels
              let statusLabel = '⚪ Vacant';
              let badgeClass = 'status-badge';
              let borderStyle = 'border:2px solid var(--border);';
              let cardBg = 'background:var(--surface);';

              if (status === 'seated') {
                statusLabel = '👥 Guests Seated';
                badgeClass = 'status-badge status-soon';
                borderStyle = 'border:2px solid var(--status-amber);';
                cardBg = 'background:rgba(217,119,6,0.04);';
              } else if (status === 'cooking' || status === 'sent') {
                statusLabel = '🍳 Cooking in Kitchen';
                badgeClass = 'status-badge status-soon';
                borderStyle = 'border:2px solid var(--status-amber);';
                cardBg = 'background:rgba(217,119,6,0.06);';
              } else if (status === 'ready') {
                statusLabel = '🔔 Food Ready (Pickup!)';
                badgeClass = 'status-badge status-fresh';
                borderStyle = 'border:2px solid var(--status-green);';
                cardBg = 'background:rgba(22,163,74,0.1);';
              } else if (status === 'served') {
                statusLabel = '🍽️ Food Served (Dining)';
                badgeClass = 'status-badge status-fresh';
                borderStyle = 'border:2px solid #3b82f6;';
                cardBg = 'background:rgba(59,130,246,0.05);';
              } else if (status === 'billing') {
                statusLabel = '🧾 Bill Requested';
                badgeClass = 'status-badge status-soon';
                borderStyle = 'border:2px solid var(--status-amber);';
                cardBg = 'background:rgba(217,119,6,0.1);';
              } else if (status === 'cleaning') {
                statusLabel = '🧹 Needs Cleaning';
                badgeClass = 'status-badge status-low';
                borderStyle = 'border:2px solid #a855f7;';
                cardBg = 'background:rgba(168,85,247,0.06);';
              }

              return `
                <div class="card" style="padding:16px; display:flex; flex-direction:column; justify-content:space-between; gap:12px; border-radius:var(--radius-lg); ${borderStyle} ${cardBg} box-shadow:0 4px 14px rgba(0,0,0,0.04); transition:all 0.2s;">
                  <div>
                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:24px;">🪑</span>
                        <div>
                          <span style="font-size:18px; font-weight:800; color:var(--text);">${tbl.name || tbl.id}</span>
                          <span style="font-size:12px; color:var(--text-muted); display:block;">Cap: ${tbl.capacity || 4} Guests</span>
                        </div>
                      </div>
                      <span class="${badgeClass}" style="font-size:11px; padding:3px 8px;">${statusLabel}</span>
                    </div>

                    <!-- Server Info -->
                    <div style="font-size:12px; color:var(--text-muted); margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                      <span>Server: <b style="color:var(--text);">${tbl.waiterName || (activeOrder ? activeOrder.waiterName : 'None')}</b></span>
                      ${activeOrder ? `<span style="font-weight:700; color:var(--primary);">₹${activeOrder.dishes.reduce((sum, d) => sum + ((d.price || 150) * d.qty), 0)}</span>` : ''}
                    </div>

                    <!-- Order Preview if any -->
                    ${activeOrder ? `
                      <div style="background:var(--surface-2); padding:8px 10px; border-radius:8px; font-size:12px; margin-top:6px; color:var(--text); max-height:48px; overflow:hidden; text-overflow:ellipsis;">
                        <b>Dishes:</b> ${activeOrder.dishes.map(d => `${d.qty}x ${d.name}`).join(', ')}
                      </div>
                    ` : ''}
                  </div>

                  <!-- Quick Action Buttons on Card -->
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    ${status === 'ready' && activeOrder ? `
                      <button class="btn-primary" style="min-height:40px; font-size:13px; font-weight:800;" onclick="event.stopPropagation(); waiterMarkOrderServed('${activeOrder.id}')">
                        🍽️ Mark Served
                      </button>
                    ` : (status === 'served' || status === 'billing') && activeOrder ? `
                      <div style="display:flex; gap:6px;">
                        <button class="btn-secondary" style="flex:1; min-height:38px; font-size:12px; font-weight:700;" onclick="event.stopPropagation(); selectWaiterTable('${tbl.id}')">
                          ➕ Add More
                        </button>
                        <button class="btn-primary" style="flex:1; min-height:38px; font-size:12px; font-weight:700; background:var(--status-amber); color:#fff;" onclick="event.stopPropagation(); openTableBillModal('${tbl.id}')">
                          💳 Bill & Clear
                        </button>
                      </div>
                    ` : status === 'cleaning' ? `
                      <button class="btn-secondary" style="min-height:38px; font-size:13px; font-weight:700; border-color:#a855f7; color:#7e22ce;" onclick="event.stopPropagation(); setTableStatus('${tbl.id}', 'vacant')">
                        ✨ Mark Cleaned (Make Vacant)
                      </button>
                    ` : status === 'vacant' ? `
                      <div style="display:flex; gap:6px;">
                        <button class="btn-secondary" style="flex:1; min-height:38px; font-size:12px;" onclick="event.stopPropagation(); setTableStatus('${tbl.id}', 'seated')">
                          👥 Seat Guests
                        </button>
                        <button class="btn-primary" style="flex:1; min-height:38px; font-size:12px;" onclick="event.stopPropagation(); selectWaiterTable('${tbl.id}')">
                          ➕ Take Order
                        </button>
                      </div>
                    ` : `
                      <button class="btn-secondary" style="min-height:38px; font-size:13px; font-weight:700;" onclick="event.stopPropagation(); selectWaiterTable('${tbl.id}')">
                        📋 View Table Details
                      </button>
                    `}

                    <!-- Manual Quick Status Changer Dropdown -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; border-top:1px solid var(--border);">
                      <span style="font-size:11px; color:var(--text-muted);">Change Status:</span>
                      <select onchange="setTableStatus('${tbl.id}', this.value)" style="min-height:28px; width:auto; padding:2px 6px; font-size:11px; font-weight:700; border-radius:12px; border:1px solid var(--border); background:var(--surface);">
                        <option value="vacant" ${status === 'vacant' ? 'selected' : ''}>⚪ Vacant</option>
                        <option value="seated" ${status === 'seated' ? 'selected' : ''}>👥 Seated</option>
                        <option value="cooking" ${status === 'cooking' ? 'selected' : ''}>🍳 In Kitchen</option>
                        <option value="ready" ${status === 'ready' ? 'selected' : ''}>🔔 Food Ready</option>
                        <option value="served" ${status === 'served' ? 'selected' : ''}>🍽️ Served (Dining)</option>
                        <option value="billing" ${status === 'billing' ? 'selected' : ''}>🧾 Bill Requested</option>
                        <option value="cleaning" ${status === 'cleaning' ? 'selected' : ''}>🧹 Needs Cleaning</option>
                      </select>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function selectWaiterTable(tblId) {
      activeTable = tblId;
      const data = DataLayer.getData();
      const table = (data.tables || []).find(t => t.id === tblId || t.name === tblId);
      const activeOrder = (data.orders || []).find(o => o.table === tblId && o.status !== 'completed' && o.status !== 'paid');

      // If table is vacant, assign current waiter and open new order menu
      if (table && table.status === 'vacant') {
        table.status = 'seated';
        table.waiterName = currentUser.name;
        DataLayer.saveData(data);
      }

      // If there is already an active order, open the Table Details / Running Tab view
      if (activeOrder) {
        currentCart = [];
        waiterPersonalNotes = '';
        waiterScribbleDataUrl = null;
        waiterSelectedTags = [];
        currentScreen = 'waiter_table_detail';
        renderCurrentScreen();
      } else {
        currentCart = [];
        waiterPersonalNotes = '';
        waiterScribbleDataUrl = null;
        waiterSelectedTags = [];
        waiterInputTab = 'scribble';
        waiterCategoryFilter = 'All';
        waiterSearchTerm = '';
        currentScreen = 'waiter_menu';
        renderCurrentScreen();
      }
    }

    // ACTIVE TABLE DETAIL & RUNNING TAB VIEW
    function renderTableDetailView(container) {
      const data = DataLayer.getData();
      const table = (data.tables || []).find(t => t.id === activeTable || t.name === activeTable) || { id: activeTable, status: 'cooking' };
      const activeOrder = (data.orders || []).find(o => o.table === activeTable && o.status !== 'completed' && o.status !== 'paid');

      if (!activeOrder) {
        // No active order, go back to table select
        renderWaiterMenu(container);
        return;
      }

      const subtotal = activeOrder.dishes.reduce((sum, d) => sum + ((d.price || 150) * d.qty), 0);
      const gst = Math.round(subtotal * 0.05);
      const grandTotal = subtotal + gst;

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px;">
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); padding:16px 20px; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow);">
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:28px;">🪑</span>
                <h2 style="font-size:24px; font-weight:800; color:var(--text);">${activeTable} Management</h2>
                <span class="status-badge status-fresh" style="font-size:13px;">${(table.status || activeOrder.status).toUpperCase()}</span>
              </div>
              <p style="color:var(--text-muted); font-size:13px; margin-top:2px;">
                Assigned Waiter: <b>${activeOrder.waiterName || currentUser.name}</b> | Current Server: <b>${currentUser.name}</b>
              </p>
            </div>

            <button class="btn-outline" style="min-height:42px; padding:6px 14px; font-size:14px;" onclick="currentScreen='waiter_tables'; renderCurrentScreen();">
              ⬅️ All Tables
            </button>
          </div>

          <!-- TABLE STATUS CONTROLS BAR -->
          <div class="card" style="padding:14px 18px; display:flex; flex-direction:column; gap:10px; background:var(--surface-2); border:1.5px solid var(--border);">
            <div style="font-size:13px; font-weight:800; color:var(--text-muted);">
              🔄 UPDATE TABLE STATUS:
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'seated' ? 'background:var(--primary); color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'seated')">
                👥 Seated
              </button>
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'cooking' ? 'background:var(--status-amber); color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'cooking')">
                🍳 In Kitchen
              </button>
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'ready' ? 'background:var(--status-green); color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'ready')">
                🔔 Food Ready at Pass
              </button>
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'served' ? 'background:#3b82f6; color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'served')">
                🍽️ Served (Dining)
              </button>
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'billing' ? 'background:var(--status-amber); color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'billing')">
                🧾 Bill Requested
              </button>
              <button class="btn-secondary" style="min-height:38px; padding:6px 14px; font-size:13px; ${table.status === 'cleaning' ? 'background:#a855f7; color:#fff; font-weight:700;' : ''}" onclick="setTableStatus('${activeTable}', 'cleaning')">
                🧹 Needs Cleaning
              </button>
              <button class="btn-outline" style="min-height:38px; padding:6px 14px; font-size:13px; color:var(--status-red); border-color:#fca5a5;" onclick="clearTableDirectly('${activeTable}')">
                ⚪ Clear Table (Make Vacant)
              </button>
            </div>
          </div>

          <!-- PRIMARY ACTION BANNER (IF FOOD IS READY AT PASS) -->
          ${activeOrder.status === 'ready' || table.status === 'ready' ? `
            <div class="card" style="border:2px solid var(--status-green); background:linear-gradient(135deg, rgba(22,163,74,0.15) 0%, rgba(255,255,255,0.95) 100%); padding:18px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <span style="font-size:32px;">🔔</span>
                  <div>
                    <h3 style="font-size:18px; font-weight:800; color:var(--status-green);">FOOD IS PLATED AT THE KITCHEN PASS!</h3>
                    <p style="font-size:13px; color:var(--text-muted);">Plated by Chef ${activeOrder.chefName}. Deliver to ${activeTable} now.</p>
                  </div>
                </div>

                <button class="btn-primary" style="min-height:48px; padding:8px 24px; font-size:15px; font-weight:800;" onclick="waiterMarkOrderServed('${activeOrder.id}')">
                  🍽️ Pick Up & Mark Served to Table
                </button>
              </div>
            </div>
          ` : ''}

          <!-- ITEMS CURRENTLY ORDERED (RUNNING KOT) -->
          <div class="card" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px;">
              <h3 style="font-size:18px; font-weight:800; color:var(--text);">📋 Active Kitchen Order Ticket (KOT)</h3>
              <span style="font-size:17px; font-weight:800; color:var(--primary);">Running Total: ₹${subtotal}</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              ${activeOrder.dishes.map(d => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:10px 14px; border-radius:10px; border:1px solid var(--border);">
                  <div>
                    <span style="font-size:15px; font-weight:800;">${d.qty}x ${d.name}</span>
                    ${d.notes ? `<div style="font-size:12px; color:var(--status-red); font-weight:600; margin-top:2px;">⚠️ Note: ${d.notes}</div>` : ''}
                  </div>
                  <span style="font-weight:700; font-size:14px;">₹${(d.price || 150) * d.qty}</span>
                </div>
              `).join('')}
            </div>

            <!-- Attached Waiter Notes & Scribble -->
            ${(activeOrder.tags && activeOrder.tags.length > 0) || activeOrder.waiterNotes || activeOrder.scribbleImage ? `
              <div style="background:#fffdfa; border:1.5px dashed var(--border); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                ${activeOrder.tags && activeOrder.tags.length > 0 ? `
                  <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${activeOrder.tags.map(t => `<span style="background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:700; padding:2px 8px; border-radius:12px; border:1px solid var(--primary-border);">${t}</span>`).join('')}
                  </div>
                ` : ''}
                ${activeOrder.waiterNotes ? `
                  <div style="font-size:13px; font-weight:600; color:var(--text);">
                    📝 <b>Typed Notes:</b> ${activeOrder.waiterNotes}
                  </div>
                ` : ''}
                ${activeOrder.scribbleImage ? `
                  <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${activeOrder.scribbleImage}" alt="Scribble Note" style="height:50px; border-radius:6px; border:1px solid var(--border);">
                    <button class="kot-thumbnail-btn" style="padding:4px 10px; font-size:12px;" onclick="openScribbleLightbox('${activeOrder.id}')">
                      👁️ Enlarge Handwritten KOT
                    </button>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- ACTION BUTTONS: ADD MORE OR BILL -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px;">
              <button class="btn-secondary" style="min-height:48px; font-size:15px; font-weight:800;" onclick="openAddRunningItems()">
                ➕ Add More Items (Running KOT)
              </button>

              <button class="btn-primary" style="min-height:48px; font-size:15px; font-weight:800; background:var(--status-amber); color:#fff;" onclick="openTableBillModal('${activeTable}')">
                💳 Settle Bill & Clear Table
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function openAddRunningItems() {
      currentCart = [];
      waiterPersonalNotes = '';
      waiterScribbleDataUrl = null;
      waiterSelectedTags = [];
      currentScreen = 'waiter_menu';
      renderCurrentScreen();
    }

    function clearTableDirectly(tableId) {
      if (confirm(`Clear ${tableId} and make it Vacant immediately? Any active orders will be archived.`)) {
        setTableStatus(tableId, 'vacant');
      }
    }

    function setTableStatus(tableId, newStatus) {
      const data = DataLayer.getData();
      const table = (data.tables || []).find(t => t.id === tableId || t.name === tableId);
      if (!table) return;

      const oldStatus = table.status || 'vacant';
      table.status = newStatus;

      if (newStatus === 'vacant') {
        table.waiterName = null;
        table.guestsCount = 0;
        // Complete any active orders
        const ord = (data.orders || []).find(o => o.table === tableId && o.status !== 'completed' && o.status !== 'paid');
        if (ord) {
          ord.status = 'completed';
          ord.completedAt = new Date().toISOString();
        }
      } else if (!table.waiterName && currentUser.role === 'waiter') {
        table.waiterName = currentUser.name;
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Table Status Changed", `${tableId}: ${oldStatus.toUpperCase()} ➔ ${newStatus.toUpperCase()}`);
      showToast(`${tableId} status updated to ${newStatus.toUpperCase()}`);
      renderCurrentScreen();
    }

    function waiterMarkOrderServed(orderId) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (!order) return;

      order.status = 'served';
      order.servedAt = new Date().toISOString();
      order.servedBy = currentUser.name;

      const table = (data.tables || []).find(t => t.id === order.table || t.name === order.table);
      if (table) {
        table.status = 'served';
        table.waiterName = currentUser.name;
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Order Served to Table", `${order.table} dishes picked up at pass and served to guests by ${currentUser.name}.`);

      if (window.AudioEngine && AudioEngine.beep) {
        AudioEngine.beep(523, 150);
      }

      showToast(`Food served to ${order.table}! Guests are now dining.`, '🍽️');
      renderCurrentScreen();
    }

    // BILLING & CLEAR TABLE MODAL
    function openTableBillModal(tableId) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.table === tableId && o.status !== 'completed' && o.status !== 'paid');
      const table = (data.tables || []).find(t => t.id === tableId || t.name === tableId);
      if (!order) {
        showToast(`No active bill found for ${tableId}`, '⚠️');
        return;
      }

      const subtotal = order.dishes.reduce((sum, d) => sum + ((d.price || 150) * d.qty), 0);
      const gst = Math.round(subtotal * 0.05);
      const grandTotal = subtotal + gst;

      const modal = document.getElementById('modalContainer');
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal-card" style="max-width:540px;" onclick="event.stopPropagation()">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px;">
              <div>
                <h3 style="font-size:22px; font-weight:800; color:var(--text);">🧾 Bill & Settle: ${tableId}</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">
                  Server: <b>${order.waiterName || currentUser.name}</b> | Order #${order.id.slice(-4)}
                </p>
              </div>
              <button class="btn-secondary" style="min-height:36px; padding:4px 12px;" onclick="closeModal()">✕</button>
            </div>

            <!-- Itemized Receipt -->
            <div style="background:var(--surface-2); padding:14px; border-radius:10px; border:1px solid var(--border); display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:12px; font-weight:700; color:var(--text-muted); border-bottom:1px dashed var(--border); padding-bottom:6px; display:flex; justify-content:space-between;">
                <span>ITEM</span>
                <span>QTY × PRICE = TOTAL</span>
              </div>
              ${order.dishes.map(d => {
                const unitPrice = d.price || 150;
                const lineTotal = unitPrice * d.qty;
                return `
                  <div style="display:flex; justify-content:space-between; font-size:14px; padding:3px 0;">
                    <span><b>${d.qty}x</b> ${d.name}</span>
                    <span style="font-weight:700;">₹${lineTotal}</span>
                  </div>
                `;
              }).join('')}
              <div style="border-top:1px dashed var(--border); padding-top:8px; margin-top:4px; display:flex; flex-direction:column; gap:4px; font-size:14px;">
                <div style="display:flex; justify-content:space-between; color:var(--text-muted);">
                  <span>Subtotal:</span>
                  <span>₹${subtotal}</span>
                </div>
                <div style="display:flex; justify-content:space-between; color:var(--text-muted);">
                  <span>Restaurant GST (5%):</span>
                  <span>₹${gst}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:800; color:var(--primary); padding-top:4px; border-top:1px solid var(--border);">
                  <span>Grand Total Due:</span>
                  <span>₹${grandTotal}</span>
                </div>
              </div>
            </div>

            <!-- Payment Method Selection -->
            <div>
              <label style="font-weight:700; font-size:13px; color:var(--text); display:block; margin-bottom:8px;">
                💳 Select Payment Mode:
              </label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                <button id="payModeUPI" class="btn-secondary" style="border:2px solid var(--primary); background:var(--primary-light); color:var(--primary); font-weight:700;" onclick="selectPaymentMethod('UPI')">
                  📱 UPI / QR
                </button>
                <button id="payModeCash" class="btn-secondary" onclick="selectPaymentMethod('Cash')">
                  💵 Cash
                </button>
                <button id="payModeCard" class="btn-secondary" onclick="selectPaymentMethod('Card')">
                  💳 Card / POS
                </button>
              </div>
            </div>

            <!-- Settlement Actions -->
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
              <button class="btn-primary btn-action-lg" onclick="confirmPaymentAndClearTable('${order.id}', '${tableId}', ${grandTotal})">
                ✅ Paid ₹${grandTotal} & Clear Table (Make Vacant)
              </button>
              <button class="btn-secondary" style="min-height:44px; font-weight:700;" onclick="confirmPaymentAndMarkDirty('${order.id}', '${tableId}', ${grandTotal})">
                🧹 Paid ₹${grandTotal} & Mark for Cleaning (Busboy)
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function selectPaymentMethod(mode) {
      selectedPayMethod = mode;
      ['UPI', 'Cash', 'Card'].forEach(m => {
        const btn = document.getElementById('payMode' + m);
        if (btn) {
          if (m === mode) {
            btn.style.border = '2px solid var(--primary)';
            btn.style.background = 'var(--primary-light)';
            btn.style.color = 'var(--primary)';
            btn.style.fontWeight = '700';
          } else {
            btn.style.border = '1px solid var(--border)';
            btn.style.background = 'var(--surface-2)';
            btn.style.color = 'var(--text)';
            btn.style.fontWeight = 'normal';
          }
        }
      });
    }

    function confirmPaymentAndClearTable(orderId, tableId, amount) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (order) {
        order.status = 'completed';
        order.paidAt = new Date().toISOString();
        order.paymentMethod = selectedPayMethod;
        order.totalAmount = amount;
      }

      const table = (data.tables || []).find(t => t.id === tableId || t.name === tableId);
      if (table) {
        table.status = 'vacant';
        table.waiterName = null;
        table.guestsCount = 0;
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Payment Received & Table Cleared", `${tableId}: Paid ₹${amount} via ${selectedPayMethod}. Table is now VACANT and ready for new guests.`);

      closeModal();
      showToast(`Payment received for ${tableId}! Table is now VACANT.`, '✅');
      currentScreen = 'waiter_tables';
      renderCurrentScreen();
    }

    function confirmPaymentAndMarkDirty(orderId, tableId, amount) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (order) {
        order.status = 'completed';
        order.paidAt = new Date().toISOString();
        order.paymentMethod = selectedPayMethod;
        order.totalAmount = amount;
      }

      const table = (data.tables || []).find(t => t.id === tableId || t.name === tableId);
      if (table) {
        table.status = 'cleaning';
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Payment Received (Needs Cleaning)", `${tableId}: Paid ₹${amount} via ${selectedPayMethod}. Busboy alerted to wipe table.`);

      closeModal();
      showToast(`${tableId} paid! Marked for cleaning.`, '🧹');
      currentScreen = 'waiter_tables';
      renderCurrentScreen();
    }

    const QUICK_DIETARY_TAGS = [
      '🌶️ Extra Spicy',
      '🟢 Jain (No Onion/Garlic)',
      '👶 Mild / Kid Friendly',
      '🫓 Serve Breads Piping Hot',
      '🥗 Extra Onion & Mint Chutney',
      '🌾 Gluten-Free',
      '🧂 Less Salt / Oil',
      '⚡ Rush Order (Guest in Hurry)',
      '🎂 Birthday / Anniversary'
    ];

    function toggleWaiterTag(tag) {
      const idx = waiterSelectedTags.indexOf(tag);
      if (idx > -1) {
        waiterSelectedTags.splice(idx, 1);
      } else {
        waiterSelectedTags.push(tag);
      }
      renderWaiterMenu(document.getElementById('appContent'));
    }

    function setWaiterInputTab(tab) {
      waiterInputTab = tab;
      renderWaiterMenu(document.getElementById('appContent'));
    }

    function renderWaiterMenu(container) {
      const data = DataLayer.getData();
      
      // Filter dishes
      let filteredDishes = data.dishes;
      if (waiterCategoryFilter !== 'All') {
        filteredDishes = filteredDishes.filter(d => {
          if (waiterCategoryFilter === 'Starters') return d.category === 'Starters';
          if (waiterCategoryFilter === 'Curries') return d.category === 'Mains' && d.station === 'Gravy' && !d.name.includes('Rice') && !d.name.includes('Biryani');
          if (waiterCategoryFilter === 'Biryani & Rice') return d.name.includes('Rice') || d.name.includes('Biryani');
          if (waiterCategoryFilter === 'Breads') return d.category === 'Breads';
          if (waiterCategoryFilter === 'Indo-Chinese') return d.station === 'Wok';
          if (waiterCategoryFilter === 'Desserts & Drinks') return d.category === 'Desserts' || d.category === 'Beverages' || d.category === 'Accompaniments';
          return true;
        });
      }
      if (waiterSearchTerm) {
        filteredDishes = filteredDishes.filter(d => d.name.toLowerCase().includes(waiterSearchTerm.toLowerCase()));
      }

      const stations = ['All', 'Starters', 'Curries', 'Biryani & Rice', 'Breads', 'Indo-Chinese', 'Desserts & Drinks'];

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px;">
          <!-- Top Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); padding:16px 20px; border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:24px;">🪑</span>
                <h2 style="font-size:22px; font-weight:800; color:var(--text);">${activeTable} Order</h2>
                <span class="status-badge" style="background:var(--primary-light); color:var(--primary); font-size:12px;">Active KOT</span>
              </div>
              <p style="color:var(--text-muted); font-size:13px; margin-top:2px;">Select dishes, add handwritten scribble notes or typed instructions.</p>
            </div>
            <button class="btn-outline" style="min-height:42px; padding:6px 14px; font-size:14px;" onclick="currentScreen='waiter_tables'; renderCurrentScreen();">
              ⬅️ Change Table
            </button>
          </div>

          <!-- Search & Station Category Filter -->
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input type="text" placeholder="🔍 Search menu dishes (e.g. Paneer, Roti, Biryani)..." value="${waiterSearchTerm}" 
                style="flex:1; min-width:240px; min-height:44px; font-size:14px; border-radius:var(--radius-sm);" 
                oninput="waiterSearchTerm=this.value; renderWaiterMenu(document.getElementById('appContent'))">
              <div style="display:flex; gap:6px; overflow-x:auto;">
                ${stations.map(st => `
                  <button class="btn-secondary" style="min-height:44px; padding:6px 14px; font-size:13px; border-radius:20px; ${waiterCategoryFilter === st ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}" 
                    onclick="waiterCategoryFilter='${st}'; renderWaiterMenu(document.getElementById('appContent'))">
                    ${st}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Dishes Catalog Grid -->
          <div class="grid-2">
            ${filteredDishes.map(d => {
              const inCart = currentCart.find(c => c.dishId === d.id);
              return `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:16px; border:1.5px solid ${inCart ? 'var(--primary)' : 'var(--border)'}; background:${inCart ? 'rgba(22,163,74,0.03)' : 'var(--surface)'};">
                  <div style="display:flex; align-items:center; gap:14px;">
                    <span style="font-size:38px;">${d.icon}</span>
                    <div>
                      <h4 style="font-size:17px; font-weight:800; color:var(--text);">${d.name}</h4>
                      <div style="font-size:13px; color:var(--text-muted); margin:2px 0;">Station: <span style="font-weight:600;">${d.station}</span></div>
                      <div style="font-size:15px; font-weight:800; color:var(--primary);">₹${d.costPerPortion * 2}</div>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:8px;">
                    ${inCart ? `
                      <div style="display:flex; align-items:center; gap:6px; background:var(--surface-2); padding:4px 8px; border-radius:12px; border:1px solid var(--border);">
                        <button class="btn-secondary" style="width:32px; height:32px; min-height:32px; padding:0; font-size:16px;" onclick="decrementCartItem('${d.id}')">−</button>
                        <span style="font-weight:800; min-width:24px; text-align:center; font-size:15px;">${inCart.qty}</span>
                        <button class="btn-primary" style="width:32px; height:32px; min-height:32px; padding:0; font-size:16px;" onclick="addToCart('${d.id}')">+</button>
                      </div>
                    ` : `
                      <button class="btn-primary" style="min-height:42px; padding:8px 18px; font-size:14px; border-radius:var(--radius-sm);" onclick="addToCart('${d.id}')">
                        ➕ Add
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Add Off-Menu Custom Dish Entry -->
          <div class="card" style="background:var(--surface); border:1.5px dashed var(--border); padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-weight:800; font-size:14px; display:flex; align-items:center; gap:6px;">
                <span>⭐</span> Add Custom / Off-Menu Request
              </span>
              <span style="font-size:12px; color:var(--text-muted);">For special dishes not in standard menu</span>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input type="text" id="customDishNameInput" placeholder="Dish name (e.g. Warm Lime Water, Ginger Tea Less Sugar, Kid Khichdi)" style="flex:2; min-width:220px; min-height:44px; font-size:14px;">
              <input type="number" id="customDishPriceInput" placeholder="Price (₹)" value="100" style="width:110px; min-height:44px; font-size:14px;">
              <button class="btn-secondary" style="min-height:44px; padding:0 18px; font-size:14px; font-weight:700;" onclick="addCustomDishToCart()">
                ➕ Add Custom Item
              </button>
            </div>
          </div>

          <!-- WAITER PERSONAL INPUTS: SCRIBBLE PAD & TYPING OPTION -->
          <div class="kot-notepad-card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="font-size:18px; font-weight:800; display:flex; align-items:center; gap:8px;">
                  <span>📝</span> Waiter KOT Instructions & Guest Notes
                </h3>
                <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">
                  Scribble by hand or type special table instructions for the chef.
                </p>
              </div>

              <!-- Tab Switcher -->
              <div style="display:flex; background:var(--surface-2); padding:4px; border-radius:12px; border:1px solid var(--border); gap:4px;">
                <button class="tab-switch-btn ${waiterInputTab === 'scribble' ? 'active' : ''}" style="border:none;" onclick="setWaiterInputTab('scribble')">
                  ✍️ Scribble Pad
                </button>
                <button class="tab-switch-btn ${waiterInputTab === 'type' ? 'active' : ''}" style="border:none;" onclick="setWaiterInputTab('type')">
                  ⌨️ Type Instructions
                </button>
              </div>
            </div>

            <!-- Tab Content 1: Handwritten Scribble Pad -->
            <div id="scribbleTabContent" style="display:${waiterInputTab === 'scribble' ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
              <div class="kot-toolbar">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:12px; font-weight:700; color:var(--text-muted);">Pen Color:</span>
                  <button class="kot-color-dot ${scribbleColor === '#0f172a' && !scribbleIsEraser ? 'active' : ''}" style="background:#0f172a;" title="Navy Ink" onclick="selectScribbleColor('#0f172a')"></button>
                  <button class="kot-color-dot ${scribbleColor === '#dc2626' && !scribbleIsEraser ? 'active' : ''}" style="background:#dc2626;" title="Red Alert / Urgent" onclick="selectScribbleColor('#dc2626')"></button>
                  <button class="kot-color-dot ${scribbleColor === '#16a34a' && !scribbleIsEraser ? 'active' : ''}" style="background:#16a34a;" title="Green Veg / Jain" onclick="selectScribbleColor('#16a34a')"></button>
                  <button class="kot-color-dot ${scribbleColor === '#f59e0b' && !scribbleIsEraser ? 'active' : ''}" style="background:#f59e0b;" title="Highlighter Amber" onclick="selectScribbleColor('#f59e0b')"></button>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:12px; font-weight:700; color:var(--text-muted);">Size:</span>
                  <button class="btn-secondary" style="min-height:30px; padding:2px 8px; font-size:12px; ${scribbleWidth === 2 && !scribbleIsEraser ? 'background:var(--primary); color:#fff;' : ''}" onclick="selectScribbleWidth(2)">Fine</button>
                  <button class="btn-secondary" style="min-height:30px; padding:2px 8px; font-size:12px; ${scribbleWidth === 4 && !scribbleIsEraser ? 'background:var(--primary); color:#fff;' : ''}" onclick="selectScribbleWidth(4)">Med</button>
                  <button class="btn-secondary" style="min-height:30px; padding:2px 8px; font-size:12px; ${scribbleWidth === 7 && !scribbleIsEraser ? 'background:var(--primary); color:#fff;' : ''}" onclick="selectScribbleWidth(7)">Thick</button>
                </div>

                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="btn-secondary" style="min-height:32px; padding:4px 10px; font-size:12px; ${scribbleIsEraser ? 'background:var(--status-red); color:#fff;' : ''}" onclick="toggleScribbleEraser()">
                    🧹 Eraser
                  </button>
                  <button class="btn-secondary" style="min-height:32px; padding:4px 10px; font-size:12px;" onclick="undoScribbleStroke()">
                    ↩️ Undo
                  </button>
                  <button class="btn-outline" style="min-height:32px; padding:4px 10px; font-size:12px; color:var(--status-red); border-color:#fca5a5;" onclick="clearScribblePad()">
                    🗑️ Clear
                  </button>
                </div>
              </div>

              <div class="kot-canvas-wrapper">
                <canvas id="kotScribbleCanvas" class="kot-canvas"></canvas>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted);">
                <span>✍️ Write with finger, stylus or mouse. Real-time digital KOT sent to Chef.</span>
                <span id="scribbleSavedIndicator" style="color:var(--status-green); font-weight:700; display:${waiterScribbleDataUrl ? 'inline-block' : 'none'};">
                  ✓ Handwriting Attached
                </span>
              </div>
            </div>

            <!-- Tab Content 2: Typed Notes & Quick Tags -->
            <div id="typeTabContent" style="display:${waiterInputTab === 'type' ? 'flex' : 'none'}; flex-direction:column; gap:14px;">
              <div>
                <label style="font-weight:700; font-size:13px; color:var(--text-muted); display:block; margin-bottom:8px;">
                  ⚡ Quick Dietary & Preparation Tags (Tap to toggle):
                </label>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${QUICK_DIETARY_TAGS.map(tag => {
                    const active = waiterSelectedTags.includes(tag);
                    return `
                      <button class="tag-chip ${active ? 'active' : ''}" onclick="toggleWaiterTag('${tag}')">
                        ${tag} ${active ? '✓' : ''}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <div>
                <label style="font-weight:700; font-size:13px; color:var(--text-muted); display:block; margin-bottom:6px;">
                  💬 Freeform Personal Instructions / Guest Requests:
                </label>
                <textarea id="waiterTypedNotesBox" 
                  placeholder="e.g. Table 4 is celebrating an anniversary. Guest requested warm drinking water. Please serve the Dal Makhani extra buttery, no green chilies in Raita..."
                  style="min-height:100px; resize:vertical; padding:12px; font-size:14px; line-height:1.5; border-radius:var(--radius-sm);"
                  oninput="waiterPersonalNotes=this.value">${waiterPersonalNotes}</textarea>
              </div>
            </div>
          </div>

          <!-- ORDER SUMMARY (CART) CARD -->
          <div class="card" style="border:2px solid var(--primary); background:var(--primary-light); box-shadow:var(--shadow-lg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <h3 style="font-size:19px; font-weight:800; color:var(--text);">Current Order Items (${currentCart.reduce((sum, i) => sum + i.qty, 0)})</h3>
              <span style="font-size:18px; font-weight:800; color:var(--primary);">
                ₹${currentCart.reduce((sum, i) => sum + (i.price ? i.price * i.qty : 150 * i.qty), 0)}
              </span>
            </div>

            <!-- Cart Items List -->
            <div id="cartItemsList" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
              ${currentCart.length === 0 ? '<div style="color:var(--text-muted); font-style:italic; padding:12px 0;">No items added yet. Tap ➕ Add on any dish above.</div>' : ''}
              ${currentCart.map((item, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface); padding:10px 14px; border-radius:10px; border:1px solid var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                  <div>
                    <span style="font-weight:800; font-size:15px;">${item.qty}x ${item.name}</span>
                    ${item.isCustom ? '<span style="font-size:11px; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:6px; margin-left:6px; font-weight:700;">Custom</span>' : ''}
                  </div>
                  
                  <div style="display:flex; align-items:center; gap:8px;">
                    <input type="text" placeholder="Dish notes (e.g. Crisp, No oil)" style="min-height:36px; font-size:12px; width:160px; padding:6px 10px;" value="${item.notes}" onchange="currentCart[${idx}].notes=this.value">
                    <button class="btn-secondary" style="min-height:36px; width:36px; padding:0; font-size:14px;" onclick="decrementCartIndex(${idx})">−</button>
                    <button class="btn-secondary" style="min-height:36px; width:36px; padding:0; font-size:14px;" onclick="incrementCartIndex(${idx})">+</button>
                    <button class="btn-danger" style="min-height:36px; width:36px; padding:0; font-size:14px;" onclick="removeFromCart(${idx})">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Attached Instructions Preview -->
            ${(waiterSelectedTags.length > 0 || waiterPersonalNotes || waiterScribbleDataUrl) ? `
              <div style="background:var(--surface); padding:12px 14px; border-radius:10px; border:1.5px dashed var(--primary); margin-bottom:14px; display:flex; flex-direction:column; gap:8px;">
                <span style="font-size:13px; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px;">
                  <span>📋</span> Attached to this KOT:
                </span>
                ${waiterSelectedTags.length > 0 ? `
                  <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${waiterSelectedTags.map(t => `<span style="background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:700; padding:2px 8px; border-radius:12px; border:1px solid var(--primary-border);">${t}</span>`).join('')}
                  </div>
                ` : ''}
                ${waiterPersonalNotes ? `
                  <div style="font-size:13px; color:var(--text); font-weight:600;">
                    <b>Typed Note:</b> "${waiterPersonalNotes}"
                  </div>
                ` : ''}
                ${waiterScribbleDataUrl ? `
                  <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${waiterScribbleDataUrl}" alt="Scribble Preview" style="height:44px; border:1px solid var(--border); border-radius:6px; background:#fffdfa;">
                    <span style="font-size:12px; color:var(--status-green); font-weight:700;">✓ Handwritten KOT Drawing Attached</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Mandatory Allergy Question -->
            <div style="background:var(--surface); padding:12px 16px; border-radius:10px; margin-bottom:14px; border:1px solid var(--border);">
              <label style="font-weight:800; font-size:14px; color:var(--status-red); display:block; margin-bottom:6px;">
                ⚠️ Mandatory Safety Check: Does guest have any allergies?
              </label>
              <div style="display:flex; gap:16px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="allergyCheck" value="no" checked style="width:20px; height:20px;">
                  <span style="font-weight:600;">No Allergy</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="allergyCheck" value="yes" style="width:20px; height:20px;">
                  <span style="font-weight:600; color:var(--status-red);">Yes (Specified in KOT Notes)</span>
                </label>
              </div>
            </div>

            <button id="sendKitchenBtn" class="btn-primary btn-action-lg" ${currentCart.length === 0 ? 'disabled' : ''} onclick="submitOrderToKitchen()">
              🚀 ${t('send_kitchen')} & KOT Notes
            </button>
          </div>
        </div>
      `;

      // Initialize Canvas after rendering if on scribble tab
      if (waiterInputTab === 'scribble') {
        setTimeout(initScribbleCanvas, 50);
      }
    }

    function initScribbleCanvas() {
      const canvas = document.getElementById('kotScribbleCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = 230 * dpr;
      ctx.scale(dpr, dpr);

      if (waiterScribbleDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, 230);
          captureCanvasHistory(ctx, rect.width, 230);
        };
        img.src = waiterScribbleDataUrl;
      } else {
        renderRuledCanvasBackground(ctx, rect.width, 230);
        captureCanvasHistory(ctx, rect.width, 230);
      }

      function getCoords(e) {
        const r = canvas.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        return {
          x: clientX - r.left,
          y: clientY - r.top
        };
      }

      function onDown(e) {
        e.preventDefault();
        scribbleIsDrawing = true;
        const pos = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }

      function onMove(e) {
        if (!scribbleIsDrawing) return;
        e.preventDefault();
        const pos = getCoords(e);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = scribbleWidth;
        ctx.strokeStyle = scribbleIsEraser ? '#fffdfa' : scribbleColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      function onUp(e) {
        if (!scribbleIsDrawing) return;
        scribbleIsDrawing = false;
        captureCanvasHistory(ctx, rect.width, 230);
        saveCurrentScribble(canvas);
      }

      canvas.onpointerdown = onDown;
      canvas.onpointermove = onMove;
      canvas.onpointerup = onUp;
      canvas.onpointercancel = onUp;
    }

    function renderRuledCanvasBackground(ctx, w, h) {
      ctx.fillStyle = '#fffdfa';
      ctx.fillRect(0, 0, w, h);

      // Left margin line (soft red)
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(45, 0);
      ctx.lineTo(45, h);
      ctx.stroke();

      // Ruled lines (soft grey-blue)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = 30; y < h; y += 26) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Watermark in corner
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('📋 KOT NOTEPAD', w - 110, h - 12);
    }

    function captureCanvasHistory(ctx, w, h) {
      if (scribbleHistory.length > 15) scribbleHistory.shift();
      scribbleHistory.push(ctx.getImageData(0, 0, w * (window.devicePixelRatio || 1), h * (window.devicePixelRatio || 1)));
    }

    function saveCurrentScribble(canvas) {
      waiterScribbleDataUrl = canvas.toDataURL('image/png');
      const ind = document.getElementById('scribbleSavedIndicator');
      if (ind) ind.style.display = 'inline-block';
    }

    function selectScribbleColor(color) {
      scribbleColor = color;
      scribbleIsEraser = false;
      document.querySelectorAll('.kot-color-dot').forEach(d => d.classList.remove('active'));
      const active = document.querySelector(`.kot-color-dot[style*="${color}"]`);
      if (active) active.classList.add('active');
    }

    function selectScribbleWidth(w) {
      scribbleWidth = w;
      scribbleIsEraser = false;
      renderWaiterMenu(document.getElementById('appContent'));
    }

    function toggleScribbleEraser() {
      scribbleIsEraser = !scribbleIsEraser;
      renderWaiterMenu(document.getElementById('appContent'));
    }

    function undoScribbleStroke() {
      const canvas = document.getElementById('kotScribbleCanvas');
      if (!canvas || scribbleHistory.length <= 1) return;
      const ctx = canvas.getContext('2d');
      scribbleHistory.pop(); // discard current
      const prev = scribbleHistory[scribbleHistory.length - 1];
      if (prev) {
        ctx.putImageData(prev, 0, 0);
        saveCurrentScribble(canvas);
      }
    }

    function clearScribblePad() {
      const canvas = document.getElementById('kotScribbleCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      renderRuledCanvasBackground(ctx, rect.width, 230);
      scribbleHistory = [];
      captureCanvasHistory(ctx, rect.width, 230);
      waiterScribbleDataUrl = null;
      const ind = document.getElementById('scribbleSavedIndicator');
      if (ind) ind.style.display = 'none';
    }

    function addToCart(dishId) {
      const data = DataLayer.getData();
      const dish = data.dishes.find(d => d.id === dishId);
      if (!dish) return;

      const existing = currentCart.find(c => c.dishId === dishId);
      if (existing) {
        existing.qty += 1;
      } else {
        currentCart.push({ dishId: dish.id, name: dish.name, qty: 1, notes: '', price: dish.costPerPortion * 2 });
      }
      renderCurrentScreen();
    }

    function decrementCartItem(dishId) {
      const existing = currentCart.find(c => c.dishId === dishId);
      if (existing) {
        if (existing.qty > 1) {
          existing.qty -= 1;
        } else {
          currentCart = currentCart.filter(c => c.dishId !== dishId);
        }
        renderCurrentScreen();
      }
    }

    function incrementCartIndex(idx) {
      if (currentCart[idx]) {
        currentCart[idx].qty += 1;
        renderCurrentScreen();
      }
    }

    function decrementCartIndex(idx) {
      if (currentCart[idx]) {
        if (currentCart[idx].qty > 1) {
          currentCart[idx].qty -= 1;
        } else {
          currentCart.splice(idx, 1);
        }
        renderCurrentScreen();
      }
    }

    function removeFromCart(index) {
      currentCart.splice(index, 1);
      renderCurrentScreen();
    }

    function addCustomDishToCart() {
      const nameInput = document.getElementById('customDishNameInput');
      const priceInput = document.getElementById('customDishPriceInput');
      const name = nameInput ? nameInput.value.trim() : '';
      const price = priceInput ? parseFloat(priceInput.value) || 100 : 100;
      if (!name) {
        showToast('Please type the custom dish name', '⚠️');
        return;
      }
      currentCart.push({
        dishId: 'custom_' + Date.now(),
        name: '⭐ ' + name,
        qty: 1,
        notes: 'Off-menu special request',
        price: price,
        isCustom: true
      });
      showToast(`Added custom item: ${name}`);
      renderCurrentScreen();
    }

    function submitOrderToKitchen() {
      if (currentCart.length === 0) return;

      const btn = document.getElementById('sendKitchenBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = "🚀 Dispatching KOT...";
      }

      // Read typed notes if present
      const notesBox = document.getElementById('waiterTypedNotesBox');
      if (notesBox) waiterPersonalNotes = notesBox.value.trim();

      const data = DataLayer.getData();

      // Check if there is an existing active order on this table (Running KOT)
      const existingOrder = (data.orders || []).find(o => o.table === activeTable && o.status !== 'completed' && o.status !== 'paid');

      if (existingOrder) {
        // Append dishes to running order
        existingOrder.dishes.push(...currentCart);
        if (waiterPersonalNotes) {
          existingOrder.waiterNotes = (existingOrder.waiterNotes ? existingOrder.waiterNotes + ' | ' : '') + waiterPersonalNotes;
        }
        if (waiterScribbleDataUrl) {
          existingOrder.scribbleImage = waiterScribbleDataUrl;
        }
        if (waiterSelectedTags.length > 0) {
          existingOrder.tags = Array.from(new Set([...(existingOrder.tags || []), ...waiterSelectedTags]));
        }
        // Set status back to cooking if it was served or ready
        existingOrder.status = 'cooking';

        const table = (data.tables || []).find(t => t.id === activeTable || t.name === activeTable);
        if (table) {
          table.status = 'cooking';
          table.waiterName = currentUser.name;
        }

        DataLayer.saveData(data);
        DataLayer.logActivity(currentUser.id, currentUser.name, "Running Order Added", `${activeTable}: Added ${currentCart.map(d=>d.qty+'x '+d.name).join(', ')} by ${currentUser.name}`);
        showToast(`Running items sent to kitchen for ${activeTable}!`, '🚀');
      } else {
        // Create brand new order
        const newOrder = {
          id: 'ord_' + Date.now(),
          table: activeTable,
          waiterName: currentUser.name,
          chefId: null,
          chefName: 'Auto-Assigning...',
          status: 'sent',
          startedAt: new Date().toISOString(),
          dishes: [...currentCart],
          waiterNotes: waiterPersonalNotes,
          scribbleImage: waiterScribbleDataUrl,
          tags: [...waiterSelectedTags],
          allergyChecked: document.querySelector('input[name="allergyCheck"]:checked')?.value === 'yes'
        };

        // Smart Chef Dispatch
        const assignedChef = ChefDispatcher.assignOrderToChef(newOrder, data);
        if (assignedChef) {
          newOrder.chefId = assignedChef.id;
          newOrder.chefName = assignedChef.name;
          assignedChef.activeTasks += 1;
        } else {
          newOrder.chefName = 'In Queue (All Chefs Busy)';
        }

        // Update table in data.tables
        const table = (data.tables || []).find(t => t.id === activeTable || t.name === activeTable);
        if (table) {
          table.status = 'cooking';
          table.waiterName = currentUser.name;
        }

        data.orders.push(newOrder);
        DataLayer.saveData(data);
        DataLayer.logActivity(currentUser.id, currentUser.name, "Order Sent to Kitchen", `${activeTable}: ${newOrder.dishes.map(d=>d.qty+'x '+d.name).join(', ')} -> Chef: ${newOrder.chefName}${newOrder.scribbleImage ? ' [Handwritten KOT Attached]' : ''}`);

        showToast(`Order sent for ${activeTable}! Assigned to ${newOrder.chefName}`, '🚀');
      }
      
      // Reset state for next table
      currentCart = [];
      waiterPersonalNotes = '';
      waiterScribbleDataUrl = null;
      waiterSelectedTags = [];
      scribbleHistory = [];
      
      currentScreen = 'waiter_orders';
      renderCurrentScreen();
    }

    function renderWaiterOrders(container) {
      const data = DataLayer.getData();
      const myOrders = (data.orders || []).filter(o => o.status !== 'completed' && o.status !== 'paid');

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <h2 style="font-size:24px; font-weight:800; display:flex; align-items:center; gap:8px;">
                <span>🔔</span> Live Order Tracking & Pickup Status
              </h2>
              <p style="color:var(--text-muted); font-size:14px; margin-top:2px;">
                Track orders from cooking to ready-at-pass to served dining.
              </p>
            </div>
            <button class="btn-primary" onclick="currentScreen='waiter_tables'; renderCurrentScreen();">
              🪑 Floor View & Tables
            </button>
          </div>

          ${myOrders.length === 0 ? '<div class="card" style="text-align:center; padding:40px; color:var(--text-muted);">No active orders pending. Tap "Floor View & Tables" to seat guests.</div>' : ''}

          <div class="grid-2">
            ${myOrders.map(ord => {
              const waitMins = Math.floor((Date.now() - new Date(ord.startedAt)) / 60000);
              const isReady = ord.status === 'ready';
              const isCooking = ord.status === 'cooking' || ord.status === 'sent';
              const isServed = ord.status === 'served';

              let borderCol = isReady ? 'var(--status-green)' : isCooking ? 'var(--status-amber)' : isServed ? '#3b82f6' : '#94a3b8';
              let badgeTxt = isReady ? '🔔 READY AT PASS (PICKUP)' : isServed ? '🍽️ SERVED (DINING)' : ord.status.toUpperCase();
              let badgeCls = isReady ? 'status-badge status-fresh' : isServed ? 'status-badge status-fresh' : 'status-badge status-soon';

              return `
                <div class="card" style="border-left:6px solid ${borderCol};">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:20px; font-weight:800;">${ord.table}</span>
                    <span class="${badgeCls}">
                      ${badgeTxt}
                    </span>
                  </div>
                  
                  <div style="font-size:13px; color:var(--text-muted); margin:4px 0;">
                    Server: <b>${ord.waiterName}</b> | Chef: <b>${ord.chefName}</b> | Elapsed: <b>${waitMins} min</b>
                  </div>

                  <ul style="padding-left:16px; font-size:14px; margin:8px 0; display:flex; flex-direction:column; gap:4px;">
                    ${ord.dishes.map(d => `
                      <li>
                        <b>${d.qty}x</b> ${d.name} 
                        ${d.notes ? `<b style="color:var(--status-red);">(${d.notes})</b>` : ''}
                      </li>
                    `).join('')}
                  </ul>

                  <!-- Waiter's Attached Notes & Scribble Preview -->
                  ${(ord.tags && ord.tags.length > 0) || ord.waiterNotes || ord.scribbleImage ? `
                    <div style="background:var(--surface-2); padding:10px 12px; border-radius:8px; margin-top:8px; border:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
                      ${ord.tags && ord.tags.length > 0 ? `
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                          ${ord.tags.map(t => `<span style="background:var(--primary-light); color:var(--primary); font-size:11px; font-weight:700; padding:1px 6px; border-radius:10px;">${t}</span>`).join('')}
                        </div>
                      ` : ''}
                      ${ord.waiterNotes ? `
                        <div style="font-size:12px; color:var(--text); font-weight:600;">
                          💬 <b>Note:</b> ${ord.waiterNotes}
                        </div>
                      ` : ''}
                      ${ord.scribbleImage ? `
                        <button class="kot-thumbnail-btn" style="padding:4px 8px; font-size:12px;" onclick="openScribbleLightbox('${ord.id}')">
                          <span>✍️</span>
                          <span>View Handwritten KOT</span>
                        </button>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Actions -->
                  <div style="margin-top:10px; display:flex; gap:8px;">
                    ${isReady ? `
                      <button class="btn-primary" style="flex:1;" onclick="waiterMarkOrderServed('${ord.id}')">
                        🍽️ Pick Up & Mark Served
                      </button>
                    ` : isServed ? `
                      <button class="btn-secondary" style="flex:1;" onclick="selectWaiterTable('${ord.table}')">
                        ➕ Add More Items
                      </button>
                      <button class="btn-primary" style="flex:1; background:var(--status-amber); color:#fff;" onclick="openTableBillModal('${ord.table}')">
                        💳 Settle & Clear
                      </button>
                    ` : `
                      <button class="btn-secondary" style="flex:1;" onclick="selectWaiterTable('${ord.table}')">
                        📋 Manage Table
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
