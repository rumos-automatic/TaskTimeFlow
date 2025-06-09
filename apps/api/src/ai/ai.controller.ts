import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('tasks/batch-process')
  @ApiOperation({ summary: 'Process large batch of tasks with AI' })
  @ApiResponse({ status: 201, description: 'Tasks processed successfully' })
  async processLargeTaskBatch(
    @Request() req,
    @Body() body: { tasks: any[]; operation: string },
  ) {
    return this.aiService.processLargeTaskBatch(
      req.user.id,
      body.tasks,
      body.operation,
    );
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-powered productivity insights' })
  @ApiResponse({ status: 200, description: 'AI insights retrieved successfully' })
  async getAIInsights(
    @Request() req,
    @Query('timeframe') timeframe: string = 'month',
  ) {
    return this.aiService.getAIInsights(req.user.id, timeframe);
  }
}