'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsBlocked(false);
    setLockoutInfo(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are set
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle permanent block
        if (data.blocked || data.permanent) {
          setIsBlocked(true);
          setError(
            data.error ||
              'Your IP has been permanently blocked. Contact the administrator.'
          );
          setLoading(false);
          return;
        }

        // Handle lockout
        if (data.lockoutUntil) {
          setLockoutInfo({
            until: new Date(data.lockoutUntil),
            message: data.error,
          });
          setError(data.error);
          setLoading(false);
          return;
        }

        // Handle regular error with remaining attempts
        if (data.remaining !== undefined) {
          setError(`${data.error} (${data.remaining} attempts remaining)`);
        } else {
          setError(data.error || 'Login failed');
        }

        setLoading(false);
        return;
      }

      // Successful login - redirect to admin dashboard
      // Use router.replace to avoid back button issues
      router.replace('/admin');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">KeepAlive Manager</h1>
          </div>

          {isBlocked ? (
            <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900">Access Blocked</h3>
                  <p className="text-sm text-red-800 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Enter password"
                  required
                  autoFocus
                  disabled={loading || lockoutInfo}
                />
              </div>

              {error && (
                <div
                  className={`mb-4 p-3 border rounded-md text-sm ${
                    lockoutInfo
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">{error}</p>
                      {lockoutInfo && (
                        <p className="text-xs mt-1">
                          Try again after: {lockoutInfo.until.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || lockoutInfo}
              >
                {loading ? 'Logging in...' : lockoutInfo ? 'Locked Out' : 'Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
