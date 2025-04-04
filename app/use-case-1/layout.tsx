import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounts - Company Dashboard",
  description: "Manage company accounts information",
};

export default function AccountsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="container mx-auto py-4">
      {children}
    </div>
  );
} 