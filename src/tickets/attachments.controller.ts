import { 
  Controller, Post, Delete, Param, UploadedFile, 
  UseInterceptors, HttpCode, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(200) // Overrides Nest's default 201 Created behavior to match your spec
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 1. Constraint: Maximum file size 10 MB (10 * 1024 * 1024 bytes)
          new MaxFileSizeValidator({ maxSize: 10485760, message: 'File size exceeds the 10MB limit.' }),
          // 2. Constraint: Allowed file types matching whitelist criteria
          new FileTypeValidator({ fileType: /(image\/png|image\/jpeg|application\/pdf|text\/plain)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const attachment = this.ticketsService.addAttachment(ticketId, file);
    
    // Explicitly exclude the raw byte buffer from the API response payload
    return {
      id: attachment.id,
      ticketId: attachment.ticketId,
      filename: attachment.filename,
      contentType: attachment.contentType,
    };
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  deleteAttachment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ): void {
    return this.ticketsService.removeAttachment(ticketId, attachmentId);
  }
}