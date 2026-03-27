import { Controller, Post, Get, Body, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { FamilyService } from './family.service';

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  async create(@Body() createFamilyDto: any, @Req() req: any) {
    throw new Error('Not implemented');
  }

  @Post('join/:code')
  async join(@Param('code') code: string, @Req() req: any) {
    throw new Error('Not implemented');
  }

  @Post('leave')
  async leave(@Req() req: any) {
    throw new Error('Not implemented');
  }

  @Get('members')
  async getMembers(@Req() req: any) {
    throw new Error('Not implemented');
  }

  @Delete('members/:id')
  async removeMember(@Param('id') memberId: string, @Req() req: any) {
    throw new Error('Not implemented');
  }

  @Post('categories')
  async addCategory(@Body('category') category: string, @Req() req: any) {
    throw new Error('Not implemented');
  }
}
