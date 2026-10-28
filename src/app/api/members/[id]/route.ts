import { NextResponse } from "next/server";
import { isGlobalAdmin } from "@/lib/auth";
import { getStore, type UpsertMemberInput } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  if (!(await isGlobalAdmin())) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as UpsertMemberInput;
  const member = await getStore().upsertMember({ ...body, id });
  return NextResponse.json({ member });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isGlobalAdmin())) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  await getStore().deleteMember(id);
  return NextResponse.json({ ok: true });
}
