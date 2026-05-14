import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  private getFamilyId(req: any): string | null {
    const familyId = req.user.familyId;
    if (!familyId) return null;
    return familyId.toString();
  }

  @Post()
  async create(@Body() createGoalDto: any, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.goalsService.create(createGoalDto, req.user._id, familyId);
  }

  @Get()
  async findAll(@Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.goalsService.findAll(familyId, req.user._id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.goalsService.findOne(id, familyId, req.user._id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateGoalDto: any) {
    return this.goalsService.update(id, updateGoalDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }

  @Get(':id/contributions')
  async listContributions(@Param('id') id: string) {
    return this.goalsService.listContributions(id);
  }

  @Post(':id/contributions')
  async addContribution(
    @Param('id') id: string,
    @Body() contributionDto: any,
    @Req() req: any,
  ) {
    const familyId = this.getFamilyId(req);
    return this.goalsService.addContribution(
      id,
      contributionDto,
      req.user._id,
      familyId,
    );
  }

  @Delete(':id/contributions/:contributionId')
  async removeContribution(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.goalsService.removeContribution(id, contributionId);
  }
}
