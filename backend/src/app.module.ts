import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { BookingsModule } from './bookings/bookings.module';
import { CountriesModule } from './countries/countries.module';
import { DepartureCitiesModule } from './departure-cities/departure-cities.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { LeadsModule } from './leads/leads.module';
import { NewsModule } from './news/news.module';
import { PagesModule } from './pages/pages.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { ToursModule } from './tours/tours.module';
import { WhyUsModule } from './why-us/why-us.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    BookingsModule,
    CountriesModule,
    DepartureCitiesModule,
    HealthModule,
    HomeModule,
    LeadsModule,
    NewsModule,
    PagesModule,
    ServicesModule,
    SettingsModule,
    ToursModule,
    WhyUsModule,
  ],
})
export class AppModule {}
