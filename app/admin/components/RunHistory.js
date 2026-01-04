'use client';

import { useEffect, useState } from 'react';

export default function RunHistory({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page, refreshKey]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/history?page=${page}&limit=20`);
      const data = await response.json();

      if (data.ok) {
        setItems(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && items.length === 0) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No run history yet. Execute a manual run to see results here.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Trigger</th>
              <th>Time</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.target?.name || 'Unknown'}</td>
                <td>
                  {item.status === 'success' ? (
                    <span className="badge badge-success">Success</span>
                  ) : (
                    <span className="badge badge-error">Failed</span>
                  )}
                </td>
                <td className="text-gray-600">
                  {item.durationMs ? `${item.durationMs}ms` : '-'}
                </td>
                <td className="capitalize text-gray-600">
                  {item.run?.triggerType || '-'}
                </td>
                <td className="text-gray-500 text-sm">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="text-red-600 text-sm max-w-xs truncate">
                  {item.errorMessage || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary text-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
