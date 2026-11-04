const SECRET = /Bearer\s+\S+|sk-[a-zA-Z0-9_-]+|api[_-]?key["'\s:=]+\S+|Authorization["'\s:=]+\S+/gi;

/** One Meta HTTP call may run this long. */
export const META_CALL_TIMEOUT_MS = 45_000;
/** Scene/support handler budget, including JSON and transient retries. */
export const META_HANDLER_BUDGET_MS = 100_000;
/** Short pause before a single transient retry. */
export const META_TRANSIENT_DELAY_MS = 750;
/** Do not start another Meta attempt below this remaining budget. */
export const META_MIN_ATTEMPT_MS = 3_000;
/** Vercel function limit for /api/scene and /api/support. */
export const VERCEL_META_MAX_DURATION_S = 120;
/** Browser abort for Muse calls; must stay under Vercel maxDuration. */
export const CLIENT_MUSE_TIMEOUT_MS = 110_000;

export function providerIssue(error) {
  if (error?.status === 401 || error?.status === 403) return 'auth_error';
  if (error?.status === 400) return 'invalid_request';
  if (error?.status === 429) return 'rate_limit';
  if (error?.status === 404 || error?.code === 'model_not_found') return 'model_unavailable';
  if (error?.name === 'APIConnectionTimeoutError' || error?.code === 'ETIMEDOUT' || error?.name === 'AbortError') return 'timeout';
  return 'provider_error';
}

export function isTransientMetaError(error) {
  const status = error?.status;
  if (status === 401 || status === 403 || status === 400 || status === 404 || status === 429) return false;
  if (status === 502 || status === 503 || status === 504) return true;
  if (error?.name === 'APIConnectionTimeoutError' || error?.name === 'APIConnectionError') return true;
  if (error?.name === 'AbortError') return true;
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET' || error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
    return true;
  }
  if (!status && typeof error?.message === 'string' && /fetch failed|network|socket/i.test(error.message)) {
    return true;
  }
  return false;
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

export function logMetaFailure(source, error, context = {}) {
  const issue = providerIssue(error);
  const model = typeof context.model === 'string' && context.model.trim()
    ? context.model.trim().slice(0, 120)
    : null;
  const baseURL = typeof context.baseURL === 'string' && context.baseURL.trim()
    ? context.baseURL.trim().slice(0, 200)
    : null;
  console.warn('[meta]', JSON.stringify({
    source,
    issue,
    model,
    baseURL,
    ...metaErrorFields(error),
  }));
  return issue;
}

export function createMetaBudget(now = Date.now, budgetMs = META_HANDLER_BUDGET_MS) {
  const deadline = now() + budgetMs;
  return {
    remaining() {
      return deadline - now();
    },
  };
}

function throwIssue(issue) {
  const error = new Error(issue);
  error.status = 503;
  error.issue = issue;
  throw error;
}

/**
 * One Meta completion with at most one transient retry.
 * SDK maxRetries must stay 0 so this is the only retry layer.
 */
export async function callMetaWithTransientRetry({
  source,
  createCompletion,
  params,
  budget,
  baseURL = null,
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  callTimeoutMs = META_CALL_TIMEOUT_MS,
  delayMs = META_TRANSIENT_DELAY_MS,
  minAttemptMs = META_MIN_ATTEMPT_MS,
}) {
  const logContext = {
    model: typeof params?.model === 'string' ? params.model : null,
    baseURL,
  };
  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    const remaining = budget.remaining();
    if (remaining < minAttemptMs) throwIssue('timeout');
    const timeout = Math.min(callTimeoutMs, Math.max(minAttemptMs, remaining));
    try {
      return await createCompletion(params, { timeout });
    } catch (error) {
      if (error?.status === 400 && error?.issue) throw error;
      const issue = logMetaFailure(source, error, logContext);
      const retry = attempt === 1 && isTransientMetaError(error);
      if (!retry) throwIssue(issue);
      if (budget.remaining() - delayMs < minAttemptMs) throwIssue(issue);
      await sleep(delayMs);
    }
  }
  throwIssue('provider_error');
}
