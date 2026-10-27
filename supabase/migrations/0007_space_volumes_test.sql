-- Catalogue row for « Géométrie dans l'espace : volumes ».
-- Idempotent. Does not alter existing tests or historical sessions.

insert into public.tests (id, name, domain, description)
values (
  'test-geo-space-volumes',
  'Géométrie dans l''espace : volumes',
  'cognition-geometrie',
  'CogniTest catalogue'
)
on conflict (id) do update
  set name        = excluded.name,
      domain      = excluded.domain,
      description = excluded.description,
      is_active   = true;
