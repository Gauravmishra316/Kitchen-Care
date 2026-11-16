/**
 * KitchenCare Master State & Storage Layer
 * Integrates SQLite REST API (/api/sync) with local client-side persistence.
 */
let isBackendConnected = false;

const DataLayer = {
      STORAGE_KEY: 'kitchencare_master_store_v2',
      
      init() {
        try {
          let raw = localStorage.getItem(this.STORAGE_KEY);
          if (!raw) {
            this.seedDemoData();
          }
        } catch (e) {
          console.error("Storage init failed:", e);
          this.seedDemoData();
        }
      },

      getData() {
        try {
          let raw = localStorage.getItem(this.STORAGE_KEY);
          if (!raw) {
            this.seedDemoData();
            raw = localStorage.getItem(this.STORAGE_KEY);
          }
          const data = raw ? JSON.parse(raw) : this.getSeedData();
          const seed = this.getSeedData();

          // Auto-migration: ensure latest users list is active
          if (!data.users || data.users.length < seed.users.length) {
            data.users = seed.users;
            this.saveData(data);
          }
          // Auto-migration: ensure all 38 dishes are available
          if (!data.dishes || data.dishes.length < seed.dishes.length) {
            data.dishes = seed.dishes;
            this.saveData(data);
          }
          // Auto-migration: ensure all ingredients are available
          if (!data.ingredients || data.ingredients.length < seed.ingredients.length) {
            data.ingredients = seed.ingredients;
            this.saveData(data);
          }
          if (!data.tables || !Array.isArray(data.tables) || data.tables.length === 0) {
            data.tables = this.getDefaultTables();
            this.saveData(data);
          }
          return data;
        } catch (e) {
          console.error("Failed to read storage:", e);
          return this.getSeedData();
        }
      },

      getDefaultTables() {
        return [
          { id: 'Table 1', name: 'Table 1', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 2', name: 'Table 2', capacity: 2, status: 'cooking', waiterName: 'Rohan Das', guestsCount: 2 },
          { id: 'Table 3', name: 'Table 3', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 4', name: 'Table 4', capacity: 6, status: 'cooking', waiterName: 'Pooja Sharma', guestsCount: 4 },
          { id: 'Table 5', name: 'Table 5', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 6', name: 'Table 6', capacity: 2, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 7', name: 'Table 7', capacity: 4, status: 'sent', waiterName: 'Neha Gupta', guestsCount: 3 },
          { id: 'Table 8', name: 'Table 8', capacity: 8, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 9', name: 'Table 9', capacity: 4, status: 'vacant', waiterName: null, guestsCount: 0 },
          { id: 'Table 10', name: 'Table 10', capacity: 6, status: 'vacant', waiterName: null, guestsCount: 0 },
        ];
      },

      saveData(data) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          return true;
        } catch (e) {
          console.error("Failed to save storage:", e);
          showToast("Storage full or unavailable!", "⚠️");
          return false;
        }
      },

      logActivity(userId, userName, action, details = "") {
        const data = this.getData();
        const entry = {
          id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          timestamp: new Date().toISOString(),
          userId,
          userName,
          action,
          details
        };
        data.auditLogs = [entry, ...(data.auditLogs || [])];
        this.saveData(data);
      },

      seedDemoData() {
        const seed = this.getSeedData();
        this.saveData(seed);
      },

      getSeedData() {
        const today = new Date();
        const addDays = (d) => {
          const res = new Date(today);
          res.setDate(res.getDate() + d);
          return res.toISOString().split('T')[0];
        };

        
        return {
          // 18 Comprehensive Users across all restaurant departments
          users: [
            // Management & Owners
            { id: 'u_admin', name: 'Rajesh Sharma', role: 'admin', pin: '1111', icon: '👑', seniority: 'Owner & Managing Director', station: 'Management', active: true, onShift: true },
            { id: 'u_admin2', name: 'Sunita Sharma', role: 'admin', pin: '1112', icon: '👑', seniority: 'Director of Operations', station: 'Management', active: true, onShift: true },
            { id: 'u_mgr', name: 'Amit Patel', role: 'manager', pin: '2222', icon: '📋', seniority: 'General Kitchen Manager', station: 'Inventory & Ops', active: true, onShift: true },
            { id: 'u_mgr2', name: 'Priya Mehta', role: 'manager', pin: '2223', icon: '📋', seniority: 'Floor & Operations Manager', station: 'Service Quality', active: true, onShift: true },

            // Culinary Team (Chefs across stations)
            { id: 'u_c1', name: 'Vikram Singh', role: 'chef', pin: '3331', icon: '👨‍🍳', seniority: 'Executive Head Chef', station: 'Tandoor', activeTasks: 1, onShift: true },
            { id: 'u_c2', name: 'Suresh Yadav', role: 'chef', pin: '3332', icon: '👨‍🍳', seniority: 'Senior Sous Chef', station: 'Gravy', activeTasks: 1, onShift: true },
            { id: 'u_c3', name: 'Rahul Verma', role: 'chef', pin: '3333', icon: '👨‍🍳', seniority: 'Commi Chef (Wok Master)', station: 'Wok', activeTasks: 0, onShift: true },
            { id: 'u_c4', name: 'Deepak Roy', role: 'chef', pin: '3334', icon: '👨‍🍳', seniority: 'Pantry & Salad Chef', station: 'Cold', activeTasks: 0, onShift: true },
            { id: 'u_c5', name: 'Manoj Kumar', role: 'chef', pin: '3335', icon: '👨‍🍳', seniority: 'Roti & Bread Master', station: 'Tandoor', activeTasks: 0, onShift: true },
            { id: 'u_c6', name: 'Meera Joshi', role: 'chef', pin: '3336', icon: '👩‍🍳', seniority: 'Pastry & Halwai Chef', station: 'Dessert', activeTasks: 0, onShift: true },
            { id: 'u_c7', name: 'Anita Desai', role: 'chef', pin: '3337', icon: '👩‍🍳', seniority: 'South Indian Specialist', station: 'South Indian', activeTasks: 0, onShift: true },

            // Waiters & Front of House Captains
            { id: 'u_w1', name: 'Pooja Sharma', role: 'waiter', pin: '4441', icon: '🍽️', seniority: 'Senior Captain', station: 'Section A (Tables 1-3)', active: true, onShift: true },
            { id: 'u_w2', name: 'Rohan Das', role: 'waiter', pin: '4442', icon: '🍽️', seniority: 'Floor Server', station: 'Section B (Tables 4-6)', active: true, onShift: true },
            { id: 'u_w3', name: 'Neha Gupta', role: 'waiter', pin: '4443', icon: '🍽️', seniority: 'Floor Server', station: 'Section C (Tables 7-9)', active: true, onShift: true },
            { id: 'u_w4', name: 'Rahul Nair', role: 'waiter', pin: '4444', icon: '🍽️', seniority: 'Terrace Server', station: 'Outdoor Terrace', active: true, onShift: true },
            { id: 'u_w5', name: 'Simran Kaur', role: 'waiter', pin: '4445', icon: '🍽️', seniority: 'VIP Lounge Server', station: 'VIP Family Room', active: true, onShift: true },
            { id: 'u_w6', name: 'Arjun Kapoor', role: 'waiter', pin: '4446', icon: '🍽️', seniority: 'Bar & Lounge Server', station: 'Bar & Patio', active: true, onShift: true },

            // Billing Cashier
            { id: 'u_cashier', name: 'Kavita Rao', role: 'cashier', pin: '5551', icon: '🧾', seniority: 'Head Cashier', station: 'Billing Counter', active: true, onShift: true }
          ],

          // Dining Tables
          tables: this.getDefaultTables(),

          // Storage Locations
          storageUnits: [
            { id: 'st_fridge1', name: 'Kitchen Fridge 1 (Veg & Dairy)', icon: '🧊', type: 'fridge', targetMin: 0, targetMax: 5, currentTemp: 3.5, lastChecked: '10:00 AM' },
            { id: 'st_fridge2', name: 'Prep Fridge 2 (Poultry & Meat)', icon: '🧊', type: 'fridge', targetMin: 0, targetMax: 5, currentTemp: 4.1, lastChecked: '10:00 AM' },
            { id: 'st_freezer1', name: 'Deep Freezer 1', icon: '❄️', type: 'freezer', targetMin: -25, targetMax: -18, currentTemp: -19.2, lastChecked: '10:00 AM' },
            { id: 'st_dry', name: 'Dry Ration Store', icon: '📦', type: 'dry', targetMin: 15, targetMax: 30, currentTemp: 24.0, lastChecked: '10:00 AM' }
          ],

          // 35 Comprehensive Indian Kitchen Ingredients with batches (FEFO)
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

          // 38 Authentic Indian Restaurant Dishes with Recipes & Ingredients
          dishes: [
            // Starters & Tandoor (9 dishes)
            { id: 'd_3', name: 'Paneer Tikka', category: 'Starters', icon: '🍢', tag: 'veg', allergens: ['dairy'], costPerPortion: 88, prepTimeMin: 12, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' },
              { ingredientId: 'ing_besan', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_11', name: 'Tandoori Chicken Full', category: 'Starters', icon: '🍗', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 180, prepTimeMin: 20, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.50, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_ginger', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_13', name: 'Chicken Tikka Kebab', category: 'Starters', icon: '🍢', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 140, prepTimeMin: 15, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.25, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' },
              { ingredientId: 'ing_garam_masala', qty: 0.01, unit: 'kg' }
            ]},
            { id: 'd_14', name: 'Hara Bhara Kebab', category: 'Starters', icon: '🟢', tag: 'veg', allergens: [], costPerPortion: 65, prepTimeMin: 12, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_spinach', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_potato', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_besan', qty: 0.03, unit: 'kg' }
            ]},
            { id: 'd_15', name: 'Dahi Ke Kebab', category: 'Starters', icon: '🥣', tag: 'veg', allergens: ['dairy'], costPerPortion: 75, prepTimeMin: 10, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_dahi', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_paneer', qty: 0.05, unit: 'kg' },
              { ingredientId: 'ing_besan', qty: 0.03, unit: 'kg' }
            ]},
            { id: 'd_16', name: 'Veg Seekh Kebab', category: 'Starters', icon: '🍢', tag: 'veg', allergens: [], costPerPortion: 68, prepTimeMin: 14, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_potato', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_cabbage', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_coriander', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_17', name: 'Crispy Corn Pepper Salt', category: 'Starters', icon: '🌽', tag: 'veg', allergens: [], costPerPortion: 60, prepTimeMin: 10, station: 'Wok', ingredients: [
              { ingredientId: 'ing_corn', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_chilli', qty: 0.02, unit: 'kg' },
              { ingredientId: 'ing_oil', qty: 0.03, unit: 'L' }
            ]},
            { id: 'd_9', name: 'Chilli Chicken Dry', category: 'Starters', icon: '🌶️', tag: 'non-veg', allergens: ['gluten'], costPerPortion: 110, prepTimeMin: 14, station: 'Wok', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_chilli', qty: 0.03, unit: 'kg' },
              { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' },
              { ingredientId: 'ing_oil', qty: 0.03, unit: 'L' }
            ]},
            { id: 'd_18', name: 'Paneer Malai Tikka', category: 'Starters', icon: '🧀', tag: 'veg', allergens: ['dairy'], costPerPortion: 95, prepTimeMin: 14, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.04, unit: 'L' },
              { ingredientId: 'ing_dahi', qty: 0.04, unit: 'kg' }
            ]},

            // Curries & Main Course (10 dishes)
            { id: 'd_19', name: 'Dal Makhani', category: 'Mains', icon: '🍲', tag: 'veg', allergens: ['dairy'], costPerPortion: 78, prepTimeMin: 15, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_urad_dal', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_butter', qty: 0.04, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' },
              { ingredientId: 'ing_tomato', qty: 0.08, unit: 'kg' }
            ]},
            { id: 'd_1', name: 'Butter Chicken', category: 'Mains', icon: '🍗', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 135, prepTimeMin: 18, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.25, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_butter', qty: 0.04, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' }
            ]},
            { id: 'd_20', name: 'Paneer Butter Masala', category: 'Mains', icon: '🧀', tag: 'veg', allergens: ['dairy'], costPerPortion: 98, prepTimeMin: 15, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_butter', qty: 0.03, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' }
            ]},
            { id: 'd_21', name: 'Kadai Paneer', category: 'Mains', icon: '🥘', tag: 'veg', allergens: ['dairy'], costPerPortion: 94, prepTimeMin: 15, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_coriander', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_2', name: 'Palak Paneer', category: 'Mains', icon: '🥬', tag: 'veg', allergens: ['dairy'], costPerPortion: 92, prepTimeMin: 14, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_spinach', qty: 0.20, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_22', name: 'Chicken Tikka Masala', category: 'Mains', icon: '🥘', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 142, prepTimeMin: 18, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.22, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.03, unit: 'L' },
              { ingredientId: 'ing_garam_masala', qty: 0.01, unit: 'kg' }
            ]},
            { id: 'd_23', name: 'Mutton Rogan Josh', category: 'Mains', icon: '🥩', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 195, prepTimeMin: 24, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_mutton', qty: 0.25, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' },
              { ingredientId: 'ing_garam_masala', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_24', name: 'Malai Kofta', category: 'Mains', icon: '🧆', tag: 'veg', allergens: ['dairy', 'nuts'], costPerPortion: 105, prepTimeMin: 18, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_potato', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_cream', qty: 0.04, unit: 'L' },
              { ingredientId: 'ing_cashew', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_25', name: 'Pindi Chana Masala', category: 'Mains', icon: '🫘', tag: 'veg', allergens: [], costPerPortion: 65, prepTimeMin: 14, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_chana', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_ginger', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_12', name: 'Boiled Egg Masala', category: 'Mains', icon: '🥚', tag: 'non-veg', allergens: [], costPerPortion: 42, prepTimeMin: 10, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_eggs', qty: 2, unit: 'pcs' },
              { ingredientId: 'ing_onion', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_tomato', qty: 0.08, unit: 'kg' }
            ]},

            // Rice & Biryani (5 dishes)
            { id: 'd_6', name: 'Chicken Dum Biryani', category: 'Mains', icon: '🍚', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 145, prepTimeMin: 22, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_chicken', qty: 0.22, unit: 'kg' },
              { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.06, unit: 'kg' }
            ]},
            { id: 'd_26', name: 'Lucknowi Veg Dum Biryani', category: 'Mains', icon: '🍚', tag: 'veg', allergens: ['dairy'], costPerPortion: 85, prepTimeMin: 18, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_paneer', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_potato', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.04, unit: 'kg' }
            ]},
            { id: 'd_27', name: 'Mutton Dum Biryani', category: 'Mains', icon: '🍚', tag: 'non-veg', allergens: ['dairy'], costPerPortion: 195, prepTimeMin: 24, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_mutton', qty: 0.22, unit: 'kg' },
              { ingredientId: 'ing_rice', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_dahi', qty: 0.05, unit: 'kg' }
            ]},
            { id: 'd_7', name: 'Jeera Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 35, prepTimeMin: 10, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_jeera', qty: 0.01, unit: 'kg' },
              { ingredientId: 'ing_oil', qty: 0.02, unit: 'L' }
            ]},
            { id: 'd_28', name: 'Steamed Basmati Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 28, prepTimeMin: 8, station: 'Gravy', ingredients: [
              { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' }
            ]},

            // Breads & Tandoor (5 dishes)
            { id: 'd_4', name: 'Tandoori Roti', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten'], costPerPortion: 8, prepTimeMin: 6, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_besan', qty: 0.05, unit: 'kg' }
            ]},
            { id: 'd_5', name: 'Butter Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 16, prepTimeMin: 8, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_milk', qty: 0.03, unit: 'L' },
              { ingredientId: 'ing_butter', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_29', name: 'Garlic Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 19, prepTimeMin: 8, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' },
              { ingredientId: 'ing_butter', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_30', name: 'Laccha Paratha', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 15, prepTimeMin: 8, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_butter', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_31', name: 'Cheese Chilli Naan', category: 'Breads', icon: '🫓', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 28, prepTimeMin: 9, station: 'Tandoor', ingredients: [
              { ingredientId: 'ing_flour', qty: 0.10, unit: 'kg' },
              { ingredientId: 'ing_cheese', qty: 0.04, unit: 'kg' },
              { ingredientId: 'ing_chilli', qty: 0.01, unit: 'kg' }
            ]},

            // Indo-Chinese & Asian (3 dishes)
            { id: 'd_8', name: 'Veg Hakka Noodles', category: 'Starters', icon: '🍜', tag: 'veg', allergens: ['gluten'], costPerPortion: 55, prepTimeMin: 10, station: 'Wok', ingredients: [
              { ingredientId: 'ing_noodles', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_cabbage', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.05, unit: 'kg' },
              { ingredientId: 'ing_oil', qty: 0.02, unit: 'L' }
            ]},
            { id: 'd_32', name: 'Chilli Paneer Gravy', category: 'Starters', icon: '🥢', tag: 'veg', allergens: ['gluten', 'dairy'], costPerPortion: 82, prepTimeMin: 12, station: 'Wok', ingredients: [
              { ingredientId: 'ing_paneer', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_chilli', qty: 0.03, unit: 'kg' },
              { ingredientId: 'ing_garlic', qty: 0.02, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.05, unit: 'kg' }
            ]},
            { id: 'd_33', name: 'Veg Fried Rice', category: 'Mains', icon: '🍚', tag: 'veg', allergens: [], costPerPortion: 52, prepTimeMin: 10, station: 'Wok', ingredients: [
              { ingredientId: 'ing_rice', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_cabbage', qty: 0.06, unit: 'kg' },
              { ingredientId: 'ing_onion', qty: 0.04, unit: 'kg' },
              { ingredientId: 'ing_oil', qty: 0.02, unit: 'L' }
            ]},

            // Accompaniments, Desserts & Beverages (6 dishes)
            { id: 'd_34', name: 'Boondi Raita', category: 'Accompaniments', icon: '🥣', tag: 'veg', allergens: ['dairy'], costPerPortion: 26, prepTimeMin: 5, station: 'Cold', ingredients: [
              { ingredientId: 'ing_dahi', qty: 0.15, unit: 'kg' },
              { ingredientId: 'ing_jeera', qty: 0.01, unit: 'kg' }
            ]},
            { id: 'd_10', name: 'Green Salad', category: 'Accompaniments', icon: '🥗', tag: 'jain', allergens: [], costPerPortion: 25, prepTimeMin: 5, station: 'Cold', ingredients: [
              { ingredientId: 'ing_tomato', qty: 0.12, unit: 'kg' },
              { ingredientId: 'ing_coriander', qty: 0.02, unit: 'kg' }
            ]},
            { id: 'd_35', name: 'Gulab Jamun (2 pcs)', category: 'Desserts', icon: '🍯', tag: 'veg', allergens: ['dairy'], costPerPortion: 28, prepTimeMin: 4, station: 'Dessert', ingredients: [
              { ingredientId: 'ing_khoya', qty: 0.08, unit: 'kg' },
              { ingredientId: 'ing_sugar', qty: 0.06, unit: 'kg' },
              { ingredientId: 'ing_milk', qty: 0.02, unit: 'L' }
            ]},
            { id: 'd_36', name: 'Rasmalai (2 pcs)', category: 'Desserts', icon: '🥛', tag: 'veg', allergens: ['dairy', 'nuts'], costPerPortion: 38, prepTimeMin: 5, station: 'Dessert', ingredients: [
              { ingredientId: 'ing_milk', qty: 0.15, unit: 'L' },
              { ingredientId: 'ing_paneer', qty: 0.06, unit: 'kg' },
              { ingredientId: 'ing_sugar', qty: 0.04, unit: 'kg' }
            ]},
            { id: 'd_37', name: 'Punjabi Mango Lassi', category: 'Beverages', icon: '🥭', tag: 'veg', allergens: ['dairy'], costPerPortion: 32, prepTimeMin: 5, station: 'Beverages', ingredients: [
              { ingredientId: 'ing_dahi', qty: 0.18, unit: 'kg' },
              { ingredientId: 'ing_mango_pulp', qty: 0.06, unit: 'kg' },
              { ingredientId: 'ing_sugar', qty: 0.03, unit: 'kg' }
            ]},
            { id: 'd_38', name: 'Masala Kulhad Chai', category: 'Beverages', icon: '☕', tag: 'veg', allergens: ['dairy'], costPerPortion: 14, prepTimeMin: 6, station: 'Beverages', ingredients: [
              { ingredientId: 'ing_milk', qty: 0.10, unit: 'L' },
              { ingredientId: 'ing_tea', qty: 0.02, unit: 'kg' },
              { ingredientId: 'ing_ginger', qty: 0.01, unit: 'kg' },
              { ingredientId: 'ing_sugar', qty: 0.02, unit: 'kg' }
            ]}
          ],

          // Orders in Progress
          orders: [
            { id: 'ord_101', table: 'Table 4', waiterName: 'Pooja', chefId: 'u_c1', chefName: 'Vikram Singh', status: 'cooking', startedAt: new Date(Date.now() - 11 * 60000).toISOString(), dishes: [
              { dishId: 'd_3', name: 'Paneer Tikka', qty: 1, notes: 'Less spicy', allergies: 'None' },
              { dishId: 'd_5', name: 'Butter Naan', qty: 2, notes: 'Extra crispy', allergies: 'None' }
            ]},
            { id: 'ord_102', table: 'Table 2', waiterName: 'Rohan', chefId: 'u_c2', chefName: 'Suresh Yadav', status: 'cooking', startedAt: new Date(Date.now() - 4 * 60000).toISOString(), dishes: [
              { dishId: 'd_1', name: 'Butter Chicken', qty: 1, notes: 'NO DAIRY ALLERGY!', allergies: 'Dairy Allergy' }
            ]},
            { id: 'ord_103', table: 'Table 7', waiterName: 'Neha', chefId: null, chefName: 'Unassigned', status: 'sent', startedAt: new Date(Date.now() - 2 * 60000).toISOString(), dishes: [
              { dishId: 'd_8', name: 'Veg Hakka Noodles', qty: 1, notes: 'No Onion, No Garlic', allergies: 'None' }
            ]}
          ],

          // Wastage Logs
          wastageLogs: [
            { id: 'w_1', date: addDays(0), ingredientName: 'Spinach', qty: '1.2 kg', reason: 'Spoiled due to moisture', cost: 48, staff: 'Amit Patel' }
          ],

          // Temperature Check Logs
          temperatureLogs: [
            { id: 't_1', date: addDays(0), time: '10:00 AM', unitName: 'Kitchen Fridge 1', temp: 3.5, status: 'safe', signedBy: 'Amit Patel' },
            { id: 't_2', date: addDays(0), time: '10:00 AM', unitName: 'Prep Fridge 2', temp: 4.1, status: 'safe', signedBy: 'Amit Patel' },
            { id: 't_3', date: addDays(0), time: '10:00 AM', unitName: 'Deep Freezer 1', temp: -19.2, status: 'safe', signedBy: 'Amit Patel' }
          ],

          // Checklists
          checklists: {
            opening: [
              { id: 'chk_1', text: 'Floor swept and sanitized with food-grade disinfectant', done: true },
              { id: 'chk_2', text: 'All fridges and freezers temperatures checked and logged', done: true },
              { id: 'chk_3', text: 'LPG gas main valve checked for leaks and turned ON', done: true },
              { id: 'chk_4', text: 'Handwashing stations stocked with soap and paper towels', done: false }
            ],
            closing: [
              { id: 'chk_5', text: 'All burners, tandoor, and ovens safely shut down', done: false },
              { id: 'chk_6', text: 'LPG gas main line valves turned OFF', done: false },
              { id: 'chk_7', text: 'All meat and dairy sealed and returned to proper refrigeration', done: false },
              { id: 'chk_8', text: 'Waste bins emptied and sanitized outside kitchen area', done: false }
            ]
          },

          // Audit Log
          auditLogs: [
            { id: 'act_init', timestamp: new Date().toISOString(), userId: 'system', userName: 'System', action: 'System Setup', details: 'Initialized KitchenCare demo store with 25 ingredients.' }
          ]
        };
      }
    };

    // Initialize Store
    DataLayer.init();

// Background Live Sync with Backend SQLite Database
async function syncDatabaseState() {
  if (typeof Api === 'undefined') return;
  try {
    const remoteState = await Api.syncFullState();
    if (remoteState && remoteState.users && remoteState.tables) {
      isBackendConnected = true;
      updateDbStatusIndicator(true);
      
      const localData = DataLayer.getData();
      localData.tables = remoteState.tables;
      localData.orders = remoteState.orders;
      localData.ingredients = remoteState.ingredients;
      localData.storageUnits = remoteState.storageUnits;
      localData.wastageLogs = remoteState.wastageLogs;
      localData.temperatureLogs = remoteState.temperatureLogs;
      localData.auditLogs = remoteState.auditLogs;
      
      localStorage.setItem(DataLayer.STORAGE_KEY, JSON.stringify(localData));
      
      if (typeof currentUser !== 'undefined' && currentUser) {
        if (typeof currentScreen !== 'undefined' && 
           (currentScreen === 'waiter_tables' || currentScreen === 'waiter_orders' || currentScreen === 'chef_kds' || currentScreen === 'mgr_home')) {
          if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
        }
      }
    } else {
      isBackendConnected = false;
      updateDbStatusIndicator(false);
    }
  } catch (err) {
    isBackendConnected = false;
    updateDbStatusIndicator(false);
  }
}

function updateDbStatusIndicator(connected) {
  const dot = document.getElementById('dbStatusDot');
  const text = document.getElementById('dbStatusText');
  if (dot && text) {
    if (connected) {
      dot.className = 'db-status-dot';
      text.textContent = 'SQLite Live';
    } else {
      dot.className = 'db-status-dot offline';
      text.textContent = 'Local Cache';
    }
  }
}

DataLayer.init();
