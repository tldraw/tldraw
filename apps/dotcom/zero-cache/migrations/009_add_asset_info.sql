CREATE TABLE "asset" (
	"assetId" VARCHAR PRIMARY KEY,
	"fileId" VARCHAR NOT NULL,
  	"userId" VARCHAR NOT NULL,
  	"uploadedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_file"
        FOREIGN KEY ("fileId")
        REFERENCES "file"("id"),
    CONSTRAINT "fk_user"
        FOREIGN KEY ("userId")
        REFERENCES "user"("id")
);
