import { NotFoundException, ForbiddenException, BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from '../../../src/bootstrap/exceptions/global-exception.filter';

interface MockRes {
  status: jest.Mock;
  render: jest.Mock;
}

function host(res: MockRes) {
  return {
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => res }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  it('maps NotFoundException to errors/404 at 404', () => {
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    new GlobalExceptionFilter().catch(new NotFoundException(), host(res));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('errors/404', expect.any(Object));
  });

  it('maps ForbiddenException to errors/400 at 403', () => {
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    new GlobalExceptionFilter().catch(new ForbiddenException(), host(res));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/400', expect.any(Object));
  });

  it('maps BadRequestException to errors/400 at 400', () => {
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    new GlobalExceptionFilter().catch(new BadRequestException(), host(res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('errors/400', expect.any(Object));
  });

  it('maps unknown errors to errors/500 at 500', () => {
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    new GlobalExceptionFilter().catch(new Error('boom'), host(res));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('errors/500', expect.any(Object));
  });
});
