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

  /**
   * Endpoint to create a new family group.
   */
  @Post('create')
  async create(@Body() createFamilyDto: any, @Req() req: any) {
    return this.familyService.create(createFamilyDto, req.user._id);
  }

  /**
   * Endpoint to join an existing family group using a family code.
   */
  @Post('join')
  async join(
    @Body() joinDto: { familyCode?: string; inviteCode?: string },
    @Req() req: any,
  ) {
    const code = joinDto.familyCode || joinDto.inviteCode;
    if (!code) {
      throw new BadRequestException('Either familyCode or inviteCode is required');
    }

    // Try joining by familyCode first
    try {
      return await this.familyService.join(code, req.user._id);
    } catch (familyCodeErr: any) {
      // If family not found by familyCode, try inviteCode
      if (familyCodeErr.status === 404) {
        try {
          return await this.familyService.joinByInviteCode(code, req.user._id);
        } catch {
          // If inviteCode also fails, throw the original error
          throw familyCodeErr;
        }
      }
      throw familyCodeErr;
    }
  }

  /**
   * Endpoint to join a family using a user's personal invite code.
   */
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

  /**
   * Endpoint for family owner to approve a join request.
   */
  @Post('approve/:memberId')
  async approveMember(@Param('memberId') memberId: string, @Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.approveMember(familyId, req.user._id, memberId);
  }

  /**
   * Endpoint for family owner to reject a join request.
   */
  @Post('reject/:memberId')
  async rejectMember(@Param('memberId') memberId: string, @Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.rejectMember(familyId, req.user._id, memberId);
  }

  /**
   * Endpoint to list pending join requests.
   */
  @Get('pending')
  async getPendingMembers(@Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.getPendingMembers(familyId, req.user._id);
  }

  /**
   * Endpoint for the current user to leave their family group.
   */
  @Post('leave')
  async leave(@Req() req: any) {
    return this.familyService.leave(req.user._id);
  }

  /**
   * Endpoint to get all members of the user's family group.
   */
  @Get('members')
  async getMembers(@Req() req: any) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.getMembers(familyId);
  }

  /**
   * Endpoint to get current family details (categories, bank accounts, owner, etc).
   */
  @Get('details')
  async getDetails(@Req() req: any) {
    if (!req.user.familyId) {
        throw new NotFoundException('User does not belong to a family');
    }
    const family = await this.familyModel.findById(req.user.familyId).exec();
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  /**
   * Endpoint to remove a member from the family group.
   */
  @Delete('members/:id')
  async removeMember(
    @Param('id') memberId: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.removeMember(familyId, req.user._id, memberId);
  }

  /**
   * Endpoint to add a custom transaction category for the family.
   */
  @Post('categories')
  async addCategory(
    @Body('category') category: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.addCustomCategory(familyId, category);
  }

  /**
   * Endpoint to add a bank account for the family.
   */
  @Post('bank-accounts')
  async addBankAccount(
    @Body('bankAccount') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.addBankAccount(familyId, bankAccount);
  }

  /**
   * Endpoint to remove a bank account from the family.
   */
  @Delete('bank-accounts/:name')
  async removeBankAccount(
    @Param('name') bankAccount: string,
    @Req() req: any,
  ) {
    const familyId = this.ensureFamilyId(req);
    return this.familyService.removeBankAccount(familyId, bankAccount);
  }
}
