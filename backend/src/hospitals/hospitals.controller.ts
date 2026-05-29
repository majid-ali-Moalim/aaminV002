import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('hospitals')
@Controller('hospitals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hospital' })
  create(@Body() createHospitalDto: any) {
    return this.hospitalsService.create(createHospitalDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all hospitals' })
  findAll(
    @Query('regionId') regionId?: string,
    @Query('districtId') districtId?: string
  ) {
    return this.hospitalsService.findAll({ regionId, districtId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hospital by id' })
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hospital' })
  update(@Param('id') id: string, @Body() updateHospitalDto: any) {
    return this.hospitalsService.update(id, updateHospitalDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hospital' })
  remove(@Param('id') id: string) {
    return this.hospitalsService.remove(id);
  }
}
