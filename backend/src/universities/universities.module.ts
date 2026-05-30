import { Module } from '@nestjs/common';
import { UniversitiesController } from './universities.controller';
import { UniversitiesService } from './universities.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [UniversitiesController],
  providers: [UniversitiesService, PrismaService],
  exports: [UniversitiesService],
})
export class UniversitiesModule {}
