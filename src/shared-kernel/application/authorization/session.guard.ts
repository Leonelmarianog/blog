import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    if (req.session?.userId) return true;
    res.redirect('/login');
    return false;
  }
}
