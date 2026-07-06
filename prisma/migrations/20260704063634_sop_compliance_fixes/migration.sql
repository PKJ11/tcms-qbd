-- CreateTable
CREATE TABLE "trainer_certificates" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "trainer_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_certificates_certNumber_key" ON "trainer_certificates"("certNumber");

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_certificates" ADD CONSTRAINT "trainer_certificates_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
