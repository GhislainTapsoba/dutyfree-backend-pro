// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // Body attendu: { token: string, maxAge?: number }
  try {
    const body = await req.json();
    const token = body?.token;
    const maxAge = Number(body?.maxAge ?? 60 * 60 * 24); // 1 day by default

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    // Set HttpOnly cookie
    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge,
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // Delete cookie
  res.cookies.set({
    name: "auth_token",
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res;
}
