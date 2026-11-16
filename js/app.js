/**
 * KitchenCare Main Application Controller
 * Router navigation, tabs builder, alerts, modals, clock, and background sync loop.
 */

function showToast(msg, icon = '✅') {
  const toast = document.getElementById('toast');
  const iconEl = document.getElementById('toastIcon');
  const msgEl = document.getElementById('toastMsg');
  if (toast && iconEl && msgEl) {
    iconEl.textContent = icon;
    msgEl.textContent = msg;
    toast.className = 'show';
    setTimeout(() => {
      toast.className = '';
    }, 2800);
  }
}

function buildNavTabs() {
      const container = document.getElementById('tabsContainer');
      container.innerHTML = '';

      let tabs = [];
      if (currentUser.role === 'manager') {
        tabs = [
          { id: 'mgr_home', label: t('today_at_glance'), icon: '📊' },
          { id: 'mgr_stock', label: t('stock_list'), icon: '📦' },
          { id: 'mgr_add_stock', label: t('add_stock'), icon: '➕' },
          { id: 'mgr_recipes', label: t('recipes'), icon: '📖' },
          { id: 'mgr_ops', label: 'More (Temp/Checklist)', icon: '⚙️' }
        ];
      } else if (currentUser.role === 'waiter') {
        tabs = [
          { id: 'waiter_tables', label: t('take_order'), icon: '🍽️' },
          { id: 'waiter_orders', label: t('active_orders'), icon: '🔔' }
        ];
      } else if (currentUser.role === 'chef') {
        tabs = [
          { id: 'chef_kds', label: t('my_orders'), icon: '🍳' },
          { id: 'chef_stock', label: 'Kitchen Ingredients', icon: '🥫' }
        ];
      } else if (currentUser.role === 'admin') {
        tabs = [
          { id: 'admin_dash', label: t('dashboard'), icon: '📈' },
          { id: 'admin_perf', label: t('chef_perf'), icon: '👨‍🍳' },
          { id: 'admin_audit', label: t('activity_log'), icon: '📜' },
          { id: 'admin_reports', label: t('reports'), icon: '📑' },
          { id: 'admin_settings', label: t('settings'), icon: '⚙️' }
        ];
      }

      tabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = `nav-tab-btn ${currentScreen === tab.id ? 'active' : ''}`;
        btn.innerHTML = `<span>${tab.icon}</span> <span>${tab.label}</span>`;
        btn.onclick = () => {
          currentScreen = tab.id;
          buildNavTabs();
          renderCurrentScreen();
        };
        container.appendChild(btn);
      });
    }

    // Global Alert Checker
    function checkGlobalAlerts() {
      const data = DataLayer.getData();
      const today = new Date().toISOString().split('T')[0];
      let alertCount = 0;
      let alertMessages = [];

      // Check ingredient expiries
      data.ingredients.forEach(ing => {
        ing.batches.forEach(b => {
          if (b.expiry <= today) {
            alertCount++;
            alertMessages.push(`🚨 ${ing.name} has EXPIRED batch (${b.qty} ${ing.unit})`);
          } else {
            const expDate = new Date(b.expiry);
            const diffDays = Math.ceil((expDate - new Date(today)) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              alertCount++;
              alertMessages.push(`⚠️ ${ing.name} expires in ${diffDays} day(s)`);
            }
          }
        });

        // Check low stock
        if (ing.totalQty <= ing.minThreshold) {
          alertCount++;
          alertMessages.push(`📉 Low Stock: ${ing.name} (${ing.totalQty} ${ing.unit} remaining, Min: ${ing.minThreshold})`);
        }
      });

      // Update badge
      const badge = document.getElementById('alertsBadge');
      if (alertCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = alertCount;
        
        const banner = document.getElementById('globalAlertBanner');
        banner.style.display = 'flex';
        document.getElementById('globalAlertText').textContent = alertMessages[0] || 'Attention required in kitchen';
      } else {
        badge.style.display = 'none';
        document.getElementById('globalAlertBanner').style.display = 'none';
      }

      return alertMessages;
    }

function renderCurrentScreen() {
      if (!currentUser) {
        renderLoginScreen();
        return;
      }

      const content = document.getElementById('appContent');
      content.innerHTML = '';

      switch (currentScreen) {
        // Kitchen Manager Screens
        case 'mgr_home': renderManagerHome(content); break;
        case 'mgr_stock': renderStockList(content); break;
        case 'mgr_add_stock': renderAddStockScreen(content); break;
        case 'mgr_recipes': renderRecipesScreen(content); break;
        case 'mgr_ops': renderManagerOps(content); break;

        // Waiter Screens
        case 'waiter_tables': renderWaiterTableSelect(content); break;
        case 'waiter_menu': renderWaiterMenu(content); break;
        case 'waiter_table_detail': renderTableDetailView(content); break;
        case 'waiter_orders': renderWaiterOrders(content); break;

        // Chef Screens
        case 'chef_kds': renderChefKDS(content); break;
        case 'chef_stock': renderChefStockView(content); break;

        // Admin Screens
        case 'admin_dash': renderAdminDashboard(content); break;
        case 'admin_perf': renderAdminChefPerf(content); break;
        case 'admin_audit': renderAdminAuditLogs(content); break;
        case 'admin_reports': renderAdminReports(content); break;
        case 'admin_settings': renderAdminSettings(content); break;

        default: renderManagerHome(content);
      }
    }

// 10. MODALS: HELP, ALERTS, WASTAGE, STOCK AUDIT
    function openHelpModal() {
      const modal = document.getElementById('modalContainer');
      modal.style.display = 'flex';
      modal.className = 'modal-overlay';

      let tip1 = "1. Everything updates in real time using local storage.";
      let tip2 = "2. Ingredients are automatically deducted using FEFO (oldest expiry first).";
      let tip3 = "3. Tap any button with an icon to perform immediate actions.";

      if (currentUser?.role === 'manager') {
        tip1 = "1. Add stock whenever deliveries arrive to generate fresh batches.";
        tip2 = "2. Batches near expiry (<= 3 days) show up amber; expired show red.";
        tip3 = "3. Check fridge temperatures twice daily to ensure FSSAI compliance.";
      } else if (currentUser?.role === 'chef') {
        tip1 = "1. Active table orders show on your screen with waiting minutes.";
        tip2 = "2. Tap 'Start Cooking' to auto-deduct ingredients from stock.";
        tip3 = "3. Tap 'Mark Ready' once the food is on the pass for the waiter.";
      } else if (currentUser?.role === 'waiter') {
        tip1 = "1. Tap any table number to open its order pad.";
        tip2 = "2. Tap dishes to add; review special requests and mandatory allergy checks.";
        tip3 = "3. Tap 'Send to Kitchen' to assign the dish to the best available chef.";
      }

      modal.innerHTML = `
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:20px; font-weight:800;">❓ 3-Step Simple Guide</h3>
            <button class="btn-secondary" style="min-height:36px; padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; font-size:15px; margin:8px 0;">
            <div style="background:var(--surface-2); padding:12px; border-radius:8px;">${tip1}</div>
            <div style="background:var(--surface-2); padding:12px; border-radius:8px;">${tip2}</div>
            <div style="background:var(--surface-2); padding:12px; border-radius:8px;">${tip3}</div>
          </div>
          <button class="btn-primary btn-action-lg" onclick="closeModal()">Got it!</button>
        </div>
      `;
    }

    function openAlertsModal() {
      const modal = document.getElementById('modalContainer');
      modal.style.display = 'flex';
      modal.className = 'modal-overlay';

      const alerts = checkGlobalAlerts();

      modal.innerHTML = `
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:20px; font-weight:800;">🔔 Active Kitchen Alerts (${alerts.length})</h3>
            <button class="btn-secondary" style="min-height:36px; padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto;">
            ${alerts.length === 0 ? '<div style="color:var(--text-muted); text-align:center; padding:20px;">All green! No critical alerts.</div>' : ''}
            ${alerts.map(a => `
              <div style="background:var(--surface-2); padding:10px 14px; border-radius:8px; font-size:14px; font-weight:600;">
                ${a}
              </div>
            `).join('')}
          </div>

          <button class="btn-primary btn-action-lg" onclick="closeModal()">Dismiss</button>
        </div>
      `;
    }

function closeModal() {
      document.getElementById('modalContainer').style.display = 'none';
    }

    // Auto-update clock
    setInterval(() => {
      const clock = document.getElementById('roleClock');
      if (clock) {
        const d = new Date();
        clock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString('en-IN');
      }
    }, 1000);

    // Initial render
    renderLoginScreen();

    // Direct route via hash (for testing, direct views & documentation screenshots)
    function handleInitialRoute() {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#pin') {
        selectStaffForLogin('u_w1');
      } else if (hash === '#waiter' || hash === '#tables') {
        loginUser('u_w1');
      } else if (hash === '#menu') {
        loginUser('u_w1');
        activeTable = 'Table 4';
        currentScreen = 'waiter_menu';
        renderCurrentScreen();
      } else if (hash === '#scribble') {
        loginUser('u_w1');
        activeTable = 'Table 4';
        currentScreen = 'waiter_menu';
        renderCurrentScreen();
      } else if (hash === '#chef' || hash === '#kds') {
        loginUser('u_c1');
      } else if (hash === '#manager' || hash === '#stock') {
        loginUser('u_mgr');
      } else if (hash === '#admin') {
        loginUser('u_admin');
      } else if (hash === '#billing' || hash === '#settle') {
        loginUser('u_w1');
        openTableBillModal('Table 4');
      }
    }
    handleInitialRoute();
    window.addEventListener('hashchange', handleInitialRoute);

// Background live sync with SQLite Database (every 2.5 seconds)
setInterval(syncDatabaseState, 2500);
setTimeout(syncDatabaseState, 400);
