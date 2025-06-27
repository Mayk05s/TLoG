-- ARGV = [roundId, userId, tapsInc, pointsInc]
local hkey = "round:" .. ARGV[1] .. ":user:" .. ARGV[2]
if tonumber(ARGV[3]) > 0 then
  redis.call('HINCRBY', hkey, 'taps', ARGV[3])
end
if tonumber(ARGV[4]) > 0 then
  redis.call('HINCRBY', hkey, 'points', ARGV[4])
  redis.call('ZINCRBY', "round:"..ARGV[1]..":zset", ARGV[4], ARGV[2])
end
redis.call('SADD', 'flush:queue', ARGV[1]..':'..ARGV[2])
return redis.call('HGETALL', hkey)

