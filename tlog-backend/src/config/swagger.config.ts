import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Настраивает Swagger документацию для API
 *
 * @param app NestFastifyApplication экземпляр
 */
export function setupSwagger(app: NestFastifyApplication): void {
  const options = new DocumentBuilder()
    .setTitle('The Last of Guss API')
    .setDescription('REST endpoints for the game')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);
}
