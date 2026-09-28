import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isAuthSkipEnabled } from "@/lib/auth-skip";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (isAuthSkipEnabled()) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isLandingPage = pathname === "/";
  const isPublicPage = isLoginPage || isLandingPage;
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (!user && !isPublicPage && !isPublicAsset) {
    const url = request.nextUrl.clone();
    const back = new URLSearchParams(request.nextUrl.search);
    back.delete("openExternalBrowser");
    const backQuery = back.toString();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${backQuery ? `?${backQuery}` : ""}`);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const next = request.nextUrl.searchParams.get("next") || "";
    const safe =
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/\\") &&
      !next.startsWith("/login");
    return NextResponse.redirect(new URL(safe ? next : "/estimates", request.url));
  }

  return supabaseResponse;
}
