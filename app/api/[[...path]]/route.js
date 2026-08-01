import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

let client;
let db;

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    db = client.db(process.env.DB_NAME);
  }
  return db;
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    const db = await connectToMongo();

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'SmartLid API' }));
    }

    // Contact form submission
    if (route === '/contact' && method === 'POST') {
      const body = await request.json();
      const { name, email, message } = body || {};
      if (!name || !email || !message) {
        return handleCORS(NextResponse.json({ error: 'name, email, message are required' }, { status: 400 }));
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        return handleCORS(NextResponse.json({ error: 'invalid email' }, { status: 400 }));
      }

      const doc = {
        id: uuidv4(),
        name: String(name).slice(0, 200),
        email: String(email).slice(0, 200),
        message: String(message).slice(0, 5000),
        userAgent: request.headers.get('user-agent') || '',
        createdAt: new Date(),
      };
      await db.collection('contact_messages').insertOne(doc);
      const { _id, ...safe } = doc;
      return handleCORS(NextResponse.json({ ok: true, submission: safe }));
    }

    // List contact messages (basic, no auth — MVP)
    if (route === '/contact' && method === 'GET') {
      const rows = await db.collection('contact_messages').find({}).sort({ createdAt: -1 }).limit(200).toArray();
      return handleCORS(NextResponse.json(rows.map(({ _id, ...r }) => r)));
    }

    // Legacy status endpoints (keep for compatibility)
    if (route === '/status' && method === 'POST') {
      const body = await request.json();
      if (!body.client_name) {
        return handleCORS(NextResponse.json({ error: 'client_name is required' }, { status: 400 }));
      }
      const statusObj = { id: uuidv4(), client_name: body.client_name, timestamp: new Date() };
      await db.collection('status_checks').insertOne(statusObj);
      return handleCORS(NextResponse.json(statusObj));
    }
    if (route === '/status' && method === 'GET') {
      const rows = await db.collection('status_checks').find({}).limit(1000).toArray();
      return handleCORS(NextResponse.json(rows.map(({ _id, ...r }) => r)));
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }));
  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
