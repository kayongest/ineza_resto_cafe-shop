const fs = require('fs');
let code = fs.readFileSync('js/mobile_app.js', 'utf8');

const copyMomoOld = "var code = rawAmount ? \*182*8*1*004587*\#\ : \*182*8*1*004587#\;";
const copyMomoNew = "var code = '';\n    if (selectedMobileMomoOperator === 'MTN') {\n        code = rawAmount ? \*182*8*1*004587*\#\ : \*182*8*1*004587#\;\n    } else {\n        code = rawAmount ? \*182*1*2*004587*\#\ : \*182*1*2*004587#\;\n    }";
code = code.replace(copyMomoOld, copyMomoNew);

const ussdStrOld = "const ussdString = amountValInt ? \*182*8*1*004587*\#\ : '*182*8*1*004587*Amount#';";
const ussdStrNew = "const ussdStringMTN = amountValInt ? \*182*8*1*004587*\#\ : '*182*8*1*004587*Amount#';\n    const ussdStringAirtel = amountValInt ? \*182*1*2*004587*\#\ : '*182*1*2*004587*Amount#';";
code = code.replace(ussdStrOld, ussdStrNew);

code = code.replace(/code1\.textContent = ussdString;/g, (match, offset) => {
    return offset < code.indexOf("if (op === 'MTN')") + 300 ? "code1.textContent = ussdStringMTN;" : "code1.textContent = ussdStringAirtel;";
});
code = code.replace(/dialSub\.textContent = ussdString;/g, (match, offset) => {
    return offset < code.indexOf("if (op === 'MTN')") + 500 ? "dialSub.textContent = ussdStringMTN;" : "dialSub.textContent = ussdStringAirtel;";
});

const airtelHrefOld = "dialLink.href = amountValInt ? \	el:*182*8*1*004587*\%23\ : \	el:*182*8*1*004587%23\;";
const airtelHrefNew = "dialLink.href = amountValInt ? \	el:*182*1*2*004587*\%23\ : \	el:*182*1*2*004587%23\;";

// find the second occurrence of airtelHrefOld inside the Airtel else block
const firstHref = code.indexOf(airtelHrefOld);
const secondHref = code.indexOf(airtelHrefOld, firstHref + 10);
if (secondHref !== -1) {
    code = code.substring(0, secondHref) + airtelHrefNew + code.substring(secondHref + airtelHrefOld.length);
}

fs.writeFileSync('js/mobile_app.js', code);
console.log('Operator logic updated');
