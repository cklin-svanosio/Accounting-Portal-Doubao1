import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, LoanSchedulesController } from './payments.controller';

@Module({
  controllers: [PaymentsController, LoanSchedulesController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
