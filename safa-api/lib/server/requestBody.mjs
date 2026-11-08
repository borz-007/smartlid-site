/** Чтение JSON-тела с ограничением размера. */
export async function readJsonBody(request, maxBytes) {
  const tooLarge = { error: { status: 413, code: 'too_large', message: 'Слишком большой запрос.' } };
  const badJson = { error: { status: 400, code: 'bad_request', message: 'Некорректный запрос.' } };
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return tooLarge;
  let text;
  try {
    text = await request.text();
  } catch {
    return badJson;
  }
  if (text.length > maxBytes) return tooLarge;
  try {
    return { body: JSON.parse(text) };
  } catch {
    return badJson;
  }
}
