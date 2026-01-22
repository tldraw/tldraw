-- Add fairy tables to Zero publication for replication
ALTER PUBLICATION zero_data ADD TABLE public."user_fairies", public."file_fairies";
