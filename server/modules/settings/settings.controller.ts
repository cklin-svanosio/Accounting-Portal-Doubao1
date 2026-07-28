import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';

import { SettingsService } from './settings.service';
import type {
  ExchangeRate,
  Template,
  ProjectCodeConfig,
} from '@shared/api.interface';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── Exchange Rates ───────────────────────────────────────────────

  @Get('api/exchange-rates')
  async getExchangeRates(
    @Query('status') status?: 'active' | 'inactive',
  ): Promise<{ items: ExchangeRate[] }> {
    const items = await this.settingsService.getExchangeRates(status);
    return { items };
  }

  @NeedLogin()
  @Post('api/exchange-rates')
  async createExchangeRate(
    @Req() req: Request,
    @Body() body: { currency: string; rateToHkd: number; effectiveDate: string },
  ): Promise<ExchangeRate> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.settingsService.createExchangeRate(body, userId);
  }

  @NeedLogin()
  @Patch('api/exchange-rates/:id')
  async updateExchangeRate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { rateToHkd?: number; effectiveDate?: string; status?: 'active' | 'inactive' },
  ): Promise<ExchangeRate> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.settingsService.updateExchangeRate(id, body, userId);
  }

  // ─── Project Codes ────────────────────────────────────────────────

  @Get('api/settings/project-codes')
  async getProjectCodeConfig(): Promise<ProjectCodeConfig> {
    return this.settingsService.getProjectCodeConfig();
  }

  @NeedLogin()
  @Put('api/settings/project-codes')
  async updateProjectCodeConfig(
    @Req() req: Request,
    @Body() body: { prefix?: string; sequenceDigits?: number; namingConvention?: string },
  ): Promise<ProjectCodeConfig> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.settingsService.updateProjectCodeConfig(body, userId);
  }

  // ─── Templates ────────────────────────────────────────────────────

  @Get('api/templates')
  async getTemplates(
    @Query('type') type?: string,
  ): Promise<{ items: Template[] }> {
    const items = await this.settingsService.getTemplates(type);
    return { items };
  }

  @NeedLogin()
  @Post('api/templates')
  async createTemplate(
    @Req() req: Request,
    @Body() body: { name: string; type: string; fieldMapping: Record<string, unknown>; isDefault?: boolean },
  ): Promise<Template> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.settingsService.createTemplate(body, userId);
  }

  @NeedLogin()
  @Patch('api/templates/:id')
  async updateTemplate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { name?: string; type?: string; fieldMapping?: Record<string, unknown>; isDefault?: boolean },
  ): Promise<Template> {
    const { userId } = (req as unknown as { userContext: { userId: string } }).userContext;
    return this.settingsService.updateTemplate(id, body, userId);
  }
}
