# Мониторы

## Обзор

Мониторы отслеживают одно числовое значение метрики сервера во времени. Каждый монитор указывает на одно значение в живых данных сервера, приводит его к заданному типу (integer, float, bytes, seconds или milliseconds), и xyOps сохраняет выборки в time-series БД. Мониторы питают графики на уровне серверов и групп и могут использоваться для алертов.

- Монитор вычисляет выражение раз в минуту на каждом подходящем сервере.
- Результаты сохраняются и рисуются на нескольких разрешениях (hourly, daily, monthly, yearly).
- Алерты могут ссылаться на значения мониторов и вычисленные дельты при необходимости.
- В xyOps есть стандартные мониторы, и вы можете создавать свои.

См. также:

- Data model: [Monitor](data.md#monitor) и [ServerMonitorData](data.md#servermonitordata)
- Plugins: [Monitor Plugins](plugins.md#monitor-plugins)
- Alerts: [Alerts](alerts.md)


## Как это работает

Каждую минуту каждый satellite отправляет свежий snapshot [ServerMonitorData](data.md#servermonitordata) на primary conductor. Для каждого монитора, чья group scope подходит серверу:

1. xyOps вычисляет выражение монитора относительно текущих данных ServerMonitorData.
2. Значение приводится к типу данных монитора и опционально применяется match regex.
3. Если монитор настроен как delta, вычисляется скорость от предыдущего абсолютного значения (при необходимости делится на прошедшие секунды).
4. Значение записывается в time-series сервера для всех разрешений.

Примечания:

- Выражения мониторов выполняются только на контексте ServerMonitorData. Они не зависят от других мониторов.
- Алерты вычисляются сразу после мониторов и могут ссылаться на абсолютные значения и дельты.
- Group scoping позволяет запускать монитор только на конкретных группах. Оставьте groups пустыми, чтобы применять ко всем.


## Создание и редактирование мониторов

Откройте Admin -> Monitors.

- **Title**: Название графика.
- **Display**: Включить/выключить отображение графика в UI без удаления.
- **Icon**: Опциональный Material Design Icon рядом с названием.
- **Server Groups**: Ограничить вычисление конкретными группами (опционально).
- **Data Expression**: Выражение, извлекающее/вычисляющее одно числовое значение из ServerMonitorData. См. [Expressions](#expressions).
- **Data Match**: Опциональный regex для извлечения числа из строки. См. [Data Match](#data-match).
- **Data Type**: Управляет парсингом и отображением (integer, float, bytes, seconds, milliseconds).
- **Delta Features**: Для счетчиков вычислять дельту и, при необходимости, делить на время, чтобы получить скорость в сек.
- **Min Vert Range**: Минимальный диапазон оси Y (например, 100 для процентов).
- **Data Suffix**: Опциональная единица в подписях (например, %, /sec, ms).

Советы:

- Используйте кнопку "Test..." для проверки выражения на live сервере перед сохранением.
- Нажмите значок поиска, чтобы открыть Server Data Explorer и просмотреть пути ServerMonitorData.
- Можно импортировать/экспортировать мониторы как JSON (см. примеры ниже).


## Поток мониторинговых данных

- **Sampling cadence**: раз в минуту на сервер.
- **Storage**: выборки down-sampled в четыре системы: hourly, daily, monthly, yearly.
- **Deltas**: для счетчиков (например, network bytes, disk bytes) включите "Calc as Delta" и "Divide by Time" для графика в сек.
- **Alert context**: после мониторов xyOps вычисляет алерты на тех же данных.


## Выражения

Выражения мониторов вычисляются в [xyOps Expression Syntax](xyexp.md), используя текущий объект [ServerMonitorData](data.md#servermonitordata) как контекст. Синтаксис похож на JavaScript: dot paths, индексы массивов, арифметика и логические операторы.

Примеры:

- Базовая метрика: `cpu.currentLoad` (CPU usage в процентах)
- Индекс массива: `load[0]` (1-минутный load average)
- Object path: `stats.network.conns` (активные соединения)
- Math/composition: `100 - memory.available / memory.total * 100` (процент используемой памяти)
- Guarded math: `stats && stats.network ? stats.network.rx_bytes : 0` (если нет - 0)

Рекомендации:

- Выражение должно возвращать одно числовое значение перед финальным приведением типа.
- Контекст вычислений — текущий ServerMonitorData. Не используйте `monitors.*` или `deltas.*` в выражениях мониторов.
- Для сложных метрик используйте [Monitor Plugin](plugins.md#monitor-plugins), который выдает данные в `commands`, а затем извлекайте число выражением (и при необходимости `data_match`).

## Data Match

Если выражение возвращает строку и число внутри нее, используйте `Data Match` с regex, который извлечет ровно одно число. Если regex включает группу захвата, используется первая группа; иначе используется полное совпадение.

Пример (дефолтный монитор "Open Files"):

- Expression: `commands.open_files`
- Data Match: `(\d+)`
- Result: извлекает первое целое число из строки вроде `"1056\t0\t9223372036854775807"`.


## Delta Monitors

Некоторые источники данных — абсолютные счетчики, которые только растут (например, сетевые байты или disk I/O байты). Для них:

- **Calc as Delta**: сохраняет изменение с прошлого минуты вместо абсолютного счетчика.
- **Divide by Time**: делит дельту на прошедшие секунды между выборками, чтобы получить скорость в сек.
- **Zero Minimum**: ограничивает отрицательные пики минимальным значением (обычно `0`) после перезапуска или сброса счетчиков.

Алерты могут ссылаться на delta значения через объект `deltas`. См. [Alert Expressions](alerts.md#alert-expressions).


## Мониторы по умолчанию

xyOps поставляется с набором стандартных мониторов. Вот что отслеживает каждый:

- **Load Average**: `load[0]` -- 1-минутный load average (float).
- **CPU Usage**: `cpu.currentLoad` -- процент CPU (float), суффикс `%`, min range `100`.
- **Memory in Use**: `memory.used` -- используемая память (bytes).
- **Memory Available**: `memory.available` -- доступная память (bytes).
- **Network Connections**: `stats.network.conns` -- активные сокет соединения (integer).
- **Disk Usage**: `mounts.root.use` -- процент использования root FS (float), суффикс `%`, min range `100`.
- **Disk Read**: `stats.fs.rx` -- bytes read в сек (bytes/sec). Включить: Calc as Delta, Divide by Time, Zero Minimum.
- **Disk Write**: `stats.fs.wx` -- bytes write в сек (bytes/sec). Включить: Calc as Delta, Divide by Time, Zero Minimum.
- **Disk I/O**: `stats.io.tIO` -- total disk I/O ops в сек (integer). Включить: Calc as Delta, Divide by Time, Zero Minimum.
- **I/O Wait**: `cpu.totals.iowait` -- процент I/O wait (float, только Linux), суффикс `%`, min range `100`.
- **Open Files**: `commands.open_files` с `Data Match` `(\d+)` -- число открытых файлов (integer, только Linux).
- **Network In**: `stats.network.rx_bytes` -- network bytes in в сек (bytes/sec). Включить: Calc as Delta, Divide by Time, Zero Minimum.
- **Network Out**: `stats.network.tx_bytes` -- network bytes out в сек (bytes/sec). Включить: Calc as Delta, Divide by Time, Zero Minimum.
- **Processes**: `processes.all` -- общее число процессов (integer).
- **Active Jobs**: `jobs` -- число активных задач xyOps на сервере (integer).

Используйте эти примеры как шаблон или создавайте свои. Можно импортировать/экспортировать мониторы как JSON.


## QuickMon

QuickMon (Quick Monitors) — легковесные real-time мониторы, которые берутся каждую секунду на каждом сервере. Они предназначены для "прямо сейчас" и коротких трендов на страницах серверов и групп.

- **Presets**: CPU load/usage, memory used/available, disk read/write bytes/sec, network in/out bytes/sec.
- **Retention**: последние 60 секунд на сервер хранятся в памяти.
- **Display**: realtime графики и gauges на страницах Server и Group. Новые выборки стримятся через websockets.
- **Snapshots**: самая свежая 60-секундная серия встраивается в server и group snapshots.
- **Config**: определения находятся в `config.json` в разделе [quick_monitors](config.md#quick_monitors). Каждый preset включает `id`, `source` (путь из агентских данных), `type` (integer/float/bytes) и опциональные delta/time опции как у обычных мониторов.

QuickMon дополняет минутные мониторы: используйте QuickMon для оперативной видимости, а стандартные мониторы для исторического анализа и алертинга.


## Примеры и рецепты

- **Track Specific Process Memory**
  - Expression: `processes.list[.command == 'ffmpeg'].memRss` *(точное совпадение имени)*
  - Expression: `find( processes.list, 'command', 'ffmpeg' ).memRss` *(substring match)*
  - Type: `bytes`
- **Memory Used %**
  - Expression: `100 - memory.available / memory.total * 100`
  - Type: `float`, Suffix: `%`, Min Vert Range: `100`.
- **Root Free Space (in GB)**
  - Expression: `(mounts.root.available) / (1024 * 1024 * 1024)`
  - Type: `float`, Suffix: `GB`.
- **TCP LISTEN Sockets**
  - Expression: `count( conns[.state == 'LISTEN'] )`
  - Or alternatively: `stats.network.states.listen`
  - Type: `integer`.

Если ваше выражение возвращает строку (например, вывод кастомной команды), используйте "Data Match" для извлечения числа. Для продвинутых метрик пишите [Monitor Plugin](plugins.md#monitor-plugins) и отдавайте структурированные данные, затем направляйте на них выражение.
