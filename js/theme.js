/* ============================================================
   Shared Dark / Light Theme Controller
   Used by: index.html, admin.html (desktop) — shares its storage
   key with mobile_app.html so one choice applies everywhere.

   Load this file synchronously in <head> (before stylesheets
   finish painting) to avoid a flash of the wrong theme.

   - Sets  <html data-theme="dark|light" data-bs-theme="dark|light">
   - First visit: follows the OS (prefers-color-scheme)
   - After the user toggles: remembers the choice in localStorage
   - Syncs across open tabs (storage event)
   - Any element with [data-theme-toggle] becomes a toggle button;
     an <i> inside it gets its icon swapped (fa-moon <-> fa-sun)
   - Testing override: ?theme=dark or ?theme=light (not persisted)
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 'favcafe_mobile_theme_mode'; // shared with mobile_app.js
    var root = document.documentElement;
    var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function getSaved() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === 'dark' || v === 'light' ? v : null;
        } catch (e) {
            return null;
        }
    }

    function getUrlOverride() {
        try {
            var v = new URLSearchParams(window.location.search).get('theme');
            return v === 'dark' || v === 'light' ? v : null;
        } catch (e) {
            return null;
        }
    }

    function getSystem() {
        return mql && mql.matches ? 'dark' : 'light';
    }

    function resolve() {
        return getUrlOverride() || getSaved() || getSystem();
    }

    function syncToggles(theme) {
        var isDark = theme === 'dark';
        var buttons = document.querySelectorAll('[data-theme-toggle]');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
            btn.setAttribute('aria-pressed', String(isDark));
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
            var icon = btn.querySelector('i');
            if (icon) {
                // Show the icon of the mode you'd switch TO
                icon.classList.toggle('fa-sun', isDark);
                icon.classList.toggle('fa-moon', !isDark);
            }
        }
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-bs-theme', theme); // Bootstrap 5.3 color modes
        root.style.colorScheme = theme;
        syncToggles(theme);
    }

    function set(theme, persist) {
        if (theme !== 'dark' && theme !== 'light') return;
        if (persist !== false) {
            try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
        }
        // Brief class so CSS can animate colors only during an intentional switch
        root.classList.add('theme-transition');
        apply(theme);
        window.clearTimeout(set._t);
        set._t = window.setTimeout(function () {
            root.classList.remove('theme-transition');
        }, 400);
        try {
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
        } catch (e) {}
    }

    function get() {
        return root.getAttribute('data-theme') || resolve();
    }

    function toggle() {
        set(get() === 'dark' ? 'light' : 'dark');
    }

    // 1) Apply immediately (runs in <head>, before first paint)
    apply(resolve());

    // 2) Wire up toggle buttons once the DOM exists
    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
        if (btn) {
            e.preventDefault();
            toggle();
        }
    });
    document.addEventListener('DOMContentLoaded', function () {
        syncToggles(get());
    });

    // 3) Follow OS changes only while the user hasn't chosen explicitly
    if (mql) {
        var onSystemChange = function () {
            if (!getSaved() && !getUrlOverride()) apply(getSystem());
        };
        if (mql.addEventListener) mql.addEventListener('change', onSystemChange);
        else if (mql.addListener) mql.addListener(onSystemChange);
    }

    // 4) Keep other open tabs (desktop or mobile app) in sync
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY && !getUrlOverride()) apply(getSaved() || getSystem());
    });

    window.FavTheme = { get: get, set: set, toggle: toggle };
})();
