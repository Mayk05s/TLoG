-- tap_inc.lua
-- Simple tap increment script
-- ARGV = [roundId, userId]
local roundId = ARGV[1]
local userId = ARGV[2]

local tapsKey = "round:" .. roundId .. ":user:" .. userId .. ":taps"

-- Инкрементируем счетчик тапов
local newTapCount = redis.call('INCR', tapsKey)

-- Устанавливаем TTL на 1 день (86400 секунд) при первом создании ключа
if newTapCount == 1 then
    redis.call('EXPIRE', tapsKey, 86400)
end

return newTapCount
