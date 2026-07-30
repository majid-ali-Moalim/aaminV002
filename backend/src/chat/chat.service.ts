import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import {
  buildCaseAssignmentMeta,
  compareChatContacts,
  roleCategoryFromName,
} from './chat-contact-context';

type UserWithProfile = {
  id: string;
  username: string;
  role: string;
  employee: {
    firstName: string | null;
    lastName: string | null;
    profilePhoto: string | null;
    employeeRole: { name: string } | null;
  } | null;
};

const CHATABLE_ROLES = ['ADMIN', 'EMPLOYEE'];

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private gateway: ChatGateway,
  ) {}

  private displayInfo(user: UserWithProfile) {
    const emp = user.employee;
    const name =
      (emp ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() : '') || user.username;
    const role =
      emp?.employeeRole?.name ||
      (user.role === 'ADMIN' ? 'Administrator' : user.role === 'EMPLOYEE' ? 'Staff' : user.role);
    return {
      userId: user.id,
      name,
      role,
      roleCategory: roleCategoryFromName(role),
      avatar: emp?.profilePhoto ?? null,
    };
  }

  private messageDto(m: {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | null;
    readAt: Date | null;
    editedAt?: Date | null;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      content: m.content,
      attachmentUrl: m.attachmentUrl ?? null,
      attachmentName: m.attachmentName ?? null,
      attachmentType: m.attachmentType ?? null,
      attachmentSize: m.attachmentSize ?? null,
      readAt: m.readAt,
      editedAt: m.editedAt ?? null,
      createdAt: m.createdAt,
    };
  }

  /** All chatable users (staff + admins) with last-message preview + unread count. */
  async getContacts(currentUserId: string) {
    const assignmentMeta = await buildCaseAssignmentMeta(this.prisma, currentUserId);

    const users = (await this.prisma.user.findMany({
      where: { id: { not: currentUserId }, role: { in: CHATABLE_ROLES as any } },
      select: {
        id: true,
        username: true,
        role: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            profilePhoto: true,
            employeeRole: { select: { name: true } },
          },
        },
      },
    })) as UserWithProfile[];

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        deletedAt: null,
        OR: [{ senderId: currentUserId }, { recipientId: currentUserId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const lastByUser = new Map<string, (typeof messages)[number]>();
    const unreadByUser = new Map<string, number>();
    for (const m of messages) {
      const otherId = m.senderId === currentUserId ? m.recipientId : m.senderId;
      if (!lastByUser.has(otherId)) lastByUser.set(otherId, m);
      if (m.recipientId === currentUserId && !m.readAt) {
        unreadByUser.set(otherId, (unreadByUser.get(otherId) ?? 0) + 1);
      }
    }

    const contacts = users.map((u) => {
      const info = this.displayInfo(u);
      const assignment = assignmentMeta.get(u.id);
      const last = lastByUser.get(u.id);
      const preview = last
        ? last.content?.trim()
          ? last.content
          : last.attachmentUrl
            ? `📎 ${last.attachmentName || 'Attachment'}`
            : null
        : null;
      return {
        ...info,
        online: this.gateway.isOnline(u.id),
        lastMessage: preview,
        lastMessageAt: last?.createdAt ?? null,
        lastMessageFromMe: last ? last.senderId === currentUserId : false,
        unreadCount: unreadByUser.get(u.id) ?? 0,
        relationship: assignment?.relationship ?? null,
        isPrimaryContact: assignment?.isPrimaryContact ?? false,
        caseTrackingCode: assignment?.caseTrackingCode ?? null,
        caseId: assignment?.caseId ?? null,
        sortPriority: assignment?.sortPriority ?? 99,
      };
    });

    contacts.sort(compareChatContacts);

    return contacts;
  }

  async getMessages(currentUserId: string, otherUserId: string) {
    const other = (await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        username: true,
        role: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            profilePhoto: true,
            employeeRole: { select: { name: true } },
          },
        },
      },
    })) as UserWithProfile | null;

    if (!other) throw new NotFoundException('User not found');

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        deletedAt: null,
        OR: [
          { senderId: currentUserId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    await this.markRead(currentUserId, otherUserId);

    return {
      contact: { ...this.displayInfo(other), online: this.gateway.isOnline(other.id) },
      messages: messages.map((m) => this.messageDto(m)),
    };
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    attachment?: {
      url?: string | null;
      name?: string | null;
      type?: string | null;
      size?: number | null;
    },
  ) {
    const text = (content ?? '').trim();
    const hasAttachment = !!attachment?.url;
    if (!text && !hasAttachment) {
      throw new BadRequestException('Message content or attachment is required');
    }
    if (recipientId === senderId) throw new BadRequestException('Cannot message yourself');

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const created = await this.prisma.chatMessage.create({
      data: {
        senderId,
        recipientId,
        content: text,
        attachmentUrl: attachment?.url ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentType: attachment?.type ?? null,
        attachmentSize: attachment?.size ?? null,
      },
    });
    const dto = this.messageDto(created);

    // Enrich the live payload with sender identity so the receiver can be alerted
    const sender = (await this.prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        username: true,
        role: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            profilePhoto: true,
            employeeRole: { select: { name: true } },
          },
        },
      },
    })) as UserWithProfile | null;
    const senderInfo = sender ? this.displayInfo(sender) : null;
    const payload = {
      ...dto,
      senderName: senderInfo?.name ?? null,
      senderRole: senderInfo?.role ?? null,
      senderAvatar: senderInfo?.avatar ?? null,
    };

    // Real-time push to both participants (recipient + sender's other tabs)
    this.gateway.emitToUser(recipientId, 'chat:message', payload);
    this.gateway.emitToUser(senderId, 'chat:message', payload);

    return dto;
  }

  async editMessage(currentUserId: string, messageId: string, content: string) {
    const text = (content ?? '').trim();
    if (!text) throw new BadRequestException('Message content is required');

    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== currentUserId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: text, editedAt: new Date() },
    });
    const dto = this.messageDto(updated);

    this.gateway.emitToUser(message.recipientId, 'chat:updated', dto);
    this.gateway.emitToUser(message.senderId, 'chat:updated', dto);
    return dto;
  }

  async deleteMessage(currentUserId: string, messageId: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    const payload = { id: messageId, senderId: message.senderId, recipientId: message.recipientId };
    this.gateway.emitToUser(message.recipientId, 'chat:deleted', payload);
    this.gateway.emitToUser(message.senderId, 'chat:deleted', payload);
    return { id: messageId };
  }

  async markRead(currentUserId: string, otherUserId: string) {
    const result = await this.prisma.chatMessage.updateMany({
      where: { senderId: otherUserId, recipientId: currentUserId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
    if (result.count > 0) {
      // Tell the other participant their messages were read
      this.gateway.emitToUser(otherUserId, 'chat:read', { by: currentUserId });
    }
    return { updated: result.count };
  }

  async getUnreadCount(currentUserId: string) {
    const total = await this.prisma.chatMessage.count({
      where: { recipientId: currentUserId, readAt: null, deletedAt: null },
    });
    return { total };
  }
}
