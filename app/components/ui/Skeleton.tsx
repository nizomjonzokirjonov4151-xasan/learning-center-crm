export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} style={style} />;
}

export function TableRowSkeleton({ widths = [150, 100, 90, 90, 90] }: { widths?: number[] }) {
  return (
    <tr className="border-b border-gray-50">
      {widths.map((w, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-3.5" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}
