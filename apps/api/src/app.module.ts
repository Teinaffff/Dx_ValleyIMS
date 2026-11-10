import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma.module";
import { HealthController } from "./health.controller";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { ProductsModule } from "./modules/products/products.module";
import { GatesModule } from "./modules/gates/gates.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ChallengesModule } from "./modules/challenges/challenges.module";
import { IdeasModule } from "./modules/ideas/ideas.module";
import { EvaluatorsModule } from "./modules/evaluators/evaluators.module";
import { MailModule } from "./modules/mail/mail.module";
import { SearchModule } from "./modules/search/search.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProductsModule,
    GatesModule,
    DashboardModule,
    ChallengesModule,
    IdeasModule,
    EvaluatorsModule,
    MailModule,
    NotificationsModule,
    SearchModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
