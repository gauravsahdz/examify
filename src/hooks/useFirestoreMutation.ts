
import { useMutation, useQueryClient, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  type DocumentReference,
  type FirestoreError,
  type DocumentData,
  type SetOptions,
  serverTimestamp, // Import serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logActivity } from '@/lib/services/log.service'; // Import the logging service
import type { ActivityLog } from '@/lib/types'; // Import ActivityLog type

type CommonMutationOptions = {
    collectionPath: string;
    invalidateQueries?: unknown[][]; // Array of query keys to invalidate
    optimistic?: boolean; // Basic optimistic update flag (can be enhanced)
    // Activity Log specific options
    logAction?: string; // e.g., "Created Item", "Updated Item"
    getLogDetails?: (variables: any, data?: any) => Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'action'>; // Function to get entityType, entityId, details
};

// Helper to get current user info for logging (assuming it's available in a global context or passed)
// This is a placeholder; you'll need to integrate with your actual auth context.
interface CurrentUserInfo {
    userId: string;
    userName: string;
}
// TODO: Replace with actual user fetching logic from AuthContext or similar
const getCurrentUserInfo = (): CurrentUserInfo | null => {
    // Placeholder - in a real app, you'd get this from useAuth() or similar context
    // This hook itself cannot use useAuth() directly as it's not a React component.
    // This information needs to be passed in or handled at the call site.
    // For now, we'll make userId and userName optional in the logActivity call if not available
    // and expect them to be part of the `getLogDetails` output if possible.
    return null;
};


// --- Add Document Hook ---
type UseAddDocOptions<TVariables, TContext> = UseMutationOptions<DocumentReference, FirestoreError, TVariables, TContext> & CommonMutationOptions;

export function useAddDocument<TVariables extends DocumentData = DocumentData, TContext = unknown>(
    options: UseAddDocOptions<TVariables, TContext>
): UseMutationResult<DocumentReference, FirestoreError, TVariables, TContext> {
    const queryClient = useQueryClient();
    const { collectionPath, invalidateQueries = [], optimistic, logAction, getLogDetails, ...mutationOptions } = options;

    return useMutation<DocumentReference, FirestoreError, TVariables, TContext>({
        mutationFn: async (data: TVariables) => {
            const dataWithTimestamps = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            return await addDoc(collection(db, collectionPath), dataWithTimestamps);
        },
        onSuccess: async (docRef, variables, context) => {
            invalidateQueries.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            if (logAction && getLogDetails) {
                // The caller of useAddDocument needs to provide userId and userName for logging
                // This will be done at the component level using useAuth()
                // The below is already being handled in the actual components
                // const currentUserInfo = getCurrentUserInfo();
                // if (currentUserInfo) {
                //     const logDetails = getLogDetails(variables, docRef);
                //     await logActivity({
                //         userId: currentUserInfo.userId,
                //         userName: currentUserInfo.userName,
                //         action: logAction,
                //         ...logDetails,
                //         entityId: docRef.id,
                //     });
                // } else {
                //   console.warn("Could not get current user info for logging.");
                // }
            }
            mutationOptions.onSuccess?.(docRef, variables, context);
        },
        onError: (error, variables, context) => {
             console.error(`Error adding document to ${collectionPath}:`, error);
             mutationOptions.onError?.(error, variables, context);
        },
        ...mutationOptions,
    });
}

// --- Set Document Hook (Creates or Overwrites) ---
interface SetVariables<T> { id: string; data: T; options?: SetOptions, currentUserInfo?: CurrentUserInfo }
type UseSetDocOptions<TVariables, TContext> = UseMutationOptions<void, FirestoreError, SetVariables<TVariables>, TContext> & CommonMutationOptions;

export function useSetDocument<TVariables extends DocumentData = DocumentData, TContext = unknown>(
    options: UseSetDocOptions<TVariables, TContext>
): UseMutationResult<void, FirestoreError, SetVariables<TVariables>, TContext> {
    const queryClient = useQueryClient();
    const { collectionPath, invalidateQueries = [], optimistic, logAction, getLogDetails, ...mutationOptions } = options;

    return useMutation<void, FirestoreError, SetVariables<TVariables>, TContext>({
        mutationFn: async ({ id, data, options: setOptions }) => {
            const docRef = doc(db, collectionPath, id);
            const dataWithTimestamps = {
                ...data,
                ...(!setOptions?.merge && { createdAt: serverTimestamp() }),
                updatedAt: serverTimestamp(),
            };
            await setDoc(docRef, dataWithTimestamps, setOptions ?? {});
        },
        onSuccess: async (voidResponse, variables, context) => {
            invalidateQueries.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            queryClient.invalidateQueries({ queryKey: [collectionPath, variables.id] });
             if (logAction && getLogDetails && variables.currentUserInfo) {
                const logDetails = getLogDetails(variables, voidResponse);
                await logActivity({
                    userId: variables.currentUserInfo.userId,
                    userName: variables.currentUserInfo.userName,
                    action: logAction,
                    ...logDetails,
                    entityId: variables.id, // Ensure entityId is set to the document ID
                });
            }
            mutationOptions.onSuccess?.(voidResponse, variables, context);
        },
         onError: (error, variables, context) => {
             console.error(`Error setting document ${collectionPath}/${variables.id}:`, error);
             mutationOptions.onError?.(error, variables, context);
         },
        ...mutationOptions,
    });
}


// --- Update Document Hook ---
interface UpdateVariables<T> { id: string; data: Partial<T>, currentUserInfo?: CurrentUserInfo }
type UseUpdateDocOptions<TVariables, TContext> = UseMutationOptions<void, FirestoreError, UpdateVariables<TVariables>, TContext> & CommonMutationOptions;

export function useUpdateDocument<TVariables extends DocumentData = DocumentData, TContext = unknown>(
    options: UseUpdateDocOptions<TVariables, TContext>
): UseMutationResult<void, FirestoreError, UpdateVariables<TVariables>, TContext> {
    const queryClient = useQueryClient();
    const { collectionPath, invalidateQueries = [], optimistic, logAction, getLogDetails, ...mutationOptions } = options;

    return useMutation<void, FirestoreError, UpdateVariables<TVariables>, TContext>({
        mutationFn: async ({ id, data }) => {
            const docRef = doc(db, collectionPath, id);
            const dataWithTimestamp = {
                ...data,
                updatedAt: serverTimestamp(),
            };
            await updateDoc(docRef, dataWithTimestamp);
        },
        onSuccess: async (voidResponse, variables, context) => {
            invalidateQueries.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            queryClient.invalidateQueries({ queryKey: [collectionPath, variables.id] });
             if (logAction && getLogDetails && variables.currentUserInfo) {
                const logDetails = getLogDetails(variables, voidResponse);
                 await logActivity({
                    userId: variables.currentUserInfo.userId,
                    userName: variables.currentUserInfo.userName,
                    action: logAction,
                    ...logDetails,
                    entityId: variables.id,
                });
            }
            mutationOptions.onSuccess?.(voidResponse, variables, context);
        },
         onError: (error, variables, context) => {
             console.error(`Error updating document ${collectionPath}/${variables.id}:`, error);
             mutationOptions.onError?.(error, variables, context);
         },
        ...mutationOptions,
    });
}

// --- Delete Document Hook ---
interface DeleteVariables { id: string, currentUserInfo?: CurrentUserInfo, deletedEntityTitle?: string }
type UseDeleteDocOptions<TContext> = UseMutationOptions<void, FirestoreError, DeleteVariables, TContext> & CommonMutationOptions;

export function useDeleteDocument<TContext = unknown>(
    options: UseDeleteDocOptions<TContext>
): UseMutationResult<void, FirestoreError, DeleteVariables, TContext> {
    const queryClient = useQueryClient();
    const { collectionPath, invalidateQueries = [], optimistic, logAction, getLogDetails, ...mutationOptions } = options;

    return useMutation<void, FirestoreError, DeleteVariables, TContext>({
        mutationFn: async ({ id }) => {
            const docRef = doc(db, collectionPath, id);
            await deleteDoc(docRef);
        },
        onSuccess: async (voidResponse, variables, context) => {
            invalidateQueries.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            queryClient.invalidateQueries({ queryKey: [collectionPath, variables.id] });
            queryClient.removeQueries({ queryKey: [collectionPath, variables.id] });
            if (logAction && getLogDetails && variables.currentUserInfo) {
                const logDetails = getLogDetails(variables, voidResponse);
                 await logActivity({
                    userId: variables.currentUserInfo.userId,
                    userName: variables.currentUserInfo.userName,
                    action: logAction,
                    ...logDetails,
                    entityId: variables.id,
                    details: { ...logDetails.details, deletedItemTitle: variables.deletedEntityTitle || 'N/A' }
                });
            }
            mutationOptions.onSuccess?.(voidResponse, variables, context);
        },
        onError: (error, variables, context) => {
            console.error(`Error deleting document ${collectionPath}/${variables.id}:`, error);
            mutationOptions.onError?.(error, variables, context);
        },
        ...mutationOptions,
    });
}

// --- Batch Write Hook ---
interface BatchOperationWithUserInfo extends BatchOperation {
    currentUserInfo?: CurrentUserInfo; // For logging purposes
}
type BatchOperation =
    | { type: 'set'; id: string; data: DocumentData; options?: SetOptions }
    | { type: 'update'; id: string; data: Partial<DocumentData> }
    | { type: 'delete'; id: string };

type UseBatchWriteOptions<TContext> = UseMutationOptions<void, FirestoreError, BatchOperationWithUserInfo[], TContext> & CommonMutationOptions;

export function useBatchWrite<TContext = unknown>(
    options: UseBatchWriteOptions<TContext>
): UseMutationResult<void, FirestoreError, BatchOperationWithUserInfo[], TContext> {
    const queryClient = useQueryClient();
    const { collectionPath, invalidateQueries = [], logAction, getLogDetails, ...mutationOptions } = options;

    return useMutation<void, FirestoreError, BatchOperationWithUserInfo[], TContext>({
        mutationFn: async (operations: BatchOperationWithUserInfo[]) => {
            const batch = writeBatch(db);
            operations.forEach(op => {
                const docRef = doc(db, collectionPath, op.id);
                if (op.type === 'set') {
                     const dataWithTimestamps = {
                        ...op.data,
                         ...(!op.options?.merge && { createdAt: serverTimestamp() }),
                         updatedAt: serverTimestamp(),
                     };
                    batch.set(docRef, dataWithTimestamps, op.options ?? {});
                } else if (op.type === 'update') {
                     const dataWithTimestamp = {
                         ...op.data,
                         updatedAt: serverTimestamp(),
                     };
                    batch.update(docRef, dataWithTimestamp);
                } else if (op.type === 'delete') {
                    batch.delete(docRef);
                }
            });
            await batch.commit();
        },
        onSuccess: async (voidResponse, variables, context) => {
            invalidateQueries.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            variables.forEach(op => {
                 queryClient.invalidateQueries({ queryKey: [collectionPath, op.id] });
                 if (op.type === 'delete') {
                    queryClient.removeQueries({ queryKey: [collectionPath, op.id] });
                 }
            });
            // Logging for batch operations: could log a single "Batch Operation"
            // or iterate and log each if granular detail is needed and feasible.
            if (logAction && getLogDetails && variables.length > 0 && variables[0].currentUserInfo) {
                // Example: Log a summary or the first operation's details
                const firstOp = variables[0];
                const logDetails = getLogDetails(firstOp, voidResponse);
                await logActivity({
                    userId: firstOp.currentUserInfo!.userId,
                    userName: firstOp.currentUserInfo!.userName,
                    action: `${logAction} (Batch - ${variables.length} operations)`,
                    ...logDetails,
                    details: { operations: variables.map(v => ({ type: v.type, id: v.id})), ...logDetails.details }
                });
            }
            mutationOptions.onSuccess?.(voidResponse, variables, context);
        },
         onError: (error, variables, context) => {
             console.error(`Error performing batch write on ${collectionPath}:`, error);
             mutationOptions.onError?.(error, variables, context);
         },
        ...mutationOptions,
    });
}