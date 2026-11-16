/**
 * KitchenCare Kitchen Manager Module
 * Inventory, batches, expiry tracking, wastage logging, and fridge temperatures.
 */
let stockCategoryFilter = 'all';
let stockSearchTerm = '';
let stockStorageFilter = 'all';

// 2. KITCHEN MANAGER HOME
    function renderManagerHome(container) {
      const data = DataLayer.getData();
      const today = new Date().toISOString().split('T')[0];

      // Computations
      const expiringSoonCount = data.ingredients.reduce((acc, ing) => {
        return acc + ing.batches.filter(b => {
          const diff = Math.ceil((new Date(b.expiry) - new Date(today)) / (1000 * 3600 * 24));
          return diff <= 3;
        }).length;
      }, 0);

      const lowStockCount = data.ingredients.filter(ing => ing.totalQty <= ing.minThreshold).length;
      const activeOrdersCount = data.orders.filter(o => o.status === 'cooking' || o.status === 'sent').length;

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Top Row: Today at a Glance in Big Cards -->
          <div class="grid-4">
            <div class="card" style="border-left:6px solid var(--status-amber); cursor:pointer;" onclick="currentScreen='mgr_stock'; renderCurrentScreen();">
              <div style="color:var(--text-muted); font-size:14px; font-weight:700;">⚠️ ${t('expiring_soon')}</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">${expiringSoonCount} Batches</div>
              <div style="font-size:12px; color:var(--text-light);">Expires in ≤ 3 days</div>
            </div>

            <div class="card" style="border-left:6px solid #7e22ce; cursor:pointer;" onclick="currentScreen='mgr_stock'; renderCurrentScreen();">
              <div style="color:var(--text-muted); font-size:14px; font-weight:700;">📉 ${t('low_stock')}</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">${lowStockCount} Items</div>
              <div style="font-size:12px; color:var(--text-light);">Below minimum threshold</div>
            </div>

            <div class="card" style="border-left:6px solid var(--primary); cursor:pointer;" onclick="currentScreen='mgr_ops'; renderCurrentScreen();">
              <div style="color:var(--text-muted); font-size:14px; font-weight:700;">🧊 ${t('fridge_temp')}</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">3 / 3 Units</div>
              <div style="font-size:12px; color:var(--status-green); font-weight:bold;">All within safe ranges</div>
            </div>

            <div class="card" style="border-left:6px solid #0284c7;">
              <div style="color:var(--text-muted); font-size:14px; font-weight:700;">🍳 ${t('orders_cooking')}</div>
              <div style="font-size:32px; font-weight:800; margin:6px 0;">${activeOrdersCount} Tables</div>
              <div style="font-size:12px; color:var(--text-light);">Dispatched to kitchen</div>
            </div>
          </div>

          <!-- Main Actions -->
          <div style="display:flex; flex-wrap:wrap; gap:12px;">
            <button class="btn-primary" style="flex:1; min-width:220px;" onclick="currentScreen='mgr_add_stock'; buildNavTabs(); renderCurrentScreen();">
              ➕ ${t('add_stock')} (Goods Received)
            </button>
            <button class="btn-secondary" style="flex:1; min-width:220px;" onclick="openLogWastageModal()">
              🗑️ ${t('wastage')}
            </button>
            <button class="btn-secondary" style="flex:1; min-width:220px;" onclick="openStockAuditModal()">
              ⚖️ ${t('stock_count')} (Audit)
            </button>
          </div>

          <!-- Active Cooking Orders Board -->
          <div class="card">
            <div class="card-title">
              <span>🍳</span>
              <span>Kitchen Display Summary (Live Active Orders)</span>
            </div>
            <div class="grid-3" style="margin-top:14px;">
              ${data.orders.map(ord => `
                <div class="kds-card">
                  <div class="kds-header">
                    <span class="kds-table">${ord.table}</span>
                    <span class="status-badge ${ord.status === 'cooking' ? 'status-soon' : 'status-low'}">
                      ${ord.status.toUpperCase()}
                    </span>
                  </div>
                  <div style="font-size:14px; color:var(--text-muted);">
                    👨‍🍳 Chef: <b>${ord.chefName}</b> | 🍽️ Waiter: <b>${ord.waiterName}</b>
                  </div>
                  <ul style="padding-left:18px; font-size:14px; display:flex; flex-direction:column; gap:4px;">
                    ${ord.dishes.map(d => `<li><b>${d.qty}x</b> ${d.name} ${d.notes ? `<span style="color:var(--status-red); font-weight:bold;">(${d.notes})</span>` : ''}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // 3. STOCK LIST (FEFO & BATCHES)
    function renderStockList(container) {
      const data = DataLayer.getData();
      const today = new Date().toISOString().split('T')[0];

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="font-size:24px; font-weight:800;">${t('stock_list')} (FEFO Tracking)</h2>
              <p style="color:var(--text-muted); font-size:14px;">Total 25 Indian ingredients with batch-level expiry management.</p>
            </div>
            <button class="btn-primary" onclick="currentScreen='mgr_add_stock'; buildNavTabs(); renderCurrentScreen();">
              ➕ ${t('add_stock')}
            </button>
          </div>

          <div class="card" style="padding:14px;">
            <input type="text" id="stockSearch" placeholder="🔍 Search ingredients (e.g. Tomato, Paneer, Chicken, Besan)..." oninput="filterStockList(this.value)">
          </div>

          <div id="stockContainer" class="grid-2">
            <!-- Injected -->
          </div>
        </div>
      `;

      renderStockCards(data.ingredients);
    }

    function renderStockCards(ingredients) {
      const container = document.getElementById('stockContainer');
      const today = new Date().toISOString().split('T')[0];

      container.innerHTML = ingredients.map(ing => {
        const isLow = ing.totalQty <= ing.minThreshold;
        return `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:32px;">${ing.icon}</span>
                <div>
                  <h3 style="font-size:18px; font-weight:700;">${ing.name}</h3>
                  <div style="font-size:13px; color:var(--text-muted);">Min Level: ${ing.minThreshold} ${ing.unit}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:22px; font-weight:800; ${isLow ? 'color:var(--status-red);' : 'color:var(--primary);'}">
                  ${ing.totalQty} ${ing.unit}
                </div>
                ${isLow ? '<span class="status-badge status-expired">LOW STOCK</span>' : '<span class="status-badge status-fresh">OK</span>'}
              </div>
            </div>

            <!-- Batches -->
            <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px;">
              <div style="font-size:13px; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Active Batches (FEFO):</div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${ing.batches.map(b => {
                  const isExpired = b.expiry <= today;
                  const diff = Math.ceil((new Date(b.expiry) - new Date(today)) / (1000 * 3600 * 24));
                  const isSoon = diff <= 3 && !isExpired;

                  return `
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; background:var(--surface-2); padding:6px 10px; border-radius:6px;">
                      <span><b>${b.qty} ${ing.unit}</b> (${b.supplier})</span>
                      <span class="status-badge ${isExpired ? 'status-expired' : isSoon ? 'status-soon' : 'status-fresh'}" style="padding:2px 8px; font-size:11px;">
                        ${isExpired ? 'EXPIRED' : isSoon ? `Expires in ${diff}d` : `Exp: ${b.expiry}`}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function filterStockList(query) {
      const data = DataLayer.getData();
      const filtered = data.ingredients.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
      renderStockCards(filtered);
    }

    // 4. ADD NEW STOCK (GOODS RECEIVED)
    function renderAddStockScreen(container) {
      const data = DataLayer.getData();
      const today = new Date().toISOString().split('T')[0];

      container.innerHTML = `
        <div style="max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:20px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">${t('add_stock')} (Goods Received)</h2>
            <p style="color:var(--text-muted); font-size:14px;">Log incoming ingredient deliveries with supplier and batch expiry.</p>
          </div>

          <div class="card" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Select Ingredient:</label>
              <select id="newStockIng" onchange="updateStockUnit(this.value)">
                ${data.ingredients.map(i => `<option value="${i.id}">${i.icon} ${i.name} (${i.unit})</option>`).join('')}
              </select>
            </div>

            <div class="grid-2">
              <div>
                <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Quantity (<span id="unitDisplay">kg</span>):</label>
                <input type="number" id="newStockQty" value="10" min="1" step="0.5">
              </div>
              <div>
                <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Total Cost (₹):</label>
                <input type="number" id="newStockCost" value="350" min="0">
              </div>
            </div>

            <div>
              <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Supplier Name:</label>
              <input type="text" id="newStockSupplier" value="Sabzi Mandi / City Traders">
            </div>

            <div>
              <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Storage Destination:</label>
              <select id="newStockStorage">
                ${data.storageUnits.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="font-weight:700; font-size:14px; margin-bottom:6px; display:block;">Expiry Date:</label>
              <input type="date" id="newStockExpiry" value="${getFutureDate(5)}">
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button type="button" class="btn-secondary" style="flex:1; min-height:40px; font-size:13px;" onclick="setExpiryDays(5)">+5 Days</button>
                <button type="button" class="btn-secondary" style="flex:1; min-height:40px; font-size:13px;" onclick="setExpiryDays(20)">+20 Days</button>
                <button type="button" class="btn-secondary" style="flex:1; min-height:40px; font-size:13px;" onclick="setExpiryDays(30)">+1 Month</button>
              </div>
            </div>

            <button class="btn-primary btn-action-lg" onclick="saveNewStockEntry()">
              💾 Save & Add to Stock
            </button>
          </div>
        </div>
      `;
    }

    function getFutureDate(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    }

    function setExpiryDays(days) {
      document.getElementById('newStockExpiry').value = getFutureDate(days);
    }

    function updateStockUnit(ingId) {
      const data = DataLayer.getData();
      const ing = data.ingredients.find(i => i.id === ingId);
      if (ing) document.getElementById('unitDisplay').textContent = ing.unit;
    }

    function saveNewStockEntry() {
      const ingId = document.getElementById('newStockIng').value;
      const qty = parseFloat(document.getElementById('newStockQty').value) || 0;
      const cost = parseFloat(document.getElementById('newStockCost').value) || 0;
      const supplier = document.getElementById('newStockSupplier').value.trim() || 'Direct Supplier';
      const storageId = document.getElementById('newStockStorage').value;
      const expiry = document.getElementById('newStockExpiry').value;

      if (qty <= 0) {
        showToast("Please enter a valid quantity!", "⚠️");
        return;
      }

      const data = DataLayer.getData();
      const ing = data.ingredients.find(i => i.id === ingId);
      if (!ing) return;

      const newBatch = {
        id: 'b_' + Date.now(),
        qty: qty,
        expiry: expiry,
        supplier: supplier,
        received: new Date().toISOString().split('T')[0],
        costPerUnit: Math.round(cost / qty)
      };

      ing.batches.push(newBatch);
      // Sort batches by expiry ascending (FEFO)
      ing.batches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
      ing.totalQty = parseFloat((ing.totalQty + qty).toFixed(2));
      ing.storageId = storageId;

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Added Stock", `Received ${qty} ${ing.unit} of ${ing.name} (Exp: ${expiry})`);

      showToast(`Saved! Added ${qty} ${ing.unit} of ${ing.name}`);
      currentScreen = 'mgr_stock';
      buildNavTabs();
      renderCurrentScreen();
    }

    // 5. RECIPES SCREEN
    function renderRecipesScreen(container) {
      const data = DataLayer.getData();

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">${t('recipes')} & Portions</h2>
            <p style="color:var(--text-muted); font-size:14px;">Ingredients deducted automatically from batches via FEFO when cooked.</p>
          </div>

          <div class="grid-3">
            ${data.dishes.map(d => `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:32px;">${d.icon}</span>
                  <span class="status-badge ${d.tag === 'veg' ? 'status-fresh' : 'status-expired'}">
                    ${d.tag.toUpperCase()}
                  </span>
                </div>
                <h3 style="font-size:18px; font-weight:700; margin:8px 0 4px 0;">${d.name}</h3>
                <div style="font-size:13px; color:var(--text-muted);">Station: <b>${d.station}</b> | Prep: <b>${d.prepTimeMin}m</b></div>
                <div style="font-size:15px; font-weight:800; color:var(--primary); margin:6px 0;">Cost: ₹${d.costPerPortion} / portion</div>

                <div style="border-top:1px solid var(--border); padding-top:8px; margin-top:8px; font-size:13px;">
                  <div style="font-weight:700; color:var(--text-muted); margin-bottom:4px;">Portion Ingredients:</div>
                  <ul style="padding-left:16px; display:flex; flex-direction:column; gap:2px;">
                    ${d.ingredients.map(ing => {
                      const item = data.ingredients.find(i => i.id === ing.ingredientId);
                      return `<li>${ing.qty} ${ing.unit} ${item ? item.name : ''}</li>`;
                    }).join('')}
                  </ul>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 6. MANAGER OPERATIONS (TEMPERATURE & CHECKLISTS)
    function renderManagerOps(container) {
      const data = DataLayer.getData();

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:24px;">
          <!-- Fridge Temperatures -->
          <div class="card">
            <div class="card-title">
              <span>🧊</span>
              <span>Refrigeration Temperature Logs (FSSAI Compliance)</span>
            </div>
            <p style="font-size:14px; color:var(--text-muted); margin-bottom:14px;">
              Safe ranges: Fridges 0°C to 5°C, Freezers -18°C or colder.
            </p>

            <div class="grid-3">
              ${data.storageUnits.map(unit => `
                <div style="background:var(--surface-2); padding:16px; border-radius:var(--radius); border:1.5px solid var(--border);">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:24px;">${unit.icon}</span>
                    <span class="status-badge status-fresh">SAFE</span>
                  </div>
                  <h4 style="font-size:16px; font-weight:700; margin:8px 0 4px 0;">${unit.name}</h4>
                  <div style="font-size:28px; font-weight:800; color:var(--text);">${unit.currentTemp}°C</div>
                  <div style="font-size:12px; color:var(--text-light); margin-top:4px;">Safe: ${unit.targetMin}°C to ${unit.targetMax}°C</div>
                  <button class="btn-secondary" style="width:100%; min-height:40px; margin-top:10px; font-size:13px;" onclick="logTempPrompt('${unit.id}', '${unit.name}')">
                    📝 Log Reading
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Opening & Closing Checklists -->
          <div class="card">
            <div class="card-title">
              <span>📋</span>
              <span>Kitchen Hygiene & Safety Checklists</span>
            </div>
            
            <div class="grid-2" style="margin-top:14px;">
              <div>
                <h4 style="font-size:16px; font-weight:700; margin-bottom:10px; color:var(--primary);">🌅 Opening Checklist</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${data.checklists.opening.map(chk => `
                    <label style="display:flex; align-items:center; gap:10px; background:var(--surface-2); padding:10px; border-radius:8px; cursor:pointer;">
                      <input type="checkbox" style="width:20px; height:20px;" ${chk.done ? 'checked' : ''} onchange="toggleChecklist('opening', '${chk.id}', this.checked)">
                      <span style="font-size:14px; font-weight:600;">${chk.text}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <div>
                <h4 style="font-size:16px; font-weight:700; margin-bottom:10px; color:var(--status-amber);">🌙 Closing Checklist</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${data.checklists.closing.map(chk => `
                    <label style="display:flex; align-items:center; gap:10px; background:var(--surface-2); padding:10px; border-radius:8px; cursor:pointer;">
                      <input type="checkbox" style="width:20px; height:20px;" ${chk.done ? 'checked' : ''} onchange="toggleChecklist('closing', '${chk.id}', this.checked)">
                      <span style="font-size:14px; font-weight:600;">${chk.text}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <div style="margin-top:16px; text-align:right;">
              <button class="btn-secondary" onclick="window.print()">🖨️ Print Hygiene Report</button>
            </div>
          </div>
        </div>
      `;
    }

    function toggleChecklist(type, id, val) {
      const data = DataLayer.getData();
      const item = data.checklists[type].find(c => c.id === id);
      if (item) {
        item.done = val;
        DataLayer.saveData(data);
        showToast("Checklist updated");
      }
    }

    function logTempPrompt(unitId, unitName) {
      const val = prompt(`Enter current temperature for ${unitName} in °C:`, "4.0");
      if (val !== null && !isNaN(parseFloat(val))) {
        const temp = parseFloat(val);
        const data = DataLayer.getData();
        const unit = data.storageUnits.find(u => u.id === unitId);
        if (unit) {
          unit.currentTemp = temp;
          DataLayer.saveData(data);
          DataLayer.logActivity(currentUser.id, currentUser.name, "Temperature Logged", `${unitName}: ${temp}°C`);
          showToast(`Logged ${unitName} at ${temp}°C`);
          renderCurrentScreen();
        }
      }
    }

function openLogWastageModal() {
      const data = DataLayer.getData();
      const modal = document.getElementById('modalContainer');
      modal.style.display = 'flex';
      modal.className = 'modal-overlay';

      modal.innerHTML = `
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:20px; font-weight:800;">🗑️ Record Wastage / Spoilage</h3>
            <button class="btn-secondary" style="min-height:36px; padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>

          <div>
            <label style="font-weight:700; font-size:14px; margin-bottom:4px; display:block;">Select Ingredient:</label>
            <select id="wasteIng">
              ${data.ingredients.map(i => `<option value="${i.id}">${i.icon} ${i.name} (${i.totalQty} ${i.unit} in stock)</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="font-weight:700; font-size:14px; margin-bottom:4px; display:block;">Quantity Wasted:</label>
            <input type="number" id="wasteQty" value="1" min="0.1" step="0.1">
          </div>

          <div>
            <label style="font-weight:700; font-size:14px; margin-bottom:4px; display:block;">Reason for Discard:</label>
            <select id="wasteReason">
              <option value="Expired">Expired</option>
              <option value="Spoiled due to moisture">Spoiled / Bad Quality</option>
              <option value="Over-cooked / Burnt">Over-cooked in kitchen</option>
              <option value="Dropped / Spilled">Dropped / Broken</option>
              <option value="Returned by Guest">Returned by Guest</option>
            </select>
          </div>

          <button class="btn-danger btn-action-lg" onclick="confirmWastage()">
            🗑️ Confirm Wastage & Reduce Stock
          </button>
        </div>
      `;
    }

    function confirmWastage() {
      const ingId = document.getElementById('wasteIng').value;
      const qty = parseFloat(document.getElementById('wasteQty').value) || 0;
      const reason = document.getElementById('wasteReason').value;

      const data = DataLayer.getData();
      const ing = data.ingredients.find(i => i.id === ingId);
      if (!ing || qty <= 0) return;

      ing.totalQty = Math.max(0, parseFloat((ing.totalQty - qty).toFixed(2)));
      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Wastage Logged", `Discarded ${qty} ${ing.unit} of ${ing.name} (Reason: ${reason})`);

      showToast(`Discarded ${qty} ${ing.unit} of ${ing.name}`);
      closeModal();
      renderCurrentScreen();
    }

    function openStockAuditModal() {
      const data = DataLayer.getData();
      const modal = document.getElementById('modalContainer');
      modal.style.display = 'flex';
      modal.className = 'modal-overlay';

      modal.innerHTML = `
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:20px; font-weight:800;">⚖️ Physical Stock Count Audit</h3>
            <button class="btn-secondary" style="min-height:36px; padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>

          <div>
            <label style="font-weight:700; font-size:14px; margin-bottom:4px; display:block;">Select Item:</label>
            <select id="auditIng" onchange="updateAuditExpected(this.value)">
              ${data.ingredients.map(i => `<option value="${i.id}">${i.icon} ${i.name}</option>`).join('')}
            </select>
          </div>

          <div style="background:var(--surface-2); padding:12px; border-radius:8px;">
            <div style="font-size:14px;">Expected in system: <b id="auditExpected">${data.ingredients[0].totalQty} ${data.ingredients[0].unit}</b></div>
          </div>

          <div>
            <label style="font-weight:700; font-size:14px; margin-bottom:4px; display:block;">Actual Count Found:</label>
            <input type="number" id="auditActual" value="${data.ingredients[0].totalQty}" step="0.5">
          </div>

          <button class="btn-primary btn-action-lg" onclick="saveAuditCount()">
            ⚖️ Reconcile & Save Audit
          </button>
        </div>
      `;
    }

    function updateAuditExpected(ingId) {
      const data = DataLayer.getData();
      const ing = data.ingredients.find(i => i.id === ingId);
      if (ing) {
        document.getElementById('auditExpected').textContent = `${ing.totalQty} ${ing.unit}`;
        document.getElementById('auditActual').value = ing.totalQty;
      }
    }

    function saveAuditCount() {
      const ingId = document.getElementById('auditIng').value;
      const actual = parseFloat(document.getElementById('auditActual').value) || 0;

      const data = DataLayer.getData();
      const ing = data.ingredients.find(i => i.id === ingId);
      if (!ing) return;

      const diff = parseFloat((actual - ing.totalQty).toFixed(2));
      ing.totalQty = actual;

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Physical Stock Audit", `${ing.name}: Count adjusted by ${diff > 0 ? '+' : ''}${diff} ${ing.unit} to ${actual} ${ing.unit}`);

      showToast(`Stock reconciled! Discrepancy: ${diff} ${ing.unit}`);
      closeModal();
      renderCurrentScreen();
    }
