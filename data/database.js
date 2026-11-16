/**
 * KitchenCare Database Layer
 * Uses Node.js native SQLite (node:sqlite DatabaseSync) with JSON file fallback.
 * Provides persistent storage for users, tables, dishes, ingredients, FEFO batches, orders, and audit logs.
 */

const fs = require('fs');
const path = require('path');

class KitchenDatabase {
  constructor() {
    this.dataDir = __dirname;
    this.dbPath = path.join(this.dataDir, 'kitchencare.db');
    this.jsonBackupPath = path.join(this.dataDir, 'kitchencare.json');
    this.db = null;
    this.isSqlite = false;
    this.init();
  }

  init() {
    try {
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);
      this.isSqlite = true;
      this.setupSqliteTables();
      this.seedSqliteIfEmpty();
      console.log('✅ SQLite Database connected:', this.dbPath);
    } catch (err) {
      console.warn('⚠️ node:sqlite unavailable, using JSON file fallback:', err.message);
      this.isSqlite = false;
      this.initJsonStore();
    }
  }

  setupSqliteTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        pin TEXT,
        icon TEXT,
        seniority TEXT,
        station TEXT,
        active INTEGER,
        on_shift INTEGER
      );

      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        name TEXT,
        capacity INTEGER,
        status TEXT,
        waiter_name TEXT,
        guests_count INTEGER
      );

      CREATE TABLE IF NOT EXISTS storage_units (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT,
        type TEXT,
        target_min REAL,
        target_max REAL,
        current_temp REAL,
        last_checked TEXT
      );

      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT,
        unit TEXT,
        min_threshold REAL,
        total_qty REAL,
        storage_id TEXT
      );

      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        ingredient_id TEXT,
        qty REAL,
        expiry TEXT,
        supplier TEXT,
        received TEXT,
        cost_per_unit REAL
      );

      CREATE TABLE IF NOT EXISTS dishes (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        icon TEXT,
        tag TEXT,
        allergens TEXT,
        cost_per_portion REAL,
        prep_time_min INTEGER,
        station TEXT,
        ingredients TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        table_name TEXT,
        waiter_name TEXT,
        chef_id TEXT,
        chef_name TEXT,
        status TEXT,
        started_at TEXT,
        dishes TEXT,
        notes TEXT,
        allergies TEXT,
        scribble_data TEXT
      );

      CREATE TABLE IF NOT EXISTS wastage_logs (
        id TEXT PRIMARY KEY,
        date TEXT,
        ingredient_name TEXT,
        qty TEXT,
        reason TEXT,
        cost REAL,
        staff TEXT
      );

      CREATE TABLE IF NOT EXISTS temperature_logs (
        id TEXT PRIMARY KEY,
        date TEXT,
        time TEXT,
        unit_name TEXT,
        temp REAL,
        status TEXT,
        signed_by TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        user_id TEXT,
        user_name TEXT,
        action TEXT,
        details TEXT
      );
    `);
  }

  seedSqliteIfEmpty() {
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
      console.log('Seeding initial data into SQLite...');
      const seed = this.getSeedData();

      // Users
      const insUser = this.db.prepare(`
        INSERT INTO users (id, name, role, pin, icon, seniority, station, active, on_shift)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of seed.users) {
        insUser.run(u.id, u.name, u.role, u.pin, u.icon, u.seniority || '', u.station || '', u.active ? 1 : 0, u.onShift ? 1 : 0);
      }

      // Tables
      const insTable = this.db.prepare(`
        INSERT INTO tables (id, name, capacity, status, waiter_name, guests_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const t of seed.tables) {
        insTable.run(t.id, t.name, t.capacity, t.status, t.waiterName || null, t.guestsCount || 0);
      }

      // Storage Units
      const insStorage = this.db.prepare(`
        INSERT INTO storage_units (id, name, icon, type, target_min, target_max, current_temp, last_checked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of seed.storageUnits) {
        insStorage.run(s.id, s.name, s.icon, s.type, s.targetMin, s.targetMax, s.currentTemp, s.lastChecked);
      }

      // Ingredients & Batches
      const insIng = this.db.prepare(`
        INSERT INTO ingredients (id, name, icon, unit, min_threshold, total_qty, storage_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insBatch = this.db.prepare(`
        INSERT INTO batches (id, ingredient_id, qty, expiry, supplier, received, cost_per_unit)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ing of seed.ingredients) {
        insIng.run(ing.id, ing.name, ing.icon, ing.unit, ing.minThreshold, ing.totalQty, ing.storageId);
        if (ing.batches) {
          for (const b of ing.batches) {
            insBatch.run(b.id, ing.id, b.qty, b.expiry, b.supplier, b.received, b.costPerUnit);
          }
        }
      }

      // Dishes
      const insDish = this.db.prepare(`
        INSERT INTO dishes (id, name, category, icon, tag, allergens, cost_per_portion, prep_time_min, station, ingredients)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of seed.dishes) {
        insDish.run(
          d.id, d.name, d.category, d.icon, d.tag,
          JSON.stringify(d.allergens || []),
          d.costPerPortion, d.prepTimeMin, d.station,
          JSON.stringify(d.ingredients || [])
        );
      }

      // Orders
      const insOrder = this.db.prepare(`
        INSERT INTO orders (id, table_name, waiter_name, chef_id, chef_name, status, started_at, dishes, notes, allergies, scribble_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const o of seed.orders) {
        insOrder.run(
          o.id, o.table, o.waiterName, o.chefId, o.chefName, o.status,
          o.startedAt, JSON.stringify(o.dishes || []), o.notes || '', o.allergies || '', o.scribbleData || null
        );
      }

      // Wastage Logs
      const insWastage = this.db.prepare(`
        INSERT INTO wastage_logs (id, date, ingredient_name, qty, reason, cost, staff)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const w of seed.wastageLogs) {
        insWastage.run(w.id, w.date, w.ingredientName, w.qty, w.reason, w.cost, w.staff);
      }

      // Temperature Logs
      const insTemp = this.db.prepare(`
        INSERT INTO temperature_logs (id, date, time, unit_name, temp, status, signed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of seed.temperatureLogs) {
        insTemp.run(t.id, t.date, t.time, t.unitName, t.temp, t.status, t.signedBy);
      }

      // Audit Logs
      const insAudit = this.db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const a of (seed.auditLogs || [])) {
        insAudit.run(a.id, a.timestamp, a.userId, a.userName, a.action, a.details);
      }

      console.log('✅ SQLite Initial Seed Complete! 18 Users, 38 Dishes, 35 Ingredients.');
    }
  }

  // Fallback JSON store
  initJsonStore() {
    if (!fs.existsSync(this.jsonBackupPath)) {
      const seed = this.getSeedData();
      fs.writeFileSync(this.jsonBackupPath, JSON.stringify(seed, null, 2), 'utf8');
    }
  }

  getJsonData() {
    try {
      return JSON.parse(fs.readFileSync(this.jsonBackupPath, 'utf8'));
    } catch {
      return this.getSeedData();
    }
  }

  saveJsonData(data) {
    fs.writeFileSync(this.jsonBackupPath, JSON.stringify(data, null, 2), 'utf8');
  }

  // Comprehensive Public Query Methods
  getFullState() {
    if (!this.isSqlite) return this.getJsonData();

    const users = this.db.prepare('SELECT * FROM users').all().map(u => ({
      ...u,
      active: !!u.active,
      onShift: !!u.on_shift
    }));

    const tables = this.db.prepare('SELECT * FROM tables').all().map(t => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      status: t.status,
      waiterName: t.waiter_name,
      guestsCount: t.guests_count
    }));

    const storageUnits = this.db.prepare('SELECT * FROM storage_units').all().map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      type: s.type,
      targetMin: s.target_min,
      targetMax: s.target_max,
      currentTemp: s.current_temp,
      lastChecked: s.last_checked
    }));

    const batches = this.db.prepare('SELECT * FROM batches ORDER BY expiry ASC').all();
    const ingredients = this.db.prepare('SELECT * FROM ingredients').all().map(ing => {
      const ingBatches = batches.filter(b => b.ingredient_id === ing.id).map(b => ({
        id: b.id,
        qty: b.qty,
        expiry: b.expiry,
        supplier: b.supplier,
        received: b.received,
        costPerUnit: b.cost_per_unit
      }));
      return {
        id: ing.id,
        name: ing.name,
        icon: ing.icon,
        unit: ing.unit,
        minThreshold: ing.min_threshold,
        totalQty: ing.total_qty,
        storageId: ing.storage_id,
        batches: ingBatches
      };
    });

    const dishes = this.db.prepare('SELECT * FROM dishes').all().map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      icon: d.icon,
      tag: d.tag,
      allergens: JSON.parse(d.allergens || '[]'),
      costPerPortion: d.cost_per_portion,
      prepTimeMin: d.prep_time_min,
      station: d.station,
      ingredients: JSON.parse(d.ingredients || '[]')
    }));

    const orders = this.db.prepare('SELECT * FROM orders').all().map(o => ({
      id: o.id,
      table: o.table_name,
      waiterName: o.waiter_name,
      chefId: o.chef_id,
      chefName: o.chef_name,
      status: o.status,
      startedAt: o.started_at,
      dishes: JSON.parse(o.dishes || '[]'),
      notes: o.notes,
      allergies: o.allergies,
      scribbleData: o.scribble_data
    }));

    const wastageLogs = this.db.prepare('SELECT * FROM wastage_logs ORDER BY date DESC').all().map(w => ({
      id: w.id,
      date: w.date,
      ingredientName: w.ingredient_name,
      qty: w.qty,
      reason: w.reason,
      cost: w.cost,
      staff: w.staff
    }));

    const temperatureLogs = this.db.prepare('SELECT * FROM temperature_logs ORDER BY date DESC').all().map(t => ({
      id: t.id,
      date: t.date,
      time: t.time,
      unitName: t.unit_name,
      temp: t.temp,
      status: t.status,
      signedBy: t.signed_by
    }));

    const auditLogs = this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200').all().map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      userId: a.user_id,
      userName: a.user_name,
      action: a.action,
      details: a.details
    }));

    return {
      users,
      tables,
      storageUnits,
      ingredients,
      dishes,
      orders,
      wastageLogs,
      temperatureLogs,
      auditLogs
    };
  }

  // Auth
  authenticateUser(userId, pin) {
    if (!this.isSqlite) {
      const data = this.getJsonData();
      return data.users.find(u => u.id === userId && u.pin === pin);
    }
    const user = this.db.prepare('SELECT * FROM users WHERE id = ? AND pin = ?').get(userId, pin);
    if (user) {
      this.logAudit(user.id, user.name, 'User Login Successful', `Role: ${user.role}`);
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        icon: user.icon,
        seniority: user.seniority,
        station: user.station
      };
    } else {
      const u = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (u) {
        this.logAudit(u.id, u.name, 'Failed Login Attempt', 'Invalid PIN entered');
      }
      return null;
    }
  }

  // Tables
  updateTable(tableId, fields = {}) {
    if (!this.isSqlite) {
      const data = this.getJsonData();
      const t = data.tables.find(x => x.id === tableId || x.name === tableId);
      if (t) {
        Object.assign(t, fields);
        this.saveJsonData(data);
      }
      return t;
    }
    const current = this.db.prepare('SELECT * FROM tables WHERE id = ? OR name = ?').get(tableId, tableId);
    if (!current) return null;

    const status = fields.status !== undefined ? fields.status : current.status;
    const waiterName = fields.waiterName !== undefined ? fields.waiterName : current.waiter_name;
    const guestsCount = fields.guestsCount !== undefined ? fields.guestsCount : current.guests_count;

    this.db.prepare(`
      UPDATE tables
      SET status = ?, waiter_name = ?, guests_count = ?
      WHERE id = ?
    `).run(status, waiterName, guestsCount, current.id);

    return { id: current.id, name: current.name, capacity: current.capacity, status, waiterName, guestsCount };
  }

  // Orders
  createOrder(orderData) {
    const id = orderData.id || 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const order = {
      id,
      table: orderData.table,
      waiterName: orderData.waiterName || 'Server',
      chefId: orderData.chefId || null,
      chefName: orderData.chefName || 'Unassigned',
      status: orderData.status || 'cooking',
      startedAt: orderData.startedAt || new Date().toISOString(),
      dishes: orderData.dishes || [],
      notes: orderData.notes || '',
      allergies: orderData.allergies || '',
      scribbleData: orderData.scribbleData || null
    };

    if (!this.isSqlite) {
      const data = this.getJsonData();
      data.orders = [order, ...data.orders];
      this.saveJsonData(data);
      this.updateTable(order.table, { status: order.status, waiterName: order.waiterName });
      return order;
    }

    this.db.prepare(`
      INSERT INTO orders (id, table_name, waiter_name, chef_id, chef_name, status, started_at, dishes, notes, allergies, scribble_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id, order.table, order.waiterName, order.chefId, order.chefName,
      order.status, order.startedAt, JSON.stringify(order.dishes),
      order.notes, order.allergies, order.scribbleData
    );

    this.updateTable(order.table, { status: order.status, waiterName: order.waiterName });
    this.logAudit(order.waiterName, order.waiterName, 'KOT Dispatched', `Table: ${order.table}, Items: ${order.dishes.length}`);
    return order;
  }

  updateOrderStatus(orderId, status, chefId = null, chefName = null) {
    if (!this.isSqlite) {
      const data = this.getJsonData();
      const o = data.orders.find(x => x.id === orderId);
      if (o) {
        o.status = status;
        if (chefId) o.chefId = chefId;
        if (chefName) o.chefName = chefName;
        this.saveJsonData(data);
        this.updateTable(o.table, { status });
      }
      return o;
    }

    const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return null;

    const newChefId = chefId || order.chef_id;
    const newChefName = chefName || order.chef_name;

    this.db.prepare(`
      UPDATE orders
      SET status = ?, chef_id = ?, chef_name = ?
      WHERE id = ?
    `).run(status, newChefId, newChefName, orderId);

    this.updateTable(order.table_name, { status });
    this.logAudit(newChefName || 'Kitchen', newChefName || 'Kitchen', 'Order Status Update', `Order ${orderId} -> ${status}`);
    return { ...order, status, chefId: newChefId, chefName: newChefName };
  }

  // FEFO Inventory Auto-Deduction
  deductFEFO(dishId, qty = 1) {
    if (!this.isSqlite) {
      // JSON fallback implementation
      const data = this.getJsonData();
      const dish = data.dishes.find(d => d.id === dishId);
      if (!dish || !dish.ingredients) return { success: false };
      for (const recipeItem of dish.ingredients) {
        const requiredQty = recipeItem.qty * qty;
        const ing = data.ingredients.find(i => i.id === recipeItem.ingredientId);
        if (ing) {
          ing.batches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
          let needed = requiredQty;
          for (const b of ing.batches) {
            if (needed <= 0) break;
            if (b.qty >= needed) {
              b.qty = parseFloat((b.qty - needed).toFixed(3));
              needed = 0;
            } else {
              needed = parseFloat((needed - b.qty).toFixed(3));
              b.qty = 0;
            }
          }
          ing.batches = ing.batches.filter(b => b.qty > 0);
          ing.totalQty = parseFloat(ing.batches.reduce((sum, b) => sum + b.qty, 0).toFixed(3));
        }
      }
      this.saveJsonData(data);
      return { success: true };
    }

    const dishRow = this.db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId);
    if (!dishRow) return { success: false, error: 'Dish not found' };

    const recipeIngredients = JSON.parse(dishRow.ingredients || '[]');
    for (const item of recipeIngredients) {
      const requiredQty = item.qty * qty;
      const batches = this.db.prepare('SELECT * FROM batches WHERE ingredient_id = ? ORDER BY expiry ASC').all(item.ingredientId);
      let needed = requiredQty;

      for (const b of batches) {
        if (needed <= 0) break;
        if (b.qty >= needed) {
          const newQty = parseFloat((b.qty - needed).toFixed(3));
          this.db.prepare('UPDATE batches SET qty = ? WHERE id = ?').run(newQty, b.id);
          needed = 0;
        } else {
          needed = parseFloat((needed - b.qty).toFixed(3));
          this.db.prepare('DELETE FROM batches WHERE id = ?').run(b.id);
        }
      }

      // Recalculate total quantity for ingredient
      const totalRow = this.db.prepare('SELECT COALESCE(SUM(qty), 0) as total FROM batches WHERE ingredient_id = ?').get(item.ingredientId);
      this.db.prepare('UPDATE ingredients SET total_qty = ? WHERE id = ?').run(totalRow.total, item.ingredientId);
    }

    this.logAudit('Chef/KDS', 'KDS Auto-System', 'FEFO Deduction', `Deducted ingredients for ${qty}x ${dishRow.name}`);
    return { success: true };
  }

  // Settle Bill & Table Reset
  settleTable(tableId, paymentMode = 'UPI', amount = 0, staffName = 'Cashier') {
    this.updateTable(tableId, { status: 'vacant', waiterName: null, guestsCount: 0 });

    if (this.isSqlite) {
      this.db.prepare(`
        UPDATE orders
        SET status = 'paid'
        WHERE table_name = ? AND status != 'paid'
      `).run(tableId);
    } else {
      const data = this.getJsonData();
      data.orders.forEach(o => {
        if (o.table === tableId && o.status !== 'paid') o.status = 'paid';
      });
      this.saveJsonData(data);
    }

    this.logAudit(staffName, staffName, 'Bill Settled & Table Reset', `Table: ${tableId}, Mode: ${paymentMode}, Amount: ₹${amount}`);
    return { success: true, tableId, status: 'vacant' };
  }

  // Goods Received / Add Stock
  addStockBatch(ingredientId, batchData) {
    const batchId = 'b_' + Date.now().toString(36);
    const qty = parseFloat(batchData.qty);
    const cost = parseFloat(batchData.costPerUnit || 0);

    if (this.isSqlite) {
      this.db.prepare(`
        INSERT INTO batches (id, ingredient_id, qty, expiry, supplier, received, cost_per_unit)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(batchId, ingredientId, qty, batchData.expiry, batchData.supplier, batchData.received || new Date().toISOString().split('T')[0], cost);

      const totalRow = this.db.prepare('SELECT COALESCE(SUM(qty), 0) as total FROM batches WHERE ingredient_id = ?').get(ingredientId);
      this.db.prepare('UPDATE ingredients SET total_qty = ? WHERE id = ?').run(totalRow.total, ingredientId);
    } else {
      const data = this.getJsonData();
      const ing = data.ingredients.find(i => i.id === ingredientId);
      if (ing) {
        ing.batches.push({ id: batchId, qty, expiry: batchData.expiry, supplier: batchData.supplier, received: batchData.received, costPerUnit: cost });
        ing.totalQty += qty;
        this.saveJsonData(data);
      }
    }

    this.logAudit('Manager', batchData.staff || 'Manager', 'Stock Received', `Ingredient: ${ingredientId}, Qty: ${qty}`);
    return { success: true, batchId };
  }

  // Logs
  logAudit(userId, userName, action, details = '') {
    const entry = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      userId: userId || 'system',
      userName: userName || 'System',
      action,
      details
    };

    if (this.isSqlite) {
      this.db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(entry.id, entry.timestamp, entry.userId, entry.userName, entry.action, entry.details);
    } else {
      const data = this.getJsonData();
      data.auditLogs = [entry, ...(data.auditLogs || [])];
      this.saveJsonData(data);
    }
  }

  // Seed Data Generator
  getSeedData() {
    const today = new Date();
    const addDays = (d) => {
      const res = new Date(today);
      res.setDate(res.getDate() + d);
      return res.toISOString().split('T')[0];
    };

    return {
      users: [
        { id: 'u_admin', name: 'Rajesh Sharma', role: 'admin', pin: '1111', icon: '👑', seniority: 'Owner & Managing Director', station: 'Management', active: true, onShift: true },
        { id: 'u_admin2', name: 'Sunita Sharma', role: 'admin', pin: '1112', icon: '👑', seniority: 'Director of Operations', station: 'Management', active: true, onShift: true },
        { id: 'u_mgr', name: 'Amit Patel', role: 'manager', pin: '2222', icon: '📋', seniority: 'General Kitchen Manager', station: 'Inventory & Ops', active: true, onShift: true },
        { id: 'u_mgr2', name: 'Priya Mehta', role: 'manager', pin: '2223', icon: '📋', seniority: 'Floor & Operations Manager', station: 'Service Quality', active: true, onShift: true },
        { id: 'u_c1', name: 'Vikram Singh', role: 'chef', pin: '3331', icon: '👨‍🍳', seniority: 'Executive Head Chef', station: 'Tandoor', activeTasks: 1, onShift: true },
        { id: 'u_c2', name: 'Suresh Yadav', role: 'chef', pin: '3332', icon: '👨‍🍳', seniority: 'Senior Sous Chef', station: 'Gravy', activeTasks: 1, onShift: true },
        { id: 'u_c3', name: 'Rahul Verma', role: 'chef', pin: '3333', icon: '👨‍🍳', seniority: 'Commi Chef (Wok Master)', station: 'Wok', activeTasks: 0, onShift: true },
        { id: 'u_c4', name: 'Deepak Roy', role: 'chef', pin: '3334', icon: '👨‍🍳', seniority: 'Pantry & Salad Chef', station: 'Cold', activeTasks: 0, onShift: true },
        { id: 'u_c5', name: 'Manoj Kumar', role: 'chef', pin: '3335', icon: '👨‍🍳', seniority: 'Roti & Bread Master', station: 'Tandoor', activeTasks: 0, onShift: true },
        { id: 'u_c6', name: 'Meera Joshi', role: 'chef', pin: '3336', icon: '👩‍🍳', seniority: 'Pastry & Halwai Chef', station: 'Dessert', activeTasks: 0, onShift: true },
        { id: 'u_c7', name: 'Anita Desai', role: 'chef', pin: '3337', icon: '👩‍🍳', seniority: 'South Indian Specialist', station: 'South Indian', activeTasks: 0, onShift: true },
        { id: 'u_w1', name: 'Pooja Sharma', role: 'waiter', pin: '4441', icon: '🍽️', seniority: 'Senior Captain', station: 'Section A (Tables 1-3)', active: true, onShift: true },
        { id: 'u_w2', name: 'Rohan Das', role: 'waiter', pin: '4442', icon: '🍽️', seniority: 'Floor Server', station: 'Section B (Tables 4-6)', active: true, onShift: true },
        { id: 'u_w3', name: 'Neha Gupta', role: 'waiter', pin: '4443', icon: '🍽️', seniority: 'Floor Server', station: 'Section C (Tables 7-9)', active: true, onShift: true },
        { id: 'u_w4', name: 'Rahul Nair', role: 'waiter', pin: '4444', icon: '🍽️', seniority: 'Terrace Server', station: 'Outdoor Terrace', active: true, onShift: true },
        { id: 'u_w5', name: 'Simran Kaur', role: 'waiter', pin: '4445', icon: '🍽️', seniority: 'VIP Lounge Server', station: 'VIP Family Room', active: true, onShift: true },
        { id: 'u_w6', name: 'Arjun Kapoor', role: 'waiter', pin: '4446', icon: '🍽️', seniority: 'Bar & Lounge Server', station: 'Bar & Patio', active: true, onShift: true },
        { id: 'u_cashier', name: 'Kavita Rao', role: 'cashier', pin: '5551', icon: '🧾', seniority: 'Head Cashier', station: 'Billing Counter', active: true, onShift: true }
      ],
      tables: [
        { id: 'Table 1', name: 'Table 1', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 2', name: 'Table 2', capacity: 2, status: 'cooking', waiterName: 'Rohan Das', guestsCount: 2 },
        { id: 'Table 3', name: 'Table 3', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 4', name: 'Table 4', capacity: 6, status: 'cooking', waiterName: 'Pooja Sharma', guestsCount: 4 },
        { id: 'Table 5', name: 'Table 5', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 6', name: 'Table 6', capacity: 2, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 7', name: 'Table 7', capacity: 4, status: 'cooking', waiterName: 'Neha Gupta', guestsCount: 3 },
        { id: 'Table 8', name: 'Table 8', capacity: 8, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 9', name: 'Table 9', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
        { id: 'Table 10', name: 'Table 10', capacity: 6, status: 'vacant', waiterName: null, guestsCount: 0 }
      ],
      storageUnits: [
        { id: 'st_fridge1', name: 'Kitchen Fridge 1 (Veg & Dairy)', icon: '🧊', type: 'fridge', targetMin: 0, targetMax: 5, currentTemp: 3.5, lastChecked: '10:00 AM' },
        { id: 'st_fridge2', name: 'Prep Fridge 2 (Poultry & Meat)', icon: '🧊', type: 'fridge', targetMin: 0, targetMax: 5, currentTemp: 4.1, lastChecked: '10:00 AM' },
        { id: 'st_freezer1', name: 'Deep Freezer 1', icon: '❄️', type: 'freezer', targetMin: -25, targetMax: -18, currentTemp: -19.2, lastChecked: '10:00 AM' },
        { id: 'st_dry', name: 'Dry Ration Store', icon: '📦', type: 'dry', targetMin: 15, targetMax: 30, currentTemp: 24.0, lastChecked: '10:00 AM' }
      ],
      ingredients: [
        { id: 'ing_tomato', name: 'Tomato (टमाटर)', icon: '🍅', unit: 'kg', minThreshold: 10, totalQty: 18, storageId: 'st_fridge1', batches: [
          { id: 'b_tom_1', qty: 6, expiry: addDays(2), supplier: 'Sabzi Mandi', received: addDays(-3), costPerUnit: 35 },
          { id: 'b_tom_2', qty: 12, expiry: addDays(6), supplier: 'Sabzi Mandi', received: addDays(-1), costPerUnit: 32 }
        ]},
        { id: 'ing_onion', name: 'Onion (प्याज)', icon: '🧅', unit: 'kg', minThreshold: 20, totalQty: 35, storageId: 'st_dry', batches: [
          { id: 'b_on_1', qty: 35, expiry: addDays(25), supplier: 'Nashik Agro', received: addDays(-5), costPerUnit: 28 }
        ]},
        { id: 'ing_spinach', name: 'Spinach (पालक)', icon: '🥬', unit: 'kg', minThreshold: 5, totalQty: 3, storageId: 'st_fridge1', batches: [
          { id: 'b_sp_1', qty: 3, expiry: addDays(1), supplier: 'Green Farms', received: addDays(-2), costPerUnit: 40 }
        ]},
        { id: 'ing_paneer', name: 'Fresh Paneer (पनीर)', icon: '🧀', unit: 'kg', minThreshold: 6, totalQty: 8, storageId: 'st_fridge1', batches: [
          { id: 'b_pan_1', qty: 3, expiry: addDays(0), supplier: 'Amul Dairy', received: addDays(-4), costPerUnit: 340 },
          { id: 'b_pan_2', qty: 5, expiry: addDays(4), supplier: 'Amul Dairy', received: addDays(-1), costPerUnit: 340 }
        ]},
        { id: 'ing_chicken', name: 'Curry Chicken (चिकन)', icon: '🍗', unit: 'kg', minThreshold: 10, totalQty: 14, storageId: 'st_fridge2', batches: [
          { id: 'b_chk_1', qty: 14, expiry: addDays(3), supplier: 'Zorabian Fresh', received: addDays(-1), costPerUnit: 220 }
        ]},
        { id: 'ing_rice', name: 'Basmati Rice (चावल)', icon: '🍚', unit: 'kg', minThreshold: 30, totalQty: 60, storageId: 'st_dry', batches: [
          { id: 'b_rc_1', qty: 60, expiry: addDays(180), supplier: 'India Gate', received: addDays(-15), costPerUnit: 95 }
        ]},
        { id: 'ing_noodles', name: 'Hakka Noodles', icon: '🍜', unit: 'kg', minThreshold: 8, totalQty: 15, storageId: 'st_dry', batches: [
          { id: 'b_nd_1', qty: 15, expiry: addDays(60), supplier: 'Ching Secret', received: addDays(-10), costPerUnit: 80 }
        ]},
        { id: 'ing_cabbage', name: 'Cabbage (पत्तागोभी)', icon: '🥬', unit: 'kg', minThreshold: 6, totalQty: 9, storageId: 'st_fridge1', batches: [
          { id: 'b_cab_1', qty: 9, expiry: addDays(8), supplier: 'Sabzi Mandi', received: addDays(-2), costPerUnit: 25 }
        ]},
        { id: 'ing_oil', name: 'Mustard / Refined Oil', icon: '🛢️', unit: 'L', minThreshold: 20, totalQty: 45, storageId: 'st_dry', batches: [
          { id: 'b_oil_1', qty: 45, expiry: addDays(120), supplier: 'Fortune', received: addDays(-20), costPerUnit: 140 }
        ]},
        { id: 'ing_cream', name: 'Fresh Malai / Cream', icon: '🥛', unit: 'L', minThreshold: 4, totalQty: 5, storageId: 'st_fridge1', batches: [
          { id: 'b_crm_1', qty: 5, expiry: addDays(5), supplier: 'Amul', received: addDays(-2), costPerUnit: 210 }
        ]},
        { id: 'ing_ginger', name: 'Ginger (अदरक)', icon: '🫚', unit: 'kg', minThreshold: 3, totalQty: 4, storageId: 'st_fridge1', batches: [
          { id: 'b_gng_1', qty: 4, expiry: addDays(10), supplier: 'Sabzi Mandi', received: addDays(-2), costPerUnit: 120 }
        ]},
        { id: 'ing_garlic', name: 'Garlic (लहसुन)', icon: '🧄', unit: 'kg', minThreshold: 4, totalQty: 7, storageId: 'st_dry', batches: [
          { id: 'b_grl_1', qty: 7, expiry: addDays(25), supplier: 'Agro Traders', received: addDays(-5), costPerUnit: 180 }
        ]},
        { id: 'ing_potato', name: 'Potato (आलू)', icon: '🥔', unit: 'kg', minThreshold: 25, totalQty: 40, storageId: 'st_dry', batches: [
          { id: 'b_pot_1', qty: 40, expiry: addDays(30), supplier: 'Agro Traders', received: addDays(-5), costPerUnit: 24 }
        ]},
        { id: 'ing_chilli', name: 'Green Chilli (हरी मिर्च)', icon: '🌶️', unit: 'kg', minThreshold: 2, totalQty: 3.5, storageId: 'st_fridge1', batches: [
          { id: 'b_chl_1', qty: 3.5, expiry: addDays(7), supplier: 'Sabzi Mandi', received: addDays(-1), costPerUnit: 60 }
        ]},
        { id: 'ing_butter', name: 'Butter (मक्खन)', icon: '🧈', unit: 'kg', minThreshold: 5, totalQty: 8, storageId: 'st_fridge1', batches: [
          { id: 'b_but_1', qty: 8, expiry: addDays(40), supplier: 'Amul', received: addDays(-10), costPerUnit: 480 }
        ]},
        { id: 'ing_besan', name: 'Gram Flour (बेसन)', icon: '🌾', unit: 'kg', minThreshold: 5, totalQty: 12, storageId: 'st_dry', batches: [
          { id: 'b_bsn_1', qty: 12, expiry: addDays(90), supplier: 'Rajdhani', received: addDays(-12), costPerUnit: 90 }
        ]},
        { id: 'ing_milk', name: 'Full Cream Milk', icon: '🥛', unit: 'L', minThreshold: 10, totalQty: 18, storageId: 'st_fridge1', batches: [
          { id: 'b_mlk_1', qty: 18, expiry: addDays(2), supplier: 'Mother Dairy', received: addDays(0), costPerUnit: 66 }
        ]},
        { id: 'ing_dahi', name: 'Curd / Dahi', icon: '🥣', unit: 'kg', minThreshold: 6, totalQty: 10, storageId: 'st_fridge1', batches: [
          { id: 'b_dh_1', qty: 10, expiry: addDays(4), supplier: 'Mother Dairy', received: addDays(-1), costPerUnit: 80 }
        ]},
        { id: 'ing_fish', name: 'Surmai / Pomfret Fish', icon: '🐟', unit: 'kg', minThreshold: 5, totalQty: 7, storageId: 'st_freezer1', batches: [
          { id: 'b_fsh_1', qty: 7, expiry: addDays(15), supplier: 'Koli Brothers', received: addDays(-3), costPerUnit: 650 }
        ]},
        { id: 'ing_coriander', name: 'Fresh Coriander (धनिया)', icon: '🌿', unit: 'kg', minThreshold: 2, totalQty: 2.2, storageId: 'st_fridge1', batches: [
          { id: 'b_cor_1', qty: 2.2, expiry: addDays(3), supplier: 'Green Farms', received: addDays(-1), costPerUnit: 50 }
        ]},
        { id: 'ing_garam_masala', name: 'Garam Masala Powder', icon: '🧂', unit: 'kg', minThreshold: 2, totalQty: 4, storageId: 'st_dry', batches: [
          { id: 'b_gm_1', qty: 4, expiry: addDays(180), supplier: 'MDH', received: addDays(-20), costPerUnit: 700 }
        ]},
        { id: 'ing_jeera', name: 'Cumin Seeds (जीरा)', icon: '🧂', unit: 'kg', minThreshold: 2, totalQty: 5, storageId: 'st_dry', batches: [
          { id: 'b_jr_1', qty: 5, expiry: addDays(200), supplier: 'Catch', received: addDays(-20), costPerUnit: 350 }
        ]},
        { id: 'ing_haldi', name: 'Turmeric (हल्दी)', icon: '🟡', unit: 'kg', minThreshold: 2, totalQty: 5, storageId: 'st_dry', batches: [
          { id: 'b_hld_1', qty: 5, expiry: addDays(240), supplier: 'MDH', received: addDays(-20), costPerUnit: 240 }
        ]},
        { id: 'ing_mutton', name: 'Fresh Mutton (मटन)', icon: '🥩', unit: 'kg', minThreshold: 5, totalQty: 6, storageId: 'st_fridge2', batches: [
          { id: 'b_mut_1', qty: 6, expiry: addDays(2), supplier: 'Al-Kabeer', received: addDays(-1), costPerUnit: 780 }
        ]},
        { id: 'ing_eggs', name: 'Farm Fresh Eggs', icon: '🥚', unit: 'pcs', minThreshold: 60, totalQty: 120, storageId: 'st_fridge1', batches: [
          { id: 'b_egg_1', qty: 120, expiry: addDays(14), supplier: 'Venky Farm', received: addDays(-2), costPerUnit: 7 }
        ]},
        { id: 'ing_urad_dal', name: 'Black Urad Dal (उड़द दाल)', icon: '🥣', unit: 'kg', minThreshold: 10, totalQty: 25, storageId: 'st_dry', batches: [
          { id: 'b_ud_1', qty: 25, expiry: addDays(150), supplier: 'Tata Sampann', received: addDays(-10), costPerUnit: 140 }
        ]},
        { id: 'ing_chana', name: 'Kabuli Chana (काबुली चना)', icon: '🧆', unit: 'kg', minThreshold: 10, totalQty: 20, storageId: 'st_dry', batches: [
          { id: 'b_ch_1', qty: 20, expiry: addDays(160), supplier: 'Tata Sampann', received: addDays(-12), costPerUnit: 130 }
        ]},
        { id: 'ing_flour', name: 'Maida / Fine Flour (मैदा)', icon: '🌾', unit: 'kg', minThreshold: 15, totalQty: 30, storageId: 'st_dry', batches: [
          { id: 'b_fl_1', qty: 30, expiry: addDays(90), supplier: 'Aashirvaad', received: addDays(-8), costPerUnit: 45 }
        ]},
        { id: 'ing_corn', name: 'Sweet Corn (मक्का)', icon: '🌽', unit: 'kg', minThreshold: 5, totalQty: 10, storageId: 'st_fridge1', batches: [
          { id: 'b_crn_1', qty: 10, expiry: addDays(20), supplier: 'McCain Agro', received: addDays(-2), costPerUnit: 90 }
        ]},
        { id: 'ing_sugar', name: 'White Cane Sugar (चीनी)', icon: '🍬', unit: 'kg', minThreshold: 15, totalQty: 35, storageId: 'st_dry', batches: [
          { id: 'b_sug_1', qty: 35, expiry: addDays(240), supplier: 'Madhur Sugar', received: addDays(-15), costPerUnit: 44 }
        ]},
        { id: 'ing_khoya', name: 'Fresh Khoya / Mawa (मावा)', icon: '🧈', unit: 'kg', minThreshold: 4, totalQty: 7, storageId: 'st_fridge1', batches: [
          { id: 'b_kh_1', qty: 7, expiry: addDays(6), supplier: 'Amul Dairy', received: addDays(-1), costPerUnit: 380 }
        ]},
        { id: 'ing_tea', name: 'Assam CTC Tea Leaves (चाय पत्ती)', icon: '☕', unit: 'kg', minThreshold: 4, totalQty: 8, storageId: 'st_dry', batches: [
          { id: 'b_tea_1', qty: 8, expiry: addDays(200), supplier: 'Wagh Bakri', received: addDays(-20), costPerUnit: 360 }
        ]},
        { id: 'ing_mango_pulp', name: 'Alphonso Mango Pulp', icon: '🥭', unit: 'kg', minThreshold: 5, totalQty: 12, storageId: 'st_dry', batches: [
          { id: 'b_mp_1', qty: 12, expiry: addDays(180), supplier: 'Ratnagiri Farms', received: addDays(-10), costPerUnit: 180 }
        ]},
        { id: 'ing_cheese', name: 'Mozzarella & Processed Cheese', icon: '🧀', unit: 'kg', minThreshold: 4, totalQty: 9, storageId: 'st_fridge1', batches: [
          { id: 'b_chs_1', qty: 9, expiry: addDays(30), supplier: 'Amul Dairy', received: addDays(-4), costPerUnit: 460 }
        ]},
        { id: 'ing_cashew', name: 'Cashew Nuts / Kaju (काजू)', icon: '🥜', unit: 'kg', minThreshold: 3, totalQty: 6, storageId: 'st_dry', batches: [
          { id: 'b_csh_1', qty: 6, expiry: addDays(120), supplier: 'Goa Dry Fruits', received: addDays(-15), costPerUnit: 850 }
        ]}
      ],
      dishes: [
        // Starters (11 dishes)
        { id: 'd_3', name: 'Paneer Tikka', category: 'Starters', icon: '🍢', tag: 'veg', allergens: ['dairy'], costPerPortion: 88, prepTimeMin: 12, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.20, unit: 'kg' }, { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' }, { ingredientId: 'ing_besan', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_11', name: 'Tandoori Chicken Full', category: 'Starters', icon: '🍗', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 180, prepTimeMin: 20, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.50, unit: 'kg' }, { ingredientId: 'ing_dahi', qty: 0.08, unit: 'kg' }, { ingredientId: 'ing_ginger', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_13', name: 'Chicken Tikka Kebab', category: 'Starters', icon: '🍢', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 140, prepTimeMin: 15, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.25, unit: 'kg' }, { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' }, { ingredientId: 'ing_garam_masala', qty: 0.01, unit: 'kg' }
        ]},
        { id: 'd_14', name: 'Hara Bhara Kebab', category: 'Starters', icon: '🟢', tag: 'veg', allergens: [], costPerPortion: 65, prepTimeMin: 12, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_spinach', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_potato', qty: 0.10, unit: 'kg' }, { ingredientId: 'ing_besan', qty: 0.03, unit: 'kg' }
        ]},
        { id: 'd_15', name: 'Dahi Ke Kebab', category: 'Starters', icon: '🥣', tag: 'veg', allergens: ['dairy'], costPerPortion: 75, prepTimeMin: 10, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_dahi', qty: 0.20, unit: 'kg' }, { ingredientId: 'ing_paneer', qty: 0.05, unit: 'kg' }, { ingredientId: 'ing_besan', qty: 0.03, unit: 'kg' }
        ]},
        { id: 'd_16', name: 'Veg Seekh Kebab', category: 'Starters', icon: '🍢', tag: 'veg', allergens: [], costPerPortion: 68, prepTimeMin: 14, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_potato', qty: 0.10, unit: 'kg' }, { ingredientId: 'ing_cabbage', qty: 0.08, unit: 'kg' }, { ingredientId: 'ing_coriander', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_17', name: 'Crispy Corn Pepper Salt', category: 'Starters', icon: '🌽', tag: 'veg', allergens: [], costPerPortion: 60, prepTimeMin: 10, station: 'Wok', ingredients: [
          { ingredientId: 'ing_corn', qty: 0.20, unit: 'kg' }, { ingredientId: 'ing_chilli', qty: 0.02, unit: 'kg' }, { ingredientId: 'ing_oil', qty: 0.03, unit: 'L' }
        ]},
        { id: 'd_9', name: 'Chilli Chicken Dry', category: 'Starters', icon: '🌶️', tag: 'non-veg', allergens: ['gluten'], costPerPortion: 110, prepTimeMin: 14, station: 'Wok', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.20, unit: 'kg' }, { ingredientId: 'ing_chilli', qty: 0.03, unit: 'kg' }, { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_18', name: 'Paneer Malai Tikka', category: 'Starters', icon: '🧀', tag: 'veg', allergens: ['dairy'], costPerPortion: 95, prepTimeMin: 14, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.20, unit: 'kg' }, { ingredientId: 'ing_cream', qty: 0.04, unit: 'L' }, { ingredientId: 'ing_dahi', qty: 0.04, unit: 'kg' }
        ]},
        { id: 'd_8', name: 'Veg Hakka Noodles', category: 'Starters', icon: '🍜', tag: 'veg', allergens: ['gluten'], costPerPortion: 55, prepTimeMin: 10, station: 'Wok', ingredients: [
          { ingredientId: 'ing_noodles', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_cabbage', qty: 0.08, unit: 'kg' }, { ingredientId: 'ing_onion', qty: 0.05, unit: 'kg' }
        ]},
        { id: 'd_32', name: 'Chilli Paneer Gravy', category: 'Starters', icon: '🥢', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 82, prepTimeMin: 12, station: 'Wok', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_chilli', qty: 0.03, unit: 'kg' }
        ]},

        // Mains / Curries & Biryanis (16 dishes)
        { id: 'd_19', name: 'Dal Makhani', category: 'Mains', icon: '🍲', tag: 'veg', allergens: ['dairy'], costPerPortion: 78, prepTimeMin: 15, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_urad_dal', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_butter', qty: 0.04, unit: 'kg' }, { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' }
        ]},
        { id: 'd_1', name: 'Butter Chicken', category: 'Mains', icon: '🍗', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 135, prepTimeMin: 18, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.25, unit: 'kg' }, { ingredientId: 'ing_tomato', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_butter', qty: 0.04, unit: 'kg' }, { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' }
        ]},
        { id: 'd_20', name: 'Paneer Butter Masala', category: 'Mains', icon: '🧀', tag: 'veg', allergens: ['dairy'], costPerPortion: 98, prepTimeMin: 15, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.18, unit: 'kg' }, { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' }, { ingredientId: 'ing_butter', qty: 0.03, unit: 'kg' }
        ]},
        { id: 'd_21', name: 'Kadai Paneer', category: 'Mains', icon: '🥘', tag: 'veg', allergens: ['dairy'], costPerPortion: 94, prepTimeMin: 15, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.18, unit: 'kg' }, { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_2', name: 'Palak Paneer', category: 'Mains', icon: '🥬', tag: 'veg', allergens: ['dairy'], costPerPortion: 92, prepTimeMin: 14, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_spinach', qty: 0.20, unit: 'kg' }
        ]},
        { id: 'd_22', name: 'Chicken Tikka Masala', category: 'Mains', icon: '🥘', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 142, prepTimeMin: 18, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.22, unit: 'kg' }, { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' }
        ]},
        { id: 'd_23', name: 'Mutton Rogan Josh', category: 'Mains', icon: '🥩', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 195, prepTimeMin: 24, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_mutton', qty: 0.25, unit: 'kg' }, { ingredientId: 'ing_onion', qty: 0.12, unit: 'kg' }
        ]},
        { id: 'd_24', name: 'Malai Kofta', category: 'Mains', icon: '🧆', tag: 'veg', allergens: ['dairy', 'nuts'], costPerPortion: 105, prepTimeMin: 18, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_paneer', qty: 0.12, unit: 'kg' }, { ingredientId: 'ing_potato', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_25', name: 'Pindi Chana Masala', category: 'Mains', icon: '🫘', tag: 'veg', allergens: [], costPerPortion: 65, prepTimeMin: 14, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_chana', qty: 0.18, unit: 'kg' }, { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_12', name: 'Boiled Egg Masala', category: 'Mains', icon: '🥚', tag: 'non-veg', allergens: [], costPerPortion: 42, prepTimeMin: 10, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_eggs', qty: 2, unit: 'pcs' }, { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_6', name: 'Chicken Dum Biryani', category: 'Mains', icon: '🍚', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 145, prepTimeMin: 22, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_chicken', qty: 0.22, unit: 'kg' }, { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' }
        ]},
        { id: 'd_26', name: 'Lucknowi Veg Dum Biryani', category: 'Mains', icon: '🍚', tag: 'veg', allergens: ['dairy'], costPerPortion: 85, prepTimeMin: 18, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' }, { ingredientId: 'ing_paneer', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_27', name: 'Mutton Dum Biryani', category: 'Mains', icon: '🍚', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 195, prepTimeMin: 24, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_mutton', qty: 0.22, unit: 'kg' }, { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' }
        ]},
        { id: 'd_7', name: 'Jeera Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 35, prepTimeMin: 10, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_jeera', qty: 0.01, unit: 'kg' }
        ]},
        { id: 'd_28', name: 'Steamed Basmati Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 28, prepTimeMin: 8, station: 'Gravy', ingredients: [
          { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' }
        ]},
        { id: 'd_33', name: 'Veg Fried Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 52, prepTimeMin: 10, station: 'Wok', ingredients: [
          { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' }, { ingredientId: 'ing_cabbage', qty: 0.06, unit: 'kg' }
        ]},

        // Breads (5 dishes)
        { id: 'd_4', name: 'Tandoori Roti', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten'], costPerPortion: 8, prepTimeMin: 6, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_besan', qty: 0.05, unit: 'kg' }
        ]},
        { id: 'd_5', name: 'Butter Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 16, prepTimeMin: 8, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' }, { ingredientId: 'ing_butter', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_29', name: 'Garlic Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 19, prepTimeMin: 8, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' }, { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' }
        ]},
        { id: 'd_30', name: 'Laccha Paratha', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 15, prepTimeMin: 8, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' }
        ]},
        { id: 'd_31', name: 'Cheese Chilli Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 28, prepTimeMin: 9, station: 'Tandoor', ingredients: [
          { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' }, { ingredientId: 'ing_cheese', qty: 0.04, unit: 'kg' }
        ]},

        // Accompaniments, Desserts & Beverages (6 dishes)
        { id: 'd_34', name: 'Boondi Raita', category: 'Accompaniments', icon: '🥣', tag: 'veg', allergens: ['dairy'], costPerPortion: 26, prepTimeMin: 5, station: 'Cold', ingredients: [
          { ingredientId: 'ing_dahi', qty: 0.15, unit: 'kg' }
        ]},
        { id: 'd_10', name: 'Green Salad', category: 'Accompaniments', icon: '🥗', tag: 'jain', allergens: [], costPerPortion: 25, prepTimeMin: 5, station: 'Cold', ingredients: [
          { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' }
        ]},
        { id: 'd_35', name: 'Gulab Jamun (2 pcs)', category: 'Desserts', icon: '🍯', tag: 'veg', allergens: ['dairy'], costPerPortion: 28, prepTimeMin: 4, station: 'Dessert', ingredients: [
          { ingredientId: 'ing_khoya', qty: 0.08, unit: 'kg' }
        ]},
        { id: 'd_36', name: 'Rasmalai (2 pcs)', category: 'Desserts', icon: '🥛', tag: 'veg', allergens: ['dairy', 'nuts'], costPerPortion: 38, prepTimeMin: 5, station: 'Dessert', ingredients: [
          { ingredientId: 'ing_milk', qty: 0.15, unit: 'L' }
        ]},
        { id: 'd_37', name: 'Punjabi Mango Lassi', category: 'Beverages', icon: '🥭', tag: 'veg', allergens: ['dairy'], costPerPortion: 32, prepTimeMin: 5, station: 'Beverages', ingredients: [
          { ingredientId: 'ing_dahi', qty: 0.18, unit: 'kg' }, { ingredientId: 'ing_mango_pulp', qty: 0.06, unit: 'kg' }
        ]},
        { id: 'd_38', name: 'Masala Kulhad Chai', category: 'Beverages', icon: '☕', tag: 'veg', allergens: ['dairy'], costPerPortion: 14, prepTimeMin: 6, station: 'Beverages', ingredients: [
          { ingredientId: 'ing_milk', qty: 0.10, unit: 'L' }, { ingredientId: 'ing_tea', qty: 0.02, unit: 'kg' }
        ]}
      ],
      orders: [
        { id: 'ord_101', table: 'Table 4', waiterName: 'Pooja Sharma', chefId: 'u_c1', chefName: 'Vikram Singh', status: 'cooking', startedAt: new Date(Date.now() - 11 * 60000).toISOString(), dishes: [
          { dishId: 'd_3', name: 'Paneer Tikka', qty: 1, notes: 'Less spicy', allergies: 'None' },
          { dishId: 'd_5', name: 'Butter Naan', qty: 2, notes: 'Extra crispy', allergies: 'None' }
        ]},
        { id: 'ord_102', table: 'Table 2', waiterName: 'Rohan Das', chefId: 'u_c2', chefName: 'Suresh Yadav', status: 'cooking', startedAt: new Date(Date.now() - 4 * 60000).toISOString(), dishes: [
          { dishId: 'd_1', name: 'Butter Chicken', qty: 1, notes: 'NO DAIRY ALLERGY!', allergies: 'Dairy Allergy' }
        ]},
        { id: 'ord_103', table: 'Table 7', waiterName: 'Neha Gupta', chefId: null, chefName: 'Unassigned', status: 'cooking', startedAt: new Date(Date.now() - 2 * 60000).toISOString(), dishes: [
          { dishId: 'd_8', name: 'Veg Hakka Noodles', qty: 1, notes: 'No Onion, No Garlic', allergies: 'None' }
        ]}
      ],
      wastageLogs: [
        { id: 'w_1', date: addDays(0), ingredientName: 'Spinach', qty: '1.2 kg', reason: 'Spoiled due to moisture', cost: 48, staff: 'Amit Patel' }
      ],
      temperatureLogs: [
        { id: 't_1', date: addDays(0), time: '10:00 AM', unitName: 'Kitchen Fridge 1', temp: 3.5, status: 'safe', signedBy: 'Amit Patel' },
        { id: 't_2', date: addDays(0), time: '10:00 AM', unitName: 'Prep Fridge 2', temp: 4.1, status: 'safe', signedBy: 'Amit Patel' },
        { id: 't_3', date: addDays(0), time: '10:00 AM', unitName: 'Deep Freezer 1', temp: -19.2, status: 'safe', signedBy: 'Amit Patel' }
      ],
      auditLogs: [
        { id: 'act_init', timestamp: new Date().toISOString(), userId: 'system', userName: 'System', action: 'System Init', details: 'Database Initialized' }
      ]
    };
  }
}

module.exports = new KitchenDatabase();
