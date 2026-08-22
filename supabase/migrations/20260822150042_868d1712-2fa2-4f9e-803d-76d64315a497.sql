revoke all on function public.is_room_member(uuid, uuid) from public, anon;
grant execute on function public.is_room_member(uuid, uuid) to authenticated, service_role;