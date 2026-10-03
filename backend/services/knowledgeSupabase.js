import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getSupabaseAdmin, hasSupabaseAdmin } from '../lib/supabaseServer.js';

dotenv.config();

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is not configured; AI requests are unavailable');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function embedQuery(text) {
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

/**
 * Поиск чанков через Supabase RPC match_knowledge_chunks.
 */
export async function searchKnowledgeFromSupabase(query, topK = 5, agentType = null) {
  if (!hasSupabaseAdmin()) return [];

  const queryEmbedding = await embedQuery(query);
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_agent: agentType,
  });

  if (error) {
    console.warn('Supabase KB RPC:', error.message);
    return [];
  }

  if (!data?.length) return [];

  return data
    .filter((row) => Number(row.similarity) > 0.3)
    .map((row) => ({
      text: row.content,
      source: row.source_path ?? null,
      similarity: Math.round(Number(row.similarity) * 100) / 100,
      agentTypes: row.agent_types || [],
    }));
}
