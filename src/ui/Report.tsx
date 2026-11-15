import type { BpmPoint } from "../sensing/useSensing";
import { formatDuration, type SessionEvent, type SessionSummary } from "../session/session";
import { LEVEL_NAMES } from "../engine/coach";
import { color } from "./tokens";
import { bpmRange, heartZone } from "../sensing/zones";

type Props = {
  summary: SessionSummary;
  events: SessionEvent[];
  heart: BpmPoint[];
  takeaway: string | null;
  comparison: string | null;
  history: SessionSummary[];
  onRestart: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12 }}>
      <div style={{ color: color.muted, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// Heart rate over the session, with marks for runs (gray), nudges (yellow), and stuck time (red band).
function Timeline({ summary, events, heart }: Pick<Props, "summary" | "events" | "heart">) {
  const W = 600;
  const H = 140;
  const start = summary.startedAt;
  const duration = Math.max(summary.durationMs, 1);
  const x = (t: number) => ((t - start) / duration) * W;
  const points = heart.filter((p) => p.t >= start && p.t <= start + duration);
  const bpms = points.map((p) => p.bpm);
  const lo = Math.min(...bpms, summary.heart?.baseline ?? 200) - 5;
  const hi = Math.max(...bpms, summary.heart?.baseline ?? 0) + 5;
  const y = (bpm: number) => H - 10 - ((bpm - lo) / Math.max(hi - lo, 1)) * (H - 20);

  // Stuck periods as [from, to] pairs.
  const stuckBands: [number, number][] = [];
  let stuckAt: number | null = null;
  for (const e of events) {
    if (e.type === "stuck" && stuckAt === null) stuckAt = e.t;
    if ((e.type === "unstuck" || e.type === "end") && stuckAt !== null) {
      stuckBands.push([stuckAt, e.t]);
      stuckAt = null;
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12 }}>
      {stuckBands.map(([a, b]) => (
        <rect key={a} x={x(a)} y={0} width={Math.max(x(b) - x(a), 2)} height={H} fill={color.high} opacity={0.15} />
      ))}
      {summary.heart?.baseline != null && (
        <line x1={0} x2={W} y1={y(summary.heart.baseline)} y2={y(summary.heart.baseline)} stroke={color.muted} strokeDasharray="4 4" />
      )}
      {events.map((e, i) =>
        e.type === "run" ? (
          <line key={i} x1={x(e.t)} x2={x(e.t)} y1={0} y2={H} stroke={color.line} strokeWidth={1} />
        ) : e.type === "nudge" ? (
          <line key={i} x1={x(e.t)} x2={x(e.t)} y1={0} y2={H} stroke={color.alert} strokeWidth={2} />
        ) : null,
      )}
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${x(p.t)},${y(p.bpm)}`).join(" ")}
          fill="none"
          stroke={color.tide}
          strokeWidth={2.5}
        />
      )}
    </svg>
  );
}

export default function Report({ summary, events, heart, takeaway, comparison, history, onRestart }: Props) {
  const help =
    summary.nudges === 0
      ? "None, solved on your own"
      : `${summary.nudges} (up to a ${LEVEL_NAMES[summary.highestHelpLevel]})`;

  return (
    <div style={{ maxWidth: 760 }}>
      <h2>{summary.solved ? `You solved ${summary.problem}` : `${summary.problem}: not solved yet`}</h2>
      <p style={{ color: color.muted }}>Here's how the session went.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat label="Total time" value={formatDuration(summary.durationMs)} />
        <Stat label="Time stuck" value={formatDuration(summary.timeStuckMs)} />
        <Stat label="Runs" value={String(summary.runs)} />
        <Stat label="Tests passed" value={`${summary.bestPassed}/${summary.totalTests}`} />
        <Stat label="Help used" value={help} />
        <Stat
          label="Heart rate at its highest"
          value={summary.heart ? `${heartZone(summary.heart.max, summary.heart.baseline).label}, ${bpmRange(summary.heart.max)} BPM` : "No reading"}
        />
      </div>

      <h3>Timeline</h3>
      <Timeline summary={summary} events={events} heart={heart} />
      <p style={{ color: color.muted, fontSize: 13 }}>
        The line is your heart rate and the dashed line is your resting rate. Thin lines mark each run,
        amber lines mark when InFlow stepped in, and red shading shows when you were stuck.
      </p>

      <h3>Takeaway</h3>
      <p>{takeaway ?? "Writing your takeaway..."}</p>
      {comparison && <p style={{ color: color.tide, fontWeight: 600 }}>{comparison}</p>}

      {history.length > 1 && (
        <>
          <h3>History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr style={{ color: color.muted, textAlign: "left" }}>
                <th>Date</th>
                <th>Result</th>
                <th>Time</th>
                <th>Stuck</th>
                <th>Help</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 8).map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.startedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td>{s.solved ? "Solved" : "Not yet"}</td>
                  <td>{formatDuration(s.durationMs)}</td>
                  <td>{formatDuration(s.timeStuckMs)}</td>
                  <td>{s.nudges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button onClick={onRestart} style={{ marginTop: 24 }}>
        Practice again
      </button>
    </div>
  );
}
