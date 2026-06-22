import { PrismaClient, EmergencyRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Driver Data...');

  // 1. Get Master Data
  const driverRole = await prisma.employeeRole.findFirst({ where: { name: 'Driver' } });
  const dispatchDept = await prisma.department.findFirst({ where: { name: 'Dispatch Operations' } });
  const fieldDept = await prisma.department.findFirst({ where: { name: 'Field Emergency' } });
  const stations = await prisma.station.findMany();
  const ambulances = await prisma.ambulance.findMany();

  if (!driverRole || !fieldDept || stations.length === 0) {
    console.error('Missing required master data. Please run main seed first.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const driverNames = [
    { first: 'Mohamed', last: 'Ali', code: 'DRV-1001', phone: '+252 61 1234567' },
    { first: 'Hamza', last: 'Hassan', code: 'DRV-1002', phone: '+252 61 7654321' },
    { first: 'Abdirahman', last: 'Nur', code: 'DRV-1003', phone: '+252 61 9876543' },
    { first: 'Yusuf', last: 'Abdulle', code: 'DRV-1004', phone: '+252 61 4567890' },
    { first: 'Amina', last: 'Hassan', code: 'DRV-1005', phone: '+252 61 1122334' },
  ];

  for (let i = 0; i < driverNames.length; i++) {
    const d = driverNames[i];
    const username = d.first.toLowerCase() + '_driver';
    
    const employee = await prisma.employee.upsert({
      where: { employeeCode: d.code },
      update: {},
      create: {
        employeeCode: d.code,
        firstName: d.first,
        lastName: d.last,
        phone: d.phone,
        status: 'ACTIVE',
        shiftStatus: i === 0 ? 'AVAILABLE' : i === 1 ? 'ON_DUTY' : i === 2 ? 'ON_BREAK' : 'OFF_DUTY',
        employeeRole: { connect: { id: driverRole.id } },
        department: { connect: { id: fieldDept.id } },
        station: { connect: { id: stations[i % stations.length].id } },
        assignedAmbulance: ambulances[i % ambulances.length]?.id ? { connect: { id: ambulances[i % ambulances.length].id } } : undefined,
        licenseNumber: `SOM-${2020 + i}-DL-${String(10000 + i).slice(1)}`,
        licenseClass: i % 3 === 0 ? 'B' : i % 3 === 1 ? 'C' : 'D',
        licenseType: i % 3 === 0 ? 'Class B' : i % 3 === 1 ? 'Class C' : 'Class D',
        licenseIssueDate: new Date('2021-06-01'),
        licenseExpiryDate: i === 3 ? new Date('2024-06-15') : new Date('2026-06-01'),
        licenseStatus: i === 3 ? 'EXPIRING' : 'VALID',
        medicalFitness: 'FIT',
        user: {
          create: {
            username,
            email: `${username}@aamin.so`,
            passwordHash,
            role: 'EMPLOYEE',
          }
        }
      }
    });

    // 2. Add some shift records
    await prisma.shiftRecord.create({
      data: {
        employeeId: employee.id,
        status: employee.shiftStatus,
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        notes: 'Morning shift start'
      }
    });

    // 3. Add some attendance records for the last 3 days
    for (let j = 0; j < 3; j++) {
      const date = new Date();
      date.setDate(date.getDate() - j);
      date.setHours(0, 0, 0, 0);

      const checkIn = new Date(date);
      checkIn.setHours(8, Math.floor(Math.random() * 30), 0); // Around 8:00 - 8:30 AM

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: date
          }
        },
        update: {},
        create: {
          employeeId: employee.id,
          date: date,
          checkIn: checkIn,
          checkOut: new Date(new Date(checkIn).getTime() + 8 * 60 * 60 * 1000), // 8 hours later
          status: checkIn.getHours() === 8 && checkIn.getMinutes() < 15 ? 'ON_TIME' : 'LATE',
          notes: 'Regular duty'
        }
      });
    }

    // 4. Add some completed missions for performance stats
    if (i < 3) {
        // Create a dummy patient if not exists for stats
        const patient = await prisma.patient.findFirst();
        if (patient) {
            for (let m = 0; m < 5 + i; m++) {
                await prisma.emergencyRequest.create({
                    data: {
                        trackingCode: `STAT-${employee.employeeCode}-${m}`,
                        patientId: patient.id,
                        driverId: employee.id,
                        ambulanceId: employee.assignedAmbulanceId,
                        status: EmergencyRequestStatus.COMPLETED,
                        pickupLocation: 'Mock Location',
                        responseMinutes: 8 + Math.floor(Math.random() * 10),
                        completedAt: new Date()
                    }
                });
            }
        }
    }
  }

  console.log('Driver seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
