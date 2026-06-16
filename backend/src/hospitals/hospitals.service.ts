import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateHospitalDto } from './create-hospital.dto';
import * as bcrypt from 'bcrypt';

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

  private async ensureHospitalRole(roleName: string) {
    const existing = await this.prisma.employeeRole.findFirst({
      where: { name: { equals: roleName, mode: 'insensitive' } },
    });
    if (existing) return existing;
    return this.prisma.employeeRole.create({
      data: { name: roleName, description: 'Hospital portal staff' },
    });
  }

  async findAll(filters?: { regionId?: string; districtId?: string; emergencyOnly?: boolean }) {
    const where: Prisma.HospitalWhereInput = {};
    if (filters?.regionId) where.regionId = filters.regionId;
    if (filters?.districtId) where.districtId = filters.districtId;
    if (filters?.emergencyOnly) {
      where.acceptEmergencyCases = true;
      where.isActive = true;
      where.operationalStatus = 'Active';
    }

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
    const accountUsername = dto.accountUsername.trim();
    const accountEmail = dto.accountEmail.trim().toLowerCase();

    const [nameExists, phoneExists, userExists, emailExists] = await Promise.all([
      this.prisma.hospital.findUnique({ where: { name } }),
      this.prisma.hospital.findUnique({ where: { primaryPhone } }),
      this.prisma.user.findUnique({ where: { username: accountUsername } }),
      this.prisma.user.findUnique({ where: { email: accountEmail } }),
    ]);

    if (nameExists) throw new ConflictException('Hospital name already exists');
    if (phoneExists) throw new ConflictException('Primary phone number already registered');
    if (userExists) throw new ConflictException('Username already taken');
    if (emailExists) throw new ConflictException('Account email already registered');

    const emergencyShortCode = dto.emergencyShortCode?.trim() || null;
    const emergencyHotline = dto.emergencyHotline?.trim() || null;
    if (!emergencyShortCode && !emergencyHotline) {
      throw new BadRequestException(
        'Provide an emergency short code (e.g. 999) and/or a full emergency hotline number',
      );
    }
    const emergencyContact = emergencyHotline || emergencyShortCode!;

    const hospitalCode = await this.nextHospitalCode();
    const isActive = dto.operationalStatus === 'Active';
    const employeeStatus =
      dto.accountStatus === 'Suspended'
        ? 'INACTIVE'
        : dto.accountStatus === 'Pending Activation'
          ? 'PENDING'
          : 'ACTIVE';

    const roleName = dto.hospitalRole || 'Hospital Coordinator';
    const employeeRole = await this.ensureHospitalRole(roleName);
    const passwordHash = await bcrypt.hash(dto.accountPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
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
          emergencyShortCode,
          emergencyHotline,
          contactNumber: primaryPhone,
          emergencyContact,
          email: dto.email.trim(),
          website: dto.website?.trim() || null,
          acceptEmergencyCases: dto.acceptEmergencyCases,
          medicalCapabilities: dto.medicalCapabilities,
          beds: dto.beds ?? 0,
          icuTotalBeds: dto.icuTotalBeds ?? 0,
          emergencyBeds: dto.emergencyBeds ?? 0,
          operatingRooms: dto.operatingRooms ?? 0,
          ambulanceReceptionCapacity: dto.ambulanceReceptionCapacity ?? 0,
          capacityStatus: dto.capacityStatus ?? 'Available',
          available24_7: dto.available24_7 ?? true,
          acceptAmbulanceTransfers: dto.acceptAmbulanceTransfers ?? true,
          acceptWalkInPatients: dto.acceptWalkInPatients ?? true,
          operationalStatus: dto.operationalStatus,
          isActive,
          erReady: dto.acceptEmergencyCases,
          status: dto.capacityStatus ?? 'Available',
          availabilityStatus: dto.capacityStatus ?? 'Available',
        },
        include: { region: true, district: true },
      });

      const user = await tx.user.create({
        data: {
          username: accountUsername,
          email: accountEmail,
          passwordHash,
          role: Role.EMPLOYEE,
          mustChangePassword: dto.forcePasswordChange ?? true,
        },
      });

      const [firstName, ...rest] = dto.contactPersonName.trim().split(/\s+/);
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName: firstName || dto.contactPersonName,
          lastName: rest.join(' ') || null,
          phone: primaryPhone,
          status: employeeStatus,
          employeeRoleId: employeeRole.id,
          hospitalId: hospital.id,
        },
      });

      return {
        ...hospital,
        portalAccount: {
          userId: user.id,
          employeeId: employee.id,
          username: user.username,
          email: user.email,
          role: roleName,
          mustChangePassword: user.mustChangePassword,
        },
      };
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
