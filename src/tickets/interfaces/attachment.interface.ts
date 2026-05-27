export interface Attachment {
  id: number;
  ticketId: number;
  filename: string;
  contentType: string;
  buffer: Buffer; // Stores the raw file data in-memory
}