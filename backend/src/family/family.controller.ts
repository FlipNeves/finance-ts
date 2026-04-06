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
    @Body() joinDto: { inviteCode?: string },
    @Req() req: any,
  ) {
    if (!joinDto.inviteCode) {
      throw new BadRequestException('Either familyCode or inviteCode is required');
    }
    return await this.familyService.joinByInviteCode(joinDto.inviteCode, req.user._id);
  }

  @Post('join-by-invite')
  async joinByInvite(
    @Body() joinDto: { inviteCode: string },
    @Req() req: any,
  ) {
    if (!joinDto.inviteCode) {
      throw new BadRequestException('inviteCode is required');
    }
    return this.familyService.joinByInviteCode(joinDto.inviteCode, req.user._id);
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
    const familyId = this.ensureFamilyId(req);
    return this.familyService.addCustomCategory(familyId, category);
  }

  @Post('bank-accounts')
  async addBankAccount(
    @Body('bankAccount') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.addBankAccount(familyId, bankAccount);
  }

  @Delete('bank-accounts/:name')
  async removeBankAccount(
    @Param('name') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.removeBankAccount(familyId, bankAccount);
  }
}
