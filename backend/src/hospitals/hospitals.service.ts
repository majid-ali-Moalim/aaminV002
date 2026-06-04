import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateHospitalDto } from './create-hospital.dto';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  private async nextHospitalCode() {
    const year = new Date().getFullYear();
    const prefix = `HSP-${year}-`;
    const latest = await this.prisma.hospital.findFirst({
      where: { hospitalCode: { startsWith: prefix } },
      orderBy: { hospitalCode: 'desc' },
      select: { hospitalCode: true },
    });
    const seq = latest?.hospitalCode
      ? parseInt(latest.hospitalCode.replace(prefix, ''), 10) + 1
      : 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async findAll(filters?: { regionId?: string; districtId?: string }) {
    const where: Prisma.HospitalWhereInput = {};
    if (filters?.regionId) where.regionId = filters.regionId;
    if (filters?.districtId) where.districtId = filters.districtId;

    return this.prisma.hospital.findMany({
      where,
      include: {
        region: true,
        district: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        region: true,
        district: true,
      },
    });

    if (!hospital) throw new NotFoundException('Hospital not found');
    return hospital;
  }

  async createRegistered(dto: CreateHospitalDto) {
    const name = dto.name.trim();
    const primaryPhone = dto.primaryPhone.trim();

    const [nameExists, phoneExists] = await Promise.all([
      this.prisma.hospital.findUnique({ where: { name } }),
      this.prisma.hospital.findUnique({ where: { primaryPhone } }),
    ]);

    if (nameExists) throw new ConflictException('Hospital name already exists');
    if (phoneExists) throw new ConflictException('Primary phone number already registered');

    const hospitalCode = await this.nextHospitalCode();
    const isActive = dto.operationalStatus === 'Active';

    return this.prisma.hospital.create({
      data: {
        hospitalCode,
        name,
        hospitalType: dto.hospitalType,
        ownershipType: dto.ownershipType,
        regionId: dto.regionId,
        districtId: dto.districtId,
        address: dto.address.trim(),
        contactPersonName: dto.contactPersonName.trim(),
        contactPersonRole: dto.contactPersonRole.trim(),
        primaryPhone,
        secondaryPhone: dto.secondaryPhone?.trim() || null,
        emergencyHotline: dto.emergencyHotline.trim(),
        contactNumber: primaryPhone,
        emergencyContact: dto.emergencyHotline.trim(),
        email: dto.email?.trim() || null,
        acceptEmergencyCases: dto.acceptEmergencyCases,
        medicalCapabilities: dto.medicalCapabilities,
        beds: dto.beds ?? 0,
        icuTotalBeds: 0,
        emergencyBeds: 0,
        operationalStatus: dto.operationalStatus,
        isActive,
        erReady: dto.acceptEmergencyCases,
        status: dto.operationalStatus === 'Active' ? 'Available' : dto.operationalStatus,
      },
      include: { region: true, district: true },
    });
  }

  async create(data: any) {
    const { regionId, districtId, ...rest } = data;
    return this.prisma.hospital.create({
      data: {
        ...rest,
        region: regionId ? { connect: { id: regionId } } : undefined,
        district: districtId ? { connect: { id: districtId } } : undefined,
      },
    });
  }

  async update(id: string, data: any) {
    const { regionId, districtId, ...rest } = data;
    const updateData: any = { ...rest };

    if (regionId !== undefined) {
      updateData.region = regionId ? { connect: { id: regionId } } : { disconnect: true };
    }

    if (districtId !== undefined) {
      updateData.district = districtId ? { connect: { id: districtId } } : { disconnect: true };
    }

    return this.prisma.hospital.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.hospital.delete({
      where: { id },
    });
  }
}
