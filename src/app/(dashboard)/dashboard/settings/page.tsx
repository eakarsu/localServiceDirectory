'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Settings, Bell, Lock, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState({
    bookings: true,
    reviews: true,
    leads: true,
    messages: true,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account Info */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Account Information
          </h2>
          <div className="space-y-4">
            <Input
              label="Name"
              value={session?.user?.name || ''}
              disabled
            />
            <Input
              label="Email"
              value={session?.user?.email || ''}
              disabled
            />
            <p className="text-sm text-gray-500">
              Contact support to change your account details.
            </p>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </h2>
          <div className="space-y-3">
            {Object.entries(notifications).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize">{key} notifications</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setNotifications({ ...notifications, [key]: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            ))}
          </div>
          <Button className="mt-4" variant="outline">
            Save Preferences
          </Button>
        </Card>

        {/* Password */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </h2>
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
            />
            <Button>Update Password</Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Once you sign out, you&apos;ll need to log in again to access your dashboard.
          </p>
          <Button variant="danger" onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
