// The drawings in the interview report. Everything here is drawn from your real data:
// your heart rate while you spoke, and when each word was said.
import { heartZone } from "../../sensing/zones";
import { color } from "../../ui/tokens";
import type { Timeline } from "./answerTimeline";
import type { Coaching } from "./interviewApi";
import { areaPath, bpmDomain, heartCoverage, heartSpans, linear, smoothPath, type Point } from "./pulseGeometry";

type Spoken = { text: string; start: number; end: number; kind: "word" | "hedge" | "filler" };

// Every word on the clock, in order.
function spokenWords(timeline: Timeline): Spoken[] {
  const out: Spoken[] = [];
  for (const p of timeline.pieces) {
    if (p.type === "run") for (const w of p.words) out.push({ ...w, kind: w.hedge ? "hedge" : "word" });
    if (p.type === "filler") out.push({ text: p.text, start: p.start, end: p.end, kind: "filler" });
  }
  return out.sort((a, b) => a.start - b.start);
}

const zoneColor = (bpm: number, reference: number | null) => heartZone(bpm, reference).color;

// Gradient stops so the heart line changes color with your zone as it goes.
function ZoneGradient({ id, points, bpms, reference, x0, x1 }: { id: string; points: Point[]; bpms: number[]; reference: number | null; x0: number; x1: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x0} x2={x1} y1={0} y2={0}>
      {points.map((p, i) => (
        <stop key={i} offset={Math.min(1, Math.max(0, (p.x - x0) / (x1 - x0 || 1)))} stopColor={zoneColor(bpms[i], reference)} />
      ))}
    </linearGradient>
  );
}

// ---------- One answer: a heart strip with your words laid over it, on one clock ----------

const W = 800;
const PAD = 8;
const BAND_TOP = 30;
const BAND_BOTTOM = 74;
const WORD_Y = 88;
export function PulseScore({ timeline, time = -1, id }: { timeline: Timeline; time?: number; id: string }) {
  const words = spokenWords(timeline);
  if (words.length === 0) return null;
  const duration = Math.max(timeline.duration, 1);
  const x = linear(0, duration, PAD, W - PAD);
  const heart = timeline.heart.filter((p) => p.t >= 0 && p.t <= duration);
  const spans = heartSpans(heart, duration);
  const coverage = heartCoverage(heart, duration);

  // The line sits inside the strip, scaled to this answer's own range (at least 12 bpm tall, so noise stays flat).
  const bpms = heart.map((p) => p.bpm);
  const mid = bpms.length ? (Math.max(...bpms) + Math.min(...bpms)) / 2 : 0;
  const half = Math.max(6, bpms.length ? (Math.max(...bpms) - Math.min(...bpms)) / 2 + 2 : 6);
  const y = linear(mid - half, mid + half, BAND_BOTTOM - 6, BAND_TOP + 6);
  const points = heart.map((p) => ({ x: x(p.t), y: y(p.bpm) }));

  let peakIndex = -1;
  bpms.forEach((b, i) => (peakIndex === -1 || b > bpms[peakIndex] ? (peakIndex = i) : null));
  const peak = timeline.peak && peakIndex >= 0 ? points[peakIndex] : null;

  const gaps: { from: number; to: number }[] = [];
  for (let i = 1; i < words.length; i++) {
    if (words[i].start - words[i - 1].end > 2) gaps.push({ from: words[i - 1].end, to: words[i].start });
  }

  const summary =
    coverage < 0.3
      ? "Heart signal was weak for most of this answer"
      : timeline.peak
        ? `Heart rose at “${timeline.peak.snippet}”`
        : "Heart stayed calm";

  return (
    <svg
      viewBox={`0 0 ${W} 124`}
      role="img"
      aria-label={`${summary}. Your words are laid along the same timeline.`}
      style={{ width: "100%", height: "auto", display: "block", margin: "6px 0 16px", overflow: "visible" }}
    >
      <defs>
        {/* Diagonal lines = no heart reading at that moment */}
        <pattern id={`${id}-none`} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke={color.line} strokeWidth={3} />
        </pattern>
        <clipPath id={`${id}-band`}>
          <rect x={PAD} y={BAND_TOP} width={W - PAD * 2} height={BAND_BOTTOM - BAND_TOP} rx={10} />
        </clipPath>
      </defs>

      <text x={PAD} y={18} fontSize={13} fontWeight={700} fill={color.ink}>
        {summary}
      </text>
      {coverage > 0 && coverage < 0.8 && (
        <text x={W - PAD} y={18} fontSize={12} fill={color.muted} textAnchor="end">
          read {Math.round(coverage * 100)}% of the time
        </text>
      )}

      {/* The strip: hatched where there was no reading, tinted by zone where there was */}
      <g clipPath={`url(#${id}-band)`}>
        <rect x={PAD} y={BAND_TOP} width={W - PAD * 2} height={BAND_BOTTOM - BAND_TOP} fill={color.surface2} />
        <rect x={PAD} y={BAND_TOP} width={W - PAD * 2} height={BAND_BOTTOM - BAND_TOP} fill={`url(#${id}-none)`} />
        {spans.map((sp, i) => (
          <g key={i} className="row-in" style={{ animationDelay: `${Math.min(i * 40, 900)}ms` }}>
            {/* solid base first, so the "no reading" lines don't show through */}
            <rect x={x(sp.from)} y={BAND_TOP} width={x(sp.to) - x(sp.from) + 0.6} height={BAND_BOTTOM - BAND_TOP} fill={color.surface} />
            <rect
              x={x(sp.from)}
              y={BAND_TOP}
              width={x(sp.to) - x(sp.from) + 0.6}
              height={BAND_BOTTOM - BAND_TOP}
              fill={zoneColor(sp.bpm, timeline.reference)}
              fillOpacity={0.38}
            />
          </g>
        ))}
        {points.length >= 2 && (
          <path className="score-draw" pathLength={1} d={smoothPath(points)} fill="none" stroke={color.ink} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
        )}
      </g>

      {peak && timeline.peak && (
        <circle className="peak-pop" cx={peak.x} cy={peak.y} r={5} fill={color.surface} stroke={zoneColor(bpms[peakIndex], timeline.reference)} strokeWidth={3} />
      )}

      {/* Your words on the same clock: amber dots are filler sounds, outlines sound unsure */}
      {words.map((w, i) =>
        w.kind === "filler" ? (
          <circle key={i} cx={x((w.start + w.end) / 2)} cy={WORD_Y + 5} r={5} fill={color.alert}>
            <title>{w.text}</title>
          </circle>
        ) : (
          <rect
            key={i}
            x={x(w.start)}
            y={WORD_Y}
            width={Math.max(3, x(w.end) - x(w.start) - 2)}
            height={10}
            rx={5}
            fill={w.kind === "hedge" ? "none" : color.tide}
            fillOpacity={time >= w.start && time <= w.end + 0.15 ? 1 : 0.35}
            stroke={w.kind === "hedge" ? color.muted : "none"}
            strokeDasharray={w.kind === "hedge" ? "2 2" : undefined}
          >
            <title>{w.text}</title>
          </rect>
        ),
      )}
      {gaps.map((g, i) => (
        <g key={i}>
          <line x1={x(g.from) + 4} x2={x(g.to) - 4} y1={WORD_Y + 5} y2={WORD_Y + 5} stroke={color.muted} strokeWidth={1} strokeDasharray="2 3" />
          <text x={x((g.from + g.to) / 2)} y={WORD_Y + 24} textAnchor="middle" fontSize={11} fill={color.muted}>
            {(g.to - g.from).toFixed(1)}s quiet
          </text>
        </g>
      ))}

      {time >= 0 && <line x1={x(time)} x2={x(time)} y1={BAND_TOP - 4} y2={WORD_Y + 14} stroke={color.ink} strokeWidth={2} />}

      <text x={PAD} y={120} fontSize={11} fill={color.muted}>
        0s
      </text>
      <text x={W - PAD} y={120} fontSize={11} fill={color.muted} textAnchor="end">
        {Math.round(duration)}s
      </text>
    </svg>
  );
}

// ---------- Whole interview: one heart line across every answer ----------

type Segment = { n: number; timeline: Timeline };

export function InterviewPulse({ segments }: { segments: Segment[] }) {
  const usable = segments.filter((s) => s.timeline.heart.length >= 2 && s.timeline.duration > 0);
  if (usable.length === 0) return null;
  const WIDTH = 1000;
  const TOP = 44;
  const BOTTOM = 150;
  const GAP = 36;
  const reference = usable[0].timeline.reference;
  const [lo, hi] = bpmDomain(
    usable.flatMap((s) => s.timeline.heart.map((p) => p.bpm)),
    reference,
  );
  const y = linear(lo, hi, BOTTOM, TOP);

  // Each answer gets width in proportion to how long it was (with a minimum).
  const total = usable.reduce((sum, s) => sum + Math.max(s.timeline.duration, 8), 0);
  const room = WIDTH - GAP * (usable.length - 1);
  const widths = usable.map((s) => (Math.max(s.timeline.duration, 8) / total) * room);
  const starts = widths.map((_, i) => widths.slice(0, i).reduce((sum, w) => sum + w + GAP, 0));
  const laid = usable.map((s, i) => {
    const width = widths[i];
    const x0 = starts[i];
    const x = linear(0, s.timeline.duration, x0, x0 + width);
    const heart = s.timeline.heart.filter((p) => p.t >= 0 && p.t <= s.timeline.duration);
    return { ...s, x0, x1: x0 + width, points: heart.map((p) => ({ x: x(p.t), y: y(p.bpm) })), bpms: heart.map((p) => p.bpm) };
  });

  // The single highest moment of the interview.
  let top: { seg: (typeof laid)[number]; i: number } | null = null;
  for (const seg of laid) seg.bpms.forEach((b, i) => (!top || b > top.seg.bpms[top.i] ? (top = { seg, i }) : null));
  const best = top as { seg: (typeof laid)[number]; i: number } | null;
  const showPeak = best && best.seg.timeline.peak;

  return (
    <figure style={{ margin: "22px 0 8px" }}>
      <svg viewBox={`0 0 ${WIDTH} 190`} role="img" aria-label="Your heart rate across the whole interview" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          {laid.map((s) => (
            <ZoneGradient key={s.n} id={`ip-${s.n}`} points={s.points} bpms={s.bpms} reference={reference} x0={s.x0} x1={s.x1} />
          ))}
        </defs>
        {reference !== null && (
          <line x1={0} x2={WIDTH} y1={y(reference)} y2={y(reference)} stroke={color.line} strokeWidth={1.5} strokeDasharray="4 5" />
        )}
        {laid.map((s, k) => (
          <g key={s.n}>
            <path d={areaPath(s.points, BOTTOM + 6)} fill={`url(#ip-${s.n})`} opacity={0.16} />
            <path
              className="score-draw"
              pathLength={1}
              d={smoothPath(s.points)}
              fill="none"
              stroke={`url(#ip-${s.n})`}
              strokeWidth={4}
              strokeLinecap="round"
              style={{ animationDelay: `${k * 0.5}s` }}
            />
            <text x={s.x0} y={178} fontSize={14} fontWeight={700} fill={color.ink}>
              Question {s.n}
            </text>
            <text x={s.x1} y={178} fontSize={12} fill={color.muted} textAnchor="end">
              {Math.round(s.timeline.duration)}s
            </text>
          </g>
        ))}
        {showPeak && best && (
          <g className="peak-pop">
            <circle cx={best.seg.points[best.i].x} cy={best.seg.points[best.i].y} r={7} fill={color.surface} stroke={color.high} strokeWidth={3.5} />
            <text
              x={Math.min(Math.max(best.seg.points[best.i].x, 130), WIDTH - 130)}
              y={Math.max(best.seg.points[best.i].y - 16, 16)}
              textAnchor="middle"
              fontSize={16}
              fontWeight={700}
              fill={color.ink}
            >
              “{best.seg.timeline.peak!.snippet}”
            </text>
          </g>
        )}
      </svg>
      <figcaption style={{ color: color.muted, fontSize: 14, marginTop: 4 }}>
        {showPeak && best
          ? `Your heart ran highest in question ${best.seg.n}, while you were saying “${best.seg.timeline.peak!.snippet}”. The dashed line is your usual rate.`
          : "Your heart stayed close to your usual rate the whole way through. The dashed line is your usual rate."}
      </figcaption>
    </figure>
  );
}

// ---------- Story check: did the answer have a situation, what you did, and how it ended? ----------

const STORY_PARTS: { key: "situation" | "action" | "result"; label: string }[] = [
  { key: "situation", label: "The situation" },
  { key: "action", label: "What you did" },
  { key: "result", label: "How it ended" },
];

export function StoryArc({ coaching }: { coaching: Coaching }) {
  if (coaching.situation === undefined && coaching.action === undefined && coaching.result === undefined) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, margin: "18px 0 6px", maxWidth: 720 }} aria-label="Story check">
      {STORY_PARTS.map(({ key, label }, i) => {
        const said = (coaching[key] ?? "").trim();
        return (
          <div key={key} className="row-in" style={{ animationDelay: `${i * 120}ms` }}>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: said ? color.tide : "transparent",
                border: said ? "none" : `2px dashed ${color.line}`,
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 13, color: color.muted, marginTop: 6 }}>{label}</div>
            <div style={{ fontSize: 15, color: said ? color.ink : color.high, fontWeight: said ? 500 : 600 }}>
              {said || "Missing"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
