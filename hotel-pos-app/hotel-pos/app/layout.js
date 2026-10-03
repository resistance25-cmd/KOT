import './globals.css';
export const metadata = { title: 'Hotel POS', description: 'Restaurant and room service POS' };
export default function RootLayout({ children }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" /></head><body>{children}</body></html>);
}
