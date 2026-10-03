import './globals.css';
export const metadata = { title: 'Hotel POS', description: 'Restaurant and room service POS' };
export default function RootLayout({ children }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></head><body>{children}</body></html>);
}
