export class Logger {
  constructor(private readonly verboseMode: boolean = false) {
  }

  public log(msg: string): void {
    if (this.verboseMode) {
      console.log(msg);
    }
  }
}