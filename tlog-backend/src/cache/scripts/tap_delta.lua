-- KEYS[1] = tap counter key
-- KEYS[2] = points counter key
-- KEYS[3] = leaderboard key
-- KEYS[4] = active rounds sorted set key
-- ARGV[1] = user_id
-- ARGV[2] = is_nikita (0 or 1)
-- ARGV[3] = round_end_timestamp in milliseconds
-- ARGV[4] = round_id

local tap_count = redis.call('INCR', KEYS[1])
local points = 0

if ARGV[2] == '0' then
  -- Regular player logic
  if tap_count % 11 == 0 then
    points = 10
  else
    points = 1
  end

  local total_points = redis.call('INCRBY', KEYS[2], points)
  redis.call('ZADD', KEYS[3], total_points, ARGV[1])
else
  -- Nikita always gets 0 points but tap is recorded
  redis.call('ZADD', KEYS[3], 0, ARGV[1])
end

-- Add round to active rounds sorted set (score = end timestamp in milliseconds)
if ARGV[4] and ARGV[3] and tonumber(ARGV[3]) > 0 then
  redis.call('ZADD', KEYS[4], tonumber(ARGV[3]), ARGV[4])
end

-- Set TTL based on round end time + buffer (30 minutes after round ends)
if ARGV[3] and tonumber(ARGV[3]) > 0 then
  local current_time_ms = redis.call('TIME')[1] * 1000 + redis.call('TIME')[2] / 1000
  local round_end_time_ms = tonumber(ARGV[3])
  local buffer_ms = 1800 * 1000 -- 30 minutes buffer in milliseconds
  local ttl_ms = round_end_time_ms - current_time_ms + buffer_ms

  if ttl_ms > 0 then
    local ttl_seconds = math.floor(ttl_ms / 1000)
    redis.call('EXPIRE', KEYS[1], ttl_seconds)
    redis.call('EXPIRE', KEYS[2], ttl_seconds)
    redis.call('EXPIRE', KEYS[3], ttl_seconds)
  end
end

return {tap_count, points}
