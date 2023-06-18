-- User
CREATE TABLE IF NOT EXISTS user (id UUID, timestamp DateTime,) ENGINE = MergeTree PRIMARY KEY (id);

-- User aliases
-- The user will have an ID automatically generated. And other system identifiers can be aliased to it.
-- For example, you can use alias to tie your system's user ID to the greenhouse user ID.
CREATE TABLE IF NOT EXISTS user_alias (
  user_id UUID,
  alias String,
  timestamp DateTime,
) ENGINE = MergeTree PRIMARY KEY (alias);

-- User properties
-- This table is initialized without any columns.
-- Similar to the events table, columns are added as user properties are defined by the client
CREATE TABLE IF NOT EXISTS user_property (user_id UUID, timestamp DateTime,) ENGINE = MergeTree PRIMARY KEY (user_id);

-- Event
CREATE TABLE IF NOT EXISTS event (
  user_id UUID,
  event String,
  timestamp DateTime,
) ENGINE = MergeTree PRIMARY KEY (user_id, event, timestamp)
