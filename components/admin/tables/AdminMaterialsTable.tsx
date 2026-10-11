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
import { Material } from '@/lib/db/types';
import { formatYearName } from '@/components/MaterialCard';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit3,
  Trash2,
  DownloadCloud,
  FileText,
  Calendar,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  FileDown,
  RotateCcw,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface AdminMaterialsTableProps {
  materials: Material[];
  loading?: boolean;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  onUploadClick?: () => void;
}

type SortField = 'title' | 'subject' | 'year' | 'material_type' | 'file_size' | 'download_count' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function AdminMaterialsTable({
  materials,
  loading = false,
  onEdit,
  onDelete,
  onUploadClick,
}: AdminMaterialsTableProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle column sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesYear = yearFilter === 0 || m.year === yearFilter;
      const matchesType = typeFilter === 'All' || m.material_type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.subject_code.toLowerCase().includes(q);
      return matchesYear && matchesType && matchesSearch;
    });
  }, [materials, yearFilter, typeFilter, searchQuery]);

  // Sorted materials
  const sortedMaterials = useMemo(() => {
    return [...filteredMaterials].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'subject':
          comparison = a.subject.localeCompare(b.subject);
          break;
        case 'year':
          comparison = a.year - b.year;
          break;
        case 'material_type':
          comparison = a.material_type.localeCompare(b.material_type);
          break;
        case 'file_size':
          comparison = (a.file_size || '').localeCompare(b.file_size || '');
          break;
        case 'download_count':
          comparison = (a.download_count || 0) - (b.download_count || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredMaterials, sortField, sortOrder]);

  // Pagination slice
  const totalItems = sortedMaterials.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMaterials.slice(start, start + pageSize);
  }, [sortedMaterials, currentPage, pageSize]);

  // Selection handlers
  const isAllSelected =
    paginatedMaterials.length > 0 &&
    paginatedMaterials.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedMaterials.forEach((m) => next.delete(m.id));
    } else {
      paginatedMaterials.forEach((m) => next.add(m.id));
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

  // CSV Export for selected or all filtered items
  const handleExportCsv = () => {
    const itemsToExport =
      selectedIds.size > 0
        ? materials.filter((m) => selectedIds.has(m.id))
        : sortedMaterials;

    const headers = ['Title', 'Subject', 'Code', 'Year', 'Type', 'Size', 'Downloads', 'Upload Date'];
    const rows = itemsToExport.map((m) => [
      `"${m.title.replace(/"/g, '""')}"`,
      `"${m.subject.replace(/"/g, '""')}"`,
      `"${m.subject_code}"`,
      `"${formatYearName(m.year)}"`,
      `"${m.material_type}"`,
      `"${m.file_size}"`,
      m.download_count || 0,
      `"${new Date(m.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus-connect-materials-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Total downloads in filtered set
  const totalDownloads = useMemo(() => {
    return filteredMaterials.reduce((acc, m) => acc + (m.download_count || 0), 0);
  }, [filteredMaterials]);

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
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title, subject name, or code (e.g. CSE101)..."
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

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value={0}>🎓 All Academic Years</option>
            <option value={1}>1st Year</option>
            <option value={2}>2nd Year</option>
            <option value={3}>3rd Year</option>
            <option value={4}>4th Year</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="All">📁 All Material Types</option>
            <option value="Notes">Notes</option>
            <option value="Mid-Term">Mid-Term</option>
            <option value="End-Term">End-Term</option>
            <option value="PYQs">PYQs</option>
          </select>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
            title="Export current table data as CSV"
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
            <span>{selectedIds.size} material{selectedIds.size === 1 ? '' : 's'} selected</span>
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

      {/* Watermelon / Shadcn UI Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                {/* Select All Checkbox */}
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

                {/* Title & Subject */}
                <TableHead
                  onClick={() => handleSort('title')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Title & Subject</span>
                    {renderSortIcon('title')}
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

                {/* Type */}
                <TableHead
                  onClick={() => handleSort('material_type')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Type</span>
                    {renderSortIcon('material_type')}
                  </div>
                </TableHead>

                {/* File Size */}
                <TableHead
                  onClick={() => handleSort('file_size')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>File Size</span>
                    {renderSortIcon('file_size')}
                  </div>
                </TableHead>

                {/* Upload Date */}
                <TableHead
                  onClick={() => handleSort('created_at')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4"
                >
                  <div className="flex items-center">
                    <span>Uploaded</span>
                    {renderSortIcon('created_at')}
                  </div>
                </TableHead>

                {/* Downloads */}
                <TableHead
                  onClick={() => handleSort('download_count')}
                  className="cursor-pointer group select-none text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3 px-4 text-center"
                >
                  <div className="flex items-center justify-center">
                    <span>Downloads</span>
                    {renderSortIcon('download_count')}
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
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`} className="animate-pulse">
                    <TableCell className="py-4 px-4 text-center">
                      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-32" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-8 mx-auto" />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedMaterials.length > 0 ? (
                paginatedMaterials.map((mat) => {
                  const isSelected = selectedIds.has(mat.id);
                  return (
                    <TableRow
                      key={mat.id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                        isSelected ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSelectRow(mat.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Title & Subject */}
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {mat.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {mat.subject_code}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[240px]">{mat.subject}</span>
                        </div>
                      </TableCell>

                      {/* Year */}
                      <TableCell className="py-3 px-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                            mat.year === 1
                              ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                              : mat.year === 2
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : mat.year === 3
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {formatYearName(mat.year)}
                        </span>
                      </TableCell>

                      {/* Material Type */}
                      <TableCell className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {mat.material_type}
                        </span>
                      </TableCell>

                      {/* File Size */}
                      <TableCell className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {mat.file_size || 'Unknown'}
                      </TableCell>

                      {/* Upload Date */}
                      <TableCell className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 opacity-60" />
                          <span>
                            {mat.created_at ? new Date(mat.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Downloads */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full text-xs">
                          <DownloadCloud className="w-3 h-3 text-orange-500" />
                          {mat.download_count || 0}
                        </span>
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <a
                          href={`/api/materials/${mat.id}/preview`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 inline-block transition-colors"
                          title="Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onEdit(mat)}
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-block transition-colors"
                          title="Edit & Replace File"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(mat)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-block transition-colors"
                          title="Permanently Delete Material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                // Empty State Row
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                        No study materials found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                        {searchQuery || yearFilter > 0 || typeFilter !== 'All'
                          ? 'No items match your selected filters. Try clearing search keywords or filters.'
                          : 'No study materials have been uploaded to the repository yet.'}
                      </p>
                      {(searchQuery || yearFilter > 0 || typeFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setYearFilter(0);
                            setTypeFilter('All');
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
                  Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems} total materials
                </TableCell>
                <TableCell colSpan={2} className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400 text-xs">
                  Total Downloads:
                </TableCell>
                <TableCell className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400 text-xs">
                  {totalDownloads.toLocaleString()}
                </TableCell>
                <TableCell className="py-3 px-4" />
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

          {/* Page Buttons */}
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
