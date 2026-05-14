/**
 * «Таблица» анамнеза в духе Аллена Карра: оркестратор и агент обновляют её из диалога.
 * Переход к myth_buster — по порогу coverageScore (без жёсткого сценария реплик).
 */

function cloneEmpty() {
  return JSON.parse(
    JSON.stringify({
      quantitative: {
        yearsInTrap: { value: null, confidence: 0, note: '' },
        cigarettesPerDay: { value: null, confidence: 0, note: '' },
      },
      attempts: {
        maxAbstinenceDays: { value: null, confidence: 0, note: '' },
        relapseReasons: { items: [], confidence: 0 },
        neverTriedQuitting: { value: null, confidence: 0 },
      },
      illusions: {
        stress: { suspected: null, evidence: '', fearLevel: null },
        boredom: { suspected: null, evidence: '' },
        concentration: { suspected: null, evidence: '' },
        social: { suspected: null, evidence: '' },
        coffeeAlcohol: { suspected: null, evidence: '' },
        work: { suspected: null, evidence: '' },
        lastCigarettePanic: { level: null, evidence: '' },
      },
      firstSmoke: {
        /** Первая сигарета: когда / как / обстоятельства (не дословный опрос — выжимка из речи). */
        firstCigarette: { value: null, confidence: 0, note: '' },
        /** Воспоминания, которые человек связывает с этим опытом. */
        associatedMemories: { items: [], confidence: 0 },
      },
    }),
  );
}

export const EMPTY_CARR_COVERAGE = cloneEmpty();

/** Порог готовности к фазе развенчания мифов (0–1). */
export function coverageThreshold() {
  const raw = process.env.ANAMNESIS_COVERAGE_THRESHOLD;
  if (raw == null || raw === '') return 0.72;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0.35, n)) : 0.72;
}

function mergeScalarRow(prev, next) {
  const p = prev && typeof prev === 'object' ? prev : {};
  const n = next && typeof next === 'object' ? next : {};
  const out = { ...p };
  for (const k of Object.keys(n)) {
    if (n[k] == null) continue;
    if (k === 'confidence') {
      out[k] = Math.max(Number(p[k]) || 0, Number(n[k]) || 0);
    } else if (k === 'note' || k === 'evidence') {
      const s = typeof n[k] === 'string' ? n[k].trim() : '';
      const o = typeof p[k] === 'string' ? p[k].trim() : '';
      out[k] = s.length >= o.length ? n[k] : p[k];
    } else {
      out[k] = n[k];
    }
  }
  return out;
}

function mergeRelapse(prev, next) {
  const p = prev && typeof prev === 'object' ? prev : { items: [], confidence: 0 };
  const n = next && typeof next === 'object' ? next : {};
  const items = Array.isArray(p.items) ? [...p.items] : [];
  if (Array.isArray(n.items)) {
    for (const x of n.items) {
      if (typeof x === 'string' && x.trim() && !items.includes(x.trim())) items.push(x.trim());
    }
  }
  return {
    items,
    confidence: Math.max(Number(p.confidence) || 0, Number(n.confidence) || 0),
  };
}

/**
 * @param {object|null} prev
 * @param {object|null} incoming
 */
export function mergeCarrCoverage(prev, incoming) {
  const base = prev && typeof prev === 'object' ? JSON.parse(JSON.stringify(prev)) : cloneEmpty();
  if (!incoming || typeof incoming !== 'object') return base;

  for (const key of Object.keys(base.quantitative)) {
    if (incoming.quantitative?.[key]) {
      base.quantitative[key] = mergeScalarRow(base.quantitative[key], incoming.quantitative[key]);
    }
  }
  if (incoming.attempts) {
    if (incoming.attempts.relapseReasons) {
      base.attempts.relapseReasons = mergeRelapse(base.attempts.relapseReasons, incoming.attempts.relapseReasons);
    }
    for (const key of ['maxAbstinenceDays', 'neverTriedQuitting']) {
      if (incoming.attempts[key]) {
        base.attempts[key] = mergeScalarRow(base.attempts[key], incoming.attempts[key]);
      }
    }
  }
  if (incoming.illusions) {
    for (const key of Object.keys(base.illusions)) {
      if (incoming.illusions[key]) {
        base.illusions[key] = mergeScalarRow(base.illusions[key], incoming.illusions[key]);
      }
    }
  }
  if (incoming.firstSmoke && typeof incoming.firstSmoke === 'object') {
    base.firstSmoke = base.firstSmoke || {
      firstCigarette: { value: null, confidence: 0, note: '' },
      associatedMemories: { items: [], confidence: 0 },
    };
    if (incoming.firstSmoke.firstCigarette) {
      base.firstSmoke.firstCigarette = mergeScalarRow(
        base.firstSmoke.firstCigarette,
        incoming.firstSmoke.firstCigarette,
      );
    }
    if (incoming.firstSmoke.associatedMemories) {
      base.firstSmoke.associatedMemories = mergeRelapse(
        base.firstSmoke.associatedMemories || { items: [], confidence: 0 },
        incoming.firstSmoke.associatedMemories,
      );
    }
  }
  return base;
}

/**
 * @param {object|null} base
 * @param {object|null} extracted
 */
export function mergeAnamnesisWithCoverage(base, extracted) {
  const b = base && typeof base === 'object' ? base : {};
  const e = extracted && typeof extracted === 'object' ? extracted : {};
  const out = { ...b, ...e };
  if (e.carrCoverage || b.carrCoverage) {
    out.carrCoverage = mergeCarrCoverage(b.carrCoverage, e.carrCoverage);
  }
  return out;
}

function conf(x) {
  if (!x || typeof x !== 'object') return 0;
  return Math.min(1, Math.max(0, Number(x.confidence) || 0));
}

function hasValue(x) {
  if (!x || typeof x !== 'object') return false;
  const v = x.value;
  return v != null && v !== '';
}

function illusionTouch(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.suspected === true || row.suspected === false) return true;
  if (typeof row.suspected === 'string' && row.suspected.trim()) return true;
  if (typeof row.evidence === 'string' && row.evidence.trim().length > 6) return true;
  if (row.fearLevel != null || row.level != null) return true;
  return false;
}

/**
 * @param {object} carr
 * @returns {number} 0..1
 */
export function computeCoverageScore(carr) {
  const c = carr && typeof carr === 'object' ? carr : cloneEmpty();
  const q = c.quantitative || {};
  const a = c.attempts || {};
  const ill = c.illusions || {};
  const first = c.firstSmoke || {};

  const quant =
    (hasValue(q.yearsInTrap) ? 0.12 + conf(q.yearsInTrap) * 0.1 : conf(q.yearsInTrap) * 0.12) +
    (hasValue(q.cigarettesPerDay) ? 0.12 + conf(q.cigarettesPerDay) * 0.1 : conf(q.cigarettesPerDay) * 0.12);

  const att =
    (hasValue(a.maxAbstinenceDays) || a.neverTriedQuitting?.value === true
      ? 0.12 + Math.max(conf(a.maxAbstinenceDays), conf(a.neverTriedQuitting)) * 0.08
      : Math.max(conf(a.maxAbstinenceDays), conf(a.neverTriedQuitting)) * 0.1) +
    ((a.relapseReasons?.items?.length ?? 0) > 0
      ? 0.1 + conf(a.relapseReasons) * 0.08
      : conf(a.relapseReasons) * 0.1);

  const keys = Object.keys(cloneEmpty().illusions);
  let touched = 0;
  for (const k of keys) {
    if (illusionTouch(ill[k])) touched++;
  }
  const illusionScore = keys.length ? (touched / keys.length) * 0.32 : 0;

  const firstPart =
    (hasValue(first.firstCigarette)
      ? 0.06 + conf(first.firstCigarette) * 0.04
      : conf(first.firstCigarette) * 0.06) +
    ((first.associatedMemories?.items?.length ?? 0) > 0
      ? 0.06 + conf(first.associatedMemories) * 0.04
      : conf(first.associatedMemories) * 0.06);

  const score = Math.min(1, quant + att + illusionScore + firstPart);
  return Math.round(score * 1000) / 1000;
}

/**
 * @param {object|null|undefined} anamnesisState
 */
export function finalizeAnamnesisCoverage(anamnesisState) {
  if (!anamnesisState || typeof anamnesisState !== 'object') {
    return {
      carrCoverage: cloneEmpty(),
      coverageScore: 0,
      coverageReadyForMythBusting: false,
    };
  }
  const carr = anamnesisState.carrCoverage || cloneEmpty();
  const coverageScore = computeCoverageScore(carr);
  const thr = coverageThreshold();
  return {
    ...anamnesisState,
    carrCoverage: carr,
    coverageScore,
    coverageReadyForMythBusting: coverageScore >= thr,
  };
}
