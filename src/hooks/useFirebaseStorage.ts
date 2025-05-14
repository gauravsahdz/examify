
'use client';

import { useState, useCallback } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, type StorageError } from 'firebase/storage';
import { storage } from '@/lib/firebase/config'; // Import your initialized storage instance

interface UseFirebaseStorageReturn {
  uploadFile: (file: File, path: string) => Promise<string>;
  deleteFile: (url: string) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number | null;
  error: StorageError | null;
  downloadURL: string | null;
}

export function useFirebaseStorage(): UseFirebaseStorageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<StorageError | null>(null);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);

  const uploadFile = useCallback((file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      setDownloadURL(null);

      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (uploadError: StorageError) => {
          console.error('Upload failed:', uploadError);
          setError(uploadError);
          setIsUploading(false);
          setUploadProgress(null);
          reject(uploadError);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadURL(url);
            setIsUploading(false);
            setUploadProgress(100);
            resolve(url);
          } catch (urlError: any) {
             console.error('Failed to get download URL:', urlError);
             setError(urlError as StorageError); // Cast error if needed
             setIsUploading(false);
             setUploadProgress(null);
             reject(urlError);
          }
        }
      );
    });
  }, []);

  const deleteFile = useCallback(async (url: string): Promise<void> => {
     if (!url) return;
     try {
        // Create a reference from the storage URL
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        setDownloadURL(null); // Clear URL if deleted (might be handled elsewhere too)
        setError(null);
        console.log('File deleted successfully:', url);
     } catch (deleteError: any) {
        console.error('Failed to delete file:', deleteError);
        setError(deleteError as StorageError); // Cast error if needed
        // Don't reject, allow UI to handle error display
        // throw deleteError;
     }
  }, []);


  return {
    uploadFile,
    deleteFile,
    isUploading,
    uploadProgress,
    error,
    downloadURL,
  };
}
