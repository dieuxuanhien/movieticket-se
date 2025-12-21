export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface SortParams {
  sortBy?: string;
  ascending?: boolean;
}

export interface SearchParams {
  search?: string;
}

// Combined query params
export interface ListQueryParams
  extends PaginationParams, SortParams, SearchParams {}
