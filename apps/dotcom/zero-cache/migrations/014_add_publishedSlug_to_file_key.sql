-- In order to correctly clean up resources for deleted files, we need to know the publishSlug of the file.

ALTER TABLE "file"
DROP CONSTRAINT "file_pkey",
ADD PRIMARY KEY ("id", "ownerId", "publishedSlug");