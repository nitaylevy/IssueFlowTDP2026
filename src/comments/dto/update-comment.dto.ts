export class UpdateCommentDto {
  content: string;
  version?: number; // Used for simultaneous multi-user edit protection
}