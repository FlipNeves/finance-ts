import { Controller, Post, Get, Body, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('create')
  async create(@Body() createFamilyDto: any, @Req() req: any) {
    return this.familyService.create(createFamilyDto, req.user._id);
  }

  @Post('join')
  async join(@Body() joinDto: { familyCode: string }, @Req() req: any) {
    return this.familyService.join(joinDto.familyCode, req.user._id);
  }

  @Post('leave')
  async leave(@Req() req: any) {
    return this.familyService.leave(req.user._id);
  }

  @Get('members')
  async getMembers(@Req() req: any) {
    return this.familyService.getMembers(req.user.familyId);
  }

  @Delete('members/:id')
  async removeMember(@Param('id') memberId: string, @Req() req: any) {
    return this.familyService.removeMember(req.user.familyId, memberId);
  }

  @Post('categories')
  async addCategory(@Body('category') category: string, @Req() req: any) {
    return this.familyService.addCustomCategory(req.user.familyId, category);
  }
}
