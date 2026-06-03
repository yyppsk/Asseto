export const ADMIN_THEME_KEY = 'paddockindia-admin-theme';

export function getStoredAdminTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.localStorage.getItem(ADMIN_THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function storeAdminTheme(theme) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_THEME_KEY, theme === 'light' ? 'light' : 'dark');
  }
}

export function displayRole(user) {
  if (!user) {
    return 'Loading';
  }

  if (user.isSuperAdmin || user.role === 'super_admin') {
    return 'Super Admin';
  }

  if (user.role === 'content_manager') {
    return 'Content Manager';
  }

  return 'Member';
}
