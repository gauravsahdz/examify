import { useQuery, useQueryClient, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query'; // Import useQueryClient
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
  type Query,
  type DocumentData,
  type FirestoreError,
  type QueryConstraint,
  type DocumentSnapshot,
  onSnapshot, // Import onSnapshot for real-time updates
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config'; // Assuming db is exported from your config
import { useEffect } from 'react';

// Placeholder function to satisfy React Query when listening
const placeholderQueryFn = async () => {
    return Promise.resolve([]);
};

// Placeholder function for single document queries when listening
const placeholderDocQueryFn = async <T = DocumentData>(): Promise<T | null> => {
    return Promise.resolve(null);
};


// Type for the hook options for collections
interface UseFirestoreQueryOptions<T> extends Omit<UseQueryOptions<T[], FirestoreError>, 'queryKey' | 'queryFn'> {
  path: string;
  constraints?: QueryConstraint[];
  listen?: boolean; // Add option to enable real-time listener
}

// Type for the hook options for documents
interface UseFirestoreDocumentOptions<T> extends Omit<UseQueryOptions<T | null, FirestoreError>, 'queryKey' | 'queryFn'> {
    path: string; // Path should be like "collection/documentId"
    listen?: boolean;
}


/**
 * Custom hook to fetch a collection from Firestore using React Query.
 * Supports optional query constraints and real-time updates.
 */
export function useFirestoreQuery<T = DocumentData>(
    key: unknown[], // React Query key
    options: UseFirestoreQueryOptions<T>
): UseQueryResult<T[], FirestoreError> {
    const { path, constraints = [], listen = false, ...queryOptions } = options;
    const queryClient = useQueryClient();

    const firestoreQuery = query(collection(db, path), ...constraints);

    const actualQueryFn = async (): Promise<T[]> => {
        console.log(`[useFirestoreQuery] actualQueryFn: Fetching collection at path: ${path} with constraints:`, constraints.map(c=>c.type));
        const snapshot = await getDocs(firestoreQuery);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        console.log(`[useFirestoreQuery] actualQueryFn: Fetched ${data.length} documents from ${path}`);
        return data;
    };

    const queryResult = useQuery<T[], FirestoreError>({
        queryKey: [path, ...key, constraints.map(c => c.type)],
        queryFn: listen ? () => placeholderQueryFn() as Promise<T[]> : actualQueryFn,
        ...queryOptions,
        enabled: !listen && (queryOptions.enabled ?? true),
    });

    useEffect(() => {
        if (!listen || !(queryOptions.enabled ?? true)) {
            return;
        }

        const queryKey = [path, ...key, constraints.map(c => c.type)];
        console.log(`[useFirestoreQuery] onSnapshot: Subscribing to ${path} with key:`, queryKey);

        const unsubscribe = onSnapshot(firestoreQuery,
            (snapshot: QuerySnapshot<DocumentData>) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
                console.log(`[useFirestoreQuery] onSnapshot: Received update for ${path}. ${data.length} documents.`);
                queryClient.setQueryData(queryKey, data);
            },
            (error) => {
                console.error(`[useFirestoreQuery] onSnapshot: Firestore listener error on path "${path}":`, error);
                 queryClient.setQueryData(queryKey, (oldData: any) => oldData === undefined ? [] : oldData); // Keep old data or set to empty array
                 queryClient.invalidateQueries({ queryKey });
            }
        );

        return () => {
            console.log(`[useFirestoreQuery] onSnapshot: Unsubscribing from ${path}`);
            unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listen, path, queryClient, JSON.stringify(key), JSON.stringify(constraints.map(c=>c.type)), queryOptions.enabled]);


    return queryResult;
}


/**
 * Custom hook to fetch a single document from Firestore using React Query.
 * Supports real-time updates.
 */
export function useFirestoreDocument<T = DocumentData>(
    key: unknown[], // React Query key for the document
    options: UseFirestoreDocumentOptions<T>
): UseQueryResult<T | null, FirestoreError> {
    const { path, listen = false, ...queryOptions } = options;
    const queryClient = useQueryClient();

    const actualQueryFn = async (): Promise<T | null> => {
        const docRef = doc(db, path);
        console.log(`[useFirestoreDocument DEBUG] actualQueryFn: Fetching doc at path: "${path}". Full options.path was: "${options.path}"`);
        try {
            const docSnap = await getDoc(docRef);
            console.log(`[useFirestoreDocument DEBUG] actualQueryFn: docSnap.exists() for "${path}" is: ${docSnap.exists()}`);
            if (docSnap.exists()) {
                 console.log(`[useFirestoreDocument DEBUG] actualQueryFn: Document found for "${path}" data:`, docSnap.data());
                return { id: docSnap.id, ...docSnap.data() } as T;
            } else {
                 console.warn(`[useFirestoreDocument DEBUG] actualQueryFn: Document at path "${path}" does NOT exist in Firestore.`);
                return null;
            }
        } catch (error) {
             console.error(`[useFirestoreDocument DEBUG] actualQueryFn: Error fetching document "${path}":`, error);
             throw error;
        }
    };

    const queryResult = useQuery<T | null, FirestoreError>({
        queryKey: [path, ...key],
        queryFn: actualQueryFn, // actualQueryFn will be used if enabled
        ...queryOptions, // This includes the 'enabled' status from the calling component
        enabled: queryOptions.enabled && !listen, // Only enable useQuery's fetch if parent says so AND not listening
    });

    useEffect(() => {
         if (!listen || !(queryOptions.enabled ?? true)) { // Real-time listener respects parent's enabled state
            return;
         }
        const docRef = doc(db, path);
        const queryKey = [path, ...key]; // Define queryKey here for setQueryData
        console.log(`[useFirestoreDocument] onSnapshot: Subscribing to ${path} with key:`, queryKey);

        const unsubscribe = onSnapshot(docRef,
            (docSnap: DocumentSnapshot<DocumentData>) => {
                console.log(`[useFirestoreDocument] onSnapshot: Received update for ${path}. Exists:`, docSnap.exists());
                const data = docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as T) : null;
                if (!docSnap.exists()) {
                    console.warn(`[useFirestoreDocument] onSnapshot: Document at path "${path}" does NOT exist (update).`);
                }
                queryClient.setQueryData(queryKey, data);
            },
            (error) => {
                console.error(`[useFirestoreDocument] onSnapshot: Firestore listener error on document "${path}":`, error);
                queryClient.setQueryData(queryKey, (oldData: any) => oldData === undefined ? null : oldData);
                queryClient.invalidateQueries({ queryKey });
            }
        );

        return () => {
            console.log(`[useFirestoreDocument] onSnapshot: Unsubscribing from ${path}`);
            unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listen, path, queryClient, JSON.stringify(key), queryOptions.enabled]);


    return queryResult;
}

