# Favorite Cafe Web Application (PWA)

![Favorite Cafe](img/banner-img.jpg)

**Favorite Cafe** is a standalone Progressive Web App (PWA) for managing coffee & bistro operations, online ordering, live table dining lifecycles, and admin management.

🌐 **Local Application URL:** [http://localhost/favorite_cafe/](http://localhost/favorite_cafe/)

---

## 🚀 Key Features

### ☕ Customer PWA Portal
- **Progressive Web App (PWA):** Installable on mobile & desktop with offline Service Worker caching (`sw.js`) and Web App Manifest (`manifest.json`).
- **Interactive Cafe Menu:** Browse coffee, snacks, breakfast, lunch, desserts, and special beverages with full dish metadata.
- **RWF Currency System:** Pricing in Rwandan Francs (`RWF`).
- **Cart & Checkout:** Add/remove items, choose Delivery / Pickup / Dine-in.
- **Mobile Money Gateway:** Integrated MoMo payment simulation with instant order confirmation.
- **Order Timeline Tracker:** Track real-time progress of your order.
- **My Orders History:** View past orders directly from the navigation bar.

### 🛠️ Admin Dashboard (`admin.html`)
- **Live Order Management:** Real-time table view of incoming orders, status progression, and kitchen dispatch tickets.
- **Menu CRUD System:** Manage menu items, prices, dish images, and availability.
- **Table Dining Lifecycle Tracker:** Interactive 5-stage table seating tracker (Seated -> Ordering -> Food Served -> Payment -> Cleared) with progress bars and live timers.
- **Thermal Receipt Printing & QR Code:** Generate thermal receipts complete with scannable QR verification codes.
- **Email & SMS Notification Logs Center:** View dispatched order confirmation notifications.

---

## 🛠️ Technology Stack & Database

- **Frontend:** HTML5, Vanilla CSS3, JavaScript (ES6+), Bootstrap 5, FontAwesome 6, PWA Service Worker (`sw.js`).
- **Database:** MySQL database named `favorite_cafe` (auto-created via `api/db.php`).
- **Backend / API:** PHP REST API (`api/menu.php`, `api/auth.php`, `api/upload.php`) with local JSON fallback.

---

## 💻 Local Setup

1. **Host via XAMPP / Apache:**
   - Folder location: `c:/xampp/htdocs/favorite_cafe/`
   - Start Apache and MySQL in XAMPP Control Panel.
   - Open browser: `http://localhost/favorite_cafe/`
   - Admin Portal: `http://localhost/favorite_cafe/admin.html`

2. **Database:**
   - The database `favorite_cafe` will auto-create on first load of `api/db.php`.

---

## 📄 License

This project is open-source under the MIT License.

Call
+250788700870
