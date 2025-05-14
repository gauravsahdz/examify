'use client';

import React, { useMemo } from 'react'; // Import React and useMemo
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FileText, Users, MessageSquare, BarChart3, CheckCircle, Clock, Edit, PlusCircle, Loader2, AlertTriangle, Activity, Percent, CheckCheck } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from 'framer-motion';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import type { Test, UserProfile, Feedback, Submission } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp, where, orderBy, limit } from 'firebase/firestore';
import { format, formatDistanceToNow, subDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number = 1) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.6,
            ease: "easeOut",
        },
    }),
};


// --- Skeleton Loaders ---
const StatCardSkeleton = () => (
  <Card className="flex flex-col h-full">
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </CardHeader>
    <CardContent className="flex-grow pt-2">
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
     <CardFooter className="pt-0 pb-3 px-4 mt-auto">
       <Skeleton className="h-4 w-16" />
     </CardFooter>
  </Card>
);

const ChartSkeleton = ({ title = "Chart Title", description = "Loading chart data..." }: { title?: string; description?: string }) => (
  <Card className="h-[350px] flex flex-col">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 mb-1" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent className="flex-grow flex justify-center items-center pb-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </CardContent>
  </Card>
);

const ActivitySkeleton = () => (
    <div className="flex items-center gap-3 py-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <div className="flex-grow space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    </div>
);

// --- Dashboard Page ---
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  // Fetch data - Ensure queries are enabled only if admin
  const { data: tests, isLoading: isLoadingTests, error: errorTests } = useFirestoreQuery<Test>(
    ['tests', 'all'],
    { path: 'tests', listen: true, enabled: !!isAdmin }
  );

  const { data: users, isLoading: isLoadingUsers, error: errorUsers } = useFirestoreQuery<UserProfile>(
    ['users', 'all'],
    { path: 'users', listen: true, enabled: !!isAdmin }
  );

  const { data: feedback, isLoading: isLoadingFeedback, error: errorFeedback } = useFirestoreQuery<Feedback>(
    ['feedback', 'pending'],
    { path: 'feedback', constraints: [where('status', '==', 'Pending')], listen: true, enabled: !!isAdmin }
  );

  // Fetch all submissions for calculations, listen for real-time updates
  const { data: submissions, isLoading: isLoadingSubmissions, error: errorSubmissions } = useFirestoreQuery<Submission>(
     ['submissions', 'allForDashboard'], // More specific key
     {
       path: 'submissions',
       constraints: [
         orderBy('submittedAt', 'desc') // Order by most recent
       ],
       listen: true, // Listen for real-time updates
       enabled: !!isAdmin
     }
   );


  const isLoading = isLoadingTests || isLoadingUsers || isLoadingFeedback || isLoadingSubmissions;
  const combinedError = [errorTests, errorUsers, errorFeedback, errorSubmissions]
    .filter(e => e !== null)
    .map(e => e?.message)
    .join('; ');

  // --- Data Processing for Stats ---
  const totalTests = tests?.length ?? 0;
  const activeTests = tests?.filter(t => t.status === 'Active').length ?? 0;
  const totalCandidates = users?.filter(u => u.role === 'Candidate').length ?? 0;
  const pendingFeedbackCount = feedback?.length ?? 0;
  const todayStart = startOfDay(new Date());
  const todaySubmissionsCount = submissions?.filter(sub => sub.submittedAt && sub.submittedAt.toDate() >= todayStart).length ?? 0;
  const totalSubmissionsCount = submissions?.length ?? 0;

   // Calculate Average Score
   const { averageScore, submissionCountForAvg } = useMemo(() => {
      if (!submissions || submissions.length === 0) return { averageScore: 0, submissionCountForAvg: 0 };
      const gradedSubmissions = submissions.filter(sub => sub.status === 'Graded' && sub.score !== null && sub.score !== undefined);
      if (gradedSubmissions.length === 0) return { averageScore: 0, submissionCountForAvg: 0 };
      const totalScore = gradedSubmissions.reduce((sum, sub) => sum + (sub.score ?? 0), 0);
      return {
          averageScore: Math.round(totalScore / gradedSubmissions.length),
          submissionCountForAvg: gradedSubmissions.length
      };
   }, [submissions]);

   // Calculate Completion Rate (Example: Submitted or Graded / Total Started - needs 'started' flag or assumes all fetched are started)
   const completionRate = useMemo(() => {
       if (!submissions || submissions.length === 0) return 0;
       // Assuming all fetched submissions were at least started.
       // A better approach might involve tracking 'In Progress' vs 'Submitted'/'Graded'.
       const completedCount = submissions.filter(sub => sub.status === 'Submitted' || sub.status === 'Graded').length;
       return totalSubmissionsCount > 0 ? Math.round((completedCount / totalSubmissionsCount) * 100) : 0;
   }, [submissions, totalSubmissionsCount]);


   // Updated Stats Array with new metrics
   const stats = [
     { title: 'Total Tests', value: totalTests, icon: FileText, description: `${activeTests} Active`, link: '/admin/tests' },
     { title: 'Candidates', value: totalCandidates, icon: Users, description: ` `, link: '/admin/users' }, // Simplified description
     { title: 'Pending Feedback', value: pendingFeedbackCount, icon: MessageSquare, description: pendingFeedbackCount > 0 ? 'Needs review' : 'All clear', link: '/admin/feedback' },
     { title: 'Submissions Today', value: todaySubmissionsCount, icon: BarChart3, description: `${totalSubmissionsCount} Total`, link: '/admin/submissions' },
     { title: 'Avg. Score', value: `${averageScore}%`, icon: Percent, description: `From ${submissionCountForAvg} graded`, link: '/admin/submissions' },
     { title: 'Completion Rate', value: `${completionRate}%`, icon: CheckCheck, description: `Based on ${totalSubmissionsCount} submissions`, link: '/admin/submissions' },
   ];


  // --- Data Processing for Charts ---

  // Weekly Submissions Chart (Memoized)
   const weeklySubmissionData = useMemo(() => {
     if (!submissions) return [];
     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
     const weeklyCounts = Array(7).fill(0).map((_, i) => {
         const date = subDays(new Date(), 6 - i); // Days ending today
         return {
            day: format(date, 'EEE'),
            submissions: 0,
            fullDate: format(date, 'yyyy-MM-dd'), // Store full date for matching
         };
     });
     const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

     submissions.forEach(sub => {
       if (sub.submittedAt) {
         const subDate = sub.submittedAt.toDate();
         if (subDate >= sevenDaysAgo) {
            const formattedSubDate = format(subDate, 'yyyy-MM-dd');
            const matchingDayIndex = weeklyCounts.findIndex(wc => wc.fullDate === formattedSubDate);
            if (matchingDayIndex !== -1) {
               weeklyCounts[matchingDayIndex].submissions += 1;
            }
          }
       }
     });
     return weeklyCounts;
   }, [submissions]);

  // Test Status Distribution Chart (Memoized)
  const testStatusData = useMemo(() => {
    if (!tests) return [];
    const statusCounts: Record<Test['status'], number> = { Active: 0, Draft: 0, Archived: 0 };
    tests.forEach(test => {
       statusCounts[test.status] = (statusCounts[test.status] || 0) + 1;
    });
    return Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value, fill: `var(--color-${name.toLowerCase()})` }))
        .filter(item => item.value > 0);
  }, [tests]);

  const chartConfig = {
    submissions: { label: "Submissions", color: "hsl(var(--primary))" },
    active: { label: "Active", color: "hsl(var(--chart-1))" },
    draft: { label: "Draft", color: "hsl(var(--chart-2))" },
    archived: { label: "Archived", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;


   // --- Recent Activity --- (Using submissions - Memoized)
   const recentActivities = useMemo(() => {
        if (!submissions) return [];
        return submissions.slice(0, 5).map(sub => ({ // Get top 5 most recent
            id: sub.id,
            type: 'submission',
            icon: sub.status === 'Graded' ? CheckCircle : Clock,
            text: `Test "${sub.testTitle}" ${sub.status === 'Submitted' ? 'submitted' : sub.status.toLowerCase()} by ${sub.userName}.`,
            time: sub.submittedAt ? formatDistanceToNow(sub.submittedAt.toDate(), { addSuffix: true }) : 'In Progress',
            color: sub.status === 'Graded' ? 'text-green-500' : sub.status === 'Submitted' ? 'text-blue-500' : 'text-orange-500',
            link: `/admin/submissions/${sub.id}`
        }));
   }, [submissions]);


   // --- Render Error State ---
   if (combinedError && !isLoading) {
     return (
         <div className="container mx-auto p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard Data</AlertTitle>
                <AlertDescription>
                  Failed to load some dashboard components. Please try refreshing. Details: {combinedError}
                </AlertDescription>
              </Alert>
         </div>
     );
   }

  // --- Render Dashboard ---
  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl lg:text-3xl font-bold tracking-tight"
       >
         Admin Dashboard
       </motion.h1>

      {/* Stats Cards - Adjusted grid for 6 cards */}
      <motion.div
        className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" // Updated grid columns
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }} // Slightly faster stagger for more cards
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => ( // Skeleton for 6 cards
              <motion.div key={`skel-stat-${index}`} custom={index} variants={fadeInUp}>
                <StatCardSkeleton />
              </motion.div>
            ))
          : stats.map((stat, index) => (
              <motion.div key={stat.title} custom={index} variants={fadeInUp}>
                <Card className="hover:shadow-md transition-shadow duration-300 flex flex-col h-full border-border/60">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex-grow pt-0 pb-3 px-4">
                    <div className="text-2xl lg:text-3xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={stat.description}>{stat.description}</p>
                  </CardContent>
                   <CardFooter className="pt-0 pb-3 px-4 mt-auto">
                     <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs text-primary">
                       <Link href={stat.link}>View details</Link>
                     </Button>
                   </CardFooter>
                </Card>
              </motion.div>
          ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <>
            <ChartSkeleton title="Weekly Submissions" description="Overview of submissions in the last 7 days."/>
            <ChartSkeleton title="Test Status Distribution" description="Breakdown of tests by status."/>
          </>
        ) : (
          <>
            <motion.div variants={fadeInUp} custom={stats.length}> {/* Adjust custom index */}
               <Card className="h-[350px] flex flex-col border-border/60">
                 <CardHeader>
                   <CardTitle className="text-lg">Weekly Submissions</CardTitle>
                   <CardDescription className="text-sm">Last 7 days overview</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-grow pb-4 min-h-0"> {/* Added min-h-0 */}
                   {weeklySubmissionData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={weeklySubmissionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                               <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} stroke="hsl(var(--muted-foreground))"/>
                               <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))"/>
                               <ChartTooltip
                                  cursor={false}
                                  content={<ChartTooltipContent indicator="dot" />}
                                />
                               <Bar dataKey="submissions" fill="var(--color-submissions)" radius={[4, 4, 0, 0]} barSize={30} />
                             </BarChart>
                         </ResponsiveContainer>
                       </ChartContainer>
                   ) : (
                     <p className="text-muted-foreground text-center pt-10 text-sm">No submission data for the past week.</p>
                   )}
                 </CardContent>
               </Card>
             </motion.div>

             <motion.div variants={fadeInUp} custom={stats.length + 1}> {/* Adjust custom index */}
               <Card className="h-[350px] flex flex-col border-border/60">
                 <CardHeader>
                   <CardTitle className="text-lg">Test Status</CardTitle>
                   <CardDescription className="text-sm">Distribution by status</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-grow flex justify-center items-center pb-4 min-h-0"> {/* Added min-h-0 */}
                   {testStatusData.length > 0 ? (
                     <ChartContainer config={chartConfig} className="w-full h-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <ChartTooltip
                             cursor={false}
                             content={<ChartTooltipContent hideLabel />}
                           />
                           <Pie
                             data={testStatusData}
                             dataKey="value"
                             nameKey="name"
                             innerRadius="55%"
                             outerRadius="85%"
                             strokeWidth={1}
                             paddingAngle={2}
                           >
                              {testStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                           </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" className="text-xs" />} />
                         </PieChart>
                       </ResponsiveContainer>
                      </ChartContainer>
                   ) : (
                      <p className="text-muted-foreground text-sm text-center">No test data available.</p>
                   )}
                 </CardContent>
               </Card>
             </motion.div>
          </>
        )}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
         {/* Recent Activity */}
         <motion.div className="lg:col-span-2" variants={fadeInUp} custom={stats.length + 2}> {/* Adjust custom index */}
           <Card className="border-border/60 h-full">
             <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2"> <Activity className="h-5 w-5"/> Recent Activity</CardTitle>
               <CardDescription className="text-sm">Latest test submissions.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-0 pt-0 pb-4 px-4">
               {isLoading ? (
                  <>
                    <ActivitySkeleton /><Separator className="my-1"/>
                    <ActivitySkeleton /><Separator className="my-1"/>
                    <ActivitySkeleton />
                  </>
                ) : recentActivities.length > 0 ? (
                   <>
                    {recentActivities.map((activity, index) => (
                     <React.Fragment key={activity.id}>
                         <div className="flex items-center gap-3 py-2.5 text-sm">
                           <activity.icon className={cn("w-4 h-4 flex-shrink-0", activity.color)} />
                           <p className="flex-grow text-muted-foreground">
                             <Link href={activity.link} className="hover:underline hover:text-primary transition-colors">{activity.text}</Link>
                           </p>
                           <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
                         </div>
                         {index < recentActivities.length - 1 && <Separator className="my-0"/>}
                     </React.Fragment>
                  ))}
                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-3 text-xs" disabled={isLoading}>
                       <Link href="/admin/submissions">View all submissions</Link>
                    </Button>
                  </>
                ) : (
                    <p className="text-muted-foreground text-center py-6 text-sm">No recent activity.</p>
                )}
             </CardContent>
           </Card>
         </motion.div>

          {/* Quick Actions */}
         <motion.div variants={fadeInUp} custom={stats.length + 3}> {/* Adjust custom index */}
           <Card className="border-border/60 h-full">
             <CardHeader>
               <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-sm">Common tasks</CardDescription>
             </CardHeader>
             <CardContent className="grid grid-cols-1 gap-3">
                 <Button asChild variant="outline" className="justify-start">
                   <Link href="/admin/tests/new">
                     <PlusCircle className="mr-2 h-4 w-4" /> Create Test
                   </Link>
                 </Button>
                <Button asChild variant="outline" className="justify-start">
                   <Link href="/admin/questions/new">
                     <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                   </Link>
                 </Button>
                 <Button asChild variant="outline" className="justify-start">
                   <Link href="/admin/ai-generator">
                     <Edit className="mr-2 h-4 w-4" /> AI Question Generator
                   </Link>
                 </Button>
                 <Button asChild variant="outline" className="justify-start">
                   <Link href="/admin/feedback">
                     <MessageSquare className="mr-2 h-4 w-4" /> Review Feedback
                   </Link>
                 </Button>
                 <Button asChild variant="outline" className="justify-start">
                   <Link href="/admin/users">
                     <Users className="mr-2 h-4 w-4" /> Manage Users
                   </Link>
                 </Button>
             </CardContent>
           </Card>
         </motion.div>
      </div>
    </div>
  );
}