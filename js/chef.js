/**
 * KitchenCare Chef Kitchen Display System (KDS)
 * Chef task assignment, live cooking queue, FEFO batch auto-deduction, and pass alert.
 */
let chefFilterStation = 'All';

const ChefDispatcher = {
      // Find best chef: least workload, station match bonus, seniority
      assignOrderToChef(order, storeData) {
        const activeChefs = storeData.users.filter(u => u.role === 'chef' && u.onShift && u.active);
        if (!activeChefs.length) return null;

        // Check if dishes have specific stations (e.g. Tandoor, Wok)
        const primaryDish = storeData.dishes.find(d => d.id === order.dishes[0]?.dishId);
        const requiredStation = primaryDish?.station || 'Gravy';

        let bestChef = null;
        let lowestLoadScore = 999;

        activeChefs.forEach(chef => {
          // Max 5 tasks allowed
          if (chef.activeTasks >= 5) return;

          let score = chef.activeTasks * 10;
          // Station skill match priority
          if (chef.station === requiredStation) score -= 5;
          // Seniority priority for complex orders
          if (chef.seniority === 'Head Chef') score -= 2;
          else if (chef.seniority === 'Senior Chef') score -= 1;

          if (score < lowestLoadScore) {
            lowestLoadScore = score;
            bestChef = chef;
          }
        });

        return bestChef;
      }
    };

// 8. CHEF KDS (KITCHEN DISPLAY SYSTEM WITH SERVED STATUS)
    function renderChefKDS(container) {
      const data = DataLayer.getData();
      // Show active orders assigned to this chef OR unassigned
      const chefOrders = (data.orders || []).filter(o => 
        (o.chefId === currentUser.id || !o.chefId || o.chefName === currentUser.name) && 
        o.status !== 'completed' && o.status !== 'paid'
      );

      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <h2 style="font-size:24px; font-weight:800;">👨‍🍳 ${t('my_orders')} — Kitchen Display</h2>
            <p style="color:var(--text-muted); font-size:14px;">Tap 'Start Cooking' to auto-deduct oldest batches (FEFO). Tap 'Mark Ready' when plated.</p>
          </div>

          ${chefOrders.length === 0 ? '<div class="card" style="text-align:center; padding:40px; color:var(--text-muted); font-size:18px;">✅ All caught up! No pending dishes on your station.</div>' : ''}

          <div class="grid-2">
            ${chefOrders.map(ord => {
              const waitMins = Math.floor((Date.now() - new Date(ord.startedAt)) / 60000);
              const timerClass = waitMins > 15 ? 'timer-red' : waitMins > 8 ? 'timer-amber' : 'timer-green';

              return `
                <div class="kds-card ${waitMins > 15 ? 'urgent' : ''}">
                  <div class="kds-header">
                    <span class="kds-table">${ord.table}</span>
                    <span class="timer-badge ${timerClass}">⏱️ ${waitMins} min</span>
                  </div>

                  <div style="font-size:13px; color:var(--text-muted);">
                    Waiter: <b>${ord.waiterName}</b> | Status: <b>${ord.status.toUpperCase()}</b>
                  </div>

                  <!-- Dishes -->
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${ord.dishes.map(d => `
                      <div style="background:var(--surface-2); padding:10px; border-radius:8px;">
                        <div style="font-size:16px; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
                          <span>${d.qty}x ${d.name}</span>
                          ${d.isCustom ? '<span style="font-size:11px; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:6px;">⭐ Custom</span>' : ''}
                        </div>
                        ${d.notes ? `<div class="kds-notes" style="margin-top:4px;">⚠️ ${d.notes}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>

                  <!-- WAITER SPECIAL NOTES & SCRIBBLE LIGHTBOX BUTTON -->
                  ${(ord.tags && ord.tags.length > 0) || ord.waiterNotes || ord.scribbleImage ? `
                    <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                      ${ord.tags && ord.tags.length > 0 ? `
                        <div style="display:flex; flex-wrap:wrap; gap:5px;">
                          ${ord.tags.map(t => `<span style="background:#fef3c7; color:#92400e; font-size:12px; font-weight:800; padding:2px 8px; border-radius:12px; border:1px solid #fcd34d;">${t}</span>`).join('')}
                        </div>
                      ` : ''}
                      ${ord.waiterNotes ? `
                        <div style="font-size:13px; font-weight:700; color:#78350f;">
                          📝 <b>Special Instructions:</b> ${ord.waiterNotes}
                        </div>
                      ` : ''}
                      ${ord.scribbleImage ? `
                        <button class="kot-thumbnail-btn" onclick="openScribbleLightbox('${ord.id}')">
                          <span style="font-size:20px;">✍️</span>
                          <div style="text-align:left;">
                            <div style="font-size:13px; font-weight:800;">View Waiter's Handwritten KOT</div>
                            <div style="font-size:11px; font-weight:500; opacity:0.85;">Tap to enlarge handwritten instructions</div>
                          </div>
                        </button>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Actions -->
                  <div style="display:flex; gap:10px; margin-top:8px;">
                    ${ord.status === 'sent' ? `
                      <button class="btn-primary" style="flex:1;" onclick="chefStartCooking('${ord.id}')">
                        🍳 ${t('start_cooking')}
                      </button>
                    ` : ord.status === 'cooking' ? `
                      <button class="btn-primary" style="flex:1; background-color:#059669;" onclick="chefMarkReady('${ord.id}')">
                        ✅ ${t('mark_ready')}
                      </button>
                    ` : ord.status === 'ready' ? `
                      <div style="flex:1; background:#dcfce7; color:#15803d; padding:10px; border-radius:var(--radius-sm); font-weight:800; text-align:center; border:1px solid #86efac; font-size:14px;">
                        🔔 AT PASS — Waiting for Waiter Pickup
                      </div>
                    ` : `
                      <div style="flex:1; background:#f1f5f9; color:#475569; padding:10px; border-radius:var(--radius-sm); font-weight:700; text-align:center; font-size:14px;">
                        🍽️ SERVED TO GUEST by ${ord.servedBy || 'Waiter'}
                      </div>
                    `}
                    <button class="btn-danger" style="min-height:48px; padding:0 12px;" onclick="chefReportProblem('${ord.id}')">
                      ⚠️
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function openScribbleLightbox(orderId) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (!order || !order.scribbleImage) return;

      const modal = document.getElementById('modalContainer');
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal-card" style="max-width:620px;" onclick="event.stopPropagation()">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px;">
              <div>
                <h3 style="font-size:20px; font-weight:800; color:var(--primary);">✍️ Handwritten KOT — ${order.table}</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Scribbled by Waiter: <b>${order.waiterName}</b></p>
              </div>
              <button class="btn-secondary" style="min-height:36px; padding:4px 12px;" onclick="closeModal()">✕ Close</button>
            </div>

            <div style="background:#fffdfa; border:2px solid #cbd5e1; border-radius:12px; padding:10px; display:flex; justify-content:center; overflow:hidden;">
              <img src="${order.scribbleImage}" alt="Handwritten KOT" style="width:100%; max-height:480px; object-fit:contain; border-radius:8px;">
            </div>

            ${order.waiterNotes ? `
              <div style="background:var(--surface-2); padding:10px 14px; border-radius:8px; font-size:14px; border:1px solid var(--border);">
                <b>Typed Instructions:</b> ${order.waiterNotes}
              </div>
            ` : ''}

            <button class="btn-primary" style="width:100%;" onclick="closeModal()">
              ✓ Got it, Back to Kitchen
            </button>
          </div>
        </div>
      `;
    }

    function chefStartCooking(orderId) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (!order) return;

      // FEFO DEDUCTION: deduct required ingredients from oldest batches
      let deductedLog = [];
      order.dishes.forEach(d => {
        const dish = data.dishes.find(item => item.id === d.dishId);
        if (dish) {
          dish.ingredients.forEach(req => {
            const totalNeeded = req.qty * d.qty;
            const ing = data.ingredients.find(i => i.id === req.ingredientId);
            if (ing) {
              let remaining = totalNeeded;
              // Batches are already sorted by expiry ascending
              for (let b of ing.batches) {
                if (b.qty >= remaining) {
                  b.qty = parseFloat((b.qty - remaining).toFixed(2));
                  remaining = 0;
                  break;
                } else {
                  remaining = parseFloat((remaining - b.qty).toFixed(2));
                  b.qty = 0;
                }
              }
              // Remove empty batches
              ing.batches = ing.batches.filter(b => b.qty > 0);
              ing.totalQty = parseFloat(ing.batches.reduce((sum, b) => sum + b.qty, 0).toFixed(2));
              deductedLog.push(`${totalNeeded} ${req.unit} ${ing.name}`);
            }
          });
        }
      });

      order.status = 'cooking';
      order.chefId = currentUser.id;
      order.chefName = currentUser.name;

      // Update table status in data.tables
      const table = (data.tables || []).find(t => t.id === order.table || t.name === order.table);
      if (table) {
        table.status = 'cooking';
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Started Cooking (FEFO)", `${order.table}: Auto-deducted ${deductedLog.join(', ')}`);

      showToast(`Started cooking for ${order.table}! FEFO ingredients deducted.`);
      renderCurrentScreen();
    }

    function chefMarkReady(orderId) {
      const data = DataLayer.getData();
      const order = (data.orders || []).find(o => o.id === orderId);
      if (!order) return;

      order.status = 'ready';
      order.readyAt = new Date().toISOString();

      // Decrement active tasks
      const chef = data.users.find(u => u.id === currentUser.id);
      if (chef && chef.activeTasks > 0) chef.activeTasks -= 1;

      // Update table status in data.tables
      const table = (data.tables || []).find(t => t.id === order.table || t.name === order.table);
      if (table) {
        table.status = 'ready';
      }

      DataLayer.saveData(data);
      DataLayer.logActivity(currentUser.id, currentUser.name, "Order Marked Ready", `${order.table} dishes plated and ready for pickup at pass by waiter.`);

      if (window.AudioEngine && AudioEngine.beep) {
        AudioEngine.beep(880, 250);
      }

      showToast(`Order for ${order.table} is READY! Waiter alerted for pickup at pass.`, '🔔');
      renderCurrentScreen();
    }

    function chefReportProblem(orderId) {
      const issue = prompt("Enter problem description (e.g. Missing ingredient or spoiled food):", "Shortage of fresh paneer");
      if (issue) {
        DataLayer.logActivity(currentUser.id, currentUser.name, "CHEF PROBLEM REPORTED", `Order ${orderId}: ${issue}`);
        showToast("Manager alerted of kitchen issue!", "⚠️");
      }
    }

    function renderChefStockView(container) {
      const data = DataLayer.getData();
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <h2 style="font-size:24px; font-weight:800;">🥫 Kitchen Ingredients & Storage Locations</h2>
          <div class="grid-3">
            ${data.ingredients.map(i => {
              const unit = data.storageUnits.find(s => s.id === i.storageId);
              return `
                <div class="card">
                  <div style="font-size:32px;">${i.icon}</div>
                  <h4 style="font-size:17px; font-weight:700; margin:6px 0;">${i.name}</h4>
                  <div style="font-size:14px; font-weight:800; color:var(--primary);">${i.totalQty} ${i.unit} available</div>
                  <div style="font-size:12px; color:var(--text-light); margin-top:4px;">📍 Found in: <b>${unit ? unit.name : 'Kitchen Store'}</b></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
