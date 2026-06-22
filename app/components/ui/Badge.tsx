type BadgeColor = "blue" | "emerald" | "violet" | "red" | "amber" | "gray" | "teal" | "orange" | "yellow";

const COLOR_CLS: Record<BadgeColor, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  red: "bg-red-50 text-red-700 border-red-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  teal: "bg-teal-50 text-teal-700 border-teal-100",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export function Badge({
  color = "gray",
  children,
  className = "",
}: {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COLOR_CLS[color]} ${className}`}
    >
      {children}
    </span>
  );
}
