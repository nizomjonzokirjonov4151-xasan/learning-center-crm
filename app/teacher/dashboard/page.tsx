import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import TeacherDashboard from "@/app/components/TeacherDashboard";

export default async function TeacherDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    redirect("/login");
  }
  return <TeacherDashboard session={session} />;
}
