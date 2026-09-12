export interface HtmlAssertion {
  contains: (text: string) => void;
  matches: (re: RegExp) => void;
}

/** Minimal HTML assertion helper — substring/regex only, no DOM dependency. */
export function assertHtml(body: string): HtmlAssertion {
  return {
    contains: (text: string) => {
      if (!body.includes(text)) throw new Error(`expected HTML to contain "${text}"`);
    },
    matches: (re: RegExp) => {
      if (!re.test(body)) throw new Error(`expected HTML to match ${re}`);
    },
  };
}
