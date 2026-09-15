import { Injectable, type NestMiddleware } from '@nestjs/common';

export interface FlashMessage { type: string; msg: string }

type Req = {
  method?: string;
  session: { flash: FlashMessage[] };
  flash?: (type: string, msg: string) => void;
};

type Res = {
  locals: { flash?: FlashMessage[] };
};

@Injectable()
export class FlashMiddleware implements NestMiddleware {
  use(req: Req, res: Res, next: () => void): void {
    if (!Array.isArray(req.session.flash)) req.session.flash = [];

    req.flash = (type: string, msg: string): void => {
      // `req.session` can be swapped out from under us by `req.session.regenerate()`
      // (called after login), which hands us a fresh session with no `flash` array.
      // Re-initialize on use so flash survives a post-regenerate `req.flash(...)`.
      if (!Array.isArray(req.session.flash)) req.session.flash = [];
      req.session.flash.push({ type, msg });
    };

    if (req.method === 'GET') {
      res.locals.flash = req.session.flash;
      req.session.flash = [];
    } else {
      res.locals.flash = [];
    }
    next();
  }
}
