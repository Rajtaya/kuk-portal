import { Module } from '@nestjs/common';
import { SanctionedPostsController } from './sanctioned-posts.controller';
import { SanctionedPostsService } from './sanctioned-posts.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SanctionedPostsController],
  providers: [SanctionedPostsService, PrismaService],
  exports: [SanctionedPostsService],
})
export class SanctionedPostsModule {}
