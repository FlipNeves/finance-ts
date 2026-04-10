import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family } from '../schemas/family.schema';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
  ) {}

  private ensureFamilyId(req: any): string {
    const familyId = req.user.familyId;
    if (!familyId) {
      throw new BadRequestException('User does not belong to a family');
    }
    return familyId.toString();
  }

  @Post('create')
  async create(@Body() createFamilyDto: any, @Req() req: any) {
    return this.familyService.create(createFamilyDto, req.user._id);
  }

  @Post('join')
  async join(
    @Body() joinDto: { familyCode: string },
    @Req() req: any,
  ) {
    if (!joinDto.familyCode) {
      throw new BadRequestException('familyCode is required');
    }
    return await this.familyService.join(joinDto.familyCode, req.user._id);
  }

  @Post('approve/:memberId')
  async approveMember(@Param('memberId') memberId: string, @Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.approveMember(familyId, req.user._id, memberId);
  }

  @Post('reject/:memberId')
  async rejectMember(@Param('memberId') memberId: string, @Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.rejectMember(familyId, req.user._id, memberId);
  }

  @Get('pending')
  async getPendingMembers(@Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.getPendingMembers(familyId, req.user._id);
  }

  @Post('leave')
  async leave(@Req() req: any) {
    return this.familyService.leave(req.user._id);
  }

  @Get('members')
  async getMembers(@Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.getMembers(familyId);
  }

  @Get('details')
  async getDetails(@Req() req: any) {
    if (!req.user.familyId) {
        throw new NotFoundException('User does not belong to a family');
    }
    const family = await this.familyModel.findById(req.user.familyId).exec();
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  @Delete('members/:id')
  async removeMember(
    @Param('id') memberId: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.removeMember(familyId, req.user._id, memberId);
  }

  @Post('categories')
  async addCategory(
    @Body('category') category: string,
    @Req() req: any,
  ) {
    const familyId = req.user.familyId ? req.user.familyId.toString() : null;
    return this.familyService.addCustomCategory(familyId, req.user._id.toString(), category);
  }

  @Post('bank-accounts')
  async addBankAccount(
    @Body('bankAccount') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = req.user.familyId ? req.user.familyId.toString() : null;
    return this.familyService.addBankAccount(familyId, req.user._id.toString(), bankAccount);
  }

  @Delete('bank-accounts/:name')
  async removeBankAccount(
    @Param('name') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = req.user.familyId ? req.user.familyId.toString() : null;
    return this.familyService.removeBankAccount(familyId, req.user._id.toString(), bankAccount);
  }
}
