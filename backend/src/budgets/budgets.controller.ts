import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  private getFamilyId(req: any): string | null {
    const familyId = req.user.familyId;
    return familyId ? familyId.toString() : null;
  }

  @Get()
  async getBudget(@Req() req: any, @Query('month') month: string, @Query('year') year: string) {
    return this.budgetsService.getBudget(req.user._id, this.getFamilyId(req), parseInt(month), parseInt(year));
  }

  @Post()
  async saveBudget(@Req() req: any, @Body() data: any) {
    return this.budgetsService.saveBudget(req.user._id, this.getFamilyId(req), data.month, data.year, data);
  }

  @Post('copy')
  async copyPreviousMonth(@Req() req: any, @Body() data: { month: number; year: number }) {
    return this.budgetsService.copyPreviousMonth(req.user._id, this.getFamilyId(req), data.month, data.year);
  }
}
