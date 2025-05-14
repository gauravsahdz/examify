
'use server'; // Can be a server action if called from client components directly, or a server-side utility

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ActivityLog } from '@/lib/types';
import { getDoc, doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';


/**
 * Logs an activity to the 'activityLogs' collection in Firestore.
 * @param logData - The data for the activity log, excluding 'id' and 'timestamp'.
 *                  'userId' and 'userName' are required.
 */
export async function logActivity(
  logData: Omit<ActivityLog, 'id' | 'timestamp'>
): Promise<void> {
  try {
    // Check if audit logs are enabled in AppSettings
    const settingsDocRef = doc(db, 'appSettings', 'main');
    const settingsSnap = await getDoc(settingsDocRef);
    const appSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;

    if (appSettings?.enableAuditLogs === false) {
      console.log("Audit logging is disabled. Skipping log entry.");
      return;
    }

    const activityLogRef = collection(db, 'activityLogs');
    await addDoc(activityLogRef, {
      ...logData,
      timestamp: serverTimestamp(),
    });
    console.log('Activity logged:', logData.action, logData.entityType, logData.entityId);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Depending on the importance, you might want to throw the error
    // or handle it silently. For now, just logging.
  }
}