const fs = require('fs');
let code = fs.readFileSync('js/mobile_app.js', 'utf8');

// Inject global variables
code = code.replace(
    /let currentMobilePinDigits = '';/,
    "let currentMobilePinDigits = '';\nlet selectedPaymentMethod = 'MoMo';\n\nfunction setPaymentMethod(method) {\n    selectedPaymentMethod = method;\n    const momoBtn = document.getElementById('payMethodMomo');\n    const codBtn = document.getElementById('payMethodCOD');\n    if (momoBtn && codBtn) {\n        if (method === 'MoMo') {\n            momoBtn.classList.add('active');\n            momoBtn.style.background = '#00d2d3';\n            momoBtn.style.color = '#1e293b';\n            codBtn.classList.remove('active');\n            codBtn.style.background = 'transparent';\n            codBtn.style.color = '#94a3b8';\n        } else {\n            codBtn.classList.add('active');\n            codBtn.style.background = '#00d2d3';\n            codBtn.style.color = '#1e293b';\n            momoBtn.classList.remove('active');\n            momoBtn.style.background = 'transparent';\n            momoBtn.style.color = '#94a3b8';\n        }\n    }\n}\nwindow.setPaymentMethod = setPaymentMethod;"
);

// Update order creation payload inside checkout()
code = code.replace(
    /paymentMethod: 'Momo Pay',\s*paymentStatus: 'Paid',/,
    "paymentMethod: selectedPaymentMethod === 'MoMo' ? 'Momo Pay' : 'Cash on Delivery',\n        paymentStatus: selectedPaymentMethod === 'MoMo' ? 'Paid' : 'Pending',"
);

// Update logic inside checkout()
const oldLogic = "pendingMobileMomoOrder = newOrder;\n    triggerMobileMomoUssd(custPhone, finalTotal);";
const newLogic = "if (selectedPaymentMethod === 'MoMo') {\n        pendingMobileMomoOrder = newOrder;\n        triggerMobileMomoUssd(custPhone, finalTotal);\n    } else {\n        let storedOrders = [];\n        try {\n            const stored = localStorage.getItem('favcafe_orders');\n            if (stored) storedOrders = JSON.parse(stored);\n        } catch (e) {}\n        storedOrders.unshift(newOrder);\n        try {\n            localStorage.setItem('favcafe_orders', JSON.stringify(storedOrders));\n            localStorage.setItem('favcafe_orders_signal', JSON.stringify({ type: 'order_created', order: newOrder, ts: Date.now() }));\n        } catch (e) {}\n        try {\n            const orderChan = new BroadcastChannel('favcafe_orders_channel');\n            orderChan.postMessage({ type: 'order_created', order: newOrder });\n        } catch (e) {}\n        try {\n            fetch('api/orders.php?action=create', {\n                method: 'POST',\n                headers: { 'Content-Type': 'application/json' },\n                body: JSON.stringify(newOrder)\n            }).catch(() => {});\n        } catch (e) {}\n\n        cart = [];\n        appliedLoyaltyPoints = 0;\n        promoDiscountAmount = 0;\n        appliedPromoCode = null;\n        localStorage.setItem('favcafe_cart', JSON.stringify([]));\n        loadCart();\n        closeSidebarDrawer();\n\n        showToast('? Order #' + newOrder.id + ' placed successfully (COD).', 'success');\n\n        setTimeout(() => {\n            switchTab('history');\n            loadMobileOrderHistory();\n            openOrderTrackingModal(newOrder.id);\n        }, 600);\n    }";
code = code.replace(oldLogic, newLogic);

fs.writeFileSync('js/mobile_app.js', code);
console.log('Checkout logic updated');
