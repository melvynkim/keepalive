'use client';

import { useState } from 'react';

export default function Generator() {
  const [loading, setLoading] = useState(false);
  const [envVar, setEnvVar] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setEnvVar('');
    setCopied(false);

    try {
      const response = await fetch('/api/generate/keepalive-targets', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setEnvVar(data.envVar);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to generate KEEPALIVE_TARGETS');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(envVar);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Generate a signed KEEPALIVE_TARGETS environment variable that includes all active
        targets. Copy this to your .env file for use in consumer projects.
      </p>

      <button onClick={handleGenerate} className="btn btn-primary" disabled={loading}>
        {loading ? 'Generating...' : 'Generate KEEPALIVE_TARGETS'}
      </button>

      {envVar && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="label">Generated Environment Variable:</label>
            <button onClick={handleCopy} className="btn btn-secondary text-sm">
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <textarea
            value={envVar}
            readOnly
            className="input font-mono text-xs"
            rows={6}
          />
          <p className="mt-2 text-xs text-gray-500">
            Add this to your .env file in projects that need to consume keepalive targets.
          </p>
        </div>
      )}
    </div>
  );
}
