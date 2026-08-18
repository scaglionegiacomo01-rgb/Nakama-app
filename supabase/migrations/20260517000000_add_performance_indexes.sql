-- Performance: index foreign-key / filter columns that are queried directly
-- but aren't already covered by a leading column of an existing UNIQUE index.
-- All additive and non-locking-in-practice (CONCURRENTLY not needed at current
-- table sizes); safe to re-run.

-- "My trips" / passport / profile queries filter by user_id then status.
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_status ON public.event_registrations(user_id, status);

-- Trip listings filter by status and sort by date.
CREATE INDEX IF NOT EXISTS idx_events_status_date ON public.events(status, date);

-- Carpool: seat requests are looked up by event and by passenger; only
-- (car_id, passenger_user_id) is currently indexed via the UNIQUE constraint.
CREATE INDEX IF NOT EXISTS idx_seat_requests_event ON public.seat_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_requests_passenger ON public.seat_requests(passenger_user_id);

-- Trip chat is fetched per event ordered by time.
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_event_created ON public.trip_chat_messages(event_id, created_at);

-- Looking-for-Crew feed and "my posts".
CREATE INDEX IF NOT EXISTS idx_crew_posts_status_created ON public.crew_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_posts_user ON public.crew_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_post_comments_post ON public.crew_post_comments(post_id);

-- Notification bell reads a user's notifications ordered by recency.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
