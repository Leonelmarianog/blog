import { HomeController } from '../../../src/bootstrap/home/home.controller';

describe('HomeController', () => {
  it('renders the home view with title and currentNav', () => {
    const controller = new HomeController();
    let rendered: { view?: string; locals?: Record<string, unknown> } = {};
    const res = {
      render: (view: string, locals: Record<string, unknown>) => { rendered = { view, locals }; },
    };
    controller.home(res as never);
    expect(rendered.view).toBe('home');
    expect(rendered.locals).toEqual({ title: 'Home', currentNav: 'home' });
  });
});
