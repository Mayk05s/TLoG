-- tap_get_and_reset.lua
-- ARGV = [roundId, userId]
local roundId = ARGV[1]
local userId = ARGV[2]

local tapsKey = "round:" .. roundId .. ":user:" .. userId .. ":taps"
local lastSyncKey = "round:" .. roundId .. ":user:" .. userId .. ":last_sync"

-- Атомарно получаем текущее количество тапов
local tapsToSync = redis.call('GET', tapsKey) or 0
local currentTime = redis.call('TIME')[1] * 1000

-- Если есть тапы для синхронизации
if tonumber(tapsToSync) > 0 then
    -- Сбрасываем счетчик
    redis.call('SET', tapsKey, 0)
    -- Обновляем время последней синхронизации
    redis.call('SET', lastSyncKey, currentTime)
end

return {
    tonumber(tapsToSync),
    currentTime
}
