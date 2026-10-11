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
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  Users,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  FileDown,
  RotateCcw,
  GraduationCap
} from 'lucide-react';

export interface UserActivityRecord {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
  community_joined: boolean;
  community_verified_at?: string | null;
  community_verification_link_id?: string | null;
  verification_link_name?: string | null;
  year?: number | null;
  created_at: string;
  last_login: string;
  last_active_at: string;
}

interface AdminUsersTableProps {
  users: UserActivityRecord[];
  loading?: boolean;
  onApprove: (user: UserActivityRecord) => void;
  onRevoke: (user: UserActivityRecord) => void;
}

type SortField = 'name' | 'email' | 'role' | 'year' | 'community_joined' | 'last_active_at' | 'created_at';
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

export function AdminUsersTable({
  users,
  loading = false,
  onApprove,
  onRevoke,
}: AdminUsersTableProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('last_active_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'verified' && u.community_joined) ||
        (statusFilter === 'unverified' && !u.community_joined);

      const matchesYear =
        yearFilter === 'all' ||
        (yearFilter === 'unassigned' && (!u.year || u.year < 1 || u.year > 4)) ||
        String(u.year) === yearFilter;

      const matchesRole =
        roleFilter === 'all' || (u.role || 'user').toLowerCase() === roleFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);

      return matchesStatus && matchesYear && matchesRole && matchesSearch;
    });
  }, [users, statusFilter, yearFilter, roleFilter, searchQuery]);

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          comparison = (a.role || 'user').localeCompare(b.role || 'user');
          break;
        case 'year':
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case 'community_joined':
          comparison = (a.community_joined ? 1 : 0) - (b.community_joined ? 1 : 0);
          break;
        case 'last_active_at': {
          const timeA = new Date(a.last_active_at || a.last_login || 0).getTime();
          const timeB = new Date(b.last_active_at || b.last_login || 0).getTime();
          comparison = timeA - timeB;
          break;
        }
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredUsers, sortField, sortOrder]);

  // Pagination slice
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  // Selection handlers
  const isAllSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedUsers.forEach((u) => next.delete(u.id));
    } else {
      paginatedUsers.forEach((u) => next.add(u.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // CSV Export for Users
  const handleExportCsv = () => {
    const itemsToExport =
      selectedIds.size > 0 ? users.filter((u) => selectedIds.has(u.id)) : sortedUsers;

    const headers = ['Name', 'Email', 'User ID', 'Role', 'Year', 'Community Verified', 'Via Link', 'Last Active', 'Registered Date'];
    const rows = itemsToExport.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.id}"`,
      `"${u.role || 'student'}"`,
      u.year ? `"${u.year} Year"` : '"Unassigned"',
      u.community_joined ? '"Verified"' : '"Unverified"',
      `"${u.verification_link_name || ''}"`,
      `"${u.last_active_at || u.last_login}"`,
      `"${new Date(u.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus-connect-users-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Verified summary counts
  const verifiedCount = useMemo(() => users.filter((u) => u.community_joined).length, [users]);

  // Sort indicator helper
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
      {/* Top Filter and Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search students by name, email, or user ID..."
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">🎓 All Academic Years ({users.length})</option>
            <option value="1">1st Year ({users.filter((u) => u.year === 1).length})</option>
            <option value="2">2nd Year ({users.filter((u) => u.year === 2).length})</option>
            <option value="3">3rd Year ({users.filter((u) => u.year === 3).length})</option>
            <option value="4">4th Year ({users.filter((u) => u.year === 4).length})</option>
            <option value="unassigned">
              Unassigned ({users.filter((u) => !u.year || u.year < 1 || u.year > 4).length})
            </option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified ({verifiedCount})</option>
            <option value="unverified">Unverified ({users.length - verifiedCount})</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="user">Student</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
            title="Export student directory as CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Row Selection Toolbar Banner */}
      {selectedIds.size > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-orange-700 dark:text-orange-300">
          <div className="flex items-center gap-2 font-bold">
            <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span>{selectedIds.size} user{selectedIds.size === 1 ? '' : 's'} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-semibold text-[11px] hover:bg-orange-700 transition-colors"
            >
              Export Selected
            </button>
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                {/* Select All */}
                <TableHead className="w-10 px-4 py-3 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={isAllSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </TableHead>

                {/* Student */}
                <TableHead
                  onClick={() => handleSort('name')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Student</span>
                    {renderSortIcon('name')}
                  </div>
                </TableHead>

                {/* Email */}
                <TableHead
                  onClick={() => handleSort('email')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Email</span>
                    {renderSortIcon('email')}
                  </div>
                </TableHead>

                {/* Role */}
                <TableHead
                  onClick={() => handleSort('role')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Role</span>
                    {renderSortIcon('role')}
                  </div>
                </TableHead>

                {/* Academic Year */}
                <TableHead
                  onClick={() => handleSort('year')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Year</span>
                    {renderSortIcon('year')}
                  </div>
                </TableHead>

                {/* Community Access */}
                <TableHead
                  onClick={() => handleSort('community_joined')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Community Status</span>
                    {renderSortIcon('community_joined')}
                  </div>
                </TableHead>

                {/* Last Active */}
                <TableHead
                  onClick={() => handleSort('last_active_at')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Last Active</span>
                    {renderSortIcon('last_active_at')}
                  </div>
                </TableHead>

                {/* Registration Date */}
                <TableHead
                  onClick={() => handleSort('created_at')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Registered</span>
                    {renderSortIcon('created_at')}
                  </div>
                </TableHead>

                {/* Actions */}
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-user-${idx}`} className="animate-pulse">
                    <TableCell className="py-4 px-4 text-center">
                      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28 mb-1" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36" />
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
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => {
                  const isSelected = selectedIds.has(u.id);
                  return (
                    <TableRow
                      key={u.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                        isSelected ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSelectRow(u.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Student info */}
                      <TableCell className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              u.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                            }
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px]">
                              {u.id}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {u.email}
                      </TableCell>

                      {/* Role */}
                      <TableCell className="py-3 px-4">
                        {u.role === 'owner' ? (
                          <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800/60 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            Owner
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800/60 inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-blue-600" />
                            Admin
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Student
                          </span>
                        )}
                      </TableCell>

                      {/* Academic Year */}
                      <TableCell className="py-3 px-4">
                        {u.year === 1 ? (
                          <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                            🎓 1st Year
                          </span>
                        ) : u.year === 2 ? (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            🎓 2nd Year
                          </span>
                        ) : u.year === 3 ? (
                          <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                            🎓 3rd Year
                          </span>
                        ) : u.year === 4 ? (
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            🎓 4th Year
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Not Set
                          </span>
                        )}
                      </TableCell>

                      {/* Community Access Status */}
                      <TableCell className="py-3 px-4">
                        {u.community_joined ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Verified ✓
                            </span>
                            {u.verification_link_name && (
                              <div
                                className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[140px] truncate"
                                title={u.verification_link_name}
                              >
                                Via: {u.verification_link_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Unverified
                          </span>
                        )}
                      </TableCell>

                      {/* Last Active */}
                      <TableCell className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                        {formatRelativeTime(u.last_active_at || u.last_login)}
                      </TableCell>

                      {/* Registered Date */}
                      <TableCell className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        {u.community_joined ? (
                          <button
                            onClick={() => onRevoke(u)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
                            title="Revoke library access for this student"
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <button
                            onClick={() => onApprove(u)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs"
                            title="Manually verify and grant library access to this student"
                          >
                            Approve Access
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No students found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                        No registered students match your search or selected filters.
                      </p>
                      {(searchQuery || yearFilter !== 'all' || statusFilter !== 'all' || roleFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setYearFilter('all');
                            setStatusFilter('all');
                            setRoleFilter('all');
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

            {/* Table Footer with Summary */}
            <TableFooter className="bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
              <TableRow>
                <TableCell colSpan={4} className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs">
                  Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} filtered ({users.length} total)
                </TableCell>
                <TableCell colSpan={2} className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400 text-xs">
                  Community Verified:
                </TableCell>
                <TableCell className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {verifiedCount} / {users.length} ({users.length ? Math.round((verifiedCount / users.length) * 100) : 0}%)
                </TableCell>
                <TableCell colSpan={2} className="py-3 px-4" />
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
              <option value={100}>100</option>
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
