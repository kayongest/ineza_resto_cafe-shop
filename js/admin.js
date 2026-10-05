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
    initSidebarTabs();
    initSearchAndFilter();

    console.log('%c[Favorite Cafe Engine] Live Orders Management System Active', 'color: #27ae60; font-weight: bold; font-size: 14px;');
    console.log('%c[Functions Available] viewOrder(id), editOrder(id), disableOrder(id), refreshAdminOrders()', 'color: #2980b9; font-weight: bold;');
    console.log('%c[Audit Attribution] Accepted By | Prepared By (Chef) | Served By Enabled', 'color: #8e44ad; font-weight: bold;');
    console.log('%c[Overview Widget] Active Kitchen Live Tickets with badge-success sm Status Badges Ready', 'color: #d35400; font-weight: bold;');
});

var _notifiedOrderIds = {};

function notifyNewOrderOnce(order) {
    if (!order || !order.id) return;
    if (_notifiedOrderIds[order.id]) return;
    _notifiedOrderIds[order.id] = true;

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
            }
        } catch (e) { /* ignore channel errors */ }
    };
} catch (e) { /* BroadcastChannel unsupported or blocked */ }

// Fallback: listen for localStorage signals written by other tabs (e.g., customer UI)
window.addEventListener('storage', function(ev) {
    try {
        if (!ev || !ev.key) return;
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

// Render Live Orders Table
function renderOrdersTable(filterStatus, searchQuery) {
    var tbody = document.getElementById('adminOrdersTbody');
    if (!tbody) return;

    var filtered = adminOrders.filter(function(o) {
        var matchStatus = true;
        if (filterStatus && filterStatus !== 'all') {
            if (filterStatus === 'preparing') matchStatus = o.status === 'Kitchen Preparing' || o.status === 'Preparing' || o.status === 'Being Prepared' || o.status.includes('Confirmed');
            else if (filterStatus === 'ready') matchStatus = o.status === 'Ready for Delivery' || o.status === 'Ready' || o.status === 'Out for Delivery' || o.status === 'On the Way';
            else if (filterStatus === 'completed') matchStatus = o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Closed';
        }

        var matchSearch = true;
        if (searchQuery && searchQuery.trim()) {
            var q = searchQuery.toLowerCase();
            matchSearch = o.id.toLowerCase().includes(q) ||
                          o.customerName.toLowerCase().includes(q) ||
                          o.itemsSummary.toLowerCase().includes(q);
        }

        return matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No orders match your criteria.</td></tr>';
        return;
    }

    var html = '';
    filtered.forEach(function(o) {
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

// Render Kitchen Tickets Grid
function renderKitchenGrid() {
    var grid = document.getElementById('kitchenGrid');
    if (!grid) return;

    if (!adminOrders || adminOrders.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-4 text-muted"><i class="fas fa-utensils fa-2x mb-2 opacity-50"></i><p>No active kitchen orders right now.</p></div>';
        return;
    }

    var html = '';
    adminOrders.forEach(function(o) {
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
}

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
            logNotification('sms', target.phone || '+250 788 700 870', 'Favorite Cafe: Your Order #' + orderId + ' status has been updated to: ' + newStatus, 'SMS Alert - Order Status');
        }

        if (typeof showToast === 'function') {
            showToast('Order #' + orderId + ' updated to: ' + newStatus, 'success', 'Kitchen Status Updated');
        }
    }
}

// Sidebar Tab Switching
function initSidebarTabs() {
    document.querySelectorAll('.sidebar-item[data-tab]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var tabId = this.getAttribute('data-tab');

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
                if (typeof renderAdminMenuCategoryPills === 'function') renderAdminMenuCategoryPills();
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
                if (typeof renderAdminPromosGrid === 'function') renderAdminPromosGrid();
            }
        });
    });
}

var currentLiveOrdersFilter = 'all';
var currentLiveOrdersSearch = '';
var currentLiveOrdersPage = 1;
var LIVE_ORDERS_PER_PAGE = 7;

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
            logNotification('sms', target.phone || '+250 788 700 870', 'Favorite Cafe: Your Order #' + orderId + ' payment status updated to: ' + newPaymentStatus, 'SMS Alert - Payment Status');
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
        var newId = 'FC-' + Math.floor(1000 + Math.random() * 9000);
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
            renderOrdersTable(currentFilter, searchInput ? searchInput.value : '');
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function() {
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
var adminMenuTypeFilter = 'all';

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

function setAdminMenuTypeFilter(type, btn) {
    adminMenuTypeFilter = (type || 'all').toLowerCase();
    adminMenuCurrentPage = 1;

    var container = document.getElementById('adminMenuTypeTabs');
    if (container) {
        container.querySelectorAll('button').forEach(function(b) {
            b.classList.remove('active');
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline-primary');
        });
    }
    if (btn) {
        btn.classList.add('active');
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary');
    }

    renderAdminMenuCategoryPills();
    renderAdminMenu();
}
window.setAdminMenuTypeFilter = setAdminMenuTypeFilter;

function renderAdminMenuCategoryPills() {
    var container = document.getElementById('adminMenuCategoryPills');
    if (!container) return;

    var list = (typeof adminCategories !== 'undefined' && Array.isArray(adminCategories)) ? adminCategories : [];

    var totalInType = adminMenuItems.filter(function(m) {
        if (adminMenuTypeFilter === 'all') return true;
        var mt = (m.menu_type || 'lunch').toLowerCase();
        return mt === adminMenuTypeFilter || mt === 'all_day';
    }).length;

    var html = `<button class="filter-pill ${adminMenuCategoryFilter === 'all' ? 'active' : ''}" data-cat="all" onclick="setAdminMenuCategoryFilter('all', this)">All Categories (${totalInType})</button>`;

    var recognizedSlugs = [];

    list.forEach(function(cat) {
        if (!cat || !cat.slug) return;
        var slug = cat.slug.toLowerCase().trim();
        recognizedSlugs.push(slug);
        var name = cat.name || cat.slug;
        var count = adminMenuItems.filter(function(m) {
            var matchType = (adminMenuTypeFilter === 'all') || ((m.menu_type || 'lunch').toLowerCase() === adminMenuTypeFilter) || ((m.menu_type || 'lunch').toLowerCase() === 'all_day');
            return matchType && m.category && m.category.toString().toLowerCase().trim() === slug;
        }).length;

        var isActive = (adminMenuCategoryFilter === slug) ? 'active' : '';
        html += `<button class="filter-pill ${isActive}" data-cat="${slug}" onclick="setAdminMenuCategoryFilter('${slug}', this)">${name} (${count})</button>`;
    });

    // Check for any dishes whose category does not exist in Category Management
    var otherCount = adminMenuItems.filter(function(m) {
        var matchType = (adminMenuTypeFilter === 'all') || ((m.menu_type || 'lunch').toLowerCase() === adminMenuTypeFilter) || ((m.menu_type || 'lunch').toLowerCase() === 'all_day');
        var s = (m.category || '').toString().toLowerCase().trim();
        return matchType && !recognizedSlugs.includes(s);
    }).length;

    if (otherCount > 0) {
        var isOtherActive = (adminMenuCategoryFilter === 'other') ? 'active' : '';
        html += `<button class="filter-pill ${isOtherActive}" data-cat="other" onclick="setAdminMenuCategoryFilter('other', this)">Unassigned / Other (${otherCount})</button>`;
    }

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
        var itemCat = (item.category || '').toString().toLowerCase().trim();
        var itemTitle = (item.title || item.name || '').toString().toLowerCase();
        var itemTags = (item.tags || '').toString().toLowerCase();

        var matchCategory = true;
        if (adminMenuCategoryFilter !== 'all') {
            if (adminMenuCategoryFilter === 'other') {
                var recognizedSlugs = adminCategories.map(function(c) { return (c.slug || '').toLowerCase().trim(); });
                matchCategory = !recognizedSlugs.includes(itemCat);
            } else {
                matchCategory = (itemCat === adminMenuCategoryFilter);
            }
        }

        var matchMenuType = true;
        if (adminMenuTypeFilter !== 'all') {
            var mType = (item.menu_type || 'lunch').toLowerCase();
            matchMenuType = (mType === adminMenuTypeFilter || mType === 'all_day');
        }

        var matchSearch = !filterText || (itemTitle.includes(filterText) || itemTags.includes(filterText) || itemCat.includes(filterText));

        return matchCategory && matchMenuType && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fas fa-hamburger fa-3x mb-3 opacity-50"></i><h5>No menu items found</h5><p class="small">Try selecting another category or menu type.</p></div>';
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

        var mType = (item.menu_type || 'lunch').toLowerCase();
        var menuTypeBadge = '';
        if (mType === 'breakfast') {
            menuTypeBadge = '<span class="badge bg-warning text-dark position-absolute" style="top:10px;right:10px;font-size:0.75rem;"><i class="fas fa-egg me-1"></i>Breakfast</span>';
        } else if (mType === 'lunch') {
            menuTypeBadge = '<span class="badge bg-primary position-absolute" style="top:10px;right:10px;font-size:0.75rem;"><i class="fas fa-hamburger me-1"></i>Lunch</span>';
        } else {
            menuTypeBadge = '<span class="badge bg-secondary position-absolute" style="top:10px;right:10px;font-size:0.75rem;"><i class="fas fa-clock me-1"></i>All Day</span>';
        }

        html += `
            <div class="col-md-6 col-lg-4">
                <div class="admin-card h-100 mb-0 d-flex flex-column shadow-sm">
                    <div class="position-relative mb-3">
                        <img src="${itemImage}" class="w-100 rounded-3" style="height:170px;object-fit:cover;" alt="${itemTitle}" onerror="this.onerror=null; this.src='img/menu/1.jpg';" />
                        <span class="badge bg-dark position-absolute top-2 start-2 text-capitalize" style="top:10px;left:10px;font-size:0.75rem;">${itemCategory}</span>
                        ${menuTypeBadge}
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
    populateCategoryDropdowns();
    var form = document.getElementById('menuItemForm');
    if (form) form.reset();
    document.getElementById('menuItemId').value = '';
    document.getElementById('menuImage').value = 'img/menu/1.jpg';
    if (document.getElementById('menuType')) {
        document.getElementById('menuType').value = (adminMenuTypeFilter !== 'all') ? adminMenuTypeFilter : 'lunch';
    }
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

    populateCategoryDropdowns(item.category);

    document.getElementById('menuItemId').value = item.id;
    document.getElementById('menuTitle').value = item.title;
    document.getElementById('menuCategory').value = item.category;
    if (document.getElementById('menuType')) {
        document.getElementById('menuType').value = item.menu_type || 'lunch';
    }
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
    var menuType = document.getElementById('menuType') ? document.getElementById('menuType').value : 'lunch';
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
        menu_type: menuType,
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
            existing.menu_type = menuType;
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
            menu_type: menuType,
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
        logNotification('sms', phone, 'Favorite Cafe SMS: Order #' + ref + ' has been dispatched via express delivery rider!', 'SMS Dispatch Alert');
    } else if (randomType === 'email') {
        logNotification('email', 'customer@favoritecafe.com', 'Favorite Cafe E-Ticket: Table Reservation #' + ref + ' is confirmed for 08:00 PM.', 'Email Booking Ticket');
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
   STAFF MEMBERS & ROLES & CUSTOMER LOYALTY POINTS ENGINE
   ============================================================ */
var adminStaffList = [];
var adminCustomerLoyaltyList = [];

function loadStaffAndLoyaltyData() {
    try {
        var storedStaff = localStorage.getItem('favcafe_staff_members');
        if (storedStaff) {
            adminStaffList = JSON.parse(storedStaff);
        } else {
            adminStaffList = [
                { id: 1, name: 'Admin Staff', code: 'admin_Favorite Cafe', phone: '+250 788 000 111', role: 'Super Admin', permissions: 'Full Access (All Modules)', status: 'Active' },
                { id: 2, name: 'Jean Paul Ndayi', code: 'chef_jp', phone: '+250 788 222 333', role: 'Head Chef / Kitchen Manager', permissions: 'Kitchen Queue & Orders', status: 'Active' },
                { id: 3, name: 'Aline Uwase', code: 'waiter_aline', phone: '+250 788 444 555', role: 'Floor Manager / Waiter', permissions: 'Table Dining Tracker', status: 'Active' },
                { id: 4, name: 'Kagabo Patrick', code: 'cashier_pat', phone: '+250 788 666 777', role: 'Cashier & POS Billing', permissions: 'Checkout & Receipts', status: 'Active' }
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
                { id: 'CUST-101', name: 'Kayonga Raul', phone: '+250 788 700 870', email: 'kayonga70@gmail.com', loyaltyPoints: 2500 },
                { id: 'CUST-102', name: 'Eric Munyaneza', phone: '+250 788 123 456', email: 'eric@example.com', loyaltyPoints: 1200 },
                { id: 'CUST-103', name: 'Alice Umutoni', phone: '+250 788 999 000', email: 'alice@example.com', loyaltyPoints: 850 },
                { id: 'CUST-104', name: 'Keza Diane', phone: '+250 733 444 555', email: 'keza@example.com', loyaltyPoints: 3000 }
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

function renderStaffAndLoyaltyTables() {
    loadStaffAndLoyaltyData();

    // Render Staff Table
    var staffTbody = document.getElementById('staffTableBody');
    var staffCounter = document.getElementById('staffTotalCounter');
    if (staffTbody) {
        if (staffCounter) staffCounter.textContent = adminStaffList.length + ' Active Staff';
        var html = '';
        adminStaffList.forEach(function(s) {
            var roleBadgeClass = 'bg-primary';
            if (s.role.includes('Chef')) roleBadgeClass = 'bg-warning text-dark';
            else if (s.role.includes('Floor')) roleBadgeClass = 'bg-info text-dark';
            else if (s.role.includes('Cashier')) roleBadgeClass = 'bg-success';

            html += `
                <tr>
                    <td><span class="badge bg-dark font-monospace">${s.code}</span></td>
                    <td>
                        <div class="font-weight-bold text-dark">${s.name}</div>
                        <div class="small text-muted">${s.phone}</div>
                    </td>
                    <td><span class="badge ${roleBadgeClass} px-2 py-1">${s.role}</span></td>
                    <td><span class="small text-muted font-weight-bold">${s.permissions || 'Standard Access'}</span></td>
                    <td><span class="badge ${s.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${s.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditStaffModal(${s.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStaffMember(${s.id})"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
        });
        staffTbody.innerHTML = html;
    }

    // Render Customer Loyalty Table
    var custTbody = document.getElementById('customerLoyaltyTableBody');
    var custCounter = document.getElementById('customerTotalCounter');
    if (custTbody) {
        if (custCounter) custCounter.textContent = adminCustomerLoyaltyList.length + ' Customer Accounts';
        var html2 = '';
        adminCustomerLoyaltyList.forEach(function(c) {
            html2 += `
                <tr>
                    <td><span class="badge bg-secondary font-monospace">${c.id}</span></td>
                    <td>
                        <div class="font-weight-bold text-dark">${c.name}</div>
                        <div class="small text-muted">${c.phone}</div>
                    </td>
                    <td><span class="small text-primary font-weight-bold">${c.email}</span></td>
                    <td><span class="badge bg-warning text-dark fs-6 px-3 py-1 font-monospace"><i class="fas fa-star me-1"></i>${c.loyaltyPoints.toLocaleString()} Pts</span></td>
                    <td><strong class="text-success">${formatRWF(c.loyaltyPoints)} RWF</strong></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-warning text-dark font-weight-bold rounded-pill px-3" onclick="quickGrantPoints('${c.id}')">
                            <i class="fas fa-plus-circle me-1"></i> Grant Points
                        </button>
                    </td>
                </tr>
            `;
        });
        custTbody.innerHTML = html2;
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

function openEditStaffModal(id) {
    loadStaffAndLoyaltyData();
    var s = adminStaffList.find(function(staff) { return staff.id === id; });
    if (!s) return;

    document.getElementById('staffId').value = s.id;
    document.getElementById('staffName').value = s.name;
    document.getElementById('staffCode').value = s.code;
    document.getElementById('staffPhone').value = s.phone;
    document.getElementById('staffRole').value = s.role;
    document.getElementById('staffPass').value = '••••••••';

    document.getElementById('staffModalTitle').innerHTML = '<i class="fas fa-user-edit me-2" style="color:var(--primary);"></i>Edit Staff: ' + s.name;

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

function confirmSaveStaff(e) {
    if (e && e.preventDefault) e.preventDefault();
    var id = document.getElementById('staffId').value;
    var name = document.getElementById('staffName').value.trim();
    var code = document.getElementById('staffCode').value.trim();
    var phone = document.getElementById('staffPhone').value.trim();
    var role = document.getElementById('staffRole').value;

    loadStaffAndLoyaltyData();

    var permissionsMap = {
        'Super Admin': 'Full Access (All Modules)',
        'Head Chef / Kitchen Manager': 'Kitchen Queue & Orders',
        'Floor Manager / Waiter': 'Table Dining Tracker',
        'Cashier & POS Billing': 'Checkout & Receipts'
    };

    if (id) {
        var s = adminStaffList.find(function(staff) { return staff.id === parseInt(id); });
        if (s) {
            s.name = name;
            s.code = code;
            s.phone = phone;
            s.role = role;
            s.permissions = permissionsMap[role] || 'Standard Access';
        }
    } else {
        adminStaffList.push({
            id: Date.now(),
            name: name,
            code: code,
            phone: phone,
            role: role,
            permissions: permissionsMap[role] || 'Standard Access',
            status: 'Active'
        });
    }

    saveStaffMembers();
    closeStaffModal();
    renderStaffAndLoyaltyTables();
    showToast('Staff member "' + name + '" saved successfully!', 'success', 'Staff Access');
}

function deleteStaffMember(id) {
    if (!confirm('Are you sure you want to delete this staff account?')) return;
    loadStaffAndLoyaltyData();
    adminStaffList = adminStaffList.filter(function(s) { return s.id !== id; });
    saveStaffMembers();
    renderStaffAndLoyaltyTables();
    showToast('Staff member deleted.', 'info');
}

function openGrantPointsModal() {
    loadStaffAndLoyaltyData();
    var select = document.getElementById('grantCustomerSelect');
    if (select) {
        select.innerHTML = adminCustomerLoyaltyList.map(function(c) {
            return `<option value="${c.id}">${c.name} (${c.email}) - Current: ${c.loyaltyPoints} Pts</option>`;
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

function confirmGrantPointsSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var custId = document.getElementById('grantCustomerSelect').value;
    var amount = parseInt(document.getElementById('grantPointsAmount').value) || 0;

    if (!custId || amount <= 0) {
        showToast('Please select a customer and enter a valid points amount.', 'warning');
        return;
    }

    loadStaffAndLoyaltyData();
    var cust = adminCustomerLoyaltyList.find(function(c) { return c.id === custId; });
    if (cust) {
        cust.loyaltyPoints += amount;
        saveCustomerLoyalty();
        closeGrantPointsModal();
        renderStaffAndLoyaltyTables();
        logNotification('sms', cust.phone, 'Favorite Cafe Bonus: You have been granted ' + amount + ' Loyalty Points! Total Balance: ' + cust.loyaltyPoints + ' Pts.', 'Loyalty Bonus Granted');
        showToast('Granted ' + amount + ' Loyalty Points to ' + cust.name + '!', 'success', 'Points Credited');
    }
}

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

var _syncChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('favcafe_sync') : null;

async function loadAdminCategories() {
    try {
        var res = await fetch('api/categories.php?action=get&t=' + Date.now());
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.categories)) {
                adminCategories = data.categories;
                saveCategoriesToStorageLocally();
                renderAdminCategoriesTable();
                populateCategoryDropdowns();
                renderAdminMenuCategoryPills();
                return;
            }
        }
    } catch (e) {}

    try {
        var resJson = await fetch('api/categories.json?t=' + Date.now());
        if (resJson.ok) {
            var jsonCats = await resJson.json();
            if (Array.isArray(jsonCats) && jsonCats.length > 0) {
                adminCategories = jsonCats;
                saveCategoriesToStorageLocally();
                renderAdminCategoriesTable();
                populateCategoryDropdowns();
                renderAdminMenuCategoryPills();
                return;
            }
        }
    } catch (e) {}

    try {
        var stored = localStorage.getItem('favcafe_categories');
        if (stored) {
            adminCategories = JSON.parse(stored);
        }
    } catch (e) {}

    renderAdminCategoriesTable();
    populateCategoryDropdowns();
    renderAdminMenuCategoryPills();
}

function saveCategoriesToStorageLocally() {
    try {
        localStorage.setItem('favcafe_categories', JSON.stringify(adminCategories));
        localStorage.setItem('favcafe_categories_sync_ts', Date.now().toString());
    } catch (e) {}
}

function saveCategoriesToStorage() {
    saveCategoriesToStorageLocally();

    if (_syncChannel) {
        try {
            _syncChannel.postMessage({ type: 'CATEGORIES_UPDATED', timestamp: Date.now() });
        } catch (e) {}
    }
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
        } else if (data && data.message) {
            showToast(data.message, 'warning');
        }
    } catch (err) {}

    closeCategoryModal();
    // Authoritatively re-load categories from MySQL database
    await loadAdminCategories();
    saveCategoriesToStorage();
}

async function toggleCategoryStatus(catId) {
    var cat = adminCategories.find(function(c) { return String(c.id) === String(catId) || c.slug === String(catId); });
    if (!cat) return;

    var newStatus = (parseInt(cat.is_active) === 1 || cat.is_active === true) ? 0 : 1;
    cat.is_active = newStatus;
    renderAdminCategoriesTable();
    renderAdminMenuCategoryPills();

    try {
        await fetch('api/categories.php?action=toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cat.id, slug: cat.slug })
        });
    } catch (e) {}

    await loadAdminCategories();
    saveCategoriesToStorage();
    showToast('Category "' + cat.name + '" ' + (newStatus ? 'enabled' : 'disabled') + '!', 'info');
}

async function deleteCategory(catId) {
    var cat = adminCategories.find(function(c) { return String(c.id) === String(catId) || c.slug === String(catId); });
    if (!cat) return;

    if (!confirm('Are you sure you want to delete category "' + cat.name + '"?')) return;

    adminCategories = adminCategories.filter(function(c) { return String(c.id) !== String(cat.id) && c.slug !== cat.slug; });
    renderAdminCategoriesTable();
    populateCategoryDropdowns();
    renderAdminMenuCategoryPills();

    try {
        await fetch('api/categories.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cat.id, slug: cat.slug })
        });
    } catch (e) {}

    await loadAdminCategories();
    saveCategoriesToStorage();
    showToast('Category deleted successfully.', 'success');
}

function populateCategoryDropdowns(selectedVal) {
    var select = document.getElementById('menuCategory');
    if (!select) return;

    var currentVal = selectedVal !== undefined ? selectedVal : select.value;
    var html = '';
    var list = (typeof adminCategories !== 'undefined' && Array.isArray(adminCategories)) ? adminCategories : [];

    list.forEach(function(cat) {
        var isSel = (currentVal && currentVal.toString().toLowerCase() === cat.slug.toLowerCase()) ? 'selected' : '';
        html += `<option value="${cat.slug}" ${isSel}>${cat.name}</option>`;
    });

    if (currentVal && !list.some(function(c) { return c.slug.toLowerCase() === currentVal.toString().toLowerCase(); })) {
        html += `<option value="${currentVal}" selected>${currentVal} (Unassigned/Old)</option>`;
    }

    select.innerHTML = html;
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
            <title>Favorite Cafe - Table QR Stand</title>
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

async function loadAdminPromos() {
    try {
        var res = await fetch('api/promos.php?action=get');
        if (res.ok) {
            var data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.promos) && data.promos.length > 0) {
                adminPromos = data.promos;
                saveAdminPromosLocally();
                return;
            }
        }
    } catch (e) {}

    try {
        var resJson = await fetch('api/promos.json?t=' + Date.now());
        if (resJson.ok) {
            var jsonPromos = await resJson.json();
            if (Array.isArray(jsonPromos) && jsonPromos.length > 0) {
                adminPromos = jsonPromos;
                saveAdminPromosLocally();
                return;
            }
        }
    } catch (e) {}

    var stored = localStorage.getItem('favcafe_promos');
    if (stored) {
        try {
            adminPromos = JSON.parse(stored);
        } catch (e) {}
    } else {
        adminPromos = [
            { id: 1, title: "Weekend Treat Voucher", subtitle: "Use Code FAV20 on Orders Above 5,000 RWF", discount: "20% OFF", img: "img/promo/promoBanner.png", is_active: 1, sort_order: 1 },
            { id: 2, title: "Weekday Lunch Deal", subtitle: "Enjoy 15% off lunch plates and grills", discount: "15% OFF", img: "img/menu/dish_1786025102_4409.png", is_active: 1, sort_order: 2 }
        ];
        saveAdminPromos();
    }
}

function saveAdminPromosLocally() {
    try {
        localStorage.setItem('favcafe_promos', JSON.stringify(adminPromos));
        localStorage.setItem('favcafe_promos_sync_ts', Date.now().toString());
    } catch (e) {}
}

function saveAdminPromos() {
    saveAdminPromosLocally();

    if (!_syncChannel && ('BroadcastChannel' in window)) {
        try { _syncChannel = new BroadcastChannel('favcafe_sync'); } catch(e) {}
    }
    if (_syncChannel) {
        try {
            _syncChannel.postMessage({ type: 'PROMOS_UPDATED', timestamp: Date.now() });
        } catch (e) {}
    }
}

async function renderAdminPromosGrid() {
    await loadAdminPromos();
    var grid = document.getElementById('adminPromosGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (adminPromos.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5">No promos found. Click "Add New Promo" above.</div>';
        return;
    }
    
    adminPromos.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        var isActive = p.is_active === undefined || parseInt(p.is_active) === 1 || p.is_active === true;
        var statusBadge = isActive ? '<span class="badge bg-success" style="position:absolute; top:10px; left:10px; z-index:2;"><i class="fas fa-check-circle me-1"></i>Active</span>' : '<span class="badge bg-danger" style="position:absolute; top:10px; left:10px; z-index:2;"><i class="fas fa-eye-slash me-1"></i>Disabled</span>';
        var cardOpacity = isActive ? '1' : '0.65';

        card.innerHTML = `
            <div class="admin-card border h-100 d-flex flex-column shadow-sm" style="overflow:hidden; opacity:${cardOpacity}; transition:opacity 0.2s;">
                <div style="height:160px; background:linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.4)), url('${p.img || 'img/promo/promoBanner.png'}') center/cover; position:relative;">
                    ${statusBadge}
                    <div style="position:absolute; top:10px; right:10px; background:var(--primary); color:white; padding:4px 10px; border-radius:12px; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 6px rgba(0,0,0,0.2);">${p.discount}</div>
                </div>
                <div class="p-3 flex-grow-1">
                    <div class="text-muted small text-uppercase fw-semibold mb-1">${p.subtitle}</div>
                    <h5 class="mb-2 fw-bold text-dark">${p.title}</h5>
                    <div class="text-muted small"><i class="fas fa-image me-1"></i>${p.img}</div>
                </div>
                <div class="p-3 border-top d-flex justify-content-end gap-2 bg-light">
                    <button class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="togglePromoStatus(${p.id})" title="${isActive ? 'Disable promo banner' : 'Enable promo banner'}">
                        <i class="fas ${isActive ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editPromo(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePromo(${p.id})"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function togglePromoStatus(id) {
    var p = adminPromos.find(x => parseInt(x.id) === parseInt(id));
    if (!p) return;

    p.is_active = (p.is_active === undefined || parseInt(p.is_active) === 1 || p.is_active === true) ? 0 : 1;
    saveAdminPromos();
    renderAdminPromosGrid();

    try {
        await fetch('api/promos.php?action=toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
    } catch (e) {}

    showToast('Promo "' + p.title + '" ' + (p.is_active ? 'enabled' : 'disabled') + '!', 'info');
}

function openPromoModal() {
    var form = document.getElementById('promoForm');
    if (form) form.reset();
    var idInput = document.getElementById('promoId');
    if (idInput) idInput.value = '';
    var titleEl = document.getElementById('promoModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fas fa-bullhorn me-2" style="color:var(--primary);"></i>Add New Promo';
    
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closePromoModal() {
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function editPromo(id) {
    var p = adminPromos.find(x => parseInt(x.id) === parseInt(id));
    if (!p) return;
    
    document.getElementById('promoId').value = p.id;
    document.getElementById('promoTitle').value = p.title || '';
    document.getElementById('promoSubtitle').value = p.subtitle || '';
    document.getElementById('promoDiscount').value = p.discount || '';
    document.getElementById('promoImg').value = p.img || '';
    
    document.getElementById('promoModalTitle').innerHTML = '<i class="fas fa-bullhorn me-2" style="color:var(--primary);"></i>Edit Promo';
    
    var modal = document.getElementById('promoModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

async function deletePromo(id) {
    if (confirm("Are you sure you want to delete this promo banner?")) {
        adminPromos = adminPromos.filter(x => parseInt(x.id) !== parseInt(id));
        saveAdminPromos();
        renderAdminPromosGrid();

        try {
            await fetch('api/promos.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
        } catch (e) {}

        showToast("Promo deleted successfully.", "success");
    }
}

async function savePromoItem(event) {
    event.preventDefault();
    var id = document.getElementById('promoId').value;
    var title = document.getElementById('promoTitle').value;
    var subtitle = document.getElementById('promoSubtitle').value;
    var discount = document.getElementById('promoDiscount').value;
    var img = document.getElementById('promoImg').value;
    
    var promoData = {
        id: id ? parseInt(id) : 0,
        title: title,
        subtitle: subtitle,
        discount: discount,
        img: img,
        is_active: 1
    };

    try {
        var res = await fetch('api/promos.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promoData)
        });
        if (res.ok) {
            var data = await res.json();
            if (data && data.id && !id) {
                promoData.id = data.id;
            }
        }
    } catch (e) {}

    if (id) {
        var idx = adminPromos.findIndex(x => parseInt(x.id) === parseInt(id));
        if (idx > -1) {
            adminPromos[idx] = Object.assign({}, adminPromos[idx], promoData);
            showToast("Promo updated successfully.", "success");
        }
    } else {
        if (!promoData.id) {
            promoData.id = adminPromos.length > 0 ? Math.max(...adminPromos.map(x => parseInt(x.id) || 0)) + 1 : 1;
        }
        adminPromos.push(promoData);
        showToast("Promo added successfully.", "success");
    }
    
    saveAdminPromos();
    closePromoModal();
    renderAdminPromosGrid();
}

window.loadAdminPromos = loadAdminPromos;
window.renderAdminPromosGrid = renderAdminPromosGrid;
window.openPromoModal = openPromoModal;
window.closePromoModal = closePromoModal;
window.editPromo = editPromo;
window.deletePromo = deletePromo;
window.togglePromoStatus = togglePromoStatus;
window.savePromoItem = savePromoItem;
