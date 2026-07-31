import { PrismaClient } from '@prisma/client';
import { isValidEmailAddress, normalizeUserEmail } from '../src/common/email-address';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true },
  });

  let fixed = 0;
  for (const user of users) {
    if (isValidEmailAddress(user.email)) continue;

    const nextEmail = normalizeUserEmail(user.email, user.username);
    const conflict = await prisma.user.findFirst({
      where: { email: nextEmail, NOT: { id: user.id } },
      select: { id: true },
    });
    const email = conflict ? `${user.id.slice(0, 8)}.${nextEmail}` : nextEmail;

    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    });
    console.log(`Fixed ${user.username}: "${user.email}" -> "${email}"`);
    fixed += 1;
  }

  console.log(fixed ? `Updated ${fixed} user email(s).` : 'All user emails are already valid.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
