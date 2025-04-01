const { Telegraf, Markup } = require('telegraf');
const { Client } = require('pg');
require('dotenv').config();
const allowedUsers = [1615644899, 1974611991, 482233894, 5590809125];
const BOT_TOKEN = process.env.TG_TOKEN;
const bot = new Telegraf(BOT_TOKEN);


const isUserAllowed = (ctx) => {
  if (!allowedUsers.includes(ctx.from.id)) {
    ctx.reply('❌ У вас нет прав для выполнения этой команды.');
    return false;
  }
  return true;
};
 

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
const validateEmail = (email) => {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
};
const userState = new Map();
bot.telegram.setMyCommands([
 
  { command: 'start', description: '👋 Начать' },
  { command: '/help', description: '❓ Помощь' },
  { command: '/website', description: '🌐 Наш веб-сайт' },
  { command: '/channel', description: '📱 Наш Telegram-канал' },
  { command: '/email', description: '✉ Написать на почту' },
  { command: '/team', description: '👥 Наша команда' },
  { command: '/request', description: '📄 Оставить заявку' },  // Add this line
]);
bot.start((ctx) => {
  if (!isUserAllowed(ctx)) return;
  ctx.reply('🎉 Добро пожаловать! 👋\n\n' +
    'Готовы к действию? Выберите, что вас интересует, и я помогу вам!\n\n' +
    '👇 Нажмите кнопку ниже, чтобы открыть меню.',
Markup.inlineKeyboard([
[Markup.button.callback('☰ Открыть меню', 'open_menu')]
])
);
});
bot.command('request', async (ctx) => {


  userState.set(ctx.from.id, { step: 'name' });
  ctx.reply('👤 Оставьте заявку:\n\nПожалуйста, введите ваше имя:');
});
bot.command('email', async (ctx) => {
  await ctx.reply('Если у вас есть вопросы, пишите на почту: hello@itperfomance.ru');
});
bot.command('team', async (ctx) => {
  const res = await dbClient.query('SELECT * FROM cases');
  const cases = res.rows;
  
  
  await ctx.reply(
    `👥 *Наша команда:*\n\n` +
    `🔹 *Альберт* — Основатель компании\n` +
    `🔹 *Давид* — Фронтенд-разработчик\n` +
    `🔹 *Максим* — Линукс, Python\n` +
    `🔹 *Данил* — Веб-дизайнер, Figma\n`+
       `📊 *Количество сделанных проектов*: ${cases.length}`
  );
});
bot.command('channel', async (ctx) => {
  await ctx.reply('🚀 Перейдите в наш Telegram-канал: [кликай](https://t.me/itperfomanceru)', {
    parse_mode: 'Markdown'
  });
});
bot.command('website', async (ctx) => {
  await ctx.reply(
    'Перейдите на наш веб-сайт:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🌐 Наш веб-сайт',
              url: 'https://itperfomance.ru'  // Замените на свой реальный URL
            }
          ]
        ]
      }
    }
  );
});

bot.action('open_menu', (ctx) => {
  if (!isUserAllowed(ctx)) return;
  ctx.editMessageText(
    'Меню действий:',
    Markup.inlineKeyboard([
      [Markup.button.callback('📦 Получить все кейсы', 'get_cases')],
      [Markup.button.callback('➕ Новый кейс', 'new_case')],

     
    ])
  );
  ctx.answerCbQuery();  // Немедленный ответ
});

bot.on('text', async (ctx) => {
  const user = userState.get(ctx.from.id);
  if (!user) return;

  if (user.step === 'name') {
    user.name = ctx.message.text;
    user.step = 'position';
    ctx.reply('Введите вашу должность:');
  } else if (user.step === 'position') {
    user.position = ctx.message.text;
    user.step = 'phone';
    ctx.reply('Введите ваш номер телефона:');
  } else if (user.step === 'phone') {
    user.phone = ctx.message.text;
    user.step = 'email';
    ctx.reply('Введите ваш email:');
  } else if (user.step === 'email') {
    const email = ctx.message.text;
    if (validateEmail(email)) {
      user.email = email;
      user.step = 'finish';
      ctx.reply('✅ Ваша заявка успешно отправлена!');
      
      // Отправляем данные в API
      const data = {
        name: user.name,
        position: user.position,
        phone: user.phone,
        email: user.email,
      };

      try {
        await fetch('https://itperfomance.ru/api/sheets/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        console.log('✅ Ваша заявка успешно отправлена!');
      } catch (err) {
        console.error('Ошибка при отправке заявки:', err);
        ctx.reply('❌ Ошибка при отправке заявки.');
      }

      userState.delete(ctx.from.id);
    } else {
      ctx.reply('❌ Неверный формат email. Пожалуйста, введите корректный email (например, example@mail.com).');
    }
  }
});
bot.command('help', async (ctx) => {  
  if (!isUserAllowed(ctx)) return;  

  await ctx.reply(
    `📌 *Команды бота:*\n` +
    `🔹 /start — Начать работу\n` +
    `🔹 /help — Открыть справку\n\n` +
    `🎛 *Меню действий:*\n` +
    `✅ Получить все кейсы\n` +
    `➕ Новый кейс\n` +

    `👮‍♂ *Доступ:*\n` +
    `Некоторые команды доступны не всем пользователям.\n\n` +
    `✉ *Обратная связь:* Если есть вопросы, пиши администратору! 🚀`,
    { parse_mode: 'Markdown' }
  );  

});

// Обработка запроса на получение всех кейсов
bot.action('get_cases', async (ctx) => {
  if (!isUserAllowed(ctx)) return;
  
  try {
    const res = await dbClient.query('SELECT * FROM cases');
    const cases = res.rows;

    if (cases.length > 0) {
      for (const caseItem of cases) {
        ctx.reply(
          `🆔 ID: ${caseItem.id}\n📌 Название: ${caseItem.title}\n📅 Дата: ${caseItem.date}`,
          Markup.inlineKeyboard([
            [Markup.button.callback('❌ Удалить', `delete_case_${caseItem.id}`)]
          ])
        );
      }
    } else {
      ctx.reply('⚠️ Нет доступных кейсов.');
    }
  } catch (err) {
    console.error('Ошибка при получении кейсов:', err);
    ctx.reply('❌ Произошла ошибка при получении кейсов.');
  }

  ctx.answerCbQuery();
});


bot.action('new_case', (ctx) => {
  if (!isUserAllowed(ctx)) return;
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
    ctx.reply('Введите дату:');
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
bot.action(/^delete_case_(\d+)$/, async (ctx) => {
  if (!isUserAllowed(ctx)) return;

  const caseId = ctx.match[1]; // Получаем ID кейса из callback data

  try {
    // Удаляем связанные данные (если есть таблицы info и sliderImg)
    await dbClient.query('DELETE FROM info WHERE case_id = $1', [caseId]);
    await dbClient.query('DELETE FROM sliderImg WHERE case_id = $1', [caseId]);
    
    // Удаляем сам кейс
    await dbClient.query('DELETE FROM cases WHERE id = $1', [caseId]);

    ctx.reply(`✅ Кейс с ID ${caseId} успешно удалён.`);
  } catch (err) {
    console.error('Ошибка при удалении кейса:', err);
    ctx.reply('❌ Ошибка при удалении кейса.');
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