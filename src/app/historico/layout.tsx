import { AppHeader } from "@/components/app-header";

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 pb-6">
      <AppHeader />
      {children}
    </div>
  );
}
