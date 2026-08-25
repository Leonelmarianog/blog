import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { ValidationExceptionFilter } from '../../../src/bootstrap/exceptions/validation-exception.filter';

interface MockReq {
  formView?: string;
  body: Record<string, unknown>;
}

interface MockRes {
  status: jest.Mock;
  render: jest.Mock;
}

function host(req: MockReq, res: MockRes): ArgumentsHost {
  return { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ArgumentsHost;
}

describe('ValidationExceptionFilter', () => {
  it('re-renders the form view with field errors at status 200', () => {
    const req: MockReq = { formView: 'iam/register', body: { email: 'bad', password: 'short' } };
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    const filter = new ValidationExceptionFilter();
    const ex = new BadRequestException([{ property: 'email', constraints: { isEmail: 'invalid email' } }]);
    filter.catch(ex, host(req, res));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.render).toHaveBeenCalledWith('iam/register', expect.objectContaining({ errors: expect.any(Object) }));
  });

  it('falls back to the global filter when req.formView is unset (next filter handles it)', () => {
    const req: MockReq = { body: {} };
    const res: MockRes = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    const filter = new ValidationExceptionFilter();
    const ex = new BadRequestException([{ property: 'email', constraints: { isEmail: 'x' } }]);
    // Without a form view, the filter should not render — it rethrows so the global filter can map to errors/400.
    expect(() => filter.catch(ex, host(req, res))).toThrow();
    expect(res.render).not.toHaveBeenCalled();
  });
});
