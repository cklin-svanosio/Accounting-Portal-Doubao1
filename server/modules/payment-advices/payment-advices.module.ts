import { Module } from '@nestjs/common';
import { PaymentAdvicesController } from './payment-advices.controller';
import { PaymentAdvicesService } from './payment-advices.service';

@Module({
  controllers: [PaymentAdvicesController],
  providers: [PaymentAdvicesService],
  exports: [PaymentAdvicesService],
})
export class PaymentAdvicesModule {}
