import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';

import { ProjectsService } from './projects.service';
import type {
  CreateProjectData,
  UpdateProjectData,
} from './projects.service';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('suggest-code')
  async suggestCode(@Query('prefix') prefix?: string) {
    return this.projectsService.suggestCode(prefix);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('responsiblePerson') responsiblePerson?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll({
      page: parseInt(page || '1', 10),
      pageSize: parseInt(pageSize || '20', 10),
      status,
      responsiblePerson,
      startDate,
      endDate,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      search,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateProjectData,
  ) {
    const { userId } = req.userContext;
    return this.projectsService.create(body, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateProjectData,
  ) {
    const { userId } = req.userContext;
    return this.projectsService.update(id, body, userId);
  }

  @Get(':id/financial-summary')
  async getFinancialSummary(@Param('id') id: string) {
    return this.projectsService.getFinancialSummary(id);
  }

  @Get(':id/documents')
  async getDocuments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projectsService.getDocuments(
      id,
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }

  @Get(':id/payments')
  async getPayments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projectsService.getPayments(
      id,
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }

  @Get(':id/activity-log')
  async getActivityLog(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projectsService.getActivityLog(
      id,
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }
}
