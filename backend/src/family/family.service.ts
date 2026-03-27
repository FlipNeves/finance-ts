import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family } from '../schemas/family.schema';
import { User } from '../schemas/user.schema';

@Injectable()
export class FamilyService {
  constructor(
    @InjectModel(Family.name) private familyModel: Model<Family>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createFamilyDto: any, userId: string): Promise<Family> {
    throw new Error('Not implemented');
  }

  async join(familyCode: string, userId: string): Promise<Family> {
    throw new Error('Not implemented');
  }

  async leave(userId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getMembers(familyId: string): Promise<User[]> {
    throw new Error('Not implemented');
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async addCustomCategory(familyId: string, category: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
