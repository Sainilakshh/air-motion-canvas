import './globals.css';
export const metadata = { title: 'Air Motion Canvas' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className="dark"><body>{children}</body></html>);
}
