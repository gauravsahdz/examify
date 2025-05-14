
'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { NotificationType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Bell,
  CheckSquare,
  Info,
  ListChecks,
  MessageSquare,
  Settings,
  TriangleAlert,
  Zap,
} from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  onClose: () => void;
}

const getNotificationIcon = (type: NotificationType, customIcon?: string) => {
  if (customIcon) {
    // This part would require a way to dynamically render Lucide icons by name
    // For simplicity, we'll stick to a predefined map for now.
    // You could extend this with a component that maps string names to actual icon components.
    const iconMap: Record<string, React.ElementType> = {
        zap: Zap,
        bell: Bell,
        settings: Settings,
        // Add more mappings if needed
    };
    const IconComponent = iconMap[customIcon.toLowerCase()];
    if (IconComponent) return <IconComponent className="h-4 w-4" />;
  }

  switch (type) {
    case NotificationType.ACTIVITY:
      return <CheckSquare className="h-4 w-4 text-blue-500" />;
    case NotificationType.SYSTEM_UPDATE:
      return <Info className="h-4 w-4 text-sky-500" />;
    case NotificationType.ERROR_REPORT:
      return <TriangleAlert className="h-4 w-4 text-red-500" />;
    case NotificationType.TASK_ASSIGNMENT:
    case NotificationType.TASK_UPDATE:
      return <ListChecks className="h-4 w-4 text-purple-500" />;
    case NotificationType.GENERAL_ANNOUNCEMENT:
      return <Bell className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};


const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, onClose }) => {
  const Icon = getNotificationIcon(notification.type, notification.icon);

  const handleNotificationClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id!);
    }
    // Navigation will be handled by Link component if notification.link exists
    if (!notification.link) { // Only close if there's no link to navigate to
        onClose();
    }
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/5",
        notification.link && "cursor-pointer"
      )}
      onClick={notification.link ? undefined : handleNotificationClick} // Only handle click if no link
    >
      <div className="mt-1 flex-shrink-0">{Icon}</div>
      <div className="flex-grow">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground leading-normal mt-0.5">{notification.message}</p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation(); // Prevent click bubbling to the main div if it has a link
            onMarkAsRead(notification.id!);
          }}
          title="Mark as read"
        >
          <span className="block h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} passHref legacyBehavior>
        <a onClick={handleNotificationClick} className="block">
          {content}
        </a>
      </Link>
    );
  }

  return content;
};

export default NotificationItem;
