/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F2F6FA',
    tint: '#66E2C4',
    background: '#080C12',
    foreground: '#F2F6FA',
    card: '#111923',
    cardForeground: '#F2F6FA',
    primary: '#66E2C4',
    primaryForeground: '#08110F',
    secondary: '#17222E',
    secondaryForeground: '#E9EFF5',
    muted: '#17222E',
    mutedForeground: '#92A0AE',
    accent: '#1E2C39',
    accentForeground: '#F2F6FA',
    destructive: '#FF6C72',
    destructiveForeground: '#18090A',
    border: '#263442',
    input: '#263442',
    playerBlack: '#020407',
    playerSurface: '#0C131C',
    selectedChannel: '#1A302F',
    selectedChannelFocused: '#203D3A',
    selectedChannelBorder: '#32615A',
    liveBadge: 'rgba(255, 108, 114, 0.15)',
    scrim: 'rgba(5, 8, 12, 0.88)',
  },
  dark: {
    text: '#F2F6FA',
    tint: '#66E2C4',
    background: '#080C12',
    foreground: '#F2F6FA',
    card: '#111923',
    cardForeground: '#F2F6FA',
    primary: '#66E2C4',
    primaryForeground: '#08110F',
    secondary: '#17222E',
    secondaryForeground: '#E9EFF5',
    muted: '#17222E',
    mutedForeground: '#92A0AE',
    accent: '#1E2C39',
    accentForeground: '#F2F6FA',
    destructive: '#FF6C72',
    destructiveForeground: '#18090A',
    border: '#263442',
    input: '#263442',
    playerBlack: '#020407',
    playerSurface: '#0C131C',
    selectedChannel: '#1A302F',
    selectedChannelFocused: '#203D3A',
    selectedChannelBorder: '#32615A',
    liveBadge: 'rgba(255, 108, 114, 0.15)',
    scrim: 'rgba(5, 8, 12, 0.88)',
  },
  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
