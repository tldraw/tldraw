-- TEST-10: Fast cleanup RPC for Playwright runs
-- Creates cleanup_test_data(email_pattern text) to bulk delete test records

set search_path to public;

create or replace function public.cleanup_test_data(email_pattern text default 'test-%')
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  pattern text := coalesce(email_pattern, 'test-%');
  user_ids uuid[];
  workspace_ids uuid[] := array[]::uuid[];
  presence_count integer := 0;
  access_log_count integer := 0;
  documents_count integer := 0;
  folders_count integer := 0;
  invitation_count integer := 0;
  workspace_members_count integer := 0;
  workspaces_count integer := 0;
  users_count integer := 0;
  auth_users_count integer := 0;
begin
  select array_agg(id)
    into user_ids
  from auth.users
  where email ilike pattern;

  if user_ids is null or array_length(user_ids, 1) = 0 then
    return json_build_object(
      'success', true,
      'error', null,
      'deleted_counts', json_build_object(
        'users', 0,
        'workspaces', 0,
        'workspace_members', 0,
        'documents', 0,
        'folders', 0,
        'invitation_links', 0,
        'presence', 0,
        'document_access_log', 0
      )
    );
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
    into workspace_ids
  from public.workspaces
  where owner_id = any(user_ids);

  with deleted as (
    delete from public.presence
    where user_id = any(user_ids)
       or document_id in (
         select id from public.documents where workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
       )
    returning 1
  )
  select count(*) into presence_count from deleted;

  with deleted as (
    delete from public.document_access_log
    where user_id = any(user_ids)
       or workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into access_log_count from deleted;

  with deleted as (
    delete from public.documents
    where created_by = any(user_ids)
       or workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into documents_count from deleted;

  with deleted as (
    delete from public.folders
    where workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into folders_count from deleted;

  with deleted as (
    delete from public.invitation_links
    where workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into invitation_count from deleted;

  with deleted as (
    delete from public.workspace_members
    where user_id = any(user_ids)
       or workspace_id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into workspace_members_count from deleted;

  with deleted as (
    delete from public.workspaces
    where id = any(coalesce(workspace_ids, array[]::uuid[]))
    returning 1
  )
  select count(*) into workspaces_count from deleted;

  with deleted as (
    delete from public.users
    where id = any(user_ids)
    returning 1
  )
  select count(*) into users_count from deleted;

  with deleted as (
    delete from auth.users
    where id = any(user_ids)
    returning 1
  )
  select count(*) into auth_users_count from deleted;

  return json_build_object(
    'success', true,
    'error', null,
    'deleted_counts', json_build_object(
      'users', users_count,
      'workspaces', workspaces_count,
      'workspace_members', workspace_members_count,
      'documents', documents_count,
      'folders', folders_count,
      'invitation_links', invitation_count,
      'presence', presence_count,
      'document_access_log', access_log_count
    ),
    'deleted_auth_users', auth_users_count
  );
exception
  when others then
    return json_build_object(
      'success', false,
      'error', sqlerrm,
      'deleted_counts', json_build_object()
    );
end;
$$;

comment on function public.cleanup_test_data(text) is 'Bulk delete test data by email pattern, used by Playwright global setup';

