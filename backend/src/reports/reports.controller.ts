import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getFamilyId(req: any): string | null {
    const familyId = req.user.familyId;
    if (!familyId) return null;
    return familyId.toString();
  }

  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getFamilySummary(
      familyId,
      req.user._id,
      startDate,
      endDate,
    );
  }

  @Get('spending-by-category')
  async getSpendingByCategory(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Query('type') type?: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getSpendingByCategory(
      familyId,
      req.user._id,
      startDate,
      endDate,
      type,
    );
  }

  @Get('evolution')
  async getEvolution(
    @Req() req: any,
    @Query('endDate') end: string,
    @Query('months') months: string,
  ) {
    const familyId = this.getFamilyId(req);
    const referenceDate = end ? new Date(end) : new Date();
    const parsedMonths = months ? Math.max(1, Math.min(60, parseInt(months, 10) || 3)) : 3;
    return this.reportsService.getEvolutionReport(familyId, req.user._id, referenceDate, parsedMonths);
  }

  @Get('top-spending')
  async getTopSpending(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getTopSpendingInfo(
      familyId,
      req.user._id,
      startDate,
      endDate,
    );
  }

  @Get('daily-spending')
  async getDailySpending(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Query('type') type?: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getDailySpending(
      familyId,
      req.user._id,
      startDate,
      endDate,
      type,
    );
  }

  @Get('balance-by-account')
  async getBalanceByAccount(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getBalanceByAccount(
      familyId,
      req.user._id,
      startDate,
      endDate,
    );
  }

  @Get('spending-by-member')
  async getSpendingByMember(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    const familyId = this.getFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getSpendingByMember(
      familyId,
      req.user._id,
      startDate,
      endDate,
    );
  }

  @Get('total-accumulated')
  async getTotalAccumulated(@Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.reportsService.getTotalAccumulated(familyId, req.user._id);
  }
}
