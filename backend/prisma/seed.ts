import { PrismaClient, Role, AmbulanceStatus, BloodType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Master Data...');

  // 1. Regions
  const banadir = await prisma.region.upsert({
    where: { name: 'Banadir' },
    update: {},
    create: { name: 'Banadir', code: 'BN' },
  });

  // 2. Districts
  const hodan = await prisma.district.upsert({
    where: { name_regionId: { name: 'Hodan', regionId: banadir.id } },
    update: {},
    create: { name: 'Hodan', regionId: banadir.id },
  });



  // 3. Departments
  const depts = ['Dispatch Operations', 'Field Emergency', 'Medical Response', 'Logistics', 'Administration'];
  const departmentRecords = await Promise.all(
    depts.map(name => prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    }))
  );

  // 4. Employee Roles
  const roles = ['Dispatcher', 'Driver', 'Nurse', 'Administrator'];
  const roleRecords = await Promise.all(
    roles.map(name => prisma.employeeRole.upsert({
      where: { name },
      update: {},
      create: { name }
    }))
  );

  // 5. Equipment Levels
  const levels = ['Basic', 'Standard', 'Advanced', 'Critical Care'];
  const levelRecords = await Promise.all(
    levels.map(name => prisma.equipmentLevel.upsert({
      where: { name },
      update: {},
      create: { name }
    }))
  );

  // 6. Incident Categories
  const categories = ['Accident', 'Medical', 'Pregnancy', 'Trauma', 'Cardiac', 'Fire Incident', 'Violence'];
  await Promise.all(
    categories.map(name => prisma.incidentCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    }))
  );

  // 7. Stations
  const mainStation = await prisma.station.upsert({
    where: { name_districtId: { name: 'Main HQ', districtId: hodan.id } },
    update: {},
    create: { 
      name: 'Main HQ', 
      districtId: hodan.id, 
      regionId: banadir.id,
      address: 'Near Central Hospital',
      phone: '+252 61 0000000'
    },
  });

  // 8. Admin User
  const adminEmail = 'majidalimoalim@gmail.com';
  const adminPasswordHash = await bcrypt.hash('123321@admin', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      username: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
    create: {
      username: adminEmail,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  // Create Admin Employee Profile
  const adminRole = roleRecords.find(r => r.name === 'Administrator');
  const adminDept = departmentRecords.find(d => d.name === 'Administration');
  
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {
      firstName: 'Majid',
      lastName: 'Ali',
      status: 'ACTIVE',
      employeeRoleId: adminRole?.id,
      departmentId: adminDept?.id,
      stationId: mainStation.id,
    },
    create: {
      userId: adminUser.id,
      firstName: 'Majid',
      lastName: 'Ali',
      status: 'ACTIVE',
      employeeRoleId: adminRole?.id,
      departmentId: adminDept?.id,
      stationId: mainStation.id
    }
  });

  // 9. Ambulances
  const advLevel = levelRecords.find(l => l.name === 'Advanced');
  const stdLevel = levelRecords.find(l => l.name === 'Standard');

  await prisma.ambulance.upsert({
    where: { ambulanceNumber: 'AMB-001' },
    update: {},
    create: {
      ambulanceNumber: 'AMB-001',
      plateNumber: 'SO-1001',
      status: AmbulanceStatus.AVAILABLE,
      location: 'Mogadishu Central Hospital',
      regionId: banadir.id,
      districtId: hodan.id,
      stationId: mainStation.id,
      equipmentLevelId: advLevel?.id
    },
  });

  await prisma.ambulance.upsert({
    where: { ambulanceNumber: 'AMB-002' },
    update: {},
    create: {
      ambulanceNumber: 'AMB-002',
      plateNumber: 'SO-1002',
      status: AmbulanceStatus.ON_DUTY,
      location: 'Hodan District',
      regionId: banadir.id,
      districtId: hodan.id,
      stationId: mainStation.id,
      equipmentLevelId: stdLevel?.id
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
