import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId?: string;
  // можно добавить другие данные запроса здесь
}

/**
 * Сервис для хранения контекста запроса с использованием AsyncLocalStorage.
 * Это позволяет иметь доступ к данным запроса из любого места приложения.
 */
export class RequestContextStorage {
  private static storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Запускает новый контекст запроса
   */
  static run(requestId: string, callback: () => any): any {
    return this.storage.run({ requestId }, callback);
  }

  /**
   * Получает текущий ID запроса
   */
  static getRequestId(): string | undefined {
    const store = this.storage.getStore();
    return store?.requestId;
  }
}
