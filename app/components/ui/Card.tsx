export function Card({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {typeof title === "string" ? (
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          ) : (
            title
          )}
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
