import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface LoggerContext {
  correlationId: string;
  [key: string]: any;
}

@Injectable()
export class CorrelationIdService {
  private readonly storage = new AsyncLocalStorage<LoggerContext>();

  getContext(): LoggerContext | undefined {
    return this.storage.getStore();
  }

  getCorrelationId(): string | undefined {
    return this.getContext()?.correlationId;
  }

  run<T>(callback: () => T): T {
    const context: LoggerContext = {
      correlationId: uuidv4(),
    };
    return this.storage.run(context, callback);
  }

  runWithContext<T>(context: LoggerContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  setContextValue(key: string, value: any): void {
    const context = this.getContext();
    if (context) {
      context[key] = value;
    }
  }
}
