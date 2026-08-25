import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FORM_VIEW } from './form-view.decorator';

@Injectable()
export class FormViewInterceptor implements NestInterceptor {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const name = this.reflector.get<string>(FORM_VIEW, context.getHandler());
    if (name) req.formView = name;
    return next.handle();
  }
}