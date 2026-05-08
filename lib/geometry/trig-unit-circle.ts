/**
 * Interactive Unit Circle — strict trigonometry quiz
 *
 * 3 questions, each with multiple sub-parts. All sub-parts MUST be answered
 * (single attempt, immediate feedback) before the student can advance.
 *
 * Capacité C₁ (locale à cette leçon) : angles, abscisses curvilignes, cos et sin.
 */

export const TRIG_CIRCLE_TEST_ID = 'test-geo-trig-circle'
export const TRIG_CIRCLE_RESULTS_KEY = 'geo-trig-circle:results'

export type TrigSubKind = 'place' | 'project-cos' | 'project-sin' | 'mcq'

export interface TrigSubTask {
  id: string
  /** Short visible label (used as point name on the circle). */
  label: string
  /** LaTeX expression shown to the student as the target. */
  labelTex: string
  kind: TrigSubKind
  /** Target angle (radians) for place / project tasks. */
  targetAngle?: number
  /** MCQ options (for kind === 'mcq'). */
  choices?: { id: string; tex: string; correct: boolean }[]
}

export interface TrigMainQuestion {
  id: string
  title: string
  /** LaTeX stem (can include $...$ segments). */
  stemTex: string
  competency: 'C1'
  subs: TrigSubTask[]
}

/** Tolerance (rad) for accepting a clicked angle — ≈ 5°. */
export const TRIG_TOLERANCE = Math.PI / 36

/** Tolerance for accepting a clicked tick value on the cos/sin axes. */
export const TRIG_VALUE_TOLERANCE = 0.04

/** Standard fractional values used as clickable axis ticks on cos / sin axes. */
export const AXIS_TICK_VALUES: { value: number; latex: string }[] = [
  { value: -1,                latex: '-1' },
  { value: -Math.sqrt(3) / 2, latex: String.raw`-\tfrac{\sqrt{3}}{2}` },
  { value: -Math.SQRT2 / 2,   latex: String.raw`-\tfrac{\sqrt{2}}{2}` },
  { value: -0.5,              latex: String.raw`-\tfrac{1}{2}` },
  { value: 0,                 latex: '0' },
  { value: 0.5,               latex: String.raw`\tfrac{1}{2}` },
  { value: Math.SQRT2 / 2,    latex: String.raw`\tfrac{\sqrt{2}}{2}` },
  { value: Math.sqrt(3) / 2,  latex: String.raw`\tfrac{\sqrt{3}}{2}` },
  { value: 1,                 latex: '1' },
]

export function valuesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= TRIG_VALUE_TOLERANCE
}

const π = Math.PI

export const TRIG_CIRCLE_QUESTIONS: TrigMainQuestion[] = [
  {
    id: 'Q1',
    title: 'Q1 — Placement sur le cercle trigonométrique',
    stemTex:
      'Représentez chaque point sur le cercle trigonométrique en cliquant à la bonne position.',
    competency: 'C1',
    subs: [
      { id: 'Q1-M', label: 'M', labelTex: String.raw`M\!\left(-\dfrac{7\pi}{6}\right)`, kind: 'place', targetAngle: -(7 * π) / 6 },
      { id: 'Q1-N', label: 'N', labelTex: String.raw`N\!\left(-\dfrac{5\pi}{4}\right)`, kind: 'place', targetAngle: -(5 * π) / 4 },
    ],
  },
  {
    id: 'Q2',
    title: 'Q2 — Lecture sur les axes cos / sin',
    stemTex:
      'Pour chaque valeur, cliquez sur la position correcte sur l\'axe cos (horizontal) ou sin (vertical). Les graduations exactes (±1, ±√3/2, ±√2/2, ±1/2, 0) sont cliquables.',
    competency: 'C1',
    subs: [
      { id: 'Q2-a', label: 'α', labelTex: String.raw`\cos\!\left(\dfrac{3\pi}{4}\right)`, kind: 'project-cos', targetAngle: (3 * π) / 4 },
      { id: 'Q2-b', label: 'β', labelTex: String.raw`\sin\!\left(\dfrac{\pi}{3}\right)`,  kind: 'project-sin', targetAngle: π / 3 },
      { id: 'Q2-c', label: 'γ', labelTex: String.raw`\sin\!\left(-\dfrac{2\pi}{3}\right)`, kind: 'project-sin', targetAngle: -(2 * π) / 3 },
      { id: 'Q2-d', label: 'δ', labelTex: String.raw`\cos\!\left(-\dfrac{4\pi}{3}\right)`, kind: 'project-cos', targetAngle: -(4 * π) / 3 },
    ],
  },
]

// ─── Validation helpers ─────────────────────────────────────────────────────

/** Normalize to [0, 2π). */
function norm(a: number): number {
  const two = 2 * Math.PI
  return ((a % two) + two) % two
}

/** True when two angles coincide modulo 2π within TRIG_TOLERANCE. */
export function anglesMatch(a: number, b: number): boolean {
  const da = norm(a)
  const db = norm(b)
  const diff = Math.min(Math.abs(da - db), 2 * Math.PI - Math.abs(da - db))
  return diff <= TRIG_TOLERANCE
}

// ─── Result persistence ─────────────────────────────────────────────────────

export interface TrigSubAnswer {
  subId: string
  clickedAngle?: number // for place
  clickedValue?: number // for project-cos / project-sin (axis ticks)
  choiceId?: string // for mcq
  correct: boolean
  reactionTimeMs: number
}

export interface TrigCircleResult {
  id: string
  userName?: string
  startedAt: string
  completedAt: string
  answers: TrigSubAnswer[]
  totalMs: number
  correctCount: number
  score: number
}

export function listTrigCircleResults(): TrigCircleResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TRIG_CIRCLE_RESULTS_KEY)
    return raw ? (JSON.parse(raw) as TrigCircleResult[]) : []
  } catch {
    return []
  }
}

export function saveTrigCircleResult(r: TrigCircleResult) {
  if (typeof window === 'undefined') return
  const all = listTrigCircleResults()
  all.push(r)
  window.localStorage.setItem(TRIG_CIRCLE_RESULTS_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('trig-circle-changed'))
}
