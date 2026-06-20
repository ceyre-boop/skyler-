import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const result = await signUp(email, password);
  if (!result.ok) {
    const taken = result.error.includes("already exists");
    return NextResponse.json({ error: result.error }, { status: taken ? 409 : 400 });
  }
  return NextResponse.json({ ok: true });
}
