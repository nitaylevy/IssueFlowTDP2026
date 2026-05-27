export interface MentionedUserSummary {
  id: number;
  username: string;
  fullName: string;
}

export interface Comment {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  mentionedUsers: MentionedUserSummary[];
  version: number; // For guarding against simultaneous updates
}