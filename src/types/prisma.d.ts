// This file contains additional type definitions for the project
// The Prisma Client types are auto-generated and should not be overridden

// Custom types for the application
export interface CustomAssetFilters {
  department?: string;
  category?: string;
  status?: string;
}

export interface AssetSearchParams {
  query?: string;
  filters?: CustomAssetFilters;
  page?: number;
  limit?: number;
}

// Additional utility types for the application
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}