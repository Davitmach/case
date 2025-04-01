const { Telegraf, Markup } = require('telegraf');
const { Client } = require('pg'); // Подключаем PostgreSQL клиент
require('dotenv').config(); // Загружаем переменные окружения из .env файла

const BOT_TOKEN = process.env.TG_TOKEN; // Замените на свой токен
const bot = new Telegraf(BOT_TOKEN);

// Создаем подключение к базе данных PostgreSQL
const dbClient = new Client({
  connectionString: 'postgresql://david:5o7AIPBP4WU2AfaRyAzqY1xTubmsjyR4@dpg-cvlnm6idbo4c7385v990-a.oregon-postgres.render.com/case_31na',
  ssl: {
    rejectUnauthorized: false,  // Включаем SSL, но не проверяем сертификат (если это необходимо)
  },
});

// Функция для подключения к базе данных с повторными попытками
const connectToDatabase = async () => {
  try {
    await dbClient.connect();
    console.log('Подключение к базе данных установлено!');
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err);
    // Повторная попытка через 5 секунд
    setTimeout(connectToDatabase, 5000);
  }
};

// Подключаемся к базе данных
connectToDatabase();

bot.start((ctx) => {
  // Отправляем сообщение при запуске бота
  ctx.reply('Привет! Добро пожаловать в нашего бота.');
  ctx.reply(
    'Выберите действие:',
    Markup.inlineKeyboard([ 
      [Markup.button.callback('☰ Меню', 'open_menu')] // Кнопка для открытия меню
    ])
  );
});

bot.action('open_menu', (ctx) => {
  ctx.editMessageText(
    'Меню действий:',
    Markup.inlineKeyboard([
      [Markup.button.callback('📦 Получить все кейсы', 'get_cases')],
      [Markup.button.callback('➕ Новый кейс', 'new_case')],
      [Markup.button.callback('❌ Закрыть меню', 'close_menu')] // Кнопка для закрытия меню
    ])
  );
  ctx.answerCbQuery();
});

// Обработка запроса на получение всех кейсов из базы данных
bot.action('get_cases', async (ctx) => {
  try {
    // Выполняем запрос к базе данных
    const res = await dbClient.query('SELECT * FROM cases'); // Замените 'cases' на ваше название таблицы
    const cases = res.rows;

    if (cases.length > 0) {
      // Отправляем пользователю список всех кейсов
      let message = 'Вот все доступные кейсы:\n';
      cases.forEach((caseItem, index) => {
        message += `${index + 1}. ${caseItem.name} - ${caseItem.description}\n`; // Замените 'name' и 'description' на реальные поля вашей таблицы
      });
      ctx.reply(message);
    } else {
      ctx.reply('Нет доступных кейсов.');
    }
  } catch (err) {
    console.error('Ошибка при получении кейсов:', err);
    ctx.reply('Произошла ошибка при получении кейсов. Попробуйте снова позже.');
  }
  ctx.answerCbQuery();
});

bot.action('new_case', (ctx) => {
  ctx.reply('Создан новый кейс!');
  ctx.answerCbQuery();
});

bot.action('close_menu', (ctx) => {
  ctx.editMessageText('Меню закрыто.');
  ctx.answerCbQuery();
});

// Запуск бота с long polling
bot.launch().then(() => {
  console.log('✅ Бот запущен!');
}).catch(err => {
  console.error('Ошибка запуска бота:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
