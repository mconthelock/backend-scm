import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
@Module({
  imports: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply().forRoutes('*');
  }
}
