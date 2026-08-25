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
