// Prints only model availability/error codes; never credentials or provider error text.
import dotenv from '../../backend/node_modules/dotenv/lib/main.js';
const env = dotenv.config({path: new URL('../../backend/.env', import.meta.url),quiet:true}).parsed || {};
const model = env.LABYRINTH_MODEL || 'gpt-4o-mini';
if (!env.OPENAI_API_KEY?.trim()) { console.log(JSON.stringify({model,issue:'missing_key'})); process.exit(1); }
try {
  const response = await fetch('https://api.openai.com/v1/models/'+encodeURIComponent(model), {headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},signal:AbortSignal.timeout(15000)});
  const result = await response.json();
  console.log(JSON.stringify({model,status:response.status,available:response.ok,code:typeof result.error?.code==='string'?result.error.code:undefined}));
} catch { console.log(JSON.stringify({model,issue:'connection_error'})); process.exitCode=1; }
