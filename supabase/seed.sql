-- =============================================================================
-- CogniTest — seed data for the tests catalogue
-- =============================================================================
-- Run AFTER schema/RLS (e.g. supabase/migrations/0001_baseline.sql or
-- schema.sql + policies.sql). Idempotent.
-- Must include every `test_id` used in the app (`lib/mock-data.ts` + legacy
-- aliases) so `test_sessions.test_id` FK inserts succeed.
-- =============================================================================

insert into public.tests (id, name, domain, description) values
  -- Legacy / alternate ids (keep for existing DB rows)
  ('test-symetrie-axiale',           'Symétrie axiale',                    'cognition-geometrie', 'Legacy id'),
  ('test-symetrie-centrale',         'Symétrie centrale',                  'cognition-geometrie', 'Legacy id'),
  ('test-droite-plan',               'Droite dans le plan',                'cognition-geometrie', 'Legacy id'),
  ('test-trig-unit-circle',          'Cercle trigonométrique',             'cognition-geometrie', 'Legacy id'),
  ('test-syllogism',                 'Syllogismes logiques',               'reasoning',           'Legacy id'),
  -- App catalogue (`mockTests` ids)
  ('test-deductive-reasoning',       'Deductive Reasoning',                'cognitive-capacity',  'CogniTest catalogue'),
  ('test-inductive-reasoning',       'Inductive Reasoning',                'cognitive-capacity',  'CogniTest catalogue'),
  ('test-visuo-motor',               'Visuo-Motor Capacity',               'cognitive-capacity',  'CogniTest catalogue'),
  ('test-visuo-constructive',        'Visuo-Constructive Capacity',        'cognitive-capacity',  'CogniTest catalogue'),
  ('test-visuo-perceptive',          'Visuo-Perceptive Capacity (hub)',    'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-discrimination',         'VP · Discrimination visuelle',       'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-memoire-sequentielle',     'VP · Mémoire séquentielle',          'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-memoire-perceptive',      'VP · Mémoire perceptive',            'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-cloture',                'VP · Clôture / Relations spatiales', 'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-constance-forme',        'VP · Constance de la forme',         'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-figure-fond',            'VP · Figure-fond',                   'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-intrus',                 'VP · Intrus',                        'cognitive-capacity',  'CogniTest catalogue'),
  ('test-vp-fond-cache',             'VP · Fond caché',                    'cognitive-capacity',  'CogniTest catalogue'),
  ('test-mental-rotation',           'Mental Rotation 3D',                 'cognitive-capacity',  'CogniTest catalogue'),
  ('test-mental-rotation-2d',        'Mental Rotation 2D',                 'cognitive-capacity',  'CogniTest catalogue'),
  ('test-spatial-orientation',       'Spatial Orientation',               'cognitive-capacity',  'CogniTest catalogue'),
  ('test-spatial-transformation',    'Spatial Transformation',             'cognitive-capacity',  'CogniTest catalogue'),
  ('test-working-memory',            'Working Memory',                     'cognitive-capacity',  'CogniTest catalogue'),
  ('test-long-term-memory',          'Long-Term Memory',                   'cognitive-capacity',  'CogniTest catalogue'),
  ('test-visuo-spatial-memory',      'Visuo-Spatial Memory',               'cognitive-capacity',  'CogniTest catalogue'),
  ('test-sustained-attention',       'Sustained Attention',                'cognitive-capacity',  'CogniTest catalogue'),
  ('test-divided-attention',         'Divided Attention',                   'cognitive-capacity',  'CogniTest catalogue'),
  ('test-selective-attention',       'Selective Attention',               'cognitive-capacity',  'CogniTest catalogue'),
  ('test-visuo-spatial-attention',   'Visuo-Spatial Attention',           'cognitive-capacity',  'CogniTest catalogue'),
  ('test-inhibition',                'Inhibition',                         'cognitive-capacity',  'CogniTest catalogue'),
  ('test-cognitive-flexibility',     'Cognitive Flexibility',              'cognitive-capacity',  'CogniTest catalogue'),
  ('test-processing-speed',          'Processing Speed',                   'cognitive-capacity',  'CogniTest catalogue'),
  ('test-geo-central-sym',           'Symétrie centrale',                  'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-symetrie-axiale',       'Symétrie axiale',                    'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-line-plane',            'Droite dans le plan',                'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-vectors-complete',      'Vecteurs et translation',           'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-trig-circle',           'Cercle trigonométrique interactif', 'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-space',                 'Géométrie dans l''espace',           'cognition-geometrie', 'CogniTest catalogue'),
  ('test-geo-produit-scalaire',      'Produit scalaire',                   'cognition-geometrie', 'CogniTest catalogue')
on conflict (id) do update
  set name        = excluded.name,
      domain      = excluded.domain,
      description = excluded.description,
      is_active   = true;
