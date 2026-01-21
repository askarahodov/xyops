# Самостоятельное размещение

## Обзор

Это руководство описывает, как развернуть xyOps в собственной инфраструктуре. Однако для боевых установок опасно идти в одиночку. Хотя здесь есть вся необходимая документация, мы настоятельно рекомендуем [Enterprise Plan](https://xyops.io/pricing). Он дает доступ к сервису white-glove onboarding, где наша команда проведет вас по всем шагам, проверит конфигурацию и убедится, что интеграция безопасна и надежна. Также вы получите приоритетную поддержку по тикетам и живой чат с инженером xyOps.

## Предварительные требования

Важно понимать, что где бы вы ни запускали xyOps, этот сервер (или контейнер) должен быть **доступен в вашей сети по hostname**. Так рабочие серверы будут подключаться к xyOps, поэтому нужен фиксированный hostname, который резолвится в IP, доступный вашим серверам. В Docker задайте **hostname контейнера** так, чтобы он резолвился и был достижим в вашей сети.

## Быстрый старт

Чтобы быстро поднять xyOps для теста, используйте следующую команду Docker:

```sh
docker run \
	--detach \
	--init \
	--name "xyops01" \
	--hostname "xyops01" \
	--restart unless-stopped \
	-v xy-data:/opt/xyops/data \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-e XYOPS_xysat_local="true" \
	-e TZ="America/Los_Angeles" \
	-p 5522:5522 \
	-p 5523:5523 \
	ghcr.io/pixlcore/xyops:latest
```

Ниже то же в виде docker compose файла, с дополнительным bind mount для директории конфигурации:

```yaml
services:
  xyops01:
    image: ghcr.io/pixlcore/xyops:latest
    container_name: xyops01
    hostname: xyops01

    init: true
    restart: unless-stopped

    environment:
      XYOPS_xysat_local: "true"
      TZ: America/Los_Angeles

    volumes:
      - xy-data:/opt/xyops/data
      - /local/path/to/xyops-conf:/opt/xyops/conf
      - /var/run/docker.sock:/var/run/docker.sock

    ports:
      - "5522:5522"
      - "5523:5523"

volumes:
  xy-data:
```

Замените `/local/path/to/xyops-conf` на подходящую директорию на хосте для конфигурации xyOps (чтобы было удобно править).

Затем откройте http://localhost:5522/ для HTTP или https://localhost:5523/ для HTTPS (обратите внимание, сертификат будет самоподписанный -- см. [TLS](#tls) ниже). Будет создан аккаунт администратора по умолчанию с логином `admin` и паролем `admin`. Также будет создан Docker том (`xy-data`) для сохранения базы данных xyOps, которая по умолчанию является гибридом SQLite и файловой системы для хранения файлов.

Несколько замечаний:

- **Важно:** замените пример `xyops01` на hostname, который реально резолвится и доступен в вашей сети. Иначе многие функции не будут работать.
- В этом случае xyOps будет использовать самоподписанный TLS сертификат, который worker принимает по умолчанию. См. [TLS](#tls) ниже.
- Измените переменную окружения `TZ` на вашу локальную таймзону, чтобы лог-ротация в полночь и дневные сбросы статистики выполнялись корректно.
- Переменная `XYOPS_xysat_local` заставляет xyOps запускать [xySat](#satellite) в фоне в том же контейнере. Это удобно для тестов и домашних лабораторий, но не рекомендуется для продакшна.
- Если планируете использовать контейнер долго, обязательно [проверните секретный ключ](#secret-key-rotation).
- Привязка `/var/run/docker.sock` опциональна и позволяет xyOps запускать собственные контейнеры (например, для [Docker Plugin](plugins.md#docker-plugin) и [Plugin Marketplace](marketplace.md)).

Чтобы добавлять worker-серверы, контейнер должен быть *доступен в вашей сети* по hostname. Обычно это достигается добавлением hostname в локальный DNS или через `/etc/hosts`. См. [Adding Servers](servers.md#adding-servers) для подробностей.

### Конфигурация

Основной конфиг xyOps находится в `/opt/xyops/conf/config.json`, но в `/opt/xyops/conf` есть и другие полезные файлы. Например, если значения меняются через UI, они записываются в `/opt/xyops/conf/overrides.json`. Если вы планируете использовать Docker контейнер долго, лучше смонтировать всю директорию `/opt/xyops/conf` как volume или bind mount (рекомендуется):

```
-v /local/path/to/xyops-conf:/opt/xyops/conf
```

xyOps автоматически скопирует все дефолтные конфиги при первом запуске.

См. [Configuration Guide](config.md) для подробностей настройки `config.json`.

## Ручная установка

Этот раздел описывает ручную установку xyOps на сервере (вне Docker).

Обратите внимание, что conductor сейчас работает только на POSIX-совместимых ОС, то есть Unix/Linux и macOS. Также вам нужен [Node.js](https://nodejs.org/en/download/) на сервере. Мы **настойчиво рекомендуем ставить LTS версию Node.js**. xyOps может работать и на "current", но LTS стабильнее и лучше протестирована. См. [Node.js Releases](https://nodejs.org/en/about/releases/).

xyOps также требует NPM. Обычно он идет в комплекте с Node.js, но при ручной установке Node.js вам может понадобиться установить NPM отдельно. Вероятно, также понадобятся инструменты компиляции (например, `apt-get install build-essential python3-setuptools` на Ubuntu).

Когда Node.js и NPM установлены, выполните (от root):

```sh
curl -s https://raw.githubusercontent.com/pixlcore/xyops/main/bin/install.js | node
```

Это установит последнюю стабильную версию xyOps и все зависимости в `/opt/xyops/`.

Если вы хотите установить вручную (или как не-root пользователь), используйте следующие команды:

```sh
mkdir -p /opt/xyops && cd /opt/xyops
curl -L https://github.com/pixlcore/xyops/archive/v1.0.0.tar.gz | tar zxvf - --strip-components 1
npm install
node bin/build.js dist
bin/control.sh start
```

Замените `v1.0.0` на желаемую версию из [официального списка релизов](https://github.com/pixlcore/xyops/releases), или `main` для head-ревизии (нестабильно).

Если вы хотите, чтобы xyOps автоматически стартовал при перезагрузке, выполните:

```sh
cd /opt/xyops
npm run boot
```

### Command Line

См. [Command Line Guide](cli.md) для управления сервисом через командную строку.

### Добавление conductors вручную

При ручной установке xyOps создает кластер из одного узла и делает себя primary. Чтобы добавить резервные conductors, следуйте инструкциям.

Во-первых, для multi-conductor установки **нужен внешний storage backend**, например NFS, S3 или S3-совместимый (MinIO и т.п.). См. [Storage Engines](https://github.com/jhuckaby/pixl-server-storage#engines) для деталей.

После настройки внешнего хранилища остановите сервис xyOps и отредактируйте `/opt/xyops/conf/masters.json`:

```json
{
	"masters": [
		"xyops01.mycompany.com"
	]
}
```

Добавьте hostname нового сервера в массив `masters`. Помните, оба сервера должны видеть друг друга по hostname.

Затем установите ПО на новом сервере и перед запуском сервиса скопируйте следующие файлы:

```
/opt/xyops/conf/config.json
/opt/xyops/conf/overrides.json
/opt/xyops/conf/masters.json
```

Наконец, запустите сервис на обоих серверах. Они самостоятельно договорятся, и один будет повышен до primary через 10 секунд (какой hostname идет первым в алфавитном порядке).

Обратите внимание: hostname conductor-сервера **нельзя менять**. Если это произошло, нужно обновить `/opt/xyops/conf/masters.json` на всех серверах и перезапустить все.

Для полностью прозрачного auto-failover с единым пользовательским hostname см. [Multi-Conductor with Nginx](#multi-conductor-with-nginx) ниже.

### Удаление

Чтобы удалить xyOps, остановите сервис и удалите директорию `/opt/xyops`:

```sh
cd /opt/xyops
bin/control.sh stop
npm run unboot # deregister as system startup service
rm -rf /opt/xyops
cd -
```

Сначала убедитесь, что вы [деактивировали сервера](servers.md#decommissioning-servers).

## Переменные окружения

xyOps поддерживает специальный синтаксис переменных окружения, который может задавать параметры командной строки и переопределять конфиг. Синтаксис: `XYOPS_key`, где `key` - это один из параметров командной строки (см. таблицу ниже) или путь JSON свойства в конфиге. Это удобно для автоматизации установок и контейнеров.

Для переопределения конфиг-значений через переменные окружения можно указать любой верхнеуровневый JSON ключ из `config.json` или *путь* к вложенному свойству, используя двойной underscore (`__`) как разделитель. Для булевых свойств используйте строки `true` или `false`, xyOps их преобразует. Пример доступных вариантов:

| Variable | Sample Value | Description |
|----------|--------------|-------------|
| `XYOPS_foreground` | `true` | Запуск xyOps в foreground (без фонового демона). |
| `XYOPS_echo` | `true` | Печатать event log в консоль (STDOUT), используйте вместе с `XYOPS_foreground`. |
| `XYOPS_color` | `true` | Цветной вывод event log, используйте вместе с `XYOPS_echo`. |
| `XYOPS_base_app_url` | `http://xyops.yourcompany.com` | Переопределить свойство [base_app_url](config.md#base_app_url). |
| `XYOPS_email_from` | `xyops@yourcompany.com` | Переопределить свойство [email_from](config.md#email_from). |
| `XYOPS_WebServer__port` | `80` | Переопределить `port` *внутри* объекта [WebServer](config.md#webserver). |
| `XYOPS_WebServer__https_port` | `443` | Переопределить `https_port` *внутри* объекта [WebServer](config.md#webserver). |
| `XYOPS_Storage__Filesystem__base_dir` | `/data/xyops` | Переопределить `base_dir` *внутри* объекта [Filesystem](config.md#storage-filesystem) *внутри* объекта [Storage](config.md#storage). |

Почти каждое [свойство конфигурации](config.md) можно переопределить через эти переменные. Исключения - массивы, например [log_columns](config.md#log_columns).

## Ежедневные бэкапы

Вот как генерировать ежедневные бэкапы критичных данных xyOps независимо от storage backend. Сначала создайте [API Key](api.md#api-keys) и дайте ему права администратора (это нужно для [admin_export_data](api.md#admin_export_data)). Затем запросите бэкап с помощью [curl](https://curl.se/):

```sh
curl -X POST "https://xyops.yourcompany.com/api/app/admin_export_data" \
	-H "X-API-Key: YOUR_API_KEY_HERE" -H "Content-Type: application/json" \
	-d '{"lists":"all","indexes":["tickets"]}' -O -J
```

Бэкап будет сохранен как `.txt.gz` файл в текущей директории с шаблоном имени:

```
xyops-data-export-YYYY-MM-DD-UNIQUEID.txt.gz
```

Обратите внимание: этот пример экспортирует только **критичные** данные и не является полным бэкапом (не включены история задач, история алертов, история снимков, история серверов и журнал активности). Чтобы экспортировать *все*, измените JSON на: `{"lists":"all","indexes":"all","extras":"all"}`. Это может занять время и создать большой файл в зависимости от размера базы. Чтобы ограничить состав бэкапа, см. документацию [admin_export_data](api.md#admin_export_data).

<a id="tls"></a>
## TLS

Встроенный веб-сервер xyOps ([pixl-server-web](https://github.com/jhuckaby/pixl-server-web)) поддерживает TLS. См. руководство:

[Let's Encrypt / ACME TLS Certificates](https://github.com/jhuckaby/pixl-server-web#lets-encrypt--acme-tls-certificates)

В качестве альтернативы можно поставить прокси перед xyOps и обрабатывать TLS там (см. следующий раздел).

<a id="multi-conductor-with-nginx"></a>
## Multi-Conductor с Nginx

Для балансируемой multi-conductor установки с Nginx и TLS прочитайте этот раздел. Это сложная конфигурация и требует глубокого знания всех компонентов. Здесь снова рекомендуем [Enterprise Plan](https://xyops.io/pricing), мы можем настроить все за вас. Далее принцип работы:

- [Nginx](https://nginx.org/) стоит спереди и выполняет TLS termination, а также маршрутизирует запросы на разные бэкенды.
- Nginx управляет multi-conductor xyOps через встроенный [Health Check Daemon](https://github.com/pixlcore/xyops-healthcheck), который запускается в том же контейнере.
	- Health check отслеживает, какой conductor является primary, и динамически перестраивает и hot-reload'ит Nginx.
	- Мы поддерживаем собственный Docker образ Nginx (ниже), либо вы можете [собрать свой](https://github.com/pixlcore/xyops-nginx/blob/main/Dockerfile).

Несколько требований для этой схемы:

- Для multi-conductor **нужен внешний storage backend** (NFS, S3, S3-совместимый MinIO и т.п.). См. [Storage Engines](https://github.com/jhuckaby/pixl-server-storage#engines).
- Нужен пользовательский домен и заранее подготовленные TLS сертификаты.
- У вас готова конфигурация xyOps ([config.json](https://github.com/pixlcore/xyops/blob/main/sample_conf/config.json)) (см. ниже).

В примерах ниже используем такие плейсхолдеры доменов:

- `xyops.yourcompany.com` - пользовательский домен, который должен вести на Nginx / SSO.
- `xyops01.yourcompany.com` - внутренний домен conductor #1.
- `xyops02.yourcompany.com` - внутренний домен conductor #2.

Conductor-серверы должны иметь уникальные внутренние домены, потому что система multi-conductor требует, чтобы каждый conductor был адресуем и доступен всем вашим worker-серверам. Worker-серверы не знают про Nginx и подключаются к conductors напрямую, со своим механизмом авто-failover. Кроме того, worker-серверы используют постоянные WebSocket соединения и могут создавать большой трафик. Поэтому в продакшне лучше, чтобы worker-серверы подключались напрямую к conductors.

Тем не менее, вы *можете* настроить worker-серверы на подключение через Nginx, если нужно. Это полезно, когда серверы находятся в другой сети или вне периметра, но обычно не рекомендуется. Для этого см. [Overriding The Connect URL](hosting.md#overriding-the-connect-url) в нашем руководстве.

Вот команда для запуска Nginx:

```sh
docker run \
	--detach
	--init \
	--name xyops-nginx \
	-e XYOPS_masters="xyops01.yourcompany.com,xyops02.yourcompany.com" \
	-e XYOPS_port="5522" \
	-v "$(pwd)/tls.crt:/etc/tls.crt:ro" \
	-v "$(pwd)/tls.key:/etc/tls.key:ro" \
	-p 443:443 \
	ghcr.io/pixlcore/xyops-nginx:latest
```

И то же в docker compose:

```yaml
services:
  nginx:
    image: ghcr.io/pixlcore/xyops-nginx:latest
    init: true
    environment:
      XYOPS_masters: xyops01.yourcompany.com,xyops02.yourcompany.com
      XYOPS_port: 5522
    volumes:
      - "./tls.crt:/etc/tls.crt:ro"
      - "./tls.key:/etc/tls.key:ro"
    ports:
      - "443:443"
```

Поговорим про настройку Nginx. Мы используем собственный Docker образ ([xyops-nginx](https://github.com/pixlcore/xyops-nginx)), который основан на официальном образе Nginx, но включает демона [xyOps Health Check](https://github.com/pixlcore/xyops-healthcheck). Health check отслеживает текущий primary conductor и динамически перенастраивает Nginx на лету (чтобы Nginx всегда маршрутизировал только к primary). Образ также включает полностью преднастроенный Nginx. Чтобы использовать этот образ, вам нужно предоставить:

- Ваши TLS сертификаты `tls.crt` и `tls.key`, которые монтируются в `/etc/tls.crt` и `/etc/tls.key` соответственно.
- Список доменов conductors в виде CSV в переменной `XYOPS_masters` (используется health check).

Когда Nginx запущен, можно поднимать backend xyOps. Обычно это делается на отдельных серверах. Ниже multi-conductor конфигурация в виде одного Docker run:

```sh
docker run \
	--detach \
	--init \
	--name xyops1 \
	--hostname xyops01.yourcompany.com \
	--restart unless-stopped \
	-e XYOPS_masters="xyops01.yourcompany.com,xyops02.yourcompany.com" \
	-e TZ="America/Los_Angeles" \
	-v "/local/path/to/xyops-conf:/opt/xyops/conf" \
	-v "/var/run/docker.sock:/var/run/docker.sock" \
	-p 5522:5522 \
	-p 5523:5523 \
	ghcr.io/pixlcore/xyops:latest
```

И то же в docker compose:

```yaml
services:
  xyops1:
    image: ghcr.io/pixlcore/xyops:latest
    hostname: xyops01.yourcompany.com # change this per conductor server
    init: true
    environment:
      XYOPS_masters: xyops01.yourcompany.com,xyops02.yourcompany.com
      TZ: America/Los_Angeles
    volumes:
      - "/local/path/to/xyops-conf:/opt/xyops/conf"
      - "/var/run/docker.sock:/var/run/docker.sock"
    ports:
      - "5522:5522"
      - "5523:5523"
```

Для дополнительных conductor-серверов можно просто дублировать команду и менять hostname.

Несколько важных моментов:

- Мы используем официальный образ xyOps, но вы можете [собрать свой](https://github.com/pixlcore/xyops/blob/main/Dockerfile).
- Все hostname conductors должны быть перечислены в переменной `XYOPS_masters` через запятую.
- Все conductors должны быть доступны друг другу по hostname, чтобы они могли проводить выборы.
- Таймзона (`TZ`) должна быть установлена на основную таймзону компании, чтобы корректно работали лог-ротация и дневные сбросы статистики.
- Привязка `/var/run/docker.sock` позволяет xyOps запускать собственные контейнеры (например, для [Plugin Marketplace](marketplace.md)).
- Путь `/local/path/to/xyops-conf` нужно заменить на директорию на хосте, где вы хотите хранить конфигурацию xyOps.
	- xyOps автоматически заполнит эту директорию при первом запуске контейнера.
	- См. [xyOps Configuration Guide](config.md) для настройки `config.json`.

<a id="satellite"></a>
## Satellite

**xyOps Satellite ([xySat](https://github.com/pixlcore/xysat))** - это спутник xyOps. Он одновременно является job runner'ом и сборщиком данных для мониторинга и алертов. xySat должен быть установлен *на всех ваших серверах*, он легкий и не имеет зависимостей.

Инструкции по установке xySat см. в [Adding Servers](servers.md#adding-servers).

### Конфигурация

xySat конфигурируется автоматически через conductor. Объект [satellite.config](config.md#satellite-config) отправляется на каждый сервер после подключения и аутентификации, так что вы можете держать конфиг xySat на стороне conductor, и он будет синхронизирован. Вот конфиг по умолчанию:

```json
{ 
	"port": 5522,
	"secure": false,
	"socket_opts": { "rejectUnauthorized": false },
	"pid_file": "pid.txt",
	"log_dir": "logs",
	"log_filename": "[component].log",
	"log_crashes": true,
	"log_archive_path": "logs/archives/[filename]-[yyyy]-[mm]-[dd].log.gz",
	"log_archive_keep": "7 days",
	"temp_dir": "temp",
	"debug_level": 5,
	"child_kill_timeout": 10,
	"monitoring_enabled": true,
	"quickmon_enabled": true
}
```

Описание свойств конфигурации:

| Property Name | Type | Description |
|---------------|------|-------------|
| `port` | Number | Указывает порт, на котором conductor будет слушать (по умолчанию `5522` для ws:// и `5523` для wss://). |
| `secure` | Boolean | Установите `true` для безопасного WebSocket (wss://) и HTTPS. |
| `socket_opts` | Object | Опции для WebSocket соединения (см. [WebSocket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket)). |
| `pid_file` | String | Путь к PID файлу, чтобы гарантировать, что два satellites не запущены одновременно. |
| `log_dir` | String | Путь к директории логов относительно базы xySat (`/opt/xyops/satellite`). |
| `log_filename` | String | Шаблон имени файла логов (по умолчанию `[component].log`); поддерживает плейсхолдеры лог-колонок. |
| `log_crashes` | Boolean | Включает логирование необработанных исключений и крэшей (по умолчанию `true`). |
| `log_archive_path` | String | Шаблон пути ночного архива логов (по умолчанию `logs/archives/[filename]-[yyyy]-[mm]-[dd].log.gz`). |
| `log_archive_keep` | String | Сколько дней хранить архивы логов до авто-удаления старых. |
| `temp_dir` | String | Путь к временной директории относительно базы (`/opt/xyops/satellite`). |
| `debug_level` | Number | Уровень подробности логов (по умолчанию `5`; 1 = тихо, 10 = очень подробно). |
| `child_kill_timeout` | Number | Сколько секунд ждать после SIGTERM перед SIGKILL. |
| `monitoring_enabled` | Boolean | Включить или выключить подсистему мониторинга (метрики каждую минуту). |
| `quickmon_enabled` | Boolean | Включить или выключить быстрые мониторы, которые отправляют метрики каждую секунду. |

<a id="overriding-the-connect-url"></a>
#### Overriding The Connect URL

При первом установке xySat получает массив хостов для подключения, который становится `hosts` в конфиге на каждом сервере. При старте xySat подключается к *случайному хосту* из массива, определяет primary conductor и переподключается к нему. Если кластер изменяется, новый `hosts` массив автоматически распространяется на все сервера текущим primary.

В некоторых случаях нужно подключать xySat к конкретному conductor, а не к списку. Например, серверы могут находиться "снаружи" и должны подключаться через прокси или в сложной сетевой топологии. В таком случае можно заменить массив `hosts` статическим значением.

Для этого добавьте свойство `host` в конфиг xySat как верхнеуровневое JSON поле на каждом сервере. Файл конфигурации xySat находится здесь:

```
/opt/xyops/satellite/config.json
```

Не добавляйте `host` в объект [satellite.config](config.md#satellite-config) на conductor, если не хотите, чтобы **все** серверы подключались к одному статическому host.

Когда в конфиге есть и `hosts`, и `host`, приоритет у `host`.

## Прокси-серверы

Чтобы отправлять все исходящие запросы через прокси (например, web hooks), просто задайте одну или несколько стандартных переменных окружения:

```
HTTPS_PROXY
HTTP_PROXY
ALL_PROXY
NO_PROXY
```

xyOps обнаружит эти переменные и автоматически настроит прокси для всех исходящих запросов. Имена переменных могут быть в верхнем или нижнем регистре. Формат прокси - полностью квалифицированный URL с портом. Чтобы задать один прокси для HTTP и HTTPS, проще всего использовать `ALL_PROXY` (обычно обычный HTTP URL с портом). Пример:

```
ALL_PROXY=http://company-proxy-server.com:8080
```

Используйте `NO_PROXY` для списка доменов, которые должны обходить прокси. Пример:

```
NO_PROXY=direct.example.com
```

Обратите внимание: для проксирования HTTPS (SSL) запросов, если ваши машины не доверяют локальному SSL сертификату прокси, вам нужно включить опцию "SSL Cert Bypass" в web hooks.

Поддерживаемые типы прокси:

| Protocol | Example |
|----------|---------|
| `http` | `http://proxy-server-over-tcp.com:3128` |
| `https` | `https://proxy-server-over-tls.com:3129` |
| `socks` | `socks://username:password@some-socks-proxy.com:9050` |
| `socks5` | `socks5://username:password@some-socks-proxy.com:9050` |
| `socks4` | `socks4://some-socks-proxy.com:9050` |
| `pac-*` | `pac+http://www.example.com/proxy.pac` |

Убедитесь, что переменные окружения заданы на всех серверах, чтобы, например, [HTTP Request Plugin](plugins.md#http-request-plugin) также использовал прокси.

<a id="air-gapped-mode"></a>
## Режим Air-Gapped

xyOps поддерживает air-gapped установки, которые предотвращают несанкционированные исходящие подключения за пределы заданных IP диапазонов. Вы можете настроить список разрешенных и/или запрещенных диапазонов. Обычно разрешают локальные запросы внутри LAN, чтобы серверы могли общаться в своей инфраструктуре.

Для настройки используйте раздел [airgap](config.md#airgap) в основном конфиге. Пример:

```json
"airgap": {
	"enabled": false,
	"outbound_whitelist": ["127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "::1/128", "fd00::/8", "169.254.0.0/16", "fe80::/10"],
	"outbound_blacklist": []
}
```

Установите `enabled` в `true`, чтобы включить режим, и задайте `outbound_whitelist` и/или `outbound_blacklist` как IP адреса или [CIDR blocks](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing). В whitelist по умолчанию входят все частные диапазоны.

Правила air-gapped применяются как к xyOps, так и автоматически распространяются на все worker-серверы, чтобы управлять, например, [HTTP Plugin](plugins.md#http-request-plugin). Однако **они не ограничивают** ваш собственный код плагинов, ваши shell скрипты и marketplace плагины.

Для безопасных апгрейдов в air-gapped режиме свяжитесь с [xyOps Support](mailto:support@pixlcore.com). В рамках enterprise мы можем предоставить подписанные и зашифрованные пакеты с инструкциями.

Вся документация xyOps доступна офлайн внутри приложения.

<a id="air-gapped-satellite-installs"></a>
### Air-Gapped установки Satellite

xyOps поддерживает полностью air-gapped установку и обновления серверов. Вот как это работает:

1. В рамках [enterprise plan](https://xyops.io/pricing) запросите подписанный пакет xySat у нас.
2. В вашем xyOps создайте [Storage Bucket](buckets.md) и запомните Bucket ID.
3. Загрузите полученные файлы в bucket. Имена файлов будут в формате: `satellite-OS-ARCH.tar.gz`.
4. Отредактируйте конфиг conductor и задайте свойство `satellite.bucket` как Bucket ID.
5. Установите или обновите серверы как обычно.
6. xyOps будет использовать пакеты установки xySat из bucket и не будет обращаться в интернет.

Для Docker контейнеров убедитесь, что ваши локальные образы уже сохранены, чтобы их не приходилось тянуть из репозитория. Наши официальные контейнеры доступны здесь:

- **xyOps**: https://github.com/pixlcore/xyops/pkgs/container/xyops
- **xySat**: https://github.com/pixlcore/xysat/pkgs/container/xysat

<a id="secret-key-rotation"></a>
## Ротация секретного ключа

xyOps использует единый секретный ключ на каждом conductor. Он шифрует сохраненные секреты, подписывает временные UI токены и выдает токены аутентификации для worker-серверов (xySat). Ротация ключа полностью автоматизирована и запускается из UI.

### Обзор

- **Безопасная генерация**: новый криптографически стойкий ключ генерируется на primary conductor и никогда не передается в открытом виде.
- **Оркестрированная ротация**: планировщик ставится на паузу, очередь очищается, активные задачи прерываются перед продолжением.
- **Бесшовное пере-шифрование**: все сохраненные секреты пере-шифровываются новым ключом.
- **Пере-аутентификация**: все подключенные xySat серверы пере-аутентифицируются и получают новые auth токены автоматически.
- **Распределение между peers**: новый ключ распределяется всем backup conductors, зашифрованный предыдущим ключом.
- **Сохранение конфигурации**: новый ключ записывается в `/opt/xyops/conf/overrides.json`. Базовый `config.json` намеренно не изменяется (часто монтируется read-only в Docker).
- **Не влияет**: существующие пользовательские сессии и API ключи остаются действительными.

### Проверки перед запуском

Перед началом убедитесь, что все conductors и worker-серверы онлайн и здоровы:

- Убедитесь, что каждый conductor доступен и участвует в кластере.
- Убедитесь, что все worker-серверы отображаются online в списке Servers.

Если узел был offline во время ротации, он не получит обновления автоматически. См. [Offline Recovery](#offline-recovery) ниже.

### Процесс ротации

1. Нажмите "System" в Admin секции боковой панели и запустите Key Rotation.
2. Система ставит планировщик на паузу, очищает очередь и прерывает активные задачи.
3. Генерируется новый ключ и используется для перешифрования всех секретов.
4. Подключенные worker-серверы получают новые auth токены.
5. Новый ключ безопасно распределяется на все conductor peers.
6. Ключ сохраняется в `/opt/xyops/conf/overrides.json` на каждом conductor.
7. Планировщик остается на паузе, пока вы его не возобновите (клик по значку "Paused" в шапке).

Когда все узлы online, ручные правки и перезапуски не требуются.

### Восстановление offline узлов

Если сервер или conductor был offline во время ротации, потребуется ручное восстановление.

#### Пере-аутентификация offline worker-сервера

Если worker не получил ротацию, можно восстановить его, вычислив новый auth токен вручную.

Что нужно:

- Текущий секретный ключ с primary conductor. Он доступен только на диске через SSH: `/opt/xyops/conf/overrides.json` (`secret_key`). Через API его получить нельзя.
- Алфавитно-цифровой ID offline сервера (например, `smf4j79snhe`). Его можно найти в UI на странице истории сервера или на самом сервере в `/opt/xyops/satellite/config.json`.

Вычислите SHA-256 от конкатенации: `SERVER_ID + SECRET_KEY`, и используйте hex digest как новый auth токен. Пример:

```sh
## OpenSSL
printf "%s" "SERVER_IDSECRET_KEY" | openssl dgst -sha256 -r | awk '{print $1}'
```

Затем отредактируйте конфиг satellite на worker:

```
/opt/xyops/satellite/config.json
```

Установите `auth_token` в вычисленную SHA-256 строку. Сохраните файл - satellite автоматически перечитает его и попробует переподключиться в течение ~30 секунд. Проверяйте логи satellite для диагностики.

#### Обновление offline conductor

Если conductor был offline во время ротации, подключитесь по SSH и обновите ключ вручную:

1) Откройте `/opt/xyops/conf/overrides.json` на offline conductor.
2) Установите `secret_key` в новое значение с primary conductor. Если поля `secret_key` нет (например, первая ротация), добавьте его.
3) Сохраните файл и при необходимости перезапустите conductor.

После обновления conductor вернется в кластер с корректным ключом.

### Лучшие практики

- Планируйте ротацию в окно обслуживания, чтобы допустить прерывание задач.
- Перед ротацией проверяйте здоровье узлов, чтобы избежать ручного восстановления.
- Храните текущий ключ в безопасности и ограничьте SSH доступ к conductors.
- Проводите ротацию регулярно как часть программы безопасности (см. [Security Checklist](scaling.md#security-checklist)).
