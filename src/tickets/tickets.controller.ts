import { 
  Controller, Get, Post, Patch, Delete, Query, Param, Body, 
  HttpCode, ParseIntPipe, Res, UseInterceptors, UploadedFile, UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Multer } from 'multer';
import { AdminGuard } from '../auth/roles.guard';
import { Ticket } from './interfaces/ticket.interface';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('export')
  async exportCsv(@Query('projectId', ParseIntPipe) projectId: number, @Res() res: Response) {
    const csvContent = this.ticketsService.exportToCsv(projectId);
    
    // Set headers to trigger file downloads in browser contexts seamlessly
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-migration.csv`);
    
    return res.status(200).send(csvContent);
  }

  @Post()
  @HttpCode(200)
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Patch(':ticketId')
  @HttpCode(200)
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(ticketId, updateTicketDto);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  delete(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.delete(ticketId);
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId', ParseIntPipe) projectId: number,
  ) {
    if (!file) {
      throw new Error('Required multipart file block missing from payload.');
    }
    
    // Convert the binary stream directly back to plaintext string format
    const csvString = file.buffer.toString('utf-8');
    return this.ticketsService.importFromCsv(csvString, projectId);
  }

  private transformTicketResponse(ticket: any) {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      projectId: ticket.projectId,
      assigneeId: ticket.assigneeId,
      dueDate: ticket.dueDate,
      is_overdue: ticket.isOverdue, // Explicitly exposed as snake_case in standard API responses
      version: ticket.version
    };
  }

  @Get()
  findByProject(@Query('projectId', ParseIntPipe) projectId: number) {
    const tickets = this.ticketsService.findByProject(projectId);
    return tickets.map(t => this.transformTicketResponse(t));
  }

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const ticket = this.ticketsService.findOne(ticketId);
    return this.transformTicketResponse(ticket);
  }

  @UseGuards(AdminGuard)
  @Get('deleted')
  findSoftDeleted(@Query('projectId', ParseIntPipe) projectId: number): Ticket[] {
    return this.ticketsService.findSoftDeletedByProject(projectId);
  }

  @UseGuards(AdminGuard)
  @Post(':ticketId/restore')
  @HttpCode(200)
  restore(@Param('ticketId', ParseIntPipe) ticketId: number): void {
    return this.ticketsService.restore(ticketId);
  }
}