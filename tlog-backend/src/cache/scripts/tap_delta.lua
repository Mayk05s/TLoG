-- KEYS[1] = tap counter key
-- KEYS[2] = points counter key
-- KEYS[3] = leaderboard key
-- KEYS[4] = flush queue key
-- ARGV[1] = user_id
-- ARGV[2] = is_nikita (0 or 1)

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

-- Add to flush queue for batch processing
redis.call('LPUSH', KEYS[4], cjson.encode({
  user_id = ARGV[1],
  points = points,
  timestamp = redis.call('TIME')[1]
}))

return {tap_count, points}
