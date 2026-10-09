import './globals.css';
export const metadata = { title: 'Air Motion Canvas' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the system font stack so production builds do not need network access to Google Fonts.
  return (<html lang="en" className="dark" style={{ '--font-display': 'ui-sans-serif', '--font-body': 'Inter' } as React.CSSProperties}><body>{children}</body></html>);
}
