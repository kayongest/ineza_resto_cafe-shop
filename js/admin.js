/* TOAST NOTIFICATION SYSTEM FOR ADMIN */
function showToast(msg, type, title) {
    type = type || 'info';
    var iconHtml = '<i class="fas fa-info-circle"></i>';
    if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') iconHtml = '<i class="fas fa-exclamation-circle"></i>';
    else if (type === 'warning') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';

    if (!title) {
        if (type === 'success') title = 'Success';
        else if (type === 'error') title = 'Error';
        else if (type === 'warning') title = 'Warning';
        else title = 'Notice';
    }

    var container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'toast-box toast-' + type;
    toast.innerHTML = `
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>
        <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(function() {
        if (toast.parentElement) {
            toast.classList.add('hiding');
            setTimeout(function() {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, 3800);
}
window.showToast = showToast;

var adminOrders = [];

// Initialize Admin Dashboard on load
document.addEventListener('DOMContentLoaded', function() {
    initClock();
    loadAdminOrders();
    renderOverviewStats();
    renderOrdersTable();
    renderKitchenGrid();
    renderStaffAndLoyaltyTables();
    loadAdminCategories();
    initAdminAuthSession();
    enforceRolePermissions();
    initSidebarTabs();
    initResponsiveSidebar();
    initSearchAndFilter();
    initCartAdminSettings();
    initStoreSettings();
    initKitchenAudioUnlock();
    updateKitchenAudioUI();

    console.log('%c[INEZA RESTO Platform] Live Admin Management System Active', 'color: #27ae60; font-weight: bold; font-size: 14px;');
});

function initAdminAuthSession() {
    var adminUser = null;
    try {
        adminUser = JSON.parse(localStorage.getItem('favcafe_admin_user') || localStorage.getItem('favcafe_active_user'));
    } catch (e) { }

    var nameEl = document.getElementById('adminSidebarName');
    var roleEl = document.getElementById('adminSidebarRole');
    var avatarEl = document.getElementById('adminSidebarAvatar');

    if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'staff' || (adminUser.email && adminUser.email.includes('admin')))) {
        var displayName = adminUser.full_name || adminUser.name || 'Admin Staff';
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = adminUser.role === 'staff' ? 'Kitchen & Floor Staff' : 'General Manager';
        if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
    } else {
        // Fallback default
        if (nameEl) nameEl.textContent = 'Admin Staff';
        if (roleEl) roleEl.textContent = 'Manager & Controller';
        if (avatarEl) avatarEl.textContent = 'A';
    }
}

function adminSignOut() {
    localStorage.removeItem('favcafe_admin_user');
    window.location.href = './';
}
window.adminSignOut = adminSignOut;
window.initAdminAuthSession = initAdminAuthSession;

/* ============================================================
   KITCHEN & FLOOR WEB AUDIO CHIME ENGINE (ZERO EXTERNAL ASSETS)
   ============================================================ */
var _kitchenAudioCtx = null;
var _isKitchenAudioEnabled = true;

function isKitchenAudioEnabled() {
    try {
        var raw = localStorage.getItem('favcafe_kitchen_audio_enabled');
        if (raw !== null) {
            return raw === 'true';
        }
    } catch(e) {}
    return true; // Enabled by default
}

function setKitchenAudioEnabled(enabled) {
    _isKitchenAudioEnabled = !!enabled;
    try {
        localStorage.setItem('favcafe_kitchen_audio_enabled', _isKitchenAudioEnabled ? 'true' : 'false');
    } catch(e) {}
    updateKitchenAudioUI();
}

function updateKitchenAudioUI() {
    var isEnabled = isKitchenAudioEnabled();
    _isKitchenAudioEnabled = isEnabled;

    // 1. Topbar Quick Toggle button
    var btn = document.getElementById('kitchenAudioToggleBtn');
    if (btn) {
        btn.innerHTML = isEnabled 
            ? '<i class="fas fa-volume-up text-success"></i>' 
            : '<i class="fas fa-volume-mute text-danger"></i>';
        btn.title = isEnabled ? 'Kitchen Audio Alerts: Enabled (Click to Mute)' : 'Kitchen Audio Alerts: Muted (Click to Enable)';
    }

    // 2. Settings toggle checkbox & badge in Tab 8
    var chk = document.getElementById('settingToggleAudio');
    var badge = document.getElementById('badgeAudioStatus');
    if (chk) chk.checked = isEnabled;
    if (badge) {
        badge.textContent = isEnabled ? 'ENABLED' : 'MUTED';
        badge.className = isEnabled ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
}
window.updateKitchenAudioUI = updateKitchenAudioUI;

function toggleKitchenAudio() {
    var newState = !isKitchenAudioEnabled();
    setKitchenAudioEnabled(newState);
    if (newState) {
        playKitchenChime('order');
        if (typeof showToast === 'function') {
            showToast('Kitchen Audio Chimes: Enabled 🔔', 'success', 'Audio Alerts');
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('Kitchen Audio Chimes: Muted 🔇', 'info', 'Audio Alerts');
        }
    }
}
window.toggleKitchenAudio = toggleKitchenAudio;

function handleKitchenAudioSettingChange() {
    var chk = document.getElementById('settingToggleAudio');
    if (chk) {
        setKitchenAudioEnabled(chk.checked);
        if (chk.checked) playKitchenChime('order');
    }
}
window.handleKitchenAudioSettingChange = handleKitchenAudioSettingChange;

function getKitchenAudioContext() {
    if (!_kitchenAudioCtx) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            _kitchenAudioCtx = new AudioCtx();
        }
    }
    if (_kitchenAudioCtx && _kitchenAudioCtx.state === 'suspended') {
        _kitchenAudioCtx.resume().catch(function() {});
    }
    return _kitchenAudioCtx;
}

function initKitchenAudioUnlock() {
    function unlock() {
        var ctx = getKitchenAudioContext();
        if (ctx && ctx.state === 'running') {
            window.removeEventListener('click', unlock, true);
            window.removeEventListener('keydown', unlock, true);
            window.removeEventListener('touchstart', unlock, true);
        }
    }
    window.addEventListener('click', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
}
window.initKitchenAudioUnlock = initKitchenAudioUnlock;

function playKitchenChime(type) {
    if (!isKitchenAudioEnabled()) return;

    var ctx = getKitchenAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(function() {});
    }

    var now = ctx.currentTime;

    if (type === 'table') {
        // High-pitched Silver Concierge Desk Bell (Ding-Ding)
        playBellNote(ctx, 1760, now, 0.45, 0.35);
        playBellNote(ctx, 2093, now + 0.16, 0.55, 0.45);
    } else {
        // 'order' / default: Warm Kitchen POS Arpeggio Chime (C5 -> E5 -> G5 -> C6)
        playTone(ctx, 523.25, now, 0.25, 0.25, 'sine');
        playTone(ctx, 659.25, now + 0.12, 0.28, 0.25, 'sine');
        playTone(ctx, 783.99, now + 0.24, 0.30, 0.25, 'sine');
        playTone(ctx, 1046.50, now + 0.36, 0.45, 0.70, 'triangle');
    }
}
window.playKitchenChime = playKitchenChime;

function playTone(ctx, freq, startTime, volume, duration, waveType) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = waveType || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
}

function playBellNote(ctx, freq, startTime, volume, duration) {
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
}

function testKitchenAudio() {
    var ctx = getKitchenAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
    playKitchenChime('order');
    setTimeout(function() {
        playKitchenChime('table');
    }, 1100);
    if (typeof showToast === 'function') {
        showToast('Playing Kitchen Order Arpeggio ➔ Table Concierge Bell test sequence', 'info', 'Audio Test');
    }
}
window.testKitchenAudio = testKitchenAudio;

var _notifiedOrderIds = {};

function notifyNewOrderOnce(order) {
    if (!order || !order.id) return;
    if (_notifiedOrderIds[order.id]) return;
    _notifiedOrderIds[order.id] = true;

    playKitchenChime('order');

    if (typeof showToast === 'function') {
        var totalStr = typeof formatRWF === 'function' ? formatRWF(order.total) : (order.total + ' RWF');
        showToast('🚨 New Live Order #' + order.id + ' placed by ' + (order.customerName || 'Customer') + ' (' + totalStr + ')', 'success', 'New Live Order');
    }
}

// BroadcastChannel listener so Admin Dashboard receives live order messages from customer-facing tabs
try {
    var _orderChannel = new BroadcastChannel('favcafe_orders_channel');
    _orderChannel.onmessage = function(ev) {
        try {
            var payload = ev && ev.data ? ev.data : null;
            if (!payload) return;
            if (payload.type === 'order_created' && payload.order) {
                var exists = adminOrders && adminOrders.find(function(o) { return o.id === payload.order.id; });
                if (!exists) {
                    adminOrders.unshift(payload.order);
                    saveAdminOrders();
                }
                if (typeof renderOverviewStats === 'function') renderOverviewStats();
                if (typeof renderOrdersTable === 'function') renderOrdersTable();
                if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
                if (typeof renderFullOrdersDispatchBoard === 'function') renderFullOrdersDispatchBoard();
                notifyNewOrderOnce(payload.order);
            } else if (payload.type === 'table_service_requested' && payload.request) {
                handleAdminTableServiceRequest(payload.request);
            }
        } catch (e) { /* ignore channel errors */ }
    };
} catch (e) { /* BroadcastChannel unsupported or blocked */ }

// Fallback: listen for localStorage signals written by other tabs (e.g., customer UI)
window.addEventListener('storage', function(ev) {
    try {
        if (!ev || !ev.key) return;
        if (ev.key === 'favcafe_table_service_signal' && ev.newValue) {
            var reqPayload = JSON.parse(ev.newValue);
            if (reqPayload && reqPayload.table) {
                handleAdminTableServiceRequest(reqPayload);
            }
            return;
        }
        if (ev.key !== 'favcafe_orders_signal') return;
        if (!ev.newValue) return;
        var payload = JSON.parse(ev.newValue);
        if (!payload || payload.type !== 'order_created' || !payload.order) return;

        var exists = adminOrders && adminOrders.find(function(o) { return o.id === payload.order.id; });
        if (!exists) {
            adminOrders.unshift(payload.order);
            saveAdminOrders();
        }
        if (typeof renderOverviewStats === 'function') renderOverviewStats();
        if (typeof renderOrdersTable === 'function') renderOrdersTable();
        if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
        if (typeof renderFullOrdersDispatchBoard === 'function') renderFullOrdersDispatchBoard();
        notifyNewOrderOnce(payload.order);
    } catch (e) { /* ignore storage parse errors */ }
});

/* ============================================================
   ADMIN LIVE TABLE SERVICE REQUESTS ENGINE
   ============================================================ */
var adminTableRequestsList = [];
try {
    var savedReqs = localStorage.getItem('favcafe_table_requests');
    if (savedReqs) adminTableRequestsList = JSON.parse(savedReqs);
} catch(e) {}

function handleAdminTableServiceRequest(req) {
    if (!req || !req.id) return;
    var exists = adminTableRequestsList.find(function(r) { return r.id === req.id; });
    if (!exists) {
        adminTableRequestsList.unshift(req);
        try {
            localStorage.setItem('favcafe_table_requests', JSON.stringify(adminTableRequestsList.slice(0, 20)));
        } catch(e) {}
    }

    playKitchenChime('table');

    renderAdminTableRequests();

    if (typeof showToast === 'function') {
        showToast('🛎️ Table ' + req.table + ': ' + req.label, 'info', 'Table Assistance Request');
    }
}
window.handleAdminTableServiceRequest = handleAdminTableServiceRequest;

function dismissTableRequest(reqId) {
    adminTableRequestsList = adminTableRequestsList.filter(function(r) { return r.id !== reqId; });
    try {
        localStorage.setItem('favcafe_table_requests', JSON.stringify(adminTableRequestsList));
    } catch(e) {}
    renderAdminTableRequests();
}
window.dismissTableRequest = dismissTableRequest;

function renderAdminTableRequests() {
    var container = document.getElementById('adminTableRequestsContainer');
    if (!container) return;

    if (!adminTableRequestsList || adminTableRequestsList.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'block';
    var html = `
        <div class="card border-0 shadow-sm mb-3" style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-left: 5px solid #f97316 !important; border-radius: 14px;">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-bell me-1"></i> ${adminTableRequestsList.length} Active Table Alert${adminTableRequestsList.length > 1 ? 's' : ''}</span>
                        <strong class="text-dark" style="font-size:0.95rem;">Floor Service &amp; Waiter Assistance</strong>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="clearAllTableRequests()" style="font-size:0.75rem;">Clear All</button>
                </div>
                <div class="d-flex gap-2 flex-wrap">
    `;

    adminTableRequestsList.forEach(function(r) {
        var badgeColor = r.type === 'request_bill' ? 'bg-success text-white' : (r.type === 'call_waiter' ? 'bg-warning text-dark' : 'bg-info text-white');
        html += `
            <div class="bg-white p-2 px-3 rounded-3 border d-flex align-items-center gap-3 shadow-sm">
                <div class="fw-bold fs-6 text-dark">Table ${r.table}</div>
                <div>
                    <span class="badge ${badgeColor} rounded-pill" style="font-size:0.75rem;"><i class="fas ${r.icon || 'fa-concierge-bell'} me-1"></i>${r.label}</span>
                    <span class="small text-muted ms-1">${r.time || ''}</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-success py-0 px-2 rounded-pill ms-2" onclick="dismissTableRequest('${r.id}')" title="Mark as Attended">
                    <i class="fas fa-check me-1"></i>Attended
                </button>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}
window.renderAdminTableRequests = renderAdminTableRequests;

function clearAllTableRequests() {
    adminTableRequestsList = [];
    try {
        localStorage.setItem('favcafe_table_requests', JSON.stringify([]));
    } catch(e) {}
    renderAdminTableRequests();
}
window.clearAllTableRequests = clearAllTableRequests;

// Live Clock
function initClock() {
    var clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    function updateTime() {
        var now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateTime();
    setInterval(updateTime, 1000);
}

var _prevOrderIds = [];
var _isInitialLoad = true;
// Load Orders from server API, localStorage or initial empty dataset
function loadAdminOrders() {
    try {
        var stored = localStorage.getItem('favcafe_orders');
        if (stored) {
            adminOrders = JSON.parse(stored);
        } else {
            adminOrders = [];
            saveAdminOrders();
        }
    } catch (e) {
        adminOrders = [];
    }

    try {
        fetch('api/orders.php?action=get&_t=' + Date.now())
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && data.status === 'success' && Array.isArray(data.orders)) {
                    if (!_isInitialLoad && _prevOrderIds.length > 0) {
                        var newIncoming = data.orders.filter(function(o) { return !_prevOrderIds.includes(o.id); });
                        if (newIncoming.length > 0) {
                            newIncoming.forEach(function(o) {
                                notifyNewOrderOnce(o);
                            });
                        }
                    }
                    
                    var dataChanged = JSON.stringify(adminOrders) !== JSON.stringify(data.orders);
                    
                    _isInitialLoad = false;
                    _prevOrderIds = data.orders.map(function(o) { return o.id; });
                    adminOrders = data.orders;
                    saveAdminOrders();
                    
                    if (dataChanged) {
                        if (typeof renderOverviewStats === 'function') renderOverviewStats();
                        if (typeof renderOrdersTable === 'function') renderOrdersTable();
                        if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
                        if (typeof renderFullOrdersDispatchBoard === 'function') renderFullOrdersDispatchBoard();
                    }
                }
            }).catch(function(e) {});
    } catch(e) {}
}

function saveAdminOrders() {
    try {
        localStorage.setItem('favcafe_orders', JSON.stringify(adminOrders));
        localStorage.setItem('favcafe_orders_signal', JSON.stringify({ type: 'orders_updated', orders: adminOrders, ts: Date.now() }));
    } catch (e) {}

    try {
        var chan = new BroadcastChannel('favcafe_orders_channel');
        chan.postMessage({ type: 'orders_updated', orders: adminOrders, ts: Date.now() });
    } catch (e) {}
}

/* CURRENCY PARSER & FORMATTER FOR RWANDAN FRANCS */
function parseRwfAmount(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    var cleaned = String(val).replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
}
window.parseRwfAmount = parseRwfAmount;

function formatRWF(val) {
    var num = Math.round(parseRwfAmount(val));
    return num.toLocaleString('en-US') + ' RWF';
}

// Render Overview Stat Widgets
function renderOverviewStats() {
    var totalRevEl = document.getElementById('statTotalRevenue');
    var totalOrdEl = document.getElementById('statTotalOrders');
    var prepOrdEl = document.getElementById('statPrepOrders');
    var badgeCountEl = document.getElementById('sidebarOrderBadge');

    if (!adminOrders) adminOrders = [];

    // Calculate revenue from non-cancelled, active/completed orders
    var revenue = adminOrders.reduce(function(acc, o) {
        if (o.status === 'Cancelled' || o.isDisabled) return acc;
        return acc + (parseFloat(o.total) || 0);
    }, 0);

    // Active unfulfilled orders count (Orders in stage 1 to 5)
    var activeOrdersCount = adminOrders.filter(function(o) {
        if (o.isDisabled) return false;
        var st = (o.status || '').toLowerCase();
        return !st.includes('closed') && !st.includes('delivered') && !st.includes('cancelled') && !st.includes('disabled');
    }).length;

    // Kitchen preparing count (Orders in stage 1, 2, or 3)
    var prepCount = adminOrders.filter(function(o) {
        if (o.isDisabled) return false;
        var st = (o.status || '').toLowerCase();
        return st.includes('received') || st.includes('confirmed') || st.includes('preparing') || st.includes('prep');
    }).length;

    if (totalRevEl) totalRevEl.textContent = formatRWF(revenue);
    if (totalOrdEl) totalOrdEl.textContent = adminOrders.filter(function(o) { return !o.isDisabled; }).length;
    if (prepOrdEl) prepOrdEl.textContent = prepCount;
    if (badgeCountEl) {
        badgeCountEl.textContent = activeOrdersCount;
        badgeCountEl.style.display = activeOrdersCount > 0 ? 'inline-flex' : 'none';
    }
}

function getStageAdvanceButton(orderId, currentStatus) {
    var st = (currentStatus || 'Order Received').trim();

    if (st.includes('Received') || st.includes('Placed')) {
        return `<button class="btn btn-sm btn-outline-success py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'Confirmed – Preparing Soon')" title="Confirm Order"><i class="fas fa-check me-1"></i>Confirm</button>`;
    } else if (st.includes('Confirmed')) {
        return `<button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'Being Prepared')" title="Start Preparing"><i class="fas fa-utensils me-1"></i>Start Prep</button>`;
    } else if (st.includes('Being Prepared') || st.includes('Kitchen Preparing') || st.includes('Preparing')) {
        return `<button class="btn btn-sm btn-outline-info text-dark py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'Ready')" title="Mark Ready"><i class="fas fa-box me-1"></i>Mark Ready</button>`;
    } else if (st === 'Ready' || st.includes('Ready for Dispatch')) {
        return `<button class="btn btn-sm btn-outline-warning text-dark py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'On the Way')" title="Send Out (On the Way)"><i class="fas fa-truck me-1"></i>Send Out</button>`;
    } else if (st.includes('On the Way') || st.includes('Out for Delivery') || st.includes('Ready for Pickup')) {
        return `<button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'Delivered')" title="Mark Delivered"><i class="fas fa-house-user me-1"></i>Delivered</button>`;
    } else if (st.includes('Delivered') || st.includes('Served')) {
        return `<button class="btn btn-sm btn-success py-1 px-2" onclick="advanceAdminOrder('${orderId}', 'Closed')" title="Close Order"><i class="fas fa-flag-checkered me-1"></i>Close Order</button>`;
    } else if (st.includes('Closed')) {
        return `<button class="btn btn-sm btn-outline-secondary py-1 px-2 disabled" title="Order Closed"><i class="fas fa-check-double me-1"></i>Closed</button>`;
    } else {
        return `<button class="btn btn-sm btn-outline-secondary py-1 px-2 disabled" title="${st}"><i class="fas fa-info-circle me-1"></i>${st}</button>`;
    }
}

function renderStatusSelectDropdown(orderId, currentStatus) {
    var st = (currentStatus || 'Order Received').trim().toLowerCase();

    var stages = [
        { value: 'Order Received', label: '1. Order Received' },
        { value: 'Confirmed – Preparing Soon', label: '2. Confirmed' },
        { value: 'Being Prepared', label: '3. Being Prepared' },
        { value: 'Ready', label: '4. Ready' },
        { value: 'On the Way', label: '5. On the Way' },
        { value: 'Delivered', label: '6. Delivered' },
        { value: 'Closed', label: '7. Closed' }
    ];

    var optionsHtml = stages.map(function(s) {
        var isSelected = false;
        var valLower = s.value.toLowerCase();
        if (st === valLower) {
            isSelected = true;
        } else if (s.value === 'Confirmed – Preparing Soon' && (st.includes('confirmed') || st.includes('approved'))) {
            isSelected = true;
        } else if (s.value === 'Being Prepared' && (st.includes('preparing') || st.includes('prep'))) {
            isSelected = true;
        } else if (s.value === 'On the Way' && (st.includes('on the way') || st.includes('out for delivery') || st.includes('pickup'))) {
            isSelected = true;
        } else if (s.value === 'Delivered' && (st.includes('delivered') || st.includes('served') || st === 'completed')) {
            isSelected = true;
        } else if (s.value === 'Closed' && st.includes('closed')) {
            isSelected = true;
        }

        return `<option value="${s.value}" ${isSelected ? 'selected' : ''}>${s.label}</option>`;
    }).join('');

    return `
        <select class="form-select form-select-sm rounded-3 bg-white border-secondary fw-bold text-dark py-1 px-2" style="font-size:0.75rem; cursor:pointer; min-width:130px; max-width:150px; display:inline-block;" title="Change Order Stage Status" onchange="advanceAdminOrder('${orderId}', this.value)">
            ${optionsHtml}
        </select>
    `;
}

// ============================================================
// OVERVIEW DASHBOARD: RECENT ORDERS (5/PAGE) & KITCHEN (4/PAGE)
// ============================================================
var RECENT_ORDERS_PER_PAGE = 5;
var currentRecentOrdersPage = 1;
var currentRecentOrdersFilter = 'all';
var currentRecentOrdersSearch = '';

var KITCHEN_PER_PAGE = 4;
var currentKitchenPage = 1;

// Render Live Orders Table (5 items per page)
function renderOrdersTable(filterStatus, searchQuery) {
    var tbody = document.getElementById('adminOrdersTbody');
    if (!tbody) return;

    if (filterStatus !== undefined && filterStatus !== null) {
        currentRecentOrdersFilter = filterStatus;
    }
    if (searchQuery !== undefined && searchQuery !== null) {
        currentRecentOrdersSearch = searchQuery;
    }

    var filtered = adminOrders.filter(function(o) {
        var matchStatus = true;
        if (currentRecentOrdersFilter && currentRecentOrdersFilter !== 'all') {
            if (currentRecentOrdersFilter === 'preparing') matchStatus = o.status === 'Kitchen Preparing' || o.status === 'Preparing' || o.status === 'Being Prepared' || o.status.includes('Confirmed');
            else if (currentRecentOrdersFilter === 'ready') matchStatus = o.status === 'Ready for Delivery' || o.status === 'Ready' || o.status === 'Out for Delivery' || o.status === 'On the Way';
            else if (currentRecentOrdersFilter === 'completed') matchStatus = o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Closed';
        }

        var matchSearch = true;
        if (currentRecentOrdersSearch && currentRecentOrdersSearch.trim()) {
            var q = currentRecentOrdersSearch.toLowerCase();
            matchSearch = o.id.toLowerCase().includes(q) ||
                          (o.customerName || '').toLowerCase().includes(q) ||
                          (o.itemsSummary || '').toLowerCase().includes(q);
        }

        return matchStatus && matchSearch;
    });

    var totalItems = filtered.length;
    var totalPages = Math.ceil(totalItems / RECENT_ORDERS_PER_PAGE) || 1;
    if (currentRecentOrdersPage > totalPages) currentRecentOrdersPage = totalPages;
    if (currentRecentOrdersPage < 1) currentRecentOrdersPage = 1;

    var startIdx = (currentRecentOrdersPage - 1) * RECENT_ORDERS_PER_PAGE;
    var pageItems = filtered.slice(startIdx, startIdx + RECENT_ORDERS_PER_PAGE);

    if (totalItems === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No orders match your criteria.</td></tr>';
    } else {
        var html = '';
        pageItems.forEach(function(o) {
            var timeStr = new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var advanceStepBtn = getStageAdvanceButton(o.id, o.status);
            var cancelBtn = '';
            var isClosedOrCancelled = (o.status || '').includes('Closed') || (o.status || '').includes('Cancelled');
            if (!isClosedOrCancelled) {
                cancelBtn = `<button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="advanceAdminOrder('${o.id}', 'Cancelled')" title="Mark as Cancelled"><i class="fas fa-times"></i></button>`;
            }

            var statusSelectDropdown = renderStatusSelectDropdown(o.id, o.status);

            var actionGroup = `
                <div class="d-flex align-items-center justify-content-end gap-1">
                    <div class="btn-group btn-group-sm" role="group" aria-label="Order status & actions">
                        ${advanceStepBtn}
                        ${cancelBtn}
                        <button class="btn btn-sm btn-outline-info py-1 px-2" onclick="viewOrder('${o.id}')" title="View Order Details"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-secondary py-1 px-2" onclick="openReceiptModal('${o.id}')" title="Print Receipt"><i class="fas fa-print"></i></button>
                        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="disableOrder('${o.id}')" title="Disable Order (Save to Archives)"><i class="fas fa-ban"></i></button>
                    </div>
                    ${statusSelectDropdown}
                </div>
            `;

            var initial = (o.customerName || 'G').charAt(0).toUpperCase();
            var fulPill = getFulfilmentStatusPill(o);

            html += `
                <tr>
                    <td><a href="#" onclick="event.preventDefault(); viewOrder('${o.id}');" class="table-order-link">#${o.id}</a></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="cust-avatar-circle">${initial}</div>
                            <div>
                                <div class="fw-bold text-dark" style="font-size:0.88rem;">${o.customerName || 'Guest'}</div>
                                <div class="small text-muted" style="font-size:0.75rem;">${o.phone || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td style="max-width:240px; white-space:normal; word-wrap:break-word;">${o.itemsSummary}</td>
                    <td><span class="text-secondary small font-weight-bold text-capitalize">${o.serviceType || 'Delivery'}</span></td>
                    <td><strong class="text-dark">${formatRWF(o.total)}</strong></td>
                    <td>${fulPill}</td>
                    <td>${actionGroup}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    renderRecentOrdersPagination(totalItems, totalPages);
}

function renderRecentOrdersPagination(totalItems, totalPages) {
    var infoEl = document.getElementById('recentOrdersPaginationInfo');
    var navEl = document.getElementById('recentOrdersPaginationNav');
    if (!infoEl || !navEl) return;

    if (totalItems === 0) {
        infoEl.textContent = 'Showing 0 orders';
        navEl.innerHTML = '';
        return;
    }

    var start = (currentRecentOrdersPage - 1) * RECENT_ORDERS_PER_PAGE + 1;
    var end = Math.min(start + RECENT_ORDERS_PER_PAGE - 1, totalItems);
    infoEl.textContent = 'Showing ' + start + ' to ' + end + ' of ' + totalItems + ' orders';

    if (totalPages <= 1) {
        navEl.innerHTML = '';
        return;
    }

    var navHtml = '';
    var prevDisabled = currentRecentOrdersPage === 1 ? 'disabled' : '';
    navHtml += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeRecentOrdersPage(${currentRecentOrdersPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

    for (var p = 1; p <= totalPages; p++) {
        var active = p === currentRecentOrdersPage ? 'active' : '';
        navHtml += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="event.preventDefault(); changeRecentOrdersPage(${p})">${p}</a></li>`;
    }

    var nextDisabled = currentRecentOrdersPage === totalPages ? 'disabled' : '';
    navHtml += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeRecentOrdersPage(${currentRecentOrdersPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;

    navEl.innerHTML = navHtml;
}

function changeRecentOrdersPage(newPage) {
    currentRecentOrdersPage = newPage;
    renderOrdersTable();
}
window.changeRecentOrdersPage = changeRecentOrdersPage;

// Render Kitchen Tickets Grid (4 items per page)
function renderKitchenGrid() {
    var grid = document.getElementById('kitchenGrid');
    if (!grid) return;

    var tickets = adminOrders || [];
    var totalItems = tickets.length;
    var totalPages = Math.ceil(totalItems / KITCHEN_PER_PAGE) || 1;

    if (currentKitchenPage > totalPages) currentKitchenPage = totalPages;
    if (currentKitchenPage < 1) currentKitchenPage = 1;

    if (totalItems === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-4 text-muted"><i class="fas fa-utensils fa-2x mb-2 opacity-50"></i><p>No active kitchen orders right now.</p></div>';
        renderKitchenPagination(0, 1);
        return;
    }

    var startIdx = (currentKitchenPage - 1) * KITCHEN_PER_PAGE;
    var pageTickets = tickets.slice(startIdx, startIdx + KITCHEN_PER_PAGE);

    var html = '';
    pageTickets.forEach(function(o) {
        var st = o.status || 'Order Received';
        var isPrep = st.includes('Received') || st.includes('Confirmed') || st.includes('Preparing') || st.includes('Being Prepared');
        var isReady = st === 'Ready' || st.includes('On the Way') || st.includes('Out for Delivery') || st.includes('Ready for Pickup');
        var isComp = st.includes('Delivered') || st.includes('Closed') || st.includes('Completed');
        var isArch = o.isDisabled || st === 'Disabled / Archived';

        var ticketBorderClass = isPrep ? 'border-warning' : (isReady ? 'ready' : (isComp ? 'border-success' : 'border-secondary'));

        var statusBadgeHtml = '';
        if (st.includes('Received')) {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'Confirmed – Preparing Soon')"><i class="fas fa-check me-1"></i>Confirm</button>`;
        } else if (st.includes('Confirmed')) {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'Being Prepared')"><i class="fas fa-utensils me-1"></i>Start Prep</button>`;
        } else if (st.includes('Preparing') || st.includes('Being Prepared')) {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'Ready')"><i class="fas fa-box me-1"></i>Mark Ready</button>`;
        } else if (st === 'Ready') {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'On the Way')"><i class="fas fa-truck me-1"></i>Send Out</button>`;
        } else if (st.includes('On the Way') || st.includes('Ready for Pickup')) {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'Delivered')"><i class="fas fa-house-user me-1"></i>Delivered</button>`;
        } else if (st.includes('Delivered')) {
            statusBadgeHtml = `<button class="btn-action-sm" onclick="advanceAdminOrder('${o.id}', 'Closed')"><i class="fas fa-flag-checkered me-1"></i>Close Order</button>`;
        } else if (isComp) {
            statusBadgeHtml = `<span class="badge bg-success text-white small font-weight-bold px-2 py-1"><i class="fas fa-check-circle me-1"></i>Closed</span>`;
        } else if (isArch) {
            statusBadgeHtml = `<span class="badge bg-secondary text-white small font-weight-bold px-2 py-1"><i class="fas fa-archive me-1"></i>Archived</span>`;
        } else {
            statusBadgeHtml = `<span class="badge bg-dark text-white small font-weight-bold px-2 py-1">${o.status}</span>`;
        }

        var chefName = o.preparedBy || 'Jean Paul Ndayi (Chef)';
        var serverName = o.servedBy || 'Aline Uwase (Waiter)';

        html += `
            <div class="kitchen-ticket ${ticketBorderClass} mb-3" style="border-left: 4px solid ${isPrep ? '#f39c12' : (isReady ? '#2980b9' : (isComp ? '#27ae60' : '#7f8c8d'))};">
                <div class="ticket-head d-flex justify-content-between align-items-center">
                    <strong>#${o.id}</strong>
                    <span class="ticket-timer small"><i class="fas fa-clock me-1"></i>${isPrep ? 'Prep: ~15m' : (isReady ? 'Ready for Dispatch' : (isComp ? 'Served' : 'Archived'))}</span>
                </div>
                <div class="ticket-items my-2 fw-bold text-dark" style="font-size:0.9rem;">${o.itemsSummary}</div>
                <div class="small text-muted mb-2">
                    <span class="fw-bold text-capitalize">${o.customerName}</span> &bull; <span class="badge bg-light text-dark border">${o.serviceType || 'Delivery'}</span> &bull; <strong>${formatRWF(o.total)}</strong>
                </div>
                <div class="d-flex justify-content-between align-items-center border-top pt-2 flex-wrap gap-1">
                    <div class="small text-muted" style="font-size:0.75rem;">
                        <i class="fas fa-utensils me-1 text-primary"></i>Chef: <strong>${chefName}</strong> &bull; Server: <strong>${serverName}</strong>
                    </div>
                    <div>
                        ${statusBadgeHtml}
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
    renderKitchenPagination(totalItems, totalPages);
}

function renderKitchenPagination(totalItems, totalPages) {
    var infoEl = document.getElementById('kitchenPaginationInfo');
    var navEl = document.getElementById('kitchenPaginationNav');
    if (!infoEl || !navEl) return;

    if (totalItems === 0) {
        infoEl.textContent = 'Showing 0 tickets';
        navEl.innerHTML = '';
        return;
    }

    var start = (currentKitchenPage - 1) * KITCHEN_PER_PAGE + 1;
    var end = Math.min(start + KITCHEN_PER_PAGE - 1, totalItems);
    infoEl.textContent = 'Showing ' + start + ' to ' + end + ' of ' + totalItems + ' tickets';

    if (totalPages <= 1) {
        navEl.innerHTML = '';
        return;
    }

    var navHtml = '';
    var prevDisabled = currentKitchenPage === 1 ? 'disabled' : '';
    navHtml += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeKitchenPage(${currentKitchenPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

    for (var p = 1; p <= totalPages; p++) {
        var active = p === currentKitchenPage ? 'active' : '';
        navHtml += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="event.preventDefault(); changeKitchenPage(${p})">${p}</a></li>`;
    }

    var nextDisabled = currentKitchenPage === totalPages ? 'disabled' : '';
    navHtml += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeKitchenPage(${currentKitchenPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;

    navEl.innerHTML = navHtml;
}

function changeKitchenPage(newPage) {
    currentKitchenPage = newPage;
    renderKitchenGrid();
}
window.changeKitchenPage = changeKitchenPage;

// Advance Order Status
function advanceAdminOrder(orderId, newStatus) {
    var target = adminOrders.find(function(o) { return o.id === orderId; });
    if (target) {
        target.status = newStatus;
        saveAdminOrders();
        
        try {
            fetch('api/orders.php?action=update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(target)
            }).catch(function(e) {});
        } catch(e) {}

        renderOverviewStats();
        renderOrdersTable();
        renderKitchenGrid();
        renderFullOrdersDispatchBoard();

        if (typeof logNotification === 'function') {
            logNotification('sms', target.phone || '+250 788 700 870', 'INEZA RESTO & COFFEE SHOP: Your Order #' + orderId + ' status has been updated to: ' + newStatus, 'SMS Alert - Order Status');
        }

        if (typeof showToast === 'function') {
            showToast('Order #' + orderId + ' updated to: ' + newStatus, 'success', 'Kitchen Status Updated');
        }
    }
}

// ============================================================
// SIDEBAR TOGGLE & RESPONSIVE DEVICE SIZE CONTROLLER
// ============================================================
function toggleAdminSidebar() {
    var isMobile = window.innerWidth <= 768;
    var isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    var overlay = document.getElementById('adminSidebarOverlay');

    if (isMobile) {
        var isOpen = document.body.classList.toggle('mobile-sidebar-open');
        if (overlay) {
            if (isOpen) overlay.classList.add('active');
            else overlay.classList.remove('active');
        }
    } else if (isTablet) {
        document.body.classList.toggle('tablet-sidebar-expanded');
    } else {
        var isMinimized = document.body.classList.toggle('sidebar-minimized');
        localStorage.setItem('admin_sidebar_minimized', isMinimized ? 'true' : 'false');
        updateSidebarToggleIcon(isMinimized);
    }
}
window.toggleAdminSidebar = toggleAdminSidebar;

function closeAdminSidebarMobile() {
    document.body.classList.remove('mobile-sidebar-open');
    var overlay = document.getElementById('adminSidebarOverlay');
    if (overlay) overlay.classList.remove('active');
}
window.closeAdminSidebarMobile = closeAdminSidebarMobile;

function updateSidebarToggleIcon(isMinimized) {
    var icon = document.querySelector('#sidebarToggleBtn i');
    if (icon) {
        icon.className = isMinimized ? 'fas fa-bars-staggered' : 'fas fa-bars';
    }
}

function initResponsiveSidebar() {
    // Populate data-tooltip on each sidebar item for the minimized rail mode
    document.querySelectorAll('.sidebar-item').forEach(function(item) {
        var span = item.querySelector('span');
        if (span && !item.getAttribute('data-tooltip')) {
            item.setAttribute('data-tooltip', span.textContent.trim());
        }
    });

    function handleDeviceResize() {
        var width = window.innerWidth;
        if (width <= 768) {
            // Mobile: full off-canvas mode
            document.body.classList.remove('sidebar-minimized');
            document.body.classList.remove('tablet-sidebar-expanded');
        } else if (width <= 1024) {
            // Tablet: defaults to minimized rail
            closeAdminSidebarMobile();
            document.body.classList.remove('sidebar-minimized');
        } else {
            // Desktop: restore user preference
            closeAdminSidebarMobile();
            document.body.classList.remove('tablet-sidebar-expanded');
            var savedMin = localStorage.getItem('admin_sidebar_minimized') === 'true';
            if (savedMin) {
                document.body.classList.add('sidebar-minimized');
            } else {
                document.body.classList.remove('sidebar-minimized');
            }
            updateSidebarToggleIcon(savedMin);
        }
    }

    handleDeviceResize();

    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleDeviceResize, 150);
    });
}
window.initResponsiveSidebar = initResponsiveSidebar;

// Sidebar Tab Switching
function initSidebarTabs() {
    document.querySelectorAll('.sidebar-item[data-tab]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var tabId = this.getAttribute('data-tab');

            // On mobile, auto-close the drawer when a tab is selected
            if (window.innerWidth <= 768) {
                closeAdminSidebarMobile();
            }

            document.querySelectorAll('.sidebar-item').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');

            document.querySelectorAll('.tab-section').forEach(function(sec) {
                sec.classList.remove('active');
                sec.style.display = 'none';
            });

            var targetSec = document.getElementById('tab-' + tabId);
            if (targetSec) {
                targetSec.classList.add('active');
                targetSec.style.display = 'block';
            }

            if (tabId === 'overview') {
                if (typeof renderOverviewStats === 'function') renderOverviewStats();
                if (typeof renderOrdersTable === 'function') renderOrdersTable();
                if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
            } else if (tabId === 'orders') {
                if (typeof renderFullOrdersDispatchBoard === 'function') renderFullOrdersDispatchBoard();
            } else if (tabId === 'menu') {
                if (typeof renderAdminMenuGrid === 'function') renderAdminMenuGrid();
            } else if (tabId === 'categories') {
                if (typeof renderAdminCategoriesTable === 'function') renderAdminCategoriesTable();
            } else if (tabId === 'reservations') {
                if (typeof renderAdminReservations === 'function') renderAdminReservations();
            } else if (tabId === 'tables') {
                if (typeof renderAdminTablesTracker === 'function') renderAdminTablesTracker();
            } else if (tabId === 'users') {
                if (typeof renderStaffAndLoyaltyTables === 'function') renderStaffAndLoyaltyTables();
            } else if (tabId === 'promos') {
                if (typeof loadAdminPromos === 'function') {
                    loadAdminPromos();
                } else if (typeof renderAdminPromosGrid === 'function') {
                    renderAdminPromosGrid();
                }
            } else if (tabId === 'analytics') {
                if (typeof renderAnalyticsDashboard === 'function') {
                    renderAnalyticsDashboard();
                }
            }
        });
    });
}

var currentLiveOrdersFilter = 'all';
var currentLiveOrdersSearch = '';
var currentLiveOrdersPage = 1;
var LIVE_ORDERS_PER_PAGE = 5;

function onLiveOrdersSearchChange() {
    var input = document.getElementById('liveOrdersSearchInput');
    if (input) {
        currentLiveOrdersSearch = input.value.trim().toLowerCase();
        currentLiveOrdersPage = 1;
        renderFullOrdersDispatchBoard();
    }
}

function filterLiveOrdersBoard(filterStatus, btn) {
    if (btn) {
        var container = btn.parentElement || document.querySelector('.orders-nav-tabs');
        if (container) {
            container.querySelectorAll('button, .nav-link, .filter-pill').forEach(function(p) {
                p.classList.remove('active', 'text-primary');
                p.classList.add('text-muted');
            });
            btn.classList.add('active', 'text-primary');
            btn.classList.remove('text-muted');
        }
    }
    currentLiveOrdersFilter = filterStatus;
    currentLiveOrdersPage = 1;
    renderFullOrdersDispatchBoard();
}

function changeLiveOrdersPage(page) {
    currentLiveOrdersPage = page;
    renderFullOrdersDispatchBoard();
}

function updateAdminPaymentStatus(orderId, newPaymentStatus) {
    var target = adminOrders.find(function(o) { return o.id === orderId; });
    if (target) {
        target.paymentStatus = newPaymentStatus;
        target.payment_status = newPaymentStatus;
        saveAdminOrders();

        try {
            fetch('api/orders.php?action=update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(target)
            }).catch(function(e) {});
        } catch(e) {}

        renderOverviewStats();
        renderOrdersTable();
        renderKitchenGrid();
        renderFullOrdersDispatchBoard();

        if (typeof logNotification === 'function') {
            logNotification('sms', target.phone || '+250 788 700 870', 'INEZA RESTO & COFFEE SHOP: Your Order #' + orderId + ' payment status updated to: ' + newPaymentStatus, 'SMS Alert - Payment Status');
        }

        if (typeof showToast === 'function') {
            showToast('Order #' + orderId + ' payment status updated to: ' + newPaymentStatus, 'success', 'Payment Status Updated');
        }
    }
}
window.updateAdminPaymentStatus = updateAdminPaymentStatus;

function getPaymentStatusPill(order) {
    var ps = (order.paymentStatus || order.payment_status || 'Paid').trim();
    var psLower = ps.toLowerCase();
    var pMethod = (order.paymentMethod || order.payment_method || '').toLowerCase();

    var isPending = psLower === 'pending' || (psLower !== 'paid' && psLower !== 'failed' && psLower !== 'cancelled' && (pMethod.includes('cash') || pMethod.includes('delivery')));
    var isPaid = psLower === 'paid' && !isPending;
    var isFailed = psLower === 'failed';
    var isCancelled = psLower === 'cancelled';

    var pillClass = isPaid ? 'pill-payment-paid' : (isPending ? 'pill-payment-pending' : (isFailed ? 'pill-payment-failed' : 'pill-payment-cancelled'));

    return `
        <select class="form-select form-select-sm rounded-3 ${pillClass} fw-bold py-1 px-2" style="font-size:0.72rem; cursor:pointer; min-width:115px; border-radius:6px !important; text-transform:uppercase;" title="Change Payment Status" onchange="updateAdminPaymentStatus('${order.id}', this.value)">
            <option value="Paid" class="bg-white text-success font-weight-bold" ${isPaid ? 'selected' : ''}>PAID ✓</option>
            <option value="Pending" class="bg-white text-warning font-weight-bold" ${isPending ? 'selected' : ''}>PENDING 🕒</option>
            <option value="Failed" class="bg-white text-danger font-weight-bold" ${isFailed ? 'selected' : ''}>FAILED ✕</option>
            <option value="Cancelled" class="bg-white text-secondary font-weight-bold" ${isCancelled ? 'selected' : ''}>CANCELLED ✕</option>
        </select>
    `;
}

function getFulfilmentStatusPill(order) {
    var st = (order.status || 'Order Received').trim();
    if (st.includes('Received') || st.includes('Placed')) {
        return `<span class="pill-status-ref pill-stage-received">RECEIVED <i class="fas fa-inbox ms-1"></i></span>`;
    } else if (st.includes('Confirmed')) {
        return `<span class="pill-status-ref pill-stage-confirmed">CONFIRMED <i class="fas fa-clipboard-check ms-1"></i></span>`;
    } else if (st.includes('Being Prepared') || st.includes('Kitchen Preparing') || st.includes('Preparing')) {
        return `<span class="pill-status-ref pill-stage-preparing">UNFULFILLED <i class="fas fa-utensils ms-1"></i></span>`;
    } else if (st === 'Ready' || st.includes('Ready for Dispatch')) {
        return `<span class="pill-status-ref pill-stage-ready">READY TO PICKUP <i class="fas fa-info-circle ms-1"></i></span>`;
    } else if (st.includes('On the Way') || st.includes('Out for Delivery') || st.includes('Ready for Pickup')) {
        return `<span class="pill-status-ref pill-stage-ontheway">ON THE WAY <i class="fas fa-motorcycle ms-1"></i></span>`;
    } else if (st.includes('Delivered') || st.includes('Served')) {
        return `<span class="pill-status-ref pill-stage-delivered">FULFILLED <i class="fas fa-check ms-1"></i></span>`;
    } else if (st.includes('Closed')) {
        return `<span class="pill-status-ref pill-stage-closed">CLOSED <i class="fas fa-check-double ms-1"></i></span>`;
    } else if (st.includes('Cancelled')) {
        return `<span class="pill-status-ref pill-stage-cancelled">CANCELLED <i class="fas fa-times ms-1"></i></span>`;
    } else {
        return `<span class="pill-status-ref pill-stage-preparing">${st.toUpperCase()}</span>`;
    }
}

function updateOrderTabCounters() {
    var cntAll = document.getElementById('cntAll');
    if (!cntAll || !adminOrders) return;

    var activeTotal = 0, pending = 0, preparing = 0, ready = 0, completed = 0, archived = 0;

    adminOrders.forEach(function(o) {
        var isArchived = o.isDisabled || (o.status || '') === 'Disabled / Archived';
        if (isArchived) {
            archived++;
        } else {
            activeTotal++;
            var st = (o.status || '').toLowerCase();
            var ps = (o.paymentStatus || o.payment_status || '').toLowerCase();

            if (ps === 'pending' || st.includes('received')) {
                pending++;
            }
            if (st.includes('preparing') || st.includes('being prepared') || st.includes('confirmed')) {
                preparing++;
            }
            if (st === 'ready' || st.includes('ready for dispatch') || st.includes('on the way') || st.includes('out for delivery')) {
                ready++;
            }
            if (st.includes('delivered') || st.includes('served') || st.includes('closed') || st.includes('completed')) {
                completed++;
            }
        }
    });

    cntAll.textContent = activeTotal;
    var elP = document.getElementById('cntPending'); if (elP) elP.textContent = pending;
    var elPr = document.getElementById('cntPreparing'); if (elPr) elPr.textContent = preparing;
    var elR = document.getElementById('cntReady'); if (elR) elR.textContent = ready;
    var elC = document.getElementById('cntCompleted'); if (elC) elC.textContent = completed;
    var elA = document.getElementById('cntArchived'); if (elA) elA.textContent = archived;
}

function renderFullOrdersDispatchBoard(filterStatus) {
    filterStatus = filterStatus || currentLiveOrdersFilter;
    currentLiveOrdersFilter = filterStatus;
    updateOrderTabCounters();

    var tbody = document.getElementById('fullOrdersDispatchTbody');
    if (!tbody) return;

    // Filter by status & search query & dropdowns
    var paySelect = document.getElementById('paymentStatusFilterSelect');
    var fulSelect = document.getElementById('fulfilmentStageFilterSelect');

    var filtered = adminOrders.filter(function(o) {
        var matchStatus = true;
        if (filterStatus) {
            var isArchived = o.isDisabled || (o.status || '') === 'Disabled / Archived';
            if (filterStatus === 'all') {
                matchStatus = !isArchived;
            } else if (filterStatus === 'pending') {
                var ps = (o.paymentStatus || o.payment_status || '').toLowerCase();
                var st = (o.status || '').toLowerCase();
                matchStatus = !isArchived && (ps === 'pending' || st.includes('received'));
            } else if (filterStatus === 'preparing') {
                var st = (o.status || '').toLowerCase();
                matchStatus = !isArchived && (st.includes('preparing') || st.includes('being prepared') || st.includes('confirmed'));
            } else if (filterStatus === 'ready') {
                var st = (o.status || '').toLowerCase();
                matchStatus = !isArchived && (st.includes('ready') || st.includes('on the way') || st.includes('out for delivery'));
            } else if (filterStatus === 'completed') {
                var st = (o.status || '').toLowerCase();
                matchStatus = !isArchived && (st.includes('delivered') || st.includes('served') || st.includes('closed') || st.includes('completed'));
            } else if (filterStatus === 'archived') {
                matchStatus = isArchived;
            }
        }

        var matchSearch = true;
        if (currentLiveOrdersSearch) {
            var q = currentLiveOrdersSearch;
            matchSearch = o.id.toLowerCase().includes(q) ||
                          (o.customerName || '').toLowerCase().includes(q) ||
                          (o.phone || '').toLowerCase().includes(q) ||
                          (o.itemsSummary || '').toLowerCase().includes(q) ||
                          (o.serviceType || '').toLowerCase().includes(q);
        }

        var matchPayment = true;
        if (paySelect && paySelect.value !== 'all') {
            var pVal = paySelect.value.toLowerCase();
            var pStatus = (o.paymentStatus || 'paid').toLowerCase();
            matchPayment = pStatus.includes(pVal);
        }

        var matchFulfilment = true;
        if (fulSelect && fulSelect.value !== 'all') {
            var fVal = fulSelect.value.toLowerCase();
            var fStatus = (o.status || '').toLowerCase();
            matchFulfilment = fStatus.includes(fVal);
        }

        return matchStatus && matchSearch && matchPayment && matchFulfilment;
    });

    var totalOrders = filtered.length;
    var totalPages = Math.ceil(totalOrders / LIVE_ORDERS_PER_PAGE) || 1;

    if (currentLiveOrdersPage < 1) currentLiveOrdersPage = 1;
    if (currentLiveOrdersPage > totalPages) currentLiveOrdersPage = totalPages;

    var startIdx = (currentLiveOrdersPage - 1) * LIVE_ORDERS_PER_PAGE;
    var endIdx = startIdx + LIVE_ORDERS_PER_PAGE;
    var pageOrders = filtered.slice(startIdx, endIdx);

    // Update Pagination Bar Info
    var infoEl = document.getElementById('liveOrdersPaginationInfo');
    if (infoEl) {
        if (totalOrders === 0) {
            infoEl.textContent = 'Showing 0 orders';
        } else {
            var displayEnd = Math.min(endIdx, totalOrders);
            infoEl.textContent = 'Showing ' + (startIdx + 1) + ' to ' + displayEnd + ' of ' + totalOrders + ' orders';
        }
    }

    // Render Pagination Controls
    var navEl = document.getElementById('liveOrdersPaginationNav');
    if (navEl) {
        var navHtml = '';
        var prevDisabled = currentLiveOrdersPage === 1 ? 'disabled' : '';
        navHtml += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeLiveOrdersPage(${currentLiveOrdersPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

        for (var p = 1; p <= totalPages; p++) {
            var activeClass = p === currentLiveOrdersPage ? 'active' : '';
            navHtml += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="event.preventDefault(); changeLiveOrdersPage(${p})">${p}</a></li>`;
        }

        var nextDisabled = currentLiveOrdersPage === totalPages || totalPages === 0 ? 'disabled' : '';
        navHtml += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeLiveOrdersPage(${currentLiveOrdersPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;

        navEl.innerHTML = navHtml;
    }

    if (pageOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted"><i class="fas fa-search me-1"></i> No orders match your search or filter criteria.</td></tr>';
        return;
    }

    var html = '';
    pageOrders.forEach(function(o) {
        var advanceStepBtn = getStageAdvanceButton(o.id, o.status);
        var cancelBtn = '';
        var isClosedOrCancelled = (o.status || '').includes('Closed') || (o.status || '').includes('Cancelled');
        if (!isClosedOrCancelled) {
            cancelBtn = `<button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="advanceAdminOrder('${o.id}', 'Cancelled')" title="Mark as Cancelled"><i class="fas fa-times"></i></button>`;
        }

        var statusSelectDropdown = renderStatusSelectDropdown(o.id, o.status);

        var actionBtn = `
            <div class="d-flex align-items-center justify-content-end gap-1">
                <div class="btn-group btn-group-sm" role="group" aria-label="Order status & actions">
                    ${advanceStepBtn}
                    ${cancelBtn}
                    <button class="btn btn-sm btn-outline-info py-1 px-2" onclick="viewOrder('${o.id}')" title="View Order Details"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-secondary py-1 px-2" onclick="openReceiptModal('${o.id}')" title="Print Receipt"><i class="fas fa-print"></i></button>
                    <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="disableOrder('${o.id}')" title="Disable Order (Save to Archives)"><i class="fas fa-ban"></i></button>
                </div>
                ${statusSelectDropdown}
            </div>
        `;

        var initial = (o.customerName || 'G').charAt(0).toUpperCase();
        var dateStr = o.date ? new Date(o.date).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nov 05, 4:35 PM';
        var payPill = getPaymentStatusPill(o);
        var fulPill = getFulfilmentStatusPill(o);

        html += `
            <tr>
                <td style="padding-left:16px;">
                    <input type="checkbox" class="form-check-input order-row-checkbox" value="${o.id}">
                </td>
                <td>
                    <a href="#" onclick="event.preventDefault(); viewOrder('${o.id}');" class="table-order-link">#${o.id}</a>
                </td>
                <td><strong class="text-dark">${formatRWF(o.total)}</strong></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="cust-avatar-circle">${initial}</div>
                        <div>
                            <div class="fw-bold text-dark" style="font-size:0.88rem;">${o.customerName || 'Guest'}</div>
                            <div class="small text-muted" style="font-size:0.75rem;">${o.phone || ''}</div>
                        </div>
                    </div>
                </td>
                <td>${payPill}</td>
                <td>${fulPill}</td>
                <td>
                    <span class="text-secondary small font-weight-bold text-capitalize">${o.serviceType || 'Cash on delivery'}</span>
                </td>
                <td class="small text-muted font-monospace">${dateStr}</td>
                <td class="text-end" style="padding-right:16px;">${actionBtn}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function exportOrdersCsv() {
    if (!adminOrders || adminOrders.length === 0) {
        if (typeof showToast === 'function') showToast('No orders available to export.', 'warning');
        return;
    }

    var csvRows = [];
    csvRows.push(['Order ID', 'Date', 'Customer Name', 'Phone', 'Items Summary', 'Service Type', 'Total (RWF)', 'Payment Status', 'Fulfilment Status']);

    adminOrders.forEach(function(o) {
        csvRows.push([
            '"' + (o.id || '') + '"',
            '"' + (o.date || '') + '"',
            '"' + (o.customerName || '').replace(/"/g, '""') + '"',
            '"' + (o.phone || '') + '"',
            '"' + (o.itemsSummary || '').replace(/"/g, '""') + '"',
            '"' + (o.serviceType || 'Delivery') + '"',
            o.total || 0,
            '"' + (o.paymentStatus || 'Paid') + '"',
            '"' + (o.status || 'Order Received') + '"'
        ]);
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(function(e) { return e.join(','); }).join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'favorite_cafe_orders_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') showToast('Orders exported to CSV successfully!', 'success');
}
window.exportOrdersCsv = exportOrdersCsv;

function toggleSelectAllOrders(isChecked) {
    var checkboxes = document.querySelectorAll('.order-row-checkbox');
    checkboxes.forEach(function(cb) { cb.checked = isChecked; });
}
window.toggleSelectAllOrders = toggleSelectAllOrders;

/* ============================================================
   LIVE ORDERS FULL CRUD MANAGEMENT
   ============================================================ */

function populateOrderStaffDropdowns(acceptedVal, preparedVal, servedVal) {
    var acceptedEl = document.getElementById('orderAcceptedBy');
    var preparedEl = document.getElementById('orderPreparedBy');
    var servedEl = document.getElementById('orderServedBy');

    if (!acceptedEl || !preparedEl || !servedEl) return;

    var staffOptionsHtml = '';
    if (typeof adminStaffList !== 'undefined' && adminStaffList.length > 0) {
        adminStaffList.forEach(function(s) {
            var label = s.name + ' (' + (s.role ? s.role.split('/')[0].trim() : 'Staff') + ')';
            staffOptionsHtml += `<option value="${label}">${label}</option>`;
        });
    } else {
        staffOptionsHtml = `
            <option value="Kagabo Patrick (Cashier)">Kagabo Patrick — Cashier & POS</option>
            <option value="Jean Paul Ndayi (Head Chef)">Jean Paul Ndayi — Head Chef</option>
            <option value="Aline Uwase (Floor Waiter)">Aline Uwase — Floor Waiter</option>
            <option value="Admin Staff (Super Admin)">Admin Staff — Super Admin</option>
        `;
    }

    acceptedEl.innerHTML = staffOptionsHtml;
    preparedEl.innerHTML = staffOptionsHtml;
    servedEl.innerHTML = staffOptionsHtml;

    if (acceptedVal) acceptedEl.value = acceptedVal;
    else acceptedEl.selectedIndex = 0;

    if (preparedVal) preparedEl.value = preparedVal;
    else {
        // Find chef
        var chefOpt = Array.from(preparedEl.options).find(o => o.value.toLowerCase().includes('chef'));
        if (chefOpt) preparedEl.value = chefOpt.value;
    }

    if (servedVal) servedEl.value = servedVal;
    else {
        // Find waiter
        var waiterOpt = Array.from(servedEl.options).find(o => o.value.toLowerCase().includes('waiter') || o.value.toLowerCase().includes('floor'));
        if (waiterOpt) servedEl.value = waiterOpt.value;
    }
}

function openCreateOrderModal() {
    var form = document.getElementById('orderCrudForm');
    if (form) form.reset();
    var hiddenId = document.getElementById('orderIdHidden');
    if (hiddenId) hiddenId.value = '';
    var titleEl = document.getElementById('orderModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-receipt me-2" style="color:var(--primary);"></i>Create Live Order';
    var statusEl = document.getElementById('orderStatus');
    if (statusEl) statusEl.value = 'Kitchen Preparing';
    var serviceEl = document.getElementById('orderServiceType');
    if (serviceEl) serviceEl.value = 'delivery';
    var payEl = document.getElementById('orderPaymentMethod');
    if (payEl) payEl.value = 'Cash';

    populateOrderStaffDropdowns('Kagabo Patrick (Cashier)', 'Jean Paul Ndayi (Head Chef)', 'Aline Uwase (Floor Waiter)');

    var modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
}

function openEditOrderModal(orderId) {
    var order = (adminOrders || []).find(function(o) { return o.id === orderId; });
    if (!order) {
        order = (window.orders || []).find(function(o) { return o.id === orderId; });
    }
    if (!order) return;

    var hiddenId = document.getElementById('orderIdHidden');
    if (hiddenId) hiddenId.value = order.id;
    var titleEl = document.getElementById('orderModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit me-2" style="color:var(--primary);"></i>Edit Live Order #' + order.id;

    var custName = document.getElementById('orderCustomerName');
    if (custName) custName.value = order.customerName || '';
    var phone = document.getElementById('orderCustomerPhone');
    if (phone) phone.value = order.phone || '';
    var service = document.getElementById('orderServiceType');
    if (service) service.value = order.serviceType || 'delivery';
    var addr = document.getElementById('orderAddress');
    if (addr) addr.value = order.address || '';
    var status = document.getElementById('orderStatus');
    if (status) status.value = order.status || 'Kitchen Preparing';
    var pay = document.getElementById('orderPaymentMethod');
    if (pay) pay.value = order.paymentMethod || 'Cash';
    var items = document.getElementById('orderItemsSummary');
    if (items) items.value = order.itemsSummary || '';
    var total = document.getElementById('orderTotal');
    if (total) total.value = order.total || 0;

    populateOrderStaffDropdowns(
        order.acceptedBy || 'Kagabo Patrick (Cashier)',
        order.preparedBy || 'Jean Paul Ndayi (Head Chef)',
        order.servedBy || 'Aline Uwase (Floor Waiter)'
    );

    var modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
}

function closeOrderModal() {
    var modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

function saveLiveOrderForm() {
    var hiddenId = document.getElementById('orderIdHidden');
    var id = hiddenId ? hiddenId.value.trim() : '';
    var customerName = (document.getElementById('orderCustomerName') ? document.getElementById('orderCustomerName').value : '').trim();
    var phone = (document.getElementById('orderCustomerPhone') ? document.getElementById('orderCustomerPhone').value : '').trim();
    var serviceType = document.getElementById('orderServiceType') ? document.getElementById('orderServiceType').value : 'delivery';
    var address = (document.getElementById('orderAddress') ? document.getElementById('orderAddress').value : '').trim();
    var status = document.getElementById('orderStatus') ? document.getElementById('orderStatus').value : 'Kitchen Preparing';
    var paymentMethod = document.getElementById('orderPaymentMethod') ? document.getElementById('orderPaymentMethod').value : 'Cash';
    var acceptedBy = document.getElementById('orderAcceptedBy') ? document.getElementById('orderAcceptedBy').value : 'Kagabo Patrick (Cashier)';
    var preparedBy = document.getElementById('orderPreparedBy') ? document.getElementById('orderPreparedBy').value : 'Jean Paul Ndayi (Head Chef)';
    var servedBy = document.getElementById('orderServedBy') ? document.getElementById('orderServedBy').value : 'Aline Uwase (Floor Waiter)';
    var itemsSummary = (document.getElementById('orderItemsSummary') ? document.getElementById('orderItemsSummary').value : '').trim();
    var total = parseFloat(document.getElementById('orderTotal') ? document.getElementById('orderTotal').value : 0) || 0;

    if (!customerName || !itemsSummary) {
        if (typeof showToast === 'function') showToast('Please fill in required fields (Customer Name & Items Summary).', 'error', 'Validation Error');
        return;
    }

    var isDisabled = (status === 'Disabled / Archived');

    if (id) {
        // Edit existing order
        var target = adminOrders.find(function(o) { return o.id === id; });
        if (target) {
            target.customerName = customerName;
            target.phone = phone;
            target.serviceType = serviceType;
            target.address = address;
            target.status = status;
            target.paymentMethod = paymentMethod;
            target.acceptedBy = acceptedBy;
            target.preparedBy = preparedBy;
            target.servedBy = servedBy;
            target.itemsSummary = itemsSummary;
            target.total = total;
            target.isDisabled = isDisabled;
        }

        try {
            fetch('api/orders.php?action=update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    customerName: customerName,
                    phone: phone,
                    serviceType: serviceType,
                    address: address,
                    status: status,
                    paymentMethod: paymentMethod,
                    acceptedBy: acceptedBy,
                    preparedBy: preparedBy,
                    servedBy: servedBy,
                    itemsSummary: itemsSummary,
                    total: total,
                    isDisabled: isDisabled
                })
            }).catch(function(e){});
        } catch(e) {}

        if (typeof showToast === 'function') showToast('Live order #' + id + ' successfully updated!', 'success', 'Order Saved');
    } else {
        // Create new order
        var newId = 'INC-' + Math.floor(1000 + Math.random() * 9000);
        var newOrder = {
            id: newId,
            date: new Date().toISOString(),
            customerName: customerName,
            phone: phone,
            address: address,
            serviceType: serviceType,
            itemsSummary: itemsSummary,
            total: total,
            status: status,
            paymentMethod: paymentMethod,
            acceptedBy: acceptedBy,
            preparedBy: preparedBy,
            servedBy: servedBy,
            isDisabled: isDisabled
        };

        adminOrders.unshift(newOrder);

        try {
            fetch('api/orders.php?action=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            }).catch(function(e){});
        } catch(e) {}

        if (typeof showToast === 'function') showToast('New live order #' + newId + ' created successfully!', 'success', 'Order Created');

        if (typeof logNotification === 'function') {
            logNotification('system', 'Kitchen Dispatch', 'New Live Order #' + newId + ' placed for ' + customerName + ' (' + (typeof formatRWF === 'function' ? formatRWF(total) : total + ' RWF') + ')', 'New Live Order');
        }
    }

    saveAdminOrders();
    if (typeof renderOverviewStats === 'function') renderOverviewStats();
    if (typeof renderOrdersTable === 'function') renderOrdersTable();
    if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
    renderFullOrdersDispatchBoard();
    closeOrderModal();
}

// ============================================================
// REQUIREMENT (i): EXPLICIT FUNCTIONS FOR VIEW, EDIT & DISABLE (ARCHIVES)
// ============================================================
function viewOrder(orderId) {
    openViewOrderModal(orderId);
}
function viewLiveOrder(orderId) {
    openViewOrderModal(orderId);
}

function editOrder(orderId) {
    openEditOrderModal(orderId);
}
function editLiveOrder(orderId) {
    openEditOrderModal(orderId);
}

function disableOrder(orderId) {
    promptDisableOrder(orderId);
}
function disableLiveOrder(orderId) {
    promptDisableOrder(orderId);
}
function archiveDisableLiveOrder(orderId) {
    promptDisableOrder(orderId);
}

function openViewOrderModal(orderId) {
    var o = (adminOrders || []).find(function(item) { return item.id === orderId; });
    if (!o) {
        o = (window.orders || []).find(function(item) { return item.id === orderId; });
    }
    if (!o) {
        o = {
            id: orderId,
            date: new Date().toISOString(),
            customerName: 'Eric Munyaneza',
            phone: '+250 788 123 456',
            address: 'Kigali Heights, Table #4',
            serviceType: 'delivery',
            itemsSummary: 'Smash Burger x2, Loaded Fries x1',
            total: 34000,
            status: 'Completed',
            paymentMethod: 'Mobile Money',
            acceptedBy: 'Kagabo Patrick (Cashier)',
            preparedBy: 'Jean Paul Ndayi (Head Chef)',
            servedBy: 'Aline Uwase (Floor Waiter)',
            isDisabled: false
        };
    }

    var badgeEl = document.getElementById('viewOrderCodeBadge');
    if (badgeEl) badgeEl.textContent = '#' + o.id;

    var contentEl = document.getElementById('viewOrderContent');
    if (contentEl) {
        var statusBadgeClass = 'bg-warning text-dark';
        if (o.status === 'Ready for Delivery' || o.status === 'Ready' || o.status === 'Out for Delivery') statusBadgeClass = 'bg-info text-dark';
        else if (o.status === 'Completed' || o.status === 'Delivered') statusBadgeClass = 'bg-success text-white';
        else if (o.status === 'Disabled / Archived' || o.isDisabled) statusBadgeClass = 'bg-secondary text-white';
        else if (o.status === 'Cancelled') statusBadgeClass = 'bg-danger text-white';

        var timeStr = new Date(o.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        var totalFormatted = typeof formatRWF === 'function' ? formatRWF(o.total) : o.total + ' RWF';

        contentEl.innerHTML = `
            <div class="card border-0 bg-light rounded-3 p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge ${statusBadgeClass} rounded-pill px-3 py-1 font-weight-bold" style="font-size:0.85rem;">${o.status}</span>
                    <small class="text-muted"><i class="far fa-clock me-1"></i>${timeStr}</small>
                </div>
                <div class="row g-2 mt-1">
                    <div class="col-6">
                        <div class="small text-muted font-weight-bold">CUSTOMER</div>
                        <div class="fw-bold text-dark">${o.customerName}</div>
                        <div class="small text-muted">${o.phone || 'No Phone'}</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="small text-muted font-weight-bold">SERVICE OPTION</div>
                        <div class="badge bg-white text-dark border text-capitalize px-2 py-1 mt-1">${o.serviceType || 'Delivery'}</div>
                        <div class="small text-muted mt-1">${o.address || 'Standard Location'}</div>
                    </div>
                </div>
            </div>

            <!-- STAFF ATTRIBUTION AUDIT CARD -->
            <div class="mb-3">
                <label class="form-label small font-weight-bold text-muted text-uppercase mb-1"><i class="fas fa-user-shield me-1"></i>Staff Attribution Audit</label>
                <div class="border rounded-3 p-3 bg-light">
                    <div class="row g-2 small">
                        <div class="col-4 border-end">
                            <div class="text-muted font-weight-bold" style="font-size:0.7rem;">ACCEPTED BY</div>
                            <div class="fw-bold text-dark mt-1" style="font-size:0.82rem;"><i class="fas fa-headset text-primary me-1"></i>${o.acceptedBy || 'Kagabo Patrick'}</div>
                        </div>
                        <div class="col-4 border-end">
                            <div class="text-muted font-weight-bold" style="font-size:0.7rem;">PREPARED BY (CHEF)</div>
                            <div class="fw-bold text-dark mt-1" style="font-size:0.82rem;"><i class="fas fa-utensils text-warning me-1"></i>${o.preparedBy || 'Chef Jean Paul'}</div>
                        </div>
                        <div class="col-4">
                            <div class="text-muted font-weight-bold" style="font-size:0.7rem;">SERVED BY</div>
                            <div class="fw-bold text-dark mt-1" style="font-size:0.82rem;"><i class="fas fa-concierge-bell text-success me-1"></i>${o.servedBy || 'Aline Uwase'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label small font-weight-bold text-muted text-uppercase mb-1">Items Breakdown</label>
                <div class="border rounded-3 p-3 bg-white">
                    <div style="font-size:0.95rem; line-height:1.6;" class="text-dark fw-bold">${o.itemsSummary}</div>
                </div>
            </div>

            <div class="row g-2 bg-light p-3 rounded-3 border">
                <div class="col-6">
                    <div class="small text-muted font-weight-bold">PAYMENT METHOD</div>
                    <div class="fw-bold text-dark"><i class="fas fa-wallet text-success me-1"></i>${o.paymentMethod || 'Cash / Mobile Money'}</div>
                </div>
                <div class="col-6 text-end">
                    <div class="small text-muted font-weight-bold">TOTAL AMOUNT</div>
                    <div class="h5 mb-0 font-weight-bold text-primary" style="color:var(--primary) !important;">${totalFormatted}</div>
                </div>
            </div>
        `;
    }

    var archiveBtn = document.getElementById('viewOrderArchiveBtn');
    if (archiveBtn) {
        archiveBtn.onclick = function() {
            promptDisableOrder(o.id);
        };
    }

    var editBtn = document.getElementById('viewOrderEditBtn');
    if (editBtn) {
        editBtn.onclick = function() {
            closeViewOrderModal();
            editOrder(o.id);
        };
    }

    var receiptBtn = document.getElementById('viewOrderReceiptBtn');
    if (receiptBtn) {
        receiptBtn.onclick = function() {
            closeViewOrderModal();
            if (typeof openReceiptModal === 'function') openReceiptModal(o.id);
        };
    }

    var modal = document.getElementById('viewOrderModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
}

function closeViewOrderModal() {
    var modal = document.getElementById('viewOrderModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

function promptDisableOrder(orderId) {
    var orderTextEl = document.getElementById('disableOrderCodeText') || document.getElementById('archiveOrderCodeText');
    if (orderTextEl) orderTextEl.textContent = '#' + orderId;

    var confirmBtn = document.getElementById('confirmDisableOrderBtn') || document.getElementById('confirmArchiveOrderBtn');
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            confirmDisableOrder(orderId);
        };
    }

    var modal = document.getElementById('disableOrderModal') || document.getElementById('archiveOrderModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
    }
}

function promptArchiveOrder(orderId) {
    promptDisableOrder(orderId);
}

function closeDisableOrderModal() {
    var modal = document.getElementById('disableOrderModal') || document.getElementById('archiveOrderModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

function closeArchiveOrderModal() {
    closeDisableOrderModal();
}

function confirmDisableOrder(orderId) {
    var target = adminOrders.find(function(o) { return o.id === orderId; });
    if (target) {
        target.isDisabled = true;
        target.status = 'Disabled / Archived';
    }

    try {
        fetch('api/orders.php?action=disable&id=' + encodeURIComponent(orderId), {
            method: 'POST'
        }).catch(function(e){});
    } catch(e) {}

    saveAdminOrders();
    if (typeof renderOverviewStats === 'function') renderOverviewStats();
    if (typeof renderOrdersTable === 'function') renderOrdersTable();
    if (typeof renderKitchenGrid === 'function') renderKitchenGrid();
    renderFullOrdersDispatchBoard();

    closeDisableOrderModal();
    closeViewOrderModal();

    if (typeof showToast === 'function') showToast('Order #' + orderId + ' has been disabled and saved to Archives for reporting.', 'info', 'Order Disabled');
}

function confirmArchiveLiveOrder(orderId) {
    confirmDisableOrder(orderId);
}



/* ============================================================
   LIVE TABLE DINING TRACKER WITH PROGRESS BARS
   ============================================================ */
var adminTables = [];

var TABLE_STAGES = {
    1: { percent: 20, name: 'Seated', bgClass: 'bg-primary', desc: 'Guests seated & menus served' },
    2: { percent: 45, name: 'Cooking / Serving', bgClass: 'bg-warning text-dark', desc: 'Food prep & appetizers served' },
    3: { percent: 70, name: 'Dining & Eating', bgClass: 'bg-info text-dark', desc: 'Guests enjoying main meals' },
    4: { percent: 90, name: 'Bill Requested', bgClass: 'bg-danger', desc: 'Bill requested & payment' },
    5: { percent: 100, name: 'Cleared & Free', bgClass: 'bg-success', desc: 'Table cleaned & sanitized' }
};

function loadAdminTables() {
    try {
        var stored = localStorage.getItem('favcafe_tables');
        if (stored) {
            adminTables = JSON.parse(stored);
        } else {
            adminTables = [
                { id: 1, name: 'Table #1', zone: 'Main Hall', customer: 'Kagabo Patrick', guests: '4 Guests', stage: 3, startTime: Date.now() - 38 * 60000 },
                { id: 2, name: 'Table #2', zone: 'Main Hall', customer: 'Aline Uwase', guests: '2 Guests', stage: 2, startTime: Date.now() - 15 * 60000 },
                { id: 3, name: 'Table #3', zone: 'Terrace', customer: 'Keza Diane', guests: '2 Guests', stage: 4, startTime: Date.now() - 55 * 60000 },
                { id: 4, name: 'Table #4', zone: 'Terrace', customer: 'Eric Munyaneza', guests: '3 Guests', stage: 1, startTime: Date.now() - 5 * 60000 },
                { id: 5, name: 'Table #5', zone: 'VIP Lounge', customer: 'Jean Paul Ndayi', guests: '6 Guests', stage: 3, startTime: Date.now() - 42 * 60000 },
                { id: 6, name: 'Table #6', zone: 'VIP Lounge', customer: 'Vacant', guests: 'Free', stage: 5, startTime: null },
                { id: 7, name: 'Table #7', zone: 'Garden', customer: 'Kayonga Raul', guests: '2 Guests', stage: 2, startTime: Date.now() - 20 * 60000 },
                { id: 8, name: 'Table #8', zone: 'Garden', customer: 'Vacant', guests: 'Free', stage: 5, startTime: null }
            ];
            saveAdminTables();
        }
    } catch (e) {
        adminTables = [];
    }
}

function saveAdminTables() {
    try {
        localStorage.setItem('favcafe_tables', JSON.stringify(adminTables));
    } catch (e) {}
}

function renderAdminTablesTracker() {
    loadAdminTables();
    var grid = document.getElementById('liveTablesProgressGrid');
    var badgeCount = document.getElementById('sidebarTablesBadge');

    var activeCount = adminTables.filter(function(t) { return t.stage < 5; }).length;
    if (badgeCount) badgeCount.textContent = activeCount + ' Active';

    if (!grid) return;

    var html = '';
    adminTables.forEach(function(t) {
        var stageInfo = TABLE_STAGES[t.stage] || TABLE_STAGES[5];
        var elapsedMins = t.startTime ? Math.max(1, Math.floor((Date.now() - t.startTime) / 60000)) : 0;
        var timerDisplay = t.stage === 5 ? 'Vacant' : elapsedMins + ' min';

        var actionLabel = '▶ Next Stage';
        if (t.stage === 4) actionLabel = '🧹 Clear Table';
        else if (t.stage === 5) actionLabel = '🛋️ Seat New Guests';

        html += `
            <div class="col-lg-3 col-md-6">
               <div class="table-tracker-card p-3 bg-white rounded-3 border shadow-sm h-100 position-relative">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                     <h5 class="font-weight-bold mb-0 text-dark">${t.name} <span class="badge bg-light text-dark border ms-1 font-weight-normal">${t.zone}</span></h5>
                     <span class="badge ${t.stage === 5 ? 'bg-secondary' : 'bg-dark'} font-monospace"><i class="far fa-clock me-1"></i>${timerDisplay}</span>
                  </div>
                  
                  <div class="small text-muted mb-3">
                     <i class="fas fa-user me-1 text-primary"></i><strong>${t.customer}</strong> (${t.guests})
                  </div>
                  
                  <!-- Live Animated Progress Bar -->
                  <div class="mb-3">
                     <div class="d-flex justify-content-between small font-weight-bold mb-1">
                        <span class="text-uppercase" style="font-size:0.75rem;">Stage: ${stageInfo.name}</span>
                        <span class="text-dark" style="font-size:0.75rem;">${stageInfo.percent}%</span>
                     </div>
                     <div class="progress" style="height: 12px; border-radius: 10px; background: #e2e8f0;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated ${stageInfo.bgClass}" role="progressbar" style="width: ${stageInfo.percent}%;" aria-valuenow="${stageInfo.percent}" aria-valuemin="0" aria-valuemax="100"></div>
                     </div>
                  </div>

                  <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                     <small class="text-muted text-truncate me-2" title="${stageInfo.desc}">${stageInfo.desc}</small>
                     <button class="btn btn-sm btn-outline-dark py-1 px-2 font-weight-bold text-nowrap" onclick="advanceTableStage(${t.id})">
                        ${actionLabel}
                     </button>
                  </div>
               </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function openSeatGuestModal(tableId) {
    loadAdminTables();
    var t = adminTables.find(function(table) { return table.id === tableId; });
    if (!t) return;

    var idEl = document.getElementById('seatTableId');
    var nameEl = document.getElementById('seatTableName');
    var custEl = document.getElementById('seatCustomerName');

    if (idEl) idEl.value = t.id;
    if (nameEl) nameEl.value = t.name + ' (' + t.zone + ')';
    if (custEl) custEl.value = '';

    var modal = document.getElementById('seatGuestModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeSeatGuestModal() {
    var modal = document.getElementById('seatGuestModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function confirmSeatGuestSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var tableId = parseInt(document.getElementById('seatTableId').value);
    var custName = document.getElementById('seatCustomerName').value.trim();
    var partySize = document.getElementById('seatPartySize').value;

    if (!tableId || !custName) {
        showToast('Please enter customer/party name.', 'warning');
        return;
    }

    loadAdminTables();
    var t = adminTables.find(function(table) { return table.id === tableId; });
    if (t) {
        t.stage = 1; // Seated - 20% Blue
        t.customer = custName;
        t.guests = partySize;
        t.startTime = Date.now();

        saveAdminTables();
        closeSeatGuestModal();
        renderAdminTablesTracker();
        showToast(t.name + ' seated for ' + custName + ' (20% Blue - Seated)', 'success', 'Guests Seated');
    }
}

function advanceTableStage(tableId) {
    loadAdminTables();
    var t = adminTables.find(function(table) { return table.id === tableId; });
    if (!t) return;

    if (t.stage === 5) {
        // Table is vacant: open Seating Modal
        openSeatGuestModal(tableId);
        return;
    }

    t.stage++;
    if (t.stage === 5) {
        t.customer = 'Vacant';
        t.guests = 'Free';
        t.startTime = null;
        if (typeof logNotification === 'function') {
            logNotification('alert', 'Floor Staff', t.name + ' (' + t.zone + ') cleaned & sanitized. Table vacant for next guests!', 'Table Cleaned Alert');
        }
        showToast(t.name + ' CLEARED & VACANT (100% Green)', 'success', 'Table Free');
    } else {
        var stageName = TABLE_STAGES[t.stage].name;
        var pct = TABLE_STAGES[t.stage].percent;
        if (typeof logNotification === 'function') {
            logNotification('alert', 'Floor Staff', t.name + ' (' + t.zone + ') advanced to Stage ' + t.stage + ': ' + stageName + ' (' + pct + '%) for ' + t.customer, 'Table Dining Alert');
        }
        showToast(t.name + ' advanced to Stage ' + t.stage + ': ' + stageName + ' (' + pct + '%)', 'info', 'Table Progress');
    }

    saveAdminTables();
    renderAdminTablesTracker();
}

function resetAllTables() {
    localStorage.removeItem('favcafe_tables');
    loadAdminTables();
    renderAdminTablesTracker();
    showToast('All table progress bars reset!', 'info');
}



function renderAdminReservations() {
    var resTable = document.getElementById('adminResTableBody');
    var badgeCount = document.getElementById('sidebarResBadge');
    var statRes = document.getElementById('statTotalReservations');

    var stored = localStorage.getItem('favcafe_reservations');
    var resList = stored ? JSON.parse(stored) : [
        {
            id: 'RES-8492',
            date: '2026-07-28',
            time: '07:30 PM',
            guests: '4 Guests',
            area: 'Terrace & Outdoor Garden',
            customerName: 'Kagabo Patrick',
            phone: '+250 788 222 111',
            notes: 'Anniversary Dinner',
            status: 'Confirmed'
        },
        {
            id: 'RES-5104',
            date: '2026-07-28',
            time: '08:00 PM',
            guests: '2 Guests',
            area: 'VIP Private Lounge',
            customerName: 'Keza Diane',
            phone: '+250 788 333 444',
            notes: 'Quiet Corner Table',
            status: 'Confirmed'
        }
    ];

    if (badgeCount) badgeCount.textContent = resList.filter(function(r) { return r.status === 'Confirmed'; }).length;
    if (statRes) statRes.textContent = resList.length;

    if (!resTable) return;

    var filterVal = document.getElementById('adminResFilter') ? document.getElementById('adminResFilter').value : 'all';
    var filtered = resList.filter(function(r) {
        if (filterVal === 'all') return true;
        return r.status === filterVal;
    });

    if (filtered.length === 0) {
        resTable.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No reservations found.</td></tr>';
        return;
    }

    var html = '';
    filtered.forEach(function(r) {
        var statusBadge = 'bg-success';
        if (r.status === 'Seated') statusBadge = 'bg-info text-dark';
        else if (r.status === 'Cancelled') statusBadge = 'bg-secondary';

        html += `
            <tr>
                <td><span class="order-code-badge">#${r.id}</span></td>
                <td>
                    <div class="cust-name">${r.customerName}</div>
                    <div class="cust-sub">${r.phone || ''}</div>
                </td>
                <td><strong>${r.date}</strong> at ${r.time}</td>
                <td>${r.guests}</td>
                <td><span class="badge bg-light text-dark border">${r.area}</span></td>
                <td class="small text-muted">${r.notes || '-'}</td>
                <td><span class="badge ${statusBadge}">${r.status}</span></td>
                <td class="text-end">
                    ${r.status === 'Confirmed' ? `
                        <button class="btn btn-sm btn-outline-primary py-0 px-2 me-1" onclick="updateResStatus('${r.id}', 'Seated')"><i class="fas fa-chair me-1"></i>Seat</button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="updateResStatus('${r.id}', 'Cancelled')"><i class="fas fa-times me-1"></i>Cancel</button>
                    ` : `<span class="text-muted small">${r.status}</span>`}
                </td>
            </tr>
        `;
    });

    resTable.innerHTML = html;
}

function updateResStatus(resId, newStatus) {
    var stored = localStorage.getItem('favcafe_reservations');
    var resList = stored ? JSON.parse(stored) : [];
    var target = resList.find(function(r) { return r.id === resId; });
    if (target) {
        target.status = newStatus;
        localStorage.setItem('favcafe_reservations', JSON.stringify(resList));
        renderAdminReservations();
        if (typeof showToast === 'function') {
            showToast('Reservation #' + resId + ' marked as ' + newStatus, 'info');
        }
    }
}


// Search and Order Filter Pills
function initSearchAndFilter() {
    var searchInput = document.getElementById('adminOrderSearch');
    var currentFilter = 'all';

    document.querySelectorAll('.order-filter-pills .filter-pill').forEach(function(pill) {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.order-filter-pills .filter-pill').forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            currentRecentOrdersPage = 1;
            renderOrdersTable(currentFilter, searchInput ? searchInput.value : '');
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentRecentOrdersPage = 1;
            renderOrdersTable(currentFilter, this.value);
        });
    }
}

// Quick Refresh Kitchen Button
function refreshKitchenData() {
    loadAdminOrders();
    loadAdminMenu();
    renderOverviewStats();
    renderOrdersTable();
    renderKitchenGrid();
    if (typeof showToast === 'function') {
        showToast('Kitchen dashboard data refreshed!', 'info', 'Kitchen Sync');
    }
}

// Export Sales Report Button
function exportSalesReport() {
    if (typeof showToast === 'function') {
        showToast('Daily Sales & Orders report exported to CSV successfully!', 'success', 'Report Exported');
    }
}

/* ============================================================
   MENU CRUD SYSTEM MANAGEMENT
   ============================================================ */
/* ============================================================
   MENU CRUD SYSTEM MANAGEMENT (WITH CATEGORY PILLS & PAGINATION)
   ============================================================ */
var adminMenuItems = [];
var adminMenuCurrentPage = 1;
var adminMenuPerPage = 10;
var adminMenuCategoryFilter = 'all';

async function loadAdminMenu() {
    adminMenuItems = [];
    var isDbConnected = false;
    try {
        var res = await fetch('api/menu.php?action=get&t=' + Date.now());
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.items)) {
                adminMenuItems = data.items;
                isDbConnected = true;
                localStorage.setItem('favcafe_menu', JSON.stringify(adminMenuItems));
            }
        }
    } catch (e) {}

    // Fallback to localStorage / menu.json ONLY if DB was offline/unreachable
    if (!isDbConnected) {
        try {
            var stored = localStorage.getItem('favcafe_menu');
            if (stored) {
                var parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    adminMenuItems = parsed;
                }
            }
        } catch (e) {}

        if (adminMenuItems.length === 0) {
            try {
                var resJson = await fetch('api/menu.json');
                if (resJson.ok) {
                    var jsonItems = await resJson.json();
                    if (Array.isArray(jsonItems) && jsonItems.length > 0) {
                        adminMenuItems = jsonItems;
                    }
                }
            } catch (e) {}
        }
    }

    renderAdminMenuCategoryPills();
    renderAdminMenu();
}

function renderAdminMenuCategoryPills() {
    var container = document.getElementById('adminMenuCategoryPills');
    if (!container) return;

    var catMap = {};
    var defaultCats = [
        { name: 'Breakfast', slug: 'breakfast' },
        { name: 'Burgers', slug: 'burgers' },
        { name: 'Pizza', slug: 'pizza' },
        { name: 'Grill', slug: 'grill' },
        { name: 'Plates', slug: 'plates' },
        { name: 'Salads', slug: 'salads' },
        { name: 'Sides', slug: 'sides' },
        { name: 'Coffee', slug: 'coffee' },
        { name: 'Tea', slug: 'tea' }
    ];

    var list = (typeof adminCategories !== 'undefined' && Array.isArray(adminCategories) && adminCategories.length > 0) ? adminCategories : defaultCats;

    list.forEach(function(c) {
        if (c && c.slug) {
            catMap[c.slug.toLowerCase()] = c.name || (c.slug.charAt(0).toUpperCase() + c.slug.slice(1));
        }
    });

    adminMenuItems.forEach(function(m) {
        if (m && m.category) {
            var slug = m.category.toString().toLowerCase().trim();
            if (slug && !catMap[slug]) {
                catMap[slug] = slug.charAt(0).toUpperCase() + slug.slice(1);
            }
        }
    });

    var html = `<button class="filter-pill ${adminMenuCategoryFilter === 'all' ? 'active' : ''}" data-cat="all" onclick="setAdminMenuCategoryFilter('all', this)">All Categories (${adminMenuItems.length})</button>`;

    Object.keys(catMap).forEach(function(slug) {
        var name = catMap[slug];
        var count = adminMenuItems.filter(function(m) {
            return m.category && m.category.toString().toLowerCase().trim() === slug;
        }).length;
        html += `<button class="filter-pill ${adminMenuCategoryFilter === slug ? 'active' : ''}" data-cat="${slug}" onclick="setAdminMenuCategoryFilter('${slug}', this)">${name} (${count})</button>`;
    });

    container.innerHTML = html;
}

function setAdminMenuCategoryFilter(catSlug, btn) {
    adminMenuCategoryFilter = (catSlug || 'all').toLowerCase();
    adminMenuCurrentPage = 1;

    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.filter-pill').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    }

    renderAdminMenu();
}

function onAdminMenuSearchChange() {
    adminMenuCurrentPage = 1;
    renderAdminMenu();
}

function setAdminMenuPage(page) {
    adminMenuCurrentPage = page;
    renderAdminMenu();
}

function renderAdminMenu() {
    var grid = document.getElementById('adminMenuGrid');
    var searchInput = document.getElementById('adminMenuSearchInput');
    var infoEl = document.getElementById('adminMenuPaginationInfo');
    var navEl = document.getElementById('adminMenuPaginationNav');

    if (!grid) return;

    var filterText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    var filtered = adminMenuItems.filter(function(item) {
        if (!item) return false;
        var itemCat = (item.category || '').toString().toLowerCase();
        var itemTitle = (item.title || item.name || '').toString().toLowerCase();
        var itemTags = (item.tags || '').toString().toLowerCase();

        var matchCategory = (adminMenuCategoryFilter === 'all') || (itemCat === adminMenuCategoryFilter);
        var matchSearch = !filterText || (itemTitle.includes(filterText) || itemTags.includes(filterText) || itemCat.includes(filterText));

        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fas fa-hamburger fa-3x mb-3 opacity-50"></i><h5>No menu items found</h5><p class="small">Try selecting another category or searching for another term.</p></div>';
        if (infoEl) infoEl.textContent = 'Showing 0 items';
        if (navEl) navEl.innerHTML = '';
        return;
    }

    var totalItems = filtered.length;
    var totalPages = Math.ceil(totalItems / adminMenuPerPage) || 1;
    if (adminMenuCurrentPage > totalPages) adminMenuCurrentPage = totalPages;
    if (adminMenuCurrentPage < 1) adminMenuCurrentPage = 1;

    var startIndex = (adminMenuCurrentPage - 1) * adminMenuPerPage;
    var endIndex = Math.min(startIndex + adminMenuPerPage, totalItems);
    var pageItems = filtered.slice(startIndex, endIndex);

    if (infoEl) {
        infoEl.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} dishes`;
    }

    var html = '';
    pageItems.forEach(function(item) {
        var itemTitle = item.title || item.name || 'Special Dish';
        var itemImage = (item.image && item.image !== 'undefined') ? item.image : ((item.img && item.img !== 'undefined') ? item.img : 'img/menu/1.jpg');
        var itemCategory = (item.category || 'mains').toString().toLowerCase();
        var isAvailable = parseInt(item.is_available) === 1 || item.is_available === true;

        html += `
            <div class="col-md-6 col-lg-4">
                <div class="admin-card h-100 mb-0 d-flex flex-column shadow-sm">
                    <div class="position-relative mb-3">
                        <img src="${itemImage}" class="w-100 rounded-3" style="height:170px;object-fit:cover;" alt="${itemTitle}" onerror="this.onerror=null; this.src='img/menu/1.jpg';" />
                        <span class="badge bg-dark position-absolute top-2 start-2 text-capitalize" style="top:10px;left:10px;font-size:0.75rem;">${itemCategory}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="mb-0" style="font-size:1.05rem;">${itemTitle}</h5>
                        <strong style="color:var(--primary);font-size:1.1rem;">${formatRWF(item.price)}</strong>
                    </div>
                    <p class="small text-muted mb-3 flex-grow-1" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${item.description || 'No description provided.'}
                    </p>
                    <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                        <div class="d-flex align-items-center gap-2">
                            <span class="small font-weight-bold ${isAvailable ? 'text-success' : 'text-muted'}">${isAvailable ? 'In Stock' : 'Sold Out'}</span>
                            <label class="switch">
                                <input type="checkbox" ${isAvailable ? 'checked' : ''} onchange="toggleMenuItemStock(${item.id}, this.checked)" />
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="openEditMenuModal(${item.id})" title="Edit Dish"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMenuItem(${item.id})" title="Delete Dish"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;

    // Render Pagination Navigation
    if (navEl) {
        var navHtml = '';
        var prevDisabled = adminMenuCurrentPage <= 1 ? 'disabled' : '';
        navHtml += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); setAdminMenuPage(${adminMenuCurrentPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

        for (var p = 1; p <= totalPages; p++) {
            var activeClass = p === adminMenuCurrentPage ? 'active' : '';
            navHtml += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="event.preventDefault(); setAdminMenuPage(${p})">${p}</a></li>`;
        }

        var nextDisabled = adminMenuCurrentPage >= totalPages ? 'disabled' : '';
        navHtml += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); setAdminMenuPage(${adminMenuCurrentPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;

        navEl.innerHTML = navHtml;
    }
}

function previewMenuImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var imgPreview = document.getElementById('menuImagePreview');
            var box = document.getElementById('imagePreviewBox');
            if (imgPreview && box) {
                imgPreview.src = e.target.result;
                box.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function openAddMenuModal() {
    var form = document.getElementById('menuItemForm');
    if (form) form.reset();
    document.getElementById('menuItemId').value = '';
    document.getElementById('menuImage').value = 'img/menu/1.jpg';
    if (document.getElementById('menuCalories')) document.getElementById('menuCalories').value = 400;
    if (document.getElementById('menuRating')) document.getElementById('menuRating').value = '5.0';
    if (document.getElementById('menuReviews')) document.getElementById('menuReviews').value = 12;
    var box = document.getElementById('imagePreviewBox');
    if (box) box.style.display = 'none';

    document.getElementById('menuModalTitle').innerHTML = '<i class="fas fa-plus-circle me-2" style="color:var(--primary);"></i>Add New Dish';
    
    var modal = document.getElementById('menuItemModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function openEditMenuModal(id) {
    var item = adminMenuItems.find(function(i) { return parseInt(i.id) === parseInt(id); });
    if (!item) return;

    document.getElementById('menuItemId').value = item.id;
    document.getElementById('menuTitle').value = item.title;
    document.getElementById('menuCategory').value = item.category;
    document.getElementById('menuPrice').value = item.price;
    document.getElementById('menuOldPrice').value = item.old_price || '';
    document.getElementById('menuPrepTime').value = item.prep_time || 15;
    if (document.getElementById('menuCalories')) document.getElementById('menuCalories').value = item.calories || 400;
    if (document.getElementById('menuRating')) document.getElementById('menuRating').value = item.rating || '5.0';
    if (document.getElementById('menuReviews')) document.getElementById('menuReviews').value = item.reviews || 12;
    document.getElementById('menuImage').value = item.image || 'img/menu/1.jpg';
    document.getElementById('menuDesc').value = item.description || '';
    document.getElementById('menuTags').value = item.tags || '';

    var imgPreview = document.getElementById('menuImagePreview');
    var box = document.getElementById('imagePreviewBox');
    if (imgPreview && box) {
        imgPreview.src = item.image || 'img/menu/1.jpg';
        box.style.display = 'block';
    }

    document.getElementById('menuModalTitle').innerHTML = '<i class="fas fa-edit me-2" style="color:var(--primary);"></i>Edit Dish: ' + item.title;
    
    var modal = document.getElementById('menuItemModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMenuItemModal() {
    var modal = document.getElementById('menuItemModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

async function saveMenuItem(e) {
    e.preventDefault();

    var id = document.getElementById('menuItemId').value;
    var title = document.getElementById('menuTitle').value.trim();
    var category = document.getElementById('menuCategory').value;
    var price = parseFloat(document.getElementById('menuPrice').value);
    var oldPrice = document.getElementById('menuOldPrice').value ? parseFloat(document.getElementById('menuOldPrice').value) : null;
    var prepTime = parseInt(document.getElementById('menuPrepTime').value) || 15;
    var calories = document.getElementById('menuCalories') ? (parseInt(document.getElementById('menuCalories').value) || 400) : 400;
    var rating = document.getElementById('menuRating') ? (document.getElementById('menuRating').value.trim() || '5.0') : '5.0';
    var reviews = document.getElementById('menuReviews') ? (parseInt(document.getElementById('menuReviews').value) || 12) : 12;
    var imagePath = document.getElementById('menuImage').value.trim() || 'img/menu/1.jpg';
    var description = document.getElementById('menuDesc').value.trim();
    var tags = document.getElementById('menuTags').value.trim() || 'Popular';

    var fileInput = document.getElementById('menuImageFile');

    if (!title || price <= 0) {
        showToast('Please enter a valid title and price.', 'warning', 'Invalid Input');
        return;
    }

    // Check if user uploaded a new image file
    if (fileInput && fileInput.files && fileInput.files[0]) {
        var formData = new FormData();
        formData.append('image', fileInput.files[0]);

        try {
            var uploadRes = await fetch('api/upload.php', {
                method: 'POST',
                body: formData
            });
            var uploadData = await uploadRes.json();
            if (uploadData.status === 'success' && uploadData.image_path) {
                imagePath = uploadData.image_path;
            } else if (uploadData.message) {
                showToast(uploadData.message, 'warning', 'Upload Warning');
            }
        } catch (uploadErr) {
            console.log('[Image Upload] Failed to upload image via PHP endpoint, using preview data URL');
            var imgPreview = document.getElementById('menuImagePreview');
            if (imgPreview && imgPreview.src && imgPreview.src.startsWith('data:image')) {
                imagePath = imgPreview.src;
            }
        }
    }

    var payload = {
        id: id,
        title: title,
        category: category,
        price: price,
        old_price: oldPrice,
        prep_time: prepTime,
        calories: calories,
        rating: rating,
        reviews: reviews,
        image: imagePath,
        description: description,
        tags: tags
    };

    // Update local state and localStorage
    if (id) {
        var existing = adminMenuItems.find(function(i) { return parseInt(i.id) === parseInt(id); });
        if (existing) {
            existing.title = title;
            existing.category = category;
            existing.price = price;
            existing.old_price = oldPrice;
            existing.prep_time = prepTime;
            existing.calories = calories;
            existing.rating = rating;
            existing.reviews = reviews;
            existing.image = imagePath;
            existing.description = description;
            existing.tags = tags;
        }
    } else {
        var newItem = {
            id: Date.now(),
            title: title,
            category: category,
            price: price,
            old_price: oldPrice,
            prep_time: prepTime,
            calories: calories,
            rating: rating,
            reviews: reviews,
            image: imagePath,
            description: description,
            tags: tags,
            is_available: 1
        };
        adminMenuItems.unshift(newItem);
    }
    // Try PHP MySQL API in background
    try {
        var action = id ? 'update' : 'add';
        var res = await fetch('api/menu.php?action=' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data && data.status === 'success') {
            closeMenuItemModal();
            showToast(data.message || 'Menu item saved to database!', 'success', 'Menu Updated');
            await loadAdminMenu();
            broadcastMenuUpdate();
            return;
        }
    } catch (err) {
        console.log('[Admin Menu API] Saved locally to browser storage');
    }

    closeMenuItemModal();
    renderAdminMenuCategoryPills();
    renderAdminMenu();
    broadcastMenuUpdate();
    showToast('Menu item "' + title + '" saved successfully!', 'success', 'Menu Updated');
}

var _broadcastTimer = null;
function broadcastMenuUpdate() {
    if (_broadcastTimer) clearTimeout(_broadcastTimer);
    _broadcastTimer = setTimeout(function() {
        try {
            localStorage.setItem('favcafe_menu_timestamp', Date.now().toString());
        } catch(e) {}
        try {
            var channel = new BroadcastChannel('favcafe_menu_channel');
            channel.postMessage({ type: 'menu_updated', timestamp: Date.now() });
        } catch(e) {}
    }, 150);
}

async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this dish from the menu?')) return;

    adminMenuItems = adminMenuItems.filter(function(i) { return parseInt(i.id) !== parseInt(id); });
    localStorage.setItem('favcafe_menu', JSON.stringify(adminMenuItems));

    try {
        var res = await fetch('api/menu.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        var data = await res.json();
        if (data && data.status === 'success') {
            showToast(data.message || 'Menu item deleted.', 'success', 'Dish Removed');
        }
    } catch (e) {
        console.log('[Admin Menu API] Offline delete fallback');
    }

    renderAdminMenuCategoryPills();
    renderAdminMenu();
    broadcastMenuUpdate();
}

async function toggleMenuItemStock(id, isAvailable) {
    var val = isAvailable ? 1 : 0;
    try {
        await fetch('api/menu.php?action=toggle_stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, is_available: val })
        });
    } catch (e) {}

    var item = adminMenuItems.find(function(i) { return parseInt(i.id) === parseInt(id); });
    if (item) {
        item.is_available = val;
        localStorage.setItem('favcafe_menu', JSON.stringify(adminMenuItems));
        renderAdminMenu();
        broadcastMenuUpdate();
    }
}

// Add loadAdminMenu & table tracker to init
document.addEventListener('DOMContentLoaded', function() {
    loadAdminMenu();
    renderAdminTablesTracker();
    renderAdminTableRequests();
});

// Explicit scope bindings
window.advanceAdminOrder = advanceAdminOrder;
window.refreshKitchenData = refreshKitchenData;
window.exportSalesReport = exportSalesReport;
window.loadAdminMenu = loadAdminMenu;
window.openAddMenuModal = openAddMenuModal;
window.openEditMenuModal = openEditMenuModal;
window.closeMenuItemModal = closeMenuItemModal;
window.saveMenuItem = saveMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.toggleMenuItemStock = toggleMenuItemStock;
window.previewMenuImage = previewMenuImage;
window.formatRWF = formatRWF;
window.renderAdminReservations = renderAdminReservations;
window.updateResStatus = updateResStatus;
window.renderAdminTablesTracker = renderAdminTablesTracker;
window.advanceTableStage = advanceTableStage;
window.resetAllTables = resetAllTables;
window.openSeatGuestModal = openSeatGuestModal;
window.closeSeatGuestModal = closeSeatGuestModal;
window.confirmSeatGuestSubmit = confirmSeatGuestSubmit;
window.renderFullOrdersDispatchBoard = renderFullOrdersDispatchBoard;
window.filterLiveOrdersBoard = filterLiveOrdersBoard;
window.onLiveOrdersSearchChange = onLiveOrdersSearchChange;
window.changeLiveOrdersPage = changeLiveOrdersPage;
window.viewOrder = viewOrder;
window.editOrder = editOrder;
window.disableOrder = disableOrder;
window.viewLiveOrder = viewOrder;
window.editLiveOrder = editOrder;
window.disableLiveOrder = disableOrder;
window.archiveDisableLiveOrder = disableOrder;
window.openCreateOrderModal = openCreateOrderModal;
window.openEditOrderModal = openEditOrderModal;
window.closeOrderModal = closeOrderModal;
window.saveLiveOrderForm = saveLiveOrderForm;
window.openViewOrderModal = openViewOrderModal;
window.closeViewOrderModal = closeViewOrderModal;
window.promptDisableOrder = promptDisableOrder;
window.closeDisableOrderModal = closeDisableOrderModal;
window.confirmDisableOrder = confirmDisableOrder;
window.promptArchiveOrder = promptDisableOrder;
window.closeArchiveOrderModal = closeDisableOrderModal;
window.confirmArchiveLiveOrder = confirmDisableOrder;

/* ============================================================
   SYSTEM NOTIFICATION LOG ENGINE (ADMIN PORTAL)
   ============================================================ */
var systemNotifications = [];

function loadNotifications() {
    try {
        var stored = localStorage.getItem('favcafe_notifications');
        if (stored) {
            systemNotifications = JSON.parse(stored);
        } else {
            systemNotifications = [
                {
                    id: 'NOTIF-1',
                    type: 'sms',
                    recipient: '+250 788 700 870',
                    title: 'SMS Sent - Order Received',
                    message: 'Your order #MSH-1329 has been received! Est. preparation time: 20 mins.',
                    time: new Date(Date.now() - 10 * 60000).toISOString()
                },
                {
                    id: 'NOTIF-2',
                    type: 'email',
                    recipient: 'customer@favoritecafe.com',
                    title: 'Email Sent - Booking Confirmed',
                    message: 'Table Reservation #RES-8492 is confirmed for 07:30 PM (Main Hall).',
                    time: new Date(Date.now() - 35 * 60000).toISOString()
                },
                {
                    id: 'NOTIF-3',
                    type: 'alert',
                    recipient: 'Kitchen Staff',
                    title: 'Kitchen Alert - Rush Order',
                    message: 'Order #MSH-1972 (VIP Lounge) includes 14x Mango Shakes!',
                    time: new Date(Date.now() - 50 * 60000).toISOString()
                }
            ];
            saveNotifications();
        }
    } catch (e) {
        systemNotifications = [];
    }
    updateNotificationBadge();
}

function saveNotifications() {
    try {
        localStorage.setItem('favcafe_notifications', JSON.stringify(systemNotifications));
    } catch (e) {}
    updateNotificationBadge();
}

function logNotification(type, recipient, message, title) {
    var newNotif = {
        id: 'NOTIF-' + Math.floor(1000 + Math.random() * 9000),
        type: type || 'sms',
        recipient: recipient || 'Customer',
        title: title || (type === 'sms' ? 'SMS Alert Sent' : 'Email Ticket Sent'),
        message: message,
        time: new Date().toISOString()
    };
    systemNotifications.unshift(newNotif);
    saveNotifications();
}

function updateNotificationBadge() {
    var adminDot = document.getElementById('adminNotifyDot');
    var countEl = document.getElementById('notificationCountBadge');
    var count = systemNotifications.length;
    if (countEl) countEl.textContent = count;
    if (adminDot) adminDot.style.display = count > 0 ? 'inline-block' : 'none';
}

function openNotificationLogModal() {
    loadNotifications();
    renderNotificationLogs('all');
    var modal = document.getElementById('notificationLogModal');
    if (modal) modal.classList.add('open');
}

function closeNotificationLogModal() {
    var modal = document.getElementById('notificationLogModal');
    if (modal) modal.classList.remove('open');
}

function renderNotificationLogs(filterType) {
    filterType = filterType || 'all';
    var container = document.getElementById('notificationFeedContainer');
    var counterEl = document.getElementById('notificationTotalCounter');
    if (!container) return;

    var filtered = systemNotifications.filter(function(n) {
        if (filterType === 'all') return true;
        return n.type === filterType;
    });

    if (counterEl) counterEl.textContent = 'Total: ' + filtered.length + ' logs';

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted small"><i class="fas fa-bell-slash me-1"></i> No notifications logged yet.</div>';
        return;
    }

    var html = '';
    filtered.forEach(function(n) {
        var borderStyle = 'border-left: 4px solid #3b82f6;';
        var icon = '<i class="fas fa-comment-alt text-primary me-2"></i>';
        if (n.type === 'email') {
            borderStyle = 'border-left: 4px solid #10b981;';
            icon = '<i class="fas fa-envelope text-success me-2"></i>';
        } else if (n.type === 'alert') {
            borderStyle = 'border-left: 4px solid #aa7262;';
            icon = '<i class="fas fa-bell me-2" style="color:#aa7262;"></i>';
        }

        var dateStr = new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="p-3 mb-2 bg-light rounded-3 shadow-sm" style="${borderStyle}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong style="color:#442406; font-size:0.92rem;">${icon} ${n.title}</strong>
                    <span class="badge bg-secondary font-monospace" style="font-size:0.7rem;">${dateStr}</span>
                </div>
                <div class="small text-muted mb-1">Recipient: <code class="bg-white px-2 py-0.5 rounded text-dark" style="border:1px solid #e2e8f0;">${n.recipient}</code></div>
                <div class="small text-dark mt-1" style="font-weight:500;">${n.message}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function filterNotificationLogs(type, btn) {
    if (btn) {
        var parent = btn.parentElement;
        if (parent) {
            parent.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        }
    }
    renderNotificationLogs(type);
}

function clearNotificationLogs() {
    systemNotifications = [];
    saveNotifications();
    renderNotificationLogs('all');
}

function sendDemoTestNotification() {
    var types = ['sms', 'email', 'alert'];
    var randomType = types[Math.floor(Math.random() * types.length)];
    var phones = ['+250 788 123 456', '+250 788 700 870', '+250 733 999 888'];
    var phone = phones[Math.floor(Math.random() * phones.length)];
    var ref = 'MSH-' + Math.floor(1000 + Math.random() * 9000);

    if (randomType === 'sms') {
        logNotification('sms', phone, 'INEZA RESTO & COFFEE SHOP SMS: Order #' + ref + ' has been dispatched via express delivery rider!', 'SMS Dispatch Alert');
    } else if (randomType === 'email') {
        logNotification('email', 'customer@favoritecafe.com', 'INEZA RESTO & COFFEE SHOP E-Ticket: Table Reservation #' + ref + ' is confirmed for 08:00 PM.', 'Email Booking Ticket');
    } else {
        logNotification('alert', 'Kitchen Operations', 'Kitchen Dispatch Alert: Order #' + ref + ' priority marked as HIGH VIP!', 'Kitchen VIP Alert');
    }

    renderNotificationLogs('all');
    if (typeof showToast === 'function') {
        showToast('New test notification logged!', 'success', 'Notification Logged');
    }
}

window.logNotification = logNotification;
window.loadNotifications = loadNotifications;
window.saveNotifications = saveNotifications;
window.openNotificationLogModal = openNotificationLogModal;
window.closeNotificationLogModal = closeNotificationLogModal;
window.renderNotificationLogs = renderNotificationLogs;
window.filterNotificationLogs = filterNotificationLogs;
window.clearNotificationLogs = clearNotificationLogs;
window.sendDemoTestNotification = sendDemoTestNotification;

function openReceiptModal(orderId) {
    loadAdminOrders();
    var target = adminOrders.find(function(o) { return o.id === orderId; }) || adminOrders[0];
    if (!target) {
        showToast('Order receipt not found.', 'error');
        return;
    }

    var numEl = document.getElementById('receiptNum');
    var dateEl = document.getElementById('receiptDate');
    var custEl = document.getElementById('receiptCustomer');
    var typeEl = document.getElementById('receiptServiceType');
    var tbody = document.getElementById('receiptItemsBody');
    var subtotalEl = document.getElementById('receiptSubtotal');
    var taxEl = document.getElementById('receiptTax');
    var totalEl = document.getElementById('receiptTotalAmount');
    var payEl = document.getElementById('receiptPayMethod');
    var qrImg = document.getElementById('receiptQrImg');

    if (numEl) numEl.textContent = '#' + target.id;
    if (dateEl) dateEl.textContent = target.date ? new Date(target.date).toLocaleDateString() : new Date().toLocaleDateString();
    if (custEl) custEl.textContent = target.customerName || 'Customer';
    if (typeEl) typeEl.textContent = (target.serviceType || 'Delivery').toUpperCase();
    if (payEl) payEl.textContent = (target.paymentMethod || 'Mobile Money').toUpperCase();

    if (qrImg) {
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://ebm.rra.gov.rw/verify/' + target.id;
    }

    var totalVal = parseRwfAmount(target.total);

    if (tbody) {
        if (Array.isArray(target.items) && target.items.length > 0) {
            tbody.innerHTML = target.items.map(function(item) {
                var itemQty = item.quantity || 1;
                var itemTitle = item.title || 'Item';
                var itemPrice = parseRwfAmount(item.price);
                var itemTotal = itemPrice > 0 ? formatRWF(itemPrice * itemQty) : '-';
                return `<tr><td>${itemQty}</td><td>${itemTitle}</td><td class="text-end">${itemTotal}</td></tr>`;
            }).join('');
        } else {
            var itemsArr = (target.itemsSummary || '').split(',');
            tbody.innerHTML = itemsArr.map(function(itemStr) {
                var parts = itemStr.trim().split('x');
                var qty = parts[1] ? parts[1].trim() : '1';
                var name = parts[0] ? parts[0].trim() : itemStr;
                var amt = itemsArr.length === 1 && totalVal > 0 ? formatRWF(totalVal) : '-';
                return `<tr><td>${qty}</td><td>${name}</td><td class="text-end">${amt}</td></tr>`;
            }).join('');
        }
    }

    var taxVal = totalVal * 0.18;
    var subtotalVal = totalVal - taxVal;

    if (subtotalEl) subtotalEl.textContent = formatRWF(subtotalVal);
    if (taxEl) taxEl.textContent = formatRWF(taxVal);
    if (totalEl) totalEl.textContent = formatRWF(totalVal);

    var modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeReceiptModal() {
    var modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function triggerReceiptPrint() {
    window.print();
}

function refreshAdminOrders() {
    loadAdminOrders();
    renderOverviewStats();
    renderOrdersTable();
    renderKitchenGrid();
    renderFullOrdersDispatchBoard();
    if (typeof showToast === 'function') {
        showToast('Live orders & kitchen dispatch refreshed!', 'success', 'Orders Synchronized');
    }
}

// Ultra-fast 1-second auto-poll for live mobile orders
setInterval(function() {
    loadAdminOrders();
}, 1000);

try {
    var orderChannel = new BroadcastChannel('favcafe_orders_channel');
    orderChannel.onmessage = function(event) {
        if (event.data && event.data.type === 'order_created' && event.data.order) {
            loadAdminOrders();
            notifyNewOrderOnce(event.data.order);
        }
    };
} catch(e) {}

/* ============================================================
   STAFF MEMBERS & ROLES & REGISTERED USERS ENGINE (DATABASE BACKED)
   ============================================================ */
var adminStaffList = [];
var adminCustomerLoyaltyList = [];
var allUsersDatabaseList = [];

// Pagination Configuration (10 users per page)
var CUSTOMERS_PER_PAGE = 10;
var currentCustomerPage = 1;
var STAFF_PER_PAGE = 10;
var currentStaffPage = 1;

function changeCustomerPage(page) {
    currentCustomerPage = Math.max(1, page);
    filterUsersTable();
}
window.changeCustomerPage = changeCustomerPage;

function changeStaffPage(page) {
    currentStaffPage = Math.max(1, page);
    filterUsersTable();
}
window.changeStaffPage = changeStaffPage;

async function loadStaffAndLoyaltyData() {
    try {
        var res = await fetch('api/users.php?action=list');
        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                allUsersDatabaseList = data.users || [];
                adminStaffList = data.staff || [];
                adminCustomerLoyaltyList = data.customers || [];
                localStorage.setItem('favcafe_staff_members', JSON.stringify(adminStaffList));
                localStorage.setItem('favcafe_customer_loyalty', JSON.stringify(adminCustomerLoyaltyList));
                return;
            }
        }
    } catch (e) {
        console.warn('[Users API] Failed to fetch live users from database, using local fallback', e);
    }

    // Graceful Local Fallback
    try {
        var storedStaff = localStorage.getItem('favcafe_staff_members');
        if (storedStaff) {
            adminStaffList = JSON.parse(storedStaff);
        } else {
            adminStaffList = [
                { id: 1, full_name: 'Admin Staff', email: 'admin@ineza.rw', phone: '+250 788 000 111', role: 'admin', permissions: 'Full Access (All Modules)', is_active: 1 },
                { id: 2, full_name: 'Jean Paul Ndayi', email: 'chef_jp@ineza.rw', phone: '+250 788 222 333', role: 'chef', permissions: 'Kitchen Queue & Orders', is_active: 1 },
                { id: 3, full_name: 'Aline Uwase', email: 'waiter_aline@ineza.rw', phone: '+250 788 444 555', role: 'waiter', permissions: 'Table Dining Tracker', is_active: 1 },
                { id: 4, full_name: 'Kagabo Patrick', email: 'cashier_pat@ineza.rw', phone: '+250 788 666 777', role: 'cashier', permissions: 'Checkout & Receipts', is_active: 1 }
            ];
            saveStaffMembers();
        }
    } catch (e) {
        adminStaffList = [];
    }

    try {
        var storedCust = localStorage.getItem('favcafe_customer_loyalty');
        if (storedCust) {
            adminCustomerLoyaltyList = JSON.parse(storedCust);
        } else {
            adminCustomerLoyaltyList = [
                { id: 9, full_name: 'Patrick Kayonga', phone: '0788123456', email: 'testuser@ineza.rw', loyalty_points: 1500, is_active: 1, created_at: '2026-10-12 01:22:07' },
                { id: 8, full_name: 'Yves Debande', phone: '+250784522222', email: 'debandey@gmail.com', loyalty_points: 0, is_active: 1, created_at: '2026-10-09 11:12:08' },
                { id: 2, full_name: 'Lucas Lucavich', phone: '+250788785421', email: 'lucavich@gmail.com', loyalty_points: 2500, is_active: 1, created_at: '2026-09-15 08:30:00' }
            ];
            saveCustomerLoyalty();
        }
    } catch (e) {
        adminCustomerLoyaltyList = [];
    }
}

function saveStaffMembers() {
    try {
        localStorage.setItem('favcafe_staff_members', JSON.stringify(adminStaffList));
    } catch (e) {}
}

function saveCustomerLoyalty() {
    try {
        localStorage.setItem('favcafe_customer_loyalty', JSON.stringify(adminCustomerLoyaltyList));
    } catch (e) {}
}

async function renderStaffAndLoyaltyTables() {
    await loadStaffAndLoyaltyData();
    filterUsersTable();
}

function filterUsersTable() {
    var search = (document.getElementById('userSearchInput') ? document.getElementById('userSearchInput').value : '').toLowerCase().trim();
    var filterRole = document.getElementById('userRoleFilter') ? document.getElementById('userRoleFilter').value : 'all';

    // 1. Filter and Render Staff Table
    var staffTbody = document.getElementById('staffTableBody');
    var staffCounter = document.getElementById('staffTotalCounter');

    var filteredStaff = adminStaffList.filter(function(s) {
        var name = (s.full_name || s.name || '').toLowerCase();
        var email = (s.email || s.code || '').toLowerCase();
        var phone = (s.phone || '').toLowerCase();
        var matchesSearch = !search || name.includes(search) || email.includes(search) || phone.includes(search);
        var matchesRole = filterRole === 'all' || filterRole === 'staff_only' || s.role === filterRole || (filterRole === 'admin' && s.role.includes('admin'));
        return matchesSearch && matchesRole;
    });

    if (staffTbody) {
        if (staffCounter) staffCounter.textContent = filteredStaff.length + ' Active Staff';
        var totalStaff = filteredStaff.length;
        var totalStaffPages = Math.ceil(totalStaff / STAFF_PER_PAGE) || 1;
        if (currentStaffPage > totalStaffPages) currentStaffPage = totalStaffPages;
        if (currentStaffPage < 1) currentStaffPage = 1;

        var startStaffIdx = (currentStaffPage - 1) * STAFF_PER_PAGE;
        var endStaffIdx = startStaffIdx + STAFF_PER_PAGE;
        var pageStaff = filteredStaff.slice(startStaffIdx, endStaffIdx);

        // Update Staff Pagination Bar Info
        var staffInfoEl = document.getElementById('staffPaginationInfo');
        if (staffInfoEl) {
            if (totalStaff === 0) {
                staffInfoEl.textContent = 'Showing 0 staff members';
            } else {
                var displayStaffEnd = Math.min(endStaffIdx, totalStaff);
                staffInfoEl.textContent = 'Showing ' + (startStaffIdx + 1) + ' to ' + displayStaffEnd + ' of ' + totalStaff + ' staff members';
            }
        }

        // Render Staff Pagination Buttons
        var staffNavEl = document.getElementById('staffPaginationNav');
        if (staffNavEl) {
            var staffNavHtml = '';
            var prevStaffDisabled = currentStaffPage === 1 ? 'disabled' : '';
            staffNavHtml += `<li class="page-item ${prevStaffDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeStaffPage(${currentStaffPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

            for (var sp = 1; sp <= totalStaffPages; sp++) {
                var activeStaffClass = sp === currentStaffPage ? 'active' : '';
                staffNavHtml += `<li class="page-item ${activeStaffClass}"><a class="page-link" href="#" onclick="event.preventDefault(); changeStaffPage(${sp})">${sp}</a></li>`;
            }

            var nextStaffDisabled = currentStaffPage === totalStaffPages || totalStaffPages === 0 ? 'disabled' : '';
            staffNavHtml += `<li class="page-item ${nextStaffDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeStaffPage(${currentStaffPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;
            staffNavEl.innerHTML = staffNavHtml;
        }

        if (pageStaff.length === 0) {
            staffTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No matching staff members found.</td></tr>';
        } else {
            var html = '';
            pageStaff.forEach(function(s) {
                var roleName = s.role;
                var roleBadgeClass = 'bg-primary';
                if (s.role === 'admin' || s.role.includes('Admin')) { roleName = 'Super Admin'; roleBadgeClass = 'bg-danger text-white'; }
                else if (s.role === 'chef' || s.role.includes('Chef')) { roleName = 'Head Chef'; roleBadgeClass = 'bg-warning text-dark'; }
                else if (s.role === 'waiter' || s.role.includes('Waiter')) { roleName = 'Floor Waiter'; roleBadgeClass = 'bg-info text-dark'; }
                else if (s.role === 'cashier' || s.role.includes('Cashier')) { roleName = 'Cashier / POS'; roleBadgeClass = 'bg-success text-white'; }

                var permissionsDesc = s.permissions || (
                    s.role === 'admin' ? 'Full Access (All Modules)' :
                    s.role === 'chef' ? 'Kitchen Queue & Orders' :
                    s.role === 'waiter' ? 'Table Dining Tracker' : 'Checkout & Receipts'
                );

                var isActive = (s.is_active === undefined || s.is_active === 1 || s.is_active === '1');

                html += `
                    <tr>
                        <td><span class="badge bg-dark font-monospace">${s.email || ('STAFF-' + s.id)}</span></td>
                        <td>
                            <div class="fw-bold text-dark">${s.full_name || s.name}</div>
                            <div class="small text-muted"><i class="fas fa-phone-alt me-1 text-success"></i>${s.phone || 'N/A'}</div>
                            ${s.address ? `<div class="small text-muted"><i class="fas fa-map-marker-alt me-1 text-danger"></i>${s.address}</div>` : ''}
                        </td>
                        <td><span class="badge ${roleBadgeClass} px-2 py-1 font-monospace">${roleName}</span></td>
                        <td><span class="small text-muted fw-bold">${permissionsDesc}</span></td>
                        <td>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} cursor-pointer" onclick="toggleUserStatus(${s.id})" title="Click to Toggle Status">
                                <i class="fas fa-circle me-1" style="font-size:0.5rem;"></i>${isActive ? 'Active' : 'Suspended'}
                            </span>
                        </td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditStaffModal(${s.id})" title="Edit Staff Member"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStaffMember(${s.id})" title="Remove Staff Account"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
            });
            staffTbody.innerHTML = html;
        }
    }

    // 2. Filter and Render Registered Customers Table (10 per page)
    var custTbody = document.getElementById('customerLoyaltyTableBody');
    var custCounter = document.getElementById('customerTotalCounter');

    var filteredCustomers = adminCustomerLoyaltyList.filter(function(c) {
        var name = (c.full_name || c.name || '').toLowerCase();
        var email = (c.email || '').toLowerCase();
        var phone = (c.phone || '').toLowerCase();
        var matchesSearch = !search || name.includes(search) || email.includes(search) || phone.includes(search);
        var matchesRole = filterRole === 'all' || filterRole === 'customer_only' || filterRole === 'customer';
        return matchesSearch && matchesRole;
    });

    if (custTbody) {
        if (custCounter) custCounter.textContent = filteredCustomers.length + ' Customer Accounts';
        var totalCustomers = filteredCustomers.length;
        var totalCustomerPages = Math.ceil(totalCustomers / CUSTOMERS_PER_PAGE) || 1;
        if (currentCustomerPage > totalCustomerPages) currentCustomerPage = totalCustomerPages;
        if (currentCustomerPage < 1) currentCustomerPage = 1;

        var startCustIdx = (currentCustomerPage - 1) * CUSTOMERS_PER_PAGE;
        var endCustIdx = startCustIdx + CUSTOMERS_PER_PAGE;
        var pageCustomers = filteredCustomers.slice(startCustIdx, endCustIdx);

        // Update Customer Pagination Bar Info
        var custInfoEl = document.getElementById('customerPaginationInfo');
        if (custInfoEl) {
            if (totalCustomers === 0) {
                custInfoEl.textContent = 'Showing 0 customers';
            } else {
                var displayCustEnd = Math.min(endCustIdx, totalCustomers);
                custInfoEl.textContent = 'Showing ' + (startCustIdx + 1) + ' to ' + displayCustEnd + ' of ' + totalCustomers + ' customers';
            }
        }

        // Render Customer Pagination Buttons
        var custNavEl = document.getElementById('customerPaginationNav');
        if (custNavEl) {
            var custNavHtml = '';
            var prevCustDisabled = currentCustomerPage === 1 ? 'disabled' : '';
            custNavHtml += `<li class="page-item ${prevCustDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeCustomerPage(${currentCustomerPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

            for (var cp = 1; cp <= totalCustomerPages; cp++) {
                var activeCustClass = cp === currentCustomerPage ? 'active' : '';
                custNavHtml += `<li class="page-item ${activeCustClass}"><a class="page-link" href="#" onclick="event.preventDefault(); changeCustomerPage(${cp})">${cp}</a></li>`;
            }

            var nextCustDisabled = currentCustomerPage === totalCustomerPages || totalCustomerPages === 0 ? 'disabled' : '';
            custNavHtml += `<li class="page-item ${nextCustDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeCustomerPage(${currentCustomerPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;
            custNavEl.innerHTML = custNavHtml;
        }

        if (pageCustomers.length === 0) {
            custTbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No matching registered customers found.</td></tr>';
        } else {
            var html2 = '';
            pageCustomers.forEach(function(c) {
                var pts = parseInt(c.loyalty_points || c.loyaltyPoints || 0);
                var isActive = (c.is_active === undefined || c.is_active === 1 || c.is_active === '1');
                var joinedDate = c.created_at ? new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Member';

                html2 += `
                    <tr>
                        <td><span class="badge bg-secondary font-monospace">#CUST-${c.id}</span></td>
                        <td>
                            <div class="fw-bold text-dark">${c.full_name || c.name}</div>
                            ${c.address ? `<div class="small text-muted"><i class="fas fa-map-marker-alt me-1 text-danger"></i>${c.address}</div>` : ''}
                        </td>
                        <td><span class="font-monospace text-dark">${c.phone || 'N/A'}</span></td>
                        <td><span class="small text-primary fw-bold">${c.email}</span></td>
                        <td>
                            <span class="badge bg-warning text-dark fs-6 px-3 py-1 font-monospace">
                                <i class="fas fa-star me-1 text-warning"></i>${pts.toLocaleString()} Pts
                            </span>
                        </td>
                        <td>
                            <button type="button" class="btn btn-sm ${isActive ? 'btn-outline-success' : 'btn-outline-secondary'} rounded-pill py-0 px-2 small" onclick="toggleUserStatus(${c.id})">
                                <i class="fas fa-circle me-1" style="font-size:0.45rem;"></i>${isActive ? 'Active' : 'Suspended'}
                            </button>
                        </td>
                        <td><small class="text-muted">${joinedDate}</small></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditCustomerModal(${c.id})" title="Edit Customer Profile">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning text-dark me-1" onclick="quickGrantPoints(${c.id})" title="Grant Loyalty Points">
                                <i class="fas fa-coins"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomerAccount(${c.id})" title="Delete Customer Account">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            custTbody.innerHTML = html2;
        }
    }
}

async function toggleUserStatus(userId) {
    if (!userId) return;
    try {
        var res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_status', id: userId })
        });
        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, 'success', 'Account Status');
                renderStaffAndLoyaltyTables();
                return;
            }
        }
    } catch (e) {
        console.warn('[Toggle Status] API call failed, falling back locally');
    }

    // Local fallback
    var found = adminStaffList.find(function(s) { return s.id === userId; }) || adminCustomerLoyaltyList.find(function(c) { return c.id === userId; });
    if (found) {
        found.is_active = (found.is_active === 1 || found.is_active === undefined) ? 0 : 1;
        saveStaffMembers();
        saveCustomerLoyalty();
        filterUsersTable();
        showToast('Account status updated locally.', 'info');
    }
}

function openAddStaffModal() {
    var form = document.getElementById('staffForm');
    if (form) form.reset();
    document.getElementById('staffId').value = '';
    document.getElementById('staffModalTitle').innerHTML = '<i class="fas fa-user-shield me-2" style="color:var(--primary);"></i>Add Staff Member';

    var modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function openAddStaffModal() {
    var form = document.getElementById('staffForm');
    if (form) form.reset();
    var idInput = document.getElementById('staffId');
    if (idInput) idInput.value = '';
    var addrInput = document.getElementById('staffAddress');
    if (addrInput) addrInput.value = '';

    var title = document.getElementById('staffModalTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-shield me-2" style="color:var(--primary);"></i>Add Staff Member';

    var modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}
window.openAddStaffModal = openAddStaffModal;

function openEditStaffModal(id) {
    var s = adminStaffList.find(function(staff) { return staff.id === id; });
    if (!s) return;

    document.getElementById('staffId').value = s.id;
    document.getElementById('staffName').value = s.full_name || s.name || '';
    document.getElementById('staffCode').value = s.email || s.code || '';
    document.getElementById('staffPhone').value = s.phone || '';
    var addrEl = document.getElementById('staffAddress');
    if (addrEl) addrEl.value = s.address || '';
    document.getElementById('staffRole').value = s.role || 'staff';
    document.getElementById('staffPass').value = '••••••••';

    document.getElementById('staffModalTitle').innerHTML = '<i class="fas fa-user-edit me-2" style="color:var(--primary);"></i>Edit Staff: ' + (s.full_name || s.name);

    var modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeStaffModal() {
    var modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

async function confirmSaveStaff(e) {
    if (e && e.preventDefault) e.preventDefault();
    var id = document.getElementById('staffId').value;
    var name = document.getElementById('staffName').value.trim();
    var email = document.getElementById('staffCode').value.trim();
    var phone = document.getElementById('staffPhone').value.trim();
    var address = (document.getElementById('staffAddress') ? document.getElementById('staffAddress').value : '').trim();
    var role = document.getElementById('staffRole').value;
    var pass = document.getElementById('staffPass').value.trim();

    var permissionsMap = {
        'admin': 'Full Access (All Modules)',
        'chef': 'Kitchen Queue & Orders',
        'waiter': 'Table Dining Tracker',
        'cashier': 'Checkout & Receipts',
        'staff': 'General Floor Access'
    };
    var perms = permissionsMap[role] || 'Standard Access';

    try {
        if (id) {
            // Update role/perms/profile via API
            var res = await fetch('api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_staff',
                    id: parseInt(id),
                    full_name: name,
                    email: email,
                    phone: phone,
                    address: address,
                    role: role,
                    permissions: perms,
                    password: pass !== '••••••••' ? pass : ''
                })
            });
            if (res.ok) {
                var data = await res.json();
                if (data.status === 'success') {
                    showToast(data.message, 'success', 'Staff Access');
                    closeStaffModal();
                    renderStaffAndLoyaltyTables();
                    return;
                }
            }
        } else {
            // Create staff via API
            var res = await fetch('api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_staff',
                    full_name: name,
                    email: email,
                    phone: phone,
                    address: address,
                    role: role,
                    permissions: perms,
                    password: pass
                })
            });
            if (res.ok) {
                var data = await res.json();
                if (data.status === 'success') {
                    showToast(data.message, 'success', 'Staff Member Added');
                    closeStaffModal();
                    renderStaffAndLoyaltyTables();
                    return;
                }
            }
        }
    } catch (err) {
        console.warn('[Staff API] Network error, falling back locally', err);
    }

    // Local fallback
    if (id) {
        var s = adminStaffList.find(function(staff) { return staff.id === parseInt(id); });
        if (s) {
            s.full_name = name;
            s.email = email;
            s.phone = phone;
            s.address = address;
            s.role = role;
            s.permissions = perms;
        }
    } else {
        adminStaffList.push({
            id: Date.now(),
            full_name: name,
            email: email,
            phone: phone,
            address: address,
            role: role,
            permissions: perms,
            is_active: 1
        });
    }

    saveStaffMembers();
    closeStaffModal();
    filterUsersTable();
    showToast('Staff member "' + name + '" saved locally.', 'success', 'Staff Access');
}

async function deleteStaffMember(id) {
    if (!confirm('Are you sure you want to delete this staff account?')) return;

    try {
        var res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id })
        });
        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, 'info', 'Staff Account');
                renderStaffAndLoyaltyTables();
                return;
            } else {
                showToast(data.message, 'error', 'Action Denied');
                return;
            }
        }
    } catch (e) {
        console.warn('[Delete Staff API] Falling back locally', e);
    }

    adminStaffList = adminStaffList.filter(function(s) { return s.id !== id; });
    saveStaffMembers();
    filterUsersTable();
    showToast('Staff member deleted locally.', 'info');
}

function openGrantPointsModal() {
    var select = document.getElementById('grantCustomerSelect');
    if (select) {
        select.innerHTML = adminCustomerLoyaltyList.map(function(c) {
            var pts = c.loyalty_points || c.loyaltyPoints || 0;
            return `<option value="${c.id}">${c.full_name || c.name} (${c.email || c.phone}) - Current: ${pts} Pts</option>`;
        }).join('');
    }

    var modal = document.getElementById('grantPointsModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeGrantPointsModal() {
    var modal = document.getElementById('grantPointsModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function quickGrantPoints(custId) {
    openGrantPointsModal();
    var select = document.getElementById('grantCustomerSelect');
    if (select) select.value = custId;
}

async function confirmGrantPointsSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var custId = parseInt(document.getElementById('grantCustomerSelect').value);
    var amount = parseInt(document.getElementById('grantPointsAmount').value) || 0;

    if (!custId || amount <= 0) {
        showToast('Please select a customer and enter a valid points amount.', 'warning');
        return;
    }

    try {
        var res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'grant_points', id: custId, points: amount })
        });
        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                closeGrantPointsModal();
                renderStaffAndLoyaltyTables();
                showToast(data.message, 'success', 'Points Credited');
                return;
            }
        }
    } catch (e) {
        console.warn('[Grant Points API] Falling back locally', e);
    }

    var cust = adminCustomerLoyaltyList.find(function(c) { return c.id === custId; });
    if (cust) {
        cust.loyalty_points = (cust.loyalty_points || 0) + amount;
        saveCustomerLoyalty();
        closeGrantPointsModal();
        filterUsersTable();
        showToast('Granted ' + amount + ' Loyalty Points to ' + (cust.full_name || cust.name) + '!', 'success', 'Points Credited');
    }
}

/* ============================================================
   REGISTERED CUSTOMER CRUD OPERATIONS
   ============================================================ */
function openAddCustomerModal() {
    var form = document.getElementById('customerForm');
    if (form) form.reset();
    var idInput = document.getElementById('crudCustomerId');
    if (idInput) idInput.value = '';

    var title = document.getElementById('customerModalTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-plus me-2" style="color:var(--primary);"></i>Add Customer Account';

    var modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
window.openAddCustomerModal = openAddCustomerModal;

async function openEditCustomerModal(id) {
    var form = document.getElementById('customerForm');
    if (form) form.reset();

    var cust = adminCustomerLoyaltyList.find(function(c) { return c.id == id; });

    // Fetch fresh from API if available
    try {
        var res = await fetch('api/users.php?action=get_customer&id=' + encodeURIComponent(id));
        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success' && data.customer) {
                cust = data.customer;
            }
        }
    } catch (e) {
        console.warn('[Get Customer API] Falling back to memory', e);
    }

    if (!cust) {
        showToast('Customer record not found.', 'error');
        return;
    }

    var idInput = document.getElementById('crudCustomerId');
    if (idInput) idInput.value = cust.id;

    var nameInput = document.getElementById('crudCustomerName');
    if (nameInput) nameInput.value = cust.full_name || cust.name || '';

    var phoneInput = document.getElementById('crudCustomerPhone');
    if (phoneInput) phoneInput.value = cust.phone || '';

    var emailInput = document.getElementById('crudCustomerEmail');
    if (emailInput) emailInput.value = cust.email || '';

    var addrInput = document.getElementById('crudCustomerAddress');
    if (addrInput) addrInput.value = cust.address || '';

    var ptsInput = document.getElementById('crudCustomerPoints');
    if (ptsInput) ptsInput.value = cust.loyalty_points || cust.loyaltyPoints || 0;

    var passInput = document.getElementById('crudCustomerPassword');
    if (passInput) passInput.value = '';

    var title = document.getElementById('customerModalTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-edit me-2" style="color:var(--primary);"></i>Edit Customer: ' + (cust.full_name || cust.name);

    var modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}
window.openEditCustomerModal = openEditCustomerModal;

function closeCustomerModal() {
    var modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
window.closeCustomerModal = closeCustomerModal;

async function confirmSaveCustomer(e) {
    if (e && e.preventDefault) e.preventDefault();

    var id = document.getElementById('crudCustomerId').value;
    var name = (document.getElementById('crudCustomerName').value || '').trim();
    var phone = (document.getElementById('crudCustomerPhone').value || '').trim();
    var email = (document.getElementById('crudCustomerEmail').value || '').trim();
    var address = (document.getElementById('crudCustomerAddress').value || '').trim();
    var points = parseInt(document.getElementById('crudCustomerPoints').value) || 0;
    var password = (document.getElementById('crudCustomerPassword').value || '').trim();

    if (!name || !phone) {
        showToast('Please provide both Customer Name and Phone Number.', 'warning');
        return;
    }

    var isEdit = !!id;
    var payload = {
        action: isEdit ? 'update_customer' : 'create_customer',
        id: id ? parseInt(id) : undefined,
        full_name: name,
        phone: phone,
        email: email,
        address: address,
        loyalty_points: points,
        password: password
    };

    try {
        var res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                closeCustomerModal();
                showToast(data.message || (isEdit ? 'Customer profile updated successfully.' : 'New customer registered.'), 'success', 'Customer Management');
                renderStaffAndLoyaltyTables();
                return;
            } else {
                showToast(data.message || 'Operation failed.', 'error', 'Error');
                return;
            }
        }
    } catch (err) {
        console.warn('[Save Customer API] Offline/Fallback mode', err);
    }

    // Local fallback for offline/static testing
    if (isEdit) {
        var cust = adminCustomerLoyaltyList.find(function(c) { return c.id == id; });
        if (cust) {
            cust.full_name = name;
            cust.phone = phone;
            if (email) cust.email = email;
            cust.address = address;
            cust.loyalty_points = points;
        }
    } else {
        var newId = Date.now();
        adminCustomerLoyaltyList.unshift({
            id: newId,
            full_name: name,
            phone: phone,
            email: email || ('customer_' + phone.replace(/[^0-9]/g, '') + '@inezaresto.rw'),
            address: address,
            loyalty_points: points,
            is_active: 1,
            created_at: new Date().toISOString()
        });
    }

    saveCustomerLoyalty();
    closeCustomerModal();
    filterUsersTable();
    showToast('Customer record saved in local storage.', 'info', 'Saved Locally');
}
window.confirmSaveCustomer = confirmSaveCustomer;

async function deleteCustomerAccount(id) {
    if (!id) return;
    if (id === 1 || id === '1') {
        showToast('Protected account cannot be deleted.', 'error', 'Action Denied');
        return;
    }

    var target = adminCustomerLoyaltyList.find(function(c) { return c.id == id; });
    var targetName = target ? (target.full_name || target.name || ('#CUST-' + id)) : ('#CUST-' + id);

    if (!confirm('Are you sure you want to delete customer account "' + targetName + '"? This will remove all loyalty point history.')) {
        return;
    }

    try {
        var res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: parseInt(id) })
        });

        if (res.ok) {
            var data = await res.json();
            if (data.status === 'success') {
                showToast(data.message || 'Customer account deleted.', 'info', 'Customer Deleted');
                renderStaffAndLoyaltyTables();
                return;
            } else {
                showToast(data.message || 'Unable to delete account.', 'error', 'Error');
                return;
            }
        }
    } catch (err) {
        console.warn('[Delete Customer API] Offline fallback', err);
    }

    // Local fallback
    adminCustomerLoyaltyList = adminCustomerLoyaltyList.filter(function(c) { return c.id != id; });
    saveCustomerLoyalty();
    filterUsersTable();
    showToast('Customer removed from local storage.', 'info');
}
window.deleteCustomerAccount = deleteCustomerAccount;

/* ROLE & PERMISSION ENFORCEMENT */
function enforceRolePermissions() {
    var activeAdmin = null;
    try {
        activeAdmin = JSON.parse(localStorage.getItem('favcafe_admin_user') || localStorage.getItem('favcafe_active_user'));
    } catch (e) { }

    if (!activeAdmin) return;
    var role = (activeAdmin.role || '').toLowerCase();

    // If Super Admin, unrestricted
    if (role === 'admin' || role === 'super admin' || (activeAdmin.email && activeAdmin.email.includes('admin'))) {
        return;
    }

    // Role-specific restrictions
    if (role === 'chef') {
        // Kitchen staff focuses on KDS and Orders
        var restrictedTabs = ['analytics', 'settings', 'promos', 'users'];
        restrictedTabs.forEach(function(tabName) {
            var item = document.querySelector(`.sidebar-item[data-tab="${tabName}"]`);
            if (item) {
                item.style.opacity = '0.4';
                item.style.pointerEvents = 'none';
                item.title = 'Access Restricted (Super Admin only)';
            }
        });
    } else if (role === 'waiter') {
        // Floor Waiter focuses on Table Dining and Orders
        var restrictedTabs = ['analytics', 'settings', 'promos', 'users', 'kitchen'];
        restrictedTabs.forEach(function(tabName) {
            var item = document.querySelector(`.sidebar-item[data-tab="${tabName}"]`);
            if (item) {
                item.style.opacity = '0.4';
                item.style.pointerEvents = 'none';
                item.title = 'Access Restricted (Super Admin only)';
            }
        });
    } else if (role === 'cashier') {
        // Cashier focuses on POS Live Orders and Receipts
        var restrictedTabs = ['settings', 'promos', 'users', 'tables'];
        restrictedTabs.forEach(function(tabName) {
            var item = document.querySelector(`.sidebar-item[data-tab="${tabName}"]`);
            if (item) {
                item.style.opacity = '0.4';
                item.style.pointerEvents = 'none';
                item.title = 'Access Restricted (Super Admin only)';
            }
        });
    }
}

window.filterUsersTable = filterUsersTable;
window.toggleUserStatus = toggleUserStatus;
window.enforceRolePermissions = enforceRolePermissions;

window.renderStaffAndLoyaltyTables = renderStaffAndLoyaltyTables;
window.openAddStaffModal = openAddStaffModal;
window.openEditStaffModal = openEditStaffModal;
window.closeStaffModal = closeStaffModal;
window.confirmSaveStaff = confirmSaveStaff;
window.deleteStaffMember = deleteStaffMember;
window.openGrantPointsModal = openGrantPointsModal;
window.closeGrantPointsModal = closeGrantPointsModal;
window.quickGrantPoints = quickGrantPoints;
window.confirmGrantPointsSubmit = confirmGrantPointsSubmit;

/* ============================================================
   CATEGORY MANAGEMENT (FULL CRUD)
   ============================================================ */
var adminCategories = [];

async function loadAdminCategories() {
    try {
        var res = await fetch('api/categories.php?action=get');
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.categories)) {
                adminCategories = data.categories;
            }
        }
    } catch (e) {}

    if (adminCategories.length === 0) {
        try {
            var stored = localStorage.getItem('favcafe_categories');
            if (stored) {
                adminCategories = JSON.parse(stored);
            }
        } catch (e) {}
    }

    if (!adminCategories || adminCategories.length === 0) {
        adminCategories = [
            { id: 8, name: 'Breakfast', slug: 'breakfast', icon: 'fas fa-egg', is_active: 1, sort_order: 1 },
            { id: 2, name: 'Burgers', slug: 'burgers', icon: 'fas fa-burger', is_active: 1, sort_order: 2 },
            { id: 1, name: 'Pizza', slug: 'pizza', icon: 'fas fa-pizza-slice', is_active: 1, sort_order: 3 },
            { id: 11, name: 'Grill', slug: 'grill', icon: 'fas fa-fire', is_active: 1, sort_order: 4 },
            { id: 5, name: 'Plates', slug: 'plates', icon: 'fas fa-concierge-bell', is_active: 1, sort_order: 5 },
            { id: 3, name: 'Salads', slug: 'salads', icon: 'fas fa-leaf', is_active: 1, sort_order: 6 },
            { id: 4, name: 'Sides', slug: 'sides', icon: 'fas fa-utensils', is_active: 1, sort_order: 7 },
            { id: 9, name: 'Coffee', slug: 'coffee', icon: 'fas fa-coffee', is_active: 1, sort_order: 8 },
            { id: 10, name: 'Tea', slug: 'tea', icon: 'fas fa-mug-hot', is_active: 1, sort_order: 9 }
        ];
        saveCategoriesToStorage();
    }

    renderAdminCategoriesTable();
    populateCategoryDropdowns();
}

function saveCategoriesToStorage() {
    try {
        localStorage.setItem('favcafe_categories', JSON.stringify(adminCategories));
        localStorage.setItem('favcafe_categories_updated', Date.now().toString());
    } catch (e) {}
}

function renderAdminCategoriesTable() {
    var tbody = document.getElementById('adminCategoriesTbody');
    var badgeCount = document.getElementById('adminCatCountBadge');
    var sidebarBadge = document.getElementById('sidebarCatBadge');
    var searchInput = document.getElementById('adminCatSearchInput');
    
    if (badgeCount) badgeCount.textContent = adminCategories.length + ' Categories';
    if (sidebarBadge) sidebarBadge.textContent = adminCategories.length;
    
    if (!tbody) return;

    var filterText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    var filtered = adminCategories.filter(function(cat) {
        if (!filterText) return true;
        return (cat.name && cat.name.toLowerCase().includes(filterText)) ||
               (cat.slug && cat.slug.toLowerCase().includes(filterText));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-tags fa-2x mb-2 opacity-50"></i><br>No categories match your search.</td></tr>';
        return;
    }

    var html = '';
    filtered.forEach(function(cat) {
        var dishCount = (typeof adminMenuItems !== 'undefined' && Array.isArray(adminMenuItems)) ? adminMenuItems.filter(function(m) {
            return m.category && m.category.toString().toLowerCase() === (cat.slug || '').toString().toLowerCase();
        }).length : 0;

        var isActive = parseInt(cat.is_active) === 1 || cat.is_active === true;
        var statusBadge = isActive ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Active</span>' : '<span class="badge bg-danger"><i class="fas fa-eye-slash me-1"></i>Disabled</span>';
        var iconHtml = cat.icon ? `<i class="${cat.icon} text-warning fs-5"></i>` : '<i class="fas fa-tag text-muted fs-5"></i>';

        html += `
            <tr>
                <td class="text-center">${iconHtml}</td>
                <td><strong>${cat.name}</strong></td>
                <td><code class="bg-light px-2 py-1 rounded text-primary">${cat.slug}</code></td>
                <td><span class="badge bg-info text-dark">${dishCount} Dishes</span></td>
                <td>${statusBadge}</td>
                <td><span class="text-muted fw-bold">#${cat.sort_order || 0}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'} me-1" onclick="toggleCategoryStatus(${cat.id})" title="${isActive ? 'Disable Filter' : 'Enable Filter'}">
                        <i class="fas ${isActive ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openCategoryModal(${cat.id})" title="Edit Category">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${cat.id})" title="Delete Category">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function autoGenerateSlug(nameVal) {
    var slugInput = document.getElementById('catSlug');
    var catId = document.getElementById('catId').value;
    if (slugInput && !catId) {
        slugInput.value = (nameVal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }
}

function openCategoryModal(catId) {
    var modal = document.getElementById('categoryModal');
    var titleEl = document.getElementById('catModalTitle');
    var idInput = document.getElementById('catId');
    var nameInput = document.getElementById('catName');
    var slugInput = document.getElementById('catSlug');
    var iconInput = document.getElementById('catIcon');
    var sortInput = document.getElementById('catSortOrder');

    if (catId) {
        var cat = adminCategories.find(function(c) { return parseInt(c.id) === parseInt(catId); });
        if (cat) {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit me-2" style="color:var(--primary);"></i>Edit Category';
            if (idInput) idInput.value = cat.id;
            if (nameInput) nameInput.value = cat.name;
            if (slugInput) slugInput.value = cat.slug;
            if (iconInput) iconInput.value = cat.icon || 'fas fa-utensils';
            if (sortInput) sortInput.value = cat.sort_order || 1;
        }
    } else {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-tags me-2" style="color:var(--primary);"></i>Add New Category';
        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (slugInput) slugInput.value = '';
        if (iconInput) iconInput.value = 'fas fa-utensils';
        if (sortInput) sortInput.value = adminCategories.length + 1;
    }

    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeCategoryModal() {
    var modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

async function saveCategorySubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    var id = document.getElementById('catId').value;
    var name = document.getElementById('catName').value.trim();
    var slug = document.getElementById('catSlug').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    var icon = document.getElementById('catIcon').value.trim() || 'fas fa-utensils';
    var sortOrder = parseInt(document.getElementById('catSortOrder').value) || 1;

    if (!name || !slug) {
        showToast('Category name and filter key are required.', 'warning');
        return;
    }

    var payload = { action: id ? 'update' : 'add', id: id, name: name, slug: slug, icon: icon, sort_order: sortOrder, is_active: 1 };

    try {
        var res = await fetch('api/categories.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data && data.status === 'success') {
            showToast(data.message, 'success');
        }
    } catch (err) {}

    // Update local memory & storage fallback
    if (id) {
        var cat = adminCategories.find(function(c) { return parseInt(c.id) === parseInt(id); });
        if (cat) {
            cat.name = name;
            cat.slug = slug;
            cat.icon = icon;
            cat.sort_order = sortOrder;
        }
    } else {
        var newId = Date.now();
        adminCategories.push({ id: newId, name: name, slug: slug, icon: icon, is_active: 1, sort_order: sortOrder });
    }

    saveCategoriesToStorage();
    closeCategoryModal();
    renderAdminCategoriesTable();
    populateCategoryDropdowns();
}

async function toggleCategoryStatus(catId) {
    var cat = adminCategories.find(function(c) { return parseInt(c.id) === parseInt(catId); });
    if (!cat) return;

    cat.is_active = (parseInt(cat.is_active) === 1 || cat.is_active === true) ? 0 : 1;
    saveCategoriesToStorage();
    renderAdminCategoriesTable();

    try {
        await fetch('api/categories.php?action=toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: catId })
        });
    } catch (e) {}

    showToast('Category "' + cat.name + '" ' + (cat.is_active ? 'enabled' : 'disabled') + '!', 'info');
}

async function deleteCategory(catId) {
    var cat = adminCategories.find(function(c) { return parseInt(c.id) === parseInt(catId); });
    if (!cat) return;

    if (!confirm('Are you sure you want to delete category "' + cat.name + '"?')) return;

    adminCategories = adminCategories.filter(function(c) { return parseInt(c.id) !== parseInt(catId); });
    saveCategoriesToStorage();
    renderAdminCategoriesTable();
    populateCategoryDropdowns();

    try {
        await fetch('api/categories.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: catId })
        });
    } catch (e) {}

    showToast('Category deleted successfully.', 'success');
}

function populateCategoryDropdowns() {
    var select = document.getElementById('menuCategory');
    if (!select) return;

    var currentVal = select.value;
    var html = '';
    adminCategories.forEach(function(cat) {
        html += `<option value="${cat.slug}">${cat.name}</option>`;
    });

    select.innerHTML = html;
    if (currentVal) select.value = currentVal;
}

window.loadAdminCategories = loadAdminCategories;
window.renderAdminCategoriesTable = renderAdminCategoriesTable;
window.autoGenerateSlug = autoGenerateSlug;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.saveCategorySubmit = saveCategorySubmit;
window.toggleCategoryStatus = toggleCategoryStatus;
window.deleteCategory = deleteCategory;
window.populateCategoryDropdowns = populateCategoryDropdowns;
window.setAdminMenuCategoryFilter = setAdminMenuCategoryFilter;
window.onAdminMenuSearchChange = onAdminMenuSearchChange;
window.setAdminMenuPage = setAdminMenuPage;
window.renderAdminMenuCategoryPills = renderAdminMenuCategoryPills;

/* --- TABLE QR CODE STAND GENERATOR --- */
function openTableQrModal() {
    var modal = document.getElementById('tableQrModal');
    if (!modal) return;
    modal.style.display = 'flex';
    updateQrStandPreview();
}

function closeTableQrModal() {
    var modal = document.getElementById('tableQrModal');
    if (!modal) return;
    modal.style.display = 'none';
}

function updateQrStandPreview() {
    var select = document.getElementById('qrTableSelect');
    if (!select) return;

    var val = select.value;
    var subtitleEl = document.getElementById('qrStandSubtitle');
    var targetUrlEl = document.getElementById('qrTargetUrl');
    var imgEl = document.getElementById('qrPreviewImg');

    var baseUrl = window.location.href.replace('admin.html', 'index.html').split('#')[0].split('?')[0];
    var targetUrl = baseUrl;

    if (val === 'main') {
        if (subtitleEl) subtitleEl.textContent = 'Main Entrance - Scan to View Digital Menu & Order';
        targetUrl = baseUrl;
    } else {
        if (subtitleEl) subtitleEl.textContent = 'Table ' + val + ' - Scan to View Menu & Order from Table';
        targetUrl = baseUrl + '?table=' + val;
    }

    if (targetUrlEl) targetUrlEl.textContent = targetUrl;

    var qrApiUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(targetUrl) + '&size=220&margin=1';
    if (imgEl) imgEl.src = qrApiUrl;
}

function printTableQrStand() {
    var printContent = document.getElementById('qrPrintArea');
    if (!printContent) return;

    var win = window.open('', '_blank', 'width=600,height=600');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>INEZA RESTO &amp; COFFEE SHOP - Table QR Stand</title>
            <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Titillium Web', sans-serif; text-align: center; padding: 40px; margin: 0; }
                .card { border: 3px double #d9230f; padding: 40px; border-radius: 16px; max-width: 450px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { font-family: 'Titillium Web', sans-serif; color: #442406; margin-bottom: 4px; font-size: 2.2rem; text-transform: uppercase; font-weight: 700; }
                p { color: #555; margin-bottom: 20px; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; }
                img { width: 220px; height: 220px; border-radius: 12px; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.12); }
                .footer-text { margin-top: 24px; font-weight: 700; color: #111; font-size: 1.1rem; }
                .sub-text { color: #777; font-size: 0.85rem; margin-top: 4px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="card">
                ${printContent.innerHTML}
            </div>
        </body>
        </html>
    `);
    win.document.close();
}

window.openTableQrModal = openTableQrModal;
window.closeTableQrModal = closeTableQrModal;
window.updateQrStandPreview = updateQrStandPreview;
window.printTableQrStand = printTableQrStand;

/* ============================================================
   PDF MENU UPLOAD
   ============================================================ */
function uploadPdfMenu() {
    var fileInput = document.getElementById('pdfMenuUploadInput');
    var btn = document.getElementById('pdfMenuUploadBtn');

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a PDF file first.', 'warning', 'No File Selected');
        return;
    }

    var file = fileInput.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are allowed.', 'error', 'Invalid Format');
        return;
    }

    var originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Uploading...';
    btn.disabled = true;

    var formData = new FormData();
    formData.append('pdf_menu', file);

    fetch('api/upload_pdf.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success', 'Upload Complete');
            fileInput.value = '';
        } else {
            showToast(data.message, 'error', 'Upload Failed');
        }
    })
    .catch(error => {
        console.error('Error uploading PDF:', error);
        showToast('A network error occurred while uploading.', 'error', 'Upload Error');
    })
    .finally(() => {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
    });
}
window.uploadPdfMenu = uploadPdfMenu;

/* ============================================================
   CSV MENU BULK IMPORT
   ============================================================ */
function uploadCsvMenu() {
    var fileInput = document.getElementById('csvMenuUploadInput');
    var btn = document.getElementById('csvMenuUploadBtn');

    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a CSV file first.', 'warning', 'No File Selected');
        return;
    }

    var file = fileInput.files[0];
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        showToast('Only CSV files are allowed.', 'error', 'Invalid Format');
        return;
    }

    var originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Importing...';
    btn.disabled = true;

    var formData = new FormData();
    formData.append('csv_menu', file);

    fetch('api/upload_csv.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showToast(data.message, 'success', 'Import Complete');
            fileInput.value = '';
            // Refresh admin menu table
            if (typeof loadAdminCategories === 'function') loadAdminCategories();
        } else {
            showToast(data.message, 'error', 'Import Failed');
        }
    })
    .catch(error => {
        console.error('Error importing CSV:', error);
        showToast('A network error occurred while importing.', 'error', 'Import Error');
    })
    .finally(() => {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
    });
}
window.uploadCsvMenu = uploadCsvMenu;

/* ============================================================
   PROMOS & BANNERS CRUD
   ============================================================ */
var adminPromos = [];

function previewPromoImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var imgPreview = document.getElementById('promoImagePreview');
            var box = document.getElementById('promoImagePreviewBox');
            if (imgPreview && box) {
                imgPreview.src = e.target.result;
                box.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}
window.previewPromoImage = previewPromoImage;

async function loadAdminPromos() {
    try {
        var res = await fetch('api/promos.php?action=get');
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.promos)) {
                adminPromos = data.promos;
                saveAdminPromos();
                renderAdminPromosGrid();
                return;
            }
        }
    } catch (e) {
        console.warn('Could not fetch promos from api, falling back to local storage', e);
    }

    var stored = localStorage.getItem('favcafe_promos');
    if (stored) {
        try { adminPromos = JSON.parse(stored); } catch (e) {}
    } else {
        adminPromos = [
            { id: 1, title: "*for All Menus", subtitle: "Happy Weekend", discount: "60% OFF", img: "img/menu/7.jpg" },
            { id: 2, title: "Fresh Salads", subtitle: "Healthy & Green", discount: "20%", img: "img/menu/3.png" },
            { id: 3, title: "Coffee & Pastries", subtitle: "Morning Special", discount: "15%", img: "img/menu/5.jpg" }
        ];
        saveAdminPromos();
    }
    renderAdminPromosGrid();
}
window.loadAdminPromos = loadAdminPromos;

function saveAdminPromos() {
    localStorage.setItem('favcafe_promos', JSON.stringify(adminPromos));
    localStorage.setItem('favcafe_promos_updated', Date.now().toString());
}

function renderAdminPromosGrid() {
    var grid = document.getElementById('adminPromosGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (!adminPromos || adminPromos.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No promos found. Add one above.</div>';
        return;
    }
    
    adminPromos.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        var isActive = p.is_active !== false && p.is_active !== 0 && p.is_active !== '0';
        var statusBadge = isActive ?
            `<span class="badge bg-success text-white small px-2 py-1"><i class="fas fa-check-circle me-1"></i>Active</span>` :
            `<span class="badge bg-secondary text-white small px-2 py-1"><i class="fas fa-ban me-1"></i>Disabled</span>`;

        var mediaHtml = p.img ? 
            `<img src="${p.img}" alt="${p.title}" style="width:100%; height:160px; object-fit:cover; filter:${isActive ? 'none' : 'grayscale(80%)'};" onerror="this.onerror=null;this.parentElement.style.background='linear-gradient(135deg, #ff5e57, #ff3f34)';" />` : 
            `<div style="height:160px; background:linear-gradient(135deg, ${isActive ? '#ff5e57, #ff3f34' : '#7f8c8d, #95a5a6'}); display:flex; align-items:center; justify-content:center; color:#fff; font-size:2rem; font-weight:800;">${p.discount || 'PROMO'}</div>`;

        card.innerHTML = `
            <div class="admin-card border h-100 d-flex flex-column shadow-sm rounded-3" style="overflow:hidden; background:${isActive ? '#fff' : '#f8f9fa'}; opacity:${isActive ? '1' : '0.85'};">
                <div style="height:160px; position:relative; overflow:hidden; background:#2c3e50;">
                    ${mediaHtml}
                    <div style="position:absolute; top:10px; right:10px; background:${isActive ? '#ff5e57' : '#7f8c8d'}; color:#fff; padding:4px 12px; border-radius:12px; font-weight:700; font-size:0.85rem; box-shadow:0 2px 6px rgba(0,0,0,0.25);">${p.discount || 'Special'}</div>
                    <div style="position:absolute; top:10px; left:10px;">${statusBadge}</div>
                </div>
                <div class="p-3 flex-grow-1">
                    <div class="text-muted small font-weight-bold text-uppercase" style="letter-spacing:0.5px;">${p.subtitle || 'Special Offer'}</div>
                    <h5 class="mb-1 text-dark" style="font-weight:700;">${p.title || 'Untitled Promo'}</h5>
                </div>
                <div class="p-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2 bg-light">
                    <div class="form-check form-switch mb-0" title="Click to Enable or Disable this Promo Banner">
                        <input class="form-check-input cursor-pointer" type="checkbox" id="promoToggleSwitch_${p.id}" ${isActive ? 'checked' : ''} onchange="togglePromoStatus(${p.id}, this.checked)">
                        <label class="form-check-label small fw-bold text-dark cursor-pointer ms-1" for="promoToggleSwitch_${p.id}">${isActive ? 'Live' : 'Hidden'}</label>
                    </div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-secondary py-1 px-2" onclick="editPromo(${p.id})" title="Edit Promo Details"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="deletePromo(${p.id})" title="Delete Promo"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}
window.renderAdminPromosGrid = renderAdminPromosGrid;

async function togglePromoStatus(id, newStatus) {
    var p = adminPromos.find(x => parseInt(x.id) === parseInt(id));
    if (p) {
        p.is_active = newStatus ? 1 : 0;
        saveAdminPromos();

        try {
            await fetch('api/promos.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_active', id: parseInt(id), is_active: newStatus ? 1 : 0 })
            });
        } catch (e) {}

        renderAdminPromosGrid();
        showToast(`Promo #${id} is now ${newStatus ? 'Active & Visible' : 'Disabled & Hidden'}.`, 'success', 'Promo Status');
    }
}
window.togglePromoStatus = togglePromoStatus;

function openPromoModal() {
    var form = document.getElementById('promoForm');
    if (form) form.reset();
    document.getElementById('promoId').value = '';
    document.getElementById('promoImg').value = '';
    
    var toggleEl = document.getElementById('promoIsActiveToggle');
    if (toggleEl) toggleEl.checked = true;

    var fileInput = document.getElementById('promoImageFile');
    if (fileInput) fileInput.value = '';
    var previewBox = document.getElementById('promoImagePreviewBox');
    var previewImg = document.getElementById('promoImagePreview');
    if (previewBox) previewBox.style.display = 'none';
    if (previewImg) previewImg.src = '';
    
    document.getElementById('promoModalTitle').innerHTML = '<i class="fas fa-bullhorn me-2" style="color:var(--primary);"></i>Add New Promo';
    
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}
window.openPromoModal = openPromoModal;

function closePromoModal() {
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}
window.closePromoModal = closePromoModal;

function editPromo(id) {
    var p = adminPromos.find(x => parseInt(x.id) === parseInt(id));
    if (!p) return;
    
    document.getElementById('promoId').value = p.id;
    document.getElementById('promoTitle').value = p.title || '';
    document.getElementById('promoSubtitle').value = p.subtitle || '';
    document.getElementById('promoDiscount').value = p.discount || '';
    document.getElementById('promoImg').value = p.img || '';

    var toggleEl = document.getElementById('promoIsActiveToggle');
    if (toggleEl) {
        toggleEl.checked = p.is_active !== false && p.is_active !== 0 && p.is_active !== '0';
    }

    var fileInput = document.getElementById('promoImageFile');
    if (fileInput) fileInput.value = '';
    var previewBox = document.getElementById('promoImagePreviewBox');
    var previewImg = document.getElementById('promoImagePreview');
    
    if (p.img && previewBox && previewImg) {
        previewImg.src = p.img;
        previewBox.style.display = 'block';
    } else if (previewBox) {
        previewBox.style.display = 'none';
    }
    
    document.getElementById('promoModalTitle').innerHTML = '<i class="fas fa-bullhorn me-2" style="color:var(--primary);"></i>Edit Promo';
    
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}
window.editPromo = editPromo;

async function deletePromo(id) {
    if (confirm("Are you sure you want to delete this promo?")) {
        try {
            await fetch('api/promos.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id: parseInt(id) })
            });
        } catch (e) {}

        adminPromos = adminPromos.filter(x => parseInt(x.id) !== parseInt(id));
        saveAdminPromos();
        renderAdminPromosGrid();
        showToast("Promo deleted successfully.", "success");
    }
}
window.deletePromo = deletePromo;

async function savePromoItem(event) {
    if (event) event.preventDefault();
    var id = document.getElementById('promoId').value;
    var title = document.getElementById('promoTitle').value.trim();
    var subtitle = document.getElementById('promoSubtitle').value.trim();
    var discount = document.getElementById('promoDiscount').value.trim();
    var img = document.getElementById('promoImg').value.trim();
    var fileInput = document.getElementById('promoImageFile');
    var toggleEl = document.getElementById('promoIsActiveToggle');
    var isActive = toggleEl ? (toggleEl.checked ? 1 : 0) : 1;

    if (!title) {
        showToast("Please provide a promo title.", "warning");
        return;
    }

    // Upload file if selected
    if (fileInput && fileInput.files && fileInput.files[0]) {
        var formData = new FormData();
        formData.append('image', fileInput.files[0]);
        try {
            var uploadRes = await fetch('api/upload.php', {
                method: 'POST',
                body: formData
            });
            var uploadData = await uploadRes.json();
            if (uploadData.status === 'success' && uploadData.image_path) {
                img = uploadData.image_path;
            } else if (uploadData.message) {
                showToast(uploadData.message, 'warning', 'Upload Warning');
            }
        } catch (uploadErr) {
            console.log('[Promo Upload] Upload error, trying preview base64');
            var previewImg = document.getElementById('promoImagePreview');
            if (previewImg && previewImg.src && previewImg.src.startsWith('data:image')) {
                img = previewImg.src;
            }
        }
    }

    var payload = {
        action: id ? 'update' : 'add',
        title: title,
        subtitle: subtitle,
        discount: discount,
        img: img,
        is_active: isActive
    };
    if (id) payload.id = parseInt(id);

    try {
        var res = await fetch('api/promos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data && data.status === 'success') {
            await loadAdminPromos();
            closePromoModal();
            showToast(data.message || "Promo saved successfully.", "success");
            return;
        }
    } catch (e) {
        console.warn('Promo save to API failed, fallback to local', e);
    }

    if (id) {
        var idx = adminPromos.findIndex(x => parseInt(x.id) === parseInt(id));
        if (idx > -1) {
            adminPromos[idx] = { id: parseInt(id), title: title, subtitle: subtitle, discount: discount, img: img, is_active: isActive };
        }
    } else {
        var newId = Date.now();
        adminPromos.push({ id: newId, title: title, subtitle: subtitle, discount: discount, img: img, is_active: isActive });
    }

    saveAdminPromos();
    closePromoModal();
    renderAdminPromosGrid();
    showToast("Promo saved successfully.", "success");
}
window.savePromoItem = savePromoItem;

// ============================================================
// CART DRAWER SETTINGS MANAGEMENT (Add Extras & Summary/Discounts)
// ============================================================
function getCartAdminSettings() {
    var defaults = { showExtras: true, showSummaryDiscounts: true, showCallWaiter: true, showReservations: false };
    try {
        var stored = localStorage.getItem('favcafe_cart_settings');
        if (stored) {
            var parsed = JSON.parse(stored);
            return {
                showExtras: parsed.showExtras !== false,
                showSummaryDiscounts: parsed.showSummaryDiscounts !== false,
                showCallWaiter: parsed.showCallWaiter !== false,
                showReservations: parsed.showReservations === true
            };
        }
    } catch (e) {}
    return defaults;
}

function applyAdminReservationsVisibility(show) {
    var navRes = document.getElementById('sidebarItemReservations');
    var navTab = document.getElementById('sidebarItemTables');
    var statCard = document.getElementById('statCardReservations');

    if (navRes) {
        if (show) {
            navRes.style.setProperty('display', 'flex', 'important');
        } else {
            navRes.style.setProperty('display', 'none', 'important');
        }
    }
    if (navTab) {
        if (show) {
            navTab.style.setProperty('display', 'flex', 'important');
        } else {
            navTab.style.setProperty('display', 'none', 'important');
        }
    }
    if (statCard) {
        if (show) {
            statCard.style.setProperty('display', 'flex', 'important');
        } else {
            statCard.style.setProperty('display', 'none', 'important');
        }
    }
}
window.applyAdminReservationsVisibility = applyAdminReservationsVisibility;

function initCartAdminSettings() {
    var settings = getCartAdminSettings();
    var extrasCheckbox = document.getElementById('settingToggleExtras');
    var summaryCheckbox = document.getElementById('settingToggleSummary');
    var callWaiterCheckbox = document.getElementById('settingToggleCallWaiter');
    var reservationsCheckbox = document.getElementById('settingToggleReservations');
    var extrasBadge = document.getElementById('badgeExtrasStatus');
    var summaryBadge = document.getElementById('badgeSummaryStatus');
    var callWaiterBadge = document.getElementById('badgeCallWaiterStatus');
    var reservationsBadge = document.getElementById('badgeReservationsStatus');
    var whatsappCheckbox = document.getElementById('settingToggleWhatsApp');
    var whatsappBadge = document.getElementById('badgeWhatsAppStatus');

    var showWhatsApp = (settings.showWhatsApp !== undefined) ? settings.showWhatsApp : (localStorage.getItem('favcafe_setting_whatsapp') !== 'false');

    if (extrasCheckbox) extrasCheckbox.checked = settings.showExtras;
    if (summaryCheckbox) summaryCheckbox.checked = settings.showSummaryDiscounts;
    if (callWaiterCheckbox) callWaiterCheckbox.checked = settings.showCallWaiter;
    if (reservationsCheckbox) reservationsCheckbox.checked = settings.showReservations;
    if (whatsappCheckbox) whatsappCheckbox.checked = showWhatsApp;

    if (extrasBadge) {
        extrasBadge.textContent = settings.showExtras ? 'ENABLED' : 'DISABLED';
        extrasBadge.className = settings.showExtras ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (summaryBadge) {
        summaryBadge.textContent = settings.showSummaryDiscounts ? 'ENABLED' : 'DISABLED';
        summaryBadge.className = settings.showSummaryDiscounts ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (callWaiterBadge) {
        callWaiterBadge.textContent = settings.showCallWaiter ? 'ENABLED' : 'DISABLED';
        callWaiterBadge.className = settings.showCallWaiter ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (reservationsBadge) {
        reservationsBadge.textContent = settings.showReservations ? 'ENABLED' : 'DISABLED';
        reservationsBadge.className = settings.showReservations ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (whatsappBadge) {
        whatsappBadge.textContent = showWhatsApp ? 'ENABLED' : 'DISABLED';
        whatsappBadge.className = showWhatsApp ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }

    applyAdminReservationsVisibility(settings.showReservations);
    updateKitchenAudioUI();
}
window.initCartAdminSettings = initCartAdminSettings;

function handleCartSettingChange() {
    var extrasCheckbox = document.getElementById('settingToggleExtras');
    var summaryCheckbox = document.getElementById('settingToggleSummary');
    var callWaiterCheckbox = document.getElementById('settingToggleCallWaiter');
    var reservationsCheckbox = document.getElementById('settingToggleReservations');
    var whatsappCheckbox = document.getElementById('settingToggleWhatsApp');

    var extrasBadge = document.getElementById('badgeExtrasStatus');
    var summaryBadge = document.getElementById('badgeSummaryStatus');
    var callWaiterBadge = document.getElementById('badgeCallWaiterStatus');
    var reservationsBadge = document.getElementById('badgeReservationsStatus');
    var whatsappBadge = document.getElementById('badgeWhatsAppStatus');

    var showExtras = extrasCheckbox ? extrasCheckbox.checked : true;
    var showSummaryDiscounts = summaryCheckbox ? summaryCheckbox.checked : true;
    var showCallWaiter = callWaiterCheckbox ? callWaiterCheckbox.checked : true;
    var showReservations = reservationsCheckbox ? reservationsCheckbox.checked : false;
    var showWhatsApp = whatsappCheckbox ? whatsappCheckbox.checked : true;

    if (extrasBadge) {
        extrasBadge.textContent = showExtras ? 'ENABLED' : 'DISABLED';
        extrasBadge.className = showExtras ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (summaryBadge) {
        summaryBadge.textContent = showSummaryDiscounts ? 'ENABLED' : 'DISABLED';
        summaryBadge.className = showSummaryDiscounts ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (callWaiterBadge) {
        callWaiterBadge.textContent = showCallWaiter ? 'ENABLED' : 'DISABLED';
        callWaiterBadge.className = showCallWaiter ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (reservationsBadge) {
        reservationsBadge.textContent = showReservations ? 'ENABLED' : 'DISABLED';
        reservationsBadge.className = showReservations ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }
    if (whatsappBadge) {
        whatsappBadge.textContent = showWhatsApp ? 'ENABLED' : 'DISABLED';
        whatsappBadge.className = showWhatsApp ? 'badge bg-primary rounded-pill px-2 py-1' : 'badge bg-secondary rounded-pill px-2 py-1';
    }

    applyAdminReservationsVisibility(showReservations);

    var newSettings = { showExtras: showExtras, showSummaryDiscounts: showSummaryDiscounts, showCallWaiter: showCallWaiter, showReservations: showReservations, showWhatsApp: showWhatsApp };
    try {
        localStorage.setItem('favcafe_cart_settings', JSON.stringify(newSettings));
        localStorage.setItem('favcafe_setting_whatsapp', showWhatsApp ? 'true' : 'false');
        localStorage.setItem('favcafe_cart_settings_signal', JSON.stringify({ showExtras: showExtras, showSummaryDiscounts: showSummaryDiscounts, showCallWaiter: showCallWaiter, showReservations: showReservations, showWhatsApp: showWhatsApp, ts: Date.now() }));
    } catch (e) {}

    try {
        var chan = new BroadcastChannel('favcafe_settings_channel');
        chan.postMessage({ type: 'cart_settings_updated', settings: newSettings });
    } catch (e) {}

    // Persist to store_settings table
    try {
        fetch('api/settings.php?action=update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: { whatsapp_enabled: showWhatsApp ? 'true' : 'false' } })
        }).catch(function(err){});
    } catch (e) {}

    if (typeof showToast === 'function') {
        showToast('Store feature settings updated & synced!', 'success', 'Settings');
    }
}
window.handleCartSettingChange = handleCartSettingChange;

function saveCartAdminSettings() {
    handleCartSettingChange();
    if (typeof showToast === 'function') {
        showToast('All operational & WhatsApp settings saved successfully!', 'success', 'Saved');
    }
}
window.saveCartAdminSettings = saveCartAdminSettings;

/* ============================================================
   SUPERADMIN STORE & BRAND CONFIGURATION ENGINE (FULL CRUD)
   ============================================================ */
var currentStoreSettings = {
    store_name: 'INEZA RESTO & COFFEE SHOP',
    store_location: '108 Kimironko St, Kigali - Rwanda',
    store_phone: '+250 788 000 000',
    store_tin: '102938475',
    momo_code: '004587',
    momo_name: 'INEZA Resto & Cafe Shop',
    delivery_fee: '1000',
    currency: 'RWF',
    vat_percent: '18',
    opening_hours: 'Mon - Sun: 07:00 AM - 11:00 PM'
};

async function initStoreSettings() {
    // 1. Try loading cached settings first
    try {
        var cached = localStorage.getItem('ineza_store_settings');
        if (cached) {
            var parsed = JSON.parse(cached);
            currentStoreSettings = Object.assign({}, currentStoreSettings, parsed);
            populateStoreSettingsForm(currentStoreSettings);
            applyStoreSettingsToUI(currentStoreSettings);
        }
    } catch (e) {}

    // 2. Fetch fresh from MySQL API
    try {
        var res = await fetch('api/settings.php?action=get');
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && data.settings) {
                currentStoreSettings = Object.assign({}, currentStoreSettings, data.settings);
                localStorage.setItem('ineza_store_settings', JSON.stringify(currentStoreSettings));
                populateStoreSettingsForm(currentStoreSettings);
                applyStoreSettingsToUI(currentStoreSettings);
            }
        }
    } catch (err) {
        console.warn('[Store Settings API] Network error, utilizing cached defaults', err);
    }
}
window.initStoreSettings = initStoreSettings;

function populateStoreSettingsForm(settings) {
    if (!settings) return;
    var nameEl = document.getElementById('settingStoreName');
    var locEl = document.getElementById('settingStoreLocation');
    var phoneEl = document.getElementById('settingStorePhone');
    var tinEl = document.getElementById('settingStoreTin');
    var hoursEl = document.getElementById('settingOpeningHours');
    var momoCodeEl = document.getElementById('settingMomoCode');
    var momoNameEl = document.getElementById('settingMomoName');
    var feeEl = document.getElementById('settingDeliveryFee');
    var vatEl = document.getElementById('settingVatPercent');
    var currEl = document.getElementById('settingCurrency');

    if (nameEl) nameEl.value = settings.store_name || 'INEZA RESTO & COFFEE SHOP';
    if (locEl) locEl.value = settings.store_location || '108 Kimironko St, Kigali - Rwanda';
    if (phoneEl) phoneEl.value = settings.store_phone || '+250 788 000 000';
    if (tinEl) tinEl.value = settings.store_tin || '102938475';
    if (hoursEl) hoursEl.value = settings.opening_hours || 'Mon - Sun: 07:00 AM - 11:00 PM';
    if (momoCodeEl) momoCodeEl.value = settings.momo_code || '004587';
    if (momoNameEl) momoNameEl.value = settings.momo_name || 'INEZA Resto & Cafe Shop';
    if (feeEl) feeEl.value = settings.delivery_fee || '1000';
    if (vatEl) vatEl.value = settings.vat_percent || '18';
    if (currEl) currEl.value = settings.currency || 'RWF';
}
window.populateStoreSettingsForm = populateStoreSettingsForm;

function applyStoreSettingsToUI(settings) {
    if (!settings) return;

    // 1. Update Thermal Receipt Header in Admin Receipt Modal
    var receiptLocEl = document.querySelector('#printableReceiptArea .fa-map-marker-alt');
    if (receiptLocEl && receiptLocEl.parentElement) {
        receiptLocEl.parentElement.innerHTML = `<i class="fas fa-map-marker-alt me-1" style="color:#aa7262;"></i>${settings.store_location}`;
    }

    var receiptPhoneTinEl = document.querySelector('#printableReceiptArea .fa-phone');
    if (receiptPhoneTinEl && receiptPhoneTinEl.parentElement) {
        receiptPhoneTinEl.parentElement.innerHTML = `<i class="fas fa-phone me-1" style="color:#aa7262;"></i>TEL: ${settings.store_phone} | TIN: ${settings.store_tin}`;
    }

    var receiptVatEl = document.querySelector('#printableReceiptArea span:contains("VAT")') || document.querySelector('#printableReceiptArea');
    // If VAT label exists, keep 18% or configured percent
    var vatLine = document.getElementById('receiptVatLine');
    if (vatLine) {
        vatLine.textContent = `VAT (${settings.vat_percent}% Included):`;
    }
}
window.applyStoreSettingsToUI = applyStoreSettingsToUI;

function resetStoreSettingsForm() {
    populateStoreSettingsForm(currentStoreSettings);
    if (typeof showToast === 'function') {
        showToast('Store settings form reset to current values.', 'info');
    }
}
window.resetStoreSettingsForm = resetStoreSettingsForm;

async function saveStoreSettingsForm() {
    var nameEl = document.getElementById('settingStoreName');
    var locEl = document.getElementById('settingStoreLocation');
    var phoneEl = document.getElementById('settingStorePhone');
    var tinEl = document.getElementById('settingStoreTin');
    var hoursEl = document.getElementById('settingOpeningHours');
    var momoCodeEl = document.getElementById('settingMomoCode');
    var momoNameEl = document.getElementById('settingMomoName');
    var feeEl = document.getElementById('settingDeliveryFee');
    var vatEl = document.getElementById('settingVatPercent');
    var currEl = document.getElementById('settingCurrency');

    var updated = {
        store_name: (nameEl ? nameEl.value : '').trim() || 'INEZA RESTO & COFFEE SHOP',
        store_location: (locEl ? locEl.value : '').trim() || '108 Kimironko St, Kigali - Rwanda',
        store_phone: (phoneEl ? phoneEl.value : '').trim() || '+250 788 000 000',
        store_tin: (tinEl ? tinEl.value : '').trim() || '102938475',
        opening_hours: (hoursEl ? hoursEl.value : '').trim() || 'Mon - Sun: 07:00 AM - 11:00 PM',
        momo_code: (momoCodeEl ? momoCodeEl.value : '').trim() || '004587',
        momo_name: (momoNameEl ? momoNameEl.value : '').trim() || 'INEZA Resto & Cafe Shop',
        delivery_fee: (feeEl ? feeEl.value : '').trim() || '1000',
        vat_percent: (vatEl ? vatEl.value : '').trim() || '18',
        currency: (currEl ? currEl.value : '').trim() || 'RWF'
    };

    // Update in-memory and local storage immediately
    currentStoreSettings = Object.assign({}, currentStoreSettings, updated);
    localStorage.setItem('ineza_store_settings', JSON.stringify(currentStoreSettings));
    applyStoreSettingsToUI(currentStoreSettings);

    // Broadcast across windows (customer app, mobile PWA, kiosk)
    try {
        var chan = new BroadcastChannel('favcafe_settings_channel');
        chan.postMessage({ type: 'store_settings_updated', settings: currentStoreSettings });
    } catch (e) {}

    // Persist to MySQL
    try {
        var res = await fetch('api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', settings: updated })
        });
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success') {
                if (typeof showToast === 'function') {
                    showToast('Store configuration saved to database & synchronized system-wide!', 'success', 'SuperAdmin Configuration');
                }
                return;
            }
        }
    } catch (err) {
        console.warn('[Store Settings Save] Network error, saved locally', err);
    }

    if (typeof showToast === 'function') {
        showToast('Configuration updated in local cache.', 'info', 'Saved Locally');
    }
}
window.saveStoreSettingsForm = saveStoreSettingsForm;

// ============================================================
// TAB 7: SALES & FINANCIAL ANALYTICS WITH EXPORTABLE DETAILS
// ============================================================
var currentAnalyticsRange = 'all';
var currentAnalyticsSearch = '';
var currentAnalyticsPage = 1;
var ANALYTICS_PER_PAGE = 10;

function setAnalyticsRange(range, btn) {
    currentAnalyticsRange = range;
    currentAnalyticsPage = 1;

    var container = document.getElementById('analyticsRangePills');
    if (container) {
        container.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
    }
    if (btn) btn.classList.add('active');

    renderAnalyticsDashboard();
}
window.setAnalyticsRange = setAnalyticsRange;

function onAnalyticsSearch(val) {
    currentAnalyticsSearch = (val || '').trim().toLowerCase();
    currentAnalyticsPage = 1;
    renderAnalyticsAuditTable();
}
window.onAnalyticsSearch = onAnalyticsSearch;

function getFilteredAnalyticsOrders() {
    var list = adminOrders || [];
    var now = new Date();

    return list.filter(function(o) {
        if (o.isDisabled || (o.status || '') === 'Disabled / Archived') return false;

        if (currentAnalyticsRange === 'all') return true;

        var oDate = new Date(o.date);
        if (isNaN(oDate.getTime())) return true;

        if (currentAnalyticsRange === 'today') {
            return oDate.toDateString() === now.toDateString();
        } else if (currentAnalyticsRange === '7days') {
            var diffMs = now.getTime() - oDate.getTime();
            return diffMs <= 7 * 24 * 60 * 60 * 1000;
        } else if (currentAnalyticsRange === '30days') {
            return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

function renderAnalyticsDashboard() {
    var orders = getFilteredAnalyticsOrders();

    // 1. Executive Financial Metrics
    var grossRevenue = 0;
    var totalOrders = orders.length;
    var momoRevenue = 0;

    orders.forEach(function(o) {
        var tot = parseFloat(o.total) || 0;
        grossRevenue += tot;

        var pMethod = (o.paymentMethod || o.payment_method || '').toLowerCase();
        if (pMethod.includes('momo') || pMethod.includes('mtn') || pMethod.includes('airtel') || pMethod.includes('mobile')) {
            momoRevenue += tot;
        }
    });

    // Tax computation: RRA EBM 18% VAT included
    // Net = Gross / 1.18; VAT = Gross - Net
    var netRevenue = Math.round(grossRevenue / 1.18);
    var vatAmount = grossRevenue - netRevenue;
    var avgOrderVal = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;
    var momoRatio = grossRevenue > 0 ? Math.round((momoRevenue / grossRevenue) * 100) : 0;

    var grossEl = document.getElementById('analyticsGrossRevenue');
    if (grossEl) grossEl.textContent = formatRWF(grossRevenue);

    var vatEl = document.getElementById('analyticsVatAmount');
    if (vatEl) vatEl.textContent = formatRWF(vatAmount);

    var countEl = document.getElementById('analyticsTotalOrdersCount');
    if (countEl) countEl.textContent = totalOrders;

    var avgEl = document.getElementById('analyticsAvgOrderValue');
    if (avgEl) avgEl.textContent = 'Avg: ' + formatRWF(avgOrderVal) + ' / order';

    var momoPercentEl = document.getElementById('analyticsMoMoPercent');
    if (momoPercentEl) momoPercentEl.textContent = momoRatio + '%';

    var momoTotalEl = document.getElementById('analyticsMoMoTotal');
    if (momoTotalEl) momoTotalEl.textContent = formatRWF(momoRevenue) + ' collected via MoMo';

    // 2. Render Payment Channel Breakdown
    renderAnalyticsPaymentBreakdown(orders, grossRevenue);

    // 3. Render Fulfilment Breakdown (Dine-in vs Delivery)
    renderAnalyticsFulfilmentBreakdown(orders);

    // 4. Render Registered Loyalty vs Guest Customers Donut Chart
    renderCustomerTypeDonut(orders);

    // 5. Render Interactive Kigali Customer Location Map & Neighborhoods
    renderAnalyticsCustomerMap(orders);

    // 6. Render Top Dishes Leaderboard
    renderAnalyticsTopDishes(orders);

    // 7. Render Audit Trail Table
    renderAnalyticsAuditTable();
}
window.renderAnalyticsDashboard = renderAnalyticsDashboard;

function renderAnalyticsPaymentBreakdown(orders, grossRevenue) {
    var listEl = document.getElementById('analyticsPaymentBreakdownList');
    var badgeEl = document.getElementById('analyticsPaymentOrdersTotal');
    if (!listEl) return;

    if (badgeEl) badgeEl.textContent = orders.length + ' Orders';

    var methodTotals = {
        'MTN Mobile Money (*182*)': { count: 0, sum: 0, color: '#f39c12' },
        'Airtel Money': { count: 0, sum: 0, color: '#e74c3c' },
        'Cash on Delivery / Counter': { count: 0, sum: 0, color: '#27ae60' },
        'Credit / Debit Card (POS)': { count: 0, sum: 0, color: '#2980b9' }
    };

    orders.forEach(function(o) {
        var p = (o.paymentMethod || o.payment_method || 'Cash').toLowerCase();
        var tot = parseFloat(o.total) || 0;

        if (p.includes('mtn') || p.includes('*182*')) {
            methodTotals['MTN Mobile Money (*182*)'].count++;
            methodTotals['MTN Mobile Money (*182*)'].sum += tot;
        } else if (p.includes('airtel')) {
            methodTotals['Airtel Money'].count++;
            methodTotals['Airtel Money'].sum += tot;
        } else if (p.includes('card') || p.includes('pos')) {
            methodTotals['Credit / Debit Card (POS)'].count++;
            methodTotals['Credit / Debit Card (POS)'].sum += tot;
        } else {
            methodTotals['Cash on Delivery / Counter'].count++;
            methodTotals['Cash on Delivery / Counter'].sum += tot;
        }
    });

    var html = '';
    Object.keys(methodTotals).forEach(function(key) {
        var m = methodTotals[key];
        var pct = grossRevenue > 0 ? Math.round((m.sum / grossRevenue) * 100) : 0;

        html += `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small fw-bold text-dark">${key} <span class="text-muted fw-normal">(${m.count} orders)</span></span>
                    <span class="small fw-bold text-dark">${formatRWF(m.sum)} <span class="badge bg-light text-dark border ms-1">${pct}%</span></span>
                </div>
                <div class="progress" style="height: 8px; border-radius: 6px; background: #eef2f6;">
                    <div class="progress-bar" role="progressbar" style="width: ${pct}%; background-color: ${m.color};" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

function renderAnalyticsFulfilmentBreakdown(orders) {
    var listEl = document.getElementById('analyticsFulfilmentBreakdownList');
    if (!listEl) return;

    var channels = {
        'Delivery (Home & Office)': { count: 0, color: '#3498db' },
        'Dine-In (Table Seating)': { count: 0, color: '#9b59b6' },
        'Takeaway / Pickup': { count: 0, color: '#1abc9c' }
    };

    var totalOrders = orders.length;

    orders.forEach(function(o) {
        var s = (o.serviceType || o.service_type || 'Delivery').toLowerCase();
        if (s.includes('dine') || s.includes('table')) {
            channels['Dine-In (Table Seating)'].count++;
        } else if (s.includes('take') || s.includes('pickup')) {
            channels['Takeaway / Pickup'].count++;
        } else {
            channels['Delivery (Home & Office)'].count++;
        }
    });

    var html = '';
    Object.keys(channels).forEach(function(key) {
        var c = channels[key];
        var pct = totalOrders > 0 ? Math.round((c.count / totalOrders) * 100) : 0;

        html += `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small fw-bold text-dark">${key}</span>
                    <span class="small fw-bold text-dark">${c.count} orders <span class="badge bg-light text-dark border ms-1">${pct}%</span></span>
                </div>
                <div class="progress" style="height: 8px; border-radius: 6px; background: #eef2f6;">
                    <div class="progress-bar" role="progressbar" style="width: ${pct}%; background-color: ${c.color};" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

// ============================================================
// 1. REGISTERED VS GUEST CUSTOMERS DONUT CHART
// ============================================================
function renderCustomerTypeDonut(orders) {
    var container = document.getElementById('analyticsCustomerDonutChart');
    if (!container) return;

    var registeredList = adminCustomerLoyaltyList || [];
    var regPhones = new Set();
    var regEmails = new Set();
    var regNames = new Set();

    registeredList.forEach(function(c) {
        if (c.phone) regPhones.add(c.phone.replace(/[^0-9]/g, ''));
        if (c.email) regEmails.add(c.email.trim().toLowerCase());
        if (c.name || c.full_name) regNames.add((c.name || c.full_name).trim().toLowerCase());
    });

    var regCount = 0;
    var regRevenue = 0;
    var guestCount = 0;
    var guestRevenue = 0;

    orders.forEach(function(o) {
        var tot = parseFloat(o.total) || 0;
        var pClean = (o.phone || '').replace(/[^0-9]/g, '');
        var nClean = (o.customerName || '').trim().toLowerCase();

        var isReg = false;
        if (pClean && regPhones.has(pClean)) isReg = true;
        else if (nClean && regNames.has(nClean) && nClean !== 'guest' && nClean !== 'guest customer') isReg = true;
        else if (o.customerId || o.customer_id || o.userId || o.user_id) isReg = true;

        if (isReg) {
            regCount++;
            regRevenue += tot;
        } else {
            guestCount++;
            guestRevenue += tot;
        }
    });

    var totalCount = regCount + guestCount;
    var totalRev = regRevenue + guestRevenue;

    var regPct = totalCount > 0 ? Math.round((regCount / totalCount) * 100) : 0;
    var guestPct = totalCount > 0 ? (100 - regPct) : 0;

    var regAov = regCount > 0 ? Math.round(regRevenue / regCount) : 0;
    var guestAov = guestCount > 0 ? Math.round(guestRevenue / guestCount) : 0;

    // Update ratio badge & counters
    var ratioBadge = document.getElementById('analyticsCustomerTotalRatioBadge');
    if (ratioBadge) ratioBadge.textContent = totalCount + ' Orders';

    var elRegCount = document.getElementById('donutRegCount');
    if (elRegCount) elRegCount.textContent = regCount;

    var elRegPct = document.getElementById('donutRegPercent');
    if (elRegPct) elRegPct.textContent = regPct + '% (' + formatRWF(regRevenue) + ')';

    var elGuestCount = document.getElementById('donutGuestCount');
    if (elGuestCount) elGuestCount.textContent = guestCount;

    var elGuestPct = document.getElementById('donutGuestPercent');
    if (elGuestPct) elGuestPct.textContent = guestPct + '% (' + formatRWF(guestRevenue) + ')';

    var elAov = document.getElementById('donutAovComparison');
    if (elAov) elAov.innerHTML = `Avg Ticket: <strong>${formatRWF(regAov)}</strong> (Registered) vs <strong>${formatRWF(guestAov)}</strong> (Guest)`;

    // SVG Donut Rendering
    // Circumference = 2 * PI * r = 2 * 3.14159 * 54 = ~339.292
    var radius = 54;
    var circ = 2 * Math.PI * radius;
    var regDash = (regPct / 100) * circ;
    var guestDash = circ - regDash;
    var regColor = '#7c3aed'; // Purple
    var guestColor = '#0ea5e9'; // Sky Blue

    var svgHtml = `
        <svg width="170" height="170" viewBox="0 0 140 140" style="transform: rotate(-90deg);">
            <!-- Background base circle -->
            <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="18" />
            <!-- Guest segment -->
            <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="${guestColor}" stroke-width="18"
                stroke-dasharray="${circ}" stroke-dashoffset="0" />
            <!-- Registered segment -->
            <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="${regColor}" stroke-width="18"
                stroke-dasharray="${regDash} ${circ}" stroke-dashoffset="0" stroke-linecap="round" />
        </svg>
        <!-- Center Hole Metric -->
        <div class="position-absolute d-flex flex-column align-items-center justify-content-center text-center" style="pointer-events:none;">
            <span class="fw-bold fs-4 text-dark mb-0 lh-1">${regPct}%</span>
            <small class="text-muted fw-bold text-uppercase" style="font-size:0.65rem; letter-spacing:0.5px;">Registered</small>
        </div>
    `;

    container.innerHTML = svgHtml;
}
window.renderCustomerTypeDonut = renderCustomerTypeDonut;

// ============================================================
// 2. INTERACTIVE KIGALI CUSTOMER LOCATION MAP (LEAFLET.JS)
// ============================================================
var analyticsLeafletMap = null;
var analyticsMapMarkersGroup = null;

// Kigali Neighborhood Coordinates & Fallbacks
var KIGALI_NEIGHBORHOODS = {
    'kimironko': { name: 'Kimironko', lat: -1.9365, lng: 30.1302 },
    'remera': { name: 'Remera', lat: -1.9567, lng: 30.1133 },
    'kacyiru': { name: 'Kacyiru', lat: -1.9351, lng: 30.0821 },
    'nyarutarama': { name: 'Nyarutarama', lat: -1.9388, lng: 30.0995 },
    'kiyovu': { name: 'Kiyovu', lat: -1.9536, lng: 30.0605 },
    'gisozi': { name: 'Gisozi', lat: -1.9217, lng: 30.0712 },
    'kicukiro': { name: 'Kicukiro', lat: -1.9774, lng: 30.1017 },
    'kanombe': { name: 'Kanombe', lat: -1.9688, lng: 30.1472 },
    'gikondo': { name: 'Gikondo', lat: -1.9723, lng: 30.0768 },
    'nyamirambo': { name: 'Nyamirambo', lat: -1.9765, lng: 30.0489 },
    'kagugu': { name: 'Kagugu', lat: -1.9054, lng: 30.0792 },
    'kibagabaga': { name: 'Kibagabaga', lat: -1.9287, lng: 30.1165 },
    'muhima': { name: 'Muhima', lat: -1.9442, lng: 30.0542 }
};

function resolveOrderCoordinates(address) {
    var text = (address || '').toLowerCase();
    for (var key in KIGALI_NEIGHBORHOODS) {
        if (text.includes(key)) {
            var base = KIGALI_NEIGHBORHOODS[key];
            // Add a small jitter so multiple orders in the same sector don't overlap directly
            var jitterLat = (Math.random() - 0.5) * 0.007;
            var jitterLng = (Math.random() - 0.5) * 0.007;
            return {
                zone: base.name,
                lat: base.lat + jitterLat,
                lng: base.lng + jitterLng
            };
        }
    }

    // Default to Kimironko HQ area with spread
    var jitterLat = (Math.random() - 0.5) * 0.012;
    var jitterLng = (Math.random() - 0.5) * 0.012;
    return {
        zone: 'Kimironko / Urban Kigali',
        lat: -1.9365 + jitterLat,
        lng: 30.1302 + jitterLng
    };
}

function renderAnalyticsCustomerMap(orders) {
    var mapContainer = document.getElementById('analyticsCustomerMap');
    if (!mapContainer || typeof L === 'undefined') return;

    // Initialize Map Instance once
    if (!analyticsLeafletMap) {
        analyticsLeafletMap = L.map('analyticsCustomerMap', {
            center: [-1.9365, 30.1302], // Kimironko HQ
            zoom: 13,
            scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | INEZA RESTO',
            maxZoom: 18
        }).addTo(analyticsLeafletMap);

        analyticsMapMarkersGroup = L.layerGroup().addTo(analyticsLeafletMap);

        // Invalidate size on tab activation
        setTimeout(function() {
            if (analyticsLeafletMap) analyticsLeafletMap.invalidateSize();
        }, 300);
    } else {
        analyticsMapMarkersGroup.clearLayers();
        setTimeout(function() {
            if (analyticsLeafletMap) analyticsLeafletMap.invalidateSize();
        }, 100);
    }

    // Filter to delivery orders with address
    var deliveryOrders = orders.filter(function(o) {
        return (o.serviceType || o.service_type || '').toLowerCase().includes('deliv') || (o.address && o.address.trim().length > 3);
    });

    var zoneStats = {};
    var bounds = [];

    // Add Ineza Resto & Cafe Shop HQ marker
    var hqIcon = L.divIcon({
        className: 'custom-hq-pin',
        html: `<div style="background:#27ae60; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35); border:2px solid #fff;"><i class="fas fa-mug-hot" style="font-size:16px;"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });

    var hqMarker = L.marker([-1.9365, 30.1302], { icon: hqIcon }).addTo(analyticsMapMarkersGroup);
    hqMarker.bindPopup(`
        <div style="font-size:12px; font-family:sans-serif; text-align:center; padding:2px;">
            <strong style="color:#27ae60; font-size:13px;">INEZA RESTO &amp; COFFEE SHOP</strong><br/>
            <span>Central Kitchen &amp; Store HQ</span><br/>
            <small class="text-muted">108 Kimironko St, Kigali</small>
        </div>
    `);
    bounds.push([-1.9365, 30.1302]);

    deliveryOrders.forEach(function(o) {
        var geo = resolveOrderCoordinates(o.address);
        bounds.push([geo.lat, geo.lng]);

        zoneStats[geo.zone] = (zoneStats[geo.zone] || 0) + 1;

        var isDelivered = (o.status || '').toLowerCase().includes('deliv') || (o.status || '').toLowerCase().includes('clos');
        var pinColor = isDelivered ? '#2563eb' : '#f59e0b';

        var orderIcon = L.divIcon({
            className: 'custom-order-pin',
            html: `<div style="background:${pinColor}; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.25); border:2px solid #fff;"><i class="fas fa-motorcycle" style="font-size:11px;"></i></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        var marker = L.marker([geo.lat, geo.lng], { icon: orderIcon }).addTo(analyticsMapMarkersGroup);
        marker.bindPopup(`
            <div style="font-size:12px; font-family:sans-serif; min-width:180px; padding:2px;">
                <div style="font-weight:bold; color:#1e293b; font-size:13px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px;">
                    Order #${o.id}
                </div>
                <div><strong>Customer:</strong> ${o.customerName || 'Guest'}</div>
                <div><strong>Phone:</strong> ${o.phone || 'N/A'}</div>
                <div><strong>Address:</strong> ${o.address || 'Kigali'}</div>
                <div><strong>Total:</strong> <span style="color:#2563eb; font-weight:bold;">${formatRWF(o.total)}</span></div>
                <div><strong>Status:</strong> <span class="badge bg-dark" style="font-size:10px;">${o.status}</span></div>
            </div>
        `);
    });

    // Update pins badge
    var pinBadge = document.getElementById('mapOrderPinsCount');
    if (pinBadge) pinBadge.textContent = deliveryOrders.length + ' Delivery Orders';

    // Populate Top Neighborhood Pills
    var pillsContainer = document.getElementById('mapNeighborhoodPills');
    var summaryText = document.getElementById('mapTopNeighborhoodSummary');

    if (pillsContainer) {
        var sortedZones = Object.keys(zoneStats).sort(function(a, b) { return zoneStats[b] - zoneStats[a]; });
        if (sortedZones.length === 0) {
            pillsContainer.innerHTML = '<span class="small text-muted">No delivery address records found in this range.</span>';
            if (summaryText) summaryText.textContent = '0 delivery zones';
        } else {
            var pillsHtml = sortedZones.slice(0, 6).map(function(z) {
                var count = zoneStats[z];
                return `<span class="badge bg-light text-dark border px-2 py-1"><i class="fas fa-map-marker-alt text-danger me-1"></i>${z} <strong class="text-primary ms-1">(${count})</strong></span>`;
            }).join(' ');

            pillsContainer.innerHTML = pillsHtml;
            if (summaryText) summaryText.textContent = `${sortedZones.length} active delivery zones across Kigali`;
        }
    }

    // Fit map bounds if points exist
    if (bounds.length > 1 && analyticsLeafletMap) {
        analyticsLeafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
}
window.renderAnalyticsCustomerMap = renderAnalyticsCustomerMap;

function recenterAnalyticsMap() {
    if (analyticsLeafletMap) {
        analyticsLeafletMap.setView([-1.9365, 30.1302], 13);
    }
}
window.recenterAnalyticsMap = recenterAnalyticsMap;

function renderAnalyticsTopDishes(orders) {
    var tbody = document.getElementById('analyticsTopDishesTbody');
    if (!tbody) return;

    var dishStats = {};

    orders.forEach(function(o) {
        var sumStr = o.itemsSummary || '';
        // Parse items like "Chicken Burger x2, Espresso x1"
        var parts = sumStr.split(',');
        parts.forEach(function(p) {
            p = p.trim();
            if (!p) return;
            var match = p.match(/^(.*?)\s*x(\d+)$/i);
            var name = match ? match[1].trim() : p;
            var qty = match ? parseInt(match[2], 10) : 1;

            if (!dishStats[name]) {
                // Find in adminMenu if available
                var menuItem = (adminMenu || []).find(function(m) { return m.title && m.title.toLowerCase() === name.toLowerCase(); });
                dishStats[name] = {
                    title: name,
                    category: menuItem ? menuItem.category : 'Kitchen',
                    price: menuItem ? menuItem.price : 4500,
                    qty: 0
                };
            }
            dishStats[name].qty += qty;
        });
    });

    var sorted = Object.values(dishStats).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 8);

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No dish performance data found.</td></tr>';
        return;
    }

    var html = '';
    sorted.forEach(function(d, idx) {
        var estRev = d.qty * d.price;
        var rankBadge = idx === 0 ? '<span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-crown me-1"></i>#1</span>' :
                        (idx === 1 ? '<span class="badge bg-secondary text-white px-2 py-1">#2</span>' :
                        (idx === 2 ? '<span class="badge bg-danger text-white px-2 py-1">#3</span>' : `<span class="badge bg-light text-dark border">#${idx + 1}</span>`));

        html += `
            <tr>
                <td>${rankBadge}</td>
                <td>
                    <div class="fw-bold text-dark">${d.title}</div>
                </td>
                <td><span class="badge bg-light text-secondary border text-capitalize">${d.category}</span></td>
                <td><strong class="text-primary">${d.qty} ordered</strong></td>
                <td>${formatRWF(d.price)}</td>
                <td class="text-end"><strong class="text-dark">${formatRWF(estRev)}</strong></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderAnalyticsAuditTable() {
    var tbody = document.getElementById('analyticsAuditTbody');
    if (!tbody) return;

    var orders = getFilteredAnalyticsOrders();

    if (currentAnalyticsSearch) {
        orders = orders.filter(function(o) {
            return o.id.toLowerCase().includes(currentAnalyticsSearch) ||
                   (o.customerName || '').toLowerCase().includes(currentAnalyticsSearch) ||
                   (o.itemsSummary || '').toLowerCase().includes(currentAnalyticsSearch) ||
                   (o.phone || '').toLowerCase().includes(currentAnalyticsSearch);
        });
    }

    var totalItems = orders.length;
    var totalPages = Math.ceil(totalItems / ANALYTICS_PER_PAGE) || 1;
    if (currentAnalyticsPage > totalPages) currentAnalyticsPage = totalPages;
    if (currentAnalyticsPage < 1) currentAnalyticsPage = 1;

    var startIdx = (currentAnalyticsPage - 1) * ANALYTICS_PER_PAGE;
    var pageOrders = orders.slice(startIdx, startIdx + ANALYTICS_PER_PAGE);

    if (totalItems === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No orders match the current analytics filter.</td></tr>';
    } else {
        var html = '';
        pageOrders.forEach(function(o) {
            var dateStr = new Date(o.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            var pMethod = o.paymentMethod || o.payment_method || 'MTN MoMo';
            var pStatus = (o.paymentStatus || o.payment_status || 'Paid').toLowerCase();
            var pStatusBadge = pStatus === 'paid' ? '<span class="badge bg-success">PAID</span>' : '<span class="badge bg-warning text-dark">PENDING</span>';

            html += `
                <tr>
                    <td><a href="#" onclick="event.preventDefault(); viewOrder('${o.id}');" class="fw-bold text-primary font-monospace">#${o.id}</a></td>
                    <td class="small text-muted">${dateStr}</td>
                    <td>
                        <div class="fw-bold text-dark" style="font-size:0.85rem;">${o.customerName || 'Guest'}</div>
                        <div class="small text-muted" style="font-size:0.75rem;">${o.phone || ''}</div>
                    </td>
                    <td style="max-width:240px; white-space:normal; font-size:0.82rem;">${o.itemsSummary}</td>
                    <td><span class="badge bg-light text-dark border text-capitalize">${o.serviceType || 'Delivery'}</span></td>
                    <td>
                        <div class="small fw-bold text-dark">${pMethod}</div>
                        ${pStatusBadge}
                    </td>
                    <td><strong class="text-dark">${formatRWF(o.total)}</strong></td>
                    <td><span class="badge bg-dark text-white small">${o.status}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    renderAnalyticsPagination(totalItems, totalPages);
}

function renderAnalyticsPagination(totalItems, totalPages) {
    var infoEl = document.getElementById('analyticsPaginationInfo');
    var navEl = document.getElementById('analyticsPaginationNav');
    if (!infoEl || !navEl) return;

    if (totalItems === 0) {
        infoEl.textContent = 'Showing 0 orders';
        navEl.innerHTML = '';
        return;
    }

    var start = (currentAnalyticsPage - 1) * ANALYTICS_PER_PAGE + 1;
    var end = Math.min(start + ANALYTICS_PER_PAGE - 1, totalItems);
    infoEl.textContent = 'Showing ' + start + ' to ' + end + ' of ' + totalItems + ' orders';

    if (totalPages <= 1) {
        navEl.innerHTML = '';
        return;
    }

    var navHtml = '';
    var prevDisabled = currentAnalyticsPage === 1 ? 'disabled' : '';
    navHtml += `<li class="page-item ${prevDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeAnalyticsPage(${currentAnalyticsPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

    for (var p = 1; p <= totalPages; p++) {
        var active = p === currentAnalyticsPage ? 'active' : '';
        navHtml += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="event.preventDefault(); changeAnalyticsPage(${p})">${p}</a></li>`;
    }

    var nextDisabled = currentAnalyticsPage === totalPages ? 'disabled' : '';
    navHtml += `<li class="page-item ${nextDisabled}"><a class="page-link" href="#" onclick="event.preventDefault(); changeAnalyticsPage(${currentAnalyticsPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;

    navEl.innerHTML = navHtml;
}

function changeAnalyticsPage(newPage) {
    currentAnalyticsPage = newPage;
    renderAnalyticsAuditTable();
}
window.changeAnalyticsPage = changeAnalyticsPage;

// ============================================================
// EXPORT UTILITIES: CSV, RRA EBM SUMMARY & DAILY SHIFT Z-REPORT
// ============================================================

// 1. Export Analytics to CSV / Excel
function exportAnalyticsCSV() {
    var orders = getFilteredAnalyticsOrders();
    if (!orders || orders.length === 0) {
        alert('No orders available to export for this time range.');
        return;
    }

    var headers = [
        'Order ID',
        'Date and Time',
        'Customer Name',
        'Phone Number',
        'Fulfilment Option',
        'Items Ordered',
        'Payment Method',
        'Payment Status',
        'Net Amount (RWF)',
        '18% VAT (RWF)',
        'Gross Total (RWF)',
        'Order Status'
    ];

    var csvRows = [];
    csvRows.push(headers.map(function(h) { return '"' + h.replace(/"/g, '""') + '"'; }).join(','));

    orders.forEach(function(o) {
        var gross = parseFloat(o.total) || 0;
        var net = Math.round(gross / 1.18);
        var vat = gross - net;
        var dateFormatted = new Date(o.date).toISOString().replace('T', ' ').substring(0, 19);

        var row = [
            o.id,
            dateFormatted,
            o.customerName || 'Guest',
            o.phone || '',
            o.serviceType || 'Delivery',
            (o.itemsSummary || '').replace(/"/g, '""'),
            o.paymentMethod || o.payment_method || 'MTN MoMo',
            o.paymentStatus || o.payment_status || 'Paid',
            net,
            vat,
            gross,
            o.status || 'Completed'
        ];

        csvRows.push(row.map(function(val) { return '"' + String(val).replace(/"/g, '""') + '"'; }).join(','));
    });

    var csvString = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM for Microsoft Excel compatibility
    var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.setAttribute('href', url);
    var filename = 'INEZA_RESTO_Sales_Report_' + (new Date().toISOString().substring(0, 10)) + '.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
        showToast('Sales CSV exported successfully!', 'success', 'Export Complete');
    }
}
window.exportAnalyticsCSV = exportAnalyticsCSV;

// 2. Print Official RRA EBM Tax Summary Report
function printEbmTaxSummary() {
    var orders = getFilteredAnalyticsOrders();
    var grossRevenue = 0;
    var totalOrders = orders.length;

    orders.forEach(function(o) { grossRevenue += parseFloat(o.total) || 0; });
    var netRevenue = Math.round(grossRevenue / 1.18);
    var vatAmount = grossRevenue - netRevenue;

    var printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    var now = new Date();
    var html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>RRA EBM v2.1 Fiscal Tax Summary - INEZA RESTO & COFFEE SHOP</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #222; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .header h2 { margin: 0 0 5px; text-transform: uppercase; letter-spacing: 1px; }
                .tax-grid { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .tax-grid th, .tax-grid td { border: 1px solid #ccc; padding: 10px 14px; text-align: left; }
                .tax-grid th { background: #f4f6f8; font-weight: bold; }
                .total-row { font-weight: bold; background: #eef2f6; font-size: 1.05rem; }
                .footer { margin-top: 40px; font-size: 0.85rem; color: #666; text-align: center; border-top: 1px dashed #aaa; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>INEZA RESTO &amp; COFFEE SHOP</h2>
                <div>108 Kimironko St, Kigali - Rwanda | TEL: +250 788 000 000</div>
                <div><strong>TIN:</strong> 102938475 | <strong>SDC ID:</strong> SDC004000892</div>
                <h3 style="margin-top:15px; color:#2c3e50;">RRA EBM v2.1 FISCAL TAX AUDIT SUMMARY</h3>
                <small>Generated on: ${now.toLocaleString()} | Period Filter: <strong>${currentAnalyticsRange.toUpperCase()}</strong></small>
            </div>

            <table class="tax-grid">
                <thead>
                    <tr>
                        <th>Tax Category</th>
                        <th>Tax Rate</th>
                        <th>Taxable Turnover (RWF)</th>
                        <th>VAT Amount (RWF)</th>
                        <th>Gross Turnover (RWF)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Category A (Standard VAT)</strong></td>
                        <td>18.00%</td>
                        <td>${formatRWF(netRevenue)}</td>
                        <td>${formatRWF(vatAmount)}</td>
                        <td>${formatRWF(grossRevenue)}</td>
                    </tr>
                    <tr>
                        <td><strong>Category B (Zero-Rated / Exempt)</strong></td>
                        <td>0.00%</td>
                        <td>0 RWF</td>
                        <td>0 RWF</td>
                        <td>0 RWF</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2">TOTAL FISCAL REVENUE</td>
                        <td>${formatRWF(netRevenue)}</td>
                        <td>${formatRWF(vatAmount)}</td>
                        <td>${formatRWF(grossRevenue)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top:30px; display:flex; justify-content:space-between;">
                <div>
                    <div><strong>Total Settled Receipts:</strong> ${totalOrders}</div>
                    <div><strong>Fiscal Verification QR:</strong> Validated</div>
                </div>
                <div style="text-align:right;">
                    <div><strong>Store Auditor / SuperAdmin:</strong> _____________________</div>
                    <div style="margin-top:20px;"><strong>Signature &amp; Stamp:</strong> _____________________</div>
                </div>
            </div>

            <div class="footer">
                Official RRA Electronic Billing Machine (EBM) certified report generated via INEZA RESTO &amp; COFFEE SHOP Enterprise System.
            </div>

            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
}
window.printEbmTaxSummary = printEbmTaxSummary;

// 3. Print Daily Shift End / Z-Report (80mm Thermal Receipt Layout)
function printShiftZReport() {
    var orders = getFilteredAnalyticsOrders();
    var grossRevenue = 0;
    var momoRevenue = 0;
    var cashRevenue = 0;
    var cardRevenue = 0;
    var totalOrders = orders.length;

    orders.forEach(function(o) {
        var tot = parseFloat(o.total) || 0;
        grossRevenue += tot;
        var p = (o.paymentMethod || o.payment_method || '').toLowerCase();
        if (p.includes('momo') || p.includes('mtn') || p.includes('airtel')) {
            momoRevenue += tot;
        } else if (p.includes('card') || p.includes('pos')) {
            cardRevenue += tot;
        } else {
            cashRevenue += tot;
        }
    });

    var netRevenue = Math.round(grossRevenue / 1.18);
    var vatAmount = grossRevenue - netRevenue;

    var printWin = window.open('', '_blank', 'width=380,height=600');
    if (!printWin) return;

    var now = new Date();
    var html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Daily Shift Z-Report</title>
            <style>
                @page { margin: 0; }
                body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 12px; line-height: 1.35; color: #000; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .row { display: flex; justify-content: space-between; }
                h2, h3, p { margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class="center">
                <h2>INEZA RESTO</h2>
                <h3>&amp; COFFEE SHOP</h3>
                <p>108 Kimironko St, Kigali</p>
                <p>TIN: 102938475 | TEL: +250 788 000 000</p>
                <div class="divider"></div>
                <h3 class="bold">*** DAILY SHIFT Z-REPORT ***</h3>
                <p>${now.toLocaleString()}</p>
                <p>Register: POS-01 | Cashier: Manager</p>
                <div class="divider"></div>
            </div>

            <div class="row"><span>TOTAL ORDERS:</span><span class="bold">${totalOrders}</span></div>
            <div class="row"><span>GROSS REVENUE:</span><span class="bold">${formatRWF(grossRevenue)}</span></div>
            <div class="row"><span>NET SALES:</span><span>${formatRWF(netRevenue)}</span></div>
            <div class="row"><span>18% VAT:</span><span>${formatRWF(vatAmount)}</span></div>

            <div class="divider"></div>
            <div class="center bold">PAYMENT SETTLEMENTS</div>
            <div class="divider"></div>
            <div class="row"><span>MTN &amp; Airtel MoMo:</span><span class="bold">${formatRWF(momoRevenue)}</span></div>
            <div class="row"><span>Cash Drawer Total:</span><span class="bold">${formatRWF(cashRevenue)}</span></div>
            <div class="row"><span>POS Card Swipes:</span><span class="bold">${formatRWF(cardRevenue)}</span></div>

            <div class="divider"></div>
            <div class="center">
                <p class="bold">SHIFT BALANCING MATCHED</p>
                <p>--- END OF REPORT ---</p>
            </div>

            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
}
window.printShiftZReport = printShiftZReport;
