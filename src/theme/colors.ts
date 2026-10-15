/** Paleta e ngjyrave. Përdor gjithmonë këto token-a, jo vlera hex direkt në ekrane. */
export const colors = {
  // E kuqja e markës: shiritat e kategorive/produkteve, butonat kryesorë.
  primary: '#E53935',
  primaryDark: '#B71C1C',
  primaryLight: '#FDECEA',
  // E verdha e shiritit të njoftimeve.
  accent: '#F4C542',
  accentLight: '#FEF7DC',

  // Shiriti i poshtëm dhe butonat dytësorë (të errët).
  dark: '#212529',
  darkMuted: '#ADB5BD',

  background: '#F4F4F4',
  surface: '#FFFFFF',
  border: '#E3E3E3',

  text: '#1F2328',
  textSecondary: '#5F6670',
  textMuted: '#8C939D',
  textOnPrimary: '#FFFFFF',

  success: '#1E8E5A',
  successLight: '#E6F5EE',
  warning: '#B26A00',
  warningLight: '#FFF4E0',
  danger: '#C62828',
  dangerLight: '#FDECEA',

  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorToken = keyof typeof colors;
