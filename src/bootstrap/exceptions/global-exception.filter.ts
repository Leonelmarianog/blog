import {
  Catch,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  type ExceptionFilter,
  type ArgumentsHost,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof NotFoundException) {
      res.status(404).render('errors/404', { title: 'Not Found' });
    } else if (exception instanceof ForbiddenException) {
      res.status(403).render('errors/400', { title: 'Forbidden', message: exception.message });
    } else if (exception instanceof BadRequestException) {
      res.status(400).render('errors/400', { title: 'Bad Request', message: exception.message });
    } else {
      res.status(500).render('errors/500', { title: 'Server Error' });
    }
  }
}