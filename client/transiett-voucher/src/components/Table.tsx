import { useEffect, useMemo, useState } from 'react';

export type LoaderParams = { cursor?: string; limit: number; search?: string };
export type LoaderResult<T> = { items: T[]; nextCursor?: string, total?: number };
export type Loader<T> = (p: LoaderParams) => Promise<LoaderResult<T>>;

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export type TableProps<T> = {
  title?: string;
  description?: string;
  columns: Column<T>[];
  loader: Loader<T>;
  pageSize?: number;
  search?: string;
  toolbarRight?: React.ReactNode;
  emptyState?: React.ReactNode;
  getRowKey?: (row: T, index: number) => React.Key;
};

export const Table = <T,>({
  title = 'Items',
  description,
  columns,
  loader,
  pageSize = 50,
  search,
  toolbarRight,
  emptyState,
  getRowKey,
}: TableProps<T>) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | undefined>();
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [stack, setStack] = useState<(string | undefined)[]>([undefined]); // cursor history
  const pageNumber = stack.length; // 1-based

  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : undefined;

  async function load(cursor?: string) {
    setLoading(true);
    try {
      const { items, nextCursor, total } = await loader({ cursor, limit: pageSize, search });
      setItems(items);
      setNextCursor(nextCursor);
      setTotal(total)
    } finally {
      setLoading(false);
    }
  }

  // load + in case of search /page size change
  useEffect(() => {
    setStack([undefined]);
    void load(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageSize]);

  const canPrev = stack.length > 1;
  const canNext = Boolean(nextCursor);

  async function goPrev() {
    if (!canPrev) return;
    const newStack = stack.slice(0, -1);
    setStack(newStack);
    await load(newStack[newStack.length - 1]); // prev cursor 
  }

  async function goNext() {
    if (!canNext || !nextCursor) return;
    const newStack = [...stack, nextCursor];
    setStack(newStack);
    await load(nextCursor);
  }

  const header = useMemo(
    () => (
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {description ? <p className="text-gray-500 mt-1">{description}</p> : null}
          </div>
          <div className="mt-2 md:mt-0">{toolbarRight}</div>
        </div>
      </div>
    ),
    [title, description, toolbarRight]
  );

  return (
    <div className="w-full flex items-start justify-center min-h-full p-2">
      <div className="container max-w-6xl">
        <div className="bg-white border-t border-gray-200 rounded-xl shadow-md overflow-hidden relative">
          {header}

          {/* Table */}
          <div className="overflow-x-auto ">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className ?? ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {loading && items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-500">
                      {emptyState ?? 'No results'}
                    </td>
                  </tr>
                ) : (
                  items.map((row, rIdx) => (
                    <tr
                      key={getRowKey ? getRowKey(row, rIdx) : rIdx}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {columns.map((col, cIdx) => (
                        <td key={cIdx} className="px-6 py-4 whitespace-nowrap">
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between flex-col sm:flex-row gap-2">
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{pageNumber}</span>  {totalPages ? <> of <span className="font-medium">{totalPages}</span></> : null}
                {' · '}Showing <span className="font-medium">{items.length}</span> items
              </div>

              <div className="inline-flex items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={!canPrev || loading}
                  className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={!canNext || loading}
                  className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* loading Overlay  */}
          {loading && items.length > 0 && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
              <div className="animate-pulse text-sm text-gray-600">Loading…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
