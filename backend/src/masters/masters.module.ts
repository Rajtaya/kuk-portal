import { Module } from '@nestjs/common';
import { MastersController } from './masters.controller';
import { MastersService } from './masters.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MastersController],
  providers: [MastersService, PrismaService],
  exports: [MastersService],
})
export class MastersModule {}
