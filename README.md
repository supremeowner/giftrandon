# Star Gifter — мини-приложение и Telegram-бот

Полноценная связка: веб-приложение (Vite + React) и Telegram-бот на aiogram, который открывает ваш домен по кнопке в `/start`.

## Требования

- Node.js 20+ (npm 10+). Для nvm добавлен файл `.nvmrc`, так что перед установкой можно выполнить `nvm use`.
- Python 3.10+ (для запуска Telegram-бота и проверки версии Node в скрипте `start.sh`).

## Настройка окружения

1. Скопируйте пример переменных окружения:
   ```sh
   cp .env.example .env
   ```
2. Заполните `.env`:
   - `BOT_TOKEN` — токен из @BotFather.
   - `WEB_APP_URL` — публичный домен/URL вашего мини-приложения, который будет открываться из бота.
   - (опционально) `MINI_APP_URL` — если нужно открыть другую ссылку.
   - (опционально) `MINI_APP_BUTTON` — текст кнопки в `/start`.
   - `TELEGRAM_APP_URL` — deep link запуска бота/mini app для fallback-экрана «Открыть в Telegram».
   - `NEWS_URL` — ссылка на канал/новости.
   - `SUPPORT_URL` — ссылка на поддержку.

## Полный запуск проекта (пошагово)

### 1) Предварительные требования
- Node.js 20+ (npm 10+). В репозитории есть `.nvmrc`, можно выполнить `nvm use`.
- Python 3.10+ (для бота).

### 2) Локальная разработка (frontend + bot)
```sh
# Установка зависимостей фронтенда
npm install

# Запуск Vite dev-сервера
npm run dev -- --host 0.0.0.0 --port 5173
```

Во втором терминале:
```sh
# Подготовка и запуск бота
python -m venv .venv
source .venv/bin/activate
pip install -r bot/requirements.txt
python bot/main.py
```

> Важно: для корректного открытия мини-приложения ботом укажите внешний HTTPS-URL в `WEB_APP_URL`.

### 3) Production/деплой
1. Убедитесь, что `.env` заполнен, и в `WEB_APP_URL` указан публичный HTTPS-домен.
2. Соберите фронтенд:
   ```sh
   npm ci
   npm run build
   ```
3. Раздайте `dist/` любым веб-сервером (пример конфигурации — `Caddyfile.prod.example`).
4. Запустите бота (в отдельном процессе или под supervision):
   ```sh
   ./start.sh
   ```
   Скрипт соберет фронтенд, подготовит виртуальное окружение и запустит бота в foreground.

### 4) Быстрый старт одной командой
```sh
./start.sh
```
Скрипт:
- проверит обязательные переменные окружения;
- соберет фронтенд в `dist/`;
- подготовит venv и установит зависимости бота;
- запустит Telegram-бота.

## Что где хранится

- `.env` — переменные бота и фронтенда (один общий env-файл).

## UI-библиотека

- Актуальный список используемых UI-компонентов и статус чистки: `docs/ui-components.md`.

## API endpoints

- Основной endpoint для создания инвойса: `GET /api/invoice?amount=<value>`.
- Telegram auth data передаётся через `X-Telegram-Init-Data`. При необходимости можно передать `init_data` в query.
- Последовательность flow и контракт payload описаны в `docs/payment-sequence-flow.md`.

## Стек

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- aiogram (бот)
