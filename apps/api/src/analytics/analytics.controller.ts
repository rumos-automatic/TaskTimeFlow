import { Controller, Get, Post, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('productivity/advanced')
  @ApiOperation({ summary: 'Get advanced productivity metrics' })
  @ApiResponse({ status: 200, description: 'Advanced productivity metrics retrieved successfully' })
  async getAdvancedProductivityMetrics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getAdvancedProductivityMetrics(
      req.user.id,
      startDate,
      endDate,
    );
  }

  @Get('pomodoro')
  @ApiOperation({ summary: 'Get pomodoro analytics' })
  @ApiResponse({ status: 200, description: 'Pomodoro analytics retrieved successfully' })
  async getPomodoroAnalytics(
    @Request() req,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    return this.analyticsService.getPomodoroAnalytics(req.user.id, period);
  }

  @Get('time-distribution')
  @ApiOperation({ summary: 'Get time distribution analysis' })
  @ApiResponse({ status: 200, description: 'Time distribution analysis retrieved successfully' })
  async getTimeDistributionAnalysis(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getTimeDistributionAnalysis(
      req.user.id,
      startDate,
      endDate,
    );
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get productivity predictions' })
  @ApiResponse({ status: 200, description: 'Productivity predictions retrieved successfully' })
  async getProductivityPredictions(@Request() req) {
    return this.analyticsService.getProductivityPredictions(req.user.id);
  }

  @Post('reports/custom')
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiResponse({ status: 201, description: 'Custom report generated successfully' })
  async generateCustomReport(@Request() req, @Body() reportConfig: any) {
    return this.analyticsService.generateCustomReport(req.user.id, reportConfig);
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: 'Get team analytics' })
  @ApiResponse({ status: 200, description: 'Team analytics retrieved successfully' })
  async getTeamAnalytics(@Request() req, @Param('teamId') teamId: string) {
    return this.analyticsService.getTeamAnalytics(teamId, req.user.id);
  }
}