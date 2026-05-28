// src/projects/projects.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './interfaces/project.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/roles.guard';
import { TicketsService } from '../tickets/tickets.service';

@UseGuards(JwtAuthGuard) // Protects all project endpoints with your JWT logic
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly ticketsService: TicketsService, // Inject TicketsService here
  ) {}

  @Get()
  findAll(): Project[] {
    return this.projectsService.findAll();
  }

  @Get(':projectId')
  findOne(@Param('projectId', ParseIntPipe) projectId: number): Project {
    return this.projectsService.findOne(projectId);
  }

  @Post()
  @HttpCode(200) // Forces a 200 OK instead of Nest's default 201 Created
  create(@Body() createProjectDto: CreateProjectDto): Project {
    return this.projectsService.create(createProjectDto);
  }
  
  @Get(':projectId/workload')
  getProjectWorkload(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.ticketsService.getProjectWorkload(projectId);
  }

  @Patch(':projectId')
  @HttpCode(200)
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ): void {
    return this.projectsService.update(projectId, updateProjectDto);
  }

  @Delete(':projectId')
  @HttpCode(200)
  delete(@Param('projectId', ParseIntPipe) projectId: number): void {
    return this.projectsService.delete(projectId);
  }

  @UseGuards(AdminGuard)
  @Get('deleted')
  findSoftDeleted(): Project[] {
    return this.projectsService.findSoftDeleted();
  }

  @UseGuards(AdminGuard)
  @Post(':projectId/restore')
  @HttpCode(200)
  restore(@Param('projectId', ParseIntPipe) projectId: number): void {
    return this.projectsService.restore(projectId);
  }
}