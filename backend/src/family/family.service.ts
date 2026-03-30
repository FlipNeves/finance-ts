import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Family } from '../schemas/family.schema';
import { User } from '../schemas/user.schema';

@Injectable()
export class FamilyService {
  constructor(
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new Types.ObjectId(id);
  }

  async create(createFamilyDto: any, userId: string): Promise<Family> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.familyId) {
      throw new ConflictException('User already belongs to a family');
    }

    const familyCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const family = await this.familyModel.create({
      ...createFamilyDto,
      familyCode,
    });

    user.familyId = family._id;
    await user.save();

    return family;
  }

  async join(familyCode: string, userId: string): Promise<Family> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.familyId) {
      throw new ConflictException('User already belongs to a family');
    }

    const family = await this.familyModel.findOne({ familyCode }).exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    user.familyId = family._id;
    await user.save();

    return family;
  }

  async leave(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.familyId) {
      return;
    }

    user.familyId = null;
    await user.save();
  }

  async getMembers(familyId: string): Promise<User[]> {
    const objectId = this.toObjectId(familyId);

    return this.userModel
      .find({ familyId: objectId })
      .select('-passwordHash')
      .exec();
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    const user = await this.userModel.findById(memberId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.familyId) {
      throw new NotFoundException('User is not in a family');
    }

    if (user.familyId.toString() !== familyId) {
      throw new NotFoundException('User does not belong to this family');
    }

    user.familyId = null;
    await user.save();
  }

  async addCustomCategory(familyId: string, category: string): Promise<void> {
    const family = await this.familyModel.findById(familyId).exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (!category || !category.trim()) {
      throw new BadRequestException('Invalid category');
    }

    const normalized = category.trim();

    if (!family.customCategories.includes(normalized)) {
      family.customCategories.push(normalized);
      await family.save();
    }
  }
}