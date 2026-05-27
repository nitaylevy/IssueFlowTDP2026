import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { DependenciesController } from './dependencies.controller';
import { AttachmentsController } from './attachments.controller';
import { TicketsService } from './tickets.service';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ProjectsModule, UsersModule],
  controllers: [TicketsController, DependenciesController, AttachmentsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}