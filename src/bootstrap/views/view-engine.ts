import { join } from 'node:path';
import type { Express } from 'express';
import * as exphbs from 'express-handlebars';
import { helpers } from './helpers';
import type { HandlebarsHelper } from './types';

const SRC = join(__dirname, '..', '..'); // src/

// express-handlebars v9 ships no bundled types; @types/express-handlebars (v5)
// describes the legacy `export = exphbs` callable, but the v9 runtime exports a
// named `engine(config)` function. Declare the minimal shape we depend on and
// bridge it through `unknown`.
type EngineConfig = {
  layoutsDir?: string;
  partialsDir?: string;
  defaultLayout?: string;
  extname?: string;
  helpers?: Record<string, HandlebarsHelper>;
};
type EngineFn = (
  viewPath: string,
  options: object,
  callback: (err: Error | null, html?: string) => void,
) => void;
type ExpressHandlebarsModule = { engine: (config?: EngineConfig) => EngineFn };

export function configureViewEngine(app: Express): void {
  const viewsRoots = [
    join(SRC, 'shared-kernel', 'presentation', 'views'),
    join(SRC, 'contexts', 'iam', 'presentation', 'http', 'views'),
  ];
  const engine = (exphbs as unknown as ExpressHandlebarsModule).engine({
    layoutsDir: join(SRC, 'shared-kernel', 'presentation', 'views', 'layouts'),
    partialsDir: join(SRC, 'shared-kernel', 'presentation', 'views', 'partials'),
    defaultLayout: 'main',
    extname: '.hbs',
    helpers,
  });
  app.engine('hbs', engine);
  app.set('view engine', 'hbs');
  app.set('views', viewsRoots);
}
