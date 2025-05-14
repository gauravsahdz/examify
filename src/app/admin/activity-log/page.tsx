
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ActivityLog } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { orderBy, Timestamp } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Filter, ExternalLink, History, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="text-right"><Skeleton className="inline-block h-8 w-8 rounded" /></TableCell>
  </TableRow>
);

type SortConfig = {
  key: keyof ActivityLog | 'timestamp'; // Allow sorting by timestamp specifically
  direction: 'ascending' | 'descending';
};

export default function ActivityLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'timestamp', direction: 'descending' });
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const constraints = useMemo(() => {
    if (sortConfig) {
      return [orderBy(sortConfig.key as string, sortConfig.direction === 'ascending' ? 'asc' : 'desc')];
    }
    return [orderBy('timestamp', 'desc')]; // Default sort
  }, [sortConfig]);

  const { data: logs, isLoading, error } = useFirestoreQuery<ActivityLog>(
    ['activityLogs', sortConfig?.key, sortConfig?.direction], // Query key includes sort for re-fetching
    {
      path: 'activityLogs',
      listen: true,
      constraints: constraints,
    }
  );

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return logs.filter(log =>
      log.userName.toLowerCase().includes(lowerSearchTerm) ||
      log.action.toLowerCase().includes(lowerSearchTerm) ||
      log.entityType?.toLowerCase().includes(lowerSearchTerm) ||
      log.entityId?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [logs, searchTerm]);

  const requestSort = (key: keyof ActivityLog | 'timestamp') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ActivityLog | 'timestamp') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-3 w-3 opacity-30 group-hover:opacity-100" />;
    }
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const renderDetails = (details: Record<string, any> | undefined) => {
    if (!details || Object.keys(details).length === 0) {
      return <span className="text-muted-foreground italic">N/A</span>;
    }
    // Simple preview, full details in dialog
    const entries = Object.entries(details);
    if (entries.length > 2) {
      return <span className="text-xs italic">Multiple details, click view...</span>;
    }
    return (
      <div className="space-y-0.5 text-xs">
        {entries.map(([key, value]) => (
          <div key={key}>
            <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>{' '}
            {typeof value === 'object' ? JSON.stringify(value).substring(0,30) + '...' : String(value).substring(0,30) + '...'}
          </div>
        ))}
      </div>
    );
  };


  if (error) return <p className="text-destructive p-4">Error loading activity logs: {error.message}</p>;

  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
      >
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-7 w-7" /> Activity Log
        </h1>
        {/* Future: Add export button here */}
      </motion.div>

       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Track important actions performed in the admin dashboard.</CardDescription>
            <div className="pt-2">
              <Input
                placeholder="Search logs (user, action, entity)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => requestSort('timestamp')}>
                    Timestamp {getSortIcon('timestamp')}
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => requestSort('userName')}>
                    User {getSortIcon('userName')}
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => requestSort('action')}>
                    Action {getSortIcon('action')}
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => requestSort('entityType')}>
                    Entity Type {getSortIcon('entityType')}
                  </TableHead>
                  <TableHead>Entity ID / Details</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 7 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground" title={log.timestamp ? format(log.timestamp.toDate(), 'PPpp') : 'N/A'}>
                        {log.timestamp ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.userName}</TableCell>
                      <TableCell className="text-sm">{log.action}</TableCell>
                      <TableCell className="text-xs capitalize">
                        {log.entityType || <span className="italic text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell>
                        {log.entityId && <p className="text-xs font-mono">{log.entityId}</p>}
                        {renderDetails(log.details)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)} title="View Full Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                       No activity logs found{searchTerm ? ' matching your criteria' : ''}.
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
       </motion.div>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              Full details for the selected activity log entry.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
              <div className="space-y-3 py-2 text-sm">
                <p><strong>Timestamp:</strong> {selectedLog.timestamp ? format(selectedLog.timestamp.toDate(), 'PPPPpp') : 'N/A'}</p>
                <p><strong>User:</strong> {selectedLog.userName} ({selectedLog.userId})</p>
                <p><strong>Action:</strong> {selectedLog.action}</p>
                {selectedLog.entityType && <p><strong>Entity Type:</strong> {selectedLog.entityType}</p>}
                {selectedLog.entityId && <p><strong>Entity ID:</strong> {selectedLog.entityId}</p>}
                {selectedLog.ipAddress && <p><strong>IP Address:</strong> {selectedLog.ipAddress}</p>}
                {selectedLog.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-1 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}