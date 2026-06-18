import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationEntity } from './entities/application.entity';
import { OpportunityEntity } from '../opportunities/entities/opportunity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationEntity, OpportunityEntity]),
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
