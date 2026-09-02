import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finanças Familiar - Gestão Financeira Pessoal & Familiar',
  description: 'Controle integrado de contas, cartões, orçamentos e metas familiares',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
