import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useGlobalSearch, SearchItem } from '@/hooks/useGlobalSearch';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Home,
  FolderOpen,
  FolderPlus,
  FileSpreadsheet,
  Calculator,
  List,
  FileText,
  History,
  Target,
  Library,
  Package,
  ShoppingCart,
  Users,
  FileCheck,
  HardHat,
  AlertTriangle,
  FileBarChart,
  Paperclip,
  LayoutTemplate,
  Calendar,
  Download,
  Wrench,
  GitCompare,
  Plus,
  Zap,
  Upload,
  Settings,
  Building2,
  Info,
  ClipboardList,
  Loader2,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Home,
  FolderOpen,
  FolderPlus,
  FileSpreadsheet,
  Calculator,
  List,
  FileText,
  History,
  Target,
  Library,
  Package,
  ShoppingCart,
  Users,
  FileContract: FileCheck,
  HardHat,
  AlertTriangle,
  FileBarChart,
  Paperclip,
  LayoutTemplate,
  Calendar,
  Download,
  Wrench,
  GitCompare,
  Plus,
  Zap,
  Upload,
  Settings,
  Building2,
  Info,
  ClipboardList,
};

interface SearchItemRowProps {
  item: SearchItem;
  isArabic: boolean;
  onSelect: () => void;
}

const SearchItemRow = ({ item, isArabic, onSelect }: SearchItemRowProps) => {
  const IconComponent = iconMap[item.icon] || FolderOpen;

  return (
    <CommandItem
      key={item.id}
      value={`${item.label} ${item.labelAr} ${item.keywords.join(' ')}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
    >
      <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="truncate">{isArabic ? item.labelAr : item.label}</span>
        {item.description && (
          <span className="text-xs text-muted-foreground truncate">
            {isArabic ? item.descriptionAr : item.description}
          </span>
        )}
      </div>
    </CommandItem>
  );
};

export function GlobalSearch() {
  const { isArabic } = useLanguage();
  const { isOpen, setIsOpen, query, setQuery, results, isLoading, navigateToItem } =
    useGlobalSearch();

  const hasResults =
    results.pages.length > 0 ||
    results.projects.length > 0 ||
    results.actions.length > 0 ||
    results.settings.length > 0;

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder={isArabic ? 'ابحث عن أي شيء... (⌘K)' : 'Search anything... (⌘K)'}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !hasResults && query && (
          <CommandEmpty>
            {isArabic ? 'لا توجد نتائج' : 'No results found.'}
          </CommandEmpty>
        )}

        {/* Quick Actions */}
        {results.actions.length > 0 && (
          <CommandGroup heading={isArabic ? 'إجراءات سريعة' : 'Quick Actions'}>
            {results.actions.map((item) => (
              <SearchItemRow
                key={item.id}
                item={item}
                isArabic={isArabic}
                onSelect={() => navigateToItem(item)}
              />
            ))}
          </CommandGroup>
        )}

        {results.actions.length > 0 && (results.pages.length > 0 || results.projects.length > 0) && (
          <CommandSeparator />
        )}

        {/* Pages */}
        {results.pages.length > 0 && (
          <CommandGroup heading={isArabic ? 'الصفحات' : 'Pages'}>
            {results.pages.map((item) => (
              <SearchItemRow
                key={item.id}
                item={item}
                isArabic={isArabic}
                onSelect={() => navigateToItem(item)}
              />
            ))}
          </CommandGroup>
        )}

        {results.pages.length > 0 && results.projects.length > 0 && <CommandSeparator />}

        {/* Recent Projects */}
        {results.projects.length > 0 && (
          <CommandGroup heading={isArabic ? 'المشاريع الأخيرة' : 'Recent Projects'}>
            {results.projects.map((item) => (
              <SearchItemRow
                key={item.id}
                item={item}
                isArabic={isArabic}
                onSelect={() => navigateToItem(item)}
              />
            ))}
          </CommandGroup>
        )}

        {(results.pages.length > 0 || results.projects.length > 0) &&
          results.settings.length > 0 && <CommandSeparator />}

        {/* Settings */}
        {results.settings.length > 0 && (
          <CommandGroup heading={isArabic ? 'الإعدادات' : 'Settings'}>
            {results.settings.map((item) => (
              <SearchItemRow
                key={item.id}
                item={item}
                isArabic={isArabic}
                onSelect={() => navigateToItem(item)}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
