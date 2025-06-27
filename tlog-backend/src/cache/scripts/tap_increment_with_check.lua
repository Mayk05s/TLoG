-- tap_increment_with_check.lua
-- ARGV = [roundId, userId, syncThreshold, timeThreshold]
local roundId = ARGV[1]
local userId = ARGV[2]
local syncThreshold = tonumber(ARGV[3]) -- например, 50
local timeThreshold = tonumber(ARGV[4]) -- например, 10000 (10 сек в мс)

local tapsKey = "round:" .. roundId .. ":user:" .. userId .. ":taps"
local lastSyncKey = "round:" .. roundId .. ":user:" .. userId .. ":last_sync"

-- Инкрементируем счетчик
local newTapCount = redis.call('INCR', tapsKey)

-- Получаем время последней синхронизации
local lastSync = redis.call('GET', lastSyncKey)
if not lastSync then
    lastSync = 0
else
    lastSync = tonumber(lastSync)
end

local currentTime = redis.call('TIME')[1] * 1000 -- timestamp в миллисекундах
local timeSinceSync = currentTime - lastSync

-- Проверяем условия синхронизации
local shouldSync = 0
if newTapCount >= syncThreshold or timeSinceSync >= timeThreshold then
    shouldSync = 1
    -- Обновляем время последней синхронизации
    redis.call('SET', lastSyncKey, currentTime)
end

-- Добавляем в очередь флеша (для фоновых задач)
redis.call('SADD', 'flush:queue', roundId .. ':' .. userId)

return {
    newTapCount,
    shouldSync,
    newTapCount, -- pendingTaps = все накопленные тапы
    timeSinceSync
}
