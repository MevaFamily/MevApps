import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AppProvider from "@/components/AppProvider";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Home Super-App",
  description: "Minimalist Real-time Home Management",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: '#FAFAFA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900 antialiased h-[100dvh] flex flex-col overflow-hidden`}>
        <AppProvider>
          <AuthGuard>
            <main className="flex-1 overflow-y-auto pb-24 touch-pan-y">
              {children}
            </main>
            <BottomNav />
          </AuthGuard>
        </AppProvider>
      </body>
    </html>
  );
}
