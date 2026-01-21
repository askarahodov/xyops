# Разработка

## Обзор

xyOps работает как компонент в фреймворке [pixl-server](https://github.com/jhuckaby/pixl-server). Настоятельно рекомендуется изучить этот модуль и его компонентную систему перед работой с xyOps. Также используются следующие серверные компоненты:

| Module Name | Description | License |
|-------------|-------------|---------|
| [pixl-server-api](https://github.com/jhuckaby/pixl-server-api) | Компонент REST API для фреймворка pixl-server. | MIT |
| [pixl-server-debug](https://github.com/jhuckaby/pixl-server-debug) | Удобная отладка pixl-server приложения через Chrome Dev Tools. | MIT |
| [pixl-server-storage](https://github.com/jhuckaby/pixl-server-storage) | Компонент key/value/list хранилища для pixl-server. | MIT |
| [pixl-server-user](https://github.com/jhuckaby/pixl-server-user) | Базовая система логина пользователей для pixl-server. | MIT |
| [pixl-server-web](https://github.com/jhuckaby/pixl-server-web) | Компонент веб-сервера для pixl-server. | MIT |
| [pixl-server-unbase](https://github.com/jhuckaby/pixl-server-unbase) | Компонент базы данных для pixl-server. | MIT |

Дополнительно xyOps использует следующие серверные утилиты PixlCore:

| Module Name | Description | License |
|-------------|-------------|---------|
| [pixl-acl](https://github.com/jhuckaby/pixl-acl) | Простая и быстрая реализация ACL фильтрации IPv4 и IPv6. | MIT |
| [pixl-args](https://github.com/jhuckaby/pixl-args) | Простой модуль для разбора аргументов командной строки. | MIT |
| [pixl-boot](https://github.com/jhuckaby/pixl-boot) | Регистрация сервиса для автозапуска (Linux / macOS). | MIT |
| [pixl-chart](https://github.com/jhuckaby/pixl-chart) | Простой рендерер time series графиков на HTML5 Canvas. | MIT |
| [pixl-class-util](https://github.com/pixlcore/class-util) | Вспомогательные функции для расширения классов миксинами и др. | MIT |
| [pixl-cli](https://github.com/jhuckaby/pixl-cli) | Инструменты для построения CLI приложений на Node.js. | MIT |
| [pixl-config](https://github.com/jhuckaby/pixl-config) | Простой загрузчик JSON конфигурации. | MIT |
| [pixl-json-stream](https://github.com/jhuckaby/pixl-json-stream) | API для отправки/получения JSON записей поверх стандартных потоков (pipes или sockets). | MIT |
| [pixl-logger](https://github.com/jhuckaby/pixl-logger) | Логгер, формирующий колонки в bracket-delimited формате. | MIT |
| [pixl-mail](https://github.com/jhuckaby/pixl-mail) | Простой класс для отправки email через SMTP. | MIT |
| [pixl-perf](https://github.com/jhuckaby/pixl-perf) | Высокоточная система трекинга производительности. | MIT |
| [pixl-request](https://github.com/jhuckaby/pixl-request) | Простой модуль для HTTP запросов. | MIT |
| [pixl-tools](https://github.com/jhuckaby/pixl-tools) | Набор вспомогательных утилит для Node.js. | MIT |
| [pixl-unit](https://github.com/jhuckaby/pixl-unit) | Очень простой unit test runner для Node.js. | MIT |

Для клиентской части веб-приложение xyOps построено на фреймворке [pixl-xyapp](https://github.com/pixlcore/pixl-xyapp) HTML5/CSS/JavaScript:

| Module Name | Description | License |
|-------------|-------------|---------|
| [pixl-xyapp](https://github.com/pixlcore/pixl-xyapp) | Клиентский JavaScript фреймворк, предназначенный как основа для веб-приложений. | MIT |

## Установка dev tools

xyOps содержит некоторые бинарные зависимости (в частности [sqlite3](https://npmjs.com/package/sqlite3)), поэтому если предсобранный бинарник не найден для вашей архитектуры, может потребоваться сборка из исходников. Для этого может понадобиться:

Для Debian (Ubuntu):

```sh
apt-get install build-essential python3-setuptools
```

Для RedHat (Fedora / CentOS):

```sh
yum install gcc-c++ make
```

Для macOS загрузите [Apple Xcode](https://developer.apple.com/xcode/download/), затем установите [command-line tools](https://developer.apple.com/downloads/).

## Ручная установка

Вот как скачать последнюю dev сборку xyOps и установить вручную (может содержать баги):

```sh
git clone https://github.com/pixlcore/xyops.git
cd xyops
npm install
node bin/build.js dev
```

Передача `dev` в build скрипт означает, что все JS и CSS останутся не обфусцированными (исходники будут отдаваться отдельными файлами).

Если вы планируете коммитить изменения и отправлять pull requests, настоятельно рекомендуется добавить следующий `.gitignore` в корень проекта:

```
.gitignore
/node_modules
/work
/logs
/data
/conf
/temp
htdocs/index.html
htdocs/test*
htdocs/js/external/*
htdocs/js/common
htdocs/fonts/*
htdocs/css/font*
htdocs/css/mat*
htdocs/css/base.css
htdocs/css/normalize.css
htdocs/css/atom*
htdocs/css/xterm*
htdocs/codemirror
sample_conf/masters.json
```

## Запуск в debug mode

Чтобы запустить xyOps в режиме отладки, выполните:

```
./bin/debug.sh
```

Сервис запустится без форка в демона и будет выводить весь debug лог в консоль. Это удобно для отладки серверных проблем. Учитывайте права файлов, если запускаете не от root. Чтобы завершить работу в этом режиме, нажмите Ctrl-C дважды.

Можно настроить, какие категории логов выводить, указав список через пробел одним аргументом CLI:

```sh
./bin/debug.sh "xyOps Transaction Error API Unbase Action Comm Job Workflow Maint Multi Scheduler SSO"
```

Это полезно, чтобы заглушить очень шумные компоненты, такие как `Storage` и `WebServer`.

## REPL

По умолчанию скрипт `debug.sh` запускает [REPL](https://nodejs.org/api/repl.html) в консоли, и вы можете выполнять JS прямо внутри процесса xyOps. Доступны следующие глобалы:

| Global | Description |
|--------|-------------|
| `server` | Текущий глобальный инстанс [pixl-server](https://github.com/jhuckaby/pixl-server). |
| `cli` | Глобальный [pixl-cli](https://github.com/jhuckaby/pixl-cli), содержащий набор утилит. |
| `xyOps` | Главный компонент сервера xyOps. Также доступен как `xy`. |
| `Storage` | Компонент сервера [pixl-server-storage](https://github.com/jhuckaby/pixl-server-storage). |
| `Unbase` | Компонент сервера [pixl-server-unbase](https://github.com/jhuckaby/pixl-server-unbase). |
| `WebServer` | Компонент сервера [pixl-server-web](https://github.com/jhuckaby/pixl-server-web). |
| `API` | Компонент сервера [pixl-server-api](https://github.com/jhuckaby/pixl-server-api). |
| `User` | Компонент сервера [pixl-server-user](https://github.com/jhuckaby/pixl-server-user). |
| `Debug` | Компонент сервера [pixl-server-debug](https://github.com/jhuckaby/pixl-server-debug). |

Также доступны REPL команды (используйте точку перед командой):

| Command | Description |
|---------|-------------|
| `.echo` | Добавить или удалить категории, например `.echo add Storage WebServer`. |
| `.notify` | Отправить уведомление всем пользователям, например `.notify HI THERE`. Включает случайный sound effect. |

## Запуск unit тестов

В xyOps есть полный набор unit тестов, запускаемых через [pixl-unit](https://github.com/jhuckaby/pixl-unit) (обычно устанавливается автоматически). Чтобы запустить тесты, убедитесь, что xyOps не запущен, и выполните:

```
npm test
```

Если какие-то тесты упали, пожалуйста, создайте [GitHub Issue](https://github.com/pixlcore/xyops/issues) и приложите логи тестов из `./test/logs/`.

## Self-Signed сертификаты

Вот как создать самоподписанный TLS сертификат для локальной разработки. Сначала создайте временный конфиг (`san.cnf`):

```
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
```

Затем выполните команду:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout tls.key -out tls.crt -days 365 -config san.cnf
```

Далее следуйте инструкции для вашей платформы.

### Windows: доверие сертификату

1. Нажмите Windows + R, введите `certmgr.msc` и нажмите Enter.
2. В левой панели раскройте: **Trusted Root Certification Authorities** -> **Certificates**.
3. Кликните правой кнопкой **Certificates**, затем **All Tasks** -> **Import...**.
4. Выберите файл `tls.crt`.
5. Выберите "Place all certificates in the following store" -> **Trusted Root Certification Authorities**.
6. Завершите мастер и подтвердите запросы безопасности.

### macOS: доверие сертификату

1. Откройте **Keychain Access**.
2. В левой панели выберите **System** в разделе **Keychains**.
3. Выберите **Certificates** в разделе **Category**.
4. В верхнем меню выберите **File** -> **Import Items...**.
5. Выберите `tls.crt` и подтвердите импорт в System keychain.
6. Введите пароль macOS для подтверждения.
7. Дважды кликните по сертификату.
8. В окне разверните раздел **Trust**.
9. Установите "When using this certificate" в **Always Trust**.
10. Закройте окно и снова введите пароль, если потребуется.

### Linux: доверие сертификату

**Debian/Ubuntu:**

1. `sudo cp tls.crt /usr/local/share/ca-certificates/xyops.crt`
2. `sudo update-ca-certificates`

**RedHat/CentOS/Fedora:**

1. `sudo cp tls.crt /etc/pki/ca-trust/source/anchors/xyops.crt`
2. `sudo update-ca-trust extract`

**Примечание:** Это не влияет на Firefox, если он использует собственное хранилище CA (по умолчанию так и есть).

### Перенос в xyOps

Переместите файлы сертификатов в следующий каталог, чтобы xyOps мог их использовать:

```sh
mv tls.crt /opt/xyops/conf/
mv tls.key /opt/xyops/conf/
```

Теперь можно удалить файл `san.cnf` — он нужен только на время создания сертификата.
