import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // 1. Create User
  const user = await prisma.user.create({
    data: {
      username: 'testdriver',
      email: 'driver@test.com',
      passwordHash,
      role: 'EMPLOYEE',
    }
  });

  // 2. Find or create EmployeeRole 'DRIVER'
  let role = await prisma.employeeRole.findFirst({ where: { name: 'DRIVER' }});
  if (!role) {
    role = await prisma.employeeRole.create({ data: { name: 'DRIVER', isActive: true } });
  }

  // 3. Create Employee
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      firstName: 'Test',
      lastName: 'Driver',
      employeeCode: 'DRV-001',
      employeeRoleId: role.id,
      status: 'ACTIVE',
      shiftStatus: 'AVAILABLE'
    }
  });

  console.log('Created driver successfully: driver@test.com / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
