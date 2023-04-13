import { KvStore, PrismaClient } from "@prisma/client";

class KvStoreService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async get(key: string): Promise<string | undefined> {
    return (
      await this.prisma.kvStore.findUnique({
        where: { key },
      })
    )?.value;
  }

  async set(key: string, value: string): Promise<KvStore> {
    return await this.prisma.kvStore.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export default KvStoreService;
