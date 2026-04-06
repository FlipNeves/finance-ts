import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private ensureFamilyId(req: any): string {
    const familyId = req.user.familyId;
    if (!familyId) {
      throw new BadRequestException('User does not belong to a family');
    }
    return familyId.toString();
  }

  @Get('summary')
  async getSummary(
    @Req() req: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    const familyId = this.ensureFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getFamilySummary(
      familyId,
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
    const familyId = this.ensureFamilyId(req);
    const startDate = start
      ? new Date(start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();
    return this.reportsService.getSpendingByCategory(
      familyId,
      startDate,
      endDate,
      type,
    );
  }
}
