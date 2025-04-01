const { Telegraf, Markup } = require('telegraf');
const { Client } = require('pg');
require('dotenv').config();

const BOT_TOKEN = process.env.TG_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const dbClient = new Client({
  connectionString: "postgresql://david:5o7AIPBP4WU2AfaRyAzqY1xTubmsjyR4@dpg-cvlnm6idbo4c7385v990-a.oregon-postgres.render.com/case_31na",
  ssl: { rejectUnauthorized: false },
});

const connectToDatabase = async () => {
  try {
    await dbClient.connect();
    console.log('Подключение к базе данных установлено!');
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err);
    setTimeout(connectToDatabase, 5000);
  }
};
connectToDatabase();

const userState = new Map();

bot.start((ctx) => {
  ctx.reply('Добро пожаловать! Сразу выберите действие:', Markup.inlineKeyboard([
    [Markup.button.callback('☰ Меню', 'open_menu')],
  ]));
});

bot.action('open_menu', (ctx) => {
  ctx.editMessageText(
    'Меню действий:',
    Markup.inlineKeyboard([
      [Markup.button.callback('📦 Получить все кейсы', 'get_cases')],
      [Markup.button.callback('➕ Новый кейс', 'new_case')],
      [Markup.button.callback('❌ Закрыть меню', 'close_menu')],
    ])
  );
  ctx.answerCbQuery();  // Немедленный ответ
});

// Обработка запроса на получение всех кейсов
bot.action('get_cases', async (ctx) => {
  try {
    const res = await dbClient.query('SELECT * FROM cases');
    const cases = res.rows;

    if (cases.length > 0) {
      let message = 'Вот все доступные кейсы:\n';
      cases.forEach((caseItem, index) => {
        message += `${index + 1}. ${caseItem.title} - ${caseItem.date}\n`;
      });
      ctx.reply(message);
    } else {
      ctx.reply('Нет доступных кейсов.');
    }
  } catch (err) {
    console.error('Ошибка при получении кейсов:', err);
    ctx.reply('Произошла ошибка при получении кейсов. Попробуйте снова позже.');
  }
  ctx.answerCbQuery();  // Ответ после выполнения действия
});

bot.action('new_case', (ctx) => {
  userState.set(ctx.from.id, { step: 'title' });
  ctx.reply('Введите название кейса (Title):');
  ctx.answerCbQuery();  // Ответ сразу
});

// Обработка текста и сбор данных для нового кейса
// Обработка текста и сбор данных для нового кейса
bot.on('text', async (ctx) => {
  const user = userState.get(ctx.from.id);
  if (!user) return;

  if (user.step === 'title') {
    user.title = ctx.message.text;
    user.step = 'date';
    ctx.reply('Введите дату (YYYY-MM-DD):');
  } else if (user.step === 'date') {
    user.date = ctx.message.text;
    user.step = 'case_type';
    ctx.reply('Введите тип кейса (например, "Создание сайтов", "Разработка ботов", "Веб-Дизайн", "Интеграция ИИ", "Мобильные приложения"):');
  } else if (user.step === 'case_type') {
    user.case_type = ctx.message.text;
    user.step = 'mainImg';
    ctx.reply('Отправьте URL главного изображения (mainImg):');
  } else if (user.step === 'mainImg') {
    user.mainImg = ctx.message.text;
    user.step = 'innerImg';
    ctx.reply('Отправьте URL внутреннего изображения (innerImg):');
  } else if (user.step === 'innerImg') {
    user.innerImg = ctx.message.text;
    user.step = 'info_title';
    ctx.reply('Введите заголовок информации (info title):');
  } else if (user.step === 'info_title') {
    if (!user.info) user.info = [];
    user.info.push({ title: ctx.message.text, description: '' });  
    user.step = 'info_description';
    ctx.reply('Введите описание информации (info description):');
  } else if (user.step === 'info_description') {
    user.info[user.info.length - 1].description = ctx.message.text;
    ctx.reply('Добавить ещё информацию?', Markup.inlineKeyboard([
      [Markup.button.callback('➕ Да', 'add_info')],
      [Markup.button.callback('➡️ Перейти к изображениям', 'next_slider')]
    ]));
    user.step = 'wait';
  } else if (user.step === 'sliderImg') {
    if (!user.sliderImg) user.sliderImg = [];
    user.sliderImg.push(ctx.message.text);
    ctx.reply('Добавить ещё изображение?', Markup.inlineKeyboard([
      [Markup.button.callback('➕ Да', 'add_slider')],
      [Markup.button.callback('✅ Завершить', 'finish_case')]
    ]));
    user.step = 'wait';
  }
});






bot.action('add_info', (ctx) => {
  const user = userState.get(ctx.from.id);


  // Ensure the `info` array exists
  if (!user.info) {
    user.info = [];  // Create the array if it doesn't exist
  }

   // Check what's inside before the update
  
  // Add the new object to the `info` array
  user.info.push({ title: null, description: null });

  // Update the user's step and prompt for input
  user.step = 'info_title';
  ctx.reply('Введите заголовок информации (info title):');
  
  // Acknowledge the callback query
  ctx.answerCbQuery();
});


bot.on('text', async (ctx) => {
  const user = userState.get(ctx.from.id);
  if (!user) return;

  if (user.step === 'info_title') {
    user.info[user.info.length - 1].title = ctx.message.text;  // Заполняем заголовок в последнем объекте
    user.step = 'info_description';
    ctx.reply('Введите описание информации (info description):');
  } else if (user.step === 'info_description') {
    user.info[user.info.length - 1].description = ctx.message.text;  // Заполняем описание в последнем объекте
    ctx.reply('Добавить ещё информацию?', Markup.inlineKeyboard([
      [Markup.button.callback('➕ Да', 'add_info')],
      [Markup.button.callback('➡️ Перейти к изображениям', 'next_slider')]
    ]));
    user.step = 'wait';
  }
});


bot.action('next_slider', (ctx) => {
  const user = userState.get(ctx.from.id);
  user.sliderImg = [];
  user.step = 'sliderImg';
  ctx.reply('Отправьте URL изображения для слайдера:');
  ctx.answerCbQuery();  // Немедленный ответ
});

bot.action('add_slider', (ctx) => {
  const user = userState.get(ctx.from.id);
  user.step = 'sliderImg';
  ctx.reply('Отправьте URL следующего изображения для слайдера:');
  ctx.answerCbQuery();  // Немедленный ответ
});

bot.action('finish_case', async (ctx) => {
  const user = userState.get(ctx.from.id);
  try {
    const caseRes = await dbClient.query(
      'INSERT INTO cases (title, date, mainImg, innerImg, case_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [user.title, user.date, user.mainImg, user.innerImg, user.case_type]
    );
    const caseId = caseRes.rows[0].id;

    // Проверяем, есть ли информация перед вставкой
    if (user.info && user.info.length > 0) {

      for (const info of user.info) {
        if (info.title && info.description) {  // Проверяем, что поля заполнены
          await dbClient.query(
            'INSERT INTO info (case_id, title, description) VALUES ($1, $2, $3)',
            [caseId, info.title, info.description]
          );
        }
      }
    }

    // Проверяем и вставляем изображения слайдера
    if (user.sliderImg && user.sliderImg.length > 0) {
    
      
      for (const img of user.sliderImg) {
        await dbClient.query(
          'INSERT INTO sliderImg (case_id, image_url) VALUES ($1, $2)',
          [caseId, img]
        );
      }
    }

    ctx.reply('✅ Кейс успешно сохранён!');
    userState.delete(ctx.from.id);
  } catch (err) {
    console.error('Ошибка при сохранении кейса:', err);
    ctx.reply('❌ Ошибка при сохранении кейса.');
  }
  ctx.answerCbQuery();
});



const DOMAIN = 'https://case-1.onrender.com'; 
const TOKEN = '8091735964:AAEzLzbMy07-NeBD88YQlwjpQnXHZ5opAMc'; 

bot.launch({
  webhook: {
    domain: DOMAIN,
    port:  3002, 
    hookPath: `/${TOKEN}`
  }
});


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));