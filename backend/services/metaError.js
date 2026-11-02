const SECRET = /Bearer\s+\S+|sk-[a-zA-Z0-9_-]+|api[_-]?key["'\s:=]+\S+|Authorization["'\s:=]+\S+/gi;

export function providerIssue(error) {
  if (error?.status === 401 || error?.status === 403) return 'auth_error';
  if (error?.status === 400) return 'invalid_request';
  if (error?.status === 429) return 'rate_limit';
  if (error?.status === 404 || error?.code === 'model_not_found') return 'model_unavailable';
  if (error?.name === 'APIConnectionTimeoutError' || error?.code === 'ETIMEDOUT' || error?.name === 'AbortError') return 'timeout';
  return 'provider_error';
}

export function resolveMetaModel(env, fallback) {
  const value = String(env?.META_MODEL || fallback || '').trim();
  return value || fallback;
}

export function cleanMetaMessage(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().replace(SECRET, '[redacted]');
  return text.slice(0, 240);
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || headers.get(name.toLowerCase()) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

export function metaErrorFields(error) {
  const nested = error?.error && typeof error.error === 'object' ? error.error : {};
  return {
    status: Number.isFinite(error?.status) ? error.status : null,
    code: typeof (error?.code ?? nested.code) === 'string' ? String(error?.code ?? nested.code).slice(0, 80) : null,
    type: typeof (error?.type ?? nested.type) === 'string' ? String(error?.type ?? nested.type).slice(0, 80) : null,
    requestId: String(
      error?.requestID
      || error?.request_id
      || nested.request_id
      || headerValue(error?.headers, 'x-request-id')
      || headerValue(error?.headers, 'request-id')
      || '',
    ).slice(0, 80) || null,
    message: cleanMetaMessage(error?.message || nested.message),
  };
}

export function logMetaFailure(source, error) {
  const issue = providerIssue(error);
  if (issue === 'model_unavailable') {
    console.warn('[meta]', JSON.stringify({ source, ...metaErrorFields(error) }));
  }
  return issue;
}
