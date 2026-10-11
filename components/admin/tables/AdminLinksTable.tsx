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
import { CommunityVerificationLink } from '@/lib/db/types';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
  ExternalLink,
  PlusCircle,
  Trash2,
  UserX,
  ChevronLeft,
  ChevronRight,
  FileDown,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface AdminLinksTableProps {
  links: CommunityVerificationLink[];
  loading?: boolean;
  onAddClick: () => void;
  onToggleActive: (link: CommunityVerificationLink) => void;
  onRevokeUsers: (link: CommunityVerificationLink) => void;
  onDelete: (link: CommunityVerificationLink) => void;
}

type SortField = 'name' | 'type' | 'invite_code' | 'is_active' | 'verified_count' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function AdminLinksTable({
  links,
  loading = false,
  onAddClick,
  onToggleActive,
  onRevokeUsers,
  onDelete,
}: AdminLinksTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && link.is_active) ||
        (statusFilter === 'disabled' && !link.is_active);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        link.name.toLowerCase().includes(q) ||
        link.invite_code.toLowerCase().includes(q) ||
        link.invite_url.toLowerCase().includes(q) ||
        link.type.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [links, statusFilter, searchQuery]);

  const sortedLinks = useMemo(() => {
    return [...filteredLinks].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'invite_code':
          comparison = a.invite_code.localeCompare(b.invite_code);
          break;
        case 'is_active':
          comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
          break;
        case 'verified_count':
          comparison = (a.verified_count || 0) - (b.verified_count || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredLinks, sortField, sortOrder]);

  const totalItems = sortedLinks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLinks.slice(start, start + pageSize);
  }, [sortedLinks, currentPage, pageSize]);

  const handleExportCsv = () => {
    const headers = ['Name', 'Category', 'Invite URL', 'Code', 'Status', 'Students Verified', 'Created Date'];
    const rows = sortedLinks.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.type}"`,
      `"${l.invite_url}"`,
      `"${l.invite_code}"`,
      l.is_active ? '"Active"' : '"Disabled"',
      l.verified_count || 0,
      `"${new Date(l.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus-connect-invite-links-${new Date().toISOString().slice(0, 10)}.csv`);
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

  const totalVerified = useMemo(() => {
    return links.reduce((acc, l) => acc + (l.verified_count || 0), 0);
  }, [links]);

  return (
    <div className="w-full space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search links by name, invite code, URL, or category..."
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

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Link Statuses ({links.length})</option>
            <option value="active">Active ({links.filter((l) => l.is_active).length})</option>
            <option value="disabled">Disabled ({links.filter((l) => !l.is_active).length})</option>
          </select>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
            title="Export verification links as CSV"
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
                <TableHead
                  onClick={() => handleSort('name')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Name & Category</span>
                    {renderSortIcon('name')}
                  </div>
                </TableHead>

                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4">
                  WhatsApp Invite URL
                </TableHead>

                <TableHead
                  onClick={() => handleSort('invite_code')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Code</span>
                    {renderSortIcon('invite_code')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('is_active')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Status</span>
                    {renderSortIcon('is_active')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('verified_count')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Students</span>
                    {renderSortIcon('verified_count')}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('created_at')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Created</span>
                    {renderSortIcon('created_at')}
                  </div>
                </TableHead>

                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={`skeleton-link-${idx}`} className="animate-pulse">
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36 mb-1" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedLinks.length > 0 ? (
                paginatedLinks.map((link) => (
                  <TableRow key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{link.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                        {link.type.replace('_', ' ')}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      <a
                        href={link.invite_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span className="truncate">{link.invite_url}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                    </TableCell>

                    <TableCell className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-200 font-bold">
                      {link.invite_code}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {link.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Disabled
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {link.verified_count || 0} students
                    </TableCell>

                    <TableCell className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(link.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onToggleActive(link)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          link.is_active
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                      >
                        {link.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => onRevokeUsers(link)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors inline-flex items-center gap-1"
                        title="Revoke access for all students joined via this link"
                      >
                        <UserX className="w-3 h-3" />
                        Revoke ({link.verified_count || 0})
                      </button>

                      <button
                        onClick={() => onDelete(link)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 inline-block transition-colors"
                        title="Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No verification links found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No links match your search or filter.'
                          : 'No WhatsApp community verification links configured yet.'}
                      </p>
                      {(searchQuery || statusFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setCurrentPage(1);
                          }}
                          className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            <TableFooter className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
              <TableRow>
                <TableCell colSpan={4} className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} total links
                </TableCell>
                <TableCell colSpan={3} className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400 text-xs">
                  Total Students Verified Via Links: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{totalVerified}</span>
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
