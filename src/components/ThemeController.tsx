import React, { useEffect } from 'react';
import { useSite } from '../SiteContext';

const setCssVariable = (name: string, value: string) => {
  if (!value.trim()) return;
  document.documentElement.style.setProperty(name, value.trim());
};

export function ThemeController() {
  const { settings } = useSite();

  useEffect(() => {
    setCssVariable('--aab-primary', settings.themePrimary);
    setCssVariable('--aab-rose', settings.themePrimary);
    setCssVariable('--aab-bg', settings.themeBackground);
    setCssVariable('--aab-cream', settings.themeBackground);
    setCssVariable('--aab-text', settings.themeText);
    setCssVariable('--aab-charcoal', settings.themeText);
    setCssVariable('--aab-muted', settings.themeMuted);
    setCssVariable('--aab-warm-gray', settings.themeMuted);
    setCssVariable('--aab-accent', settings.themeAccent);
    setCssVariable('--aab-gold', settings.themeAccent);
  }, [
    settings.themePrimary,
    settings.themeBackground,
    settings.themeText,
    settings.themeMuted,
    settings.themeAccent,
  ]);

  return null;
}
