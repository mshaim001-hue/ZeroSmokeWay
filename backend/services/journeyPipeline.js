import { PHASES, isLilaPhase } from './journeyPhases.js';
import { handleAgentRequest, formatMythSectionResponse } from './agentService.js';
import { resolveAuthContext } from './authContext.js';
import { saveOrchestratorConversation, getOrchestratorSession } from './conversationStore.js';
import { finalizeAnamnesisCoverage, mergeAnamnesisWithCoverage } from './anamnesisCoverage.js';
import {
  generateMythPlan,
  normalizeMythPlan,
  normalizeMythProgress,
  looksLikePledge,
} from './mythPlanService.js';
import { scheduleEmailSequence } from './emailSequenceService.js';
import {
  acceptsStage2Handoff,
  handleWhyISmokePhase,
  normalizeCompatBoardState,
  readHandoff,
  updateJourneySummary,
} from './whyISmokeGame/journey.js';

function isMythContinueMessage(text) {
  const t = String(text || '').trim().toLowerCase();
  return t === '▶ продолжить' || t === 'продолжить' || t === '[продолжить]';
}

/**
 * Выдаёт следующую часть повествования Карра из mythPlan.
 */
function deliverMythNarrative(mythPlan, mythProgress) {
  const plan = normalizeMythPlan(mythPlan);
  if (!plan) return { response: 'Готовлю твой план…', mythProgress, awaitingPledge: false };

  const mp = normalizeMythProgress(mythProgress);
  const idx = mp.sectionIndex;

  if (idx < plan.sections.length) {
    const response = formatMythSectionResponse(plan.sections[idx], idx, plan.sections.length);
    return {
      response,
      mythProgress: {
        ...mp,
        sectionIndex: idx + 1,
        narrativeComplete: idx + 1 >= plan.sections.length,
      },
      awaitingPledge: false,
      mythNarrativeActive: true,
    };
  }

  if (!mp.pledgeReceived) {
    return {
      response: plan.pledgePrompt,
      mythProgress: { ...mp, narrativeComplete: true },
      awaitingPledge: true,
      mythNarrativeActive: true,
    };
  }

  return { response: null, mythProgress: mp, awaitingPledge: false, mythNarrativeActive: false };
}

export async function runJourneyRequest({ body, authorizationHeader }) {
  const {
    message,
    conversationHistory = [],
    anamnesisData = null,
    phase = PHASES.WELCOME,
    userProfile = null,
    mythProgress = {},
    lilaState: rawLilaState = null,
    mythPlan: rawMythPlan = null,
    pledgeText: priorPledgeText = null,
  } = body;

  const authContext = await resolveAuthContext(authorizationHeader, conversationHistory);
  const msg = message.trim();

  let lilaState = normalizeCompatBoardState(rawLilaState ?? anamnesisData?.lilaState);
  let mythPlan = normalizeMythPlan(rawMythPlan ?? anamnesisData?.mythPlan);
  let updatedMythProgress = normalizeMythProgress(mythProgress);
  let pledgeText = priorPledgeText ?? anamnesisData?.pledgeText ?? null;
  let diceReady = false;

  const priorSnapshot = finalizeAnamnesisCoverage(anamnesisData);
  const carrCoverage = priorSnapshot.carrCoverage;

  // --- Фаза поддержки ---
  if (phase === PHASES.SUPPORT) {
    const agentResult = await handleAgentRequest({
      message: msg,
      agentType: 'support',
      conversationHistory,
      anamnesisData: priorSnapshot,
      userProfile,
      authContext,
      phase,
      mythPlan,
      pledgeText,
    });

    if (authContext.userId) {
      await saveOrchestratorConversation(
        authContext.userId,
        [...conversationHistory, { text: agentResult.response, isUser: false, timestamp: new Date().toISOString() }],
        {
          phase: PHASES.SUPPORT,
          anamnesis: priorSnapshot,
          mythProgress: updatedMythProgress,
          mythPlan,
          lilaState,
          pledgeText,
          diceReady: false,
        },
      );
    }

    return {
      response: agentResult.response,
      phase: PHASES.SUPPORT,
      anamnesisState: priorSnapshot,
      mythProgress: updatedMythProgress,
      mythPlan,
      lilaState,
      pledgeText,
      diceReady: false,
      session: { isAuthenticated: authContext.isAuthenticated },
    };
  }

  // --- Фаза myth_busting: повествование + обещание ---
  if (phase === PHASES.MYTH_BUSTING) {
    if (!mythPlan) {
      mythPlan = await generateMythPlan({ conversationHistory, carrCoverage });
    }

    if (updatedMythProgress.narrativeComplete && !updatedMythProgress.pledgeReceived && looksLikePledge(msg)) {
      pledgeText = msg;
      updatedMythProgress = { ...updatedMythProgress, pledgeReceived: true };

      const welcomeSupport = await handleAgentRequest({
        message: msg,
        agentType: 'support',
        conversationHistory: [...conversationHistory, { text: msg, isUser: true, timestamp: new Date().toISOString() }],
        anamnesisData: priorSnapshot,
        userProfile,
        authContext,
        phase: PHASES.SUPPORT,
        mythPlan,
        pledgeText,
        orchestratorInstruction:
          'Человек только что дал торжественное обещание бросить. Прими спокойно, без пафоса. ' +
          'Подтверди, что обещание принято. Коротко: ты рядом, когда потянет.',
      });

      const botMsg = { text: welcomeSupport.response, isUser: false, timestamp: new Date().toISOString() };
      if (authContext.userId) {
        await saveOrchestratorConversation(
          authContext.userId,
          [...conversationHistory, { text: msg, isUser: true, timestamp: new Date().toISOString() }, botMsg],
          {
            phase: PHASES.SUPPORT,
            anamnesis: priorSnapshot,
            mythProgress: updatedMythProgress,
            mythPlan,
            lilaState,
            pledgeText,
            diceReady: false,
          },
        );
      }

      return {
        response: welcomeSupport.response,
        phase: PHASES.SUPPORT,
        anamnesisState: priorSnapshot,
        mythProgress: updatedMythProgress,
        mythPlan,
        lilaState,
        pledgeText,
        diceReady: false,
        session: { isAuthenticated: authContext.isAuthenticated },
      };
    }

    if (isMythContinueMessage(msg)) {
      const narrative = deliverMythNarrative(mythPlan, updatedMythProgress);
      updatedMythProgress = narrative.mythProgress;
      const botMsg = { text: narrative.response, isUser: false, timestamp: new Date().toISOString() };

      if (authContext.userId) {
        await saveOrchestratorConversation(authContext.userId, [...conversationHistory, botMsg], {
          phase: PHASES.MYTH_BUSTING,
          anamnesis: { ...priorSnapshot, mythPlan, lilaState },
          mythProgress: updatedMythProgress,
          mythPlan,
          lilaState,
          pledgeText,
          diceReady: false,
        });
      }

      return {
        response: narrative.response,
        phase: PHASES.MYTH_BUSTING,
        anamnesisState: { ...priorSnapshot, mythPlan, lilaState },
        mythProgress: updatedMythProgress,
        mythPlan,
        lilaState,
        pledgeText,
        diceReady: false,
        awaitingPledge: narrative.awaitingPledge,
        session: { isAuthenticated: authContext.isAuthenticated },
      };
    }

    if (updatedMythProgress.narrativeComplete && !updatedMythProgress.pledgeReceived) {
      return {
        response: mythPlan?.pledgePrompt || 'Напиши торжественное обещание бросить — своими словами.',
        phase: PHASES.MYTH_BUSTING,
        anamnesisState: { ...priorSnapshot, mythPlan, lilaState },
        mythProgress: updatedMythProgress,
        mythPlan,
        lilaState,
        pledgeText,
        diceReady: false,
        awaitingPledge: true,
        session: { isAuthenticated: authContext.isAuthenticated },
      };
    }

    return {
      response: 'Нажми «Продолжить», чтобы читать дальше.',
      phase: PHASES.MYTH_BUSTING,
      anamnesisState: { ...priorSnapshot, mythPlan, lilaState },
      mythProgress: updatedMythProgress,
      mythPlan,
      lilaState,
      pledgeText,
      diceReady: false,
      session: { isAuthenticated: authContext.isAuthenticated },
    };
  }

  // --- Этап 1: why_i_smoke_game ---
  let effectivePhase = phase === PHASES.WELCOME ? PHASES.ANAMNESIS : phase;
  const game = await handleWhyISmokePhase({
    message: msg,
    anamnesis: priorSnapshot,
    conversationHistory,
    userId: authContext.userId,
  });

  const summaryAccepted = isLilaPhase(phase) && (
    game.kind === 'handoff_accept' || acceptsStage2Handoff(msg, {
      ...priorSnapshot,
      whyISmokeGame: game.session,
      stage2Handoff: game.handoff || priorSnapshot.stage2Handoff,
    })
  );

  diceReady = game.diceReady === true;
  lilaState = game.lilaState || lilaState;

  let mergedAnamnesis = mergeAnamnesisWithCoverage(anamnesisData, null);
  mergedAnamnesis = finalizeAnamnesisCoverage(mergedAnamnesis);
  mergedAnamnesis = updateJourneySummary(mergedAnamnesis, game.journeySummary);
  mergedAnamnesis.lilaState = lilaState;
  mergedAnamnesis.lilaBoardStatus = game.boardStatus;
  mergedAnamnesis.whyISmokeGame = game.session;
  mergedAnamnesis.pendingInitialAnswer = game.pendingInitialAnswer || '';
  mergedAnamnesis.stage2Handoff = game.handoff || readHandoff(mergedAnamnesis);
  mergedAnamnesis.gameIntroSeen = Boolean(priorSnapshot.gameIntroSeen || game.gameIntroSeen);

  if (summaryAccepted) {
    effectivePhase = PHASES.MYTH_BUSTING;
  } else if (isLilaPhase(phase)) {
    effectivePhase = PHASES.ANAMNESIS;
  }

  const agentResult = { response: game.response, extractedData: null };
  let response = agentResult.response;

  // Переход в myth_busting: генерируем план и сразу выдаём первую секцию
  if (effectivePhase === PHASES.MYTH_BUSTING && phase !== PHASES.MYTH_BUSTING) {
    if (!mythPlan) {
      mythPlan = await generateMythPlan({
        conversationHistory, carrCoverage: mergedAnamnesis.carrCoverage,
        journeySummary: mergedAnamnesis.lilaJourneySummary,
        stage2Handoff: mergedAnamnesis.stage2Handoff,
      });
    }
    mergedAnamnesis.mythPlan = mythPlan;
    const intro = mergedAnamnesis.stage2Handoff?.transition?.message
      ? `${mergedAnamnesis.stage2Handoff.transition.message}\n\n`
      : 'Теперь разберём, действительно ли сигарета даёт то, что ты ей приписываешь.\n\n';
    const narrative = deliverMythNarrative(mythPlan, updatedMythProgress);
    updatedMythProgress = narrative.mythProgress;
    response = intro + (narrative.response || '');
    diceReady = false;
  }

  if (authContext.userId) {
    try {
      const existing = await getOrchestratorSession(authContext.userId);
      const isFirstSave = !existing || !Array.isArray(existing.messages) || existing.messages.length === 0;
      if (isFirstSave && authContext.userEmail) {
        scheduleEmailSequence({
          userId: authContext.userId,
          email: authContext.userEmail,
          name: mergedAnamnesis?.extractedProfile?.name || null,
          anamnesis: mergedAnamnesis,
        }).catch((e) => console.warn('scheduleEmailSequence error:', e));
      }
    } catch (e) {
      console.warn('email schedule check error:', e);
    }

    await saveOrchestratorConversation(
      authContext.userId,
      [...conversationHistory, { text: response, isUser: false, timestamp: new Date().toISOString() }],
      {
        phase: effectivePhase,
        anamnesis: mergedAnamnesis,
        mythProgress: updatedMythProgress,
        mythPlan,
        lilaState,
        pledgeText,
        diceReady,
      },
    );
  }

  return {
    response,
    extractedData: agentResult.extractedData,
    phase: effectivePhase,
    anamnesisState: mergedAnamnesis,
    coverageScore: mergedAnamnesis.coverageScore,
    mythProgress: updatedMythProgress,
    mythPlan,
    lilaState,
    pledgeText,
    diceReady,
    lilaPosition: lilaState.position,
    gameEntered: lilaState.gameEntered,
    session: { isAuthenticated: authContext.isAuthenticated },
  };
}

/** @deprecated используйте runJourneyRequest */
export const runOrchestrationRequest = runJourneyRequest;
