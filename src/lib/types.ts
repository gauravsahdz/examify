
import { Timestamp } from 'firebase/firestore';
import type { QuestionDifficulty } from './enums';

// Define Subscription Plans
export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

// Define Subscription Status
export enum SubscriptionStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CANCELED = 'canceled',
    PAST_DUE = 'past_due',
    TRIALING = 'trialing',
}

// Define a Role
export interface Role {
  id?: string;
  name: string;
  permissions: string[]; // Array of permission strings
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  // role: 'Admin' | 'Candidate'; // Deprecated in favor of roleIds
  roleIds: string[]; // Array of role IDs assigned to the user
  createdAt: Timestamp;
  permissions?: string[]; // This will be dynamically populated by AuthContext based on roles

  // Subscription Details
  subscriptionPlanId?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionEndDate?: Timestamp | null;
}

export interface Subscription {
    id?: string;
    userId: string;
    planId: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart?: Timestamp;
    currentPeriodEnd?: Timestamp;
    cancelAtPeriodEnd?: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}


export interface QuestionOption {
  id: string;
  text: string;
}

export interface TestCase {
    id?: string;
    input: string;
    expectedOutput: string;
    hidden?: boolean;
}

export interface Question {
  id?: string;
  text: string;
  imageUrl?: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'code-snippet';
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  difficulty: QuestionDifficulty;
  topic?: string;
  folder?: string;
  pointsPerQuestion?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  language?: string;
  starterCode?: string;
  testCases?: TestCase[];
}

export interface Test {
  id?: string;
  title: string;
  description?: string;
  questionIds: string[];
  durationMinutes: number;
  status: 'Draft' | 'Active' | 'Archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  creatorId?: string;
  showTimer?: boolean;
  maxAttempts?: number | null;
  webcamEnabled?: boolean;
  shuffleQuestions?: boolean;
  lockBrowser?: boolean;
  negativeMarking?: boolean;
  calculatorEnabled?: boolean;
  autoSave?: boolean;
  allowSwitchingQuestions?: boolean;
  gracePeriodMinutes?: number | null;
  pointsPerQuestion?: number;
  allowCodeExecution?: boolean;
}

export interface CodeExecutionResult {
    input: string;
    output: string;
    expectedOutput: string;
    passed: boolean;
    error?: string | null;
    executionTime?: number | null;
}

export interface SubmissionAnswer {
  questionId: string;
  answer: string | string[] | null;
  isCorrect?: boolean | null;
  score?: number | null;
  feedback?: string | null;
  codeExecutionResults?: CodeExecutionResult[];
}

export interface Submission {
  id?: string;
  userId: string;
  testId: string;
  testTitle: string;
  userName: string;
  answers: SubmissionAnswer[];
  score: number | null;
  totalPointsAwarded?: number | null;
  maxPossiblePoints?: number | null;
  status: 'In Progress' | 'Submitted' | 'Graded';
  submittedAt: Timestamp | null;
  startedAt: Timestamp;
  gradedAt?: Timestamp | null;
  graderId?: string | null;
  timeTakenSeconds?: number;
  updatedAt?: Timestamp;
  testConfigSnapshot?: Partial<Pick<Test, 'durationMinutes' | 'webcamEnabled' | 'shuffleQuestions' | 'lockBrowser' | 'negativeMarking' | 'calculatorEnabled' | 'autoSave' | 'allowSwitchingQuestions' | 'gracePeriodMinutes' | 'showTimer' | 'pointsPerQuestion' | 'allowCodeExecution'>>;
}

export interface Feedback {
  id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  subject: string;
  feedback: string;
  status: 'Pending' | 'Reviewed' | 'Resolved' | 'Archived';
  receivedAt: Timestamp;
  relatedToType: 'Test' | 'Question' | 'General';
  relatedToId?: string;
}

export interface GeneratedQuestion {
  question: string;
  answer: string;
}

export interface PlanLimits {
    maxTests: number | null;
    maxQuestionsPerTest: number | null;
    maxMonthlySubmissions: number | null;
    aiQuestionGeneration: boolean;
    aiFeedbackSummary: boolean;
    webcamProctoring: boolean;
    codeExecution: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
    [SubscriptionPlan.FREE]: {
        maxTests: 3,
        maxQuestionsPerTest: 10,
        maxMonthlySubmissions: 50,
        aiQuestionGeneration: false,
        aiFeedbackSummary: false,
        webcamProctoring: false,
        codeExecution: false,
    },
    [SubscriptionPlan.PRO]: {
        maxTests: null,
        maxQuestionsPerTest: null,
        maxMonthlySubmissions: 1000,
        aiQuestionGeneration: true,
        aiFeedbackSummary: true,
        webcamProctoring: true,
        codeExecution: true,
    },
    [SubscriptionPlan.ENTERPRISE]: {
        maxTests: null,
        maxQuestionsPerTest: null,
        maxMonthlySubmissions: null,
        aiQuestionGeneration: true,
        aiFeedbackSummary: true,
        webcamProctoring: true,
        codeExecution: true,
    },
};

// Task Management
export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  ARCHIVED = 'Archived',
}

export interface Task {
  id?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  assigneeUid?: string | null;
  assigneeName?: string | null;
  dueDate?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  creatorId: string;
}

// Notification System
export enum NotificationType {
    ACTIVITY = 'activity',
    SYSTEM_UPDATE = 'system_update',
    ERROR_REPORT = 'error_report',
    TASK_ASSIGNMENT = 'task_assignment',
    TASK_UPDATE = 'task_update',
    GENERAL_ANNOUNCEMENT = 'general_announcement',
}

export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: Timestamp;
    link?: string;
    icon?: string;
}

// Application Settings
export interface AppSettings {
  id?: 'main';
  appName?: string;
  defaultTestDurationMinutes?: number;
  defaultShowTimer?: boolean;
  defaultWebcamEnabled?: boolean;
  defaultShuffleQuestions?: boolean;
  defaultLockBrowser?: boolean;
  defaultNegativeMarking?: boolean;
  defaultCalculatorEnabled?: boolean;
  defaultAutoSave?: boolean;
  defaultAllowSwitchingQuestions?: boolean;
  defaultGracePeriodMinutes?: number | null;
  defaultPointsPerQuestion?: number;
  defaultAllowCodeExecution?: boolean;
  adminEmailNotifications?: {
    newSubmission?: boolean;
    newFeedback?: boolean;
    newUserSignup?: boolean;
  };
  enableAuditLogs?: boolean;
  logRetentionDays?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Activity Log
export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Timestamp;
}
