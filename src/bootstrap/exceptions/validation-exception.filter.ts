import { Catch, BadRequestException, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';

interface ValidationError {
  property: string;
  constraints: Record<string, string>;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter<BadRequestException> {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const req = host.switchToHttp().getRequest();
    const res = host.switchToHttp().getResponse();

    const view = req.formView as string | undefined;
    if (!view) throw exception; // let the global filter handle it

    const payload = exception.getResponse();
    const messages: ValidationError[] = Array.isArray(payload)
      ? (payload as unknown as ValidationError[])
      : typeof payload === 'object' && payload !== null && 'message' in payload
        ? [payload as unknown as ValidationError]
        : [];
    const errors: Record<string, string> = {};
    for (const m of messages) {
      if (m?.property && m?.constraints) errors[m.property] = Object.values(m.constraints)[0] as string;
    }
    res
      .status(200)
      .render(view, {
        ...req.body,
        errors,
        csrfToken: res.locals?.csrfToken,
        flash: res.locals?.flash ?? [],
        title: view,
      });
  }
}