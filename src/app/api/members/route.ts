import { NextResponse } from "next/server";
import { isGlobalAdmin } from "@/lib/auth";
import { getStore, type UpsertMemberInput } from "@/lib/store";

export async function GET() {
  const members = await getStore().listMembers();
  return NextResponse.json({ members, admin: await isGlobalAdmin() });
}

export async function POST(req: Request) {
  if (!(await isGlobalAdmin())) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as UpsertMemberInput;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  }
  const member = await getStore().upsertMember(body);
  return NextResponse.json({ member });
}
