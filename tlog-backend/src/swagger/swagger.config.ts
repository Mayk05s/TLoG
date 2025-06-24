import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const buildSwaggerDocument = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('The Last of Guss API')
    .setDescription('REST endpoints for the game')
    .setVersion('1.0.0')
    .addCookieAuth('jwt')
    .build();

  return SwaggerModule.createDocument(app, config);
};
