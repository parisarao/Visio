/**
 * ThemeManager — Theme switching via CSS custom properties
 */
(function () {
    'use strict';
    const bus = () => window.PMB.EventBus;
    const state = () => window.PMB.StateManager;

    const ThemeManager = {
        init() {
            const select = document.getElementById('theme-select');
            // Apply saved theme
            const settings = state().getSettings();
            if (settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
                select.value = settings.theme;
            }

            select.addEventListener('change', (e) => {
                const theme = e.target.value;
                document.documentElement.setAttribute('data-theme', theme);
                state().updateSettings({ theme });
                bus().emit('toast', 'info', `Theme: ${theme}`);
            });

            bus().on('settings:changed', (s) => {
                if (s.theme) {
                    document.documentElement.setAttribute('data-theme', s.theme);
                    select.value = s.theme;
                }
            });
        }
    };

    window.PMB = window.PMB || {};
    window.PMB.ThemeManager = ThemeManager;
})();
