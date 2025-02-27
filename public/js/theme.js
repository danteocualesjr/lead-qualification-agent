// Theme initialization and management
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'system') {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', e => {
        if (localStorage.getItem('theme') === 'system') {
            initializeTheme();
        }
    });

// Initialize theme on page load
initializeTheme();