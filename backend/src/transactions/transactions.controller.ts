import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { StatementImportService } from './statement-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly statementImportService: StatementImportService,
  ) {}

  private getFamilyId(req: any): string | null {
    const familyId = req.user.familyId;
    if (!familyId) return null;
    return familyId.toString();
  }

  @Post()
  async create(@Body() createTransactionDto: any, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.transactionsService.create(
      createTransactionDto,
      req.user._id,
      familyId,
    );
  }

  @Get()
  async findAll(@Req() req: any, @Query() filters: any) {
    const familyId = this.getFamilyId(req);
    return this.transactionsService.findAll(familyId, req.user._id, filters);
  }

  @Get('categories')
  async getCategories(@Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.transactionsService.getCategories(familyId, req.user._id);
  }

  @Get('bank-accounts')
  async getBankAccounts(@Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.transactionsService.getBankAccounts(familyId, req.user._id);
  }

  @Post('import/preview')
  async importPreview(@Body() body: any, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.statementImportService.preview(
      body?.csv,
      req.user._id,
      familyId,
      body?.bankAccount,
    );
  }

  @Post('import/commit')
  async importCommit(@Body() body: any, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.statementImportService.commit(
      body?.rows,
      req.user._id,
      familyId,
    );
  }

  @Delete('import/:batchId')
  async importUndo(@Param('batchId') batchId: string, @Req() req: any) {
    const familyId = this.getFamilyId(req);
    return this.statementImportService.undoBatch(
      batchId,
      req.user._id,
      familyId,
    );
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
