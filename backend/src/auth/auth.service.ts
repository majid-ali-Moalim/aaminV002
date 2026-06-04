import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { ALL_PERMISSION_KEYS } from '../access-control/permission-catalog';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private accessControlService: AccessControlService,
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

    // Hardcoded Admin Fallback — must resolve a real DB user id for FK-backed features (audit logs, reports, etc.)
    if (username === 'aamin@admin' && password === '123321@admin') {
      const adminUser = await this.prisma.user.findFirst({
        where: { OR: [{ username: 'aamin@admin' }, { email: 'aamin@admin@aamin.so' }] },
        include: {
          employee: { include: { employeeRole: true } },
          patient: true,
        },
      });
      if (adminUser) {
        this.log(`[AuthService] Hardcoded admin login successful (db user ${adminUser.id})`);
        const { passwordHash, ...result } = adminUser;
        return result;
      }
      this.log(`[AuthService] Hardcoded admin credentials matched but no admin user exists in DB`);
    }

    // Search by username OR email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    this.log(`[AuthService] Password match: ${isPasswordValid}`);
    
    if (isPasswordValid) {
      this.log(`[AuthService] Login successful: ${user.username}`);
      const { passwordHash, ...result } = user;
      return result;
    }
    
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
              employeeRole: user.employee.employeeRole,
            }
          : null,
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
    const payload = {
      username: user.username,
      sub: user.userId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(),
      expiresIn: 900, // 15 minutes
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
    return result;
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
