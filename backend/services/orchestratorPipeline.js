import { getOrchestratorDecision, PHASES } from './orchestratorService.js';
import { handleAgentRequest } from './agentService.js';
import { resolveAuthContext } from './authContext.js';
import { saveOrchestratorConversation, getOrchestratorSession } from './conversationStore.js';
import { finalizeAnamnesisCoverage, mergeAnamnesisWithCoverage } from './anamnesisCoverage.js';
import {
  getNextIllusion,
  isMythBustingComplete,
  mythProgressDigest,
  hasAhaSignal,
} from './mythBustingProgress.js';
import { scheduleEmailSequence } from './emailSequenceService.js';

function isEarlyPhase(ph) {
  return ph === PHASES.WELCOME || ph === PHASES.ANAMNESIS;
}

/**
 * Формирует расширенную инструкцию для myth_buster:
 * добавляет конкретную иллюзию, слова пользователя и сократический вопрос.
 */
function buildMythBusterInstruction(baseInstruction, nextIllusion, mythProgress) {
  if (!nextIllusion) {
    // Все иллюзии разобраны — финальный вопрос
    return (
      (baseInstruction ? baseInstruction + '\n\n' : '') +
      'Все ключевые иллюзии разобраны. Задай финальный вопрос Карра: ' +
      '"Мы разобрали всё, что ты называл причинами курить. ' +
      'Скажи честно — от чего конкретно ты откажешься, если бросишь? Что именно потеряешь?" ' +
      'Не давай ответа. Жди, пока он сам сформулирует. Это ведёт к пониманию: терять нечего.'
    );
  }

  const alreadyAddressed = Object.keys(mythProgress || {}).filter((k) => mythProgress[k] === true);
  const progressNote =
    alreadyAddressed.length > 0
      ? `Уже разобраны: ${alreadyAddressed.join(', ')}. `
      : '';

  return (
    (baseInstruction ? baseInstruction + '\n\n' : '') +
    `ИЛЛЮЗИЯ ЭТОГО ХОДА: "${nextIllusion.label}". ` +
    (nextIllusion.evidence ? `Из анамнеза — его слова: "${nextIllusion.evidence}". ` : '') +
    `Подсказка: ${nextIllusion.hint} ` +
    progressNote +
    'Один вопрос или аналогия — не утверждение. Закончи открытым вопросом.'
  );
}

/**
 * Инструкция для фазы свободы: иллюзии уже разобраны, человек сам всё увидел.
 * Задача агента сменилась — не допрашивать дальше, а закрепить и отпустить.
 */
function buildFreedomInstruction(baseInstruction) {
  return (
    (baseInstruction ? baseInstruction + '\n\n' : '') +
    'ФАЗА СВОБОДЫ. Все иллюзии уже разобраны — человек сам увидел, что терять нечего. ' +
    'НЕ задавай больше сократических вопросов про отдельные иллюзии (стресс, кофе, компанию): это пройденный этап, ' +
    'возвращаться к ним = обесценивать его инсайт и создавать ощущение, что финиша нет. ' +
    'Сейчас твоя задача — закрепить и отпустить: спокойно подтверди то, к чему он пришёл сам, ' +
    'и передай тихую уверенность, что впереди легче, чем кажется. Без пафоса, без "ты справишься" и "держись" — ' +
    'ровная интонация человека, который сам прошёл этот путь. Можешь мягко обозначить, что бросить можно прямо сейчас ' +
    'и без борьбы, но не дави и не торопи. 2–3 предложения. Закончи тёплым открытым вопросом.'
  );
}

/**
 * Общая логика POST /api/orchestrator (Express и Vercel).
 */
export async function runOrchestrationRequest({ body, authorizationHeader }) {
  const {
    message,
    conversationHistory = [],
    anamnesisData = null,
    phase = PHASES.WELCOME,
    userProfile = null,
    currentPlan = null,
    mythProgress = {},  // { stress: true, boredom: true, ... } — клиент сохраняет и передаёт
    sessionBrief: priorSessionBrief = null,  // бриф с прошлого хода/сессии
  } = body;

  const authContext = await resolveAuthContext(authorizationHeader, conversationHistory);

  const decision = await getOrchestratorDecision({
    message: message.trim(),
    conversationHistory,
    phase,
    anamnesisData,
    userProfile,
    currentPlan,
    priorSessionBrief,
    authContext,
  });

  let nextAgent = decision.nextAgent;
  let phaseUpdate = decision.phaseUpdate;

  const priorSnapshot = finalizeAnamnesisCoverage(anamnesisData);
  const carrCoverage = priorSnapshot.carrCoverage;

  // Определяем фазу и агента
  if (phase === PHASES.FREEDOM) {
    nextAgent = 'myth_buster';
    phaseUpdate = PHASES.FREEDOM;
  } else if (phase === PHASES.MYTH_BUSTING) {
    nextAgent = 'myth_buster';
    phaseUpdate = PHASES.MYTH_BUSTING;
  } else if (isEarlyPhase(phase) && priorSnapshot.coverageReadyForMythBusting) {
    nextAgent = 'myth_buster';
    phaseUpdate = PHASES.MYTH_BUSTING;
  }

  // Для myth_buster: определяем следующую иллюзию и обогащаем инструкцию
  let updatedMythProgress = { ...mythProgress };
  let orchestratorInstruction = decision.instructionToAgent;

  if (nextAgent === 'myth_buster' && phase === PHASES.FREEDOM) {
    // Иллюзии уже позади — закрепляем, а не допрашиваем заново.
    orchestratorInstruction = buildFreedomInstruction(decision.instructionToAgent);
  } else if (nextAgent === 'myth_buster') {
    const nextIllusion = getNextIllusion(carrCoverage, mythProgress);
    orchestratorInstruction = buildMythBusterInstruction(
      decision.instructionToAgent,
      nextIllusion,
      mythProgress,
    );

    // Если иллюзий нет (все разобраны) — переходим к FREEDOM
    if (!nextIllusion && isMythBustingComplete(carrCoverage, mythProgress)) {
      phaseUpdate = PHASES.FREEDOM;
    }
  }

  const agentResult = await handleAgentRequest({
    message: message.trim(),
    agentType: nextAgent,
    conversationHistory,
    anamnesisData,
    userProfile,
    useAdaptiveMode: nextAgent === 'anamnesis' && process.env.USE_ADAPTIVE_ANAMNESIS === 'true',
    orchestratorInstruction,
    authContext,
    phase,
  });

  console.log(
    'Orchestrator →',
    nextAgent,
    '| phase:',
    phaseUpdate,
    '| instruction:',
    (orchestratorInstruction || '').slice(0, 140),
    authContext.isAuthenticated ? '| JWT user' : '| guest',
  );

  // Помечаем иллюзию разобранной только когда человек САМ её увидел (aha-момент),
  // а не просто потому что бот ответил. Страховка: после 3 заходов двигаемся дальше,
  // чтобы не застрять на одной иллюзии. Счётчик заходов едет в mythProgress под
  // служебным ключом __attempts_<key> (клиент гоняет mythProgress как непрозрачный объект).
  if (nextAgent === 'myth_buster' && phase !== PHASES.FREEDOM) {
    const nextIllusion = getNextIllusion(carrCoverage, mythProgress);
    if (nextIllusion) {
      const attemptsKey = `__attempts_${nextIllusion.key}`;
      const attempts = (Number(updatedMythProgress[attemptsKey]) || 0) + 1;
      updatedMythProgress[attemptsKey] = attempts;
      if (hasAhaSignal(message) || attempts >= 3) {
        updatedMythProgress[nextIllusion.key] = true;
      }
    }
  }

  let mergedAnamnesis = mergeAnamnesisWithCoverage(anamnesisData, agentResult.extractedData);
  mergedAnamnesis = finalizeAnamnesisCoverage(mergedAnamnesis);

  let effectivePhase = phaseUpdate;
  if (isEarlyPhase(phaseUpdate) && mergedAnamnesis.coverageReadyForMythBusting) {
    effectivePhase = PHASES.MYTH_BUSTING;
  }

  const userId = authContext.userId;

  if (userId) {
    // При первом сохранении — планируем email-последовательность
    try {
      const existing = await getOrchestratorSession(userId);
      const isFirstSave = !existing || !Array.isArray(existing.messages) || existing.messages.length === 0;
      if (isFirstSave && authContext.userEmail) {
        scheduleEmailSequence({
          userId,
          email: authContext.userEmail,
          name: mergedAnamnesis?.extractedProfile?.name || null,
          anamnesis: mergedAnamnesis,
        }).catch((e) => console.warn('scheduleEmailSequence error:', e));
      }
    } catch (e) {
      console.warn('email schedule check error:', e);
    }

    const finalMessages = [
      ...conversationHistory,
      {
        text: agentResult.response,
        isUser: false,
        timestamp: new Date().toISOString(),
      },
    ];
    await saveOrchestratorConversation(userId, finalMessages, {
      phase: effectivePhase,
      plan: decision.plan,
      anamnesis: mergedAnamnesis,
      mythProgress: updatedMythProgress,
      sessionBrief: decision.sessionBrief,
    });
  }

  return {
    response: agentResult.response,
    extractedData: agentResult.extractedData,
    extractedProfile: agentResult.extractedProfile,
    currentStep: agentResult.currentStep,
    phase: effectivePhase,
    nextAgent,
    plan: decision.plan,
    anamnesisState: mergedAnamnesis,
    coverageScore: mergedAnamnesis.coverageScore,
    mythProgress: updatedMythProgress,
    sessionBrief: decision.sessionBrief,
    onTrack: decision.onTrack,
    planUpdated: decision.planUpdated,
    isComplete: agentResult.isComplete,
    contextCompacted: agentResult.contextCompacted,
    contextStats: agentResult.contextStats,
    session: {
      isAuthenticated: authContext.isAuthenticated,
    },
  };
}
