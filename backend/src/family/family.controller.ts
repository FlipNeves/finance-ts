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
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family } from '../schemas/family.schema';

interface RequestWithUser extends Request {
  user: {
    _id: string;
    familyId: string;
  };
}

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
  ) {}

  /**
   * Endpoint to create a new family group.
   */
  @Post('create')
  async create(@Body() createFamilyDto: any, @Req() req: RequestWithUser) {
    return this.familyService.create(createFamilyDto, req.user._id);
  }

  /**
   * Endpoint to join an existing family group using a code.
   */
  @Post('join')
  async join(
    @Body() joinDto: { familyCode: string },
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.join(joinDto.familyCode, req.user._id);
  }

  /**
   * Endpoint for family owner to approve a join request.
   */
  @Post('approve/:memberId')
  async approveMember(@Param('memberId') memberId: string, @Req() req: RequestWithUser) {
    return this.familyService.approveMember(req.user.familyId, req.user._id, memberId);
  }

  /**
   * Endpoint for family owner to reject a join request.
   */
  @Post('reject/:memberId')
  async rejectMember(@Param('memberId') memberId: string, @Req() req: RequestWithUser) {
    return this.familyService.rejectMember(req.user.familyId, req.user._id, memberId);
  }

  /**
   * Endpoint to list pending join requests.
   */
  @Get('pending')
  async getPendingMembers(@Req() req: RequestWithUser) {
    return this.familyService.getPendingMembers(req.user.familyId, req.user._id);
  }

  /**
   * Endpoint for the current user to leave their family group.
   */
  @Post('leave')
  async leave(@Req() req: RequestWithUser) {
    return this.familyService.leave(req.user._id);
  }

  /**
   * Endpoint to get all members of the user's family group.
   */
  @Get('members')
  async getMembers(@Req() req: RequestWithUser) {
    return this.familyService.getMembers(req.user.familyId);
  }

  /**
   * Endpoint to get current family details (categories, bank accounts, owner, etc).
   */
  @Get('details')
  async getDetails(@Req() req: RequestWithUser) {
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
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.removeMember(req.user.familyId, req.user._id, memberId);
  }

  /**
   * Endpoint to add a custom transaction category for the family.
   */
  @Post('categories')
  async addCategory(
    @Body('category') category: string,
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.addCustomCategory(req.user.familyId, category);
  }

  /**
   * Endpoint to add a bank account for the family.
   */
  @Post('bank-accounts')
  async addBankAccount(
    @Body('bankAccount') bankAccount: string,
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.addBankAccount(req.user.familyId, bankAccount);
  }

  /**
   * Endpoint to remove a bank account from the family.
   */
  @Delete('bank-accounts/:name')
  async removeBankAccount(
    @Param('name') bankAccount: string,
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.removeBankAccount(req.user.familyId, bankAccount);
  }
}
