-- need to do this so we get isFileOwner when deleting a file
-- and that lets us property determine if a topic subscription should be removed
ALTER TABLE public."file_state" REPLICA IDENTITY FULL;