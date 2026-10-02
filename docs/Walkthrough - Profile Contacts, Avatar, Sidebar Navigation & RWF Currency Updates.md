# Walkthrough - Profile Contacts, Avatar, Sidebar Navigation & RWF Currency Updates

We have completed full CRUD, navigation alignment, currency conversion to **Rwandan Francs (RWF)**, and reseeded the MySQL database with exact items from the SQL dump across `mobile_app.html`, connected with the MySQL database backend (`api/auth.php`, `api/upload.php`, `api/reseed.php` & `api/db.php`) and offline persistence (`localStorage`).

---

## 🛠️ Summary of Features

### 1. Currency Conversion to RWF & DB Reseed
- **RWF Formatter**: Implemented `formatRWF(amount)` helper in [js/mobile_app.js](file:///c:/xampp/htdocs/favorite_cafe/js/mobile_app.js#L565-L570) to format prices (e.g. `6,000 RWF`, `9,000 RWF`, `25,000 RWF`).
- **Reseeded DB & JSON**: Updated [api/menu.json](file:///c:/xampp/htdocs/favorite_cafe/api/menu.json) with all 67 menu items from the SQL dump (e.g. *Special Favorie omelette*, *Chicken Strips and Chips*, *Igisafuriya*, *Chicken Pizza*, *Espresso*, etc.) and reseeded MySQL `menu_items` table via `api/reseed.php`.
- **Cart & Order Totals**: Updated cart subtotal, tax, and order history totals to RWF format without any `$` symbols.

### 2. Sidebar Drawer Menu Alignment
Aligned the **Sidebar Drawer (`MAIN MENU`)** items to match the **Bottom Navigation Bar** in exact order:
1. **Notification** (`<i class="far fa-bell"></i>`) -> opens Notification view.
2. **Your Orders** (`<i class="far fa-file-alt"></i>`) -> opens Orders history view.
3. **Home** (`<i class="fas fa-home"></i>`) -> opens Home view.
4. **Offers & Deals** (`<i class="fas fa-percent"></i>`) -> opens Offers view.
5. **Profile** (`<i class="far fa-user"></i>`) -> opens Profile view.

### 3. Interactive Profile Picture (Avatar) Upload
- **Camera Badge Overlay**: Added a camera badge (`.avatar-edit-badge`) on the profile hero avatar container.
- **Instant Preview & Upload**: Clicking the avatar triggers an image chooser, previews the image locally, uploads it to `api/upload.php`, and saves the path to MySQL `users` table (`avatar` column).
- **App-wide Sync**: Instantly syncs across `#profileUserAvatar` and `#sidebarUserAvatar`.

### 4. Contacts Section CRUD System
- **Create & Edit Modal**: `#profileEditModal` allows updating Full Name, Mobile Phone, Email Address, Physical/Delivery Address, and dynamic custom contacts.
- **Read & Render**: Automatically populates contact values from DB session or `localStorage`.
- **Delete / Clear**: Inline clear buttons (`deleteContactField`) allow clearing individual contact fields or deleting custom entries.

---

## 📸 Pushed Commits

- **Commit `a9539fc`**: *"Convert currency formatting to RWF and update menu items from SQL dump"*
- **Commit `2d7a0e6`**: *"Changes made from 'fas fa-th-large' to 'fas fa-bars'"*
- **Commit `0fe13d5`**: *"Align sidebar drawer menu items to match bottom navigation bar order"*
- **Commit `db1722f`**: *"Fix sidebar avatar element ID and add updateAllAvatarImages helper"*
- **Commit `2a8e9fd`**: *"Add interactive profile picture upload and DB persistence"*
- **Commit `a3e301b`**: *"Add full CRUD functionality to Profile Contacts section"*
- **Branch**: `main` pushed to `github.com:kayongest/favorite_cafe.git`
