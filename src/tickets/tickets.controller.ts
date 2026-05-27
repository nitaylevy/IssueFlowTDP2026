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

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findByProject(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.ticketsService.findByProject(projectId);
  }

  @Get('export')
  async exportCsv(@Query('projectId', ParseIntPipe) projectId: number, @Res() res: Response) {
    const csvContent = this.ticketsService.exportToCsv(projectId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-tickets.csv`);
    return res.status(200).send(csvContent);
  }

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.findOne(ticketId);
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
      throw new Error('CSV file is missing from multipart/form-data request body');
    }
    const csvString = file.buffer.toString('utf-8');
    return this.ticketsService.importFromCsv(csvString, projectId);
  }
}