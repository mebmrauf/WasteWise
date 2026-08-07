-- CreateTable
CREATE TABLE "WasteRecognitionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "detectedCategory" "WasteCategory" NOT NULL,
    "isRecyclable" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rawLabels" JSONB NOT NULL,
    "preparationTip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteRecognitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WasteRecognitionLog_userId_idx" ON "WasteRecognitionLog"("userId");

-- AddForeignKey
ALTER TABLE "WasteRecognitionLog" ADD CONSTRAINT "WasteRecognitionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
