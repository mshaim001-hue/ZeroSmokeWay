/**
 * Заливает knowledge-base/embeddings.json в таблицу public.knowledge_chunks.
 * Требует: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (не используется, только если нужен — не требуется).
 *
 * Запуск: из каталога backend: npm run sync-knowledge
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getSupabaseAdmin, hasSupabaseAdmin } from '../lib/supabaseServer.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBEDDINGS_FILE = path.join(__dirname, '../../knowledge-base/embeddings.json');

function toVectorLiteral(embedding) {
  if (!Array.isArray(embedding)) return null;
  return `[${embedding.join(',')}]`;
}

async function main() {
  if (!hasSupabaseAdmin()) {
    console.error('Задайте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в backend/.env');
    process.exit(1);
  }

  if (!(await fs.pathExists(EMBEDDINGS_FILE))) {
    console.error('Нет файла', EMBEDDINGS_FILE, '— сначала npm run index-knowledge');
    process.exit(1);
  }

  const { chunks } = await fs.readJson(EMBEDDINGS_FILE);
  if (!chunks?.length) {
    console.error('Файл embeddings пуст');
    process.exit(1);
  }

  const admin = getSupabaseAdmin();
  const batchSize = 40;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const rows = slice.map((c) => ({
      external_id: c.id,
      source_path: c.source ?? null,
      chunk_index: c.chunkIndex ?? null,
      content: c.text,
      agent_types: Array.isArray(c.agentTypes) ? c.agentTypes : [],
      embedding: toVectorLiteral(c.embedding),
    }));

    const { error } = await admin.from('knowledge_chunks').upsert(rows, { onConflict: 'external_id' });

    if (error) {
      console.error('Upsert batch', i, error);
      process.exit(1);
    }
    console.log(`OK ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`);
  }

  console.log('Готово. При желании создайте индекс HNSW по embedding в SQL Editor Supabase.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
