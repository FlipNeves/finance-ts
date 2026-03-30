import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(@Body() createTransactionDto: any, @Req() req: any) {
    return this.transactionsService.create(createTransactionDto, req.user._id, req.user.familyId);
  }

  @Get()
  async findAll(@Req() req: any, @Query() filters: any) {
    return this.transactionsService.findAll(req.user.familyId, filters);
  }

  @Get('categories')
  async getCategories(@Req() req: any) {
    return this.transactionsService.getCategories(req.user.familyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTransactionDto: any) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.transactionsService.remove(id);
  }
}
