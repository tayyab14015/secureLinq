'use client';

import { useState, useEffect, useRef } from 'react';

interface User {
  ID: number;
  name: string;
  phoneNumber: string;
}

interface UserFilterProps {
  onFilterChange: (selectedUserIds: number[]) => void;
}

export default function UserFilter({ onFilterChange }: UserFilterProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    onFilterChange(selectedUsers);
  }, [selectedUsers, onFilterChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.ID));
    }
  };

  const handleClear = () => {
    setSelectedUsers([]);
  };

  const getSelectedUserNames = () => {
    if (selectedUsers.length === 0) return 'All Users';
    if (selectedUsers.length === users.length) return 'All Users';
    if (selectedUsers.length === 1) {
      const user = users.find(u => u.ID === selectedUsers[0]);
      return user?.name || 'Unknown User';
    }
    return `${selectedUsers.length} users selected`;
  };

  if (loading) {
    return (
      <div className="w-64">
        <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="relative w-64" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <span className="block truncate text-gray-900">
          {getSelectedUserNames()}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Header with actions */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Filter by Users</span>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.ID}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                onClick={() => handleUserToggle(user.ID)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.ID)}
                    onChange={() => handleUserToggle(user.ID)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex flex-col">
                    <span className="font-normal block truncate text-gray-900">
                      {user.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 