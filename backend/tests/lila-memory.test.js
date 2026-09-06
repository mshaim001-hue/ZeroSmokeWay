import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let summaries = 0;
mock.module('openai', { defaultExport: class {
  chat = { completions: { create: async () => {
    summaries++;
    return { choices: [{ message: { content: 'Ранний эпизод; гипотеза ведущего отвергнута человеком.' } }] };
  } } };
} });
const { prepareLilaDialogContext } = await import('../services/lilaDialogMemory.js');

test('memory retains fifteen complete pairs and archives only older material', async () => {
  const history = Array.from({ length: 17 }, (_, i) => [
    { text: `user ${i}`, isUser: true }, { text: `reply ${i}`, isUser: false },
  ]).flat();
  history.push({ text: 'current correction', isUser: true });
  const result = await prepareLilaDialogContext({ conversationHistory: history });
  assert.equal(result.recentMessages.length, 30);
  assert.equal(result.recentMessages[0].text, 'user 2');
  assert.equal(result.recentMessages.at(-1).text, 'reply 16');
  assert.equal(result.lilaDialogMemory.lilaSummarizedPairCount, 2);
  assert.equal(summaries, 1);
  const restored = await prepareLilaDialogContext({ conversationHistory: history, anamnesisData: result.lilaDialogMemory });
  assert.deepEqual(restored.recentMessages, result.recentMessages);
  assert.equal(summaries, 1, 'restored archives must not be summarized again');
});
