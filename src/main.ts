import { NestFactory } from '@nestjs/core';
import {
    ValidationPipe,
    BadRequestException,
    ValidationError,
    VersioningType,
} from '@nestjs/common';
import { AppModule } from './app.module.js';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn'],
    });

    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    app.enableCors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            try {
                const u = new URL(origin);
                const host = u.hostname.toLowerCase();
                if (
                    origin === 'http://localhost:8080' ||
                    host === 'mitsubishielevatorasia.co.th' ||
                    host.endsWith('.mitsubishielevatorasia.co.th') ||
                    host === 'localhost' ||
                    host === '127.0.0.1'
                ) {
                    return cb(null, true);
                }
            } catch {}
            cb(new Error('HTTP CORS blocked'), false);
        },
        credentials: true,
        allowedHeaders: [
            'Content-Type',
            'Accept',
            'Authorization',
            'X-CSRF-Token',
            'X-Requested-With',
        ],
    });

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            exceptionFactory: (errors: ValidationError[]) => {
                const formatErrors = (
                    errors: ValidationError[],
                    parentPath = '',
                ): Array<{ message: string[] }> => {
                    const result: Array<{ message: string[] }> = [];

                    errors.forEach((error: ValidationError) => {
                        const currentPath = parentPath
                            ? `${parentPath}.${error.property}`
                            : error.property;

                        // มี error ของ field นี้โดยตรง
                        if (error.constraints) {
                            const targetPrototype = error.target
                                ? Object.getPrototypeOf(error.target)
                                : null;

                            const labelName = targetPrototype
                                ? Reflect.getMetadata(
                                      'custom:label',
                                      targetPrototype,
                                      error.property,
                                  )
                                : null;

                            const displayName = labelName || currentPath;

                            const constraints = (
                                Object.values(error.constraints) as string[]
                            ).map((msg) =>
                                msg.replace(error.property, displayName),
                            );

                            result.push({
                                // field: currentPath,
                                message: constraints,
                            });
                        }

                        // มี nested error
                        if (error.children?.length) {
                            result.push(
                                ...formatErrors(error.children, currentPath),
                            );
                        }
                    });

                    return result;
                };
                const customMessages = formatErrors(errors);

                return new BadRequestException({
                    statusCode: 400,
                    message: customMessages,
                    error: 'Bad Request',
                });
            },
        }),
    );

    await app.listen(process.env.PORT ?? 3000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
await bootstrap();
