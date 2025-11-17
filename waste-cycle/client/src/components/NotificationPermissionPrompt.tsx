/**
 * Notification Permission Prompt Component
 * 
 * Shows a prompt to enable notifications if permission was denied
 */

import { useState, useEffect } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface NotificationPermissionPromptProps {
  onRequestPermission: () => Promise<void>;
  isSupported: boolean;
  isPermissionGranted: boolean;
  error: string | null;
}

export function NotificationPermissionPrompt({
  onRequestPermission,
  isSupported,
  isPermissionGranted,
  error,
}: NotificationPermissionPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show if already granted or not supported
  if (!isSupported || isPermissionGranted || isDismissed) {
    return null;
  }

  // Check if permission was previously denied
  const isDenied = Notification.permission === 'denied';

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermission();
    } catch (err) {
      console.error('Failed to request permission:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  // Check if user previously dismissed the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  if (isDenied) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>การแจ้งเตือนถูกปิด</strong>
              <p className="text-sm mt-1">
                เปิดการแจ้งเตือนในเบราว์เซอร์เพื่อรับข้อความใหม่แม้เมื่อปิดแท็บ
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-sm">เปิดการแจ้งเตือน</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          รับการแจ้งเตือนเมื่อมีข้อความใหม่ แม้เมื่อปิดแท็บ
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={handleRequest}
          disabled={isRequesting}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          {isRequesting ? (
            'กำลังเปิดการแจ้งเตือน...'
          ) : (
            <>
              <Bell className="w-4 h-4 mr-2" />
              เปิดการแจ้งเตือน
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

