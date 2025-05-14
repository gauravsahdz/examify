
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationItem from './NotificationItem';
import type { Notification } from '@/lib/types';
import { CheckCheck, Inbox, Loader2 } from 'lucide-react';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}) => {
  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <Card className="shadow-none border-0">
      <CardHeader className="flex flex-row items-center justify-between border-b p-3">
        <CardTitle className="text-base font-semibold">Notifications</CardTitle>
        {unreadNotifications.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-auto p-1" onClick={onMarkAllAsRead}>
            <CheckCheck className="mr-1 h-3 w-3" /> Mark all as read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground">We'll let you know when something new arrives.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {notifications.length > 0 && (
        <CardFooter className="p-2 border-t">
          <Button variant="link" size="sm" className="w-full text-xs" onClick={onClose}>
            Close
          </Button>
          {/* Optional: Link to a dedicated notifications page */}
          {/* <Button variant="link" size="sm" className="w-full text-xs" asChild>
            <Link href="/notifications" onClick={onClose}>View all notifications</Link>
          </Button> */}
        </CardFooter>
      )}
    </Card>
  );
};

export default NotificationList;
