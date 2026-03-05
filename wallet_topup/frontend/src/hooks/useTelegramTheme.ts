import { useEffect } from "react";

/**
 * Reads Telegram WebApp theme parameters and applies them as CSS custom properties.
 * Falls back to the built-in dark theme CSS variables when not inside Telegram.
 * Spec §9.5: Theme Support
 */
export function useTelegramTheme(): void {
  useEffect(() => {
    const twa = window.Telegram?.WebApp;
    if (!twa) return;

    const params = twa.themeParams;
    const root = document.documentElement;

    if (params.bg_color) root.style.setProperty("--tg-bg", params.bg_color);
    if (params.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", params.secondary_bg_color);
    if (params.text_color) root.style.setProperty("--tg-text", params.text_color);
    if (params.hint_color) root.style.setProperty("--tg-hint", params.hint_color);
    if (params.button_color) root.style.setProperty("--tg-button", params.button_color);
    if (params.button_text_color) root.style.setProperty("--tg-btn-text", params.button_text_color);
    if (params.link_color) root.style.setProperty("--tg-link", params.link_color);

    // Map Telegram theme to our CSS variables so components use the Telegram colors
    if (params.bg_color) root.style.setProperty("--bg-primary", params.bg_color);
    if (params.secondary_bg_color) root.style.setProperty("--bg-secondary", params.secondary_bg_color);
    if (params.text_color) root.style.setProperty("--text-primary", params.text_color);
    if (params.hint_color) root.style.setProperty("--text-secondary", params.hint_color);
    if (params.button_color) root.style.setProperty("--accent", params.button_color);
    if (params.button_text_color) root.style.setProperty("--btn-text", params.button_text_color);
  }, []);
}
