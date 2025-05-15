import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { doc, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export const getSubmissionById = async (submissionId: string) => {
  try {
    const ref = doc(db, 'submissions', submissionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching submission:', error);
    return null;
  }
};

export function removeUndefinedDeep(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedDeep);
  } else if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [k, v]) => {
        acc[k] = removeUndefinedDeep(v);
        return acc;
      }, {} as any);
  }
  return obj;
}
