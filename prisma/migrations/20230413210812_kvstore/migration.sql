-- CreateTable
CREATE TABLE "KvStore" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KvStore_pkey" PRIMARY KEY ("key")
);
