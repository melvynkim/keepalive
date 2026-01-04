'use client';

import { useState, useEffect } from 'react';

export default function TargetForm({ target, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'postgresql',
    credentials: '',
    isActive: true,
    frequency: 'daily',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (target) {
      setFormData({
        name: target.name,
        type: target.type,
        credentials: '', // Don't prefill masked credentials
        isActive: target.isActive,
        frequency: target.frequency,
      });
    }
  }, [target]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate credentials is valid JSON
      const credsObj = JSON.parse(formData.credentials);

      const url = target ? `/api/targets/${target.id}` : '/api/targets';
      const method = target ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save target');
        setLoading(false);
        return;
      }

      onClose(true);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON in credentials field');
      } else {
        setError('An error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  const exampleCredentials = `{
  "httpEndpoint": "https://your-endpoint.com/keepalive",
  "DATABASE_URL": "postgresql://..."
}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {target ? 'Edit Target' : 'Add New Target'}
            </h2>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-4">
              <label className="label">Target Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="my-database"
                required
              />
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="label">Target Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input"
              >
                <option value="postgresql">PostgreSQL</option>
              </select>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="label">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({ ...formData, frequency: e.target.value })
                }
                className="input"
              >
                <option value="daily">Daily</option>
                <option value="12h">Every 12 hours</option>
                <option value="6h">Every 6 hours</option>
                <option value="1h">Every hour</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (target will be included in scheduled runs)
              </label>
            </div>

            {/* Credentials */}
            <div className="mb-4">
              <label className="label">
                Credentials (JSON format)
                {target && (
                  <span className="text-xs text-gray-500 ml-2">
                    Leave empty to keep existing credentials
                  </span>
                )}
              </label>
              <textarea
                value={formData.credentials}
                onChange={(e) =>
                  setFormData({ ...formData, credentials: e.target.value })
                }
                className="input font-mono text-sm"
                rows={8}
                placeholder={exampleCredentials}
                required={!target}
              />
              <p className="mt-1 text-xs text-gray-500">
                Example: httpEndpoint (required), DATABASE_URL
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : target ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
