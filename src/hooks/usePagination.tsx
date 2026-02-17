import { useState, useCallback } from "react";

interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationResult {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;
  hasNext: boolean;
  hasPrevious: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setTotalItems: (total: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

export function usePagination(config: PaginationConfig = {}): PaginationResult {
  const { pageSize: initialPageSize = 10, initialPage = 1 } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);
  const from = (currentPage - 1) * pageSize;
  const to = Math.min(from + pageSize - 1, totalItems - 1);
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevious]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
    setTotalItems(0);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    from,
    to,
    hasNext,
    hasPrevious,
    goToPage,
    nextPage,
    previousPage,
    setTotalItems,
    setPageSize,
    reset,
  };
}
