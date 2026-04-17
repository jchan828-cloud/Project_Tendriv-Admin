import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/* Force Node.js runtime so middleware respects vercel.json regions (yul1).
   Without this, Next.js runs middleware at all Vercel edge locations,
   routing auth tokens through US infrastructure — a sovereignty violation. */
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  // Public API routes — skip auth redirect.
  // /api/drains/* endpoints authenticate via HMAC signature (Vercel) or
  // a shared bearer token (Supabase), not via session cookies.
  if (
    request.nextUrl.pathname.startsWith('/api/marketing/') ||
    request.nextUrl.pathname.startsWith('/api/drains/')
  ) {
    return response;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
