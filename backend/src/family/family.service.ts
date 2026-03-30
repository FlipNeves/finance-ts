import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
    const user = await this.userModel.findById(userId).exec();
    if (user.familyId) {
      throw new ConflictException('User already belongs to a family');
    }

    const familyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const family = await this.familyModel.create({
      ...createFamilyDto,
      familyCode,
    });

    user.familyId = family._id as string;
    await user.save();

    return family;
  }

  async join(familyCode: string, userId: string): Promise<Family> {
    const user = await this.userModel.findById(userId).exec();
    
    const family = await this.familyModel.findOne({ familyCode }).exec();
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    user.familyId = family._id as string;
    await user.save();

    return family;
  }

  async leave(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.familyId = null;
    await user.save();
  }

  async getMembers(familyId: string): Promise<User[]> {
    return this.userModel.find({ familyId }).select('-passwordHash').exec();
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    const user = await this.userModel.findById(memberId).exec();
    if (!user || user.familyId !== familyId) {
      throw new NotFoundException('Member not found in this family');
    }
    user.familyId = null;
    await user.save();
  }

  async addCustomCategory(familyId: string, category: string): Promise<void> {
    const family = await this.familyModel.findById(familyId).exec();
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    family.customCategories.push(category);
    await family.save();
  }
}
