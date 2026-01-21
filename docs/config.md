# Конфигурация

## Overview

xyOps в основном настраивается через единый JSON файл здесь: `/opt/xyops/conf/config.json` (путь может отличаться при кастомной установке).

Однако, если конфигурация изменяется через UI, переопределения сохраняются в отдельный файл: `/opt/xyops/conf/overrides.json`.

Этот документ описывает все изменяемые свойства в `config.json`.

## base_app_url

Эта строка задает базовый URL вашего инстанса xyOps (по умолчанию: `http://localhost:5522`) и используется для построения полных ссылок в письмах, алертах, тикетах и web hooks (например, URL задач/тикетов и URL логотипа в письмах).

## email_from

Эта строка задает адрес отправителя для всех исходящих сообщений (по умолчанию: `admin@localhost`); многие SMTP серверы требуют, чтобы это был валидный адрес.

## secret_key

Эта строка - общий секрет, используемый для подписи токенов (например, ссылок на скачивание), аутентификации сообщений multi-conductor и шифрования/дешифрования сохраненных секретов. В продакшене задайте длинное случайное значение.

## mail_settings

Этот объект конфигурирует транспорт для email и передается напрямую в Nodemailer через pixl-mail. Значение по умолчанию:

```json
{
	"host": "localhost",
	"port": 25,
	"auth": { "user": "", "pass": "" }
}
```

См. [Nodemailer - SMTP](https://nodemailer.com/smtp/) и [Nodemailer - Sendmail](https://nodemailer.com/transports/sendmail/) для полного списка опций.

Пример (базовый SMTP на localhost):

```json
"mail_settings": {
	"host": "localhost",
	"port": 25
}
```

Пример (локальный sendmail):

```json
"mail_settings": {
	"sendmail": true,
	"newline": "unix",
	"path": "/usr/sbin/sendmail"
}
```

Пример (Fastmail):

```json
"mail_settings": {
	"host": "smtp.fastmail.com",
	"port": 465,
	"auth": { "user": "youremail@fastmail.com", "pass": "YOUR_PASSWORD" },
	"secure": true
}
```

### mail_settings.host

Эта строка задает SMTP hostname (по умолчанию: `localhost`).

### mail_settings.port

Это число задает SMTP порт (по умолчанию: `25`).

### mail_settings.auth

Этот объект содержит учетные данные SMTP. По умолчанию:

```json
{ "user": "", "pass": "" }
```

## email_format

Эта строка управляет форматом тела письма (по умолчанию: `html`); используйте `html` для писем с оформлением или `text` для plain text.

## max_emails_per_day

Это число ограничивает общее количество отправляемых писем в день по всей системе (по умолчанию: 0, то есть без лимита); избыточные отправки отклоняются с ошибкой.

## log_dir

Эта строка задает базовую директорию для логов сервера и задач (по умолчанию: `logs`), например `logs/Error.log` и `logs/jobs/ID.log`.

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

## log_filename

Эта строка задает шаблон имени файла логов для core logger (по умолчанию: `[component].log`); поддерживает плейсхолдеры колонок логов вроде `[component]`.

## log_columns

Этот массив строк задает колонки логов и их порядок. По умолчанию:

```json
["hires_epoch", "date", "hostname", "pid", "component", "category", "code", "msg", "data"]
```

См. [pixl-logger](https://github.com/jhuckaby/pixl-logger) для подробностей.

## log_archive_path

Эта строка задает шаблон пути ночного архива логов (по умолчанию: `logs/archives/[yyyy]/[mm]/[dd]/[filename]-[yyyy]-[mm]-[dd].log.gz`); обслуживание сжимает и записывает логи сюда.

Поддерживает [date/time placeholders](https://github.com/jhuckaby/pixl-tools#getdateargs) для динамического формирования имен архивов.

## log_archive_keep

Эта строка задает срок хранения архивов логов, например `30 days`.

Старые архивы в [log_archive_path](#log_archive_path) автоматически удаляются после ночной ротации.

Установите пустую строку, чтобы отключить функцию и хранить архивы бессрочно.

## log_archive_storage

Опционально архивировать логи в хранилище вместо локального диска. Это в первую очередь для сторонних storage engines вроде S3. Для использования сначала *отключите* [log_archive_path](#log_archive_path) (задайте пустую строку), затем настройте это свойство:

```json
"log_archive_storage": {
	"enabled": true,
	"key_template": "logs/archives/[yyyy]/[mm]/[dd]/[filename]-[yyyy]-[mm]-[dd].log.gz",
	"expiration": "1 year"
}
```

## log_crashes

Этот boolean включает фиксацию необработанных исключений и крэшей в logger subsystem (по умолчанию: `true`).

Файл crash лога будет: `/opt/xyops/logs/crash.log`.

## temp_dir

Эта строка задает scratch директорию для временных файлов, таких как plugin bundles и staging uploads (по умолчанию: `temp`).

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

## pid_file

Эта строка задает путь к PID файлу основного процесса для старт/стоп утилит (по умолчанию: `logs/xyops.pid`).

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

## debug_level

Это число задает уровень подробности логов (по умолчанию: `5`; 1 = тихо, 10 = очень подробно).

## tick_precision_ms

Это число задает внутреннюю точность таймера в миллисекундах для планировщика (по умолчанию: `50`).

Это определяет точность выполнения действий, нацеленных на конкретную секунду. Меньшее значение дает большую точность, но увеличивает CPU нагрузку в простое.

## maintenance

Эта строка (в формате `HH:MM`, локальное время сервера) задает ежедневное время обслуживания, например подрезку БД и архивирование логов (по умолчанию: `04:00`).

## ttl

Это число (в секундах) задает дефолтный HTTP cache TTL для некоторых API ответов и статических ресурсов (по умолчанию: `300`).

## file_expiration

Эта строка-диапазон задает дефолтный срок хранения загруженных файлов (например, вложений тикетов), используется для расчета per-file expiration (по умолчанию: `5 years`).

## timeline_expiration

Эта строка-диапазон задает срок хранения временных рядов мониторинга; старые точки удаляются при обслуживании (по умолчанию: `10 years`).

## ping_freq_sec

Это число (в секундах) задает интервал WebSocket ping до клиентов/воркеров (по умолчанию: `10`).

## ping_timeout_sec

Это число (в секундах) задает максимальное время без pong, после чего сокет считается тайм-аутным (по умолчанию: `20`).

## max_jobs_per_min

Это число задает глобальный лимит стартов задач в минуту (по умолчанию: 100); лишние задачи отклоняются с ошибкой.

Это аварийный тормоз, предотвращающий ситуацию, когда неверная конфигурация workflow кладет всю систему.

## dead_job_timeout

Это число (в секундах) определяет, когда выполняющаяся задача без обновлений считается мертвой и прерывается (по умолчанию: `120`).

## job_env

Этот объект содержит переменные окружения, которые добавляются в каждый процесс задачи.

Значения могут быть переопределены на уровне задачи.

## job_universal_limits

Этот объект определяет глобальные правила limits, автоматически применяемые ко всем задачам/workflows, например ограничения на параллелизм, очередь или ретраи.

## job_universal_actions

Этот объект задает глобальные actions, выполняемые при выполнении условий (по умолчанию включает system snapshot при ошибке). Actions могут назначаться по типу задачи (workflow или event). Пример:

```json
"job_universal_actions": {
	"default": [
		{
			"enabled": true,
			"hidden": false,
			"condition": "error",
			"type": "snapshot"
		}
	],
	"workflow": []
}
```

## alert_universal_actions

Этот массив содержит actions, автоматически применяемые ко всем алертам для стандартизированного поведения (по умолчанию включает скрытый snapshot при новом алерте):

```json
"alert_universal_actions": [
	{
		"enabled": true,
		"hidden": true,
		"condition": "alert_new",
		"type": "snapshot"
	}
]
```

## hostname_display_strip

Эта regex строка удаляется из конца hostname для отображения и уведомлений (по умолчанию: `\\.[\\w\\-]+\\.\\w+$`), например, чтобы убрать доменный суффикс.

## ip_display_strip

Эта regex строка удаляется из IP адресов для отображения (по умолчанию: `^::ffff:`), например, чтобы убрать IPv6 IPv4-mapped префикс.

## search_file_threads

Это число задает количество worker threads для поиска файлов на диске (по умолчанию: `1`).

## search_file_regex

Эта regex строка ограничивает, какие имена файлов просматриваются file search API (по умолчанию: `\\.(txt|log|csv|tsv|xml|json)(\\.gz)?$`).


## tickets

Этот раздел настраивает подсистему тикетов.

### tickets.email_enabled

Этот boolean включает исходящие письма по тикетам (новые/просроченные уведомления) (по умолчанию: `true`).

### tickets.email_debounce_sec

Это число (в секундах) задает минимальный интервал между повторными письмами о тикете, чтобы снизить шум (по умолчанию: `30`).

Например, если пользователь сделал серию изменений подряд, будет отправлено одно письмо в окно 30 секунд с суммарными изменениями.

### tickets.overdue_schedule

Эта строка (`HH:MM`) задает ежедневное время сканирования просроченных тикетов и отправки уведомлений (по умолчанию: `04:30`).

### tickets.overdue_query

Эта строка - [Unbase-style search query](https://github.com/jhuckaby/pixl-server-storage/blob/master/docs/Indexer.md#simple-queries), которая используется для выбора просроченных тикетов (по умолчанию: `status:open due:<today`).

### tickets.due_date_format

Этот формат даты задает отображение сроков тикетов (по умолчанию: `[dddd], [mmmm] [mday], [yyyy]`).

### tickets.date_time_format

Этот формат даты/времени задает отображение timestamps тикетов (по умолчанию: `[dddd], [mmmm] [mday], [yyyy] [hour12]:[mi] [ampm]`).


## hooks

Этот объект задает системные web hook триггеры, которые могут срабатывать на любую активность. Пример:

```json
{ "job_complete": "wmhv3s16ymk" }
```

См. [System Hooks](syshooks.md) для подробностей.



## hook_text_templates

Этот объект задает шаблоны сообщений для задач и алертов; плейсхолдеры в стиле Mustache формируют человекочитаемый текст для email и web hooks (по умолчанию включает шаблоны вроде `{{links.job_details}}`). Пример набора:

```json
{
  "job_start": "Job started on {{nice_server}}: {{event.title}}: {{links.job_details}}",
  "job_success": "Job completed successfully on {{nice_server}}: {{event.title}}: {{links.job_details}}",
  "job_error": "Job failed on {{nice_server}}: {{event.title}}: Error ({{job.code}}): {{job.description}}: {{links.job_details}}",
  "job_progress": "Job is in progress on {{nice_server}} ({{event.title}}): {{links.job_details}}",
  "job_suspended": "Job is suspended and requires human intervention: {{event.title}}: {{links.job_details}}&resume=1",
  "job_limited": "{{action.msg}}: {{links.job_details}}",
  "alert_new": "Alert: {{nice_server}}: {{def.title}}: {{alert.message}}: {{links.alert_url}}",
  "alert_cleared": "Alert Cleared: {{nice_server}}: {{def.title}}"
}
```

См. [JobHookData](data.md#jobhookdata) и [AlertHookData](data.md#alerthookdata) для списка доступных макросов.



## multi

Этот раздел настраивает multi-server подсистему.

### multi.list_url

Эта строка URL указывает на метаданные релизов, используемые для обновлений multi-conductor (по умолчанию: `https://api.github.com/repos/pixlcore/xyops/releases`).

### multi.protocol

Эта строка выбирает протокол WebSocket для связи между peers (по умолчанию: `ws:`); установите `wss:` для обязательного TLS.

### multi.connect_timeout_sec

Это число (в секундах) задает таймаут подключения для первичных peer socket соединений (по умолчанию: `3`).

### multi.master_timeout_sec

Это число (в секундах) используется для election таймера и общих таймаутов управления conductors (по умолчанию: `10`).

### multi.socket_opts

Этот объект содержит опции, объединяемые с WebSocket клиентом, например TLS настройки для self-signed сертификатов. По умолчанию:

```json
{ "rejectUnauthorized": false }
```



## satellite

Этот раздел настраивает xySat, наш удаленный satellite агент.

### satellite.list_url

Эта строка URL указывает на метаданные релизов satellite агента (по умолчанию: `https://api.github.com/repos/pixlcore/xysat/releases`).

### satellite.base_url

Эта строка URL задает базовый URL для загрузок/обновлений satellite (по умолчанию: `https://github.com/pixlcore/xysat/releases`).

### satellite.version

Эта строка задает желаемую версию satellite для загрузки; может быть semver или тег (по умолчанию: `latest`).

### satellite.cache_ttl

Это число (в секундах) задает TTL кэша метаданных релизов satellite, чтобы уменьшить сетевые запросы (по умолчанию: `3600`).

### satellite.config

Этот объект содержит настройки web server и runtime для xySat; эти опции передаются при управлении или провижининге satellite узлов (дефолты в sample config).



## marketplace

Этот раздел настраивает xyOps Marketplace.

## marketplace.enabled

Этот boolean включает или отключает marketplace. Если отключен, пользователи не смогут искать или устанавливать плагины. По умолчанию `true` (включено).

## marketplace.metadata_url

Эта строка указывает на центральные метаданные marketplace, где находится полный каталог продуктов. Пример:

```
https://raw.githubusercontent.com/pixlcore/xyops-marketplace/refs/heads/main/marketplace.json
```

## marketplace.repo_url_template

Эта строка - шаблон для формирования URL репозитория плагина к конкретным файлам. Содержит макросы `id` (org и repo), `version` (git tag) и `filename`. Пример:

```
https://raw.githubusercontent.com/[id]/refs/tags/[version]/[filename]
```

## marketplace.ttl

Это количество секунд для кэширования metadata marketplace локально перед повторным запросом. По умолчанию `3600` (1 час).



## quick_monitors

Этот массив задает встроенные метрики для сбора (по умолчанию включает CPU, память, диск и сеть). Они отображаются на страницах серверов для realtime мониторинга.

## default_user_privileges

Этот объект задает дефолтные привилегии для новых пользователей (по умолчанию включает создание/редактирование событий, запуск/тег/комментарий задач и права по тикетам), если не переопределено ролями или SSO.

См. [Privileges](privileges.md) для подробностей.

## default_user_prefs

Этот объект задает дефолтные UI предпочтения новых пользователей (locale, theme, motion/contrast, volume, saved searches и т.д.), которые объединяются с профилем при создании/входе.


## db_maint

Эти настройки используются во время ночного обслуживания базы данных.

### db_maint.jobs

#### db_maint.jobs.max_rows

Это число задает максимальное количество строк в таблице jobs (по умолчанию: `1000000`); самые старые удаляются при обслуживании.

### db_maint.alerts

#### db_maint.alerts.max_rows

Это число задает максимальное количество строк в таблице alerts (по умолчанию: `100000`); самые старые удаляются при обслуживании.

### db_maint.snapshots

#### db_maint.snapshots.max_rows

Это число задает максимальное количество строк в таблице snapshots (по умолчанию: `100000`); самые старые удаляются при обслуживании.

### db_maint.activity

#### db_maint.activity.max_rows

Это число задает максимальное количество строк в таблице activity (по умолчанию: `100000`); самые старые удаляются при обслуживании.

### db_maint.servers

#### db_maint.servers.max_rows

Это число задает максимальное количество строк в таблице servers (по умолчанию: `10000`); самые старые удаляются при обслуживании.


## airgap

Этот раздел для airgap режима, который может запретить xyOps делать несанкционированные исходящие подключения вне заданного диапазона IP.

См. [Air-Gapped Mode](hosting.md#air-gapped-mode) для подробностей.

### airgap.enabled

Этот boolean включает контроль исходящих HTTP(S) запросов, инициированных сервером (по умолчанию: `false`).

### airgap.outbound_whitelist

Этот массив CIDR/hosts задает разрешенные назначения для исходящих запросов (по умолчанию включает локальные/приватные сети); когда режим включен, разрешены только эти адреса.

### airgap.outbound_blacklist

Этот массив CIDR/hosts задает назначения, которые всегда блокируются.


## client

Этот раздел для клиентской конфигурации, используемой в web приложении xyOps.

### client.name

Эта строка - имя продукта, отображаемое в UI и в тексте писем/версии (по умолчанию: `xyOps`).

### client.company

Эта строка отображается как часть копирайта в левом нижнем углу UI (по умолчанию: `PixlCore LLC`).

### client.logo_url

Этот путь указывает логотип, используемый в header/sidebar UI и в письмах (по умолчанию: `images/logotype.png`).

### client.items_per_page

Это число задает дефолтный размер страниц для списков и поиска (по умолчанию: `50`).

### client.alt_items_per_page

Это число задает дополнительный размер страницы для inline widgets и dropdown списков (по умолчанию: `25`).

### client.events_per_page

Это число управляет тем, сколько дополнительных событий загружается за один шаг в Events view (по умолчанию: `500`).

### client.max_table_rows

Это число ограничивает количество отрисовываемых строк таблиц на клиенте для отзывчивости UI (по умолчанию: `500`).

### client.max_menu_items

Верхняя граница элементов в меню и dropdown (по умолчанию: `1000`).

### client.alt_to_toggle

Требует удерживать Opt/Alt для переключения свойства `enabled` у некоторых сущностей в UI (защита от случайных кликов).

### client.new_event_template

Задает разумные дефолты для новых событий (triggers, limits, actions). Используется для предзаполнения формы New Event.

### client.chart_defaults

Дефолтные параметры отрисовки графиков (толщина линии, сглаживание, тики). Применяется к графикам мониторов в UI.

См. [pixl-chart](https://github.com/jhuckaby/pixl-chart) для подробностей.

### client.editor_defaults

Дефолтные настройки редактора кода (табы, отступы, перенос строк) для полей [CodeMirror](https://codemirror.net/5/) в UI.

### client.bucket_upload_settings

Клиентские лимиты для загрузки в buckets (макс. файлов/размер/типы). Проверяются в UI перед загрузкой и на сервере.

### client.ticket_upload_settings

Клиентские лимиты для вложений тикетов (макс. файлов/размер/типы). Проверяются в UI перед загрузкой и на сервере.

### client.job_upload_settings

Клиентские лимиты для загрузки файлов задач (макс. файлов/размер/типы) и дефолтный срок хранения пользовательских/плагинных файлов.


## Storage

Этот раздел настраивает backend storage для xyOps.

Полная документация: [pixl-server-storage](https://github.com/jhuckaby/pixl-server-storage).

### Storage.engine

Выбор storage engine (например, Hybrid, Filesystem, SQLite, S3). По умолчанию `Hybrid`, который сочетает SQLite для JSON записей и файловую систему для бинарных файлов.

См. [Engines](https://github.com/jhuckaby/pixl-server-storage#engines) для деталей.

### Storage.list_page_size

Размер страницы по умолчанию для storage lists (по умолчанию: `100`).

### Storage.hash_page_size

Размер страницы по умолчанию для storage hashes (по умолчанию: `100`).

### Storage.concurrency

Максимальная параллельность I/O (по умолчанию: `32`).

### Storage.transactions

Включает транзакционные записи (по умолчанию: `true`).

### Storage.network_transactions

Включает транзакции по сети (экспериментально: используйте осторожно).

### Storage.trans_auto_recover

Автоматически восстанавливает незавершенные транзакции при старте (по умолчанию: `true`).

### Storage.trans_dir

Временная директория для журналов/логов транзакций (по умолчанию: `data/_transactions`).

### Storage.log_event_types

По умолчанию включает логирование операций get/put/delete и др. Управляет тем, какие storage события пишутся в лог.

### Storage.Hybrid

Конфигурация для [Hybrid](https://github.com/jhuckaby/pixl-server-storage#hybrid) backend.

### Storage.Filesystem

Опции Filesystem backend (base directory, namespacing, raw paths, fsync, in-memory cache). См. [Filesystem](https://github.com/jhuckaby/pixl-server-storage#local-filesystem).

### Storage.SQLite

Опции SQLite backend (base directory, filename, pragmas, cache, backups). См. [SQLite](https://github.com/jhuckaby/pixl-server-storage#sqlite).

### Storage.AWS

Опции AWS SDK (region/credentials) для S3. См. [Amazon S3](https://github.com/jhuckaby/pixl-server-storage#amazon-s3).

### Storage.S3

Опции S3 backend (timeouts, retries, bucket params, caching). См. [Amazon S3](https://github.com/jhuckaby/pixl-server-storage#amazon-s3).


## WebServer

Этот раздел настраивает web server xyOps.

Полная документация: [pixl-server-web](https://github.com/jhuckaby/pixl-server-web).

### WebServer.port

HTTP порт встроенного web server (по умолчанию: `5522`).

### WebServer.htdocs_dir

Базовая директория статических ассетов и web UI (по умолчанию: `htdocs`).

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

### WebServer.max_upload_size

Максимальный допустимый размер загрузки в байтах (по умолчанию: `1073741824`).

### WebServer.static_ttl

Cache TTL для статических ассетов (по умолчанию: `31536000`).

### WebServer.static_index

Индексный файл по умолчанию для директорий (по умолчанию: `index.html`).

### WebServer.server_signature

Строка подписи сервера в заголовках (по умолчанию: `xyOps`).

### WebServer.compress_text

Включает gzip/deflate компрессию для текстовых ответов (по умолчанию: `true`).

### WebServer.enable_brotli

Включает Brotli компрессию, если поддерживается (по умолчанию: `true`).

### WebServer.timeout

Таймаут простоя входящих соединений на запрос, в секундах (по умолчанию: `30`);

### WebServer.regex_json

Regex content-type, который трактуется как JSON (по умолчанию: `(text|javascript|js|json)`).

### WebServer.clean_headers

Удаляет небезопасные символы HTTP заголовков в ответах (по умолчанию: `true`).

### WebServer.log_socket_errors

Управляет логированием низкоуровневых socket ошибок (по умолчанию: `false`).

### WebServer.response_headers

Дополнительные заголовки, добавляемые ко всем ответам. По умолчанию ничего не добавляется.

### WebServer.keep_alives

Управляет keep-alive поведением HTTP (см. [keep_alives](https://github.com/jhuckaby/pixl-server-web#keep_alives)).

### WebServer.keep_alive_timeout

Idle timeout для keep-alive соединений в секундах (по умолчанию: `30`).

### WebServer.max_connections

Максимальное число одновременных socket соединений (по умолчанию: `2048`).

### WebServer.max_concurrent_requests

Максимальное число одновременных запросов (по умолчанию: `256`).

### WebServer.log_requests

Включает per-request транзакционное логирование (по умолчанию: `false`).

### WebServer.legacy_callback_support

Включает legacy JSONP/callback для старых клиентов (по умолчанию: `false`). Не включайте в продакшне.

### WebServer.startup_message

Выводит стартовое сообщение с URL сервера в консоль (по умолчанию: `false`). Оставьте выключенным, xyOps выводит свое сообщение.

### WebServer.debug_ttl

Устанавливает дефолтный cache TTL в `0` при запуске в debug mode (по умолчанию: `false`).

### WebServer.debug_bind_local

Привязывает к localhost только в debug mode (по умолчанию: `true`).

### WebServer.whitelist

Список IP/CIDR, которым разрешен доступ к webserver (по умолчанию: все).

### WebServer.blacklist

Список IP/CIDR, которым запрещен доступ на уровне webserver (по умолчанию: нет).

### WebServer.uri_response_headers

Позволяет сопоставлять URI regex с кастомными response headers. xyOps использует это для CSP и security headers для HTML путей.

### WebServer.https

Включает поддержку HTTPS (по умолчанию: `true`).

### WebServer.https_port

HTTPS порт (по умолчанию: `5523`).

### WebServer.https_cert_file

Путь к файлу TLS сертификата (по умолчанию: `conf/tls.crt`).

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

### WebServer.https_key_file

Путь к приватному TLS ключу (по умолчанию: `conf/tls.key`).

Если путь относительный, он считается от базовой директории xyOps (обычно `/opt/xyops`).

### WebServer.https_force

Принудительный редирект HTTP на HTTPS (по умолчанию: `false`).

### WebServer.https_timeout

Таймаут простоя HTTPS запросов в секундах (по умолчанию: `30`).

### WebServer.https_header_detect

Включает обработку common headers для определения HTTPS за reverse proxy.


## User

Этот раздел настраивает систему управления пользователями xyOps.

Полная документация: [pixl-server-user](https://github.com/jhuckaby/pixl-server-user).

### User.session_expire_days

Срок жизни сессии в днях до повторного логина (по умолчанию: `365`).

### User.max_failed_logins_per_hour

Лимит неудачных логинов на пользователя в час (по умолчанию: `5`).

### User.max_forgot_passwords_per_hour

Лимит запросов восстановления пароля на пользователя в час (по умолчанию: `3`).

### User.free_accounts

Разрешает пользователям саморегистрироваться без приглашения администратора (по умолчанию: `false`).

### User.sort_global_users

Сортирует глобальные списки пользователей (влияет на порядок в admin UI, по умолчанию: `false`).

### User.use_bcrypt

Использовать bcrypt для хеширования паролей (по умолчанию: `true`).

### User.mail_logger

Прикрепляет вывод логгера к логам отправки писем для диагностики (по умолчанию: `true`).

### User.valid_username_match

Разрешенные символы в username (по умолчанию: `^[\\w\\-\\.]+$`).

### User.block_username_match

Regex для зарезервированных/заблокированных usernames (для безопасности и защиты namespace).

### User.cookie_settings

Задает cookie path, secure policy, httpOnly и sameSite. Управляет атрибутами cookie сессии.



## SSO

Этот раздел настраивает Single Sign-On через trusted headers. См. [SSO guide](sso.md) для примеров и настройки.

### enabled

Этот boolean включает SSO и отключает локальный логин по username/password (по умолчанию: `false`).

### whitelist

Этот массив IP/CIDR ограничивает, какие client адреса могут передавать trusted headers (по умолчанию: localhost, private и link-local диапазоны).

### header_map

Этот объект мапит входящие trusted headers в поля пользователя xyOps (`username`, `full_name`, `email`, `groups`).

### cleanup_username

Этот boolean очищает username при выводе из email (удаляет запрещенные символы, приводит к lowercase, берет local-part) (по умолчанию: `true`).

### cleanup_full_name

Этот boolean строит display name из email (использует local-part, заменяет точки пробелами, title-case) (по умолчанию: `true`).

### group_role_map

Этот объект мапит IdP группы на role IDs xyOps для автоназначения ролей при логине (по умолчанию: `{}`).

### group_privilege_map

Этот объект мапит IdP группы на privilege keys для автоназначения привилегий при логине (по умолчанию: `{}`).

### replace_roles

Этот boolean заменяет все существующие роли на те, что в `group_role_map` при каждом логине (по умолчанию: `false`).

### replace_privileges

Этот boolean заменяет все существующие привилегии на те, что в `group_privilege_map` при каждом логине (по умолчанию: `false`).

### admin_bootstrap

Эта строка временно дает полные права admin для точного совпадения username, чтобы выполнить первоначальную настройку; удалите после настройки групп (по умолчанию: пусто).

### logout_url

Это строка URL для редиректа после очистки сессии xyOps, чтобы ваш auth proxy/IdP завершил logout (например, `/oauth2/sign_out?rd=...`).



## Debug

### Debug.enabled

Включает удаленную отладку сервера через Chrome Dev Tools (по умолчанию: `false`).



## config_overrides_file

Когда настройки меняются через UI, переопределения сохраняются здесь и применяются поверх `config.json`.
