
'use client';

import { useMemo } from 'react';
import { useFirestoreQuery } from './useFirestoreQuery';
import { useUpdateDocument, useBatchWrite } from './useFirestoreMutation'; // Added useBatchWrite
import type { Notification } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { collection, where, orderBy, Timestamp, writeBatch, doc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from './use-toast';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  // clearNotification: (notificationId: string) => void; // Future: for deleting
  // clearAllNotifications: () => void; // Future: for deleting all
}

export function useNotifications(): UseNotificationsReturn {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const userNotificationsQuery = useFirestoreQuery<Notification>(
    ['notifications', user?.uid],
    {
      path: 'notifications',
      constraints: [
        where('userId', '==', user?.uid ?? '____'), // Query for user's notifications
        orderBy('createdAt', 'desc')
      ],
      listen: true,
      enabled: !!user && !authLoading,
    }
  );

  const systemNotificationsQuery = useFirestoreQuery<Notification>(
    ['notifications', 'system_all'],
    {
      path: 'notifications',
      constraints: [
        where('userId', '==', 'system_all'), // Query for system-wide notifications
        orderBy('createdAt', 'desc')
      ],
      listen: true,
      enabled: !authLoading, // Always enabled for all users if not loading auth
    }
  );


  const updateNotification = useUpdateDocument<Notification>({
      collectionPath: 'notifications',
      // Invalidate specific queries by user ID and for system_all
      invalidateQueries: [['notifications', user?.uid], ['notifications', 'system_all']],
  });


  const allNotifications = useMemo(() => {
    const userNotifs = userNotificationsQuery.data || [];
    const systemNotifs = systemNotificationsQuery.data || [];
    // Combine and sort, ensuring no duplicates if a system notification was somehow also targeted
    const combined = [...userNotifs, ...systemNotifs];
    const uniqueNotifications = Array.from(new Map(combined.map(n => [n.id, n])).values());
    return uniqueNotifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [userNotificationsQuery.data, systemNotificationsQuery.data]);


  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => !n.read).length;
  }, [allNotifications]);


  const markAsRead = async (notificationId: string) => {
    try {
      await updateNotification.mutateAsync({ id: notificationId, data: { read: true } });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({ title: "Error", description: "Could not mark notification as read.", variant: "destructive" });
    }
  };

 const markAllAsRead = async () => {
    if (!user) return;
    const unreadUserNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unreadSystemNotifications = query(
      collection(db, 'notifications'),
      where('userId', '==', 'system_all'),
      // Potentially filter system notifications by what the user hasn't 'seen' if we track that separately,
      // or assume all fetched system notifications are candidates to be marked read by this user.
      // For simplicity, we'll mark all system ones as read for this user via local state or a more complex user-specific read status for system messages.
      // The current model just sets `read: true` on the notification doc, which is global for system messages.
      // A better system for 'system_all' would be to track read status per user.
      // For now, this will mark the global system messages as read.
      where('read', '==', false)
    );

    const batch = writeBatch(db);
    let count = 0;

    try {
      const userDocsSnapshot = await getDocs(unreadUserNotifications);
      userDocsSnapshot.forEach(docSnapshot => {
        batch.update(doc(db, 'notifications', docSnapshot.id), { read: true });
        count++;
      });

      // For system notifications, this marks them globally read.
      // Consider a user-specific "seenSystemNotifications" array in UserProfile if global marking is undesirable.
      const systemDocsSnapshot = await getDocs(unreadSystemNotifications);
      systemDocsSnapshot.forEach(docSnapshot => {
        // Only mark system notifications as read if we decide this action should be global.
        // Otherwise, this logic needs to be handled differently (e.g., client-side filtering).
        // batch.update(doc(db, 'notifications', docSnapshot.id), { read: true });
        // count++;
      });


      if (count > 0) {
        await batch.commit();
        toast({ title: "Notifications Updated", description: "All notifications marked as read." });
      } else {
        toast({ title: "No Unread Notifications", description: "All notifications are already read." });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({ title: "Error", description: "Could not mark all notifications as read.", variant: "destructive" });
    }
  };


  return {
    notifications: allNotifications,
    unreadCount,
    isLoading: userNotificationsQuery.isLoading || systemNotificationsQuery.isLoading || authLoading,
    error: userNotificationsQuery.error || systemNotificationsQuery.error,
    markAsRead,
    markAllAsRead,
  };
}
