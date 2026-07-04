import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
