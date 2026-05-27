import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLog } from './interfaces/audit-log.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditQueryDto): AuditLog[] {
    return this.auditLogsService.findAll(query);
  }
}