const PUBLIEKE_ROUTES = ["/login"] as const;

export function isPubliekeRoute(
  pathname: string
): boolean {
  return PUBLIEKE_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
}

export function veiligeVolgendeRoute(
  waarde: unknown
): string {
  if (
    typeof waarde !== "string" ||
    !waarde.startsWith("/") ||
    waarde.startsWith("//") ||
    waarde.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(
      waarde,
      "https://cfme-control.invalid"
    );

    if (
      url.origin !==
      "https://cfme-control.invalid"
    ) {
      return "/";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function loginVolgendeRoute(
  pathname: string,
  search: string
): string {
  if (pathname === "/") {
    return "/";
  }

  return veiligeVolgendeRoute(
    `${pathname}${search}`
  );
}
