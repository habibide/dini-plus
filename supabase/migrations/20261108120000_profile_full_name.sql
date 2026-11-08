-- Apple ne transmet le nom qu'à la première connexion, et seulement à l'app : on le laisse enregistrer sur son propre profil.
grant update (full_name) on public.profiles to authenticated;
