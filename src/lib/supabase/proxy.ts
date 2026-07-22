import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import {
  isPubliekeRoute,
  loginVolgendeRoute,
  veiligeVolgendeRoute,
} from "@/lib/auth/navigatie";

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

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (claimsError) {
    console.warn(
      "[CFME Auth] Sessiecontrole mislukt",
      {
        message:
          claimsError.message || null,
        code:
          "code" in claimsError
            ? claimsError.code
            : null,
      }
    );
  }

  const claims =
    claimsError
      ? null
      : claimsData?.claims ?? null;

  const pathname =
    request.nextUrl.pathname;
  const publiekeRoute =
    isPubliekeRoute(pathname);

  if (!claims && !publiekeRoute) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const volgende =
      loginVolgendeRoute(
        pathname,
        request.nextUrl.search
      );

    if (volgende !== "/") {
      loginUrl.searchParams.set(
        "volgende",
        volgende
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  if (claims && pathname === "/login") {
    const dashboardUrl =
      request.nextUrl.clone();

    const volgende =
      veiligeVolgendeRoute(
        request.nextUrl.searchParams.get(
          "volgende"
        )
      );

    dashboardUrl.pathname = volgende;
    dashboardUrl.search = "";

    return NextResponse.redirect(
      dashboardUrl
    );
  }

  return response;
}
