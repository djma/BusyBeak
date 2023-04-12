-- CreateTable
CREATE TABLE "TwitterUser" (
    "id" SERIAL NOT NULL,
    "twitterId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitterUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" SERIAL NOT NULL,
    "twitterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitterUser_twitterId_key" ON "TwitterUser"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "Tweet_twitterId_key" ON "Tweet"("twitterId");

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TwitterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
