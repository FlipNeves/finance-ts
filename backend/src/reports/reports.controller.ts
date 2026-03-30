import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(@Req() req: any, @Query('startDate') start: string, @Query('endDate') end: string) {
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getFamilySummary(req.user.familyId, startDate, endDate);
  }

  @Get('spending-by-category')
  async getSpendingByCategory(@Req() req: any, @Query('startDate') start: string, @Query('endDate') end: string) {
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getSpendingByCategory(req.user.familyId, startDate, endDate);
  }
}
