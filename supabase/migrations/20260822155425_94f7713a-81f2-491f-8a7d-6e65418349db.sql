REVOKE ALL ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;