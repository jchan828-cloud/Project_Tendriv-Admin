# Autoblog

AI-assisted blog generation. The admin app is a thin shell over an
external generation engine (`AUTOBLOG_ENGINE_URL`) — the engine owns
the LLM call, the run table, and the SSE stream; the admin owns the
review UI, the publish trigger, and the settings.

## Entry points

- UI: `app/(dashboard)/autoblog/` (tabs: Dashboard, Review, Settings)
- API: `app/api/autoblog/{trigger,runs,run/[runId],stream/[runId],review,publish,settings,health}/route.ts`
- Engine boundary: `lib/autoblog/proxy.ts`
- Types: `lib/types/autoblog.ts`

## User journey

```mermaid
journey
    title Editor publishes an Autoblog post
    section Trigger
      Open Autoblog → Dashboard tab: 4: Editor
      Click "Generate" or wait for schedule: 5: Editor, Cron
    section Watch generation
      See live SSE stream of section drafts: 5: Editor
      Wait ~30-90s for completion: 3: Editor
    section Review
      Open Review tab → pick latest run: 5: Editor
      Read draft + SEO metadata: 4: Editor
      Accept or Reject (sets status): 5: Editor
    section Publish
      Click Publish → blog_posts.status=published: 5: Editor
      Cross-post LinkedIn draft (optional): 4: Editor
```

## Generation pipeline

```mermaid
sequenceDiagram
    participant UI as Autoblog UI
    participant Trigger as api/autoblog/trigger
    participant Proxy as lib/autoblog/proxy.ts
    participant Engine as Autoblog engine
    participant Stream as api/autoblog/stream/[runId]
    participant DB as Supabase blog_posts

    UI->>Trigger: POST /trigger
    Trigger->>Proxy: proxyToEngine('/runs', POST)
    Proxy->>Engine: POST /runs
    Engine-->>Proxy: { runId, status: 'running' }
    Proxy-->>Trigger: Response
    Trigger-->>UI: { runId }

    UI->>Stream: GET /stream/[runId] (SSE)
    Stream->>Proxy: proxyToEngine('/stream/...', GET)
    Proxy->>Engine: GET /stream/...
    Engine-->>Stream: event: section { ... }
    loop until status terminal
        Engine-->>Stream: event: section / status
        Stream-->>UI: forward SSE chunk
    end
    Engine-->>Stream: event: status { status: 'completed' }
    Stream-->>UI: close

    UI->>UI: User clicks Publish
    UI->>+Trigger: POST api/autoblog/publish { runId }
    Trigger->>Proxy: proxyToEngine('/publish', POST)
    Engine-->>Trigger: { post: { slug, content, seo_metadata } }
    Trigger->>DB: INSERT blog_posts (status='published')
    Trigger-->>UI: 201 Created
```

## Tables touched

| Table | Read | Write | Notes |
|---|:-:|:-:|---|
| `autoblog_runs` (external) | ✓ | ✓ | Owned by engine, not in `supabase/migrations/` |
| `autoblog_settings` (external) | ✓ | ✓ | Same |
| `blog_posts` | ✓ | ✓ | Admin writes on publish; status flows draft→published |
| `linkedin_drafts` | ✓ | ✓ | Optional cross-post on publish |

## External services

- Autoblog engine at `process.env.AUTOBLOG_ENGINE_URL`
  (default `https://rfp-blog.vercel.app`).
- Network failures wrapped in `EngineUnreachableError`
  (`lib/autoblog/proxy.ts:4`).

## See also

- State machine: [`state-machines/autoblog-runs.md`](../state-machines/autoblog-runs.md)
- State machine: [`state-machines/blog-posts.md`](../state-machines/blog-posts.md)
