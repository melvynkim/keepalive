'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TargetsTable from './components/TargetsTable';
import TargetForm from './components/TargetForm';
import RunHistory from './components/RunHistory';
import Generator from './components/Generator';
import ManualRunButton from './components/ManualRunButton';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadTargets();
    }
  }, [loading, refreshKey]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Ensure cookies are sent
        cache: 'no-store', // Don't cache auth checks
      });
      const data = await response.json();

      if (!data.authenticated) {
        router.push('/login');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const loadTargets = async () => {
    try {
      const response = await fetch('/api/targets', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.ok) {
        setTargets(data.targets || []);
      }
    } catch (error) {
      console.error('Failed to load targets:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      router.replace('/login');
    }
  };

  const handleAddTarget = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  const handleEditTarget = (target) => {
    setEditTarget(target);
    setShowForm(true);
  };

  const handleDeleteTarget = async (targetId) => {
    if (!confirm('Are you sure you want to delete this target?')) {
      return;
    }

    try {
      const response = await fetch(`/api/targets/${targetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        alert('Failed to delete target');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete target');
    }
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setEditTarget(null);
    if (saved) {
      setRefreshKey((k) => k + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">KeepAlive Manager</h1>
          <button onClick={handleLogout} className="btn btn-secondary text-sm">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="mb-6 flex gap-4">
          <button onClick={handleAddTarget} className="btn btn-primary">
            + Add Target
          </button>
          <ManualRunButton onComplete={() => setRefreshKey((k) => k + 1)} />
        </div>

        {/* Targets Table */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Targets</h2>
          <TargetsTable
            targets={targets}
            onEdit={handleEditTarget}
            onDelete={handleDeleteTarget}
          />
        </div>

        {/* Generator */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Generate KEEPALIVE_TARGETS</h2>
          <Generator />
        </div>

        {/* Run History */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Run History</h2>
          <RunHistory refreshKey={refreshKey} />
        </div>
      </main>

      {/* Target Form Modal */}
      {showForm && (
        <TargetForm target={editTarget} onClose={handleFormClose} />
      )}
    </div>
  );
}
