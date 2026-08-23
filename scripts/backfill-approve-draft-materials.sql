-- Materials no longer go through a separate approval step (upload is
-- already gated by topic-level access) — this one-time backfill unblocks
-- any material that was uploaded before that change and is still sitting
-- unapproved, self-approving it as of now under the original uploader.

UPDATE "material_versions"
SET "status" = 'APPROVED',
    "approvedById" = "uploadedById",
    "approvedAt" = COALESCE("approvedAt", now())
WHERE "status" = 'DRAFT';

UPDATE "training_materials"
SET "status" = 'APPROVED'
WHERE "status" = 'DRAFT';
