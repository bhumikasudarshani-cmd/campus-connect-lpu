'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  BookOpen, 
  FileSpreadsheet, 
  Award, 
  HelpCircle, 
  Layers, 
  X, 
  Check, 
  DownloadCloud, 
  SlidersHorizontal,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  MessageSquarePlus,
  Sparkles
} from 'lucide-react';
import MaterialCard, { formatYearName } from '@/components/MaterialCard';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import StudentFeedbackModal from '@/components/StudentFeedbackModal';
import { Material, MaterialType } from '@/lib/db/types';

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL params or defaults
  const initialYear = searchParams.get('year') 
    ? parseInt(searchParams.get('year')!, 10) 
    : searchParams.get('sem') 
      ? Math.ceil(parseInt(searchParams.get('sem')!, 10) / 2)
      : 0;

  const initialType = searchParams.get('type') || 'All';
  const initialSubject = searchParams.get('subject') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'title'>('newest');

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [allowDownloads, setAllowDownloads] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && document.cookie) {
      if (document.cookie.includes('cc_allow_dl=false')) return false;
      if (document.cookie.includes('cc_allow_dl=true')) return true;
    }
    return false;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Student Feedback & Request Modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackDefaultTab, setFeedbackDefaultTab] = useState<'material_request' | 'bug_report'>('material_request');

  // Sync state if URL changes
  useEffect(() => {
    const yr = searchParams.get('year');
    if (yr) setSelectedYear(parseInt(yr, 10));

    const tp = searchParams.get('type');
    if (tp) setSelectedType(tp);

    const sb = searchParams.get('subject');
    if (sb) setSelectedSubject(sb);

    const q = searchParams.get('search');
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);

  // Fetch access mode settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings && typeof data.settings.allow_user_downloads === 'boolean') {
            setAllowDownloads(data.settings.allow_user_downloads);
          }
          if (typeof data.isAdmin === 'boolean') {
            setIsAdmin(data.isAdmin);
          }
        }
      } catch (err) {
        console.error('Failed to load access settings', err);
      }
    }
    fetchSettings();
  }, []);

  // Focus search input on Ctrl+K / Cmd+K
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isSearchingBackend, setIsSearchingBackend] = useState<boolean>(false);

  // Fetch materials whenever year or sort changes
  useEffect(() => {
    let isCancelled = false;
    async function fetchMaterials() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedYear > 0) params.set('year', selectedYear.toString());
        if (sortBy) params.set('sortBy', sortBy);
        params.set('limit', '1000');

        const res = await fetch(`/api/materials?${params.toString()}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          router.push('/community');
          return;
        }

        const data = await res.json();
        if (!isCancelled && data.success) {
          setMaterials(data.materials || []);
        }
      } catch (err) {
        console.error('Failed to load materials', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    fetchMaterials();

    return () => {
      isCancelled = true;
    };
  }, [selectedYear, sortBy, router]);

  // Extract distinct subjects available for currently active year selection
  const availableSubjects = useMemo(() => {
    const subjMap = new Map<string, { code: string; name: string }>();
    materials.forEach((m) => {
      if (!subjMap.has(m.subject_code)) {
        subjMap.set(m.subject_code, {
          code: m.subject_code,
          name: m.subject,
        });
      }
    });
    return Array.from(subjMap.values())
      .map((item) => ({
        code: item.code,
        label: `${item.code} – ${item.name}`,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [materials]);

  // Calculate live counts per material type based on year and subject
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: 0,
      Notes: 0,
      'Mid-Term': 0,
      'End-Term': 0,
      PYQs: 0,
    };
    materials.forEach((m) => {
      if (selectedSubject !== 'All' && m.subject_code !== selectedSubject) return;
      counts.All = (counts.All || 0) + 1;
      if (m.material_type in counts) {
        counts[m.material_type] = (counts[m.material_type] || 0) + 1;
      }
    });
    return counts;
  }, [materials, selectedSubject]);

  // Client-side search and filtering
  const filteredMaterials = useMemo(() => {
    let list = materials;

    if (selectedType !== 'All') {
      list = list.filter((m) => m.material_type === selectedType);
    }

    if (selectedSubject !== 'All') {
      list = list.filter((m) => m.subject_code === selectedSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        return (
          m.title.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.subject_code.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [materials, selectedType, selectedSubject, searchQuery]);

  const clearAllFilters = () => {
    setSelectedYear(0);
    setSelectedType('All');
    setSelectedSubject('All');
    setSearchQuery('');
    router.push('/library');
  };

  const categories = [
    { id: 'All', label: 'All Resources', icon: Layers },
    { id: 'Notes', label: 'Notes', icon: BookOpen },
    { id: 'Mid-Term', label: 'Mid-Term', icon: FileSpreadsheet },
    { id: 'End-Term', label: 'End-Term', icon: Award },
    { id: 'PYQs', label: 'PYQs', icon: HelpCircle },
  ];

  const yearTabs = [
    { year: 0, label: 'All Years' },
    { year: 1, label: '1st Year' },
    { year: 2, label: '2nd Year' },
    { year: 3, label: '3rd Year' },
    { year: 4, label: '4th Year' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      
      {/* Breadcrumb Navigation: Year → Subject → Material Type → File */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 overflow-x-auto pb-1">
        <span className="text-slate-900 dark:text-white flex items-center gap-1">
          <GraduationCap className="w-3.5 h-3.5 text-lpu-600 dark:text-orange-400" /> Study Library
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
        <span className={selectedYear > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}>
          {selectedYear > 0 ? formatYearName(selectedYear) : 'All Years'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
        <span className={selectedSubject !== 'All' ? 'text-slate-900 dark:text-orange-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
          {selectedSubject !== 'All' ? selectedSubject : 'All Subjects'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
        <span className={selectedType !== 'All' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}>
          {selectedType !== 'All' ? selectedType : 'All Types'}
        </span>
      </nav>

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Study Material Library
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Browse: <strong>Year → Subject → Material Type → File</strong>. Verified notes, mid-terms, and PYQs for LPU students.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFeedbackDefaultTab('material_request');
              setFeedbackModalOpen(true);
            }}
            className="btn px-4 py-2.5 rounded-full font-bold text-xs shrink-0 shadow-xs cursor-pointer group"
            title="Request a subject code or material not yet present"
          >
            <Sparkles className="sparkle w-3.5 h-3.5 text-orange-400" />
            <span className="text">Request Subject</span>
          </button>

          {/* Search Bar Input */}
          <div className="w-full sm:w-72 md:w-80 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (e.g. Programming in C, DSA, CSE101)..."
              className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-lpu-500 dark:focus:border-orange-500 focus:outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
            {isSearchingBackend ? (
              <div className="w-4 h-4 border-2 border-lpu-500 border-t-transparent rounded-full animate-spin absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none shadow-2xs">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Hierarchical Filters Control Bar: Year + Subject + Material Type */}
      <div className="space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        
        {/* Step 1: Year Filter Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-lpu-600 dark:text-orange-400" />
              1. Academic Year
            </span>
            {selectedYear > 0 && (
              <button
                onClick={() => {
                  setSelectedYear(0);
                  setSelectedSubject('All');
                }}
                className="text-[11px] font-semibold text-lpu-600 dark:text-orange-400 hover:underline"
              >
                Clear Year Selection
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {yearTabs.map((yt) => {
              const isSelected = selectedYear === yt.year;
              return (
                <button
                  key={yt.year}
                  onClick={() => {
                    setSelectedYear(yt.year);
                    setSelectedSubject('All');
                  }}
                  className={`btn py-3 px-4 rounded-2xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer group ${
                    isSelected
                      ? '!bg-gradient-to-r !from-lpu-600 !to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                      : 'border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <span className={`text text-sm font-extrabold ${isSelected ? '!text-white' : ''}`}>{yt.label}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-orange-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {yt.year === 0 ? 'All 4 Years' : `Year ${yt.year}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Subject & Material Type Filter */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Material Type Pills */}
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              2. Material Type
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedType === cat.id;
                const count = typeCounts[cat.id] ?? 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedType(cat.id)}
                    className={`btn px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer group transition-all ${
                      isSelected
                        ? '!bg-gradient-to-r !from-lpu-600 !to-amber-500 shadow-md shadow-orange-500/25 scale-[1.02]'
                        : 'border border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <Icon className={`sparkle w-3.5 h-3.5 ${isSelected ? '!text-white !fill-white' : ''}`} />
                    <span className={`text ${isSelected ? '!text-white font-bold' : ''}`}>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isSelected
                          ? 'bg-white/20 text-white font-bold'
                          : 'bg-white/10 text-slate-400 font-medium'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Filter Dropdown & Sorting */}
          <div className="flex items-center gap-3 flex-wrap max-w-full">
            {availableSubjects.length > 0 && (
              <div className="w-full sm:w-auto max-w-full">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  3. Filter by Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full sm:w-auto max-w-full sm:max-w-xs truncate px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-lpu-500"
                >
                  <option value="All">All Subjects ({availableSubjects.length})</option>
                  {availableSubjects.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full sm:w-auto max-w-full">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto max-w-full sm:max-w-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-lpu-500"
              >
                <option value="newest">Recently Uploaded</option>
                <option value="downloads">Most Downloaded</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Active Filter Chips & Results Header */}
      <div className="space-y-3">
        {(selectedYear > 0 || selectedType !== 'All' || selectedSubject !== 'All' || searchQuery.trim()) && (
          <div className="flex items-center gap-2 flex-wrap p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-lpu-600 dark:text-orange-400" />
              Active Filters:
            </span>

            {selectedYear > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 font-semibold border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                <span>🎓 {formatYearName(selectedYear)}</span>
                <button
                  onClick={() => {
                    setSelectedYear(0);
                    setSelectedSubject('All');
                  }}
                  className="hover:text-amber-950 dark:hover:text-amber-100 p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-900/60 transition-colors"
                  title="Remove year filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSubject !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 font-semibold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs">
                <span>🏷️ {selectedSubject}</span>
                <button
                  onClick={() => setSelectedSubject('All')}
                  className="hover:text-sky-950 dark:hover:text-sky-100 p-0.5 rounded hover:bg-sky-200/50 dark:hover:bg-sky-900/60 transition-colors"
                  title="Remove subject filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedType !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 font-semibold border border-purple-200/80 dark:border-purple-800/80 shadow-2xs">
                <span>📚 {selectedType}</span>
                <button
                  onClick={() => setSelectedType('All')}
                  className="hover:text-purple-950 dark:hover:text-purple-100 p-0.5 rounded hover:bg-purple-200/50 dark:hover:bg-purple-900/60 transition-colors"
                  title="Remove type filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                <span>🔍 &ldquo;{searchQuery}&rdquo;</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-emerald-950 dark:hover:text-emerald-100 p-0.5 rounded hover:bg-emerald-200/50 dark:hover:bg-emerald-900/60 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline ml-auto flex items-center gap-1 py-1 px-1.5"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Results Count & Shortcut Hint */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{filteredMaterials.length}</strong> study materials
            {selectedYear > 0 && ` for ${formatYearName(selectedYear)}`}
            {selectedSubject !== 'All' && ` • ${selectedSubject}`}
            {selectedType !== 'All' && ` (${selectedType})`}
          </span>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Ctrl+K</kbd> to focus search
          </span>
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between animate-pulse space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="w-14 h-5 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                  </div>
                  <div className="w-12 h-5 bg-orange-100/60 dark:bg-orange-950/40 rounded" />
                </div>
                <div className="w-full h-5 bg-slate-200 dark:bg-slate-800 rounded-md mt-2" />
                <div className="w-3/4 h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                <div className="w-1/2 h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded-md mt-1" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="w-12 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="w-10 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  <div className="h-9 bg-orange-200/50 dark:bg-orange-950/40 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredMaterials.map((mat) => (
            <MaterialCard
              key={mat.id}
              material={mat}
              allowDownloads={allowDownloads}
              isAdmin={isAdmin}
              onPreview={(m) => setPreviewMaterial(m)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 sm:p-12 text-center border border-slate-200 dark:border-slate-800 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Materials Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            We couldn&apos;t find study materials matching your current selection. Looking for a subject code or notes that aren&apos;t here yet?
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setFeedbackDefaultTab('material_request');
                setFeedbackModalOpen(true);
              }}
              className="btn w-full sm:w-auto px-5 py-2.5 rounded-full font-bold text-xs shadow-xs cursor-pointer group"
            >
              <Sparkles className="sparkle w-3.5 h-3.5 text-orange-400" />
              <span className="text">Request This Subject / Material</span>
            </button>
            <button
              onClick={clearAllFilters}
              className="btn w-full sm:w-auto px-4 py-2.5 rounded-full font-bold text-xs cursor-pointer group"
            >
              <span className="text">Reset Filters & View All</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Document Viewer Modal */}
      <DocumentViewerModal
        material={previewMaterial}
        allowDownloads={allowDownloads}
        isAdminOrOwner={isAdmin}
        onDownload={(mat) => {
          if (!allowDownloads && !isAdmin) {
            alert('Document downloads are currently disabled by administration. You can view this document in Preview mode.');
            return;
          }
          const dlEndpoint = `/api/materials/${mat.id}/download`;
          const link = document.createElement('a');
          link.href = dlEndpoint;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 200);
        }}
        onClose={() => setPreviewMaterial(null)}
      />

      {/* Student Feedback & Material Request Modal */}
      <StudentFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        defaultTab={feedbackDefaultTab}
        initialSubjectCode={searchQuery.trim() || (selectedSubject !== 'All' ? selectedSubject : '')}
        userYear={selectedYear > 0 ? selectedYear : 1}
      />

    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-lpu-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading Study Library...</p>
      </div>
    }>
      <LibraryContent />
    </Suspense>
  );
}
