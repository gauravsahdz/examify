
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BookOpen, Users, MessageSquare, FileText, CheckSquare, Bot, ListChecks, CreditCard, Settings, History, ShieldQuestion, UserCog } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  permission?: string; // Optional permission required to view this item
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'view_dashboard',
  },
   {
    href: '/admin/tests',
    label: 'Tests',
    icon: FileText,
    permission: 'manage_tests',
  },
  {
    href: '/admin/questions',
    label: 'Questions',
    icon: BookOpen,
    permission: 'manage_questions',
  },
   {
    href: '/admin/ai-generator',
    label: 'AI Generator',
    icon: Bot,
    permission: 'use_ai_generator',
  },
   {
    href: '/admin/submissions',
    label: 'Submissions',
    icon: CheckSquare,
    permission: 'manage_submissions',
  },
  {
    href: '/admin/tasks',
    label: 'Tasks',
    icon: ListChecks,
    permission: 'manage_tasks',
  },
   {
    href: '/admin/feedback',
    label: 'Feedback',
    icon: MessageSquare,
    permission: 'manage_feedback',
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    permission: 'manage_users',
  },
  {
    href: '/admin/roles', // New Roles Management Link
    label: 'Roles & Permissions',
    icon: UserCog, // Changed icon
    permission: 'manage_roles',
  },
  {
    href: '/admin/subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
    permission: 'manage_subscriptions',
  },
   {
    href: '/admin/activity-log',
    label: 'Activity Log',
    icon: History,
    permission: 'view_activity_log',
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'manage_settings',
  },
];

// Define all granular permissions available in the system
export const ALL_PERMISSIONS = [
    // Dashboard
    { id: 'view_dashboard', label: 'View Dashboard', group: 'Dashboard' },
    // Tests
    { id: 'manage_tests', label: 'Manage Tests (View List)', group: 'Tests' },
    { id: 'create_tests', label: 'Create Tests', group: 'Tests' },
    { id: 'edit_tests', label: 'Edit Tests', group: 'Tests' },
    { id: 'delete_tests', label: 'Delete Tests', group: 'Tests' },
    // Questions
    { id: 'manage_questions', label: 'Manage Questions (View List)', group: 'Questions' },
    { id: 'create_questions', label: 'Create Questions', group: 'Questions' },
    { id: 'edit_questions', label: 'Edit Questions', group: 'Questions' },
    { id: 'delete_questions', label: 'Delete Questions', group: 'Questions' },
    // AI Generator
    { id: 'use_ai_generator', label: 'Use AI Question Generator', group: 'AI Features' },
    // Submissions
    { id: 'manage_submissions', label: 'Manage Submissions (View List)', group: 'Submissions' },
    { id: 'grade_submissions', label: 'Grade Submissions', group: 'Submissions' },
    { id: 'view_submission_details', label: 'View Submission Details', group: 'Submissions' },
    { id: 'export_submissions', label: 'Export Submissions Report', group: 'Submissions' },
    // Tasks
    { id: 'manage_tasks', label: 'Manage Tasks (View List)', group: 'Tasks' },
    { id: 'create_tasks', label: 'Create Tasks', group: 'Tasks' },
    { id: 'edit_tasks', label: 'Edit Tasks', group: 'Tasks' },
    { id: 'delete_tasks', label: 'Delete Tasks', group: 'Tasks' },
    { id: 'assign_tasks', label: 'Assign Tasks', group: 'Tasks' },
    // Feedback
    { id: 'manage_feedback', label: 'Manage Feedback', group: 'Feedback' },
    { id: 'summarize_feedback_ai', label: 'Use AI Feedback Summary', group: 'AI Features' },
    // Users
    { id: 'manage_users', label: 'Manage Users (View List)', group: 'Users & Roles' },
    { id: 'edit_user_profile', label: 'Edit User Profile Info', group: 'Users & Roles' },
    { id: 'delete_users', label: 'Delete Users', group: 'Users & Roles' },
    // Roles & Permissions
    { id: 'manage_roles', label: 'Manage Roles & Permissions', group: 'Users & Roles' },
    { id: 'assign_user_roles', label: 'Assign Roles to Users', group: 'Users & Roles' },
    // Subscriptions
    { id: 'manage_subscriptions', label: 'Manage Subscriptions', group: 'Billing' },
    // Activity Log
    { id: 'view_activity_log', label: 'View Activity Log', group: 'Admin' },
    // Settings
    { id: 'manage_settings', label: 'Manage Application Settings', group: 'Admin' },
    // Candidate Permissions
    { id: 'take_tests', label: 'Take Tests', group: 'Candidate Actions'},
    { id: 'submit_feedback_candidate', label: 'Submit Feedback (as Candidate)', group: 'Candidate Actions'},
    { id: 'view_own_submissions', label: 'View Own Submissions', group: 'Candidate Actions'},
    // Super Admin Permission (Grants all other permissions implicitly if logic is set up)
    { id: 'super_admin', label: 'Super Administrator (All Access)', group: 'Admin' },
] as const; // Use "as const" for better type inference for permission IDs

export type PermissionId = typeof ALL_PERMISSIONS[number]['id'];

export const CANDIDATE_DEFAULT_PERMISSIONS: PermissionId[] = [
    'take_tests',
    'submit_feedback_candidate',
    'view_own_submissions',
];

export const ADMIN_DEFAULT_ROLE_NAME = "Admin";
export const CANDIDATE_DEFAULT_ROLE_NAME = "Candidate";
