import type { NextState } from './api.ts';

export type OfferGate = {
  ready: boolean;
  open: boolean;
};

export function gateAfterModel(gate: OfferGate, next: NextState): OfferGate & { launch: boolean } {
  if (next === 'launch' && gate.ready) return { ready: true, open: false, launch: true };
  if (next === 'offer' || next === 'launch') return { ready: true, open: true, launch: false };
  return { ready: gate.ready, open: false, launch: false };
}

export function gateAfterUserTalk(gate: OfferGate): OfferGate {
  return { ready: gate.ready, open: false };
}

export function gateAfterKeepTalking(gate: OfferGate): OfferGate {
  return { ready: gate.ready, open: false };
}
