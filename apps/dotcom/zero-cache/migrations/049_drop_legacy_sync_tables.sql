-- Leftovers of the legacy custom sync engine, removed in #9894. The tables had no
-- readers or writers since then and were never in the zero_data publication.
-- "alltables" was the legacy replicator's FOR ALL TABLES publication; with no
-- subscriber it retains no WAL, but it makes UPDATE/DELETE fail on any future
-- table without a replica identity, so it goes too. Zero only uses zero_data.
-- The tlpr_ replication slot is dropped manually per environment (see #9899).

DROP PUBLICATION IF EXISTS alltables;
DROP TABLE IF EXISTS public.user_mutation_number;
DROP TABLE IF EXISTS public.replicator_boot_id;
DROP TABLE IF EXISTS public.user_boot_id;
