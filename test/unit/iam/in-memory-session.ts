export class InMemorySession {
  userId?: string;
  csrfToken?: string;
  flash: { type: string; msg: string }[] = [];
  private _regenerated = 0;
  get regeneratedCount(): number { return this._regenerated; }
  regenerate(cb: () => void): void { this._regenerated++; this.userId = undefined; this.csrfToken = undefined; this.flash = []; cb(); }
  destroy(cb: () => void): void { this.userId = undefined; this.csrfToken = undefined; this.flash = []; cb(); }
}
