import { MongoClient } from 'mongodb';

let clientPromise;

/**
 * Страховка от смешивания проектов: база SAFA должна называться с «safa». Если по ошибке в DB_NAME
 * попадёт имя базы другого проекта (например, сайта), сервер не подключится.
 */
export function isIsolatedDbName(name) {
  return /safa/i.test(String(name ?? ''));
}

export class StorageError extends Error {
  constructor() {
    super('Хранилище временно недоступно.');
    this.name = 'StorageError';
  }
}

/** Подключение к MongoDB по MONGO_URL / DB_NAME (задаются в Vercel Environment Variables). */
export async function getDb() {
  const url = process.env.MONGO_URL;
  const name = process.env.DB_NAME;
  if (!url || !name) throw new StorageError();
  if (!isIsolatedDbName(name)) {
    console.error('[db] DB_NAME must contain "safa": refusing to use a database that may belong to another project');
    throw new StorageError();
  }
  try {
    clientPromise ??= new MongoClient(url, { serverSelectionTimeoutMS: 5000 }).connect();
    return (await clientPromise).db(name);
  } catch {
    clientPromise = undefined;
    throw new StorageError();
  }
}
