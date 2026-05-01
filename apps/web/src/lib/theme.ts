export type ThemeMode = 'light' | 'dark' | 'system';

const storageKey = 'wildvision-theme';

export function getStoredTheme(): ThemeMode {
    const stored = localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function resolveTheme(theme: ThemeMode) {
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
}

export function applyTheme(theme: ThemeMode) {
    const resolved = resolveTheme(theme);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
}
