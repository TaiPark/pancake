import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validateRegistrationInvite } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().min(2, "请填写昵称"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  inviteCode: z.string().min(1, "请填写邀请码")
});

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "注册信息不完整" }, { status: 400 });
  }

  if (!validateRegistrationInvite(parsed.data.inviteCode)) {
    return NextResponse.json({ error: "邀请码不正确" }, { status: 403 });
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "这个邮箱已经注册过" }, { status: 409 });
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12)
    }
  });

  return NextResponse.json({ ok: true });
}
