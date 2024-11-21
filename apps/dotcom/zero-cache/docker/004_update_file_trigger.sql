CREATE OR REPLACE FUNCTION update_file_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- updatedAt is a unix timestamp in milliseconds
  NEW."updatedAt" := CAST(EXTRACT(EPOCH FROM now()) * 1000 AS BIGINT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_file_updatedAt
BEFORE UPDATE ON "file"
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*) 
EXECUTE FUNCTION update_file_updated_at();
