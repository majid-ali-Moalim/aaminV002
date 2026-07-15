import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('contacts')
  getContacts(@CurrentUser() user: any) {
    return this.chatService.getContacts(user.id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.getUnreadCount(user.id);
  }

  @Get('messages/:userId')
  getMessages(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.getMessages(user.id, userId);
  }

  @Post('messages')
  sendMessage(
    @CurrentUser() user: any,
    @Body()
    body: {
      recipientId: string;
      content?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
      attachmentSize?: number;
    },
  ) {
    return this.chatService.sendMessage(user.id, body.recipientId, body.content ?? '', {
      url: body.attachmentUrl,
      name: body.attachmentName,
      type: body.attachmentType,
      size: body.attachmentSize,
    });
  }

  @Patch('messages/:id')
  editMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.chatService.editMessage(user.id, id, body.content);
  }

  @Delete('messages/:id')
  deleteMessage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.chatService.deleteMessage(user.id, id);
  }

  @Patch('messages/:userId/read')
  markRead(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.chatService.markRead(user.id, userId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const uploadDir = join(process.cwd(), 'uploads', 'chat');
          mkdirSync(uploadDir, { recursive: true });
          callback(null, uploadDir);
        },
        filename: (_req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `chat-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return {
      url: `/uploads/chat/${file.filename}`,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    };
  }
}
