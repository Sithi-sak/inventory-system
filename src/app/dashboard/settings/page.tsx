'use client'

import { useState } from 'react'
import { useTitle } from '@/lib/use-title'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { KeyIcon, LogOutIcon, LoaderIcon, CheckIcon, ShieldAlertIcon } from 'lucide-react'

export default function SettingsPage() {
  useTitle('Settings - LSTS');
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' })
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      
      const data = await response.json()

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' })
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleResetPassword = async () => {
    setIsResetting(true)
    setResetMessage(null)
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResetMessage({ 
          type: 'success', 
          text: `Password reset to: ${data.newPassword}. Please save this and change it immediately.` 
        })
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Failed to reset password' })
      }
    } catch (error) {
      setResetMessage({ type: 'error', text: 'Failed to reset password' })
    } finally {
      setIsResetting(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if API call fails
      window.location.href = '/login'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and preferences.
        </p>
      </div>

      <Separator />

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your admin password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isChangingPassword}
              />
            </div>

            {passwordMessage && (
              <Alert variant={passwordMessage.type === 'error' ? 'destructive' : 'default'}>
                {passwordMessage.type === 'success' && <CheckIcon className="h-4 w-4" />}
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Reset Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="h-5 w-5 text-destructive" />
            <CardTitle>Emergency Password Reset</CardTitle>
          </div>
          <CardDescription>
            Forgot your password? Reset it to a temporary password. Use this only if you&apos;ve forgotten your current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            {resetMessage && (
              <Alert variant={resetMessage.type === 'error' ? 'destructive' : 'default'}>
                {resetMessage.type === 'success' && <CheckIcon className="h-4 w-4" />}
                <AlertDescription>{resetMessage.text}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              variant="destructive"
              onClick={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <ShieldAlertIcon className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground">
              ⚠️ This will generate a new temporary password and display it here. Make sure to save it and change it immediately after logging in.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logout Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LogOutIcon className="h-5 w-5" />
            <CardTitle>Logout</CardTitle>
          </div>
          <CardDescription>
            Sign out of your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOutIcon className="mr-2 h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}