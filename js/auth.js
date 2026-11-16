/**
 * KitchenCare POS Authentication & Session Controller
 * Enforces 4-Digit Security PIN validation, staff switching, and session management.
 */
let currentUser = null;
    let currentScreen = 'home';
    let inactivityTimer = null;

    // Toast Notification helper
    function showToast(msg, icon = '✅') {
      const toast = document.getElementById('toast');
      document.getElementById('toastIcon').textContent = icon;
      document.getElementById('toastMsg').textContent = msg;
      toast.classList.add('show');
      AudioEngine.playChime(icon === '⚠️' || icon === '❌' ? 'alert' : 'success');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }

    // Auto-logout tracker (kitchen safety)
    function resetInactivityTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (!currentUser) return;

      // Warn after 10 minutes of complete inactivity
      inactivityTimer = setTimeout(() => {
        if (currentUser) {
          showToast(t('auto_logout_warn'), '⚠️');
          setTimeout(() => {
            if (currentUser) logoutUser();
          }, 30000);
        }
      }, 10 * 60 * 1000);
    }

    ['click', 'touchstart', 'keypress'].forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer);
    });

    // Login system
    function loginUser(userId) {
      const data = DataLayer.getData();
      const user = data.users.find(u => u.id === userId);
      if (!user) return;

      currentUser = user;
      DataLayer.logActivity(user.id, user.name, "User Login", `Role: ${user.role}`);
      
      // Update UI Header
      document.getElementById('roleBar').style.display = 'block';
      document.getElementById('navTabsBar').style.display = 'block';
      document.getElementById('roleIcon').textContent = user.icon || '👨‍🍳';
      document.getElementById('currentUserName').textContent = user.name;
      document.getElementById('currentRoleTitle').textContent = user.role.toUpperCase() + (user.seniority ? ` (${user.seniority})` : '');
      const quickSwitch = document.getElementById('quickRoleSwitch');
      if (quickSwitch) quickSwitch.value = userId;

      // Set default tab based on role
      if (user.role === 'manager') currentScreen = 'mgr_home';
      else if (user.role === 'waiter') currentScreen = 'waiter_tables';
      else if (user.role === 'chef') currentScreen = 'chef_kds';
      else if (user.role === 'admin') currentScreen = 'admin_dash';

      buildNavTabs();
      checkGlobalAlerts();
      renderCurrentScreen();
      resetInactivityTimer();
      showToast(`Welcome, ${user.name}!`);
    }

    function confirmLogout() {
      if (!currentUser) return;
      if (confirm("Are you sure you want to log out of KitchenCare?")) {
        logoutUser();
      }
    }

    function logoutUser() {
      if (currentUser) {
        DataLayer.logActivity(currentUser.id, currentUser.name, "User Logout");
      }
      currentUser = null;
      document.getElementById('roleBar').style.display = 'none';
      document.getElementById('navTabsBar').style.display = 'none';
      document.getElementById('globalAlertBanner').style.display = 'none';
      renderLoginScreen();
    }

    function quickSwitchRole(userId) {
      if (userId) loginUser(userId);
    }

    // Navigation Tabs Builder (Strict limit: Max 5 tabs per role)

// POS Terminal Authentication State
    let selectedAuthUser = null;
    let enteredPin = '';
    let authCategoryFilter = 'all';

    function selectStaffForLogin(userId) {
      const data = DataLayer.getData();
      selectedAuthUser = data.users.find(u => u.id === userId);
      enteredPin = '';
      renderLoginScreen();
    }

    function appendPinDigit(digit) {
      if (!selectedAuthUser || enteredPin.length >= 4) return;
      enteredPin += digit;
      updatePinDots();
      if (enteredPin.length === 4) {
        setTimeout(() => verifyEnteredPin(), 120);
      }
    }

    function deletePinDigit() {
      if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDots();
      }
    }

    function clearPin() {
      enteredPin = '';
      updatePinDots();
      const err = document.getElementById('pinErrorMsg');
      if (err) err.innerHTML = '';
    }

    function updatePinDots() {
      const dots = document.querySelectorAll('.pin-dot');
      dots.forEach((dot, index) => {
        if (index < enteredPin.length) {
          dot.classList.add('filled');
          dot.classList.remove('error');
        } else {
          dot.classList.remove('filled');
          dot.classList.remove('error');
        }
      });
    }

    function verifyEnteredPin() {
      if (!selectedAuthUser) return;
      const pinContainer = document.getElementById('pinDotsContainer');
      const err = document.getElementById('pinErrorMsg');

      if (enteredPin === selectedAuthUser.pin) {
        // Correct PIN!
        if (err) {
          err.style.color = 'var(--status-green)';
          err.innerHTML = '✅ PIN Verified! Signing in to POS...';
        }
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach(d => {
          d.classList.add('filled');
          d.style.borderColor = 'var(--status-green)';
          d.style.background = 'var(--status-green)';
        });

        setTimeout(() => {
          const userToLog = selectedAuthUser;
          selectedAuthUser = null;
          enteredPin = '';
          loginUser(userToLog.id);
        }, 280);
      } else {
        // Invalid PIN!
        if (pinContainer) {
          pinContainer.classList.add('shake-anim');
          setTimeout(() => pinContainer.classList.remove('shake-anim'), 450);
        }
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach(d => d.classList.add('error'));

        if (err) {
          err.style.color = 'var(--status-red)';
          err.innerHTML = '❌ Incorrect PIN for ' + selectedAuthUser.name + '. Try again.';
        }
        DataLayer.logActivity(selectedAuthUser.id, selectedAuthUser.name, "Failed Login Attempt", "Invalid PIN entered: " + enteredPin);

        setTimeout(() => {
          clearPin();
        }, 650);
      }
    }

    function testLoginWithPin(userId, pin) {
      const data = DataLayer.getData();
      selectedAuthUser = data.users.find(u => u.id === userId);
      enteredPin = pin;
      renderLoginScreen();
      setTimeout(() => {
        verifyEnteredPin();
      }, 200);
    }

    function lockTerminal() {
      if (currentUser) {
        showToast('POS Terminal Locked.', '🔒');
      }
      logoutUser();
    }

    function openSwitchStaffModal() {
      const modal = document.getElementById('modalContainer');
      modal.style.display = 'flex';
      modal.className = 'modal-overlay';
      const data = DataLayer.getData();

      modal.innerHTML = `
        <div class="modal-card" style="max-width:540px; width:92%; max-height:88vh; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:22px;">🔒</span>
              <h3 style="font-size:20px; font-weight:800;">Switch Active Staff Member</h3>
            </div>
            <button class="btn-outline" style="min-height:36px; padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            Select target staff member. PIN verification is strictly required before switching sessions.
          </p>

          <div style="overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;">
            ${data.users.map(u => `
              <div class="staff-card-select" onclick="closeModal(); logoutUser(); selectStaffForLogin('${u.id}');">
                <div style="display:flex; align-items:center; gap:12px;">
                  <span style="font-size:26px;">${u.icon}</span>
                  <div>
                    <div style="font-weight:800; font-size:15px; color:var(--text);">${u.name}</div>
                    <div style="font-size:12px; color:var(--text-muted);">
                      <span style="font-weight:700; color:var(--primary);">${u.role.toUpperCase()}</span>
                      ${u.station ? ' • ' + u.station : ''}
                      ${u.seniority ? ' (' + u.seniority + ')' : ''}
                    </div>
                  </div>
                </div>
                <button class="btn-secondary" style="min-height:36px; padding:4px 14px; font-size:13px; font-weight:700;">
                  Enter PIN ➔
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Physical Keyboard Listener for POS PIN Entry
    window.addEventListener('keydown', (e) => {
      if (!currentUser && selectedAuthUser) {
        if (e.key >= '0' && e.key <= '9') {
          appendPinDigit(e.key);
        } else if (e.key === 'Backspace') {
          deletePinDigit();
        } else if (e.key === 'Escape') {
          clearPin();
        } else if (e.key === 'Enter') {
          if (enteredPin.length === 4) verifyEnteredPin();
        }
      }
    });

    // 1. POS PIN AUTHENTICATION LOGIN SCREEN
    function renderLoginScreen() {
      const content = document.getElementById('appContent');
      const data = DataLayer.getData();

      // Ensure header bars are hidden when at login screen
      document.getElementById('roleBar').style.display = 'none';
      document.getElementById('navTabsBar').style.display = 'none';
      document.getElementById('globalAlertBanner').style.display = 'none';

      // SCREEN A: PIN ENTRY KEYPAD FOR SELECTED STAFF
      if (selectedAuthUser) {
        content.innerHTML = `
          <div style="max-width:440px; margin:20px auto 40px; display:flex; flex-direction:column; gap:20px;">
            <!-- Brand / Header -->
            <div style="text-align:center;">
              <div style="font-size:42px; margin-bottom:4px;">🥘</div>
              <h1 style="font-size:26px; font-weight:800; color:var(--primary); letter-spacing:-0.5px;">KitchenCare POS</h1>
              <p style="color:var(--text-muted); font-size:14px;">Staff Security PIN Authentication</p>
            </div>

            <!-- PIN Terminal Card -->
            <div class="card" style="padding:26px; text-align:center; box-shadow:var(--shadow-lg);">
              <!-- User Profile Header -->
              <div style="display:flex; flex-direction:column; align-items:center; gap:8px; margin-bottom:16px;">
                <div style="width:68px; height:68px; border-radius:50%; background:var(--surface-2); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:var(--shadow);">
                  ${selectedAuthUser.icon}
                </div>
                <div>
                  <h2 style="font-size:20px; font-weight:800; color:var(--text);">${selectedAuthUser.name}</h2>
                  <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-top:2px;">
                    <span class="status-badge" style="background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:700;">
                      ${selectedAuthUser.role.toUpperCase()}
                    </span>
                    <span style="font-size:12px; color:var(--text-muted);">
                      ${selectedAuthUser.station || selectedAuthUser.seniority || ''}
                    </span>
                  </div>
                </div>
              </div>

              <div style="font-size:14px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">
                Enter 4-Digit Security PIN
              </div>

              <!-- Masked PIN Circles -->
              <div id="pinDotsContainer" class="pin-display-container">
                <div class="pin-dot ${enteredPin.length > 0 ? 'filled' : ''}"></div>
                <div class="pin-dot ${enteredPin.length > 1 ? 'filled' : ''}"></div>
                <div class="pin-dot ${enteredPin.length > 2 ? 'filled' : ''}"></div>
                <div class="pin-dot ${enteredPin.length > 3 ? 'filled' : ''}"></div>
              </div>

              <!-- Error or Status Feedback -->
              <div id="pinErrorMsg" style="min-height:22px; font-size:13px; font-weight:700; margin-bottom:16px;"></div>

              <!-- Numeric Keypad Grid -->
              <div class="pin-keypad-grid">
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('1')">1</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('2')">2</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('3')">3</button>
                
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('4')">4</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('5')">5</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('6')">6</button>
                
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('7')">7</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('8')">8</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('9')">9</button>
                
                <button type="button" class="pin-key-btn action-btn" onclick="deletePinDigit()" title="Backspace">⌫ Del</button>
                <button type="button" class="pin-key-btn" onclick="appendPinDigit('0')">0</button>
                <button type="button" class="pin-key-btn action-btn" onclick="clearPin()" title="Clear PIN">✕ Clear</button>
              </div>

              <!-- Back to Staff Directory -->
              <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                <button class="btn-outline" style="min-height:42px; font-size:13px; padding:6px 14px;" onclick="selectedAuthUser=null; enteredPin=''; renderLoginScreen();">
                  ⬅️ Choose Other Staff
                </button>
                <button class="btn-secondary" style="min-height:42px; font-size:12px; padding:6px 12px;" onclick="testLoginWithPin('${selectedAuthUser.id}', '${selectedAuthUser.pin}')" title="Auto-fill PIN for fast testing">
                  ⚡ Demo Fill (${selectedAuthUser.pin})
                </button>
              </div>
            </div>
          </div>
        `;
        return;
      }

      // SCREEN B: STAFF PROFILE SELECTION ROSTER
      let filteredUsers = data.users;
      if (authCategoryFilter === 'waiters') filteredUsers = data.users.filter(u => u.role === 'waiter');
      else if (authCategoryFilter === 'chefs') filteredUsers = data.users.filter(u => u.role === 'chef');
      else if (authCategoryFilter === 'managers') filteredUsers = data.users.filter(u => u.role === 'manager');
      else if (authCategoryFilter === 'admins') filteredUsers = data.users.filter(u => u.role === 'admin' || u.role === 'cashier');

      content.innerHTML = `
        <div style="max-width:760px; margin:24px auto 50px; display:flex; flex-direction:column; gap:20px; padding:0 12px;">
          <!-- Header Banner -->
          <div style="text-align:center;">
            <div style="font-size:48px; margin-bottom:6px;">🥘</div>
            <h1 style="font-size:32px; font-weight:800; color:var(--primary); letter-spacing:-0.5px;">KitchenCare POS Terminal</h1>
            <p style="color:var(--text-muted); font-size:15px; margin-top:4px;">
              Smart Kitchen Management & Billing System • Authentic Indian Restaurant Suite
            </p>
            <div style="margin-top:8px; display:inline-flex; align-items:center; gap:6px; background:var(--primary-light); color:var(--primary); padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700;">
              <span>🔒</span> Secure PIN-Protected Access
            </div>
          </div>

          <!-- Role Filter Tabs -->
          <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            <button class="btn-secondary" style="min-height:40px; padding:6px 14px; font-size:13px; border-radius:20px; ${authCategoryFilter === 'all' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}"
              onclick="authCategoryFilter='all'; renderLoginScreen();">
              All Staff (${data.users.length})
            </button>
            <button class="btn-secondary" style="min-height:40px; padding:6px 14px; font-size:13px; border-radius:20px; ${authCategoryFilter === 'waiters' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}"
              onclick="authCategoryFilter='waiters'; renderLoginScreen();">
              🍽️ Waiters (${data.users.filter(u=>u.role==='waiter').length})
            </button>
            <button class="btn-secondary" style="min-height:40px; padding:6px 14px; font-size:13px; border-radius:20px; ${authCategoryFilter === 'chefs' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}"
              onclick="authCategoryFilter='chefs'; renderLoginScreen();">
              👨‍🍳 Kitchen Chefs (${data.users.filter(u=>u.role==='chef').length})
            </button>
            <button class="btn-secondary" style="min-height:40px; padding:6px 14px; font-size:13px; border-radius:20px; ${authCategoryFilter === 'managers' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}"
              onclick="authCategoryFilter='managers'; renderLoginScreen();">
              📋 Managers (${data.users.filter(u=>u.role==='manager').length})
            </button>
            <button class="btn-secondary" style="min-height:40px; padding:6px 14px; font-size:13px; border-radius:20px; ${authCategoryFilter === 'admins' ? 'background:var(--primary); color:#fff; border-color:var(--primary); font-weight:700;' : ''}"
              onclick="authCategoryFilter='admins'; renderLoginScreen();">
              👑 Admin & Cashier (${data.users.filter(u=>u.role==='admin'||u.role==='cashier').length})
            </button>
          </div>

          <!-- Staff Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px;">
            ${filteredUsers.map(u => `
              <div class="staff-card-select" onclick="selectStaffForLogin('${u.id}')">
                <div style="display:flex; align-items:center; gap:14px;">
                  <span style="font-size:32px; background:var(--surface-2); padding:8px; border-radius:50%; border:1px solid var(--border);">${u.icon}</span>
                  <div>
                    <h3 style="font-size:16px; font-weight:800; color:var(--text);">${u.name}</h3>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                      <span style="font-weight:700; color:var(--primary);">${u.role.toUpperCase()}</span>
                      ${u.station ? ' • ' + u.station : ''}
                      ${u.seniority ? ' (' + u.seniority + ')' : ''}
                    </div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button class="btn-primary" style="min-height:38px; padding:6px 14px; font-size:13px; font-weight:700; border-radius:var(--radius-sm);" onclick="event.stopPropagation(); selectStaffForLogin('${u.id}');">
                    Enter PIN ➔
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Demo Credentials Reference Accordion -->
          <details style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; box-shadow:var(--shadow);">
            <summary style="font-size:14px; font-weight:800; color:var(--text); cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
              <span>📋 Quick Staff Directory & PIN Reference Guide (For Testing)</span>
              <span style="font-size:12px; color:var(--primary); font-weight:700;">Click to View All PINs</span>
            </summary>
            
            <div style="margin-top:14px; display:flex; flex-direction:column; gap:14px;">
              <p style="font-size:13px; color:var(--text-muted);">
                KitchenCare strictly requires 4-digit PIN authentication for each user. You can click <b>"⚡ Test Login"</b> on any staff member to instantly verify their PIN and sign in:
              </p>

              <!-- Owners & Admins -->
              <div>
                <h4 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">👑 Owners & Admins</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Rajesh Sharma</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">1111</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_admin', '1111')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Sunita Sharma</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">1112</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_admin2', '1112')">⚡ Test</button>
                  </div>
                </div>
              </div>

              <!-- Managers -->
              <div>
                <h4 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">📋 Kitchen & Floor Managers</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Amit Patel</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">2222</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_mgr', '2222')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Priya Mehta</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">2223</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_mgr2', '2223')">⚡ Test</button>
                  </div>
                </div>
              </div>

              <!-- Chefs -->
              <div>
                <h4 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">👨‍🍳 Culinary Chefs</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Vikram Singh (Tandoor)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3331</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c1', '3331')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Suresh Yadav (Gravy)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3332</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c2', '3332')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Rahul Verma (Wok)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3333</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c3', '3333')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Deepak Roy (Cold)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3334</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c4', '3334')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Manoj Kumar (Roti)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3335</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c5', '3335')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Meera Joshi (Dessert)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3336</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c6', '3336')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Anita Desai (South Indian)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">3337</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_c7', '3337')">⚡ Test</button>
                  </div>
                </div>
              </div>

              <!-- Waiters -->
              <div>
                <h4 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">🍽️ Waiters & Servers</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Pooja Sharma (Sec A)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4441</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w1', '4441')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Rohan Das (Sec B)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4442</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w2', '4442')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Neha Gupta (Sec C)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4443</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w3', '4443')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Rahul Nair (Terrace)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4444</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w4', '4444')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Simran Kaur (VIP)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4445</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w5', '4445')">⚡ Test</button>
                  </div>
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Arjun Kapoor (Bar)</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">4446</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_w6', '4446')">⚡ Test</button>
                  </div>
                </div>
              </div>

              <!-- Cashier -->
              <div>
                <h4 style="font-size:13px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">🧾 Cashier Counter</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
                  <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>Kavita Rao</b><div style="font-size:11px; color:var(--text-muted);">PIN: <code style="font-weight:800; color:var(--primary);">5551</code></div></div>
                    <button class="btn-outline" style="min-height:30px; padding:2px 8px; font-size:11px;" onclick="testLoginWithPin('u_cashier', '5551')">⚡ Test</button>
                  </div>
                </div>
              </div>

            </div>
          </details>
        </div>
      `;
    }
