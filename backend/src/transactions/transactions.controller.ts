import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(@Body() createTransactionDto: any, @Req() req: any) {
    throw new Error('Not implemented');
  }

  @Get()
  async findAll(@Req() req: any, @Query() filters: any) {
    throw new Error('Not implemented');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    throw new Error('Not implemented');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTransactionDto: any) {
    throw new Error('Not implemented');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    throw new Error('Not implemented');
  }

  @Get('categories')
  async getCategories(@Req() req: any) {
    throw new Error('Not implemented');
  }
}
