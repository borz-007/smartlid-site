import { MongoClient } from 'mongodb';

let clientPromise;

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
  try {
    clientPromise ??= new MongoClient(url, { serverSelectionTimeoutMS: 5000 }).connect();
    return (await clientPromise).db(name);
  } catch {
    clientPromise = undefined;
    throw new StorageError();
  }
}
