import { PrismaService } from '../prisma/prisma.service';

export function roleNameToCodePrefix(roleName?: string | null): string | null {
  if (!roleName) return null;
  const n = roleName.toUpperCase();
  if (n.includes('DISPATCH')) return 'DIS';
  if (n.includes('DRIVER')) return 'DR';
  if (n.includes('NURSE')) return 'NUR';
  return null;
}

export async function generateNextEmployeeCode(
  prisma: PrismaService,
  prefix: string,
): Promise<string> {
  const normalizedPrefix = prefix.toUpperCase();
  const employees = await prisma.employee.findMany({
    where: {
      employeeCode: { startsWith: `${normalizedPrefix}-`, mode: 'insensitive' },
    },
    select: { employeeCode: true },
  });

  let max = 0;
  const re = new RegExp(`^${normalizedPrefix}-(\\d+)$`, 'i');
  for (const row of employees) {
    const match = row.employeeCode?.match(re);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  return `${normalizedPrefix}-${String(max + 1).padStart(3, '0')}`;
}
