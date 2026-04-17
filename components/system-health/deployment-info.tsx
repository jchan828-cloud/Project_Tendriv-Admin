interface DeploymentInfoProps {
  sha: string | null
  env: string | null
  region: string | null
  nodeVersion: string
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="text-body-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-mono-sm">{value}</div>
    </div>
  )
}

export function DeploymentInfo({ sha, env, region, nodeVersion }: DeploymentInfoProps) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="text-heading-sm">Deployment</div>
      </div>
      <div
        style={{
          padding: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 20,
        }}
      >
        <Field label="Commit" value={sha ? sha.slice(0, 7) : 'local'} />
        <Field label="Environment" value={env ?? 'development'} />
        <Field label="Region" value={region ?? 'local'} />
        <Field label="Node" value={nodeVersion} />
      </div>
    </div>
  )
}
