import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributorsService } from './contributors.service';
import { ContributorsController } from './contributors.controller';
import { ContributorProfileEntity } from './entities/contributor-profile.entity';
import { SkillEntity } from './entities/skill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContributorProfileEntity, SkillEntity]),
  ],
  providers: [ContributorsService],
  controllers: [ContributorsController],
  exports: [ContributorsService],
})
export class ContributorsModule {}
