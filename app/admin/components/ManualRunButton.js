'use client';

import { useState } from 'react';

export default function ManualRunButton({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    if (loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/run/manual', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          ok: true,
          message: `Run completed: ${data.successCount} succeeded, ${data.failureCount} failed`,
        });
        if (onComplete) onComplete();
      } else {
        setResult({
          ok: false,
          message: data.error || 'Run failed',
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        message: 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleRun} className="btn btn-secondary" disabled={loading}>
        {loading ? 'Running...' : 'Run Now'}
      </button>

      {result && (
        <div
          className={`mt-2 p-2 rounded text-sm ${
            result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
