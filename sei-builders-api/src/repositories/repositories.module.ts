import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { RepositoryEntity } from './entities/repository.entity';
import { RepositorySyncEntity } from './entities/repository-sync.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RepositoryEntity, RepositorySyncEntity]),
  ],
  providers: [RepositoriesService],
  controllers: [RepositoriesController],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
