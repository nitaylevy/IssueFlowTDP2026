import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Project } from './interfaces/project.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  private projects: Project[] = [];
  private idCounter = 1;

  constructor(private usersService: UsersService) {}

  create(createProjectDto: CreateProjectDto): Project {
    // Validate that the owner actually exists in the system
    try {
      this.usersService.findOne(createProjectDto.ownerId);
    } catch {
      throw new BadRequestException(`Owner with User ID ${createProjectDto.ownerId} does not exist.`);
    }

    const newProject: Project = {
      id: this.idCounter++,
      ...createProjectDto,
    };

    this.projects.push(newProject);
    return newProject;
  }

  findAll(): Project[] {
    return this.projects;
  }

  findOne(id: number): Project {
    const project = this.projects.find((p) => p.id === id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  update(id: number, updateProjectDto: UpdateProjectDto): void {
    const project = this.findOne(id);

    if (updateProjectDto.name) project.name = updateProjectDto.name;
    if (updateProjectDto.description) project.description = updateProjectDto.description;

    return;
  }

  delete(id: number): void {
    const projectIndex = this.projects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // In an in-memory implementation, we remove it. 
    // If implementing real database soft-deletes later, you'd toggle a 'deletedAt' flag.
    this.projects.splice(projectIndex, 1);
    return;
  }
}