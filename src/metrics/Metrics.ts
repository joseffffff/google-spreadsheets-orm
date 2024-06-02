import { MetricOperation } from './MetricOperation';

export type MilliSecondsByOperation = {
  [x: string]: number[];
};

export class Metrics {
  constructor(private readonly msByOperation: Map<MetricOperation, number[]> = new Map<MetricOperation, number[]>()) {}

  public async trackExecutionTime<T>(op: MetricOperation, func: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const result = await func();
    const executionTime = Date.now() - startTime;
    this.report(op, executionTime);
    return result;
  }

  private report(op: MetricOperation, millis: number): void {
    if (this.msByOperation.has(op)) {
      this.msByOperation.get(op)!.push(millis);
    } else {
      this.msByOperation.set(op, [millis]);
    }
  }

  public toObject(): MilliSecondsByOperation {
    return Object.fromEntries(this.msByOperation.entries());
  }
}
