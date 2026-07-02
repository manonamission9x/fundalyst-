import { prisma } from "@/lib/db";

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });
}
