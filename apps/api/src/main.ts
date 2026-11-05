import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: (config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  const port = Number(config.get<string>("PORT") ?? 4000);
  const host = config.get<string>("HOST") ?? "127.0.0.1";
  await app.listen(port, host);
  Logger.log(`DxValley IMS API listening on http://${host}:${port}/api`, "Bootstrap");
}

void bootstrap();
