import "./globals.css";

export const metadata = {
  title: "Ricardo AI — by Riscasan",
  description: "Multilingual AI for work, study, business and everyday life."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
