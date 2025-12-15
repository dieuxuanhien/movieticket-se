import { Injectable } from '@nestjs/common';
import { PaginationParams, SortParams } from '../types/api-pagination.types';
import { PAGINATION_CONSTANTS } from '../constants/pagination.constants';
import { PaginatedApiResponse } from '../types/api-response.types';

@Injectable()
export class PaginationService {
  getPaginationParams(params?: PaginationParams): Required<PaginationParams> {
    return {
      page: params?.page || PAGINATION_CONSTANTS.DEFAULT_PAGE,
      perPage: Math.min(
        params?.perPage || PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
        PAGINATION_CONSTANTS.MAX_PER_PAGE,
      ),
    };
  }

  getSortParams(params: SortParams): Required<SortParams> {
    return {
      sortBy: params?.sortBy || PAGINATION_CONSTANTS.DEFAULT_SORT_BY,
      ascending:
        params?.ascending ?? PAGINATION_CONSTANTS.DEFAULT_SORT_ASCENDING,
    };
  }

  getSkip(page: number, perPage: number): number {
    return (page - 1) * perPage;
  }

  paginateData<T>(
    data: T[],
    total: number,
    params: Required<PaginationParams>,
    path: string,
  ): PaginatedApiResponse<T[]> {
    return {
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
      path,
      pagination: {
        total,
        page: params.page,
        perPage: params.perPage,
        totalPages: Math.ceil(total / params.perPage),
      },
    };
  }

  // Helper for Prisma orderBy
  getOrderBy(
    sortBy: string,
    ascending: boolean,
  ): Record<string, 'asc' | 'desc'> {
    return { [sortBy]: ascending ? 'asc' : 'desc' };
  }
}
