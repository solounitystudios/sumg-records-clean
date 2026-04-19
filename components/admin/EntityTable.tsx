interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface EntityTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function EntityTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  emptyMessage = "No records found.",
}: EntityTableProps<T>) {
  return (
    <div className="border border-white/5 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-5 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-white/30 font-normal"
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-5 py-3 text-right text-[10px] tracking-[0.2em] uppercase text-white/30 font-normal">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-5 py-10 text-center text-white/20 italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors duration-150 ${
                  idx % 2 === 0 ? "" : "bg-white/[0.01]"
                }`}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-5 py-3.5 text-white/60">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row.id)}
                          className="text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          className="text-[10px] tracking-[0.15em] uppercase text-red-900 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
