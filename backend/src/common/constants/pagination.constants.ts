export enum PaginationSortFields {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  TITLE = 'title',
  START_TIME = 'startTime',
}

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 10,
  MAX_PER_PAGE: 100,
  DEFAULT_SORT_BY: PaginationSortFields.CREATED_AT,
  DEFAULT_SORT_ASCENDING: false,
} as const;
