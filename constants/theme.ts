export type AppTheme = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  border: string;
};

export const lightTheme: AppTheme = {
  background: '#f8f8f6',
  surface: '#ffffff',
  surfaceMuted: 'rgba(236, 182, 19, 0.08)',
  text: '#221d10',
  textMuted: '#64748b',
  textOnPrimary: '#221d10',
  primary: '#ecb613',
  border: 'rgba(236, 182, 19, 0.15)',
};

export const darkTheme: AppTheme = {
  background: '#0f0e0a',
  surface: '#242016',
  surfaceMuted: 'rgba(236, 182, 19, 0.06)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textOnPrimary: '#221d10',
  primary: '#ecb613',
  border: 'rgba(236, 182, 19, 0.11)',
};
