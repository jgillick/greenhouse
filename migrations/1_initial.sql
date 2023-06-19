-- User
-- The user properties
CREATE TABLE IF NOT EXISTS user (id UUID, timestamp DateTime DEFAULT now()) ENGINE = MergeTree PRIMARY KEY (id);

-- User aliases
-- The user will have an ID automatically generated. And other system identifiers can be aliased to it.
-- For example, you can use alias to tie your system's user ID to the greenhouse user ID.
CREATE TABLE IF NOT EXISTS user_alias (
  id UUID,
  user_id UUID,
  alias String,
  timestamp DateTime DEFAULT now(),
) ENGINE = ReplacingMergeTree PRIMARY KEY (alias);

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
