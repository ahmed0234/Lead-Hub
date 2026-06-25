import prisma from "@/lib/prisma";

export async function GET() {
  const createnewuser = await prisma.user.create({
    data: {
      email: "ahmd23asdzxc123@gmail.com",
      name: "Ahmed213",
    },
  });
  return Response.json(createnewuser);
}
