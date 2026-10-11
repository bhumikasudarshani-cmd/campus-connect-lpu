'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
  FileText,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  FileDown,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

export interface RecentDownloadRecord {
  id: string;
  user_id: string;
  material_id: string;
  downloaded_at: string;
  material_title?: string;
  material_subject?: string;
  user_name?: string;
  user_email?: string;
}

interface AdminAnalyticsTableProps {
  downloads: RecentDownloadRecord[];
  loading?: boolean;
  onRefresh?: () => void;
}

type SortField = 'material_title' | 'material_subject' | 'user_name' | 'downloaded_at';
type SortOrder = 'asc' | 'desc';

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function AdminAnalyticsTable({
  downloads,
  loading = false,
  onRefresh,
}: AdminAnalyticsTableProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('downloaded_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filtered downloads
  const filteredDownloads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return downloads;
    return downloads.filter(
      (d) =>
        (d.material_title && d.material_title.toLowerCase().includes(q)) ||
        (d.material_subject && d.material_subject.toLowerCase().includes(q)) ||
        (d.user_name && d.user_name.toLowerCase().includes(q)) ||
        (d.user_email && d.user_email.toLowerCase().includes(q))
    );
  }, [downloads, searchQuery]);

  // Sorted downloads
  const sortedDownloads = useMemo(() => {
    return [...filteredDownloads].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'material_title':
          comparison = (a.material_title || '').localeCompare(b.material_title || '');
          break;
        case 'material_subject':
          comparison = (a.material_subject || '').localeCompare(b.material_subject || '');
          break;
        case 'user_name':
          comparison = (a.user_name || '').localeCompare(b.user_name || '');
          break;
        case 'downloaded_at':
          comparison = new Date(a.downloaded_at).getTime() - new Date(b.downloaded_at).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredDownloads, sortField, sortOrder]);

  // Pagination slice
  const totalItems = sortedDownloads.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedDownloads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDownloads.slice(start, start + pageSize);
  }, [sortedDownloads, currentPage, pageSize]);

  // CSV Export for Download History
  const handleExportCsv = () => {
    const headers = ['Material Title', 'Subject', 'Student Name', 'Student Email', 'Downloaded At'];
    const rows = sortedDownloads.map((d) => [
      `"${(d.material_title || '').replace(/"/g, '""')}"`,
      `"${(d.material_subject || '').replace(/"/g, '""')}"`,
      `"${(d.user_name || '').replace(/"/g, '""')}"`,
      `"${d.user_email || ''}"`,
      `"${new Date(d.downloaded_at).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus-connect-download-telemetry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-orange-600 dark:text-orange-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-orange-600 dark:text-orange-400 ml-1 inline" />
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search downloads by material, subject, student name, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Refresh download audit records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
            title="Export download history as CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                {/* Material Title */}
                <TableHead
                  onClick={() => handleSort('material_title')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Study Material</span>
                    {renderSortIcon('material_title')}
                  </div>
                </TableHead>

                {/* Subject */}
                <TableHead
                  onClick={() => handleSort('material_subject')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Subject</span>
                    {renderSortIcon('material_subject')}
                  </div>
                </TableHead>

                {/* Student */}
                <TableHead
                  onClick={() => handleSort('user_name')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Student</span>
                    {renderSortIcon('user_name')}
                  </div>
                </TableHead>

                {/* Download Timestamp */}
                <TableHead
                  onClick={() => handleSort('downloaded_at')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4 text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Download Time</span>
                    {renderSortIcon('downloaded_at')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-dl-${idx}`} className="animate-pulse">
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-1" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36 mb-1" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-24" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedDownloads.length > 0 ? (
                paginatedDownloads.map((dld) => (
                  <TableRow
                    key={dld.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="line-clamp-1">{dld.material_title || 'Untitled Material'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {dld.material_subject || 'General'}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {dld.user_name || 'Anonymous Student'}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {dld.user_email || 'No email attached'}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-medium text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{formatRelativeTime(dld.downloaded_at)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {dld.downloaded_at ? new Date(dld.downloaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <DownloadCloud className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No download records found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                        {searchQuery
                          ? 'No download events match your search keyword.'
                          : 'No telemetry records exist for recent student downloads yet.'}
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setCurrentPage(1);
                          }}
                          className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset Search
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            <TableFooter className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
              <TableRow>
                <TableCell colSpan={2} className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} filtered records
                </TableCell>
                <TableCell colSpan={2} className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400 text-xs">
                  Total Logged Downloads: <span className="font-bold text-orange-600 dark:text-orange-400 ml-1">{downloads.length}</span>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
