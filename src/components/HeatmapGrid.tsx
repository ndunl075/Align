import type { Avail, Plan, ResponseDoc } from '../lib/plan'
import { slotLabel, sortSlots } from '../lib/plan'

/** Per-person cell: free = green, busy = red, not set = amber */
function personAvailStyle(v: Avail): { background: string; border: string; label: string } {
  if (v === 'yes')
    return {
      background: 'var(--heat-free)',
      border: '1px solid rgba(34, 197, 94, 0.85)',
      label: 'Free',
    }
  if (v === 'no')
    return {
      background: 'var(--heat-busy)',
      border: '1px solid rgba(239, 68, 68, 0.85)',
      label: 'Busy',
    }
  return {
    background: 'var(--heat-unset)',
    border: '1px solid rgba(234, 179, 8, 0.5)',
    label: 'Not set',
  }
}

type Consensus = 'all-yes' | 'all-no' | 'mixed' | 'some-free' | 'some-busy' | 'all-unset'

function slotConsensus(responses: ResponseDoc[], slotId: string): Consensus {
  const n = responses.length
  if (n === 0) return 'all-unset'
  let yes = 0
  let no = 0
  for (const r of responses) {
    const v = r.availability[slotId] ?? null
    if (v === 'yes') yes++
    else if (v === 'no') no++
  }
  if (yes === n) return 'all-yes'
  if (no === n) return 'all-no'
  if (yes > 0 && no > 0) return 'mixed'
  if (yes > 0) return 'some-free'
  if (no > 0) return 'some-busy'
  return 'all-unset'
}

function consensusStyle(c: Consensus): { background: string; border: string; hint: string } {
  switch (c) {
    case 'all-yes':
      return {
        background: 'var(--heat-consensus-all-free)',
        border: '1px solid #22c55e',
        hint: 'Everyone free',
      }
    case 'all-no':
      return {
        background: 'var(--heat-consensus-all-busy)',
        border: '1px solid #ef4444',
        hint: 'Everyone busy',
      }
    case 'mixed':
      return {
        background: 'var(--heat-mixed)',
        border: '1px solid #eab308',
        hint: 'Mixed — some free, some busy',
      }
    case 'some-free':
      return {
        background: 'var(--heat-consensus-partial-free)',
        border: '1px solid rgba(34, 197, 94, 0.55)',
        hint: 'Only free answers (others not set)',
      }
    case 'some-busy':
      return {
        background: 'var(--heat-consensus-partial-busy)',
        border: '1px solid rgba(239, 68, 68, 0.55)',
        hint: 'Only busy answers (others not set)',
      }
    default:
      return {
        background: 'var(--heat-consensus-none)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        hint: 'No answers yet',
      }
  }
}

type Props = {
  plan: Plan
  responses: ResponseDoc[]
}

export function HeatmapGrid({ plan, responses }: Props) {
  const slots = sortSlots(plan.slots)
  if (slots.length === 0 || responses.length === 0) return null

  return (
    <div className="heatmap-wrap">
      <h3 className="heatmap-title">Availability heatmap</h3>
      <p className="heatmap-legend" aria-label="Color key">
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch heatmap-legend-free" /> Free
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch heatmap-legend-busy" /> Busy
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch heatmap-legend-unset" /> Not set
        </span>
        <span className="heatmap-legend-item">
          <span className="heatmap-legend-swatch heatmap-legend-mixed" /> Mixed group
        </span>
      </p>
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-sticky-col">Who</th>
              {slots.map((s) => (
                <th key={s.id} title={slotLabel(s)}>
                  <span className="heatmap-th-inner">{slotLabel(s)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="heatmap-consensus-row">
              <td className="heatmap-sticky-col heatmap-consensus-label">Group</td>
              {slots.map((s) => {
                const c = slotConsensus(responses, s.id)
                const st = consensusStyle(c)
                const free = responses.filter((r) => r.availability[s.id] === 'yes').length
                return (
                  <td key={s.id} className="heatmap-cell heatmap-consensus-cell" title={st.hint}>
                    <div
                      className="heatmap-fill heatmap-fill--consensus"
                      style={{ background: st.background, border: st.border }}
                    >
                      <span className="heatmap-consensus-count">
                        {free}/{responses.length}
                      </span>
                    </div>
                  </td>
                )
              })}
            </tr>
            {responses.map((person) => (
              <tr key={person.id}>
                <td className="heatmap-sticky-col heatmap-name">{person.name}</td>
                {slots.map((s) => {
                  const v = person.availability[s.id] ?? null
                  const st = personAvailStyle(v)
                  return (
                    <td key={s.id} className="heatmap-cell">
                      <div
                        className="heatmap-fill"
                        style={{ background: st.background, border: st.border }}
                        title={st.label}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="heatmap-sticky-col heatmap-foot-label">Free count</td>
              {slots.map((s) => {
                const free = responses.filter((r) => r.availability[s.id] === 'yes').length
                return (
                  <td key={s.id} className="heatmap-foot">
                    {free}/{responses.length}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
