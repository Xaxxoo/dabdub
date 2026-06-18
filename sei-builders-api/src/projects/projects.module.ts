import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectEntity } from './entities/project.entity';
import { ProjectCategoryEntity } from './entities/project-category.entity';
import { TagEntity } from './entities/tag.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectCategoryEntity,
      TagEntity,
      RepositoryEntity,
    ]),
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
