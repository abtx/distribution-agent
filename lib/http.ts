type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  maxAge?: number;
  path?: string;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

export class HttpResponse extends Response {
  cookies = {
    set: (name: string, value: string, options?: CookieOptions) => {
      this.headers.append("Set-Cookie", serializeCookie(name, value, options));
    },
    delete: (name: string) => {
      this.headers.append(
        "Set-Cookie",
        serializeCookie(name, "", { maxAge: 0, path: "/" }),
      );
    },
  };

  static json(data: unknown, init?: ResponseInit) {
    return new HttpResponse(JSON.stringify(data), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  }

  static redirect(url: string | URL, status = 307) {
    return new HttpResponse(null, { status, headers: { Location: String(url) } });
  }
}

export { HttpResponse as NextResponse };
