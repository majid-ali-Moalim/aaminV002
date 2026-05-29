import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  @Post()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadDir = join(process.cwd(), 'uploads');
          mkdirSync(uploadDir, { recursive: true });
          callback(null, uploadDir);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        const isImage = file.mimetype?.startsWith('image/');
        const isPdf = file.mimetype === 'application/pdf';
        if (!isImage && !isPdf) {
          return callback(new BadRequestException('Only image files or PDFs are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Return the public URL
    const url = `/uploads/${file.filename}`;
    return {
      url,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
