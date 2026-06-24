import { NotificationsFeed } from "@/app/components/NotificationsFeed";

export default function TeacherNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <NotificationsFeed accent="indigo" />
      </div>
    </div>
  );
}
