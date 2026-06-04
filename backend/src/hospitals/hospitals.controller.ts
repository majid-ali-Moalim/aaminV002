import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './create-hospital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('hospitals')
@Controller('hospitals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post('create')
  @RequirePermissions('hospital.manage')
  @ApiOperation({ summary: 'Register a new hospital with full validation' })
  createHospital(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.createRegistered(dto);
  }

  @Post()
  @RequirePermissions('hospital.manage')
  @ApiOperation({ summary: 'Create a new hospital (legacy)' })
  create(@Body() createHospitalDto: any) {
    return this.hospitalsService.create(createHospitalDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all hospitals' })
  findAll(
    @Query('regionId') regionId?: string,
    @Query('districtId') districtId?: string,
  ) {
    return this.hospitalsService.findAll({ regionId, districtId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hospital by id' })
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('hospital.manage')
  @ApiOperation({ summary: 'Update a hospital' })
  update(@Param('id') id: string, @Body() updateHospitalDto: any) {
    return this.hospitalsService.update(id, updateHospitalDto);
  }

  @Delete(':id')
  @RequirePermissions('hospital.manage')
  @ApiOperation({ summary: 'Delete a hospital' })
  remove(@Param('id') id: string) {
    return this.hospitalsService.remove(id);
  }
}
