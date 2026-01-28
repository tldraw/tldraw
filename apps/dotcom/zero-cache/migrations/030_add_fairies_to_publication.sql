-- Add fairy tables to zero_data publication (missing from 024_add_fairies.sql)
ALTER PUBLICATION zero_data ADD TABLE public."user_fairies", public."file_fairies";
