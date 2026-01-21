# Масштабирование

## Обзор

Запускаете xyOps в бою с большим количеством серверов и/или задач? Ознакомьтесь с этими практиками масштабирования. Это руководство дополняет Self-Hosting — сначала прочитайте его: [Self-Hosting](hosting.md).

## Обновление оборудования

- CPU: xyOps многопроцессный и высокопараллельный. Больше ядер помогает планировщику, веб-серверу, I/O хранилища и сжатию логов работать стабильно под нагрузкой.
- RAM: Оставьте запас для heap Node.js, внутрипроцессных кэшей, кэшей движков хранилища и page cache ОС. ОЗУ напрямую улучшает hit rate кэша и снижает дисковый/сетевой I/O.
- Storage: Предпочитайте быстрые SSD/NVMe для локальных Filesystem/SQLite и архивов логов. Обеспечьте достаточный IOPS для параллельных логов задач, снимков и загрузок.
- Network: Для больших парков обеспечьте хорошую пропускную способность и низкую задержку между conductors и workers. Если используете внешнее хранилище (S3, Redis, MinIO), размещайте conductors ближе к нему.
- OS limits: Увеличьте лимиты файловых дескрипторов и процессов на загруженных узлах (например, `ulimit -n`, systemd Limits). Настройте swap консервативно, чтобы избежать thrash heap.

## Увеличение памяти Node.js

xyOps учитывает переменную окружения `NODE_MAX_MEMORY` для установки размера old-space heap Node (по умолчанию 4096 MB).

- Пример: `export NODE_MAX_MEMORY=8192` перед запуском xyOps (или `-e NODE_MAX_MEMORY=8192` для Docker).
- Оставьте запас для ОС, файлового кэша и внешних демонов. На сервере с 16 GB RAM типичный heap — 8–12 GB, в зависимости от других нагрузок.
- Мониторьте RSS и heap usage со временем и корректируйте аккуратно, чтобы избежать swap.

## Увеличение RAM-кэша хранилища

xyOps использует [pixl-server-storage](https://github.com/jhuckaby/pixl-server-storage), и большинство движков поддерживают кэш в памяти для JSON записей. Большие кэши уменьшают количество обращений к диску или удаленным бекендам.

- По умолчанию: в sample config включены кэши с `maxBytes` порядка 100 MB и `maxItems` порядка 100k для Filesystem и SQLite.
- Рекомендация: для крупных продакшн-инсталляций увеличьте в 5–10 раз при наличии RAM, затем настройте по hit ratio и latency.
- Где настраивать:
  - SQLite: `Storage.SQLite.cache.enabled`, `Storage.SQLite.cache.maxBytes`, `Storage.SQLite.cache.maxItems`.
  - Filesystem: `Storage.Filesystem.cache.enabled`, `...maxBytes`, `...maxItems`.
  - S3: `Storage.S3.cache.enabled`, `...maxBytes`, `...maxItems` (полезно уменьшить S3 GET).
- См. [Storage Engines](https://github.com/jhuckaby/pixl-server-storage#engines) для деталей по движкам (что кэшируется, политика вытеснения, binary vs JSON и т.д.).

## Отключение QuickMon

QuickMon отправляет легковесные метрики каждую секунду со всех satellite. В большом масштабе такие метрики сильно нагружают канал и WebSocket трафик. Чтобы снизить нагрузку:

- Установите `satellite.config.quickmon_enabled` в `false` в конфиге. Настройка автоматически распределяется на все сервера при подключении.
- Мониторинг с минутной частотой остается включенным через `satellite.config.monitoring_enabled`.

## Multi-Conductor установки

Для multi-conductor нужно внешнее общее хранилище, чтобы все conductors видели одно состояние. См. [Multi-Conductor with Nginx](hosting.md#multi-conductor-with-nginx).

- Используйте внешний storage backend: [S3](https://github.com/jhuckaby/pixl-server-storage#amazon-s3), [MinIO](https://github.com/jhuckaby/pixl-server-storage#s3-compatible-services), [NFS](https://github.com/jhuckaby/pixl-server-storage#local-filesystem), [Redis](https://github.com/jhuckaby/pixl-server-storage#redis) или комбинацию. S3 работает, но с большей задержкой; MinIO (self-hosted S3) быстрее on-prem.
- Движок [Hybrid](https://github.com/jhuckaby/pixl-server-storage#hybrid): можно смешивать движки для документов и файлов. Типичный паттерн — быстрый key/value для JSON документов и объектное хранилище для бинарных артефактов:
  - Пример: `Hybrid.docEngine = Redis` (JSON/doc) и `Hybrid.binaryEngine = S3` (файлы и крупные артефакты).
  - Настраивайте каждый sub-engine рядом с [Hybrid](https://github.com/jhuckaby/pixl-server-storage#hybrid). Убедитесь, что persistence Redis (RDB/AOF) включен для долговечности.
- Если выбираете общий Filesystem (NFS), убедитесь в низкой задержке, достаточной пропускной способности и корректной семантике блокировок.
- [SQLite](https://github.com/jhuckaby/pixl-server-storage#sqlite) отлично подходит для одного conductor, но для multi-conductor обязательно переходите на общий backend.

**Совет**: Держите conductors в том же регионе/AZ, что и хранилище, чтобы минимизировать cross-zone latency. Для HTTP входа поставьте Nginx, который отслеживает активный primary.

## Автоматизированные бэкапы

- Используйте ночной API экспорт критичных данных, как описано в [Self-Hosting: Daily Backups](hosting.md#daily-backups). Планируйте через cron и храните вне хоста.
- Для SQLite: он может делать собственные ежедневные бэкапы файла БД во время обслуживания. Настраивается в `Storage.SQLite.backups` (по умолчанию хранит последние 7). Бэкап кратковременно блокирует БД на время копирования.

## Критические ошибки

Для критических ошибок (краши и неудачные обновления) можно настроить глобальный [System Hook](syshooks.md) для автоматической отправки email по каждой ошибке. Установите это в `config.json`, в объекте [hooks](config.md#hooks):

```json
"hooks": {
	"critical": {
		"email": "ops-oncall@yourcompany.com"
	}
}
```

Или можно настроить hook на создание тикета (который отправит email всем назначенным):

```json
"hooks": {
	"critical": {
		"ticket": {
			"type": "issue",
			"assignees": ["admin"]
		}
	}
}
```

См. [System Hooks](syshooks.md) для подробностей.

## Email для мониторинговых алертов

Для алертов мониторинга серверов можно настроить отправку писем. Это можно сделать на трех уровнях:

- На уровне алерта: редактируйте отдельные alert definitions и настраивайте email action для важных (например, "Low Memory").
- На уровне группы серверов: задайте default alert actions для всех алертов в определенных группах (например, "Production Databases").
- На уровне глобальной конфигурации (см. ниже).

Можно добавить глобальные "universal" alert actions в объект [alert_universal_actions](config.md#alert_universal_actions). Они срабатывают для **всех** алертов. Пример:

```json
"alert_universal_actions": [
	{
		"enabled": true,
		"hidden": true,
		"condition": "alert_new",
		"type": "snapshot"
	},
	{
		"enabled": true,
		"condition": "alert_new",
		"type": "email",
		"email": "oncall-pager@mycompany.com"
	}
]
```

## Security Checklist

Перед запуском в продакшене укрепите входную точку и конфиг xyOps:

- Ограничьте входящие IP с помощью [WebServer.whitelist](https://github.com/jhuckaby/pixl-server-web#whitelist) (поддерживает CIDR). Разрешайте только корпоративные диапазоны и балансировщики.
- Ограничьте допустимые Host headers/SNI через [WebServer.allow_hosts](https://github.com/jhuckaby/pixl-server-web#allow_hosts) до ваших продакшн-доменов (например, `xyops.yourcompany.com`).
- HTTPS: включите [WebServer.https](https://github.com/jhuckaby/pixl-server-web#https), задайте пути к cert/key и рассмотрите [WebServer.https_force](https://github.com/jhuckaby/pixl-server-web#https_force), чтобы HTTP редиректился на HTTPS. Если TLS терминируется выше, настройте [WebServer.https_header_detect](https://github.com/jhuckaby/pixl-server-web#https_header_detect).
- Лимиты загрузок: уменьшите [WebServer.max_upload_size](https://github.com/jhuckaby/pixl-server-web#max_upload_size) с дефолтных 1 GB до ожидаемых значений (также настройте per-feature лимиты в `client.*_upload_settings`).
- Лимиты соединений: настройте [WebServer.max_connections](https://github.com/jhuckaby/pixl-server-web#max_connections) и [WebServer.max_concurrent_requests](https://github.com/jhuckaby/pixl-server-web#max_concurrent_requests) под мощность инстанса. При необходимости задайте [WebServer.max_queue_length](https://github.com/jhuckaby/pixl-server-web#max_queue_length) и [WebServer.max_queue_active](https://github.com/jhuckaby/pixl-server-web#max_queue_active) для ограничения перегрузки.
- Таймауты: используйте [WebServer.socket_prelim_timeout](https://github.com/jhuckaby/pixl-server-web#socket_prelim_timeout), [WebServer.timeout](https://github.com/jhuckaby/pixl-server-web#timeout), [WebServer.request_timeout](https://github.com/jhuckaby/pixl-server-web#request_timeout) и [WebServer.keep_alive_timeout](https://github.com/jhuckaby/pixl-server-web#keep_alive_timeout) для защиты от slow-loris и ограничения длительности запросов.
- Bind адрес: если работаете за прокси, задайте [WebServer.bind_address](https://github.com/jhuckaby/pixl-server-web#bind_address) и настройте [WebServer.public_ip_offset](https://github.com/jhuckaby/pixl-server-web#public_ip_offset), чтобы выбрать правильный client IP из заголовков прокси.
- Headers/CSP: используйте [WebServer.uri_response_headers](https://github.com/jhuckaby/pixl-server-web#uri_response_headers), чтобы задать CSP, HSTS и другие security headers для HTML маршрутов.
- Контроль доступа: используйте [WebServer.default_acl](https://github.com/jhuckaby/pixl-server-web#default_acl) для private handlers и проверяйте API keys/SSO политики. Защитите админские эндпойнты через SSO где возможно.
- Ротируйте secret key каждые несколько месяцев. См. [Secret Key Rotation](hosting.md#secret-key-rotation).

## Rate Limiting

Если вы используете схемы [Multi-Conductor with Nginx](hosting.md#multi-conductor-with-nginx) или [Multi-Conductor with OAuth2-Proxy and TLS with Nginx](sso.md#multi-conductor-with-oauth2-proxy-and-tls-with-nginx), рассмотрите настройку rate limiting. Для этого добавьте volume bind в Nginx контейнер:

```
-v ./limits.conf:/etc/nginx/conf.d/limits.conf:ro
```

А в `limits.conf` на хосте добавьте конфигурацию Nginx:

```
limit_req_zone $binary_remote_addr zone=req_per_ip:20m rate=100r/s;
limit_req_status 429;
```

Это ограничит трафик до 100 запросов/сек на IP, используя до 20MB IP кэша (примерно 300K IP). Подробнее см. [ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

## Дополнительные идеи тюнинга

- Пропускная способность задач: увеличивайте [max_jobs_per_min](config.md#max_jobs_per_min) осторожно и мониторьте CPU/RAM worker'ов. Согласуйте с per-category limits и ограничениями workflow.
- Хранение данных: ограничьте размеры истории через свойства [db_maint](config.md#db_maint) `*.max_rows` (jobs, alerts, snapshots, activity, servers). Настройте под ваш бюджет хранения.
- Параллельность поиска: если часто выполняете поиск файлов, аккуратно увеличьте [search_file_threads](config.md#search_file_threads) (I/O bound; сначала протестируйте).
- Логи: отключайте подробное логирование запросов или storage событий в продакшене, если не отлаживаете (`WebServer.log_requests`, `Storage.log_event_types`).

## Ссылки

- [xyOps Self-Hosting Guide](hosting.md)
- [Storage engines and Hybrid](https://github.com/jhuckaby/pixl-server-storage#engines)
- [Web server documentation](https://github.com/jhuckaby/pixl-server-web)
