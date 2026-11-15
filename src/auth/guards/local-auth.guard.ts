import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    override canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        if (request?.body) {
            if (!request.body.username && request.body.USR_LOGIN) {
                request.body.username = request.body.USR_LOGIN;
            }
            if (!request.body.password && request.body.PWD_CURRENT) {
                request.body.password = request.body.PWD_CURRENT;
            }
        }
        return super.canActivate(context);
    }
}
