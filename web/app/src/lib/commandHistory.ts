export class CommandHistory {
  private items: string[] = [];
  private cursor = -1;
  private draft = "";
  private readonly max: number;

  constructor(max = 100) {
    this.max = max;
  }

  push(cmd: string): void {
    const t = cmd.trim();
    if (!t) return;
    if (this.items[0] === t) {
      this.cursor = -1;
      this.draft = "";
      return;
    }
    this.items.unshift(t);
    if (this.items.length > this.max) this.items.length = this.max;
    this.cursor = -1;
    this.draft = "";
  }

  /** Call when user starts browsing; pass current input as draft. */
  up(current: string): string {
    if (this.cursor === -1) this.draft = current;
    if (this.cursor + 1 >= this.items.length) {
      return this.items[this.cursor] ?? current;
    }
    this.cursor += 1;
    return this.items[this.cursor] ?? current;
  }

  down(current: string): string {
    if (this.cursor <= 0) {
      this.cursor = -1;
      return this.draft;
    }
    this.cursor -= 1;
    return this.items[this.cursor] ?? current;
  }

  resetBrowse(): void {
    this.cursor = -1;
    this.draft = "";
  }
}
