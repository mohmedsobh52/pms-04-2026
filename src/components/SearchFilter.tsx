import { useState } from "react";
import { Search, Filter, X, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";

interface FilterOption {
  label: string;
  labelAr?: string;
  value: string;
}

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter?: (filters: Record<string, string>) => void;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  placeholder?: string;
  placeholderAr?: string;
  filterOptions?: {
    field: string;
    label: string;
    labelAr?: string;
    options: FilterOption[];
  }[];
  sortOptions?: FilterOption[];
  showSort?: boolean;
  className?: string;
}

export function SearchFilter({
  onSearch,
  onFilter,
  onSort,
  placeholder = "Search...",
  placeholderAr = "بحث...",
  filterOptions = [],
  sortOptions = [],
  showSort = true,
  className = "",
}: SearchFilterProps) {
  const { isArabic } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === "all") {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const handleSortChange = (field: string) => {
    setSortField(field);
    onSort?.(field, sortDirection);
  };

  const toggleSortDirection = () => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);
    if (sortField) {
      onSort?.(sortField, newDirection);
    }
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchQuery("");
    setSortField("");
    onSearch("");
    onFilter?.({});
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || searchQuery;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isArabic ? placeholderAr : placeholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        {filterOptions.length > 0 && (
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {isArabic ? "تصفية" : "Filter"}
            {Object.keys(activeFilters).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.keys(activeFilters).length}
              </Badge>
            )}
          </Button>
        )}

        {/* Sort Controls */}
        {showSort && sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <Select value={sortField} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={isArabic ? "ترتيب" : "Sort by"} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {isArabic && option.labelAr ? option.labelAr : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSortDirection}
              disabled={!sortField}
            >
              {sortDirection === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            {isArabic ? "مسح" : "Clear"}
          </Button>
        )}
      </div>

      {/* Filter Dropdowns */}
      {showFilters && filterOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg animate-fade-in">
          {filterOptions.map((filter) => (
            <Select
              key={filter.field}
              value={activeFilters[filter.field] || "all"}
              onValueChange={(value) => handleFilterChange(filter.field, value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={isArabic && filter.labelAr ? filter.labelAr : filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isArabic ? "الكل" : "All"} {isArabic && filter.labelAr ? filter.labelAr : filter.label}
                </SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {isArabic && option.labelAr ? option.labelAr : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {/* Active Filters Display */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([field, value]) => {
            const filterConfig = filterOptions.find((f) => f.field === field);
            const optionConfig = filterConfig?.options.find((o) => o.value === value);
            return (
              <Badge key={field} variant="secondary" className="gap-1">
                {filterConfig?.label}: {optionConfig?.label || value}
                <button
                  onClick={() => handleFilterChange(field, "all")}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
