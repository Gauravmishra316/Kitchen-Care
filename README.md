# 🥘 KitchenCare — Indian Restaurant Kitchen & Service Management

> A robust, fast, and offline-capable Kitchen Order Ticketing (KOT), Kitchen Display System (KDS), Multi-Waiter Floor Management, and PIN-Authenticated POS platform designed specifically for Indian restaurants.

---

## 🌟 Key Features

### 1. 🔒 POS Staff Authentication & Security PIN Pad
* **Interactive PIN Terminal:** Full touch/click on-screen numeric keypad (`0-9`, `⌫ Del`, `✕ Clear`) with physical keyboard input support.
* **Masked Security Feedback:** 4-dot indicator (`○ ○ ○ ○` ➔ `● ● ● ○`) with real-time feedback, shake animation, and error alerts on invalid PIN entry.
* **Role-Based Session Isolation:** Direct routing to role views (Waiters ➔ Tables, Chefs ➔ KDS, Managers ➔ Inventory & Expiries, Admins ➔ Analytics, Cashiers ➔ Bills).
* **PIN-Protected Staff Switching:** Dedicated "👥 Switch Staff" modal requiring destination PIN verification before switching sessions, plus "🔒 Lock POS" shortcut.
* **Demo PIN Directory:** Collapsible reference accordion with 1-tap "⚡ Test Login" buttons for instant evaluation.

### 2. 👥 18 Comprehensive Staff Profiles across All Departments
* **Owners & Admins (2):** Rajesh Sharma (`1111`), Sunita Sharma (`1112`).
* **Kitchen & Floor Managers (2):** Amit Patel (`2222`), Priya Mehta (`2223`).
* **Culinary Chefs across Stations (7):** Vikram Singh (`3331` - Tandoor), Suresh Yadav (`3332` - Gravy), Rahul Verma (`3333` - Wok/Asian), Deepak Roy (`3334` - Cold/Pantry), Manoj Kumar (`3335` - Breads & Roti), Meera Joshi (`3336` - Halwai & Desserts), Anita Desai (`3337` - South Indian).
* **Floor Waiters & Service Captains (6):** Pooja Sharma (`4441` - Sec A), Rohan Das (`4442` - Sec B), Neha Gupta (`4443` - Sec C), Rahul Nair (`4444` - Terrace), Simran Kaur (`4445` - VIP Lounge), Arjun Kapoor (`4446` - Bar & Lounge).
* **Billing Cashier (1):** Kavita Rao (`5551` - Billing Counter).

### 3. 🍲 38 Authentic Indian Dishes Catalog
Categorized into quick-filter sections:
* **🍢 Tandoor & Starters (11 dishes):** Paneer Tikka, Tandoori Chicken Full, Chicken Tikka Kebab, Hara Bhara Kebab, Dahi Ke Kebab, Veg Seekh Kebab, Crispy Corn Pepper Salt, Chilli Chicken Dry, Paneer Malai Tikka, etc.
* **🥘 Curries & Mains (10 dishes):** Dal Makhani, Butter Chicken, Paneer Butter Masala, Kadai Paneer, Palak Paneer, Chicken Tikka Masala, Mutton Rogan Josh, Malai Kofta, Pindi Chana Masala, Boiled Egg Masala.
* **🍚 Rice & Biryani (6 dishes):** Hyderabadi Chicken Dum Biryani, Lucknowi Veg Dum Biryani, Mutton Dum Biryani, Jeera Rice, Steamed Basmati Rice, Veg Fried Rice.
* **🫓 Tandoor Breads (5 dishes):** Tandoori Roti, Butter Naan, Garlic Naan, Laccha Paratha, Cheese Chilli Naan.
* **🥢 Indo-Chinese (5 dishes):** Veg Hakka Noodles, Chilli Paneer Gravy, Crispy Corn, Chilli Chicken, Veg Fried Rice.
* **🍧 Desserts & Beverages (6 dishes):** Boondi Raita, Green Fresh Salad, Gulab Jamun, Rasmalai, Punjabi Mango Lassi, Masala Kulhad Chai.
* **35 Tracked Ingredients:** Automatic FEFO inventory linkage with batches, suppliers, and expiration tracking.

### 4. 🍽️ Multi-Waiter Dining Floor & Table Lifecycle
* **Shared Table Access:** All 6 active servers have shared visibility and access to tables.
* **Granular Table Statuses:**
  * `⚪ Vacant` — Table is clean and ready for seating.
  * `👥 Seated` — Guests arrived and viewing menu.
  * `🍳 In Kitchen` — KOT dispatched and food cooking.
  * `🔔 Food Ready` — Plated at the kitchen pass, awaiting waiter pickup.
  * `🍽️ Served (Dining)` — Food delivered, guests currently dining.
  * `🧾 Bill Requested` — Guests requested receipt/bill.
  * `🧹 Needs Cleaning` — Guests departed, busboy alerted to wipe table.
* **Pass Pickup Queue:** 1-tap `[ 🍽️ Pick Up & Mark Served ]` for ready dishes.

### 5. ✍️ Digital KOT Scribble Pad & Custom Requests
* **Handwritten Scribble Pad:** Canvas-based drawing tool with notebook paper styling, pen colors (Navy Ink, Alert Red, Veg Green, Amber Highlighter), eraser, undo, and auto-capture.
* **⌨️ Typed Instructions:** Large custom instructions area with 9 one-tap dietary chips (`🌶️ Extra Spicy`, `🟢 Jain (No Onion/Garlic)`, `👶 Mild / Kid Friendly`, `🫓 Serve Breads Hot`, `🥗 Extra Onion & Chutney`, `🌾 Gluten-Free`, `🧂 Less Salt & Oil`, `⚡ Rush Order`, `🎂 Celebration`).
* **⭐ Off-Menu Custom Dishes:** Quickly enter special custom items with custom pricing (e.g. *Warm Lime Water with Honey*, *Kadha*, *Plain Khichdi*).

### 6. 👨‍🍳 Kitchen Display System (KDS) & FEFO Inventory
* **Live Station Routing:** Smart auto-dispatching to station chefs (Tandoor, Gravy, Wok, Cold).
* **FEFO Auto-Deduction:** Automatic First-Expired, First-Out deduction from ingredient inventory batches upon cooking.
* **Handwritten KOT Lightbox:** Chefs can tap to view high-resolution waiter scribbles and dietary notes.
* **Pass Notification:** Marking dishes ready immediately alerts servers with sound and visual banners.

### 7. 💳 Settle Bill & Instant Table Reset
* **Itemized Receipt Breakdown:** Subtotal, 5% Restaurant GST, and grand total.
* **Payment Modes:** `📱 UPI / QR Code`, `💵 Cash`, `💳 Card / POS`.
* **One-Tap Table Reset:** Marking paid automatically archives the order and restores the table to `⚪ Vacant` for incoming customers.

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v14 or higher)

### Installation & Running Locally

1. Open a terminal in this project folder:
   ```bash
   cd c:\Users\Administrator\Desktop\work\github\kitchencare
   ```

2. Start the local server:
   ```bash
   npm start
   # or
   node server.js
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5050/
   ```

---

## 📂 Project Structure

```
kitchencare/
├── index.html            # Main single-page application (Auth, POS, KOT, KDS, Manager, Admin)
├── server.js             # Lightweight Node.js HTTP server (serves on port 5050)
├── package.json          # Node project metadata & start script
├── .gitignore            # Git ignore configuration
└── README.md             # Complete documentation & credentials
```

---

## 👥 Staff Credentials Directory (4-Digit PINs)

| Role | Name | ID | Security PIN | Department / Station |
|---|---|---|---|---|
| **👑 Admin** | Rajesh Sharma | `u_admin` | `1111` | Owner & Managing Director |
| **👑 Admin** | Sunita Sharma | `u_admin2` | `1112` | Director of Operations |
| **📋 Manager** | Amit Patel | `u_mgr` | `2222` | General Kitchen Manager |
| **📋 Manager** | Priya Mehta | `u_mgr2` | `2223` | Floor & Operations Manager |
| **👨‍🍳 Chef** | Vikram Singh | `u_c1` | `3331` | Executive Chef (Tandoor) |
| **👨‍🍳 Chef** | Suresh Yadav | `u_c2` | `3332` | Senior Sous Chef (Gravy) |
| **👨‍🍳 Chef** | Rahul Verma | `u_c3` | `3333` | Commi Chef (Wok Master) |
| **👨‍🍳 Chef** | Deepak Roy | `u_c4` | `3334` | Pantry & Salad Chef (Cold) |
| **👨‍🍳 Chef** | Manoj Kumar | `u_c5` | `3335` | Tandoor & Roti Master |
| **👩‍🍳 Chef** | Meera Joshi | `u_c6` | `3336` | Halwai & Desserts Chef |
| **👩‍🍳 Chef** | Anita Desai | `u_c7` | `3337` | South Indian Specialist |
| **🍽️ Waiter** | Pooja Sharma | `u_w1` | `4441` | Senior Captain (Section A) |
| **🍽️ Waiter** | Rohan Das | `u_w2` | `4442` | Floor Server (Section B) |
| **🍽️ Waiter** | Neha Gupta | `u_w3` | `4443` | Floor Server (Section C) |
| **🍽️ Waiter** | Rahul Nair | `u_w4` | `4444` | Terrace Server (Outdoor) |
| **🍽️ Waiter** | Simran Kaur | `u_w5` | `4445` | VIP Lounge Server |
| **🍽️ Waiter** | Arjun Kapoor | `u_w6` | `4446` | Bar & Patio Server |
| **🧾 Cashier** | Kavita Rao | `u_cashier` | `5551` | Billing Counter |

---

## 🛠️ Tech Stack
* **Frontend:** Modern Vanilla HTML5, CSS3 Variables, ES6 JavaScript, HTML5 Canvas API
* **Storage:** Browser `localStorage` with fail-safe auto-migrating data layer (`v2`)
* **Audio:** Web Audio API sound synthesis (zero external audio files)
* **Backend:** Node.js native `http` module (zero external dependencies)
