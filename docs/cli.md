# Командная строка

## Обзор

Все доступные сервисы xyOps в командной строке. Большинство вызываются через следующий shell-скрипт:

```
/opt/xyops/bin/control.sh [COMMAND]
```

Список команд:

| Command | Description |
|---------|-------------|
| `start` | Запускает xyOps в режиме демона. См. [Starting and Stopping](CommandLine.md#starting-and-stopping). |
| `stop` | Останавливает демона xyOps и ждет завершения. См. [Starting and Stopping](CommandLine.md#starting-and-stopping). |
| `restart` | Выполняет `stop`, затем `start`. См. [Starting and Stopping](CommandLine.md#starting-and-stopping). |
| `status` | Проверяет, запущен ли xyOps. См. [Starting and Stopping](CommandLine.md#starting-and-stopping). |
| `admin` | Создает аварийный admin аккаунт (укажите user/pass). См. [Recover Admin Access](CommandLine.md#recover-admin-access). |
| `grant` | Вручную выдать привилегию пользователю: `bin/control.sh grant USERNAME PRIVILEGE_ID`. |
| `revoke` | Вручную отозвать привилегию у пользователя: `bin/control.sh revoke USERNAME PRIVILEGE_ID`. |
| `upgrade` | Обновляет xyOps до последней стабильной версии (или указать версию). См. [Upgrading xyOps](CommandLine.md#upgrading-xyops). |
| `version` | Выводит текущую версию пакета xyOps и завершает работу. |
| `help` | Показывает список доступных команд и завершает работу. |

## Запуск и остановка

Чтобы запустить сервис, используйте `start`:

```
/opt/xyops/bin/control.sh start
```

Чтобы остановить, используйте `stop`:

```
/opt/xyops/bin/control.sh stop
```

Быстрый stop + start через `restart`:

```
/opt/xyops/bin/control.sh restart
```

Команда `status` покажет, запущен ли сервис:

```
/opt/xyops/bin/control.sh status
```

## Восстановление админ-доступа

Потеряли доступ к admin аккаунту? Можно создать временного администратора в командной строке. Выполните команду на primary сервере:

```
/opt/xyops/bin/control.sh admin USERNAME PASSWORD
```

Замените `USERNAME` на нужный логин, а `PASSWORD` на пароль нового аккаунта. Новый пользователь не появится в основном списке пользователей в UI, но вы сможете войти с этими учетными данными. Это аварийная операция для восстановления доступа. *Это не лучший способ создавать постоянных пользователей*. После входа лучше создать полноценный аккаунт через UI и удалить аварийного администратора.

Этот трюк **не работает** с [SSO](sso.md). Он применим только для установок с встроенной системой управления пользователями.

## Автозапуск сервера

Чтобы зарегистрировать xyOps как сервис автозапуска (старт при перезагрузке), выполните:

```sh
cd /opt/xyops
npm run boot
```

Используется модуль [pixl-boot](https://github.com/jhuckaby/pixl-boot), который поддерживает [Systemd](https://en.wikipedia.org/wiki/Systemd) при наличии, иначе [Sysv Init](https://en.wikipedia.org/wiki/Init#SysV-style) или [launchd](https://support.apple.com/guide/terminal/script-management-with-launchd-apdc6c1077b-5d5d-4d35-9c19-60f2397b2369/mac) на macOS.

Если передумали или хотите удалить xyOps, можно снять автозапуск так:

```sh
cd /opt/xyops
npm run unboot
```

**Важно:** При старте xyOps вместе с системой часто нет полного окружения пользователя, в частности переменной `PATH`. Если ваши скрипты зависят от бинарников в нестандартных местах, вам нужно восстановить `PATH` и другие переменные внутри скриптов, повторно их задав.

## Обновление xyOps

Для обновления используйте команду `upgrade`:

```
/opt/xyops/bin/control.sh upgrade
```

Она обновит приложение и зависимости до последней стабильной версии (если доступна). Данные, пользователи и конфигурация не затрагиваются — они сохраняются и импортируются в новую версию. В кластерах повторите команду на каждом сервере.

Можно указать конкретную версию для обновления (или отката):

```
/opt/xyops/bin/control.sh upgrade 1.0.4
```

Если обновиться до `HEAD`, будет взята самая свежая версия из GitHub. Это предназначено для разработчиков и бета-тестеров и может содержать баги. Используйте на свой риск:

```
/opt/xyops/bin/control.sh upgrade HEAD
```

## Database CLI

xyOps поставляется с простой DB CLI, где можно выполнять raw команды. Ответы всегда в JSON. Это в основном для отладки. Команда находится здесь:

```
/opt/xyops/bin/db-cli.js COMMAND INDEX ARG1, ARG2, ...
```

Поиск в конкретной базе:

```sh
/opt/xyops/bin/db-cli.js search tickets "status:open"
```

Получение одной записи:

```sh
/opt/xyops/bin/db-cli.js get alerts "amg6sl6z0cc"
```

Это низкоуровневый инструмент, требует продвинутых знаний о БД xyOps. Подробнее:

- Файл `/opt/xyops/internal/unbase.json`, где описаны таблицы БД xyOps.
- Система [Unbase](https://github.com/jhuckaby/pixl-server-unbase), на которой построен xyOps.
- Документация по синтаксису запросов [query syntax](https://github.com/jhuckaby/pixl-server-storage/blob/master/docs/Indexer.md#simple-queries).
