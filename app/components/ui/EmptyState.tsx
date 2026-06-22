export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
