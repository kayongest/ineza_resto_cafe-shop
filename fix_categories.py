import re

with open('js/mobile_app.js', 'r', encoding='utf-8') as f:
    content = f.read()

fallback_block = re.compile(r'\s*if\s*\(!appCategories\s*\|\|\s*appCategories\.length\s*===\s*0\)\s*\{\s*appCategories\s*=\s*\[\.\.\.DEFAULT_FALLBACK_CATEGORIES\];\s*\}')
content = fallback_block.sub('', content)

new_load_categories = '''async function loadCategories() {
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
}'''

old_load_categories_pattern = re.compile(r'async function loadCategories\(\)\s*\{.*?\n\}', re.DOTALL)
content = old_load_categories_pattern.sub(new_load_categories, content)

with open('js/mobile_app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated!')
