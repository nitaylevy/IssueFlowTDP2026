import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Automatically strips properties that don't have validation decorators
      forbidNonWhitelisted: true, // Throws a 400 BadRequest if unrecognized properties are sent
      transform: true,        // Automatically transforms payloads to match their DTO object types
      exceptionFactory: (errors) => {
        // Formats detailed validation errors cleanly for the frontend client
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          errors: Object.values(err.constraints || {}),
        }));
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Input validation failed',
          details: formattedErrors,
        });
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();