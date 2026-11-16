import { Controller, Get, Module } from '@nestjs/common';
import { RoomsGateway } from './rooms/rooms.gateway';
import { RoomsService } from './rooms/rooms.service';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({
  controllers: [HealthController],
  providers: [RoomsService, RoomsGateway],
})
export class AppModule {}
