const fs = require('fs');
let code = fs.readFileSync('js/mobile_app.js', 'utf8');

const regex = /function updateMomoDisplayForOperator\(op, amountVal\) \{[\s\S]*?\}\n\nfunction selectMobileMomoOperator/m;

const newFunc = \unction updateMomoDisplayForOperator(op, amountVal) {
    const title1 = document.getElementById('momoDemoTitle1');
    const code1 = document.getElementById('momoDemoCode1');
    const title2 = document.getElementById('momoDemoTitle2');
    const clientName = document.getElementById('momoClientMerchantName');
    const dialLink = document.getElementById('momoDialNowLink');
    const dialTitle = document.getElementById('momoDialBtnTitle');
    const dialSub = document.getElementById('momoDialBtnSubtitle');

    const rawAmount = amountVal || (pendingMobileMomoOrder ? pendingMobileMomoOrder.total : 0);
    const amountValInt = rawAmount > 0 ? Math.round(rawAmount) : '';
    const formattedAmount = amountValInt ? amountValInt.toLocaleString() : 'Amount';
    
    const ussdStringMTN = amountValInt ? \\\*182*8*1*004587*\\\#\\\ : '*182*8*1*004587*Amount#';
    const ussdStringAirtel = amountValInt ? \\\*182*1*2*004587*\\\#\\\ : '*182*1*2*004587*Amount#';

    if (clientName) clientName.textContent = 'INEZA Resto & Cafe Shop';

    if (op === 'MTN') {
        if (title1) title1.innerHTML = '<i class="fas fa-qrcode me-1 text-warning"></i> MoMo Code (004587)';
        if (code1) code1.textContent = ussdStringMTN;
        if (title2) title2.innerHTML = '<i class="fas fa-store me-1 text-cyan"></i> Client Name';
        if (dialLink) {
            dialLink.href = amountValInt ? \\\	el:*182*8*1*004587*\\\%23\\\ : \\\	el:*182*8*1*004587%23\\\;
            dialLink.style.background = 'linear-gradient(135deg, #ffcc00, #ffb300)';
            dialLink.style.color = '#000000';
            dialLink.style.boxShadow = '0 4px 14px rgba(255, 204, 0, 0.35)';
        }
        if (dialTitle) dialTitle.textContent = 'Dial MTN MoMo Code Now';
        if (dialSub) dialSub.textContent = ussdStringMTN;
    } else {
        if (title1) title1.innerHTML = '<i class="fas fa-qrcode me-1 text-danger"></i> Airtel Money Code (004587)';
        if (code1) code1.textContent = ussdStringAirtel;
        if (title2) title2.innerHTML = '<i class="fas fa-store me-1 text-cyan"></i> Client Name';
        if (dialLink) {
            dialLink.href = amountValInt ? \\\	el:*182*1*2*004587*\\\%23\\\ : \\\	el:*182*1*2*004587%23\\\;
            dialLink.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            dialLink.style.color = '#ffffff';
            dialLink.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.35)';
        }
        if (dialTitle) dialTitle.textContent = 'Dial Airtel Money Code Now';
        if (dialSub) dialSub.textContent = ussdStringAirtel;
    }
}

function selectMobileMomoOperator\;

code = code.replace(regex, newFunc);
fs.writeFileSync('js/mobile_app.js', code);
