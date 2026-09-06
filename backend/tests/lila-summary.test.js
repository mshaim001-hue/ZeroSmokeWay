import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { acceptsLilaSummary } from '../services/lilaCompletion.js';

let reply;
mock.module('openai', { defaultExport: class {
  chat = { completions: { create: async () => ({
    choices: [{ message: { content: JSON.stringify(reply) } }],
  }) } };
} });
const { handleAgentRequest } = await import('../services/agentService.js');
const request = { message: '🎲 2', agentType: 'anamnesis', conversationHistory: [],
  anamnesisData: {}, authContext: { isAuthenticated: true } };

test('a proposed summary preserves the narrator response without a quote-matching fallback', async () => {
  reply = { message: 'Что здесь точно попало в твой опыт, а что я упустил?',
    journeySummary: 'Ты уже выходил на перерыв без сигареты.', diceReady: true };
  const result = await handleAgentRequest(request);
  assert.equal(result.response, reply.message);
  assert.equal(result.journeySummary, reply.journeySummary);
  assert.equal(result.diceReady, true);
  const state = { lilaJourneySummary: result.journeySummary };
  assert.equal(acceptsLilaSummary('Да, всё верно', state), false);
  assert.equal(acceptsLilaSummary('Перейти к разбору мифов', state), true);
});

test('a continued conversation clears the proposed summary and preserves its own pacing', async () => {
  reply = { message: 'Да, с этим выводом я поторопился.', journeySummary: null, diceReady: false };
  const result = await handleAgentRequest({ ...request,
    anamnesisData: { lilaJourneySummary: 'Предыдущий итог' } });
  assert.equal(result.response, reply.message);
  assert.equal(result.journeySummary, null);
  assert.equal(result.diceReady, false);
});
