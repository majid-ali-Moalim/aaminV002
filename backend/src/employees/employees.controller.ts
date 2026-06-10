import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Create a new employee' })
  create(@Body() createEmployeeDto: any, @CurrentUser() user: any) {
    return this.employeesService.create(createEmployeeDto, user?.id ?? user?.sub, user);
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get all employees' })
  findAll(
    @Query('employeeRoleId') employeeRoleId?: string,
    @Query('departmentId') departmentId?: string
  ) {
    return this.employeesService.findAll(employeeRoleId, departmentId);
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: any, @CurrentUser() user: any) {
    return this.employeesService.update(id, updateEmployeeDto, user?.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete employee' })
  remove(@Param('id') id: string) {
    return this.employeesService.delete(id);
  }
}
