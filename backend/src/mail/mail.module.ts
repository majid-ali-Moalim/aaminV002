import { Module } from '@nestjs/common';
import { MailService } from '../auth/mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
