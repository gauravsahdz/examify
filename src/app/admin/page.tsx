
import { redirect } from 'next/navigation';

// This component ensures that accessing the root /admin path
// redirects the user to the main dashboard page.
// Authentication checks are handled within the AdminLayout.
export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
