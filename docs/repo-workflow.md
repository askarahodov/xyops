# Рабочий процесс репозитория

Этот документ описывает стандартный рабочий процесс для работы в этом репозитории.

## Ветвление

- main: только стабильные релизы (защищена)
- develop: интеграционная ветка для текущей работы
- feat/*: новые функции
- fix/*: исправления ошибок
- chore/*: обслуживание и инструменты
- hotfix/*: срочные исправления, ветвятся от main

## Коммиты и релизы

- Один логический change на коммит.
- Используйте короткие, информативные сообщения коммитов.
- Теги релизов — `vX.Y.Z`.

## Pull Requests и ревью

- Все изменения проходят через PR.
- Добавляйте краткое описание и чек-лист:

   - Тесты запущены (или объясните, почему нет)
   - Изменения конфигурации задокументированы
   - Миграции или изменения данных отмечены

- Требуется минимум 1 ревьюер.
- Прямые пуши в main запрещены.

## Ожидания от CI

- Линтер, тесты и сборка запускаются на каждом PR.
- Блокирующие проверки должны быть зелеными до слияния.
- Теги релизов формируют артефакты сборки.

## Конфиги и секреты

- Храните шаблоны конфигурации в `sample_conf/`.
- Не храните секреты в репозитории (используйте переменные окружения или хранилище секретов).

## Документация

- README: только быстрый старт.
- Подробная документация находится в `docs/`.
- Обновляйте `CHANGELOG.md` для изменений, видимых пользователю.

## AI Agent & Code Quality

При разработке новых функций обязательно:

### Используйте документацию для AI agents
- Прочитайте [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) перед началом
- Используйте шаблоны из [`docs/QUICK_REFERENCE_AI.md`](QUICK_REFERENCE_AI.md):
  - Для API endpoints: используйте **API Endpoint Checklist**
  - Для workflow nodes: используйте **Workflow Node Checklist**
  - Для storage запросов: используйте **Storage Query Checklist**

### Critical issues, которые нужно избежать
Изучите [`docs/AI_AGENT_ANALYSIS.md`](AI_AGENT_ANALYSIS.md) особенно:
- Job State Duality (activeJobs vs jobDetails)
- Workflow State Hierarchy (3 nested levels)
- Server Selection TOCTOU (race condition)
- Common mistakes checklist

### Pre-commit validation
Перед `git commit`, используйте checklist:
```
☐ Job state пишется в jobDetails, не activeJobs
☐ loadSession() есть в каждом API endpoint
☐ Нет fs.readFileSync() в plugins
☐ Storage keys нормализованы (normalizeKey)
☐ JEXL expressions имеют safe property access
☐ Tests проходят (npm test)
☐ CHANGELOG.md обновлён
```

Полный checklist в [`docs/QUICK_REFERENCE_AI.md#before-committing-code`](QUICK_REFERENCE_AI.md#before-committing-code)

### Для code reviewers
Проверяйте PR по этому списку:
- ✅ Job state separation правильный (jobDetails vs activeJobs)
- ✅ Storage keys нормализованы
- ✅ Нет blocking I/O
- ✅ loadSession() используется в API
- ✅ Tests добавлены
- ✅ CHANGELOG обновлён
