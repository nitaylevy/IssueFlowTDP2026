import { Controller, Get, Post, Delete, Param, Body, HttpCode, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AddDependencyDto } from './dto/add-dependency.dto';
import { BlockerTicketSummary } from './interfaces/dependency.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/dependencies')
export class DependenciesController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(200) // Forces response to be 200 OK
  addDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() addDependencyDto: AddDependencyDto,
  ): void {
    return this.ticketsService.addDependency(ticketId, addDependencyDto.blockedBy);
  }

  @Get()
  listDependencies(@Param('ticketId', ParseIntPipe) ticketId: number): BlockerTicketSummary[] {
    return this.ticketsService.getDependencies(ticketId);
  }

  @Delete(':blockerId')
  @HttpCode(200)
  removeDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('blockerId', ParseIntPipe) blockerId: number,
  ): void {
    return this.ticketsService.removeDependency(ticketId, blockerId);
  }
}