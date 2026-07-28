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

function verwijderSupabaseCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    }
  }

  return response;
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

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;
  const publiekeRoute =
    isPubliekeRoute(pathname);

  if (gebruikerFout) {
    console.warn(
      "[CFME Auth] Ongeldige sessie verwijderd",
      {
        message:
          gebruikerFout.message || null,
        code:
          "code" in gebruikerFout
            ? gebruikerFout.code
            : null,
      }
    );
  }

  if (!user && !publiekeRoute) {
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

    return verwijderSupabaseCookies(
      request,
      NextResponse.redirect(loginUrl)
    );
  }

  if (!user && gebruikerFout) {
    return verwijderSupabaseCookies(
      request,
      response
    );
  }

  if (user && pathname === "/login") {
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
