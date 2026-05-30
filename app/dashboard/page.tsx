import type { Metadata } from "next";
import { IntakeScreen } from "@/components/pipeline/intake-screen";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return <IntakeScreen />;
}
