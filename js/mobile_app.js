/* =========================================
   Foodia Dark Navy Theme JS Logic (From Scratch)
   ========================================= */

// GLOBAL STATE
let currentUser = null;
let menuItems = [];
let appCategories = [];
let appPromos = [];
let promoCarouselTimer = null;
let currentPromoIndex = 0;
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
    await loadMenu();
    await loadCategories();
    await loadPromos();

    renderHomeCategories();
    renderHomeRecommended();
    renderHomePromos();
    renderOffersPromos();
    renderMenuCategories();
    renderMenuGrid();
    renderFavoriteGrid();
    loadMobileOrderHistory();

    initNetworkListener();
    initStorageSyncListener();
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
    if (cat.includes('breakfast') || cat.includes('egg')) return { icon: 'fas fa-egg', bg: '#f39c12', label: 'Breakfast' };
    if (cat.includes('burger')) return { icon: 'fas fa-hamburger', bg: '#e67e22', label: 'Burgers' };
    if (cat.includes('pizza')) return { icon: 'fas fa-pizza-slice', bg: '#e74c3c', label: 'Pizza' };
    if (cat.includes('grill') || cat.includes('meat') || cat.includes('steak')) return { icon: 'fas fa-fire', bg: '#d35400', label: 'Grill' };
    if (cat.includes('plate') || cat.includes('main')) return { icon: 'fas fa-concierge-bell', bg: '#8e44ad', label: 'Plates' };
    if (cat.includes('salad')) return { icon: 'fas fa-seedling', bg: '#27ae60', label: 'Salads' };
    if (cat.includes('side')) return { icon: 'fas fa-utensils', bg: '#16a085', label: 'Sides' };
    if (cat.includes('coffee')) return { icon: 'fas fa-coffee', bg: '#6f4e37', label: 'Coffee' };
    if (cat.includes('tea')) return { icon: 'fas fa-mug-hot', bg: '#2ecc71', label: 'Tea' };
    if (cat.includes('pasta') || cat.includes('noodle')) return { icon: 'fas fa-utensils', bg: '#ff7043', label: 'Pasta' };
    if (cat.includes('soup')) return { icon: 'fas fa-bowl-food', bg: '#26c6da', label: 'Soups' };
    if (cat.includes('potato')) return { icon: 'fas fa-border-all', bg: '#a55eea', label: 'Potatoes' };
    if (cat.includes('salmon') || cat.includes('fish')) return { icon: 'fas fa-fish', bg: '#ff79ac', label: 'Fish' };
    if (cat.includes('wrap') || cat.includes('fast') || cat.includes('snack')) return { icon: 'fas fa-cookie-bite', bg: '#26de81', label: 'Snack' };
    if (cat.includes('drink') || cat.includes('juice') || cat.includes('beverage')) return { icon: 'fas fa-glass-martini-alt', bg: '#3498db', label: 'Drinks' };
    if (cat.includes('dessert') || cat.includes('dissert') || cat.includes('ice') || cat.includes('shake') || cat.includes('smoothie')) return { icon: 'fas fa-ice-cream', bg: '#9b59b6', label: 'Dessert' };
    return { icon: 'fas fa-utensils', bg: '#2b5cff', label: categoryName || 'Foods' };
}

// MENU & DATA FETCHING
async function loadCategories() {
    try {
        const res = await fetch('api/categories.php?action=get&active_only=1');
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.categories)) {
                appCategories = data.categories;
                localStorage.setItem('favcafe_categories', JSON.stringify(appCategories));
                return;
            }
        }
    } catch (e) {}

    const cached = localStorage.getItem('favcafe_categories') || localStorage.getItem('favcafe_mobile_categories');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            appCategories = parsed.filter(c => !c.hasOwnProperty('is_active') || parseInt(c.is_active) === 1 || c.is_active === true);
        } catch (e) {}
    }
}

async function loadPromos() {
    try {
        const res = await fetch('api/promos.php?action=get&active_only=1');
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.promos) && data.promos.length > 0) {
                appPromos = data.promos;
                localStorage.setItem('favcafe_promos', JSON.stringify(appPromos));
                return;
            }
        }
    } catch (e) {}

    const stored = localStorage.getItem('favcafe_promos');
    if (stored) {
        try { appPromos = JSON.parse(stored); } catch (e) {}
    }

    if (!appPromos || appPromos.length === 0) {
        appPromos = [
            { id: 1, title: "*for All Menus", subtitle: "Happy Weekend", discount: "60% OFF", img: "img/menu/7.jpg" },
            { id: 2, title: "Fresh Salads", subtitle: "Healthy & Green", discount: "20%", img: "img/menu/3.png" },
            { id: 3, title: "Coffee & Pastries", subtitle: "Morning Special", discount: "15%", img: "img/menu/5.jpg" }
        ];
    }
}

function renderHomePromos() {
    const container = document.getElementById('homePromoBannerContainer');
    if (!container) return;

    if (!appPromos || appPromos.length === 0) {
        container.innerHTML = `
            <div class="promo-coral-card" onclick="switchTab('favorite')">
                <div class="promo-content">
                    <div class="promo-tag">Happy Weekend</div>
                    <div class="promo-title-discount">60% OFF</div>
                    <div class="promo-note">*for All Menus</div>
                </div>
            </div>
        `;
        return;
    }

    let html = '<div class="promo-carousel-wrapper">';
    appPromos.forEach((p, idx) => {
        let discountDisplay = p.discount || '60% OFF';
        if (discountDisplay && !discountDisplay.toUpperCase().includes('OFF') && discountDisplay.includes('%')) {
            discountDisplay += ' OFF';
        }
        const tagDisplay = p.subtitle || 'Happy Weekend';
        const noteDisplay = p.title || '*for All Menus';

        html += `
            <div class="promo-coral-card promo-carousel-slide ${idx === currentPromoIndex ? 'active' : ''}" onclick="switchTab('favorite')">
                <div class="promo-content">
                    <div class="promo-tag">${tagDisplay}</div>
                    <div class="promo-title-discount">${discountDisplay}</div>
                    <div class="promo-note">${noteDisplay}</div>
                </div>
                ${p.img ? `<div class="promo-media"><img src="${p.img}" alt="${tagDisplay}" onerror="this.parentElement.style.display='none';"></div>` : ''}
            </div>
        `;
    });

    if (appPromos.length > 1) {
        html += '<div class="promo-carousel-dots">';
        appPromos.forEach((_, idx) => {
            html += `<span class="promo-dot ${idx === currentPromoIndex ? 'active' : ''}" onclick="switchPromoSlide(${idx})"></span>`;
        });
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    startPromoCarouselTimer();
}

function renderOffersPromos() {
    const container = document.getElementById('offersPromoCardsContainer');
    if (!container) return;

    if (!appPromos || appPromos.length === 0) {
        container.innerHTML = `
            <div class="promo-coral-card mb-3" style="cursor:pointer;" onclick="switchTab('menu')">
                <div class="promo-content">
                    <div class="promo-tag">Happy Weekend</div>
                    <div class="promo-title-discount">60% OFF</div>
                    <div class="promo-note">*for All Menus - Browse Menu</div>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    appPromos.forEach((p) => {
        let discountDisplay = p.discount || 'Special Offer';
        if (discountDisplay && !discountDisplay.toUpperCase().includes('OFF') && discountDisplay.includes('%')) {
            discountDisplay += ' OFF';
        }
        const tagDisplay = p.subtitle || 'Promo Offer';
        const noteDisplay = p.title || '*Available now';

        html += `
            <div class="promo-coral-card mb-3" style="cursor:pointer;" onclick="switchTab('menu')">
                <div class="promo-content">
                    <div class="promo-tag">${tagDisplay}</div>
                    <div class="promo-title-discount">${discountDisplay}</div>
                    <div class="promo-note">${noteDisplay} &bull; <span style="text-decoration:underline;">Order Now</span></div>
                </div>
                ${p.img ? `<div class="promo-media"><img src="${p.img}" alt="${tagDisplay}" onerror="this.parentElement.style.display='none';"></div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}
window.renderOffersPromos = renderOffersPromos;

function switchPromoSlide(index) {
    if (!appPromos || appPromos.length <= 1) return;
    currentPromoIndex = (index + appPromos.length) % appPromos.length;
    
    document.querySelectorAll('.promo-carousel-slide').forEach((slide, idx) => {
        slide.classList.toggle('active', idx === currentPromoIndex);
    });
    document.querySelectorAll('.promo-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentPromoIndex);
    });

    startPromoCarouselTimer();
}
window.switchPromoSlide = switchPromoSlide;

function startPromoCarouselTimer() {
    if (promoCarouselTimer) clearInterval(promoCarouselTimer);
    if (!appPromos || appPromos.length <= 1) return;

    promoCarouselTimer = setInterval(() => {
        switchPromoSlide(currentPromoIndex + 1);
    }, 4500);
}

function initStorageSyncListener() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'favcafe_categories_updated' || e.key === 'favcafe_categories') {
            loadCategories().then(() => {
                renderHomeCategories();
                renderHomeRecommended();
                renderMenuCategories();
                executeSearch();
            });
        }
        if (e.key === 'favcafe_promos_updated' || e.key === 'favcafe_promos') {
            loadPromos().then(() => {
                renderHomePromos();
                renderOffersPromos();
            });
        }
    });
}

async function loadMenu() {
    try {
        const res = await fetch('api/menu.php?action=get&t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            const items = data.items || data.data;
            if (data.status === 'success' && Array.isArray(items) && items.length > 0) {
                menuItems = items;
                sortInitialMenuItems();
                try { localStorage.setItem('favcafe_menu_cache', JSON.stringify(menuItems)); } catch (e) {}
                return;
            }
        }
    } catch (e) {}

    // Static JSON fallback
    try {
        const resJson = await fetch('api/menu.json?t=' + Date.now());
        if (resJson.ok) {
            const jsonItems = await resJson.json();
            if (Array.isArray(jsonItems) && jsonItems.length > 0) {
                menuItems = jsonItems;
                sortInitialMenuItems();
                try { localStorage.setItem('favcafe_menu_cache', JSON.stringify(menuItems)); } catch (e) {}
                return;
            }
        }
    } catch (e) {}

    const cached = localStorage.getItem('favcafe_menu_cache');
    if (cached) {
        menuItems = JSON.parse(cached);
        sortInitialMenuItems();
        return;
    }

    // Default reference menu items matching exact database items
    menuItems = [
        { id: 7, title: 'Chicken Pizza', category: 'pizza', menu_type: 'lunch', price: 6000, description: 'Juicy grilled chicken chunks, melted mozzarella, and our signature tomato sauce on a freshly baked crust. Topped with onions, bell peppers, and a sprinkle of oregano. Available in: Regular / Medium / Large', image: 'img/menu/dish_1786021943_7435.jpg' },
        { id: 63, title: 'Classic Burger', category: 'burgers', menu_type: 'lunch', price: 5000, description: 'A classic beef burger with cheese.', image: 'img/menu/dish_1786028631_2822.jpg' },
        { id: 66, title: 'Chicken Burger', category: 'burgers', menu_type: 'lunch', price: 6000, description: 'burgers', image: 'img/menu/dish_1790004782_1426.png' },
        { id: 76, title: 'Crepes', category: 'breakfast', menu_type: 'breakfast', price: 2500, description: 'Crepes with honey & banana', image: 'img/menu/dish_1786018299_6931.png' },
        { id: 1, title: 'Special Ineza Omelette', category: 'sides', menu_type: 'breakfast', price: 4500, description: 'Fresh farm eggs with tomatoes, onions, and bell peppers.', image: 'img/menu/dish_1786018299_6931.png' },
        { id: 3, title: 'Crispy Fried Chicken', category: 'plates', menu_type: 'lunch', price: 6000, description: 'Crispy golden seasoned fried chicken pieces.', image: 'img/menu/dish_1786025102_4409.png' }
    ];
}

function sortInitialMenuItems() {
    if (!menuItems || menuItems.length === 0) return;
    const featuredTitles = ['Chicken Pizza', 'Classic Burger', 'Chicken Burger', 'Crepes', 'Omelette', 'Special Favorie'];
    menuItems.sort((a, b) => {
        const idxA = featuredTitles.findIndex(t => a.title && a.title.toLowerCase().includes(t.toLowerCase()));
        const idxB = featuredTitles.findIndex(t => b.title && b.title.toLowerCase().includes(t.toLowerCase()));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
    });
}

// RWF CURRENCY FORMATTER
function formatRWF(amount) {
    const val = parseFloat(amount || 0);
    return `${Math.round(val).toLocaleString()} RWF`;
}
window.formatRWF = formatRWF;

// RENDER HOME CATEGORIES (SCREEN 4)
function renderHomeCategories() {
    const container = document.getElementById('homeCategories');
    if (!container) return;

    if (!appCategories || appCategories.length === 0) {
        container.innerHTML = '<div class="w-100 text-center py-4" style="color:#8a99ad; font-size:0.9rem; padding: 1.5rem;">No categories displayed</div>';
        return;
    }

    container.innerHTML = '';
    
    appCategories.forEach((catObj) => {
        const rawSlug = (catObj.slug || catObj.name || '').toLowerCase();
        const conf = getCategoryIconConfig(rawSlug);
        const iconClass = catObj.icon || conf.icon;
        const displayName = catObj.name || conf.label;
        const escapedSlug = rawSlug.replace(/'/g, "\\'");
        
        container.innerHTML += `
            <a href="javascript:void(0);" class="cat-icon-card" onclick="filterByCategory('${escapedSlug}'); switchTab('menu');">
                <div class="cat-icon-box" style="background:${conf.bg};">
                    <i class="${iconClass}"></i>
                </div>
                <span class="cat-icon-label">${displayName}</span>
            </a>
        `;
    });
}

function renderHomeRecommended() {
    const container = document.getElementById('homeRecommended');
    if (!container) return;

    container.innerHTML = '';

    if (!appCategories || appCategories.length === 0) {
        container.innerHTML = '<div class="text-center w-100 py-4 text-muted-custom" style="color:#8a99ad; font-size:0.85rem;">No categories displayed</div>';
        return;
    }

    const activeSlugs = (appCategories || []).map(c => (c.slug || c.name || '').toLowerCase().trim());
    const validItems = menuItems.filter(item => activeSlugs.includes((item.category || '').toLowerCase().trim()));

    if (validItems.length === 0) {
        container.innerHTML = '<div class="text-center w-100 py-4 text-muted-custom" style="color:#8a99ad; font-size:0.85rem;">No items available</div>';
        return;
    }

    const recommendations = validItems.slice(0, 4);
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

    if (!appCategories || appCategories.length === 0) {
        container.innerHTML = '<div class="text-center w-100 py-2" style="color:#8a99ad; font-size:0.85rem;">No categories displayed</div>';
        return;
    }

    const list = [{ name: 'All', slug: 'All' }, ...(appCategories || [])];

    list.forEach(cat => {
        const catSlug = (cat.slug || cat.name || '').toLowerCase();

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
        const escapedSlug = (cat.slug || cat.name || '').toLowerCase().replace(/'/g, "\\'");
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

    if (!appCategories || appCategories.length === 0) {
        container.innerHTML = `<div class="text-center w-100 py-5 text-muted-custom" style="color:#8a99ad; font-size:0.95rem;">No categories displayed</div>`;
        return;
    }

    const activeSlugs = (appCategories || []).map(c => (c.slug || c.name || '').toLowerCase().trim());
    const items = itemsToRender !== null ? itemsToRender : (
        activeCategory.toLowerCase() === 'all'
            ? menuItems.filter(item => activeSlugs.includes((item.category || '').toLowerCase().trim()))
            : menuItems.filter(item => (item.category || '').toLowerCase().trim() === activeCategory.toLowerCase())
    );

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
    const mType = (item.menu_type || (item.category && item.category.toLowerCase().includes('breakfast') ? 'breakfast' : 'lunch')).toLowerCase();
    let badgeHtml = '';
    if (mType === 'breakfast') {
        badgeHtml = '<span class="menu-type-badge-sm">🍳 Breakfast</span>';
    } else {
        badgeHtml = '<span class="menu-type-badge-sm lunch">🍽️ Lunch</span>';
    }

    const isFav = isFavorite(item.id);
    const favIconClass = isFav ? 'fas fa-heart text-danger' : 'far fa-heart';
    const favActiveClass = isFav ? 'active' : '';

    let oldPriceHtml = '';
    if (item.old_price && parseFloat(item.old_price) > priceVal) {
        oldPriceHtml = `<span style="text-decoration:line-through; color:#94a3b8; font-size:0.75rem; margin-right:5px;">${formatRWF(item.old_price)}</span>`;
    }

    return `
        <div class="food-card" data-dish-id="${item.id}">
            <div class="food-card-img-wrapper" style="position:relative;">
                ${badgeHtml}
                <img src="${img}" class="food-card-img" onerror="this.src='img/menu/1.jpg'" alt="${item.title}">
                <button type="button" class="food-card-btn-fav ${favActiveClass}" onclick="toggleFavorite(event, ${item.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="${favIconClass}"></i>
                </button>
                <button type="button" class="food-card-btn-add" onclick="addToCart(event, ${itemJson})" title="Add to cart">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="food-card-body">
                <div class="food-card-title">${item.title}</div>
                <div class="food-card-subtitle" title="${subStr}">${subStr}</div>
                <div class="food-card-footer">
                    <div>
                        ${oldPriceHtml}
                        <span class="food-card-price">${priceStr}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function executeSearch() {
    const input = document.getElementById('menuViewSearchInput') || document.getElementById('menuSearchInput');
    const query = input ? input.value.toLowerCase().trim() : '';

    if (!appCategories || appCategories.length === 0) {
        renderMenuGrid([]);
        return;
    }

    const activeSlugs = (appCategories || []).map(c => (c.slug || c.name || '').toLowerCase().trim());

    // If a category was deleted/disabled while active, gracefully reset to 'All'
    if (activeCategory.toLowerCase() !== 'all' && activeSlugs.length > 0 && !activeSlugs.includes(activeCategory.toLowerCase())) {
        activeCategory = 'All';
        renderMenuCategories();
    }

    const filtered = menuItems.filter(item => {
        const itemCat = (item.category || '').toLowerCase().trim();
        const itemMenuType = (item.menu_type || (itemCat.includes('breakfast') ? 'breakfast' : 'lunch')).toLowerCase().trim();

        // Must belong to an active category
        if (!activeSlugs.includes(itemCat)) {
            return false;
        }

        // 1. Menu Type Filter (Breakfast vs Lunch)
        if (appMenuType !== 'all') {
            if (itemMenuType !== appMenuType && itemMenuType !== 'all_day') {
                return false;
            }
        }

        // 2. Category Filter
        if (activeCategory.toLowerCase() !== 'all') {
            if (itemCat !== activeCategory.toLowerCase()) {
                return false;
            }
        }

        // 3. Query search
        if (query) {
            const matchesQuery = (item.title && item.title.toLowerCase().includes(query)) || 
                                 (itemCat.includes(query)) ||
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
        try { favorites = JSON.parse(favStr); } catch (e) { favorites = [7]; }
    } else {
        favorites = [7]; // Default favorite Chicken Pizza matching git view
        saveFavorites();
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('favcafe_favorites', JSON.stringify(favorites));
    } catch (e) {}
}

function isFavorite(itemId) {
    if (!itemId) return false;
    const id = parseInt(itemId);
    return favorites.some(fav => parseInt(fav) === id);
}
window.isFavorite = isFavorite;

function toggleFavorite(event, itemId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const id = parseInt(itemId);
    const idx = favorites.findIndex(fav => parseInt(fav) === id);
    let isNowFav = false;

    if (idx > -1) {
        favorites.splice(idx, 1);
        isNowFav = false;
        showToast('Removed from Favorites 💔', 'info');
    } else {
        favorites.push(id);
        isNowFav = true;
        showToast('Saved to Favorites ❤️', 'info');
    }

    saveFavorites();

    // Dynamically toggle hearts on any food cards currently in view
    document.querySelectorAll(`.food-card[data-dish-id="${id}"] .food-card-btn-fav`).forEach(btn => {
        btn.classList.toggle('active', isNowFav);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isNowFav ? 'fas fa-heart text-danger' : 'far fa-heart';
        }
        btn.title = isNowFav ? 'Remove from favorites' : 'Add to favorites';
    });
}
window.toggleFavorite = toggleFavorite;

function renderFavoriteGrid() {
    const container = document.getElementById('favoriteGrid');
    if (!container) return;

    container.innerHTML = '';
    const activeSlugs = (appCategories || []).map(c => (c.slug || c.name || '').toLowerCase().trim());
    const validItems = (appCategories && appCategories.length > 0)
        ? menuItems.filter(item => activeSlugs.includes((item.category || '').toLowerCase().trim()))
        : [];

    if (validItems.length === 0) {
        container.innerHTML = '<div class="text-center w-100 py-4 text-muted-custom" style="color:#8a99ad; font-size:0.85rem;">No favorite items available</div>';
        return;
    }

    const favItems = validItems.filter(item => isFavorite(item.id));
    const itemsToDisplay = favItems.length > 0 ? favItems : validItems.slice(0, 4);
    itemsToDisplay.forEach(item => {
        container.innerHTML += createMenuCard(item);
    });
}

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

    if (tabId === 'favorite') {
        renderOffersPromos();
        renderFavoriteGrid();
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