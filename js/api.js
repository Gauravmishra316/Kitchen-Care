/**
 * KitchenCare REST API Client
 * Interfaces with the Node.js SQLite backend on /api/...
 */
const Api = {
  baseUrl: '/api',

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async syncFullState() {
    try {
      const res = await fetch(`${this.baseUrl}/sync`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API sync unavailable, using local cache:', err.message);
    }
    return null;
  },

  async authenticate(userId, pin) {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin })
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateTable(tableId, data) {
    try {
      const res = await fetch(`${this.baseUrl}/tables/${encodeURIComponent(tableId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async settleTable(tableId, paymentMode, amount, staffName) {
    try {
      const res = await fetch(`${this.baseUrl}/tables/${encodeURIComponent(tableId)}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode, amount, staffName })
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async createOrder(orderData) {
    try {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateOrderStatus(orderId, status, chefId, chefName) {
    try {
      const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, chefId, chefName })
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async deductFEFO(dishId, qty) {
    try {
      const res = await fetch(`${this.baseUrl}/ingredients/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId, qty })
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async addStock(ingredientId, batchData) {
    try {
      const res = await fetch(`${this.baseUrl}/ingredients/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId, batchData })
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async logAudit(userId, userName, action, details) {
    try {
      await fetch(`${this.baseUrl}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, action, details })
      });
    } catch {}
  }
};
