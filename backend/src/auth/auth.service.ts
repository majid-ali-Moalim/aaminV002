import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ALL_PERMISSION_KEYS } from '../access-control/permission-catalog';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { MailService } from './mail.service';
import {
  assertPasswordMeetsPolicy,
  generateOtpCode,
  passwordsMatch,
} from './password-policy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private accessControlService: AccessControlService,
    private mailService: MailService,
  ) {}

  private log(message: string) {
    const logPath = path.join(process.cwd(), 'auth.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    console.log(message);
  }

  async validateUser(username: string, password: string): Promise<any> {
    this.log(`[AuthService] Validating user: "${username}"`);
    
    if (!username) {
      this.log(`[AuthService] Username is empty!`);
      return null;
    }

    // Search by username OR email (case-insensitive for email)
    const normalized = username.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: normalized },
          { email: { equals: normalized, mode: 'insensitive' } },
        ],
      },
      include: {
        employee: {
          include: {
            employeeRole: true,
          },
        },
        patient: true,
      },
    });

    if (!user) {
      this.log(`[AuthService] User not found: "${username}"`);
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.log(`[AuthService] Account locked: "${username}"`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    this.log(`[AuthService] Password match: ${isPasswordValid}`);
    
    if (isPasswordValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
      this.log(`[AuthService] Login successful: ${user.username}`);
      const { passwordHash, ...result } = user;
      return result;
    }

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const lockData: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { ...lockData, lastFailedLoginAt: new Date() },
    });
    
    this.log(`[AuthService] Invalid password for: ${user.username}`);
    return null;
  }

  async login(loginDto: any) {
    // Validate user credentials
    const user = await this.validateUser(loginDto.email || loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.EMPLOYEE) {
      if (!user.employee) {
        throw new UnauthorizedException('Employee profile not found');
      }
      if (user.employee.status !== 'ACTIVE') {
        throw new UnauthorizedException('Employee account is inactive. Contact your administrator.');
      }
    }

    const employeeRoleName = user.employee?.employeeRole?.name ?? null;

    const permissions =
      user.role === Role.ADMIN
        ? [...ALL_PERMISSION_KEYS]
        : await this.accessControlService.getPermissionsForAuth(
            user.id,
            user.role,
            employeeRoleName,
          );

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      email: user.email,
      isActive: true,
      employeeRole: employeeRoleName,
      employeeStatus: user.employee?.status ?? null,
      employeeId: user.employee?.id ?? null,
      hospitalId: user.employee?.hospitalId ?? null,
      mustChangePassword: user.mustChangePassword ?? false,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();

    // Log successful login
    this.log(`[AuthService] Login successful: ${user.username} (${user.role}${employeeRoleName ? ` / ${employeeRoleName}` : ''})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.employee?.firstName || user.patient?.firstName || '',
        lastName: user.employee?.lastName || user.patient?.lastName || '',
        role: user.role,
        employeeRole: employeeRoleName,
        permissions,
        isActive: true,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              status: user.employee.status,
              shiftStatus: user.employee.shiftStatus,
              stationId: user.employee.stationId,
              hospitalId: user.employee.hospitalId,
              employeeRole: user.employee.employeeRole,
            }
          : null,
        mustChangePassword: user.mustChangePassword ?? false,
        profile: {
          phone: user.employee?.phone || user.patient?.phone,
          avatar: user.employee?.profilePhoto || user.patient?.avatar,
          department: user.employee?.department,
          licenseNumber: user.employee?.licenseNumber,
          employeeId: user.employee?.employeeCode,
        }
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  async createAccessToken(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      employeeType: user.employee?.employeeType,
    };
    
    return this.jwtService.sign(payload);
  }

  async refreshToken(user: any) {
    const userId = user.userId ?? user.sub ?? user.id;
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { include: { employeeRole: true } } },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    const employeeRoleName = dbUser.employee?.employeeRole?.name ?? null;
    const permissions =
      dbUser.role === Role.ADMIN
        ? [...ALL_PERMISSION_KEYS]
        : await this.accessControlService.getPermissionsForAuth(
            dbUser.id,
            dbUser.role,
            employeeRoleName,
          );

    const payload = {
      username: dbUser.username,
      sub: dbUser.id,
      role: dbUser.role,
      email: dbUser.email,
      isActive: true,
      employeeRole: employeeRoleName,
      employeeStatus: dbUser.employee?.status ?? null,
      employeeId: dbUser.employee?.id ?? null,
      hospitalId: dbUser.employee?.hospitalId ?? null,
      mustChangePassword: dbUser.mustChangePassword ?? false,
      permissions,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(),
      expiresIn: 900,
      permissions,
    };
  }

  async getProfile(userId: string) {
    // Handle hardcoded admin fallback
    if (userId === 'hardcoded-admin-uuid') {
      return {
        id: 'hardcoded-admin-uuid',
        username: 'aamin@admin',
        email: 'aamin@admin',
        role: Role.ADMIN,
        isActive: true,
        employee: null,
        patient: null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            employeeRole: true,
          },
        },
        patient: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...result } = user;
    const permissions =
      user.role === Role.ADMIN
        ? [...ALL_PERMISSION_KEYS]
        : await this.accessControlService.getPermissionsForAuth(
            user.id,
            user.role,
            user.employee?.employeeRole?.name ?? null,
          );

    return {
      ...result,
      permissions,
      activePermissionKeys: permissions,
    };
  }

  async updateMyProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      alternatePhone?: string;
      profilePhoto?: string;
      emergencyContactName?: string;
      emergencyPhone?: string;
    },
  ) {
    if (userId === 'hardcoded-admin-uuid') {
      throw new BadRequestException(
        'This session cannot update profile. Sign in with your database admin account.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let employeeId = user.employee?.id;

    if (!employeeId && user.role === Role.ADMIN) {
      const [adminRole, adminDept] = await Promise.all([
        this.prisma.employeeRole.findFirst({ where: { name: 'Administrator' } }),
        this.prisma.department.findFirst({ where: { name: 'Administration' } }),
      ]);

      const created = await this.prisma.employee.create({
        data: {
          userId: user.id,
          firstName: data.firstName?.trim() || 'System',
          lastName: data.lastName?.trim() || 'Admin',
          status: 'ACTIVE',
          employeeRoleId: adminRole?.id ?? undefined,
          departmentId: adminDept?.id ?? undefined,
        },
      });
      employeeId = created.id;
    }

    if (!employeeId) {
      throw new BadRequestException(
        'No staff profile is linked to this account. Contact your administrator.',
      );
    }

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(typeof data.firstName === 'string' && { firstName: data.firstName.trim() }),
        ...(typeof data.lastName === 'string' && { lastName: data.lastName.trim() }),
        ...(typeof data.phone === 'string' && { phone: data.phone.trim() }),
        ...(typeof data.alternatePhone === 'string' && { alternatePhone: data.alternatePhone.trim() }),
        ...(typeof data.profilePhoto === 'string' && { profilePhoto: data.profilePhoto.trim() }),
        ...(typeof data.emergencyContactName === 'string' && {
          emergencyContactName: data.emergencyContactName.trim(),
        }),
        ...(typeof data.emergencyPhone === 'string' && { emergencyPhone: data.emergencyPhone.trim() }),
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        employeeRole: true,
        department: true,
        station: true,
      },
    });
  }

  async logout(userId: string) {
    // In a real implementation, you would invalidate the refresh token
    // For now, we'll just log the logout
    this.log(`[AuthService] User logged out: ${userId}`);
    
    return {
      message: 'Logout successful',
      success: true,
    };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string; confirmPassword: string },
    ipAddress?: string,
  ) {
    if (userId === 'hardcoded-admin-uuid') {
      throw new BadRequestException(
        'This session cannot change password. Sign in with your database admin account.',
      );
    }

    if (!passwordsMatch(dto.newPassword, dto.confirmPassword)) {
      throw new BadRequestException('Passwords do not match.');
    }

    if (passwordsMatch(dto.currentPassword, dto.newPassword)) {
      throw new BadRequestException('New password cannot be the same as your current password.');
    }

    assertPasswordMeetsPolicy(dto.newPassword);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const now = new Date();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        lastPasswordChangedAt: now,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.logSecurityAudit(user.id, user.username, 'PASSWORD_CHANGED', ipAddress);

    this.log(`[AuthService] Password changed for ${user.username}`);
    return { message: 'Password updated successfully.', success: true };
  }

  async getSecurityActivity(userId: string) {
    if (userId === 'hardcoded-admin-uuid') {
      return {
        lastPasswordChangedAt: null,
        lastLoginAt: null,
        lastFailedLoginAt: null,
        activeSessionsCount: 1,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastPasswordChangedAt: true,
        lastLoginAt: true,
        lastFailedLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      lastPasswordChangedAt: user.lastPasswordChangedAt,
      lastLoginAt: user.lastLoginAt,
      lastFailedLoginAt: user.lastFailedLoginAt,
      activeSessionsCount: 1,
    };
  }

  private async logSecurityAudit(
    userId: string,
    username: string,
    action: string,
    ipAddress?: string,
  ) {
    await this.prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType: 'User',
        entityId: userId,
        metadata: {
          username,
          ipAddress: ipAddress ?? null,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (user) {
      const otp = generateOtpCode();
      const otpHash = await bcrypt.hash(otp, 10);
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetOtpHash: otpHash,
          passwordResetOtpExpires: expires,
          passwordResetOtpAttempts: 0,
          passwordResetVerifiedUntil: null,
          passwordResetTokenHash: null,
          passwordResetExpires: null,
        },
      });

      await this.mailService.sendPasswordResetOtpEmail(user.email, otp);
      this.log(`[AuthService] Password reset OTP sent to ${user.email}`);
    }

    return {
      message:
        'If an account exists for that email, a verification code has been sent.',
      success: true,
    };
  }

  async verifyResetOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpires) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    if (user.passwordResetOtpExpires <= new Date()) {
      throw new BadRequestException('Verification code has expired. Request a new code.');
    }

    if ((user.passwordResetOtpAttempts ?? 0) >= 3) {
      throw new BadRequestException('Too many failed attempts. Request a new verification code.');
    }

    const otpValid = await bcrypt.compare(otp.trim(), user.passwordResetOtpHash);
    if (!otpValid) {
      const attempts = (user.passwordResetOtpAttempts ?? 0) + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetOtpAttempts: attempts },
      });
      const remaining = Math.max(0, 3 - attempts);
      throw new BadRequestException(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Request a new verification code.',
      );
    }

    const verifiedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtpHash: null,
        passwordResetOtpExpires: null,
        passwordResetOtpAttempts: 0,
        passwordResetVerifiedUntil: verifiedUntil,
      },
    });

    return { message: 'Verification successful. You may now set a new password.', success: true };
  }

  async resetPassword(
    email: string,
    password: string,
    confirmPassword: string,
    ipAddress?: string,
  ) {
    if (!passwordsMatch(password, confirmPassword)) {
      throw new BadRequestException('Passwords do not match.');
    }

    assertPasswordMeetsPolicy(password);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user || !user.passwordResetVerifiedUntil || user.passwordResetVerifiedUntil <= new Date()) {
      throw new BadRequestException('Verification expired. Start the password reset process again.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetVerifiedUntil: null,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        passwordResetOtpHash: null,
        passwordResetOtpExpires: null,
        passwordResetOtpAttempts: 0,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        lastPasswordChangedAt: now,
      },
    });

    await this.logSecurityAudit(user.id, user.username, 'PASSWORD_CHANGED', ipAddress);

    this.log(`[AuthService] Password reset completed for ${user.email}`);
    return { message: 'Password updated successfully.', success: true };
  }

  private generateRefreshToken(): string {
    // Generate a random refresh token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
