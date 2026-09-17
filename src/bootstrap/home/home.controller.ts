import { Controller, Get, Res } from '@nestjs/common';

type Res = {
  render: (view: string, locals: Record<string, unknown>) => void;
};

/**
 * Landing page (`GET /`). Renders the `home` view — an auth-aware portal whose links
 * depend on `res.locals.isAuthenticated` / `isAdmin` set by `AuthContextMiddleware`.
 * Without this route, `GET /` falls through to `NotFoundException` → the 404 page, which
 * is also where the logout redirect and the nav "Home" link land.
 */
@Controller()
export class HomeController {
  @Get()
  home(@Res() res: Res): void {
    res.render('home', { title: 'Home', currentNav: 'home' });
  }
}
