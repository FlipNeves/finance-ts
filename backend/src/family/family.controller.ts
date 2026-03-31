import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    _id: string;
    familyId: string;
  };
}

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

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
   * Endpoint to remove a member from the family group.
   */
  @Delete('members/:id')
  async removeMember(
    @Param('id') memberId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.familyService.removeMember(req.user.familyId, memberId);
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
