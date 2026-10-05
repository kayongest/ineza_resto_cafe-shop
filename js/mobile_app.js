/* =========================================
   Foodia Dark Navy Theme JS Logic (From Scratch)
   ========================================= */

// GLOBAL STATE
let currentUser = null;
let menuItems = [];
let appCategories = [];
let appPromos = [];
let cart = [];
let favorites = [];
let activeCategory = 'All';
let appMenuType = 'all';
let currentOrderFilter = 'all';
let isOffline = false;

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    initThemeMode();
    await validateSession();
    checkAuth();
    loadCart();
    loadFavorites();
    await loadAppCategories();
    await loadMenu();
    await loadAppPromos();

    renderHomeCategories();
    renderHomePromos();
    renderHomeRecommended();
    renderMenuCategories();
    renderMenuGrid();
    renderFavoriteGrid();
    renderOffersPromos();
    loadMobileOrderHistory();

    initNetworkListener();
    setupRealtimeSync();
}

// SESSION VALIDATION
async function validateSession() {
    const token = localStorage.getItem('favcafe_token');
    if (!token) {
        const userStr = localStorage.getItem('favcafe_active_user');
        if (userStr) {
            isOffline = true;
            return true;
        }
        return false;
    }

    try {
        const res = await fetch('api/auth.php?action=verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.valid && data.user) {
            const userObj = JSON.parse(localStorage.getItem('favcafe_active_user') || '{}');
            userObj.id = data.user.id;
            userObj.name = data.user.full_name;
            userObj.email = data.user.email;
            userObj.phone = data.user.phone || '';
            userObj.address = data.user.address || userObj.address || '';
            localStorage.setItem('favcafe_active_user', JSON.stringify(userObj));
            return true;
        }
    } catch (e) {
        isOffline = true;
    }
    return true;
}

function initNetworkListener() {
    window.addEventListener('online', () => {
        isOffline = false;
        showToast('🔄 Back online!');
        loadMenu();
    });
    window.addEventListener('offline', () => {
        isOffline = true;
        showToast('📡 Offline mode activated');
    });
}

// AUTH & USER STATE
function checkAuth() {
    const userStr = localStorage.getItem('favcafe_active_user');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
        } catch (e) {
            currentUser = null;
        }
    } else {
        currentUser = null;
    }

    if (!currentUser || (!currentUser.email && !currentUser.name && !currentUser.full_name)) {
        console.warn('[Mobile App] Unauthenticated access detected. Redirecting to mobile_auth.html...');
        window.location.href = 'mobile_auth.html';
        return;
    }

    renderUserContacts();
}

function renderUserContacts() {
    if (!currentUser) return;
    const name = currentUser.name || currentUser.full_name || 'James Hawkins';
    const firstName = name.split(' ')[0] || 'James';

    const greetingUser = document.getElementById('greetingUserName');
    if (greetingUser) greetingUser.innerText = `${firstName} 👋`;

    const greetingTime = document.getElementById('greetingTimeText');
    if (greetingTime) {
        const hour = new Date().getHours();
        if (hour < 12) greetingTime.innerText = 'Good Morning';
        else if (hour < 17) greetingTime.innerText = 'Good Afternoon';
        else greetingTime.innerText = 'Good Evening';
    }

    const profileTabName = document.getElementById('profileTabName');
    if (profileTabName) profileTabName.innerText = name;

    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) sidebarUserName.innerText = name;

    // User Avatar Image Sync
    const avatarSrc = currentUser.avatar || 'img/chefs/1.jpg';
    updateAllAvatarImages(avatarSrc);

    // Mobile Phone
    const phoneRow = document.getElementById('contactRowPhone');
    const profilePhoneVal = document.getElementById('profilePhoneVal');
    if (profilePhoneVal) {
        if (currentUser.phone && currentUser.phone.trim() !== '') {
            profilePhoneVal.innerText = currentUser.phone;
            if (phoneRow) phoneRow.style.display = 'flex';
        } else {
            profilePhoneVal.innerText = 'Not set';
            if (phoneRow) phoneRow.style.display = 'flex';
        }
    }

    // Email Address
    const emailRow = document.getElementById('contactRowEmail');
    const profileEmailVal = document.getElementById('profileEmailVal');
    if (profileEmailVal) {
        if (currentUser.email && currentUser.email.trim() !== '') {
            profileEmailVal.innerText = currentUser.email;
            if (emailRow) emailRow.style.display = 'flex';
        } else {
            profileEmailVal.innerText = 'Not set';
            if (emailRow) emailRow.style.display = 'flex';
        }
    }

    // Physical / Delivery Address
    const addressRow = document.getElementById('contactRowAddress');
    const profileAddressVal = document.getElementById('profileAddressVal');
    if (profileAddressVal) {
        const addrText = currentUser.address || currentUser.delivery_address || 'Franklin Avenue, Corner St.London, 24125151';
        if (addrText && addrText.trim() !== '') {
            profileAddressVal.innerText = addrText;
            if (addressRow) addressRow.style.display = 'flex';
        } else {
            profileAddressVal.innerText = 'Not set';
            if (addressRow) addressRow.style.display = 'flex';
        }
    }

    // Render Custom Extra Contacts
    renderCustomContactsList();
}

function updateAllAvatarImages(src) {
    if (!src) return;
    const avatars = document.querySelectorAll('#profileUserAvatar, #sidebarUserAvatar, .sidebar-avatar-img, .profile-avatar-img');
    avatars.forEach(img => {
        img.src = src;
    });
}
window.updateAllAvatarImages = updateAllAvatarImages;

// PROFILE PICTURE (AVATAR) UPLOAD CONTROLLERS
function triggerAvatarUpload() {
    const fileInput = document.getElementById('profileAvatarFileInput');
    if (fileInput) fileInput.click();
}
window.triggerAvatarUpload = triggerAvatarUpload;

async function handleAvatarFileSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Local instant preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const localDataUrl = e.target.result;
        updateAllAvatarImages(localDataUrl);
    };
    reader.readAsDataURL(file);

    // Upload via API
    try {
        const formData = new FormData();
        formData.append('image', file);

        const uploadRes = await fetch('api/upload.php', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();

        let avatarUrl = '';
        if (uploadData.status === 'success' && uploadData.image_path) {
            avatarUrl = uploadData.image_path;
        } else {
            avatarUrl = await new Promise((res) => {
                const r = new FileReader();
                r.onload = (ev) => res(ev.target.result);
                r.readAsDataURL(file);
            });
        }

        if (!currentUser) currentUser = {};
        currentUser.avatar = avatarUrl;

        localStorage.setItem('favcafe_active_user', JSON.stringify(currentUser));
        updateAllAvatarImages(avatarUrl);

        // Sync with MySQL DB
        await fetch('api/auth.php?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_profile',
                id: currentUser.id || 0,
                current_email: currentUser.email || '',
                full_name: currentUser.name || currentUser.full_name || '',
                avatar: avatarUrl
            })
        });

        showToast('📸 Profile picture updated successfully!');
    } catch (err) {
        console.warn('Avatar upload API warning:', err);
        showToast('📸 Profile picture updated locally!');
    }
}
window.handleAvatarFileSelect = handleAvatarFileSelect;

function renderCustomContactsList() {
    const listContainer = document.getElementById('customContactsList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const contacts = currentUser.custom_contacts || [];
    contacts.forEach((c, idx) => {
        const row = document.createElement('div');
        row.className = 'contact-row-item';
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-top: 10px;';
        row.innerHTML = `
            <div class="d-flex align-items-center flex-grow-1">
                <div class="contact-icon-circle me-3"><i class="${c.icon || 'fas fa-address-book'}"></i></div>
                <div>
                    <div class="contact-info-label">${escapeHtml(c.label || 'Contact')}</div>
                    <div class="contact-info-val">${escapeHtml(c.val || c.value || '')}</div>
                </div>
            </div>
            <button type="button" class="btn-clear-field" onclick="deleteCustomContact(${idx})" title="Delete"><i class="fas fa-trash-alt"></i></button>
        `;
        listContainer.appendChild(row);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// PROFILE CONTACTS EDIT MODAL CONTROLLERS
function openMobileAuthModal(modalType) {
    if (modalType === 'profile_edit' || modalType === 'contacts_edit') {
        const nameInput = document.getElementById('editProfileName');
        const phoneInput = document.getElementById('editProfilePhone');
        const emailInput = document.getElementById('editProfileEmail');
        const addressInput = document.getElementById('editProfileAddress');

        if (currentUser) {
            if (nameInput) nameInput.value = currentUser.name || currentUser.full_name || '';
            if (phoneInput) phoneInput.value = currentUser.phone || '';
            if (emailInput) emailInput.value = currentUser.email || '';
            if (addressInput) addressInput.value = currentUser.address || currentUser.delivery_address || '';
        }

        populateModalCustomContacts();

        const modal = document.getElementById('profileEditModal');
        if (modal) modal.classList.add('active');
    }
}
window.openMobileAuthModal = openMobileAuthModal;

function closeMobileAuthModal(modalType) {
    if (modalType === 'profile_edit' || modalType === 'contacts_edit') {
        const modal = document.getElementById('profileEditModal');
        if (modal) modal.classList.remove('active');
    }
}
window.closeMobileAuthModal = closeMobileAuthModal;

function populateModalCustomContacts() {
    const container = document.getElementById('modalCustomContactsContainer');
    if (!container) return;
    container.innerHTML = '';

    const contacts = (currentUser && currentUser.custom_contacts) ? currentUser.custom_contacts : [];
    contacts.forEach((c) => {
        addCustomContactInput(c.label, c.val || c.value);
    });
}

function addCustomContactInput(label = '', value = '') {
    const container = document.getElementById('modalCustomContactsContainer');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'd-flex gap-2 align-items-center mb-2 custom-contact-row';
    div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    div.innerHTML = `
        <input type="text" class="form-control-custom custom-contact-label" placeholder="Label (e.g. Work)" value="${escapeHtml(label)}" style="flex: 1;">
        <input type="text" class="form-control-custom custom-contact-value" placeholder="Value (e.g. 078...)" value="${escapeHtml(value)}" style="flex: 1.5;">
        <button type="button" class="btn-clear-field" onclick="this.parentElement.remove()" style="opacity:1;"><i class="fas fa-times text-coral"></i></button>
    `;
    container.appendChild(div);
}
window.addCustomContactInput = addCustomContactInput;

async function saveMobileProfileContacts() {
    const nameInput = document.getElementById('editProfileName');
    const phoneInput = document.getElementById('editProfilePhone');
    const emailInput = document.getElementById('editProfileEmail');
    const addressInput = document.getElementById('editProfileAddress');

    const newName = nameInput ? nameInput.value.trim() : (currentUser.name || '');
    const newPhone = phoneInput ? phoneInput.value.trim() : (currentUser.phone || '');
    const newEmail = emailInput ? emailInput.value.trim() : (currentUser.email || '');
    const newAddress = addressInput ? addressInput.value.trim() : (currentUser.address || '');

    // Collect extra custom contacts
    const customRows = document.querySelectorAll('#modalCustomContactsContainer .custom-contact-row');
    const customContacts = [];
    customRows.forEach(row => {
        const lblInput = row.querySelector('.custom-contact-label');
        const valInput = row.querySelector('.custom-contact-value');
        const lbl = lblInput ? lblInput.value.trim() : '';
        const val = valInput ? valInput.value.trim() : '';
        if (lbl && val) {
            customContacts.push({ label: lbl, val: val, icon: 'fas fa-address-book' });
        }
    });

    if (!currentUser) currentUser = {};

    const prevEmail = currentUser.email || '';

    currentUser.name = newName;
    currentUser.full_name = newName;
    currentUser.phone = newPhone;
    currentUser.email = newEmail;
    currentUser.address = newAddress;
    currentUser.custom_contacts = customContacts;

    // Save to localStorage immediately
    localStorage.setItem('favcafe_active_user', JSON.stringify(currentUser));

    // Send to API update endpoint if possible
    try {
        const payload = {
            action: 'update_profile',
            id: currentUser.id || 0,
            current_email: prevEmail,
            full_name: newName,
            phone: newPhone,
            email: newEmail,
            address: newAddress
        };

        const res = await fetch('api/auth.php?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resData = await res.json();
        if (resData.status === 'success' && resData.user) {
            currentUser.id = resData.user.id || currentUser.id;
            localStorage.setItem('favcafe_active_user', JSON.stringify(currentUser));
        } else if (resData.status === 'error') {
            showToast('⚠️ ' + resData.message);
            return;
        }
    } catch (e) {
        console.warn('API update failed, saved locally:', e);
    }

    renderUserContacts();
    closeMobileAuthModal('profile_edit');
    showToast('✅ Contacts updated successfully!');
}
window.saveMobileProfileContacts = saveMobileProfileContacts;

async function deleteContactField(fieldKey) {
    if (!currentUser) return;
    const labelMap = { phone: 'Mobile Phone', email: 'Email Address', address: 'Address' };
    const label = labelMap[fieldKey] || fieldKey;

    if (!confirm(`Are you sure you want to clear your ${label}?`)) return;

    if (fieldKey === 'phone') currentUser.phone = '';
    if (fieldKey === 'email') currentUser.email = '';
    if (fieldKey === 'address') currentUser.address = '';

    localStorage.setItem('favcafe_active_user', JSON.stringify(currentUser));

    try {
        await fetch('api/auth.php?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_profile',
                id: currentUser.id || 0,
                current_email: currentUser.email || '',
                full_name: currentUser.name || currentUser.full_name || '',
                phone: currentUser.phone,
                email: currentUser.email,
                address: currentUser.address
            })
        });
    } catch (e) { }

    renderUserContacts();
    showToast(`🗑️ ${label} cleared`);
}
window.deleteContactField = deleteContactField;

function deleteCustomContact(index) {
    if (!currentUser || !currentUser.custom_contacts) return;
    currentUser.custom_contacts.splice(index, 1);
    localStorage.setItem('favcafe_active_user', JSON.stringify(currentUser));
    renderUserContacts();
    showToast('🗑️ Contact deleted');
}
window.deleteCustomContact = deleteCustomContact;

function toggleDarkMode() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('favcafe_mobile_theme_mode', isLight ? 'light' : 'dark');

    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        if (isLight) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            icon.style.color = '#161d31';
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            icon.style.color = '#ffffff';
        }
    }
    showToast(isLight ? '☀️ Light Mode Enabled' : '🌙 Dark Mode Enabled');
}
window.toggleDarkMode = toggleDarkMode;

function initThemeMode() {
    const saved = localStorage.getItem('favcafe_mobile_theme_mode');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            icon.style.color = '#161d31';
        }
    }
}

function logout() {
    const token = localStorage.getItem('favcafe_token');
    localStorage.removeItem('favcafe_active_user');
    localStorage.removeItem('favcafe_token');
    localStorage.removeItem('favcafe_remembered_email');

    if (token) {
        fetch('api/auth.php?action=logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { });
    }

    showToast('👋 Signed out successfully. Redirecting to login...');
    setTimeout(() => {
        window.location.href = 'mobile_auth.html';
    }, 1200);
}
window.logout = logout;

// SIDEBAR DRAWER TOGGLE
function toggleSidebarDrawer() {
    const drawer = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('sidebarDrawerOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}
window.toggleSidebarDrawer = toggleSidebarDrawer;

// CATEGORY ICON CONFIG (SCREEN 4)
function getCategoryIconConfig(categoryName) {
    const cat = (categoryName || '').toLowerCase();
    if (cat.includes('breakfast') || cat.includes('egg') || cat.includes('crepe') || cat.includes('omelet')) return { icon: 'fas fa-egg', bg: '#f59e0b', label: 'Breakfast' };
    if (cat.includes('coffee') || cat.includes('cappuccino') || cat.includes('latte') || cat.includes('espresso')) return { icon: 'fas fa-coffee', bg: '#8b5cf6', label: 'Coffee' };
    if (cat.includes('tea')) return { icon: 'fas fa-mug-hot', bg: '#10b981', label: 'Tea' };
    if (cat.includes('pizza')) return { icon: 'fas fa-pizza-slice', bg: '#ef4444', label: 'Pizza' };
    if (cat.includes('burger')) return { icon: 'fas fa-hamburger', bg: '#f97316', label: 'Burgers' };
    if (cat.includes('plate') || cat.includes('stew') || cat.includes('pilau')) return { icon: 'fas fa-utensils', bg: '#ec4899', label: 'Plates' };
    if (cat.includes('grill') || cat.includes('meat') || cat.includes('chicken')) return { icon: 'fas fa-meat', bg: '#dc2626', label: 'Grill' };
    if (cat.includes('side') || cat.includes('chips') || cat.includes('rice')) return { icon: 'fas fa-bread-slice', bg: '#3b82f6', label: 'Sides' };
    if (cat.includes('salad')) return { icon: 'fas fa-leaf', bg: '#22c55e', label: 'Salads' };
    return { icon: 'fas fa-utensils', bg: '#2b5cff', label: categoryName || 'Foods' };
}

// MENU & DATA FETCHING
async function loadMenu() {
    try {
        const res = await fetch('api/menu.php?action=get&t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            const items = data.items || data.data;
            if (data.status === 'success' && Array.isArray(items) && items.length > 0) {
                menuItems = items;
                try { localStorage.setItem('favcafe_menu_cache', JSON.stringify(menuItems)); } catch (e) {}
                return;
            }
        }
    } catch (e) {}

    const cached = localStorage.getItem('favcafe_menu_cache');
    if (cached) {
        menuItems = JSON.parse(cached);
        return;
    }

    // Default reference menu items matching exact database items
    menuItems = [
        { id: 1, title: 'Special Favorie omelette', category: 'sides', price: 4500, image: 'img/menu/dish_1786018299_6931.png' },
        { id: 2, title: 'Chicken Strips and Chips', category: 'burgers', price: 9000, image: 'img/menu/dish_1790004782_1426.png' },
        { id: 3, title: 'Crispy Fried Chicken', category: 'mains', price: 6000, image: 'img/menu/dish_1786025102_4409.png' },
        { id: 4, title: 'Chicken and Rice', category: 'mains', price: 9000, image: 'img/menu/dish_1786019674_6493.png' },
        { id: 5, title: 'Jollof Rice and Chicken', category: 'mains', price: 10000, image: 'img/menu/dish_1786022829_6795.jpg' },
        { id: 6, title: 'Chef Salad', category: 'salads', price: 4000, image: 'img/menu/dish_1786021881_4037.png' },
        { id: 7, title: 'Chicken Pizza', category: 'pizza', price: 6000, image: 'img/menu/dish_1786021943_7435.jpg' },
        { id: 8, title: 'Burger and chips', category: 'burgers', price: 6000, image: 'img/menu/dish_1786028631_2822.jpg' },
        { id: 9, title: 'Espresso', category: 'black-coffee', price: 1500, image: 'img/menu/dish_1786021975_8115.jpg' },
        { id: 10, title: 'Americano', category: 'black-coffee', price: 2000, image: 'img/menu/dish_1786022008_6335.jpg' },
        { id: 13, title: 'Capuccino', category: 'coffee-with-milk', price: 2500, image: 'img/menu/dish_1786022071_9250.png' },
        { id: 68, title: 'Igisafuriya', category: 'mains', price: 25000, image: 'img/menu/dish_1786028567_9416.png' }
    ];
}

// RWF CURRENCY FORMATTER
function formatRWF(amount) {
    const val = parseFloat(amount || 0);
    return `${Math.round(val).toLocaleString()} RWF`;
}
window.formatRWF = formatRWF;

// CATEGORIES DATA FETCHING (SYNCED WITH ADMIN)
async function loadAppCategories() {
    try {
        const res = await fetch('api/categories.php?action=get&active_only=1&t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.categories)) {
                appCategories = data.categories.filter(c => parseInt(c.is_active) === 1 || c.is_active === true);
                try {
                    localStorage.setItem('favcafe_active_categories_cache', JSON.stringify(appCategories));
                } catch (e) {}
                return;
            }
        }
    } catch (e) {}

    // Fallback: localStorage 'favcafe_categories'
    try {
        const stored = localStorage.getItem('favcafe_categories');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                appCategories = parsed.filter(c => parseInt(c.is_active) === 1 || c.is_active === true);
                return;
            }
        }
    } catch (e) {}

    // Fallback cache
    try {
        const cached = localStorage.getItem('favcafe_active_categories_cache');
        if (cached) {
            appCategories = JSON.parse(cached);
        }
    } catch (e) {}
}

// PROMOS DATA FETCHING (SYNCED WITH ADMIN)
async function loadAppPromos() {
    try {
        const res = await fetch('api/promos.php?action=get&active_only=1&t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.promos)) {
                appPromos = data.promos.filter(p => p.is_active === undefined || parseInt(p.is_active) === 1 || p.is_active === true);
                try {
                    localStorage.setItem('favcafe_promos_cache', JSON.stringify(appPromos));
                } catch (e) {}
                return;
            }
        }
    } catch (e) {}

    // Fallback: localStorage 'favcafe_promos'
    try {
        const stored = localStorage.getItem('favcafe_promos');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                appPromos = parsed.filter(p => p.is_active === undefined || parseInt(p.is_active) === 1 || p.is_active === true);
                return;
            }
        }
    } catch (e) {}

    // Fallback cache
    try {
        const cached = localStorage.getItem('favcafe_promos_cache');
        if (cached) {
            appPromos = JSON.parse(cached);
        }
    } catch (e) {}
}

// RENDER HOME CATEGORIES (ONLY ENABLED ONES)
function renderHomeCategories() {
    const container = document.getElementById('homeCategories');
    if (!container) return;
    container.innerHTML = '';

    if (!appCategories || appCategories.length === 0) {
        container.innerHTML = `
            <div class="w-100 text-center py-2 text-muted-custom small">
                <i class="fas fa-tags me-1 opacity-50"></i>No active categories enabled.
            </div>
        `;
        return;
    }

    appCategories.forEach(cat => {
        const conf = getCategoryIconConfig(cat.slug || cat.name);
        const iconClass = cat.icon || conf.icon || 'fas fa-utensils';
        const bg = conf.bg || '#2b5cff';
        const catSlug = (cat.slug || cat.name).toLowerCase();
        const escapedSlug = catSlug.replace(/'/g, "\\'");
        const displayName = cat.name || cat.slug;

        container.innerHTML += `
            <a href="javascript:void(0);" class="cat-icon-card" onclick="filterByCategory('${escapedSlug}'); switchTab('menu');">
                <div class="cat-icon-box" style="background:${bg};">
                    <i class="${iconClass}"></i>
                </div>
                <span class="cat-icon-label">${displayName}</span>
            </a>
        `;
    });
}

// RENDER HOME PROMO BANNERS (RESPONSIVE CAROUSEL / CARD)
function renderHomePromos() {
    const container = document.getElementById('homePromoBannerContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!appPromos || appPromos.length === 0) {
        container.innerHTML = `
            <div class="promo-coral-card" onclick="switchTab('menu')">
                <div class="promo-tag">Welcome to Favorite Cafe</div>
                <div class="promo-title-discount">FRESH FLAVORS</div>
                <div class="promo-note">*Explore our handcrafted dishes &amp; beverages</div>
            </div>
        `;
        return;
    }

    if (appPromos.length === 1) {
        const p = appPromos[0];
        const bgStyle = p.img ? `background: linear-gradient(135deg, rgba(20, 28, 47, 0.88), rgba(20, 28, 47, 0.55)), url('${p.img}') center/cover;` : '';
        container.innerHTML = `
            <div class="promo-coral-card" style="${bgStyle}" onclick="switchTab('menu')">
                <div class="promo-tag">${p.subtitle || 'Special Offer'}</div>
                <div class="promo-title-discount">${p.discount || 'Special'}</div>
                <div class="promo-note">${p.title || '*Limited Time Deal'}</div>
            </div>
        `;
        return;
    }

    // Multiple promos: Render responsive swipeable slider
    let html = `<div class="promo-slider-container">`;
    appPromos.forEach(p => {
        const bgStyle = p.img ? `background: linear-gradient(135deg, rgba(20, 28, 47, 0.88), rgba(20, 28, 47, 0.55)), url('${p.img}') center/cover;` : '';
        html += `
            <div class="promo-coral-card" style="${bgStyle}" onclick="switchTab('menu')">
                <div class="promo-tag">${p.subtitle || 'Special Offer'}</div>
                <div class="promo-title-discount">${p.discount || 'Special'}</div>
                <div class="promo-note">${p.title || '*Limited Time Deal'}</div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function renderHomeRecommended() {
    const container = document.getElementById('homeRecommended');
    if (!container) return;

    container.innerHTML = '';
    const activeSlugs = (appCategories || []).map(c => (c.slug || '').toLowerCase().trim());
    const validItems = menuItems.filter(item => activeSlugs.includes((item.category || '').toLowerCase().trim()));
    const recommendations = validItems.slice(0, 6);
    if (recommendations.length === 0) {
        container.innerHTML = '<div class="text-center w-100 py-3 text-muted-custom small"><i class="fas fa-utensils me-1 opacity-50"></i>No active dishes available.</div>';
        return;
    }
    recommendations.forEach(item => {
        container.innerHTML += createMenuCard(item);
    });
}

function setAppMenuType(type, btn) {
    appMenuType = (type || 'all').toLowerCase();
    const container = document.getElementById('appMenuTypeChips');
    if (container) {
        container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');

    activeCategory = 'All';
    renderMenuCategories();
    executeSearch();
}
window.setAppMenuType = setAppMenuType;

function renderMenuCategories() {
    const container = document.getElementById('menuCategoryChips');
    if (!container) return;
    container.innerHTML = '';

    const list = [{ name: 'All', slug: 'All' }, ...appCategories];

    list.forEach(cat => {
        const catSlug = (cat.slug || cat.name).toLowerCase();

        // If a specific menu type is selected (e.g. Breakfast), only show categories containing items of that menu type
        if (cat.slug !== 'All' && appMenuType !== 'all') {
            const hasItemsInMenuType = menuItems.some(m => {
                const mt = (m.menu_type || 'lunch').toLowerCase();
                const mc = (m.category || '').toLowerCase();
                return (mt === appMenuType || mt === 'all_day') && mc === catSlug;
            });
            if (!hasItemsInMenuType) return;
        }

        const isActive = (catSlug === activeCategory.toLowerCase() || (activeCategory.toLowerCase() === 'all' && cat.slug === 'All')) ? 'active' : '';
        const escapedSlug = (cat.slug || cat.name).toLowerCase().replace(/'/g, "\\'");
        const displayName = cat.name || cat.slug;

        container.innerHTML += `
            <button type="button" class="status-pill-btn ${isActive}" onclick="filterByCategory('${escapedSlug}')">
                ${displayName}
            </button>
        `;
    });
}

function filterByCategory(cat) {
    activeCategory = (cat || 'All');
    renderMenuCategories();
    executeSearch();
}
window.filterByCategory = filterByCategory;

function renderMenuGrid(itemsToRender = null) {
    const container = document.getElementById('menuGrid');
    if (!container) return;

    container.innerHTML = '';
    const items = itemsToRender || menuItems;

    if (items.length === 0) {
        container.innerHTML = `<div class="text-center w-100 py-5 text-muted-custom">No items found for this selection.</div>`;
        return;
    }

    items.forEach(item => {
        container.innerHTML += createMenuCard(item);
    });
}

function createMenuCard(item) {
    const img = item.image && item.image !== 'undefined' ? item.image : 'img/menu/1.jpg';
    const priceVal = parseFloat(item.price || 0);
    const priceStr = formatRWF(priceVal);
    const subStr = item.description || item.subtitle || item.category || 'Favorite Specialty';

    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
    const mType = (item.menu_type || 'lunch').toLowerCase();
    let badgeHtml = '';
    if (mType === 'breakfast') {
        badgeHtml = '<span class="menu-type-badge-sm">🍳 Breakfast</span>';
    } else if (mType === 'lunch') {
        badgeHtml = '<span class="menu-type-badge-sm lunch">🍽️ Lunch</span>';
    }

    return `
        <div class="food-card">
            <div class="food-card-img-wrapper" style="position:relative;">
                ${badgeHtml}
                <img src="${img}" class="food-card-img" onerror="this.src='img/menu/1.jpg'" alt="${item.title}">
                <button type="button" class="food-card-btn-add" onclick="addToCart(event, ${itemJson})" title="Add to cart">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="food-card-body">
                <div class="food-card-title">${item.title}</div>
                <div class="food-card-subtitle" title="${subStr}">${subStr}</div>
                <div class="food-card-footer">
                    <span class="food-card-price">${priceStr}</span>
                </div>
            </div>
        </div>
    `;
}

function executeSearch() {
    const input = document.getElementById('menuViewSearchInput') || document.getElementById('menuSearchInput');
    const query = input ? input.value.toLowerCase().trim() : '';

    const activeSlugs = (appCategories || []).map(c => (c.slug || '').toLowerCase().trim());

    // If a category was deleted/disabled while active, gracefully reset to 'All'
    if (activeCategory.toLowerCase() !== 'all' && !activeSlugs.includes(activeCategory.toLowerCase())) {
        activeCategory = 'All';
        renderMenuCategories();
    }

    const filtered = menuItems.filter(item => {
        const itemCat = (item.category || '').toLowerCase().trim();
        const itemMenuType = (item.menu_type || 'lunch').toLowerCase().trim();

        // 1. Menu Type Filter (Breakfast vs Lunch)
        if (appMenuType !== 'all') {
            if (itemMenuType !== appMenuType && itemMenuType !== 'all_day') {
                return false;
            }
        }

        // 2. Category Filter
        if (activeCategory.toLowerCase() === 'all') {
            if (!activeSlugs.includes(itemCat)) {
                return false;
            }
        } else {
            if (itemCat !== activeCategory.toLowerCase()) {
                return false;
            }
        }

        // 3. Query search
        if (query) {
            const matchesQuery = (item.title && item.title.toLowerCase().includes(query)) || 
                                 (item.category && item.category.toLowerCase().includes(query)) ||
                                 (item.description && item.description.toLowerCase().includes(query));
            if (!matchesQuery) return false;
        }

        return true;
    });

    renderMenuGrid(filtered);
}
window.executeSearch = executeSearch;

function executeMenuSearch(val) {
    const input = document.getElementById('menuSearchInput');
    if (input && val !== undefined) input.value = val;
    executeSearch();
}
window.executeMenuSearch = executeMenuSearch;

// CART & CHECKOUT (SCREEN 3)
let userLoyaltyPoints = 2500;
let appliedLoyaltyPoints = 0;
let promoDiscountAmount = 0;
let appliedPromoCode = '';

function loadCart() {
    const stored = localStorage.getItem('favcafe_cart');
    if (stored) {
        try { cart = JSON.parse(stored); } catch (e) {}
    }

    if (!cart || cart.length === 0) {
        cart = [
            { id: 2, title: 'Chicken Strips and Chips', subtitle: 'Burgers & Chips', price: 9000, qty: 1, image: 'img/menu/dish_1790004782_1426.png' },
            { id: 7, title: 'Chicken Pizza', subtitle: 'Freshly Baked Pizza', price: 6000, qty: 1, image: 'img/menu/dish_1786021943_7435.jpg' },
            { id: 9, title: 'Espresso', subtitle: 'Black Coffee', price: 1500, qty: 1, image: 'img/menu/dish_1786021975_8115.jpg' }
        ];
    }

    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartContainer');
    const summary = document.getElementById('cartSummary');
    const emptyState = document.getElementById('emptyCart');

    if (!container) return;
    container.innerHTML = '';

    // Sanitize cart items safely to prevent NaN/undefined issues
    cart = (cart || []).map(item => {
        const itemQty = parseInt(item.qty !== undefined ? item.qty : (item.quantity !== undefined ? item.quantity : 1)) || 1;
        const itemPrice = parseFloat(item.price || 0) || 0;
        return {
            ...item,
            qty: itemQty,
            quantity: itemQty,
            price: itemPrice
        };
    });

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartBadge');
    if (badge) badge.innerText = totalItems;

    if (cart.length === 0) {
        if (summary) summary.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (summary) summary.style.display = 'block';

    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        const img = item.image || 'img/menu/1.jpg';

        container.innerHTML += `
            <div class="cart-list-item">
                <button type="button" class="cart-remove-btn" onclick="changeCartQty(${index}, -${item.qty})">&times;</button>
                <img src="${img}" onerror="this.src='img/menu/1.jpg'" class="cart-item-img" alt="${item.title}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.title}</div>
                    <div class="cart-item-sub">${item.subtitle || 'Specialty Item'}</div>
                    <div class="cart-item-price-row">
                        <span class="cart-item-price">${formatRWF(item.price)}</span>
                    </div>
                </div>
                <div class="cart-qty-picker">
                    <button type="button" class="cart-qty-btn" onclick="changeCartQty(${index}, -1)">-</button>
                    <span class="cart-qty-val">${item.qty}</span>
                    <button type="button" class="cart-qty-btn" onclick="changeCartQty(${index}, 1)">+</button>
                </div>
            </div>
        `;
    });

    const deliveryFee = subtotal > 0 ? 1000 : 0;
    let effectiveLoyaltyDiscount = Math.min(appliedLoyaltyPoints, subtotal + deliveryFee - promoDiscountAmount);
    if (effectiveLoyaltyDiscount < 0) effectiveLoyaltyDiscount = 0;

    const finalTotal = Math.max(0, subtotal + deliveryFee - promoDiscountAmount - effectiveLoyaltyDiscount);

    const subtotalEl = document.getElementById('cartSubtotal');
    const deliveryEl = document.getElementById('cartDeliveryFee');
    const promoRow = document.getElementById('promoDiscountRow');
    const promoEl = document.getElementById('cartPromoDiscount');
    const loyaltyRow = document.getElementById('loyaltyDiscountRow');
    const loyaltyEl = document.getElementById('cartLoyaltyDiscount');
    const loyaltyNotice = document.getElementById('loyaltyAppliedNotice');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.innerText = formatRWF(subtotal);
    if (deliveryEl) deliveryEl.innerText = formatRWF(deliveryFee);

    if (promoRow && promoEl) {
        if (promoDiscountAmount > 0) {
            promoRow.style.display = 'flex';
            promoEl.innerText = `-${formatRWF(promoDiscountAmount)}`;
        } else {
            promoRow.style.display = 'none';
        }
    }

    if (loyaltyRow && loyaltyEl) {
        if (effectiveLoyaltyDiscount > 0) {
            loyaltyRow.style.display = 'flex';
            loyaltyEl.innerText = `-${formatRWF(effectiveLoyaltyDiscount)}`;
            if (loyaltyNotice) {
                loyaltyNotice.style.display = 'block';
                loyaltyNotice.innerHTML = `<i class="fas fa-check-circle me-1"></i>Redeemed ${effectiveLoyaltyDiscount.toLocaleString()} pts (-${formatRWF(effectiveLoyaltyDiscount)}) <a href="javascript:void(0);" onclick="removeLoyaltyDiscount()" class="text-danger ms-2">Remove</a>`;
            }
        } else {
            loyaltyRow.style.display = 'none';
            if (loyaltyNotice) loyaltyNotice.style.display = 'none';
        }
    }

    if (totalEl) totalEl.innerText = formatRWF(finalTotal);
}

function changeCartQty(index, delta) {
    if (cart[index]) {
        let currentQty = parseInt(cart[index].qty !== undefined ? cart[index].qty : cart[index].quantity) || 1;
        currentQty += delta;
        if (currentQty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].qty = currentQty;
            cart[index].quantity = currentQty;
        }
        localStorage.setItem('favcafe_cart', JSON.stringify(cart));
        loadCart();
    }
}
window.changeCartQty = changeCartQty;

function updateCartQty(id, delta) {
    let index = -1;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id == id) {
            index = i;
            break;
        }
    }
    if (index !== -1) {
        changeCartQty(index, delta);
    }
}
window.updateCartQty = updateCartQty;

function addToCart(e, item) {
    if (e) e.stopPropagation();

    const cartItem = {
        id: item.id,
        title: item.title || 'Food Item',
        subtitle: item.subtitle || item.category || 'Specialty',
        price: parseFloat(item.price) || 5000,
        image: item.image || 'img/menu/1.jpg',
        qty: 1,
        quantity: 1
    };

    let found = false;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].id === cartItem.id) {
            cart[i].qty = (parseInt(cart[i].qty) || 1) + 1;
            cart[i].quantity = cart[i].qty;
            found = true;
            break;
        }
    }
    if (!found) cart.push(cartItem);

    localStorage.setItem('favcafe_cart', JSON.stringify(cart));
    loadCart();
    showToast(`✅ Added ${cartItem.title} to cart!`);
}
window.addToCart = addToCart;

function addExtraToCart(name, price, img) {
    const extraPrice = parseFloat(price || 0);
    const existingIndex = cart.findIndex(item => item.title.toLowerCase() === name.toLowerCase());

    if (existingIndex > -1) {
        cart[existingIndex].qty = (parseInt(cart[existingIndex].qty) || 1) + 1;
        cart[existingIndex].quantity = cart[existingIndex].qty;
    } else {
        const extraItem = {
            id: 'extra_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            title: name,
            subtitle: 'Extra / Side',
            price: extraPrice,
            image: img || 'img/menu/1.jpg',
            qty: 1,
            quantity: 1
        };
        cart.push(extraItem);
    }
    localStorage.setItem('favcafe_cart', JSON.stringify(cart));
    loadCart();
    showToast(`✅ Added ${name} extra to cart!`);
}
window.addExtraToCart = addExtraToCart;

function toggleCartExtrasCollapse() {
    const grid = document.getElementById('cartExtrasGrid');
    const chevron = document.getElementById('cartExtrasChevron');
    if (!grid) return;
    grid.classList.toggle('collapsed');
    if (chevron) {
        if (grid.classList.contains('collapsed')) {
            chevron.style.transform = 'rotate(180deg)';
        } else {
            chevron.style.transform = 'rotate(0deg)';
        }
    }
}
window.toggleCartExtrasCollapse = toggleCartExtrasCollapse;

function toggleCartFooterCollapse() {
    const body = document.getElementById('cartFooterCollapsibleBody');
    const chevron = document.getElementById('cartFooterChevron');
    if (!body) return;
    body.classList.toggle('collapsed');
    if (chevron) {
        if (body.classList.contains('collapsed')) {
            chevron.style.transform = 'rotate(180deg)';
        } else {
            chevron.style.transform = 'rotate(0deg)';
        }
    }
}
window.toggleCartFooterCollapse = toggleCartFooterCollapse;

function quickSelectLoyaltyPoints(pts) {
    if (pts === 'all') {
        pts = userLoyaltyPoints;
    }
    applyLoyaltyPoints(pts);
}
window.quickSelectLoyaltyPoints = quickSelectLoyaltyPoints;

function applyCustomLoyaltyPoints() {
    const input = document.getElementById('customLoyaltyInput');
    if (!input) return;
    const pts = parseInt(input.value) || 0;
    applyLoyaltyPoints(pts);
}
window.applyCustomLoyaltyPoints = applyCustomLoyaltyPoints;

function applyLoyaltyPoints(pts) {
    if (pts <= 0) {
        appliedLoyaltyPoints = 0;
        showToast('Loyalty discount reset', 'info');
    } else if (pts > userLoyaltyPoints) {
        showToast(`⚠️ You only have ${userLoyaltyPoints.toLocaleString()} points available.`, 'warning');
        appliedLoyaltyPoints = userLoyaltyPoints;
    } else {
        appliedLoyaltyPoints = pts;
        showToast(`🎉 Applied ${pts.toLocaleString()} Loyalty Points (-${formatRWF(pts)})!`, 'success');
    }
    renderCartItems();
}

function removeLoyaltyDiscount() {
    appliedLoyaltyPoints = 0;
    const input = document.getElementById('customLoyaltyInput');
    if (input) input.value = '';
    showToast('Removed loyalty points discount', 'info');
    renderCartItems();
}
window.removeLoyaltyDiscount = removeLoyaltyDiscount;

function applyPromoCode() {
    const input = document.getElementById('cartPromoInput');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) {
        showToast('Please enter a promo code', 'warning');
        return;
    }
    if (code === 'FAV20' || code === 'DISCOUNT20' || code === 'PROMO') {
        promoDiscountAmount = 2000;
        appliedPromoCode = code;
        showToast(`🎟️ Promo Code '${code}' applied (-2,000 RWF)!`, 'success');
    } else {
        showToast('Invalid promo code. Try "FAV20"', 'warning');
    }
    renderCartItems();
}
window.applyPromoCode = applyPromoCode;

function checkout() {
    showToast('💳 Order Confirmed! Thank you for ordering.', 'success');
}
window.checkout = checkout;

// YOUR ORDERS & STATUS FILTERING (SCREEN 1)
function filterOrderHistoryTab(status, element) {
    currentOrderFilter = status;
    document.querySelectorAll('#orderStatusFilterPills .status-pill-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (element) element.classList.add('active');
    loadMobileOrderHistory();
}
window.filterOrderHistoryTab = filterOrderHistoryTab;

function loadMobileOrderHistory() {
    const container = document.getElementById('mobileOrderHistoryList');
    if (!container) return;

    const sampleOrders = [
        {
            id: 'FC-1234',
            statusCategory: 'delivery',
            statusLabel: 'ON DELIVERY',
            statusDotColor: '#ff5e57',
            actionText: 'Track Location',
            items: [
                { title: 'Espresso', price: 1500, qty: 1, img: 'img/menu/dish_1786021975_8115.jpg' },
                { title: 'Chicken Pizza', price: 6000, qty: 1, img: 'img/menu/dish_1786021943_7435.jpg' }
            ]
        },
        {
            id: 'FC-6129',
            statusCategory: 'done',
            statusLabel: 'DONE',
            statusDotColor: '#2ed573',
            actionText: 'View Details',
            items: [
                { title: 'Chicken Strips and Chips', price: 9000, qty: 1, img: 'img/menu/dish_1790004782_1426.png' },
                { title: 'Burger and chips', price: 6000, qty: 1, img: 'img/menu/dish_1786028631_2822.jpg' }
            ]
        }
    ];

    let filtered = sampleOrders;
    if (currentOrderFilter !== 'all') {
        filtered = sampleOrders.filter(o => o.statusCategory === currentOrderFilter);
    }

    container.innerHTML = '';
    filtered.forEach(o => {
        let itemsHtml = '';
        o.items.forEach(item => {
            itemsHtml += `
                <div class="order-item-row">
                    <img src="${item.img}" onerror="this.src='img/menu/1.jpg'" class="order-item-thumb" alt="${item.title}">
                    <div class="order-item-detail">
                        <div class="order-item-title">${item.title}</div>
                        <div class="order-item-price">${formatRWF(item.price)}</div>
                    </div>
                    <div class="order-item-qty">${item.qty}x</div>
                </div>
            `;
        });

        container.innerHTML += `
            <div class="order-ticket-card">
                <div class="order-ticket-header">
                    <div>
                        <span class="order-id-txt">Order ID #${o.id}</span>
                        <div class="order-status-badge mt-1" style="color:${o.statusDotColor};">
                            <span class="status-pill-dot" style="background:${o.statusDotColor};"></span>
                            ${o.statusLabel}
                        </div>
                    </div>
                    <a href="javascript:void(0);" class="order-action-link" onclick="showToast('📍 Tracking ${o.id}')">${o.actionText}</a>
                </div>
                <div>
                    ${itemsHtml}
                </div>
            </div>
        `;
    });
}
window.loadMobileOrderHistory = loadMobileOrderHistory;

function filterOrdersListByQuery(query) {
    showToast(`Searching orders: "${query}"`);
}
window.filterOrdersListByQuery = filterOrdersListByQuery;

// FAVORITES / OFFERS
function loadFavorites() {
    const favStr = localStorage.getItem('favcafe_favorites');
    if (favStr) {
        try { favorites = JSON.parse(favStr); } catch (e) {}
    }
}

function renderFavoriteGrid() {
    const container = document.getElementById('favoriteGrid');
    if (!container) return;

    container.innerHTML = '';
    const items = menuItems.slice(0, 4);
    items.forEach(item => {
        container.innerHTML += createMenuCard(item);
    });
}

function renderOffersPromos() {
    const container = document.getElementById('offersPromoContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!appPromos || appPromos.length === 0) return;

    let html = `
        <div class="section-title-bar mb-2" style="padding:0;">
            <h3 style="font-size:1.05rem; color:var(--text-white); font-weight:700;"><i class="fas fa-bullhorn me-2 text-cyan"></i>Active Deals &amp; Vouchers</h3>
        </div>
        <div class="d-flex flex-column gap-2 mb-3">
    `;

    appPromos.forEach(p => {
        const bgStyle = p.img ? `background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url('${p.img}') center/cover;` : 'background: linear-gradient(135deg, #1f2b48, #2a3b63);';
        html += `
            <div class="p-3 d-flex justify-content-between align-items-center" style="${bgStyle}; border-radius:16px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 8px;">
                <div>
                    <span class="badge bg-coral mb-1" style="font-size:0.75rem; padding:3px 8px; border-radius:8px; display:inline-block;">${p.discount}</span>
                    <h5 class="mb-0 text-white fw-bold" style="font-size:1.05rem;">${p.title}</h5>
                    <small class="text-light-blue" style="font-size:0.8rem;">${p.subtitle}</small>
                </div>
                <button type="button" class="btn btn-sm btn-cyan-action" style="padding: 6px 14px; border-radius: 20px; font-weight: 600;" onclick="switchTab('menu')">Order</button>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// REALTIME SYNCHRONIZATION WITH ADMIN DASHBOARD
function setupRealtimeSync() {
    // 1. BroadcastChannel (Instant cross-tab messaging without page reload)
    if ('BroadcastChannel' in window) {
        try {
            const bc = new BroadcastChannel('favcafe_sync');
            bc.onmessage = async (event) => {
                if (!event.data) return;
                if (event.data.type === 'CATEGORIES_UPDATED') {
                    await handleCategoriesRealtimeUpdate();
                }
                if (event.data.type === 'PROMOS_UPDATED') {
                    await handlePromosRealtimeUpdate();
                }
            };
        } catch (e) {}
    }

    // 2. Storage event listener (Triggers across tabs whenever localStorage updates)
    window.addEventListener('storage', async (event) => {
        if (event.key === 'favcafe_categories' || event.key === 'favcafe_categories_sync_ts') {
            await handleCategoriesRealtimeUpdate();
        }
        if (event.key === 'favcafe_promos' || event.key === 'favcafe_promos_sync_ts') {
            await handlePromosRealtimeUpdate();
        }
    });

    // 3. Tab visibility / window focus (Refetch when user switches tabs)
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            await handleCategoriesRealtimeUpdate();
            await handlePromosRealtimeUpdate();
        }
    });

    // 4. Background heartbeat polling (for cross-device/LAN testing)
    setInterval(async () => {
        if (!document.hidden && navigator.onLine) {
            await loadAppCategories();
            await loadAppPromos();
            await loadMenu();
            renderHomeCategories();
            renderHomeRecommended();
            renderHomePromos();
            renderMenuCategories();
            renderOffersPromos();
            executeSearch();
        }
    }, 3000);
}

async function handleCategoriesRealtimeUpdate() {
    await loadAppCategories();
    await loadMenu();
    renderHomeCategories();
    renderHomeRecommended();
    renderMenuCategories();
    executeSearch();
}

async function handlePromosRealtimeUpdate() {
    await loadAppPromos();
    renderHomePromos();
    renderOffersPromos();
}

window.setupRealtimeSync = setupRealtimeSync;
window.renderOffersPromos = renderOffersPromos;

// TAB NAVIGATION & VIEW SWITCHER
function switchTab(tabId, element) {
    document.querySelectorAll('.bottom-nav-bar .bottom-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (element) {
        element.classList.add('active');
    } else {
        const targetNav = document.querySelector(`.bottom-nav-bar .bottom-nav-item[data-tab="${tabId}"]`);
        if (targetNav) targetNav.classList.add('active');
    }

    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
        targetView.classList.add('active');
    }

    const titles = {
        'home': 'INEZA RESTO & COFFEE SHOP',
        'menu': 'Cafe Menu',
        'order': 'Shopping Cart',
        'history': 'Your Orders',
        'notification': 'Notification',
        'profile': 'Profile',
        'favorite': 'Offers & Deals'
    };

    const headerTitleText = document.getElementById('headerTitleText');
    if (headerTitleText) {
        headerTitleText.innerText = titles[tabId] || 'INEZA RESTO & COFFEE SHOP';
    }

    const globalBackBtn = document.getElementById('globalBackBtn');
    if (globalBackBtn) {
        if (tabId === 'home') {
            globalBackBtn.style.display = 'none';
        } else {
            globalBackBtn.style.display = 'inline-flex';
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchTab = switchTab;

// TOAST NOTIFICATION
function showToast(message, type = 'info') {
    const toast = document.getElementById('appToast');
    if (!toast) return;

    toast.innerText = message;
    toast.classList.add('show');

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}
window.showToast = showToast;