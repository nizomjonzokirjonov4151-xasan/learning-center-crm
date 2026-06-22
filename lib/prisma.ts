import dns from "node:dns";
import net from "node:net";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Neon's hostnames resolve to both A and AAAA records. Node's Happy Eyeballs
// (RFC 8305) dual-stack connect races IPv4/IPv6 attempts together, and in
// environments where the IPv6 route is unreachable/blackholed, the whole
// race times out (ETIMEDOUT) even though plain IPv4 connects instantly.
// Forcing IPv4-first, single-attempt resolution avoids that race entirely.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}