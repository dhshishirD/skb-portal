-- The four community trigger functions are SECURITY DEFINER and only ever run
-- as triggers. They were left callable by everyone (PUBLIC, so anon too).
-- Triggers do not need the caller to hold EXECUTE, so close the door.
revoke execute on function public.community_fill_author()       from public, anon, authenticated;
revoke execute on function public.community_fill_dm()           from public, anon, authenticated;
revoke execute on function public.community_guard_post_update() from public, anon, authenticated;
revoke execute on function public.community_sync_likes()        from public, anon, authenticated;
