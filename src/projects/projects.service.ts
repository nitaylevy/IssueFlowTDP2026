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
      isDeleted: false,
    };

    this.projects.push(newProject);
    return newProject;
  }

  findAll(): Project[] {
    // Hidden from standard responses
    return this.projects.filter((p) => !p.isDeleted);
  }

  findOne(id: number): Project {
    const project = this.projects.find((p) => p.id === id && !p.isDeleted);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  delete(id: number): void {
    const project = this.projects.find((p) => p.id === id && !p.isDeleted);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    project.isDeleted = true; // Flagged as soft-deleted
    return;
  }

  update(id: number, updateProjectDto: UpdateProjectDto): void {
    const project = this.findOne(id);

    if (updateProjectDto.name) project.name = updateProjectDto.name;
    if (updateProjectDto.description) project.description = updateProjectDto.description;

    return;
  }

  findSoftDeleted(): Project[] {
    return this.projects.filter((p) => p.isDeleted);
  }

  restore(id: number): void {
    const project = this.projects.find((p) => p.id === id && p.isDeleted);
    if (!project) {
      throw new NotFoundException(`Soft-deleted project with ID ${id} not found.`);
    }
    project.isDeleted = false;
    return;
  }

}