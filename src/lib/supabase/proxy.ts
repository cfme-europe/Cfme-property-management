import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

const publiekeRoutes = ["/login"];

function isPubliekeRoute(pathname: string) {
  return publiekeRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

export async function updateSession(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims ?? null;

  const pathname = request.nextUrl.pathname;
  const publiekeRoute =
    isPubliekeRoute(pathname);

  if (!claims && !publiekeRoute) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    if (pathname !== "/") {
      loginUrl.searchParams.set(
        "volgende",
        `${pathname}${request.nextUrl.search}`
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  if (claims && pathname === "/login") {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";

    return NextResponse.redirect(
      dashboardUrl
    );
  }

  return response;
}
