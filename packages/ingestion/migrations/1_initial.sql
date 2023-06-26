-- User
-- The user properties
CREATE TABLE IF NOT EXISTS user (
  id UUID,
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now(),
  is_deleted UInt8 DEFAULT 0,
  name String DEFAULT NULL,
  email String DEFAULT NULL,
  avatar String DEFAULT NULL,
) ENGINE = ReplacingMergeTree(updated_at, is_deleted)
ORDER BY
  id PRIMARY KEY (id) SETTINGS clean_deleted_rows = 'Always';

-- User aliases
-- The user will have an ID automatically generated. And other system identifiers can be aliased to it.
-- For example, you can use alias to tie your system's user ID to the greenhouse user ID.
CREATE TABLE IF NOT EXISTS user_alias (
  id UUID,
  user_id UUID,
  alias String,
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now(),
  is_deleted UInt8 DEFAULT 0,
) ENGINE = ReplacingMergeTree(updated_at, is_deleted)
ORDER BY
  alias PRIMARY KEY (alias) SETTINGS clean_deleted_rows = 'Always';

-- User property update times and type
-- This holds the last time the dynamic property was changed for this user and is used when merging multiple user records
CREATE TABLE IF NOT EXISTS user_property_time (
  user_id UUID,
  property String,
  -- Property set type
  -- normal: set normally
  -- once: The property was set with the setOnce function and shouldn't be overwritten
  type Enum('normal', 'once') DEFAULT 'normal',
  timestamp DateTime DEFAULT now(),
) ENGINE = ReplacingMergeTree(timestamp)
ORDER BY
  (user_id, property) PRIMARY KEY (user_id, property);

-- Event
CREATE TABLE IF NOT EXISTS event (
  user_alias_id UUID,
  event String,
  timestamp DateTime DEFAULT now(),
) ENGINE = MergeTree PRIMARY KEY (user_alias_id, event, timestamp);

-- User/Event property data
-- Primarily this is used to map the user-defined property name to the column
-- as well as tracking which data types have been used.
CREATE TABLE IF NOT EXISTS property (
  name String,
  for Enum('event', 'user'),
  column String,
  data_type Enum('str', 'num', 'bool', 'date'),
  timestamp DateTime DEFAULT now(),
) ENGINE = ReplacingMergeTree PRIMARY KEY (name, column, for, data_type)
