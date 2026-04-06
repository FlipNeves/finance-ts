import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
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

    let familyCode = '';
    let isUnique = false;
    while (!isUnique) {
      familyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await this.familyModel.findOne({ familyCode }).exec();
      if (!existing) isUnique = true;
    }

    const family = await this.familyModel.create({
      ...createFamilyDto,
      familyCode,
      owner: this.toObjectId(userId),
      pendingMembers: [],
    });

    user.familyId = family._id;
    await user.save();

    return family;
  }

  async join(familyCode: string, userId: string): Promise<void> {
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

    const userObjId = this.toObjectId(userId);

    if (family.pendingMembers.some(id => id.toString() === userObjId.toString())) {
      throw new ConflictException('Join request already pending');
    }

    family.pendingMembers.push(userObjId);
    await family.save();
  }

  async approveMember(familyId: string, ownerId: string, memberId: string): Promise<void> {
    const family = await this.familyModel.findById(familyId).exec();
    if (!family) throw new NotFoundException('Family not found');

    if (family.owner.toString() !== ownerId) {
      throw new ForbiddenException('Only family owner can approve members');
    }

    const memberObjId = this.toObjectId(memberId);
    const index = family.pendingMembers.findIndex(id => id.toString() === memberObjId.toString());

    if (index === -1) {
      throw new NotFoundException('User not in pending list');
    }

    const user = await this.userModel.findById(memberId).exec();
    if (!user) throw new NotFoundException('User not found');

    // Remove from pending
    family.pendingMembers.splice(index, 1);
    await family.save();

    // Assign family
    user.familyId = family._id;
    await user.save();
  }

  async rejectMember(familyId: string, ownerId: string, memberId: string): Promise<void> {
    const family = await this.familyModel.findById(familyId).exec();
    if (!family) throw new NotFoundException('Family not found');

    if (family.owner.toString() !== ownerId) {
      throw new ForbiddenException('Only family owner can reject members');
    }

    const memberObjId = this.toObjectId(memberId);
    const index = family.pendingMembers.findIndex(id => id.toString() === memberObjId.toString());

    if (index === -1) {
      throw new NotFoundException('User not in pending list');
    }

    family.pendingMembers.splice(index, 1);
    await family.save();
  }

  async getPendingMembers(familyId: string, ownerId: string): Promise<User[]> {
    const family = await this.familyModel.findById(familyId).exec();
    if (!family) throw new NotFoundException('Family not found');

    if (family.owner.toString() !== ownerId) {
      throw new ForbiddenException('Only family owner can view pending members');
    }

    return this.userModel.find({
      _id: { $in: family.pendingMembers }
    }).select('-passwordHash').exec();
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

  async removeMember(familyId: string, ownerId: string, memberId: string): Promise<void> {
    const family = await this.familyModel.findById(familyId).exec();
    if (!family) throw new NotFoundException('Family not found');

    if (family.owner.toString() !== ownerId && ownerId !== memberId) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    const user = await this.userModel.findById(memberId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (!user.familyId || user.familyId.toString() !== familyId) {
      throw new NotFoundException('User does not belong to this family');
    }

    user.familyId = null;
    await user.save();
  }

  async addCustomCategory(familyId: string, category: string): Promise<Family> {
    if (!familyId) {
      throw new BadRequestException('User does not belong to a family');
    }

    const family = await this.familyModel.findById(familyId).exec();

    if (!family) {
      throw new NotFoundException(`Family with ID ${familyId} not found`);
    }

    if (!category || !category.trim()) {
      throw new BadRequestException('Invalid category');
    }

    const normalized = category.trim();

    if (!family.customCategories.includes(normalized)) {
      family.customCategories.push(normalized);
      await family.save();
    }

    return family;
  }

  async addBankAccount(familyId: string, bankAccount: string): Promise<Family> {
    const family = await this.familyModel.findById(familyId).exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (!bankAccount || !bankAccount.trim()) {
      throw new BadRequestException('Invalid bank account name');
    }

    const normalized = bankAccount.trim();

    if (!family.bankAccounts.includes(normalized)) {
      family.bankAccounts.push(normalized);
      await family.save();
    }

    return family;
  }

  async removeBankAccount(familyId: string, bankAccount: string): Promise<Family> {
    const family = await this.familyModel.findById(familyId).exec();

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const index = family.bankAccounts.indexOf(bankAccount);
    if (index > -1) {
      family.bankAccounts.splice(index, 1);
      await family.save();
    }

    return family;
  }

  async joinByInviteCode(inviteCode: string, userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.familyId) {
      throw new ConflictException('User already belongs to a family');
    }

    const inviteOwner = await this.userModel.findOne({ inviteCode }).exec();
    if (!inviteOwner) {
      throw new NotFoundException('Invalid invite code');
    }

    if (!inviteOwner.familyId) {
      throw new BadRequestException('The owner of this invite code does not have a family yet');
    }

    const family = await this.familyModel.findById(inviteOwner.familyId).exec();
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const userObjId = this.toObjectId(userId);

    if (family.pendingMembers.some(id => id.toString() === userObjId.toString())) {
      throw new ConflictException('Join request already pending');
    }

    const existingMember = await this.userModel.findOne({
      _id: userObjId,
      familyId: family._id,
    }).exec();
    if (existingMember) {
      throw new ConflictException('User is already a member of this family');
    }

    family.pendingMembers.push(userObjId);
    await family.save();
  }
}
