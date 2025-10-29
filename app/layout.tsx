import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle Financeiro Familiar",
  description: "Gerencie contas, categorias e despesas da sua família"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
