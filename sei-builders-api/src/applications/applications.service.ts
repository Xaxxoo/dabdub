import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApplicationEntity,
  ApplicationStatus,
} from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { OpportunityEntity, OpportunityStatus } from '../opportunities/entities/opportunity.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(OpportunityEntity)
    private readonly oppRepo: Repository<OpportunityEntity>,
  ) {}

  async create(
    dto: CreateApplicationDto,
    applicantId: string,
  ): Promise<ApplicationEntity> {
    const opportunity = await this.oppRepo.findOne({
      where: { id: dto.opportunityId },
    });
    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }
    if (opportunity.status !== OpportunityStatus.OPEN) {
      throw new BadRequestException('Opportunity is not open for applications');
    }

    const existing = await this.appRepo.findOne({
      where: { opportunityId: dto.opportunityId, applicantId },
    });
    if (existing) {
      throw new BadRequestException('You have already applied to this opportunity');
    }

    const application = await this.appRepo.save(
      this.appRepo.create({ ...dto, applicantId }),
    );

    // Increment application count
    await this.oppRepo.increment(
      { id: dto.opportunityId },
      'applicationCount',
      1,
    );

    return application;
  }

  async findByOpportunity(opportunityId: string, pagination: PaginationDto) {
    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .where('app.opportunityId = :opportunityId', { opportunityId })
      .skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('app.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findByApplicant(applicantId: string, pagination: PaginationDto) {
    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.opportunity', 'opportunity')
      .leftJoinAndSelect('opportunity.project', 'project')
      .where('app.applicantId = :applicantId', { applicantId })
      .skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('app.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, pagination);
  }

  async findById(id: string): Promise<ApplicationEntity> {
    const app = await this.appRepo.findOne({
      where: { id },
      relations: ['applicant', 'opportunity', 'reviewedBy'],
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return app;
  }

  async accept(id: string, reviewerId: string, notes?: string): Promise<ApplicationEntity> {
    const app = await this.findById(id);
    await this.appRepo.update(id, {
      status: ApplicationStatus.ACCEPTED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    });
    return this.findById(id);
  }

  async reject(id: string, reviewerId: string, notes?: string): Promise<ApplicationEntity> {
    await this.findById(id);
    await this.appRepo.update(id, {
      status: ApplicationStatus.REJECTED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
    });
    return this.findById(id);
  }

  async withdraw(id: string, applicantId: string): Promise<ApplicationEntity> {
    const app = await this.findById(id);
    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('You can only withdraw your own application');
    }
    if (app.status !== ApplicationStatus.PENDING && app.status !== ApplicationStatus.REVIEWING) {
      throw new BadRequestException(`Cannot withdraw application with status: ${app.status}`);
    }
    await this.appRepo.update(id, { status: ApplicationStatus.WITHDRAWN });
    return this.findById(id);
  }
}
