import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { PaginationMeta } from '../interfaces/api-response.interface';

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: { page?: number; limit?: number },
): PaginatedResult<T> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
