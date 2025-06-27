-- tap_get_and_sync.lua
-- Get tap count and reset to zero atomically
-- ARGV = [roundId, userId]
local roundId = ARGV[1]
local userId = ARGV[2]

local tapsKey = "round:" .. roundId .. ":user:" .. userId .. ":taps"
local lastSyncKey = "round:" .. roundId .. ":user:" .. userId .. ":last_sync"

-- Получаем текущее количество тапов
local currentTaps = redis.call('GET', tapsKey) or "0"

-- Если нет тапов, нечего синхронизировать
if currentTaps == "0" then
    return {0, redis.call('TIME')[1] * 1000}
end

-- Сбрасываем счетчик
redis.call('SET', tapsKey, "0")

-- Обновляем время последней синхронизации (timestamp в миллисекундах)
local currentTime = redis.call('TIME')[1] * 1000
redis.call('SET', lastSyncKey, currentTime)

return {tonumber(currentTaps), currentTime}
