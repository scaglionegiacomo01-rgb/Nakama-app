-- trip_media.event_id had no foreign key to events, so every PostgREST
-- embedded select ("*, events(...)") used by the gallery, admin gallery
-- and passport pages silently failed to resolve the relationship —
-- uploaded photos never showed up anywhere outside the trip page itself,
-- even once approved.
ALTER TABLE public.trip_media
  ADD CONSTRAINT trip_media_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
