-- ARGV = [roundId, userId]
-- Simple increment of taps by 1
local hkey = "round:" .. ARGV[1] .. ":user:" .. ARGV[2]
redis.call('HINCRBY', hkey, 'taps', 1)
redis.call('SADD', 'flush:queue', ARGV[1]..':'..ARGV[2])
return redis.call('HGETALL', hkey)

