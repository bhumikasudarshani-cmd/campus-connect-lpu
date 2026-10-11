'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  DownloadCloud, 
  Upload, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  CheckCircle2, 
  CheckCircle,
  MessageCircle,
  Clock, 
  AlertTriangle, 
  Activity,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  HardDrive,
  UserCheck,
  ChevronRight,
  Eye,
  Link as LinkIcon,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  UserX,
  Copy,
  BarChart2,
  TrendingUp,
  Settings,
  UserPlus,
  Shield,
  Menu,
  X,
  FileText,
  RefreshCw,
  LogOut,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  Plus,
  RotateCcw,
  Check,
  ArrowRight,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Bug
} from 'lucide-react';
import { Material, AdminStats, CommunityVerificationLink, Admin, WhatsNewItem, StudentFeedbackRequest } from '@/lib/db/types';
import { formatYearName } from '@/components/MaterialCard';
import { uploadToGoogleDriveResumable } from '@/lib/google-drive-client';
import { mergeDocumentsToPdf, DocumentItem } from '@/lib/image-to-pdf';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminMaterialsTable } from '@/components/admin/tables/AdminMaterialsTable';
import { AdminUsersTable } from '@/components/admin/tables/AdminUsersTable';
import { AdminAnalyticsTable } from '@/components/admin/tables/AdminAnalyticsTable';
import { AdminLinksTable } from '@/components/admin/tables/AdminLinksTable';

interface UserActivityRecord {
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

interface AnalyticsData {
  mostDownloaded: Material[];
  recentDownloads: {
    id: string;
    user_id: string;
    material_id: string;
    downloaded_at: string;
    material_title?: string;
    material_subject?: string;
    user_name?: string;
    user_email?: string;
  }[];
  downloadsByYear: Record<number, number>;
  downloadsByType: Record<string, number>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'materials' | 'upload' | 'users' | 'links' | 'analytics' | 'announcements' | 'feedback' | 'settings' | 'admin-settings' | 'drive-sync'
  >('dashboard');

  // Stats & Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserActivityRecord[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [links, setLinks] = useState<CommunityVerificationLink[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);

  // Announcements State
  const [announcements, setAnnouncements] = useState<WhatsNewItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementDesc, setAnnouncementDesc] = useState('');
  const [announcementType, setAnnouncementType] = useState<string>('announcement');
  const [announcementLink, setAnnouncementLink] = useState('');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState('');

  // Student Feedback & Material Requests State
  const [feedbackList, setFeedbackList] = useState<StudentFeedbackRequest[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(false);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all');

  // Platform Global Settings
  const [allowUserDownloads, setAllowUserDownloads] = useState<boolean>(true);
  const [requireCommunityVerification, setRequireCommunityVerification] = useState<boolean>(true);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [updatingSettings, setUpdatingSettings] = useState<boolean>(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Links Form State
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] = useState<'community' | 'freshers_group' | 'other'>('community');
  const [newLinkIsActive, setNewLinkIsActive] = useState(true);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Filters for manage materials
  const [matSearch, setMatSearch] = useState('');
  const [matYearFilter, setMatYearFilter] = useState<number>(0);
  const [matTypeFilter, setMatTypeFilter] = useState<string>('All');

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadSubjectCode, setUploadSubjectCode] = useState('');
  const [uploadYear, setUploadYear] = useState<number>(1);
  const [uploadType, setUploadType] = useState<string>('Notes');
  const [uploadDescription, setUploadDescription] = useState('');
  const [resourceMode, setResourceMode] = useState<'file' | 'link'>('file');
  const [resourceLink, setResourceLink] = useState('');
  const [isMultiLink, setIsMultiLink] = useState<boolean>(false);
  const [multiLinksText, setMultiLinksText] = useState<string>('');
  const [multiLinkProcessingMode, setMultiLinkProcessingMode] = useState<'bundle' | 'batch'>('bundle');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [clubbedImages, setClubbedImages] = useState<DocumentItem[]>([]);
  const [multiPdfMode, setMultiPdfMode] = useState<'merge' | 'bundle' | 'batch'>('merge');
  const [isMergingImages, setIsMergingImages] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Option: Delete Files with Same Name When Uploaded
  const [deleteSameNameOnUpload, setDeleteSameNameOnUpload] = useState<boolean>(true);
  const [autoDeduplicateQueue, setAutoDeduplicateQueue] = useState<boolean>(true);

  // Computed duplicate filenames inside upload queue
  const duplicateNameGroups = React.useMemo(() => {
    const counts: Record<string, number> = {};
    clubbedImages.forEach((item) => {
      const lower = item.name.toLowerCase().trim();
      counts[lower] = (counts[lower] || 0) + 1;
    });
    return Object.entries(counts).filter(([_, count]) => count > 1);
  }, [clubbedImages]);

  // Removes duplicate files with the same name from the upload queue
  const removeDuplicateFilesFromQueue = () => {
    const seen = new Set<string>();
    const unique: DocumentItem[] = [];
    const removed: DocumentItem[] = [];

    // Keep the latest item with that name, discard earlier duplicates
    for (let i = clubbedImages.length - 1; i >= 0; i--) {
      const item = clubbedImages[i];
      const lower = item.name.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.unshift(item);
      } else {
        removed.push(item);
      }
    }

    removed.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    setClubbedImages(unique);
  };

  // Find if an existing library material matches the current upload title in the same subject & year
  const existingSameNameMatch = React.useMemo(() => {
    const qTitle = uploadTitle.trim().toLowerCase();
    const qSubj = uploadSubjectCode.trim().toUpperCase();
    if (!qTitle || !qSubj) return null;
    return materials.find(
      (m) =>
        m.year === uploadYear &&
        m.subject_code.toUpperCase().trim() === qSubj &&
        (m.title.trim().toLowerCase() === qTitle ||
          (m.file_name && m.file_name.trim().toLowerCase() === qTitle))
    );
  }, [materials, uploadTitle, uploadSubjectCode, uploadYear]);

  // Edit Material State
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isDraggingEditFile, setIsDraggingEditFile] = useState(false);
  const [updatingMaterial, setUpdatingMaterial] = useState(false);

  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [userYearFilter, setUserYearFilter] = useState<'all' | '1' | '2' | '3' | '4' | 'unassigned'>('all');

  // Admin Management State (Owner Only)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'owner'>('admin');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminMgmtMsg, setAdminMgmtMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generic Confirm Modal State
  const [confirmModalSubmitting, setConfirmModalSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    isDestructive: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionLabel: 'Confirm',
    isDestructive: true,
    onConfirm: () => {},
  });

  // Google Drive Migration & Sync State
  const [migrationStats, setMigrationStats] = useState<{
    totalMaterials: number;
    driveMaterials: number;
    bundleMaterials: number;
    externalUrlMaterials: number;
    lastMigrationDate: string | null;
    hasRollbackSnapshot: boolean;
    rollbackSnapshotDate: string | null;
  } | null>(null);
  const [migrationFolderId, setMigrationFolderId] = useState('');
  const [migrationScanning, setMigrationScanning] = useState(false);
  const [migrationReport, setMigrationReport] = useState<any | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    async function initAdmin() {
      try {
        const userRes = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        if (!userData.authenticated || !userData.user?.isAdmin) {
          router.push('/dashboard?error=unauthorized_admin');
          return;
        }
        setCurrentUser(userData.user);

        // Instant access: Unlock admin console immediately!
        setLoading(false);

        // Fetch dashboard components in background without blocking the screen
        Promise.all([
          loadStats(),
          loadUsers(),
          loadMaterials(),
          loadLinks(),
          loadSettings(),
          loadAnnouncements(),
          loadFeedback(),
          userData.user?.isOwner ? loadAdmins() : Promise.resolve(),
        ]).catch((err) => console.error('Background admin data fetch error:', err));
      } catch (err) {
        console.error('Failed to load admin data', err);
        setLoading(false);
      }
    }
    initAdmin();
  }, [router]);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const d = await res.json();
        if (d.settings) {
          setAllowUserDownloads(d.settings.allow_user_downloads);
          if (typeof d.settings.require_community_verification === 'boolean') {
            setRequireCommunityVerification(d.settings.require_community_verification);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleDownloads = async (newValue: boolean) => {
    setUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_user_downloads: newValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update access mode setting');
      }
      setAllowUserDownloads(data.settings.allow_user_downloads);
      setSettingsMessage({
        type: 'success',
        text: newValue 
          ? 'Downloads Enabled: All students can now preview, fullscreen, and download documents.' 
          : 'Preview Only Enabled: Students can now only preview documents. Downloading is globally blocked.',
      });
      setTimeout(() => setSettingsMessage(null), 5000);
    } catch (err: any) {
      setSettingsMessage({
        type: 'error',
        text: err.message || 'Failed to update access mode',
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleCommunityVerification = async (newValue: boolean) => {
    setUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ require_community_verification: newValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update community verification setting');
      }
      setRequireCommunityVerification(data.settings.require_community_verification);
      setSettingsMessage({
        type: 'success',
        text: newValue 
          ? 'Community Verification Enforced: All students must complete community verification to access study materials.' 
          : 'Open Access Enabled: Anyone signed in can now access study materials without verification. Unverified members will need to verify once re-enabled.',
      });
      setTimeout(() => setSettingsMessage(null), 6000);
    } catch (err: any) {
      setSettingsMessage({
        type: 'error',
        text: err.message || 'Failed to update community verification setting',
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const loadMigrationStats = async () => {
    try {
      const res = await fetch('/api/admin/drive-migration');
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.stats) {
          setMigrationStats(d.stats);
        }
      }
    } catch (e) {
      console.error('Failed to load migration stats', e);
    }
  };

  const handleRunDryRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (migrationScanning) return;
    setMigrationScanning(true);
    setMigrationMessage(null);
    setMigrationReport(null);

    try {
      const res = await fetch('/api/admin/drive-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dry-run',
          folderId: migrationFolderId.trim() || undefined,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) {
        throw new Error(d.error || 'Failed to scan and generate migration dry-run.');
      }

      setMigrationReport(d.report);
      setMigrationMessage({
        type: 'success',
        text: `Dry-run completed successfully! Scanned ${d.report.totalDriveFilesScanned} Drive files. Matched ${d.report.matches.length} library records (${d.report.unmatchedMaterials.length} unmatched). Review the diff preview below.`,
      });
    } catch (err: any) {
      setMigrationMessage({
        type: 'error',
        text: err.message || 'Error occurred while scanning Google Drive.',
      });
    } finally {
      setMigrationScanning(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!migrationReport || migrating) return;

    setConfirmModal({
      isOpen: true,
      title: 'Execute Google Drive Migration',
      message: `Are you sure you want to apply updates to ${migrationReport.matches.length} database records? A rollback snapshot will be automatically saved before making changes, so you can reverse this anytime.`,
      actionLabel: 'Apply Migration',
      isDestructive: false,
      onConfirm: async () => {
        setMigrating(true);
        setMigrationMessage(null);
        try {
          const res = await fetch('/api/admin/drive-migration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'execute',
              folderId: migrationFolderId.trim() || undefined,
              targetDriveAccount: 'google-drive-migrated',
            }),
          });

          const d = await res.json();
          if (!res.ok || !d.success) {
            throw new Error(d.error || 'Migration execution failed.');
          }

          setMigrationMessage({
            type: 'success',
            text: `Migration applied successfully! Updated ${d.updatedCount} materials in Supabase. Rollback snapshot saved.`,
          });
          setMigrationReport(null);
          await Promise.all([loadMigrationStats(), loadMaterials(), loadStats()]);
        } catch (err: any) {
          setMigrationMessage({
            type: 'error',
            text: err.message || 'Failed to apply migration.',
          });
        } finally {
          setMigrating(false);
        }
      },
    });
  };

  const handleRollbackMigration = async () => {
    if (rollingBack) return;

    setConfirmModal({
      isOpen: true,
      title: 'Rollback Google Drive Migration',
      message: 'Restore all material file URLs and Drive File IDs from the last saved rollback snapshot? This will reverse the latest migration.',
      actionLabel: 'Restore Snapshot',
      isDestructive: true,
      onConfirm: async () => {
        setRollingBack(true);
        setMigrationMessage(null);
        try {
          const res = await fetch('/api/admin/drive-migration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'rollback' }),
          });

          const d = await res.json();
          if (!res.ok || !d.success) {
            throw new Error(d.error || 'Rollback failed.');
          }

          setMigrationMessage({
            type: 'success',
            text: `Rollback completed! Restored ${d.restoredCount} materials to their pre-migration state.`,
          });
          await Promise.all([loadMigrationStats(), loadMaterials(), loadStats()]);
        } catch (err: any) {
          setMigrationMessage({
            type: 'error',
            text: err.message || 'Failed to rollback migration.',
          });
        } finally {
          setRollingBack(false);
        }
      },
    });
  };

  const loadStats = async (fresh = false) => {
    try {
      const res = await fetch(`/api/admin/stats${fresh ? '?fresh=true' : ''}`);
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async (fresh = false) => {
    try {
      const res = await fetch(`/api/admin/users${fresh ? '?fresh=true' : ''}`);
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMaterials = async () => {
    try {
      const res = await fetch('/api/materials?limit=200');
      if (res.ok) {
        const d = await res.json();
        setMaterials(d.materials || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLinks = async () => {
    try {
      const res = await fetch('/api/admin/links');
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const d = await res.json();
        setAnalytics(d.analytics || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const d = await res.json();
        setAdmins(d.admins || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Announcements Actions ---
  const loadAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch('/api/whats-new?all=true', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setAnnouncements(d.items || []);
      }
    } catch (e) {
      console.error('Failed to load announcements', e);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementDesc.trim()) {
      setAnnouncementError('Title and description are required.');
      return;
    }
    setCreatingAnnouncement(true);
    setAnnouncementError('');
    setAnnouncementSuccess('');
    try {
      const res = await fetch('/api/whats-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          description: announcementDesc.trim(),
          type: announcementType,
          link: announcementLink.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish announcement');
      }
      setAnnouncementSuccess('Announcement broadcasted to all student dashboards!');
      setAnnouncementTitle('');
      setAnnouncementDesc('');
      setAnnouncementLink('');
      setAnnouncementType('announcement');
      await loadAnnouncements();
      setTimeout(() => setAnnouncementSuccess(''), 4000);
    } catch (err: any) {
      setAnnouncementError(err.message || 'Error publishing announcement');
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleToggleAnnouncementActive = async (item: WhatsNewItem) => {
    try {
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active, active: !a.is_active } : a));
      const res = await fetch('/api/whats-new', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
        }),
      });
      if (res.ok) {
        await loadAnnouncements();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update announcement status');
        await loadAnnouncements();
      }
    } catch (e) {
      console.error(e);
      await loadAnnouncements();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast announcement?')) return;
    try {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      const res = await fetch(`/api/whats-new?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadAnnouncements();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete announcement');
        await loadAnnouncements();
      }
    } catch (e) {
      console.error(e);
      await loadAnnouncements();
    }
  };

  // --- Student Feedback & Missing Subject Requests Actions ---
  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/admin/feedback');
      if (res.ok) {
        const d = await res.json();
        setFeedbackList(d.requests || []);
      }
    } catch (e) {
      console.error('Failed to load feedback', e);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, status: string, adminNote?: string) => {
    if (status === 'resolved') {
      setFeedbackList((prev) => prev.filter((r) => r.id !== id));
    }
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status, 
          admin_note: adminNote !== undefined ? adminNote : undefined 
        }),
      });
      if (res.ok) {
        await loadFeedback();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveFeedbackVerification = async (id: string, userName?: string) => {
    // Optimistically remove from records list immediately
    setFeedbackList((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          action: 'approve_verification',
          admin_note: 'Approved and verified by admin.' 
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await Promise.all([loadFeedback(), loadUsers(true), loadStats(true)]);
        alert(`Access approved! Student "${userName || 'Student'}" is now verified and has full library access. Record cleared.`);
      } else {
        await loadFeedback();
        alert(data.error || 'Failed to approve verification');
      }
    } catch (e) {
      console.error(e);
      await loadFeedback();
      alert('Network error approving verification');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student request record?')) return;
    try {
      const res = await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadFeedback();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Link Actions ---
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkSubmitting(true);
    setLinkError('');

    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLinkName.trim(),
          invite_url: newLinkUrl.trim(),
          type: newLinkType,
          is_active: newLinkIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create verification link');
      }

      setShowAddLinkModal(false);
      setNewLinkName('');
      setNewLinkUrl('');
      setNewLinkType('community');
      setNewLinkIsActive(true);
      await loadLinks();
    } catch (err: any) {
      setLinkError(err.message || 'Error creating link');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleToggleLinkActive = async (link: CommunityVerificationLink) => {
    try {
      const res = await fetch('/api/admin/links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: link.id,
          is_active: !link.is_active,
        }),
      });

      if (res.ok) {
        await loadLinks();
      } else {
        alert('Failed to toggle link status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestDeleteLink = (link: CommunityVerificationLink) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Verification Link',
      message: `Are you sure you want to permanently delete the WhatsApp link "${link.name}"? Existing students who already verified will retain access.`,
      actionLabel: 'Delete Link',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/links?id=${link.id}`, { method: 'DELETE' });
          if (res.ok) {
            await loadLinks();
          } else {
            alert('Failed to delete link');
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const requestRevokeUsersForLink = (link: CommunityVerificationLink) => {
    const userCount = link.verified_count || 0;
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Access for Associated Students',
      message: `Revoke community library access for all ${userCount} student(s) who joined through "${link.name}"? They will be prompted to re-verify next time they log in.`,
      actionLabel: `Revoke ${userCount} Student(s)`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/links', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: link.id,
              action: 'revoke_users',
            }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            await Promise.all([loadLinks(), loadUsers(), loadStats()]);
          } else {
            alert(data.error || 'Failed to revoke access');
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  // --- Material Upload & Edit ---
  const handleIncomingFiles = (incomingFileList: FileList | File[]) => {
    const files = Array.from(incomingFileList);
    if (files.length === 0) return;

    const isImageFile = (f: File) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return f.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(ext);
    };

    const isPdfFile = (f: File) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return f.type === 'application/pdf' || ext === '.pdf';
    };

    // If there is already an existing queue of files in clubbedImages, append to it
    if (clubbedImages.length > 0) {
      if (autoDeduplicateQueue) {
        // If an incoming file has the same name as one already in the queue, replace the older one
        const incomingNames = new Set(files.map((f) => f.name.toLowerCase().trim()));
        const keptItems: DocumentItem[] = [];
        clubbedImages.forEach((item) => {
          if (incomingNames.has(item.name.toLowerCase().trim())) {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          } else {
            keptItems.push(item);
          }
        });

        // Deduplicate within the incoming files batch itself (keep latest)
        const incomingMap = new Map<string, File>();
        files.forEach((f) => incomingMap.set(f.name.toLowerCase().trim(), f));
        const uniqueIncomingFiles = Array.from(incomingMap.values());

        const newItems: DocumentItem[] = uniqueIncomingFiles.map((file) => ({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl: isImageFile(file) ? URL.createObjectURL(file) : '',
          name: file.name,
          size: file.size,
          type: isPdfFile(file) ? 'pdf' : isImageFile(file) ? 'image' : 'other',
        }));
        setClubbedImages([...keptItems, ...newItems]);
        return;
      }

      const newItems: DocumentItem[] = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : '',
        name: file.name,
        size: file.size,
        type: isPdfFile(file) ? 'pdf' : isImageFile(file) ? 'image' : 'other',
      }));
      setClubbedImages((prev) => [...prev, ...newItems]);
      return;
    }

    // Multiple files selected or dropped:
    if (files.length > 1) {
      const allFiles = uploadFile ? [uploadFile, ...files] : files;
      setUploadFile(null);

      let filesToProcess = allFiles;
      if (autoDeduplicateQueue) {
        const fileMap = new Map<string, File>();
        allFiles.forEach((f) => fileMap.set(f.name.toLowerCase().trim(), f));
        filesToProcess = Array.from(fileMap.values());
      }

      const newItems: DocumentItem[] = filesToProcess.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : '',
        name: file.name,
        size: file.size,
        type: isPdfFile(file) ? 'pdf' : isImageFile(file) ? 'image' : 'other',
      }));
      setClubbedImages(newItems);

      // Auto-suggest title if not yet entered
      if (!uploadTitle.trim()) {
        const cleanName = filesToProcess[0].name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s*(page|pg|p|part|pt|img|image|unit|chapter)?\s*\d+$/i, '')
          .trim();
        setUploadTitle(cleanName || 'Study Material Bundle');
      }
      return;
    }

    // Single file selected:
    const singleFile = files[0];
    if (uploadFile) {
      // If a file was already selected previously, check if it's the same name
      if (autoDeduplicateQueue && uploadFile.name.toLowerCase().trim() === singleFile.name.toLowerCase().trim()) {
        setUploadFile(singleFile);
        return;
      }

      // Combine them into multi-document mode
      const item1: DocumentItem = {
        id: Math.random().toString(36).substring(2, 9),
        file: uploadFile,
        previewUrl: isImageFile(uploadFile) ? URL.createObjectURL(uploadFile) : '',
        name: uploadFile.name,
        size: uploadFile.size,
        type: isPdfFile(uploadFile) ? 'pdf' : isImageFile(uploadFile) ? 'image' : 'other',
      };
      const item2: DocumentItem = {
        id: Math.random().toString(36).substring(2, 9),
        file: singleFile,
        previewUrl: isImageFile(singleFile) ? URL.createObjectURL(singleFile) : '',
        name: singleFile.name,
        size: singleFile.size,
        type: isPdfFile(singleFile) ? 'pdf' : isImageFile(singleFile) ? 'image' : 'other',
      };
      setClubbedImages([item1, item2]);
      setUploadFile(null);
      return;
    }

    if (isImageFile(singleFile)) {
      // Single image goes into queue so admin can easily add more pages or club
      const newItem: DocumentItem = {
        id: Math.random().toString(36).substring(2, 9),
        file: singleFile,
        previewUrl: URL.createObjectURL(singleFile),
        name: singleFile.name,
        size: singleFile.size,
        type: 'image',
      };
      setClubbedImages([newItem]);
      setUploadFile(null);
      if (!uploadTitle.trim()) {
        const cleanName = singleFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s*(page|pg|p|part|pt|img|image)?\s*\d+$/i, '')
          .trim();
        setUploadTitle(cleanName || 'Study Notes');
      }
    } else {
      // Single PDF or document
      setUploadFile(singleFile);
      if (!uploadTitle.trim()) {
        const cleanName = singleFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setUploadTitle(cleanName);
      }
    }
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    setClubbedImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removePage = (index: number) => {
    setClubbedImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearClubbedPages = () => {
    clubbedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setClubbedImages([]);
    const input = document.getElementById('pdfUploadInput') as HTMLInputElement;
    if (input) input.value = '';
  };

  const extractValidUrls = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/https?:\/\/[^\s"',;<>]+/gi) || [];
    return Array.from(new Set(matches.map((u) => u.trim()))).filter((u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;

    let detectedMultiUrls: string[] = [];

    if (resourceMode === 'link') {
      if (isMultiLink) {
        detectedMultiUrls = extractValidUrls(multiLinksText);
        if (detectedMultiUrls.length === 0) {
          setUploadMessage({ type: 'error', text: 'Please paste at least one valid resource link starting with http:// or https://' });
          return;
        }
      } else {
        const extracted = extractValidUrls(resourceLink.trim());
        if (extracted.length > 1) {
          // Auto-detect multiple links in single field
          detectedMultiUrls = extracted;
          setIsMultiLink(true);
          setMultiLinksText(resourceLink);
        } else if (extracted.length === 1) {
          detectedMultiUrls = extracted;
        } else {
          if (!resourceLink.trim()) {
            setUploadMessage({ type: 'error', text: 'Please enter or paste a valid resource link (URL).' });
            return;
          }
          try {
            new URL(resourceLink.trim());
            detectedMultiUrls = [resourceLink.trim()];
          } catch {
            setUploadMessage({ type: 'error', text: 'Please enter a valid link including https:// or http://' });
            return;
          }
        }
      }
    } else {
      if (!uploadFile && clubbedImages.length === 0) {
        setUploadMessage({ type: 'error', text: 'Please select a document or image files to upload.' });
        return;
      }
    }

    setUploading(true);
    setUploadMessage(null);
    setUploadProgress(0);
    setUploadStage('');

    try {
      if (resourceMode === 'link') {
        // Multi-link processing
        if (isMultiLink || detectedMultiUrls.length > 1) {
          const linksList = detectedMultiUrls.length > 0 ? detectedMultiUrls : extractValidUrls(multiLinksText);

          if (multiLinkProcessingMode === 'bundle') {
            // Mode A: Bundle all links into ONE card with the multi-file switcher
            setUploadStage(`Bundling ${linksList.length} links into a single multi-part study resource...`);
            setUploadProgress(40);

            const bundledParts = linksList.map((linkStr, idx) => {
              const driveMatch = linkStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                                 linkStr.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                                 linkStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
              const driveId = driveMatch ? driveMatch[1] : undefined;
              return {
                title: `Part ${idx + 1}`,
                name: `Part ${idx + 1}`,
                url: linkStr,
                drive_file_id: driveId,
                size: linkStr.includes('drive.google.com') ? 'Google Drive' : 'Resource Link',
              };
            });

            const res = await fetch('/api/materials/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: uploadTitle,
                subject: uploadSubject,
                subject_code: uploadSubjectCode,
                year: uploadYear,
                material_type: uploadType,
                description: uploadDescription,
                file_url: JSON.stringify(bundledParts),
                file_size: `${linksList.length} Links Bundle`,
                drive_file_id: bundledParts[0]?.drive_file_id,
                file_name: uploadTitle,
                mime_type: 'application/json',
                delete_same_name: deleteSameNameOnUpload,
              }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data?.error || `Bundled upload failed with status ${res.status}`);
            }

            const delNote = data?.deletedSameNameCount > 0 ? ` (Replaced & deleted ${data.deletedSameNameCount} previous file(s) with the same name)` : '';
            setUploadProgress(100);
            setUploadMessage({
              type: 'success',
              text: `"${uploadTitle}" (${linksList.length} links bundled) published successfully to ${formatYearName(uploadYear)}!${delNote}`,
            });
          } else {
            // Mode B: Batch publish separate cards for each link
            let publishedCount = 0;
            for (let i = 0; i < linksList.length; i++) {
              const linkStr = linksList[i];
              const cardTitle = linksList.length > 1 ? `${uploadTitle} (Part ${i + 1})` : uploadTitle;
              setUploadStage(`Publishing card ${i + 1} of ${linksList.length}: "${cardTitle}"...`);
              setUploadProgress(Math.round(((i + 1) / linksList.length) * 100));

              const driveMatch = linkStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                                 linkStr.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                                 linkStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
              const driveId = driveMatch ? driveMatch[1] : undefined;

              const res = await fetch('/api/materials/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: cardTitle,
                  subject: uploadSubject,
                  subject_code: uploadSubjectCode,
                  year: uploadYear,
                  material_type: uploadType,
                  description: uploadDescription,
                  file_url: linkStr,
                  file_size: linkStr.includes('drive.google.com') ? 'Google Drive' : 'Resource Link',
                  drive_file_id: driveId,
                  file_name: cardTitle,
                  mime_type: linkStr.includes('drive.google.com') ? 'application/pdf' : 'text/uri-list',
                  delete_same_name: deleteSameNameOnUpload,
                }),
              });

              if (res.ok) publishedCount++;
            }

            setUploadProgress(100);
            setUploadMessage({
              type: 'success',
              text: `Successfully published ${publishedCount} distinct material card(s) from multiple links to ${formatYearName(uploadYear)}!`,
            });
          }

          // Reset form
          setUploadTitle('');
          setUploadSubject('');
          setUploadSubjectCode('');
          setUploadDescription('');
          setResourceLink('');
          setMultiLinksText('');
          setIsMultiLink(false);
          setUploadProgress(0);
          setUploadStage('');
          await Promise.all([loadMaterials(), loadStats(), loadAnalytics()]);
          return;
        }

        // Single link processing
        const cleanLink = resourceLink.trim();
        const isDrive = cleanLink.includes('drive.google.com');

        // Extract Google Drive ID if present
        const driveMatch = cleanLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                           cleanLink.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                           cleanLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const driveId = driveMatch ? driveMatch[1] : undefined;

        setUploadStage('Registering resource link in library database...');
        setUploadProgress(50);

        const res = await fetch('/api/materials/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: uploadTitle,
            subject: uploadSubject,
            subject_code: uploadSubjectCode,
            year: uploadYear,
            material_type: uploadType,
            description: uploadDescription,
            file_url: cleanLink,
            file_size: isDrive ? 'Google Drive' : 'Resource Link',
            drive_file_id: driveId,
            file_name: uploadTitle,
            mime_type: isDrive ? 'application/pdf' : 'text/uri-list',
            delete_same_name: deleteSameNameOnUpload,
          }),
        });

        let data: any = null;
        const resText = await res.text();
        try {
          data = JSON.parse(resText);
        } catch {
          throw new Error(`Server returned unexpected response (status ${res.status}): ${resText.slice(0, 150)}`);
        }

        if (!res.ok || !data.success) {
          throw new Error(data?.error || `Upload registration failed with status ${res.status}`);
        }

        const delNote = data?.deletedSameNameCount > 0 ? ` (Replaced & deleted ${data.deletedSameNameCount} previous file(s) with the same name)` : '';
        setUploadProgress(100);
        setUploadMessage({
          type: 'success',
          text: `"${uploadTitle}" registered successfully via Resource Link & published to ${formatYearName(uploadYear)}!${delNote}`,
        });

        // Reset form
        setUploadTitle('');
        setUploadSubject('');
        setUploadSubjectCode('');
        setUploadDescription('');
        setResourceLink('');
        setMultiLinksText('');
        setIsMultiLink(false);
        setUploadProgress(0);
        setUploadStage('');

        // Refresh list, analytics & stats
        await Promise.all([loadMaterials(), loadStats(), loadAnalytics()]);
        return;
      }

      if (clubbedImages.length > 1 && multiPdfMode === 'bundle') {
        // --- MODE 2: BUNDLE MULTI-PDF (Keep separate files in 1 card with part switcher) ---
        const uploadedParts: Array<{
          title: string;
          name: string;
          url: string;
          drive_file_id: string;
          size: string;
        }> = [];

        let totalBytesUploaded = 0;
        const totalBytesAll = clubbedImages.reduce((sum, item) => sum + item.file.size, 0);

        for (let i = 0; i < clubbedImages.length; i++) {
          const item = clubbedImages[i];
          const itemCleanTitle = item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || `Part ${i + 1}`;
          setUploadStage(`Uploading file ${i + 1} of ${clubbedImages.length}: "${item.name}"...`);

          const driveResult = await uploadToGoogleDriveResumable({
            file: item.file,
            title: `${uploadTitle} - ${itemCleanTitle}`,
            subjectCode: uploadSubjectCode,
            year: uploadYear,
            materialType: uploadType,
            description: uploadDescription,
            onProgress: (percent, loaded) => {
              const overallLoaded = totalBytesUploaded + loaded;
              const overallPercent = Math.min(99, Math.round((overallLoaded / (totalBytesAll || 1)) * 100));
              setUploadProgress(overallPercent);
              const loadedMb = (overallLoaded / (1024 * 1024)).toFixed(1);
              const totalMb = (totalBytesAll / (1024 * 1024)).toFixed(1);
              setUploadStage(`File ${i + 1}/${clubbedImages.length}: ${percent}% (${loadedMb} of ${totalMb} MB)`);
            },
          });

          totalBytesUploaded += item.file.size;
          uploadedParts.push({
            title: itemCleanTitle,
            name: driveResult.fileName,
            url: driveResult.fileUrl,
            drive_file_id: driveResult.fileId,
            size: driveResult.fileSizeFormatted,
          });
        }

        setUploadStage('Saving multi-file bundle to study library...');
        setUploadProgress(100);

        const totalBundleSize = (totalBytesAll / (1024 * 1024)).toFixed(1) + ' MB';

        const res = await fetch('/api/materials/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: uploadTitle,
            subject: uploadSubject,
            subject_code: uploadSubjectCode,
            year: uploadYear,
            material_type: uploadType,
            description: uploadDescription,
            file_url: JSON.stringify(uploadedParts),
            file_size: totalBundleSize,
            drive_file_id: uploadedParts[0].drive_file_id,
            file_name: `${uploadedParts.length} files bundle`,
            mime_type: 'application/json',
            delete_same_name: deleteSameNameOnUpload,
          }),
        });

        const resText = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(resText);
        } catch {
          throw new Error(`Server returned unexpected response (status ${res.status}): ${resText.slice(0, 150)}`);
        }

        if (!res.ok || !data.success) {
          throw new Error(data?.error || `Upload registration failed with status ${res.status}`);
        }

        const delNote = data?.deletedSameNameCount > 0 ? ` (Replaced & deleted ${data.deletedSameNameCount} previous file(s) with the same name)` : '';
        setUploadMessage({
          type: 'success',
          text: `"${uploadTitle}" (${uploadedParts.length} files bundled, ${totalBundleSize}) uploaded successfully to Google Drive & published to ${formatYearName(uploadYear)}!${delNote}`,
        });
      } else if (clubbedImages.length > 1 && multiPdfMode === 'batch') {
        // --- MODE 3: BATCH UPLOAD (Publish each file as separate library material) ---
        let totalBytesUploaded = 0;
        let totalBatchDeleted = 0;
        const totalBytesAll = clubbedImages.reduce((sum, item) => sum + item.file.size, 0);

        for (let i = 0; i < clubbedImages.length; i++) {
          const item = clubbedImages[i];
          const itemCleanTitle = item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          const itemTitle = uploadTitle
            ? `${uploadTitle} - ${itemCleanTitle}`
            : itemCleanTitle;

          setUploadStage(`Batch uploading ${i + 1} of ${clubbedImages.length}: "${item.name}"...`);

          const driveResult = await uploadToGoogleDriveResumable({
            file: item.file,
            title: itemTitle,
            subjectCode: uploadSubjectCode,
            year: uploadYear,
            materialType: uploadType,
            description: uploadDescription,
            onProgress: (percent, loaded) => {
              const overallLoaded = totalBytesUploaded + loaded;
              const overallPercent = Math.min(99, Math.round((overallLoaded / (totalBytesAll || 1)) * 100));
              setUploadProgress(overallPercent);
              const loadedMb = (overallLoaded / (1024 * 1024)).toFixed(1);
              const totalMb = (totalBytesAll / (1024 * 1024)).toFixed(1);
              setUploadStage(`Batch ${i + 1}/${clubbedImages.length}: ${percent}% (${loadedMb} of ${totalMb} MB)`);
            },
          });

          totalBytesUploaded += item.file.size;

          const res = await fetch('/api/materials/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: itemTitle,
              subject: uploadSubject,
              subject_code: uploadSubjectCode,
              year: uploadYear,
              material_type: uploadType,
              description: uploadDescription,
              file_url: driveResult.fileUrl,
              file_size: driveResult.fileSizeFormatted,
              drive_file_id: driveResult.fileId,
              file_name: driveResult.fileName,
              mime_type: driveResult.mimeType,
              delete_same_name: deleteSameNameOnUpload,
            }),
          });

          if (!res.ok) {
            const resText = await res.text();
            console.warn(`Batch item registration error:`, resText);
          } else {
            try {
              const itemJson = await res.json();
              if (itemJson?.deletedSameNameCount) {
                totalBatchDeleted += itemJson.deletedSameNameCount;
              }
            } catch (e) {}
          }
        }

        const delNote = totalBatchDeleted > 0 ? ` (Replaced & deleted ${totalBatchDeleted} previous file(s) with the same name)` : '';
        setUploadMessage({
          type: 'success',
          text: `Successfully batch uploaded all ${clubbedImages.length} files to Google Drive & published to ${formatYearName(uploadYear)}!${delNote}`,
        });
      } else {
        // --- MODE 1: SINGLE FILE OR MERGE MULTI-DOCUMENT INTO 1 MASTER PDF ---
        let fileToUpload: File;

        if (clubbedImages.length > 0) {
          setIsMergingImages(true);
          setUploadStage(
            clubbedImages.length > 1
              ? `Merging ${clubbedImages.length} documents/pages into 1 PDF...`
              : 'Preparing document PDF...'
          );
          fileToUpload = await mergeDocumentsToPdf(
            clubbedImages.map((item) => item.file),
            uploadTitle,
            (prog) => setUploadStage(prog.stage)
          );
          setIsMergingImages(false);
        } else if (uploadFile) {
          fileToUpload = uploadFile;
        } else {
          throw new Error('No file selected.');
        }

        setUploadStage('Authorizing with Google Drive...');

        // 1. Direct browser-to-Google Drive resumable upload (bypasses Vercel 4.5MB request limit)
        const driveResult = await uploadToGoogleDriveResumable({
          file: fileToUpload,
          title: uploadTitle,
          subjectCode: uploadSubjectCode,
          year: uploadYear,
          materialType: uploadType,
          description: uploadDescription,
          onProgress: (percent, loaded, total) => {
            setUploadProgress(percent);
            const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (total / (1024 * 1024)).toFixed(1);
            setUploadStage(`Uploading to Google Drive: ${percent}% (${loadedMb} of ${totalMb} MB)`);
          },
        });

        setUploadStage('Saving study material to library database...');
        setUploadProgress(100);

        // 2. Register metadata and Google Drive file ID in Supabase
        const res = await fetch('/api/materials/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: uploadTitle,
            subject: uploadSubject,
            subject_code: uploadSubjectCode,
            year: uploadYear,
            material_type: uploadType,
            description: uploadDescription,
            file_url: driveResult.fileUrl,
            file_size: driveResult.fileSizeFormatted,
            drive_file_id: driveResult.fileId,
            file_name: driveResult.fileName,
            mime_type: driveResult.mimeType,
            delete_same_name: deleteSameNameOnUpload,
          }),
        });

        // Safely parse server response as text first to guard against non-JSON server pages
        let data: any = null;
        const resText = await res.text();
        try {
          data = JSON.parse(resText);
        } catch {
          throw new Error(`Server returned unexpected response (status ${res.status}): ${resText.slice(0, 150)}`);
        }

        if (!res.ok || !data.success) {
          throw new Error(data?.error || `Upload registration failed with status ${res.status}`);
        }

        const clubbedNote = clubbedImages.length > 1 ? ` (${clubbedImages.length} files merged into 1 PDF)` : '';
        const delNote = data?.deletedSameNameCount > 0 ? ` (Replaced & deleted ${data.deletedSameNameCount} previous file(s) with the same name)` : '';
        setUploadMessage({
          type: 'success',
          text: `"${uploadTitle}" (${driveResult.fileSizeFormatted})${clubbedNote} uploaded successfully to Google Drive & published to ${formatYearName(uploadYear)}!${delNote}`,
        });
      }

      // Reset form
      setUploadTitle('');
      setUploadSubject('');
      setUploadSubjectCode('');
      setUploadDescription('');
      setUploadFile(null);
      clubbedImages.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setClubbedImages([]);
      setUploadProgress(0);
      setUploadStage('');

      const input = document.getElementById('pdfUploadInput') as HTMLInputElement;
      if (input) input.value = '';

      // Refresh list, analytics & stats
      await Promise.all([loadMaterials(), loadStats(), loadAnalytics()]);
    } catch (err: any) {
      console.error('Study material upload failed:', err);
      setUploadMessage({ 
        type: 'error', 
        text: err.message || 'Failed to upload material to Google Drive. Please retry.' 
      });
    } finally {
      setUploading(false);
      setIsMergingImages(false);
      setUploadStage('');
    }
  };

  const requestDeleteMaterial = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Study Material',
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      actionLabel: 'Permanently Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setMaterials((prev) => prev.filter((m) => m.id !== id));
            await Promise.all([loadStats(), loadAnalytics()]);
          } else {
            alert('Failed to delete material');
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    setUpdatingMaterial(true);

    try {
      let replacementUrl: string | undefined;
      let replacementSize: string | undefined;

      // If replacement file provided, upload directly to Google Drive
      if (editFile) {
        const driveResult = await uploadToGoogleDriveResumable({
          file: editFile,
          title: editingMaterial.title,
          subjectCode: editingMaterial.subject_code,
          year: editingMaterial.year,
          materialType: editingMaterial.material_type,
          description: editingMaterial.description,
        });
        replacementUrl = driveResult.fileUrl;
        replacementSize = driveResult.fileSizeFormatted;
      }

      const res = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingMaterial.title,
          description: editingMaterial.description || '',
          subject: editingMaterial.subject,
          subject_code: editingMaterial.subject_code,
          year: editingMaterial.year,
          material_type: editingMaterial.material_type,
          ...(replacementUrl ? { file_url: replacementUrl, file_size: replacementSize } : { file_url: editingMaterial.file_url }),
        }),
      });

      const resText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(`Server returned unexpected response (status ${res.status}): ${resText.slice(0, 150)}`);
      }

      if (res.ok && data?.success) {
        setEditingMaterial(null);
        setEditFile(null);
        await Promise.all([loadMaterials(), loadAnalytics()]);
      } else {
        alert(data?.error || 'Update failed');
      }
    } catch (e: any) {
      console.error('Update material error:', e);
      alert(e.message || 'Failed to update material');
    } finally {
      setUpdatingMaterial(false);
    }
  };

  // --- User Access Approval & Revocation ---
  const requestApproveIndividualUser = (u: UserActivityRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Community Verification',
      message: `Manually approve community access for student "${u.name}" (${u.email})? This will immediately unlock their access to the Study Material Library.`,
      actionLabel: 'Approve & Unlock Access',
      isDestructive: false,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: u.id,
              email: u.email,
              name: u.name,
              action: 'approve_verification',
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setUsers((prev) =>
              prev.map((user) =>
                user.id === u.id
                  ? {
                      ...user,
                      community_joined: true,
                      community_verified_at: new Date().toISOString(),
                    }
                  : user
              )
            );
            await Promise.all([loadUsers(true), loadStats(true)]);
          } else {
            alert(data.error || 'Failed to approve user verification');
          }
        } catch (e) {
          console.error(e);
          alert('Network error approving user verification');
        }
      },
    });
  };

  const requestRevokeIndividualUser = (u: UserActivityRecord) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Community Verification',
      message: `Revoke verified library status for student "${u.name}" (${u.email})? They will have to submit an approved community invite link again.`,
      actionLabel: 'Revoke Verification',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: u.id,
              action: 'revoke_verification',
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setUsers((prev) =>
              prev.map((user) =>
                user.id === u.id
                  ? {
                      ...user,
                      community_joined: false,
                      community_verified_at: null,
                      community_verification_link_id: null,
                    }
                  : user
              )
            );
            await Promise.all([loadUsers(true), loadStats(true)]);
          } else {
            alert(data.error || 'Failed to revoke user verification');
          }
        } catch (e) {
          console.error(e);
          alert('Network error revoking user verification');
        }
      },
    });
  };

  // --- Admin Roles Management (Owner Only) ---
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    setAdminMgmtMsg(null);

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail.trim().toLowerCase(),
          role: newAdminRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add admin');
      }

      setAdminMgmtMsg({
        type: 'success',
        text: `Granted ${newAdminRole.toUpperCase()} permissions to ${newAdminEmail}.`,
      });
      setNewAdminEmail('');
      await loadAdmins();
    } catch (err: any) {
      setAdminMgmtMsg({ type: 'error', text: err.message || 'Error updating admin roster' });
    } finally {
      setAddingAdmin(false);
    }
  };

  const requestRemoveAdmin = (admin: Admin) => {
    if (admin.email.toLowerCase() === 'mishra.rajvansh11@gmail.com') {
      alert('The Owner account (mishra.rajvansh11@gmail.com) is permanently protected and cannot be deleted.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Remove Administrator',
      message: `Are you sure you want to revoke admin privileges for "${admin.email}"? They will revert to standard student permissions.`,
      actionLabel: 'Revoke Admin Privileges',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/roles?id=${admin.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            await loadAdmins();
          } else {
            alert(data.error || 'Failed to remove admin');
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesYear = matYearFilter === 0 || m.year === matYearFilter;
    const matchesType = matTypeFilter === 'All' || m.material_type === matTypeFilter;
    const q = matSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      m.title.toLowerCase().includes(q) || 
      m.subject.toLowerCase().includes(q) || 
      m.subject_code.toLowerCase().includes(q);
    return matchesYear && matchesType && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const matchesStatus = 
      userStatusFilter === 'all' || 
      (userStatusFilter === 'verified' && u.community_joined) || 
      (userStatusFilter === 'unverified' && !u.community_joined);
    const matchesYear =
      userYearFilter === 'all' ||
      (userYearFilter === 'unassigned' && (!u.year || u.year < 1 || u.year > 4)) ||
      (String(u.year) === userYearFilter);
    const q = userSearch.toLowerCase().trim();
    const matchesSearch = !q || 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    return matchesStatus && matchesYear && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-lpu-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Verifying administrator credentials...</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Campus Connect LPU Security Gateway</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      
      {/* ============================================================== */}
      {/* RESPONSIVE SIDEBAR NAVIGATION                                 */}
      {/* ============================================================== */}
      
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lpu-600 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
            CC
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">Admin Console</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{currentUser?.isOwner ? 'Owner Access' : 'Admin Access'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64 shrink-0
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-lpu-600 to-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                CC
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Campus Connect
                </h2>
                <span className="text-[11px] font-bold text-lpu-600 dark:text-orange-400 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Admin Badge */}
          <div className="px-4 py-3 mx-3 my-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex items-center gap-3">
            <img
              src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || 'Admin')}`}
              alt={currentUser?.name}
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                {currentUser?.email}
              </div>
              <div className="mt-1">
                {currentUser?.isOwner ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-transparent dark:border-amber-800">
                    <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    System Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-transparent dark:border-blue-800">
                    <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Administrator
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-2">
            
            <button
              onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => { setActiveTab('materials'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'materials'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Materials Library</span>
              </div>
              <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                activeTab === 'materials' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {materials.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('upload'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'upload'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Upload Material</span>
            </button>

            <button
              onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'users'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Users Telemetry</span>
              </div>
              <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {users.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('links'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'links'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 shrink-0" />
                <span>WhatsApp Links</span>
              </div>
              <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                activeTab === 'links' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {links.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); loadAnalytics(); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'analytics'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span>Downloads & Analytics</span>
            </button>

            <button
              onClick={() => { setActiveTab('announcements'); setSidebarOpen(false); loadAnnouncements(); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'announcements'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Megaphone className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Announcements</span>
              </div>
              <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
              }`}>
                {announcements.filter(a => a.active !== false).length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('feedback'); setSidebarOpen(false); loadFeedback(); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'feedback'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0 text-blue-500" />
                <span>Requests & Feedback</span>
              </div>
              {feedbackList.filter(f => f.status === 'pending').length > 0 ? (
                <span className="text-[10px] px-1.8 py-0.5 rounded-md font-bold bg-rose-500 text-white animate-pulse">
                  {feedbackList.filter(f => f.status === 'pending').length} new
                </span>
              ) : (
                <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                  activeTab === 'feedback' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {feedbackList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'settings'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => { setActiveTab('drive-sync'); setSidebarOpen(false); loadMigrationStats(); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'drive-sync'
                  ? 'bg-lpu-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 shrink-0 text-sky-500" />
                <span>Drive Sync &amp; Migration</span>
              </div>
              <span className={`text-[10px] px-1.8 py-0.5 rounded-md font-bold ${
                activeTab === 'drive-sync' ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
              }`}>
                Auto
              </span>
            </button>

            {/* OWNER ONLY SECTION */}
            {currentUser?.isOwner && (
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Owner Privileges
                </div>
                <button
                  onClick={() => { setActiveTab('admin-settings'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'admin-settings'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Admin Management</span>
                </button>
              </div>
            )}

          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => router.push('/library')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <span>Switch to Student View</span>
          </button>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                try {
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  if (supabase) await supabase.auth.signOut();
                } catch (e) {}
                try {
                  if (typeof window !== 'undefined') {
                    Object.keys(localStorage).forEach((k) => {
                      if (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth')) {
                        localStorage.removeItem(k);
                      }
                    });
                    sessionStorage.clear();
                  }
                } catch (e) {}
                window.location.href = '/login';
              } catch (err) {
                window.location.href = '/login';
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ============================================================== */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto space-y-8">

        {/* ============================================================ */}
        {/* TAB 1: DASHBOARD OVERVIEW                                    */}
        {/* ============================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-6 h-6 text-lpu-600 dark:text-orange-400" />
                  Campus Connect Real-Time Dashboard
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Database verified telemetry • Year-Wise Materials Bank • One-Time WhatsApp Verifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    loadStats();
                    loadUsers();
                    loadMaterials();
                    loadAnalytics();
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Refresh Live Telemetry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Metrics</span>
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="py-2.5 px-4 rounded-xl bg-lpu-600 hover:bg-lpu-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-98"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Upload Material</span>
                </button>
              </div>
            </div>

            {/* 5 Core Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Total Users */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Users
                  </span>
                  <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats?.totalUsers ?? users.length}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Registered LPU students
                </div>
              </div>

              {/* Active Users (30d) */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Active Users
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {stats?.activeUsers ?? 0}
                </div>
                <div className="text-[11px] font-medium text-emerald-800/80 dark:text-emerald-400/90 mt-1">
                  Active past 30 days
                </div>
              </div>

              {/* Active Today (24h) */}
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                    Active Today
                  </span>
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                  {stats?.activeToday ?? 0}
                </div>
                <div className="text-[11px] font-medium text-blue-800/80 dark:text-blue-400/90 mt-1">
                  Active past 24 hours
                </div>
              </div>

              {/* Active This Week (7d) */}
              <div className="bg-teal-50/60 dark:bg-teal-950/30 p-5 rounded-2xl border border-teal-200/80 dark:border-teal-800/60 shadow-xs">
                <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                    Active This Week
                  </span>
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-3xl font-black text-teal-700 dark:text-teal-300">
                  {stats?.activeThisWeek ?? 0}
                </div>
                <div className="text-[11px] font-medium text-teal-800/80 dark:text-teal-400/90 mt-1">
                  Active past 7 days
                </div>
              </div>

              {/* Community Confirmed Users */}
              <div className="bg-orange-50/60 dark:bg-orange-950/30 p-5 rounded-2xl border border-orange-200/80 dark:border-orange-800/60 shadow-xs">
                <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">
                    Community Confirmed
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-3xl font-black text-orange-700 dark:text-orange-300">
                  {stats?.communityVerified ?? 0}
                </div>
                <div className="text-[11px] font-medium text-orange-800/80 dark:text-orange-400/90 mt-1">
                  Full library unlocked
                </div>
              </div>

            </div>

            {/* Global Document Access Mode Quick Controller */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              allowUserDownloads 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' 
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  allowUserDownloads ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                }`}>
                  {allowUserDownloads ? <DownloadCloud className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Global Document Access Mode:
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      allowUserDownloads ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                    }`}>
                      {allowUserDownloads ? 'Downloads Allowed' : 'Preview Only'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {allowUserDownloads 
                      ? 'Students have both [ Preview ] and [ Download ] buttons unlocked across all study materials.'
                      : 'Students have [ Preview Document ] enabled only. Direct file downloads are disabled globally.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  disabled={updatingSettings || settingsLoading}
                  onClick={() => handleToggleDownloads(!allowUserDownloads)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    allowUserDownloads
                      ? 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {updatingSettings ? 'Saving...' : allowUserDownloads ? 'Switch to Preview Only' : 'Allow Downloads'}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  Settings ⚙️
                </button>
              </div>
            </div>

            {/* Global Community Verification Quick Controller */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              requireCommunityVerification
                ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/60'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  requireCommunityVerification
                    ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {requireCommunityVerification ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Global Community Verification:
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      requireCommunityVerification
                        ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {requireCommunityVerification ? 'Verification Required (ON)' : 'Open Access (OFF)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {requireCommunityVerification
                      ? 'Students must complete WhatsApp/community verification to browse and access study materials.'
                      : 'Students can freely access all materials just by signing in. Verification step is bypassed.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  disabled={updatingSettings || settingsLoading}
                  onClick={() => handleToggleCommunityVerification(!requireCommunityVerification)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    requireCommunityVerification
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {updatingSettings
                    ? 'Saving...'
                    : requireCommunityVerification
                    ? 'Turn OFF (Open Access)'
                    : 'Turn ON (Require Verification)'}
                </button>
              </div>
            </div>

            {/* Secondary row: Materials & Downloads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Study Materials
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {stats?.totalMaterials ?? materials.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Organized across 1st-4th Year
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total File Downloads
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {stats?.totalDownloads ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verified student downloads
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <DownloadCloud className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pending Verification
                  </span>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                    {stats?.communityPending ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Awaiting WhatsApp invite link
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Student Academic Year Distribution Section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-lpu-600 dark:text-orange-400" />
                    Student Academic Year Distribution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live breakdown of registered students across academic batches
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl">
                    Total Students: <strong className="text-lpu-600 dark:text-orange-400">{stats?.totalUsers ?? users.length}</strong>
                  </span>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-bold text-lpu-600 dark:text-orange-400 hover:text-lpu-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1"
                  >
                    View in Users Tab <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1st Year */}
                <div 
                  onClick={() => { setUserYearFilter('1'); setActiveTab('users'); }}
                  className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <span>1st Year</span>
                    <span className="text-[10px] bg-sky-200/70 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 px-1.5 py-0.5 rounded-md font-extrabold group-hover:bg-sky-300 dark:group-hover:bg-sky-800 transition-colors">Freshmen</span>
                  </div>
                  <div className="text-3xl font-black text-sky-950 dark:text-sky-100 mt-1">
                    {stats?.studentYearBreakdown?.[1] ?? users.filter(u => u.year === 1).length}
                  </div>
                  <p className="text-[11px] text-sky-800/70 dark:text-sky-300/80 mt-1 flex items-center justify-between">
                    <span>Registered students</span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold group-hover:underline">Filter &rarr;</span>
                  </p>
                </div>

                {/* 2nd Year */}
                <div 
                  onClick={() => { setUserYearFilter('2'); setActiveTab('users'); }}
                  className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <span>2nd Year</span>
                    <span className="text-[10px] bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-md font-extrabold group-hover:bg-emerald-300 dark:group-hover:bg-emerald-800 transition-colors">Core</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                    {stats?.studentYearBreakdown?.[2] ?? users.filter(u => u.year === 2).length}
                  </div>
                  <p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/80 mt-1 flex items-center justify-between">
                    <span>Registered students</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline">Filter &rarr;</span>
                  </p>
                </div>

                {/* 3rd Year */}
                <div 
                  onClick={() => { setUserYearFilter('3'); setActiveTab('users'); }}
                  className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <span>3rd Year</span>
                    <span className="text-[10px] bg-purple-200/70 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded-md font-extrabold group-hover:bg-purple-300 dark:group-hover:bg-purple-800 transition-colors">Specialization</span>
                  </div>
                  <div className="text-3xl font-black text-purple-950 dark:text-purple-100 mt-1">
                    {stats?.studentYearBreakdown?.[3] ?? users.filter(u => u.year === 3).length}
                  </div>
                  <p className="text-[11px] text-purple-800/70 dark:text-purple-300/80 mt-1 flex items-center justify-between">
                    <span>Registered students</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold group-hover:underline">Filter &rarr;</span>
                  </p>
                </div>

                {/* 4th Year */}
                <div 
                  onClick={() => { setUserYearFilter('4'); setActiveTab('users'); }}
                  className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <span>4th Year</span>
                    <span className="text-[10px] bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-md font-extrabold group-hover:bg-amber-300 dark:group-hover:bg-amber-800 transition-colors">Graduating</span>
                  </div>
                  <div className="text-3xl font-black text-amber-950 dark:text-amber-100 mt-1">
                    {stats?.studentYearBreakdown?.[4] ?? users.filter(u => u.year === 4).length}
                  </div>
                  <p className="text-[11px] text-amber-800/70 dark:text-amber-300/80 mt-1 flex items-center justify-between">
                    <span>Registered students</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold group-hover:underline">Filter &rarr;</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Preview Tables: Recent Activity & Top Materials */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Users Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Recent Student Activity
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Real-time authenticated student presence
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-bold text-lpu-600 dark:text-orange-400 hover:text-lpu-700 dark:hover:text-orange-300 flex items-center gap-1"
                  >
                    View All ({users.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.length > 0 ? (
                        users.slice(0, 5).map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <img
                                src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                                alt={u.name}
                                className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                              />
                              <div className="truncate max-w-[140px]">
                                <div className="font-bold truncate">{u.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{u.email}</div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {u.community_joined ? (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  Verified ✓
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                              {formatRelativeTime(u.last_active_at || u.last_login)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Most Downloaded Study Materials */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Popular Study Materials
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Highest download volume across campus
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className="text-xs font-bold text-lpu-600 dark:text-orange-400 hover:text-lpu-700 dark:hover:text-orange-300 flex items-center gap-1"
                  >
                    Manage ({materials.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Title & Subject</th>
                        <th className="py-2.5 px-4">Year</th>
                        <th className="py-2.5 px-4 text-right">Downloads</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {materials.length > 0 ? (
                        [...materials]
                          .sort((a, b) => b.download_count - a.download_count)
                          .slice(0, 5)
                          .map((mat) => (
                            <tr key={mat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                              <td className="py-2.5 px-4">
                                <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{mat.title}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  {mat.subject_code} • {mat.material_type}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                  {formatYearName(mat.year)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white text-xs">
                                {mat.download_count}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No study materials available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MATERIALS MANAGEMENT                                  */}
        {/* ============================================================ */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-lpu-600 dark:text-orange-400" />
                  Study Materials Bank
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search, filter, update, replace documents, or remove items across 1st to 4th Year curricula.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="btn py-2.5 px-5 rounded-full text-xs font-bold shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
              >
                <PlusCircle className="sparkle w-4 h-4 text-orange-500" />
                <span className="text">+ Upload New Material</span>
              </button>
            </div>

            <AdminMaterialsTable
              materials={materials}
              loading={loading}
              onEdit={(mat) => {
                setEditingMaterial(mat);
                setEditFile(null);
              }}
              onDelete={(mat) => requestDeleteMaterial(mat.id, mat.title)}
              onUploadClick={() => setActiveTab('upload')}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: UPLOAD MATERIAL                                       */}
        {/* ============================================================ */}
        {activeTab === 'upload' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md p-6 sm:p-10 max-w-2xl mx-auto">
            <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-lpu-600 dark:text-orange-400" />
                Upload New Study Material
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add verified subject notes, mid-term papers, end-term papers, or PYQs organized strictly year-wise.
              </p>
            </div>

            {uploadMessage && (
              <div
                className={`p-4 rounded-xl mb-6 text-xs font-bold ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : uploadMessage.type === 'info'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {uploadMessage.text}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              
              {/* Year Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year *
                </label>
                <select
                  value={uploadYear}
                  onChange={(e) => setUploadYear(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                  required
                >
                  <option value={1}>1st Year (Freshmen)</option>
                  <option value={2}>2nd Year (Core Department)</option>
                  <option value={3}>3rd Year (Specialization)</option>
                  <option value={4}>4th Year (Capstone & Placements)</option>
                </select>
              </div>

              {/* Subject Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    placeholder="e.g. Programming in C"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    value={uploadSubjectCode}
                    onChange={(e) => setUploadSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CSE101"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                    required
                  />
                </div>
              </div>

              {/* Material Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Material Type *
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                  required
                >
                  <option value="Notes">📚 Notes (Theory, slides, handwritten)</option>
                  <option value="Mid-Term">📝 Mid-Term Papers (Solved exam sets)</option>
                  <option value="End-Term">📕 End-Term Papers (Final term solutions)</option>
                  <option value="PYQs">📄 Previous Year Questions (PYQs bank)</option>
                  <option value="Other">Other Academic Resource</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 1 to 4 Complete Notes with Solved Programs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                  required
                />
                {deleteSameNameOnUpload && existingSameNameMatch && (
                  <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      Notice: Existing material &quot;{existingSameNameMatch.title}&quot; found in {existingSameNameMatch.subject_code} ({formatYearName(existingSameNameMatch.year)}). It will be automatically deleted and replaced upon upload.
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Highlights
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  placeholder="Key concepts covered, unit breakdowns, exam relevance..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-lpu-500"
                />
              </div>

              {/* Option: Delete Files with Same Name When Uploaded */}
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-start justify-between gap-4 transition-all shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    deleteSameNameOnUpload ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Delete Files with Same Name When Uploaded
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        deleteSameNameOnUpload ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {deleteSameNameOnUpload ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      If a study material or document with the same name already exists in this subject, automatically delete the old version to prevent duplicate files in the library.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={deleteSameNameOnUpload}
                  onClick={() => setDeleteSameNameOnUpload(!deleteSameNameOnUpload)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    deleteSameNameOnUpload ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      deleteSameNameOnUpload ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Resource Source Selector: Upload Files vs Paste Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Choose Material Source <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setResourceMode('file')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      resourceMode === 'file'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-lpu-600 dark:text-orange-400" />
                    <span>Upload File / Multi-Page Images</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResourceMode('link')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      resourceMode === 'link'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Paste Resource Link (URL)</span>
                  </button>
                </div>
              </div>

              {/* Resource Content: Link Mode vs File Upload Mode */}
              {resourceMode === 'link' ? (
                /* Link Mode Input Card */
                <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/10 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 space-y-4">
                  {/* Header & Mode Switcher for Single vs Multiple Links */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80 dark:border-amber-800/60">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                        <LinkIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="block text-xs font-black text-slate-900 dark:text-white">
                            {isMultiLink ? 'Upload Multiple Links at Once' : 'Resource URL / Cloud Link'} <span className="text-rose-500">*</span>
                          </label>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isMultiLink ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {isMultiLink ? 'Multi-Link Mode Active' : 'Single Link Mode'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {isMultiLink
                            ? 'Paste multiple Google Drive or cloud URLs (separated by newlines, commas, or spaces).'
                            : 'Paste a Google Drive view link, OneDrive, Dropbox, Notion, or external study document.'}
                        </p>
                      </div>
                    </div>

                    {/* Mode Selector Pill Buttons & Switch */}
                    <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800 border border-amber-200/90 dark:border-amber-800/60 rounded-2xl p-1.5 shrink-0 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setIsMultiLink(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          !isMultiLink
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Single Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMultiLink(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isMultiLink
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Multiple Links
                      </button>
                    </div>
                  </div>

                  {!isMultiLink ? (
                    /* Single Link Input */
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="url"
                          value={resourceLink}
                          onChange={(e) => {
                            const val = e.target.value;
                            const detected = extractValidUrls(val);
                            if (detected.length > 1 || val.includes('\n') || val.includes('\r')) {
                              setIsMultiLink(true);
                              setMultiLinksText(val);
                              setResourceLink('');
                              setUploadMessage({
                                type: 'info',
                                text: `⚡ Detected ${detected.length || 'multiple'} links! Automatically switched to Multiple Links mode.`,
                              });
                            } else {
                              setResourceLink(val);
                            }
                          }}
                          placeholder="e.g. https://drive.google.com/file/d/1a2b3c.../view?usp=sharing"
                          className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                          required={resourceMode === 'link' && !isMultiLink}
                        />
                        {resourceLink && (
                          <button
                            type="button"
                            onClick={() => setResourceLink('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Smart Link Recognition Badge */}
                      {resourceLink.trim() && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {resourceLink.includes('drive.google.com') ? (
                            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Google Drive Link Detected — Embedded preview is fully enabled for students!
                            </span>
                          ) : resourceLink.includes('onedrive') || resourceLink.includes('1drv.ms') ? (
                            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              OneDrive Cloud Resource Detected
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl flex items-center gap-1.5">
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              External Study Link Resource
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        💡 Tip: You can also paste multiple links at once into this box — it will automatically switch to Multiple Links mode.
                      </p>
                    </div>
                  ) : (
                    /* Multiple Links Input Area */
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Paste Links (One per line or separated by spaces/commas) <span className="text-rose-500">*</span>
                          </label>
                          {multiLinksText.trim() && (
                            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              {extractValidUrls(multiLinksText).length} valid link(s) detected
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={4}
                          value={multiLinksText}
                          onChange={(e) => setMultiLinksText(e.target.value)}
                          placeholder={"https://drive.google.com/file/d/1A2B3C.../view\nhttps://drive.google.com/file/d/4D5E6F.../view\nhttps://example.com/notes-part3.pdf"}
                          className="w-full p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs leading-relaxed"
                          required={resourceMode === 'link' && isMultiLink}
                        />
                      </div>

                      {/* Live Badge Preview of Detected Links */}
                      {(() => {
                        const validLinks = extractValidUrls(multiLinksText);
                        if (validLinks.length === 0) return null;
                        return (
                          <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 rounded-2xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-950 dark:text-amber-200">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Detected Links Preview ({validLinks.length}):
                              </span>
                              <button
                                type="button"
                                onClick={() => setMultiLinksText('')}
                                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                              {validLinks.map((lnk, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-xs shadow-2xs">
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-md shrink-0">
                                      Part {idx + 1}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">{lnk}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                       const remaining = validLinks.filter((_, i) => i !== idx);
                                       setMultiLinksText(remaining.join('\n'));
                                    }}
                                    className="text-slate-400 hover:text-rose-500 p-0.5 ml-2 shrink-0 transition-colors"
                                    title="Remove this link"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Processing Mode for Multiple Links */}
                      <div className="bg-white/90 dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-3.5">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-2">
                          How should these {extractValidUrls(multiLinksText).length || ''} links be published?
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setMultiLinkProcessingMode('bundle')}
                            className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                              multiLinkProcessingMode === 'bundle'
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              multiLinkProcessingMode === 'bundle' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">1 Card with Multi-File Switcher</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Clubs all links into a single card with Part 1, Part 2 tabs (recommended for multi-part notes)
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMultiLinkProcessingMode('batch')}
                            className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                              multiLinkProcessingMode === 'batch'
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              multiLinkProcessingMode === 'batch' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              <Upload className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">Separate Cards for Each Link</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Publishes each link as an individual library card with its own title
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* File Upload with Drag & Drop & Multi-Image Clubbing */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Upload Study Documents (PDF, JPG, PNG, WEBP, DOCX) <span className="text-rose-500">*</span>
                    </label>
                    {clubbedImages.length > 0 && (
                      <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        {multiPdfMode === 'merge' ? '📑 Auto-merging into 1 PDF' : multiPdfMode === 'bundle' ? '🗂️ Bundling as Multi-File Document' : '📦 Batch Uploading as Separate Cards'}
                      </span>
                    )}
                  </div>

                  {clubbedImages.length > 0 ? (
                    /* Multi-Document Queue View (Handles multiple PDFs, images, or mixed) */
                    <div className="border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl p-4 sm:p-5 space-y-4 transition-all shadow-sm">
                      {/* Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-800/60">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black shadow-md ${
                            multiPdfMode === 'bundle'
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'
                              : multiPdfMode === 'batch'
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                              : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-orange-500/20'
                          }`}>
                            {multiPdfMode === 'bundle' ? (
                              <FolderOpen className="w-5 h-5" />
                            ) : multiPdfMode === 'batch' ? (
                              <Upload className="w-5 h-5" />
                            ) : (
                              <Layers className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {clubbedImages.length} {clubbedImages.length === 1 ? 'Document Selected' : 'Documents Selected'}
                              </span>
                              <span className="bg-gradient-to-r from-lpu-600 to-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                {clubbedImages.filter(i => i.type === 'pdf').length} PDF{clubbedImages.filter(i => i.type === 'pdf').length === 1 ? '' : 's'}
                                {clubbedImages.filter(i => i.type === 'image').length > 0 && ` • ${clubbedImages.filter(i => i.type === 'image').length} Images`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {multiPdfMode === 'merge'
                                ? `All ${clubbedImages.length} files will be merged into 1 continuous PDF in the order shown below.`
                                : multiPdfMode === 'bundle'
                                ? `Files will remain separate under 1 library entry with a tab switcher for students in the document viewer.`
                                : `Each of the ${clubbedImages.length} files will be published as its own separate study material card.`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <label
                            htmlFor="addMoreImagesInput"
                            className="cursor-pointer px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-lpu-500 hover:text-lpu-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 text-lpu-600" />
                            Add More Files
                          </label>
                          <input
                            type="file"
                            id="addMoreImagesInput"
                            accept=".pdf,.zip,.rar,.7z,.tar,.gz,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) handleIncomingFiles(e.target.files);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                          {duplicateNameGroups.length > 0 && (
                            <button
                              type="button"
                              onClick={removeDuplicateFilesFromQueue}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                              title="Delete duplicate files with same name from this queue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Duplicates ({duplicateNameGroups.length})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={clearClubbedPages}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 text-xs font-bold transition-all flex items-center gap-1"
                            title="Remove all files"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Multi-Document Strategy Switcher (When 2 or more files are selected) */}
                      {clubbedImages.length > 1 && (
                        <div className="bg-white/90 dark:bg-slate-800 p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Multi-File Strategy:
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Choose how these {clubbedImages.length} files should be organized and viewed by students:
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => setMultiPdfMode('merge')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                multiPdfMode === 'merge'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title="Stitch all files into one single PDF document"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Merge into 1 PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => setMultiPdfMode('bundle')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                multiPdfMode === 'bundle'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title="Keep separate files under one card with an interactive part switcher in the viewer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Bundle (Viewer Tabs)
                            </button>
                            <button
                              type="button"
                              onClick={() => setMultiPdfMode('batch')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                multiPdfMode === 'batch'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                              title="Upload each file as a separate study material card"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Batch Upload ({clubbedImages.length})
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Duplicate Files in Queue Alert Banner */}
                      {duplicateNameGroups.length > 0 && (
                        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              <strong>{duplicateNameGroups.length} file name(s)</strong> have duplicate copies in this upload list ({duplicateNameGroups.map(([name, count]) => `"${name}" [${count}x]`).slice(0, 3).join(', ')}).
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={removeDuplicateFilesFromQueue}
                            className="self-start sm:self-auto px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Duplicate Copies</span>
                          </button>
                        </div>
                      )}

                      {/* Files / Pages List */}
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {clubbedImages.map((item, idx) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:border-amber-300 rounded-xl transition-all shadow-xs group"
                          >
                            {/* Mini Thumbnail or PDF Icon */}
                            <div className="relative w-12 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              {item.type === 'pdf' ? (
                                <div className="w-full h-full bg-rose-50 dark:bg-rose-950/50 flex flex-col items-center justify-center text-rose-600 dark:text-rose-400">
                                  <FileText className="w-5 h-5" />
                                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">PDF</span>
                                </div>
                              ) : item.previewUrl ? (
                                <img
                                  src={item.previewUrl}
                                  alt={`Item ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-slate-400" />
                              )}
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[9px] font-black text-white text-center py-0.5">
                                #{idx + 1}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                  {item.type === 'pdf' ? `File ${idx + 1}: ` : `Page ${idx + 1}: `}
                                  {item.name}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  item.type === 'pdf' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                }`}>
                                  {item.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  {(item.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                              </div>
                            </div>

                            {/* Page Reorder & Delete Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePage(idx, 'up')}
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-lpu-600 hover:border-lpu-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Move up in order"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === clubbedImages.length - 1}
                                onClick={() => movePage(idx, 'down')}
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-lpu-600 hover:border-lpu-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Move down in order"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removePage(idx)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 text-rose-500 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors ml-1"
                                title="Remove file"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Secondary Drop Target for Adding More Files */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files) handleIncomingFiles(e.dataTransfer.files);
                        }}
                        onClick={() => document.getElementById('addMoreImagesInput')?.click()}
                        className="p-3 border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 hover:bg-amber-100/40 rounded-xl text-center cursor-pointer transition-all"
                      >
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-lpu-600" />
                          Drag &amp; drop more PDF files or image pages here or click to add
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Standard Drop Zone (Accepts single or multiple PDFs/images) */
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setIsDraggingFile(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleIncomingFiles(e.dataTransfer.files);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                        isDraggingFile
                          ? 'border-lpu-500 bg-orange-50/80 dark:bg-orange-950/30 scale-[1.01] shadow-lg shadow-orange-500/10'
                          : uploadFile
                          ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500'
                          : 'border-slate-300 dark:border-slate-700 hover:border-lpu-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="file"
                        id="pdfUploadInput"
                        accept=".pdf,.zip,.rar,.7z,.tar,.gz,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,image/*"
                        multiple
                        required={resourceMode === 'file' && !uploadFile && clubbedImages.length === 0}
                        onChange={(e) => {
                          if (e.target.files) handleIncomingFiles(e.target.files);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="pdfUploadInput" className="cursor-pointer flex flex-col items-center select-none">
                        {isDraggingFile ? (
                          <>
                            <Upload className="w-10 h-10 text-lpu-600 animate-bounce mb-2" />
                            <span className="text-sm font-extrabold text-lpu-700 dark:text-orange-400">
                              Drop file(s) here to upload
                            </span>
                            <span className="text-[11px] text-orange-600 dark:text-orange-300 font-semibold mt-1">
                              Release to upload PDF, ZIP archives, PPT presentations, or notes
                            </span>
                          </>
                        ) : uploadFile ? (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 break-all max-w-md">
                              {uploadFile.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                                {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                • Click or drag another file to add or replace
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-2 group-hover:bg-orange-50 group-hover:text-lpu-600 transition-colors">
                              <Upload className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              <strong className="text-lpu-600 dark:text-orange-400 hover:underline">Choose file(s)</strong> or drag &amp; drop here
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                              Upload <strong>PDFs</strong>, <strong>ZIP / RAR Archives</strong>, <strong>PowerPoint Slides (.pptx)</strong>, or <strong>Images</strong>
                            </span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-2.5 py-1 rounded-full mt-2 inline-flex items-center gap-1">
                              <Layers className="w-3 h-3 text-amber-600" />
                              Supports PDFs, ZIP/RAR bundles, PPT slides, Word docs &amp; multiple images
                            </span>
                          </>
                        )}
                      </label>
                      {uploadFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadFile(null);
                            const input = document.getElementById('pdfUploadInput') as HTMLInputElement;
                            if (input) input.value = '';
                          }}
                          className="mt-3 text-[11px] text-rose-500 hover:text-rose-700 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Remove file
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Upload & Merge Progress Indicator */}
              {(uploading || isMergingImages) && (
                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-lpu-600 border-t-transparent rounded-full animate-spin" />
                      {uploadStage || (isMergingImages ? 'Merging pages into 1 PDF...' : 'Uploading to Google Drive...')}
                    </span>
                    <span className="font-mono text-lpu-600 dark:text-orange-400">
                      {isMergingImages ? 'Generating PDF' : `${uploadProgress}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-lpu-600 to-amber-500 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(5, isMergingImages ? 100 : uploadProgress)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {isMergingImages
                      ? 'Combining and formatting multiple note images into a high-quality multi-page PDF...'
                      : 'Streaming directly from browser to Google Drive API. Avoid closing this tab during upload.'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || isMergingImages}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-lpu-600 to-amber-500 hover:from-lpu-700 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
              >
                {isMergingImages ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Merging Documents into 1 PDF...
                  </>
                ) : uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {uploadProgress > 0 ? `Uploading (${uploadProgress}%)...` : 'Connecting to Google Drive...'}
                  </>
                ) : resourceMode === 'link' ? (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Publish Resource Link to Study Library
                  </>
                ) : clubbedImages.length > 1 ? (
                  multiPdfMode === 'bundle' ? (
                    <>
                      <FolderOpen className="w-4 h-4" />
                      Bundle {clubbedImages.length} Files &amp; Publish with Multi-Part Viewer
                    </>
                  ) : multiPdfMode === 'batch' ? (
                    <>
                      <Upload className="w-4 h-4" />
                      Batch Upload {clubbedImages.length} Documents to Study Library
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      Merge {clubbedImages.length} Files into 1 PDF &amp; Publish
                    </>
                  )
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Publish to Study Library
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: USERS & TELEMETRY                                     */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-lpu-600 dark:text-orange-400" />
                  Student Activity & Access Control
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time telemetry, Google authentication details, and community access status.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
                {users.length} Total Users Registered
              </span>
            </div>

            <AdminUsersTable
              users={users}
              loading={loading}
              onApprove={(u) => requestApproveIndividualUser(u)}
              onRevoke={(u) => requestRevokeIndividualUser(u)}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: WHATSAPP COMMUNITY LINKS                              */}
        {/* ============================================================ */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Approved WhatsApp Invite Links
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage the verified invite links students submit during one-time Community Verification.
                </p>
              </div>
              <button
                onClick={() => {
                  setLinkError('');
                  setShowAddLinkModal(true);
                }}
                className="btn py-2.5 px-5 rounded-full text-xs font-bold shadow-xs flex items-center justify-center gap-2 group cursor-pointer"
              >
                <PlusCircle className="sparkle w-4 h-4 text-emerald-500" />
                <span className="text">+ Add Verification Link</span>
              </button>
            </div>

            <AdminLinksTable
              links={links}
              loading={loading}
              onAddClick={() => {
                setLinkError('');
                setShowAddLinkModal(true);
              }}
              onToggleActive={(link) => handleToggleLinkActive(link)}
              onRevokeUsers={(link) => requestRevokeUsersForLink(link)}
              onDelete={(link) => requestDeleteLink(link)}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: DOWNLOADS & ANALYTICS                                 */}
        {/* ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-lpu-600 dark:text-orange-400" />
                  Downloads & Curricular Analytics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real download volume distribution across academic years and material formats.
                </p>
              </div>

              <button
                onClick={loadAnalytics}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Analytics</span>
              </button>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Year Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-lpu-600 dark:text-orange-400" />
                    Downloads by Academic Year
                  </h3>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Total: {Object.values(analytics?.downloadsByYear || {}).reduce((a, b) => a + b, 0)}
                  </span>
                </div>

                <div className="space-y-3">
                  {[1, 2, 3, 4].map((year) => {
                    const count = analytics?.downloadsByYear?.[year] || 0;
                    const total = Object.values(analytics?.downloadsByYear || {}).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <div key={year} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{formatYearName(year)}</span>
                          <span className="font-mono text-slate-900 dark:text-white">{count} downloads ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-lpu-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Material Type Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Downloads by Material Type
                  </h3>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Total: {Object.values(analytics?.downloadsByType || {}).reduce((a, b) => a + b, 0)}
                  </span>
                </div>

                <div className="space-y-3">
                  {['Notes', 'Mid-Term', 'End-Term', 'PYQs'].map((type) => {
                    const count = analytics?.downloadsByType?.[type] || 0;
                    const total = Object.values(analytics?.downloadsByType || {}).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{type}</span>
                          <span className="font-mono text-slate-900 dark:text-white">{count} downloads ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Recent Downloads Feed */}
            <div className="space-y-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Recent Verified File Downloads
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Audit trail of files opened by students
                </p>
              </div>

              <AdminAnalyticsTable
                downloads={analytics?.recentDownloads || []}
                loading={!analytics}
                onRefresh={loadAnalytics}
              />
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: PLATFORM SETTINGS & GLOBAL DOCUMENT ACCESS CONTROL     */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-lpu-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Platform Settings
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure global system behavior, document reading rules, and student permissions.
              </p>
            </div>

            {settingsMessage && (
              <div
                className={`p-4 rounded-xl text-xs font-bold transition-all ${
                  settingsMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {settingsMessage.text}
              </div>
            )}

            {/* Document Access Mode Setting Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Document Access Mode
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      allowUserDownloads
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    }`}>
                      {allowUserDownloads ? 'Downloads Allowed' : 'Preview Only'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Control whether students can save document files locally or are restricted to reading them exclusively inside the embedded viewer.
                  </p>
                </div>

                {/* Primary Toggle Switch */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
                    {allowUserDownloads ? 'Downloads ON' : 'Preview Only'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowUserDownloads}
                    disabled={updatingSettings || settingsLoading}
                    onClick={() => handleToggleDownloads(!allowUserDownloads)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-lpu-500 focus:ring-offset-2 disabled:opacity-50 ${
                      allowUserDownloads ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        allowUserDownloads ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Allow Downloads */}
                <div 
                  onClick={() => !updatingSettings && handleToggleDownloads(true)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    allowUserDownloads 
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <DownloadCloud className={`w-4 h-4 ${allowUserDownloads ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      Allow Downloads (Open Mode)
                    </span>
                    {allowUserDownloads && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Authenticated students can <strong className="text-slate-900 dark:text-white">Preview</strong>, open in <strong className="text-slate-900 dark:text-white">Fullscreen</strong>, and <strong className="text-slate-900 dark:text-white">Download</strong> documents.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                    Buttons shown: [ Preview ] [ Download ]
                  </div>
                </div>

                {/* Option 2: Preview Only */}
                <div 
                  onClick={() => !updatingSettings && handleToggleDownloads(false)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    !allowUserDownloads 
                      ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Eye className={`w-4 h-4 ${!allowUserDownloads ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                      Preview Only (Protected Mode)
                    </span>
                    {!allowUserDownloads && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Students can <strong className="text-slate-900 dark:text-white">Preview</strong>, <strong className="text-slate-900 dark:text-white">Zoom</strong>, and <strong className="text-slate-900 dark:text-white">Fullscreen</strong> documents. Direct file downloads are blocked by server security.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                    Buttons shown: [ Preview Document ]
                  </div>
                </div>
              </div>

              {/* Administrative Notice */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Administrator Immunity: </strong>
                  Platform Owners and Admins (<code className="text-slate-800 dark:text-slate-200 font-mono">mishra.rajvansh11@gmail.com</code> and authorized staff) can <strong className="text-slate-900 dark:text-white">ALWAYS</strong> download documents regardless of this setting.
                </div>
              </div>
            </div>

            {/* Global Community Verification Setting Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Global Community Verification
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      requireCommunityVerification
                        ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {requireCommunityVerification ? 'Verification Required' : 'Open Access'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Control whether students must complete the community verification check before accessing study materials and the library.
                  </p>
                </div>

                {/* Primary Toggle Switch */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline">
                    {requireCommunityVerification ? 'Verification ON' : 'Verification OFF'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requireCommunityVerification}
                    disabled={updatingSettings || settingsLoading}
                    onClick={() => handleToggleCommunityVerification(!requireCommunityVerification)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-lpu-500 focus:ring-offset-2 disabled:opacity-50 ${
                      requireCommunityVerification ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        requireCommunityVerification ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Enforced Mode */}
                <div 
                  onClick={() => !updatingSettings && handleToggleCommunityVerification(true)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    requireCommunityVerification 
                      ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/30' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className={`w-4 h-4 ${requireCommunityVerification ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
                      Enforced Mode (Verification Required)
                    </span>
                    {requireCommunityVerification && (
                      <CheckCircle2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Students <strong className="text-slate-900 dark:text-white">MUST</strong> complete WhatsApp/Community verification to access the Study Library and materials. Unverified students are redirected to verify.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                    Access Gate: Active (Full Verification)
                  </div>
                </div>

                {/* Option 2: Open Access Mode */}
                <div 
                  onClick={() => !updatingSettings && handleToggleCommunityVerification(false)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    !requireCommunityVerification 
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className={`w-4 h-4 ${!requireCommunityVerification ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      Open Access Mode (Verification Bypassed)
                    </span>
                    {!requireCommunityVerification && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Any student signed in can browse and access all study materials immediately <strong className="text-slate-900 dark:text-white">without</strong> community verification.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                    Access Gate: Bypassed for Signed-in Students
                  </div>
                </div>
              </div>

              {/* Data Safety / Preservation Rule Notice */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white">Data Preservation & Security: </strong>
                  Unverified students who access materials when verification is turned <strong className="text-slate-900 dark:text-white">OFF</strong> are <strong className="text-slate-900 dark:text-white">NOT</strong> permanently marked verified in the database. When you turn verification back <strong className="text-slate-900 dark:text-white">ON</strong>, they must complete verification to continue accessing materials. Existing verified students remain untouched.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: ADMIN MANAGEMENT (OWNER ONLY)                         */}
        {/* ============================================================ */}
        {activeTab === 'admin-settings' && currentUser?.isOwner && (
          <div className="space-y-6 max-w-4xl">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Administrator Role Management
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Restricted Owner Console • Grant or revoke administrative access to the Campus Connect control panel.
              </p>
            </div>

            {adminMgmtMsg && (
              <div
                className={`p-4 rounded-xl text-xs font-bold ${
                  adminMgmtMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {adminMgmtMsg.text}
              </div>
            )}

            {/* Add Admin Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Authorize New Administrator
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Enter the Google account email of the person you want to grant administrator access.
              </p>

              <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin.student@lpu.in or gmail..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />

                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-500 text-slate-700 dark:text-slate-200"
                >
                  <option value="admin">Administrator (Materials & Users)</option>
                  <option value="owner">Owner (Full Privileges)</option>
                </select>

                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-60 whitespace-nowrap"
                >
                  {addingAdmin ? 'Authorizing...' : '+ Grant Role'}
                </button>
              </form>
            </div>

            {/* Admins Roster Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Active Administrative Roster
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Accounts permitted to access /admin and modify platform content
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {admins.length} Admins
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-5">Admin Email</th>
                      <th className="py-3 px-5">Role Assigned</th>
                      <th className="py-3 px-5">Date Granted</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {admins.map((adm) => {
                      const isMainOwner = adm.email.toLowerCase() === 'mishra.rajvansh11@gmail.com';

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">
                            {adm.email}
                            {isMainOwner && (
                              <span className="ml-2 text-[10px] text-amber-700 dark:text-amber-300 font-sans font-bold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                                Primary Owner
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            {adm.role === 'owner' ? (
                              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                                Owner
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                                Admin
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">
                            {new Date(adm.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {isMainOwner ? (
                              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 italic">
                                Permanent (Protected)
                              </span>
                            ) : (
                              <button
                                onClick={() => requestRemoveAdmin(adm)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors border border-rose-200 dark:border-rose-800"
                              >
                                Revoke Role
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 8: GOOGLE DRIVE MIGRATION & AUTOMATED SYNC               */}
        {/* ============================================================ */}
        {activeTab === 'drive-sync' && (
          <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <HardDrive className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Google Drive Migration &amp; Automated Sync
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recursive folder scanner, metadata matcher, and automated zero-downtime migration engine for Google Drive.
                </p>
              </div>

              <button
                onClick={loadMigrationStats}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Refresh Telemetry</span>
              </button>
            </div>

            {/* Notification message */}
            {migrationMessage && (
              <div
                className={`p-4 rounded-xl text-xs font-bold transition-all ${
                  migrationMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {migrationMessage.text}
              </div>
            )}

            {/* Rollback Snapshot Notice */}
            {migrationStats?.hasRollbackSnapshot && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                      Rollback Snapshot Available
                    </h4>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      A pre-migration restore snapshot was saved on{' '}
                      <strong>
                        {migrationStats.rollbackSnapshotDate
                          ? new Date(migrationStats.rollbackSnapshotDate).toLocaleString()
                          : 'Previous Migration'}
                      </strong>
                      . You can reverse changes at any time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRollbackMigration}
                  disabled={rollingBack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-xl transition-colors shrink-0 shadow-2xs disabled:opacity-60"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${rollingBack ? 'animate-spin' : ''}`} />
                  <span>{rollingBack ? 'Restoring Snapshot...' : 'Rollback Migration'}</span>
                </button>
              </div>
            )}

            {/* Telemetry Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Materials</span>
                  <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {migrationStats?.totalMaterials ?? materials.length}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Total library items in Supabase</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Google Drive Files</span>
                  <HardDrive className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                </div>
                <div className="text-2xl font-black text-sky-900 dark:text-sky-300">
                  {migrationStats?.driveMaterials ?? 0}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Single files mapped to Google Drive</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Multi-File Bundles</span>
                  <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300">
                  {migrationStats?.bundleMaterials ?? 0}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Bundled documents with multiple parts</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">External Links</span>
                  <LinkIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {migrationStats?.externalUrlMaterials ?? 0}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Web URLs unaffected by migration</p>
              </div>
            </div>

            {/* Migration Scanner & Dry Run Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Automated Folder Scanner &amp; Matcher
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Enter a Google Drive folder ID to scan recursively. The scanner will crawl subfolders, identify files, and fuzzy/exact match them to existing library materials by filename, subject code, academic year, and bundled document titles.
                </p>
              </div>

              <form onSubmit={handleRunDryRun} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Google Drive Folder ID (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={migrationFolderId}
                      onChange={(e) => setMigrationFolderId(e.target.value)}
                      placeholder="Leave blank to use default configured Drive folder, or paste a new Folder ID"
                      className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={migrationScanning}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs disabled:opacity-60 shrink-0"
                    >
                      <Search className={`w-3.5 h-3.5 ${migrationScanning ? 'animate-spin' : ''}`} />
                      <span>{migrationScanning ? 'Scanning Drive...' : 'Run Dry-Run Scan'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    Tip: You can extract the Folder ID from any Google Drive link: <code className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong></code>
                  </p>
                </div>
              </form>

              {/* Safety Assurances */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Non-Destructive Dry Run</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dry-runs are 100% read-only. Nothing on Google Drive or Supabase is touched until you confirm.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Bundled File Support</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically traverses and updates individual parts inside multi-file study bundles.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Automatic Rollback Snapshot</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Every applied migration takes an automatic database snapshot for instant one-click reversal.
                  </p>
                </div>
              </div>
            </div>

            {/* Dry Run Report & Match Table */}
            {migrationReport && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Dry-Run Scan Results ({migrationReport.matches.length} Matches Found)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scanned {migrationReport.totalDriveFilesScanned} files across Drive folders. Found {migrationReport.matches.length} matches for existing library materials.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMigrationReport(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteMigration}
                      disabled={migrating || migrationReport.matches.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{migrating ? 'Applying Changes...' : `Apply Migration (${migrationReport.matches.length} Records)`}</span>
                    </button>
                  </div>
                </div>

                {/* Match Table */}
                {migrationReport.matches.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Material Title</th>
                          <th className="py-2.5 px-3">Subject &amp; Year</th>
                          <th className="py-2.5 px-3">Current File ID</th>
                          <th className="py-2.5 px-3">Target Drive File ID</th>
                          <th className="py-2.5 px-3">Match Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {migrationReport.matches.map((m: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                              {m.materialTitle}
                              {m.isBundlePart && (
                                <span className="ml-1.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                  Part {m.bundleIndex + 1}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.subjectCode}</span>
                              <span className="text-slate-400 dark:text-slate-500 ml-1">({formatYearName(m.year)})</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate" title={m.oldDriveFileId}>
                              {m.oldDriveFileId || 'None (New Map)'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold max-w-[150px] truncate" title={m.newDriveFileId}>
                              {m.newDriveFileId}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.confidence === 'exact'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300'
                              }`}>
                                {m.confidence.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                    No matching files found between the target Google Drive folder and existing Supabase materials.
                  </div>
                )}

                {/* Unmatched materials notice if any */}
                {migrationReport.unmatchedMaterials?.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-white">
                      {migrationReport.unmatchedMaterials.length} materials were not matched:
                    </span>{' '}
                    These items have external URLs or different filenames and will remain completely untouched.
                  </div>
                )}
              </div>
            )}

            {/* Step-by-Step Architecture Guide Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm tracking-wide uppercase text-slate-200">
                  Future Google Drive Migration Guide
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you are ready to migrate materials to another Google Drive, Workspace account, or Shared Drive, follow these 4 simple steps with zero manual copy-pasting:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">1</span>
                    Share New Folder with Service Account
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Copy all files/folders to the new Google Drive, then share the root folder with your service account email with &quot;Viewer&quot; or &quot;Editor&quot; permissions.
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">2</span>
                    Input Target Folder ID &amp; Scan
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Paste the new folder ID into the scanner above and click &quot;Run Dry-Run Scan&quot;. The recursive crawler will match all subfolders and files automatically.
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">3</span>
                    Review Dry-Run Diff Preview
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Inspect the diff table above showing old Google Drive IDs side-by-side with the new Drive IDs and match confidence badges.
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
                  <div className="font-bold text-sky-300 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">4</span>
                    Apply with Automated Rollback Safety
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Click &quot;Apply Migration&quot;. All Supabase records and bundled parts are updated instantly. An automatic snapshot is saved in case you ever want to rollback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: ANNOUNCEMENTS MANAGEMENT                                */}
        {/* ============================================================ */}
        {activeTab === 'announcements' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-amber-500" />
                  Campus Broadcast Announcements
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Publish notices, exam announcements, or system alerts visible to all students on their dashboards.
                </p>
              </div>

              <button
                type="button"
                onClick={loadAnnouncements}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Announcements</span>
              </button>
            </div>

            {/* Broadcast Creation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">Create New Broadcast Announcement</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Visible immediately to students upon publish</p>
                </div>
              </div>

              {announcementError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{announcementError}</span>
                </div>
              )}

              {announcementSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{announcementSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Announcement Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="e.g. End-Term PYQs & Solutions Added for CSE 2nd Year"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-lpu-500 focus:ring-2 focus:ring-lpu-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Announcement Category
                    </label>
                    <select
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-lpu-500"
                    >
                      <option value="announcement">General Announcement</option>
                      <option value="important">🚨 Important Alert</option>
                      <option value="update">✨ Platform Update</option>
                      <option value="new_material">📚 New Study Material</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Announcement Message / Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={announcementDesc}
                    onChange={(e) => setAnnouncementDesc(e.target.value)}
                    placeholder="Provide details for students, examination instructions, or newly available subject resources..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-lpu-500 focus:ring-2 focus:ring-lpu-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Action Link / URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={announcementLink}
                    onChange={(e) => setAnnouncementLink(e.target.value)}
                    placeholder="https://... or /library?subject=CSE101"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-lpu-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={creatingAnnouncement}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>{creatingAnnouncement ? 'Broadcasting...' : 'Publish Announcement to Students'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Announcements List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                  Active & Historical Announcements ({announcements.length})
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {announcements.filter(a => a.active !== false).length} currently active
                </span>
              </div>

              {loadingAnnouncements ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-6 h-6 border-2 border-lpu-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading announcements...
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        item.active !== false
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750'
                          : 'bg-slate-100/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.active !== false
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {item.active !== false ? '● Active' : 'Inactive'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {item.type || 'announcement'}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
                        {item.link && (
                          <div className="pt-1">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                            >
                              Target Link: <span className="underline max-w-xs truncate">{item.link}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAnnouncementActive(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            item.active !== false
                              ? 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {item.active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(item.id)}
                          className="p-1.5 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No announcements published yet. Create one above to broadcast to all student dashboards.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: STUDENT REQUESTS & BUGS                                 */}
        {/* ============================================================ */}
        {activeTab === 'feedback' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Student Requests &amp; Feedback
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage student requests for missing subject codes, examination materials, and reported platform bugs.
                </p>
              </div>

              <button
                type="button"
                onClick={loadFeedback}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Requests</span>
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Submissions</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{feedbackList.length}</div>
              </div>
              <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Missing Subject Requests</span>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                  {feedbackList.filter(f => f.type === 'missing_subject').length}
                </div>
              </div>
              <div className="bg-rose-50/60 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Bug Reports</span>
                <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
                  {feedbackList.filter(f => f.type === 'bug_report').length}
                </div>
              </div>
              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Pending Action</span>
                <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1">
                  {feedbackList.filter(f => f.status === 'pending').length}
                </div>
              </div>
            </div>

            {/* Filter and Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type:</span>
                  <select
                    value={feedbackTypeFilter}
                    onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="community_verification">📱 WhatsApp Verification Requests</option>
                    <option value="missing_subject">Missing Subject Requests</option>
                    <option value="bug_report">Bug Reports</option>
                  </select>

                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-2">Status:</span>
                  <select
                    value={feedbackStatusFilter}
                    onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing {
                    feedbackList.filter(f => 
                      (feedbackTypeFilter === 'all' || f.type === feedbackTypeFilter) &&
                      (feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter)
                    ).length
                  } records
                </span>
              </div>

              {loadingFeedback ? (
                <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-6 h-6 border-2 border-lpu-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading student requests...
                </div>
              ) : (
                (() => {
                  const filtered = feedbackList.filter(f => 
                    (feedbackTypeFilter === 'all' || f.type === feedbackTypeFilter) &&
                    (feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No feedback or requests matching the selected filters.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                item.type === 'community_verification'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : item.type === 'missing_subject'
                                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {item.type === 'community_verification'
                                  ? '📱 WhatsApp Verification'
                                  : item.type === 'missing_subject'
                                  ? '📚 Missing Subject'
                                  : '🐛 Bug Report'}
                              </span>

                              {item.subject_code && (
                                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-slate-900 dark:bg-slate-800 text-white border border-transparent dark:border-slate-700">
                                  {item.subject_code}
                                </span>
                              )}

                              {item.material_type && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {item.material_type}
                                </span>
                              )}

                              {item.year && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {formatYearName(item.year)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              {item.type === 'community_verification' && item.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveFeedbackVerification(item.id, item.user_name)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                  title="Approve student and immediately unlock library access"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve &amp; Verify
                                </button>
                              )}

                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value, item.admin_note || undefined)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                  item.status === 'resolved'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : item.status === 'unavailable'
                                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                    : item.status === 'in_progress'
                                    ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved (Approved)</option>
                                <option value="unavailable">Unavailable</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleDeleteFeedback(item.id)}
                                className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete submission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* WhatsApp Number badge & wa.me link */}
                          {item.whatsapp_number && (
                            <div className="flex items-center gap-2 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Student WhatsApp:</span>
                              <a
                                href={`https://wa.me/${item.whatsapp_number.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline flex items-center gap-1"
                                title="Open WhatsApp chat with student"
                              >
                                {item.whatsapp_number}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {/* Admin Response Note Box */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Response Note to Student (Shown on Student Dashboard)
                            </label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                defaultValue={item.admin_note || ''}
                                id={`note_input_${item.id}`}
                                placeholder={
                                  item.status === 'unavailable'
                                    ? "Reason why it cannot be arranged (e.g. syllabus revised, exam was online)..."
                                    : "e.g. Uploaded to Year 1 library, check CSE101..."
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateFeedbackStatus(item.id, item.status, (e.target as HTMLInputElement).value);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-lpu-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`note_input_${item.id}`) as HTMLInputElement;
                                  handleUpdateFeedbackStatus(item.id, item.status, el?.value || '');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs border border-transparent dark:border-slate-700"
                              >
                                Save Note
                              </button>
                            </div>
                            {item.admin_note && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                Active note to student: &ldquo;{item.admin_note}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{item.user_name || 'Anonymous Student'}</span>
                              {item.user_email && (
                                <span className="font-mono text-slate-500 dark:text-slate-400">({item.user_email})</span>
                              )}
                            </div>
                            <span>Submitted: {new Date(item.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODALS & OVERLAYS                                              */}
      {/* ============================================================== */}

      {/* 1. Add WhatsApp Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Add Approved WhatsApp Invite Link
              </h3>
              <button
                onClick={() => setShowAddLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {linkError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                {linkError}
              </div>
            )}

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link Name / Label *
                </label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g. Official Campus Connect Main Community"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Invite URL *
                </label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  The alphanumeric invite code will be automatically extracted and validated.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Type
                  </label>
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="community">Main Community</option>
                    <option value="freshers_group">Freshers Group</option>
                    <option value="other">Other Campus Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newLinkIsActive ? 'active' : 'disabled'}
                    onChange={(e) => setNewLinkIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">Active (Students Can Use)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLinkModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-60"
                >
                  {linkSubmitting ? 'Adding...' : 'Add Approved Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Material Modal with File Replacement */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Edit Study Material
              </h3>
              <button
                onClick={() => setEditingMaterial(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateMaterial} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={editingMaterial.title}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={editingMaterial.subject}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    value={editingMaterial.subject_code}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, subject_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Year</label>
                  <select
                    value={editingMaterial.year}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Material Type</label>
                  <select
                    value={editingMaterial.material_type}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, material_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                  >
                    <option value="Notes">Notes</option>
                    <option value="Mid-Term">Mid-Term</option>
                    <option value="End-Term">End-Term</option>
                    <option value="PYQs">PYQs</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={editingMaterial.description || ''}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                />
              </div>

              {/* Resource Content: Single Link vs Multi-File Bundle */}
              {editingMaterial.file_url?.trim().startsWith('[') ? (
                (() => {
                  let multiParts: Array<{ title?: string; name?: string; url?: string; size?: string }> = [];
                  try {
                    const parsed = JSON.parse(editingMaterial.file_url);
                    if (Array.isArray(parsed)) multiParts = parsed;
                  } catch {
                    multiParts = [];
                  }

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-white">
                          <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Bundled Multi-File Document ({multiParts.length} Files)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {editingMaterial.file_size}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {multiParts.map((part, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-white truncate">{part.title || part.name || `Part ${pIdx + 1}`}</span>
                              {part.size && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({part.size})</span>}
                            </div>
                            {part.url && (
                              <a
                                href={part.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-lpu-600 dark:hover:text-orange-400 p-1"
                                title="Open file in new tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        This study card contains {multiParts.length} files bundled together. You can update titles, academic year, and subject details above, or upload a new file below to replace it.
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resource URL / Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingMaterial.file_url}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, file_url: e.target.value })}
                      placeholder="https://drive.google.com/file/d/... or any link"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-lpu-500"
                    />
                    {editingMaterial.file_url?.startsWith('http') && (
                      <a
                        href={editingMaterial.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-lpu-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Open link in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    You can update the direct link here, or drag/select a new file below to upload and replace it.
                  </p>
                </div>
              )}

              {/* Replace Document File with Drag & Drop */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Replace File Document (Optional)
                </label>
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingEditFile(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDraggingEditFile(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingEditFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setEditFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border border-dashed rounded-xl p-3.5 text-center transition-all ${
                    isDraggingEditFile
                      ? 'border-lpu-500 bg-orange-50 dark:bg-orange-950/30'
                      : editFile
                      ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-lpu-500 dark:hover:border-orange-500'
                  }`}
                >
                  <input
                    type="file"
                    id="replaceFileInput"
                    accept=".pdf,.zip,.rar,.7z,.tar,.gz,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setEditFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <label htmlFor="replaceFileInput" className="cursor-pointer block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isDraggingEditFile ? (
                      <span className="text-lpu-600 dark:text-orange-400 font-bold">Drop replacement file here</span>
                    ) : editFile ? (
                      <span className="text-emerald-700 dark:text-emerald-400">{editFile.name} (Ready to replace)</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Click or drag &amp; drop to replace file (Current: {editingMaterial.file_size})</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingMaterial}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl disabled:opacity-60 border border-transparent dark:border-slate-700"
                >
                  {updatingMaterial ? 'Saving...' : 'Save & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Reusable Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">{confirmModal.title}</h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Confirmation Required</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={confirmModalSubmitting}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmModalSubmitting}
                onClick={async () => {
                  setConfirmModalSubmitting(true);
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setConfirmModalSubmitting(false);
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-lpu-600 hover:bg-lpu-700'
                }`}
              >
                {confirmModalSubmitting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
