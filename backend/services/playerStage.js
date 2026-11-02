function fail(issue, status, message) {
  const error = new Error(message || issue);
  error.status = status;
  error.issue = issue;
  throw error;
}

export function bearerToken(req) {
  const header = req?.headers?.authorization ?? req?.headers?.Authorization ?? '';
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') return '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function supabaseConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return url && key ? { url, key } : null;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function readAuthoritativeStage(req, env = process.env, fetchImpl = fetch) {
  const config = supabaseConfig(env);
  if (!config) fail('not_configured', 503, 'Progress store is not configured');
  const token = bearerToken(req);
  if (!token) fail('auth_required', 401, 'Sign in required');
  let userRes;
  try {
    userRes = await fetchImpl(`${config.url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: config.key },
    });
  } catch {
    fail('stage_unavailable', 503, 'Could not read progress');
  }
  if (!userRes.ok) fail('auth_required', 401, 'Sign in required');
  const user = await readJson(userRes);
  const userId = typeof user?.id === 'string' ? user.id : '';
  if (!userId) fail('auth_required', 401, 'Sign in required');
  let progressRes;
  try {
    progressRes = await fetchImpl(
      `${config.url}/rest/v1/player_progress?select=app_stage,smoking_status&user_id=eq.${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: config.key,
          Accept: 'application/json',
        },
      },
    );
  } catch {
    fail('stage_unavailable', 503, 'Could not read progress');
  }
  if (progressRes.status === 401 || progressRes.status === 403) fail('auth_required', 401, 'Sign in required');
  if (!progressRes.ok) fail('stage_unavailable', 503, 'Could not read progress');
  const rows = await readJson(progressRes);
  if (!Array.isArray(rows)) fail('stage_unavailable', 503, 'Could not read progress');
  const row = rows[0] || null;
  if (!row) return { configured: true, appStage: 'journey', smokingStatus: '', schemaComplete: true };
  const appStage = row.app_stage === 'support' || row.app_stage === 'preparing_to_start' ? row.app_stage : 'journey';
  const smokingStatus = row.smoking_status === 'smoking' || row.smoking_status === 'abstaining' ? row.smoking_status : '';
  return { configured: true, appStage, smokingStatus, schemaComplete: true };
}

export async function gateDialogueRequest(kind, req, env = process.env, fetchImpl = fetch) {
  const stage = await readAuthoritativeStage(req, env, fetchImpl);
  if (kind === 'scene' && stage.appStage === 'support') {
    fail('scenes_closed', 409, 'Scenes are closed after support starts');
  }
  if (kind === 'support' && stage.appStage !== 'support') {
    fail('not_in_support', 409, 'Support chat is only after a confirmed last cigarette');
  }
  return stage;
}
