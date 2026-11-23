import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApp(app: INestApplication, title: string): void {
  const config = new DocumentBuilder().setTitle(title).setVersion('1.0').build();
  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    document.paths['/docs-json'] = {
      get: {
        summary: 'This OpenAPI document',
        responses: { '200': { description: 'The document' } },
      },
    };
    return document;
  };
  SwaggerModule.setup('docs', app, documentFactory);
}
