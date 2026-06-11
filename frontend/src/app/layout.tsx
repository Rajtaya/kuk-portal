import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import { DarkModeProvider } from '@/lib/dark-mode-context';
import { ThemeProvider } from '@/lib/theme-context';
import { CommandPalette } from '@/components/ui/command-palette';

// Prevent Railway CDN from caching stale pages
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'University Employees Management System',
  description: 'Centralized employees management system for Haryana universities',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UEMS',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#C75000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apply saved theme + dark mode before paint to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ui-theme');document.documentElement.classList.add('theme-'+(t||'warm'));}catch(e){document.documentElement.classList.add('theme-warm');}try{var d=localStorage.getItem('dark-mode');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(d==='true'||(d===null&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} ${playfair.variable}`}>
        <ThemeProvider>
          <DarkModeProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
              <CommandPalette />
            </AuthProvider>
          </DarkModeProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                ${
                  process.env.NODE_ENV === 'production'
                    ? `window.addEventListener('load', () => {
                         navigator.serviceWorker.register('/sw.js').catch(() => {});
                       });`
                    : `// Dev: never run the SW — it shadows hot-reloaded chunks with stale cached copies.
                       navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
                       if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));`
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
