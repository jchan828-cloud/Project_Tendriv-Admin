/** MK8-CRM-001: Lead score badge — green 70-100, amber 40-69, red 0-39 */

interface ScoreBadgeProps {
  score: number
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const badgeClass =
    score >= 70
      ? 'badge-success'
      : score >= 40
        ? 'badge-warning'
        : 'badge-sovereign'

  return (
    <span className={`badge ${badgeClass}`}>
      {score}
    </span>
  )
}
