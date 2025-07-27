'use client';

import { useState, useEffect } from 'react';

interface User {
  ID: number;
  name: string;
  phoneNumber: string;
}

interface AddLoadFormProps {
  onLoadCreated: () => void;
  onCancel: () => void;
}

export default function AddLoadForm({ onLoadCreated, onCancel }: AddLoadFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loadNumber, setLoadNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      // Remove duplicates based on phone number only
      const uniqueUsers = data.filter((user: User, index: number, self: User[]) => 
        index === self.findIndex((u) => u.phoneNumber === user.phoneNumber)
      );
      
      setUsers(uniqueUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/loads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          loadNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create load');
      }

      onLoadCreated();
      setUserId('');
      setLoadNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full mx-auto">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Add New Load</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
              Select User
            </label>
            <select
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder:text-gray-700"
            >
              <option value="" className="text-gray-700">Choose a user...</option>
              {users.map((user) => (
                <option key={user.ID} value={user.ID}>
                  {user.name} - {user.phoneNumber}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="loadNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Load Number
            </label>
            <input
              type="text"
              id="loadNumber"
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g., LOAD004"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder:text-gray-700"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              {loading ? 'Creating...' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 