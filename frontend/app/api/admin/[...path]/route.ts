import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const adminKey = req.headers.get("x-admin-key") ?? req.headers.get("X-Admin-Key") ?? "";
  const url = `${BACKEND}/admin/${path.join("/")}`;

  console.log("Admin key received:", adminKey);
  console.log("Forwarding to:", url);

  const res = await fetch(url, {
    headers: { "x-admin-key": adminKey, "Content-Type": "application/json" },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const adminKey = req.headers.get("x-admin-key") ?? req.headers.get("X-Admin-Key") ?? "";
  const url = `${BACKEND}/admin/${path.join("/")}`;

  console.log("Admin key received:", adminKey);
  console.log("Forwarding to:", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "x-admin-key": adminKey, "Content-Type": "application/json" },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
