'use client';

export default function TargetsTable({ targets, onEdit, onDelete }) {
  if (!targets || targets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No targets yet. Add your first target to get started.
      </div>
    );
  }

  const getFrequencyLabel = (freq) => {
    const labels = {
      daily: 'Daily',
      '12h': 'Every 12h',
      '6h': 'Every 6h',
      '1h': 'Every 1h',
    };
    return labels[freq] || freq;
  };

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Frequency</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target.id}>
              <td className="font-medium">{target.name}</td>
              <td className="capitalize">{target.type}</td>
              <td>{getFrequencyLabel(target.frequency)}</td>
              <td>
                {target.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-gray">Disabled</span>
                )}
              </td>
              <td className="text-gray-500">
                {new Date(target.createdAt).toLocaleDateString()}
              </td>
              <td>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(target)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(target.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
