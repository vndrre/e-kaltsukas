-- Per-participant read timestamps for inbox unread counts.
alter table conversations
  add column if not exists buyer_last_read_at timestamptz,
  add column if not exists seller_last_read_at timestamptz;
