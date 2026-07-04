import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
