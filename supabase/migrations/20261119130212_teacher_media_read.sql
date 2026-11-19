-- La photo et la vidéo s'affichent sur les profils publiés : lecture des deux colonnes, comme les autres champs publics.
grant select (photo_path, video_path) on public.teachers to anon, authenticated;
