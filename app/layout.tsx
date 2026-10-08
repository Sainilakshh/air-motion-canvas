import './globals.css';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
export const metadata = { title: 'Air Motion Canvas' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={`dark ${display.variable} ${body.variable}`}><body>{children}</body></html>);
}
