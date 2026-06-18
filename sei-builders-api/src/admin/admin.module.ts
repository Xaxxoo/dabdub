import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserEntity } from '../users/entities/user.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { OrganizationEntity } from '../organizations/entities/organization.entity';
import { ApplicationEntity } from '../applications/entities/application.entity';
import { RepositoryEntity } from '../repositories/entities/repository.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ProjectEntity,
      OrganizationEntity,
      ApplicationEntity,
      RepositoryEntity,
    ]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
