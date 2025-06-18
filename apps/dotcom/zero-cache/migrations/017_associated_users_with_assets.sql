ALTER TABLE "asset"
ADD COLUMN "userId" VARCHAR NULL;

ALTER TABLE "asset"
ADD CONSTRAINT "fk_user"
    FOREIGN KEY ("userId")
    REFERENCES "user"("id");
