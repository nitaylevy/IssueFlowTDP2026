import { Comment } from './comment.interface';

export interface PaginatedMentionsResponse {
  data: Comment[];
  total: number;
  page: number;
}