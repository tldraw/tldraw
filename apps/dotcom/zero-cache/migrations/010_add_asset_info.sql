CREATE TABLE "asset" (
	"objectName" VARCHAR PRIMARY KEY,
	"fileId" VARCHAR NOT NULL,
  	"uploadedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_file"
        FOREIGN KEY ("fileId")
        REFERENCES "file"("id")
);
