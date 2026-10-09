const fs = require('fs');
let content = fs.readFileSync('js/mobile_app.js', 'utf8');

const fallbackRegex = /\s*if\s*\(!appCategories\s*\|\|\s*appCategories\.length\s*===\s*0\)\s*\{\s*appCategories\s*=\s*\[\.\.\.DEFAULT_FALLBACK_CATEGORIES\];\s*\}/g;
content = content.replace(fallbackRegex, '');

const newLoadCategories = sync function loadCategories() {
    let rawCategories = null;
    try {
        const res = await fetch('api/categories.php?action=get&active_only=1');
        if (res.ok) {
            const data = await res.json();
            if (data && data.status === 'success' && Array.isArray(data.categories)) {
                rawCategories = data.categories;
            }
        }
    } catch (e) {}

    if (!rawCategories) {
        try {
            const resJson = await fetch('api/categories.json?t=' + Date.now());
            if (resJson.ok) {
                const jsonCats = await resJson.json();
                if (Array.isArray(jsonCats)) {
                    rawCategories = jsonCats;
                }
            }
        } catch (e) {}
    }

    if (!rawCategories) {
        const cached = localStorage.getItem('favcafe_categories') || localStorage.getItem('favcafe_mobile_categories');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    rawCategories = parsed;
                }
            } catch (e) {}
        }
    }

    if (rawCategories) {
        appCategories = rawCategories.filter(c => !c.hasOwnProperty('is_active') || parseInt(c.is_active) === 1 || c.is_active === true || c.is_active === '1');
        try { localStorage.setItem('favcafe_categories', JSON.stringify(appCategories)); } catch (e) {}
    } else {
        appCategories = [...DEFAULT_FALLBACK_CATEGORIES];
    }
};

const oldLoadCategoriesPattern = /async function loadCategories\(\)\s*\{[\s\S]*?\n\}/g;
content = content.replace(oldLoadCategoriesPattern, newLoadCategories);

fs.writeFileSync('js/mobile_app.js', content);
console.log('Updated with Node!');
