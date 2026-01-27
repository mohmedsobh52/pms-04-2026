import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SearchItemType = 'page' | 'project' | 'action' | 'setting' | 'file';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  icon: string;
  href?: string;
  action?: () => void;
  keywords: string[];
}

export interface SearchResults {
  pages: SearchItem[];
  projects: SearchItem[];
  actions: SearchItem[];
  settings: SearchItem[];
}

// Static pages data
const staticPages: SearchItem[] = [
  {
    id: 'dashboard',
    type: 'page',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    icon: 'LayoutDashboard',
    href: '/dashboard',
    keywords: ['dashboard', 'لوحة', 'التحكم', 'home', 'الرئيسية'],
  },
  {
    id: 'home',
    type: 'page',
    label: 'Home',
    labelAr: 'الصفحة الرئيسية',
    icon: 'Home',
    href: '/',
    keywords: ['home', 'الرئيسية', 'start', 'بداية'],
  },
  {
    id: 'projects',
    type: 'page',
    label: 'Saved Projects',
    labelAr: 'المشاريع المحفوظة',
    icon: 'FolderOpen',
    href: '/projects',
    keywords: ['projects', 'مشاريع', 'saved', 'محفوظة', 'list'],
  },
  {
    id: 'new-project',
    type: 'page',
    label: 'New Project',
    labelAr: 'مشروع جديد',
    icon: 'FolderPlus',
    href: '/projects/new',
    keywords: ['new', 'create', 'جديد', 'إنشاء', 'project'],
  },
  {
    id: 'analyze',
    type: 'page',
    label: 'Analyze BOQ',
    labelAr: 'تحليل جدول الكميات',
    icon: 'FileSpreadsheet',
    href: '/analyze',
    keywords: ['analyze', 'تحليل', 'boq', 'كميات', 'upload'],
  },
  {
    id: 'cost-analysis',
    type: 'page',
    label: 'Cost Analysis',
    labelAr: 'تحليل التكاليف',
    icon: 'Calculator',
    href: '/cost-analysis',
    keywords: ['cost', 'analysis', 'تكاليف', 'تحليل', 'pricing'],
  },
  {
    id: 'items',
    type: 'page',
    label: 'BOQ Items',
    labelAr: 'بنود جدول الكميات',
    icon: 'List',
    href: '/items',
    keywords: ['items', 'بنود', 'boq', 'كميات', 'list'],
  },
  {
    id: 'quotations',
    type: 'page',
    label: 'Quotations',
    labelAr: 'عروض الأسعار',
    icon: 'FileText',
    href: '/quotations',
    keywords: ['quotations', 'عروض', 'أسعار', 'quotes'],
  },
  {
    id: 'historical-pricing',
    type: 'page',
    label: 'Historical Pricing',
    labelAr: 'الأسعار التاريخية',
    icon: 'History',
    href: '/historical-pricing',
    keywords: ['historical', 'تاريخية', 'pricing', 'أسعار', 'past'],
  },
  {
    id: 'pricing-accuracy',
    type: 'page',
    label: 'Pricing Accuracy',
    labelAr: 'دقة التسعير',
    icon: 'Target',
    href: '/pricing-accuracy',
    keywords: ['pricing', 'accuracy', 'دقة', 'تسعير', 'comparison'],
  },
  {
    id: 'library',
    type: 'page',
    label: 'Library',
    labelAr: 'المكتبة',
    icon: 'Library',
    href: '/library',
    keywords: ['library', 'مكتبة', 'materials', 'مواد', 'resources'],
  },
  {
    id: 'material-prices',
    type: 'page',
    label: 'Material Prices',
    labelAr: 'أسعار المواد',
    icon: 'Package',
    href: '/material-prices',
    keywords: ['material', 'مواد', 'prices', 'أسعار'],
  },
  {
    id: 'procurement',
    type: 'page',
    label: 'Procurement',
    labelAr: 'المشتريات',
    icon: 'ShoppingCart',
    href: '/procurement',
    keywords: ['procurement', 'مشتريات', 'purchase', 'شراء'],
  },
  {
    id: 'resources',
    type: 'page',
    label: 'Resources',
    labelAr: 'الموارد',
    icon: 'Users',
    href: '/resources',
    keywords: ['resources', 'موارد', 'labor', 'عمالة', 'equipment'],
  },
  {
    id: 'contracts',
    type: 'page',
    label: 'Contracts',
    labelAr: 'العقود',
    icon: 'FileContract',
    href: '/contracts',
    keywords: ['contracts', 'عقود', 'agreement'],
  },
  {
    id: 'subcontractors',
    type: 'page',
    label: 'Subcontractors',
    labelAr: 'المقاولين من الباطن',
    icon: 'HardHat',
    href: '/subcontractors',
    keywords: ['subcontractors', 'مقاولين', 'باطن'],
  },
  {
    id: 'risk',
    type: 'page',
    label: 'Risk Management',
    labelAr: 'إدارة المخاطر',
    icon: 'AlertTriangle',
    href: '/risk',
    keywords: ['risk', 'مخاطر', 'management', 'إدارة'],
  },
  {
    id: 'reports',
    type: 'page',
    label: 'Reports',
    labelAr: 'التقارير',
    icon: 'FileBarChart',
    href: '/reports',
    keywords: ['reports', 'تقارير', 'export', 'تصدير'],
  },
  {
    id: 'attachments',
    type: 'page',
    label: 'Attachments',
    labelAr: 'المرفقات',
    icon: 'Paperclip',
    href: '/attachments',
    keywords: ['attachments', 'مرفقات', 'files', 'ملفات'],
  },
  {
    id: 'templates',
    type: 'page',
    label: 'Templates',
    labelAr: 'القوالب',
    icon: 'LayoutTemplate',
    href: '/templates',
    keywords: ['templates', 'قوالب', 'boq'],
  },
  {
    id: 'calendar',
    type: 'page',
    label: 'Calendar',
    labelAr: 'التقويم',
    icon: 'Calendar',
    href: '/calendar',
    keywords: ['calendar', 'تقويم', 'schedule', 'جدولة'],
  },
  {
    id: 'p6-export',
    type: 'page',
    label: 'P6 Export',
    labelAr: 'تصدير P6',
    icon: 'Download',
    href: '/p6-export',
    keywords: ['p6', 'export', 'تصدير', 'primavera'],
  },
  {
    id: 'analysis-tools',
    type: 'page',
    label: 'Analysis Tools',
    labelAr: 'أدوات التحليل',
    icon: 'Wrench',
    href: '/analysis-tools',
    keywords: ['analysis', 'tools', 'أدوات', 'تحليل'],
  },
  {
    id: 'compare-versions',
    type: 'page',
    label: 'Compare Versions',
    labelAr: 'مقارنة النسخ',
    icon: 'GitCompare',
    href: '/compare-versions',
    keywords: ['compare', 'مقارنة', 'versions', 'نسخ'],
  },
];

// Quick actions
const quickActions: SearchItem[] = [
  {
    id: 'action-new-project',
    type: 'action',
    label: 'Create New Project',
    labelAr: 'إنشاء مشروع جديد',
    icon: 'Plus',
    href: '/projects/new',
    keywords: ['new', 'create', 'جديد', 'إنشاء', 'project'],
  },
  {
    id: 'action-fast-extract',
    type: 'action',
    label: 'Fast Extraction',
    labelAr: 'استخراج سريع',
    icon: 'Zap',
    href: '/fast-extraction',
    keywords: ['fast', 'extract', 'سريع', 'استخراج', 'quick'],
  },
  {
    id: 'action-analyze',
    type: 'action',
    label: 'Upload & Analyze BOQ',
    labelAr: 'رفع وتحليل جدول الكميات',
    icon: 'Upload',
    href: '/analyze',
    keywords: ['upload', 'رفع', 'analyze', 'تحليل', 'boq'],
  },
  {
    id: 'action-export-report',
    type: 'action',
    label: 'Export Report',
    labelAr: 'تصدير تقرير',
    icon: 'Download',
    href: '/reports',
    keywords: ['export', 'تصدير', 'report', 'تقرير', 'pdf'],
  },
];

// Settings
const settingsItems: SearchItem[] = [
  {
    id: 'settings',
    type: 'setting',
    label: 'Settings',
    labelAr: 'الإعدادات',
    icon: 'Settings',
    href: '/settings',
    keywords: ['settings', 'إعدادات', 'preferences'],
  },
  {
    id: 'company-settings',
    type: 'setting',
    label: 'Company Settings',
    labelAr: 'إعدادات الشركة',
    icon: 'Building2',
    href: '/company-settings',
    keywords: ['company', 'شركة', 'settings', 'إعدادات', 'logo'],
  },
  {
    id: 'about',
    type: 'setting',
    label: 'About',
    labelAr: 'حول التطبيق',
    icon: 'Info',
    href: '/about',
    keywords: ['about', 'حول', 'info', 'معلومات'],
  },
  {
    id: 'changelog',
    type: 'setting',
    label: 'Changelog',
    labelAr: 'سجل التغييرات',
    icon: 'ClipboardList',
    href: '/changelog',
    keywords: ['changelog', 'تغييرات', 'updates', 'تحديثات', 'version'],
  },
];

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch projects from database
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) {
        setProjects([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_data')
          .select('id, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (error) throw error;

        const projectItems: SearchItem[] = (data || []).map((p) => ({
          id: `project-${p.id}`,
          type: 'project' as const,
          label: p.name,
          labelAr: p.name,
          icon: 'FolderOpen',
          href: `/projects/${p.id}`,
          keywords: [p.name.toLowerCase()],
        }));

        setProjects(projectItems);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, user]);

  // Filter items based on query
  const filterItems = useCallback((items: SearchItem[], searchQuery: string): SearchItem[] => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (!normalizedQuery) return items.slice(0, 8);

    return items
      .filter((item) => {
        if (item.label.toLowerCase().includes(normalizedQuery)) return true;
        if (item.labelAr.includes(normalizedQuery)) return true;
        if (item.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))) return true;
        if (item.description?.toLowerCase().includes(normalizedQuery)) return true;
        if (item.descriptionAr?.includes(normalizedQuery)) return true;
        return false;
      })
      .sort((a, b) => {
        const aExact = a.label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
        const bExact = b.label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
        return aExact - bExact;
      })
      .slice(0, 10);
  }, []);

  // Memoized results
  const results = useMemo((): SearchResults => {
    return {
      pages: filterItems(staticPages, query),
      projects: filterItems(projects, query),
      actions: filterItems(quickActions, query),
      settings: filterItems(settingsItems, query),
    };
  }, [query, projects, filterItems]);

  // Navigate to item
  const navigateToItem = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      setQuery('');

      if (item.action) {
        item.action();
      } else if (item.href) {
        navigate(item.href);
      }
    },
    [navigate]
  );

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    isLoading,
    navigateToItem,
  };
}
