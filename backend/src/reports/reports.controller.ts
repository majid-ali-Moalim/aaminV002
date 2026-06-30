import { Controller, Get, Post, Body, Param, Delete, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── Dashboard overview ───
  @Get('dashboard')
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('dashboard/unified')
  getUnifiedDashboard() {
    return this.reportsService.getUnifiedDashboard();
  }

  // ─── KPI endpoints (used by /admin/dashboard and /admin/dashboard/kpi) ───
  @Get('kpi/emergency')
  getEmergencyKPIs(@Query('timeRange') timeRange?: string) {
    return this.reportsService.getEmergencyKPIs(timeRange);
  }

  @Get('kpi/performance')
  getPerformanceMetrics() {
    return this.reportsService.getPerformanceMetrics();
  }

  @Get('kpi/resources')
  getResourceUtilization() {
    return this.reportsService.getResourceUtilization();
  }

  @Get('kpi/patients')
  getPatientAnalytics() {
    return this.reportsService.getPatientAnalytics();
  }

  @Get('kpi/geographic')
  getGeographicAnalytics() {
    return this.reportsService.getGeographicAnalytics();
  }

  // ─── Trend endpoints (used by /admin/dashboard overview charts) ───
  @Get('trends/weekly')
  getWeeklyTrends() {
    return this.reportsService.getWeeklyTrends();
  }

  @Get('trends/monthly')
  getMonthlyTrends() {
    return this.reportsService.getMonthlyTrends();
  }

  // ─── Real-time metrics (used by live dashboard) ───
  @Get('realtime/metrics')
  getRealTimeMetrics() {
    return this.reportsService.getRealTimeMetrics();
  }

  @Get('dispatch-readiness')
  getDispatchReadiness() {
    return this.reportsService.getDispatchReadiness();
  }

  // ─── Admin Analytics & Reports pages ───
  @Get('admin/filter-options')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('report.view')
  getAdminReportFilterOptions() {
    return this.reportsService.getAdminReportFilterOptions();
  }

  @Get('admin/:type')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('report.view')
  getAdminReport(
    @Param('type') type: string,
    @Query() query: Record<string, string | undefined>,
    @Req() req: any,
  ) {
    return this.reportsService.getAdminReport(type, query, req.user?.id);
  }

  // ─── Legacy report endpoints ───
  @Post()
  create(@Body() createReportDto: any) {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateReportDto: any) {
    return this.reportsService.update(id, updateReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(id);
  }
}
