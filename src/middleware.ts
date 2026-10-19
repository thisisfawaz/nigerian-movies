import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every request and gates /admin.
 *
 * When Supabase is not configured, /admin is treated as non-existent
 * (redirected home) because the admin dashboard requires a database.
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // IMPORTANT: pass the whole `request` (not a stale header snapshot) into
  // NextResponse.next() so cookies refreshed below are visible to Server
  // Components in this same request AND written back to the browser.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  // Protect all /admin routes except the login page. Fails closed: if
  // ADMIN_EMAIL is unset, nobody is treated as an admin rather than everybody.
  if (isAdminRoute && !request.nextUrl.pathname.startsWith("/admin/login")) {
    if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) {
      // Sign out any unauthorized or non-matching user to clear their session,
      // then send them home. No hint that /admin exists.
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
