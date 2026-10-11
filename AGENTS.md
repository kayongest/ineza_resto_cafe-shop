# INEZA RESTO & COFFEE SHOP - Workspace Rules & System Directives

## Brand Identity
- **Official Name**: INEZA RESTO & COFFEE SHOP (formerly Favorite Cafe).
- **Branding HTML pattern**: `<div class="bname">INEZA RESTO <span>&amp; COFFEE SHOP</span></div>`
- **Location**: 108 Kimironko St, Kigali - Rwanda | TIN: 102938475 | TEL: +250 788 000 000
- **Currency**: Rwandan Francs (RWF). Tax: RRA EBM v2.1 (18% VAT included).
- **Official Brand Assets**: `img/INEZA_RESTO___COFFEE_SHOP_mainBg.png`.

## System Architecture & Endpoints
1. **Customer Web & Mobile PWA**:
   - Web application: `index.html` (supports `?table=X` parameter for instant dine-in table lock).
   - Mobile PWA view: `mobile_app.html`.
   - Dark & Light mode synchronous theme toggle supported across all views via `js/theme.js` and `css/theme.css`.
2. **Staff & Kitchen Administration**:
   - Management & KDS portal: `admin.html`.
   - Live Order Lifecycle: `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed`.
   - Table Dining Tracker, QR Tent Card generator, and 80mm thermal EBM receipt generator.
3. **Printable / Digital PDF Catalog**:
   - Printable menu: `menu_pdf.html`.

## Client Pitch & Presentation Directives
Whenever the user asks to prepare presentations, pitch slides, feature comparisons, proposals, or client demonstrations:
1. **Lead with Financial ROI**: Emphasize eliminating the 15%–30% commissions lost to 3rd-party aggregators (saving ~3,600,000 RWF/month on average for a standard cafe).
2. **Zero Installation Friction**: Highlight the Progressive Web App (PWA) architecture—instant QR scanning in any mobile browser without App Store or Play Store downloads.
3. **Rwanda Localized Payments**: Demonstrate seamless integration with MTN Mobile Money (`*182*8*1*004587*Amount#`), Airtel Money, and Cash on Delivery.
4. **Fiscal Compliance Ready**: Point out pre-configured RRA EBM v2.1 thermal receipt printing with dynamic QR verification.
5. **Demonstration Walkthrough Order**:
   - Step 1: Customer scans table QR card on mobile (`index.html?table=05`).
   - Step 2: Places order with MoMo simulation.
   - Step 3: Kitchen receives order in real time via KDS (`admin.html`).
   - Step 4: Advance order to Ready & print official 80mm thermal receipt.
