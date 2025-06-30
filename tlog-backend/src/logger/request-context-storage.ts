import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId?: string;
}

export class RequestContextStorage {
  private static storage = new AsyncLocalStorage<RequestContext>();

  static run(requestId: string, callback: () => any): any {
    return this.storage.run({ requestId }, callback);
  }
  static getRequestId(): string | undefined {
    const store = this.storage.getStore();
    return store?.requestId;
  }
}
