import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const adminKey = req.headers.get("x-admin-key") || "";
  const url = `${BACKEND}/admin/${path.join("/")}`;

  const res = await fetch(url, { headers: { "x-admin-key": adminKey } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const adminKey = req.headers.get("x-admin-key") || "";
  const url = `${BACKEND}/admin/${path.join("/")}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "x-admin-key": adminKey },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
