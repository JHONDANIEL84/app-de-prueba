import "./globals.css";

export const metadata = {
  title: "Qwen AI Image Studio",
  description: "Generador de imágenes con IA para celular",
  manifest: "/manifest.json",
  themeColor: "#090d16",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Qwen AI",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
