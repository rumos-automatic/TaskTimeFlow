import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('analytics/bulk')
  @ApiOperation({ summary: 'Get bulk analytics for multiple tasks' })
  @ApiResponse({ status: 200, description: 'Task analytics retrieved successfully' })
  async getBulkTaskAnalytics(
    @Request() req,
    @Query('taskIds') taskIds: string,
  ) {
    const taskIdArray = taskIds.split(',');
    return this.tasksService.getBulkTaskAnalytics(req.user.id, taskIdArray);
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'Get task dependencies' })
  @ApiResponse({ status: 200, description: 'Task dependencies retrieved successfully' })
  async getTaskDependencies(@Request() req, @Param('id') taskId: string) {
    return this.tasksService.getTaskDependencies(req.user.id, taskId);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Create a task dependency' })
  @ApiResponse({ status: 201, description: 'Task dependency created successfully' })
  async createTaskDependency(
    @Request() req,
    @Param('id') taskId: string,
    @Body('dependencyId') dependencyId: string,
  ) {
    return this.tasksService.createTaskDependency(req.user.id, taskId, dependencyId);
  }

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update task progress' })
  @ApiResponse({ status: 200, description: 'Task progress updated successfully' })
  async updateTaskProgress(
    @Request() req,
    @Param('id') taskId: string,
    @Body('progress') progress: number,
  ) {
    return this.tasksService.updateTaskProgress(req.user.id, taskId, progress);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get task history' })
  @ApiResponse({ status: 200, description: 'Task history retrieved successfully' })
  async getTaskHistory(@Request() req, @Param('id') taskId: string) {
    return this.tasksService.getTaskHistory(req.user.id, taskId);
  }
}