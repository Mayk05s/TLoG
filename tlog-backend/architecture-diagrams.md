```mermaid
sequenceDiagram
participant Backend
participant Redis
participant PostgreSQL

    note over Backend, PostgreSQL: 🖱️ БЛОК 1: Обработка POST /taps

    Backend->>Backend: 1.1 🔍 Проверка роли пользователя\nisNikita = (user.role === 'nikita')

    note over Redis: 🔧 Lua Script: tap_delta.lua (EVALSHA)
    Backend->>Redis: 1.2 TapCacheService.addDelta()\nEVALSHA tap_delta.sha\nKEYS: [taps_key, points_key, leaderboard_key]\nARGS: [userId, isNikita, roundEndTime]

    note right of Redis: ⚡ Атомарные операции в tap_delta.lua:\n1. Атомарный инкремент round:123:user:456:taps → 11\n2. IF isNikita == '0': points = (tap % 11 == 0) ? 10 : 1\n3. Атомарный инкремент round:123:user:456:points +points\n4. Добавление в sorted set round:123:leaderboard total_points user456\n5. Установка времени жизни keys (TTL = round_end + 30min)

    Redis-->>Backend: 1.3 {tapCount: 11, points: 16}

    note over Backend, PostgreSQL: 📊 БЛОК 2: Обработка GET /rounds/:id/stats

    Backend->>Backend: 2.1 🔍 Извлечение userId из JWT\ncurrentUserId = "user456"

    Backend->>Redis: 2.2 TapCacheService.getLeaderboard()\nПолучение лидерборда с сортировкой по убыванию\nround:123:leaderboard 0 -1 WITHSCORES
    Redis-->>Backend: 2.3 ['user1', '150', 'user2', '120',\n'user456', '16']

    Backend->>Backend: 2.4 📊 Парсим лидерборд в структуру\n[{userId: 'user1', points: 150, position: 1},\n{userId: 'user2', points: 120, position: 2},\n{userId: 'user456', points: 16, position: 3}]

    Backend->>PostgreSQL: 2.5 SELECT id, username FROM users\nWHERE id IN ('user1', 'user2', 'user456')
    PostgreSQL-->>Backend: 2.6 [{id: 'user1', username: 'Alice'},\n{id: 'user2', username: 'Bob'},\n{id: 'user456', username: 'John'}]

    Backend->>Backend: 2.7 📋 Объединяем данные\n[{userId: 'user1', username: 'Alice', points: 150, position: 1},\n{userId: 'user2', username: 'Bob', points: 120, position: 2},\n{userId: 'user456', username: 'John', points: 16, position: 3}]

    note over Backend, PostgreSQL: 🔄 БЛОК 3: FlushWorker - Конкурентная обработка через очередь (каждые 30с)

    Backend->>Redis: 3.1 acquireLock('flush:worker:lock', 60s)\nSET flush:worker:lock "locked" PX 60000 NX
    Redis-->>Backend: 3.2 true (блокировка получена)

    Backend->>Redis: 3.3 getActiveRounds()\nHGETALL active:rounds
    Redis-->>Backend: 3.4 {roundId: endTimestamp}\n{'123': '1719876543000', '456': '1719876600000', '789': '1719876700000'}

    Backend->>Redis: 3.5 fillProcessingQueue()\nLLEN flush:queue:rounds (проверяем длину очереди)
    Redis-->>Backend: 3.6 queueLength = 0 (пуста, нужно заполнить)

    Backend->>Redis: 3.7 LPUSH flush:queue:rounds '123' '456' '789'\n(добавляем все активные раунды в очередь)
    Redis-->>Backend: 3.8 ✅ Очередь заполнена (3 раунда)

    note over Backend: 🏭 КОНКУРЕНТНАЯ ОБРАБОТКА: Воркеры берут батчи из очереди

    loop 3.9 Воркер берет батч (BATCH_SIZE = 3)
        Backend->>Redis: 3.10 RPOP flush:queue:rounds (берем раунд атомарно)
        Redis-->>Backend: 3.11 roundId = '123'
        
        Backend->>Redis: 3.12 RPOP flush:queue:rounds
        Redis-->>Backend: 3.13 roundId = '456'
        
        Backend->>Redis: 3.14 RPOP flush:queue:rounds
        Redis-->>Backend: 3.15 roundId = '789'
    end

    note over Backend: 📦 Воркер получил батч: ['123', '456', '789']

    loop 3.16 Для каждого раунда в батче параллельно
        Backend->>Backend: 3.17 🕐 Проверяем истечение roundId
        
        alt Раунд завершен
            Backend->>Redis: 3.18 cleanupExpiredRound(roundId)\nKEYS round:roundId:* + DEL + HDEL active:rounds
            Redis-->>Backend: 3.19 ✅ Раунд очищен
            
        else Раунд активен
            Backend->>Redis: 3.20 SMEMBERS flush:processing\n(проверяем дублирование)
            Redis-->>Backend: 3.21 [] (раунд не обрабатывается)
            
            Backend->>Redis: 3.22 SADD flush:processing roundId\n(помечаем как обрабатываемый)
            Redis-->>Backend: 3.23 ✅ Помечен в обработке
            
            Backend->>Redis: 3.24 syncRoundStats(roundId)\nZREVRANGE round:roundId:leaderboard 0 -1 WITHSCORES
            Redis-->>Backend: 3.25 ['user1', '150', 'user2', '120']
            
            loop 3.26 Для каждого пользователя
                Backend->>Redis: 3.27 getCounters(roundId, userId)
                Redis-->>Backend: 3.28 {tapCount: X, points: Y}
                
                Backend->>PostgreSQL: 3.29 UPSERT playerRoundStats
                PostgreSQL-->>Backend: 3.30 ✅ Синхронизировано
            end
            
            Backend->>Redis: 3.31 SREM flush:processing roundId\n(убираем из обработки)
            Redis-->>Backend: 3.32 ✅ Обработка завершена
        end
    end

    note over Backend: 📊 Результат батча: 3 successful, 0 failed

    Backend->>Redis: 3.33 releaseLock('flush:worker:lock')\nDEL flush:worker:lock
    Redis-->>Backend: 3.34 ✅ Блокировка снята

    note over Backend, PostgreSQL: 🏭 Результат конкурентной архитектуры
    note right of PostgreSQL: ✅ Множественные воркеры работают параллельно\n🔄 Очередь flush:queue:rounds (LIST)\n⚡ Атомарное распределение: RPOP\n📦 Батчевая обработка (BATCH_SIZE = 3)\n🛡️ Защита от дублирования через flush:processing\n\n🎯 Ключевые преимущества:\n- Горизонтальное масштабирование воркеров\n- Справедливое распределение нагрузки\n- Fault tolerance (retry + возврат в очередь)\n- Нет блокирования при падении воркера
```

## 🔧 Подробное объяснение Redis методов:

### 🎯 **EVALSHA tap_delta.lua** - Основной метод обработки тапов
**Параметры:**
- `KEYS[1]`: `round:{roundId}:user:{userId}:taps` - счетчик тапов
- `KEYS[2]`: `round:{roundId}:user:{userId}:points` - счетчик очков  
- `KEYS[3]`: `round:{roundId}:leaderboard` - лидерборд (sorted set)
- `ARGV[1]`: userId - идентификатор пользователя
- `ARGV[2]`: isNikita ('0' или '1') - флаг роли Nikita
- `ARGV[3]`: roundEndTimestamp - время окончания раунда (опционально)

**Логика скрипта:**
1. Атомарный инкремент счетчика тапов
2. Вычисление очков: каждый 11-й тап = 10 очков, остальные = 1 очко
3. Для Nikita: всегда 0 очков
4. Атомарный инкремент общего счетчика очков
5. Добавление в sorted set лидерборда с обновленным счетом
6. Установка времени жизни ключей для всех ключей

### 📊 **Получение лидерборда с сортировкой по убыванию**
**Команда:** `ZREVRANGE round:{roundId}:leaderboard 0 -1 WITHSCORES`
**Результат:** Массив [member1, score1, member2, score2, ...]

### 🔄 **Батчевое получение множественных ключей одним запросом**
**Команда:** `MGET key1 key2 key3 ...`
**Оптимизация:** Один запрос вместо множества GET

### 🔐 **Блокировки и TTL:**
- `SET lock_key "locked" PX ttl NX` - Атомарная блокировка
- Установка времени жизни ключей - Автоочистка данных после раунда

### 📈 **Legacy методы (для обратной совместимости):**
- `clicks:{roundId}:{userId}` - старая структура ключей
- `KEYS pattern` + `GET/DEL` - менее эффективные операции
