'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { Settings, Bell, Lock, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState({
    bookings: true,
    reviews: true,
    leads: true,
    messages: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      addToast({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      addToast({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      addToast({ type: 'success', message: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setChangingPassword(false);
    }
  };

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
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => addToast({ type: 'success', message: 'Preferences saved' })}
          >
            Save Preferences
          </Button>
        </Card>

        {/* Password */}
        <Card>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              required
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
              }
              required
            />
            <Button type="submit" loading={changingPassword}>
              Update Password
            </Button>
          </form>
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
