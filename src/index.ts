import 'dotenv/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { QUESTIONS, CODES } from './content';
import { userStates, adminThreadMap } from './state';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID ? Number(process.env.ADMIN_GROUP_ID) : undefined;

// ----- Helpers -----
const PAGE_SIZE = 8;
type IKBtn = ReturnType<typeof Markup.button.callback>;

function buildPage(page: number) {
  const start = page * PAGE_SIZE;
  const slice = QUESTIONS.slice(start, start + PAGE_SIZE);

  const text = slice.map(q => `${q.key}. ${q.question}`).join('\n');

  const qButtons: IKBtn[] = slice.map(q => Markup.button.callback(q.key, `Q_${q.key}`));

  const nav: IKBtn[] = [];
  if (page > 0) nav.push(Markup.button.callback('◀️ Prev', `PG_${page - 1}`));
  if (start + PAGE_SIZE < QUESTIONS.length) nav.push(Markup.button.callback('Next ▶️', `PG_${page + 1}`));

  return { text, keyboard: Markup.inlineKeyboard([...qButtons, ...nav], { columns: 4 }) };
}

// ----- Debug (remove later) -----
bot.use(async (ctx: Context, next) => {
  console.log('Update:', ctx.updateType, 'chat:', ctx.chat?.id, ctx.chat?.type);
  return next();
});

bot.command('id', ctx => {
  ctx.reply(`Chat ID: ${ctx.chat.id}`);
  console.log('Chat ID:', ctx.chat.id, 'Type:', ctx.chat.type);
});

// ----- Commands & Actions -----
bot.start(ctx =>
  ctx.reply(
    'Welcome! Choose:\n• “View all questions”\n• Send a #CODE\n• Or talk to an admin.',
    Markup.inlineKeyboard([
      [Markup.button.callback('View questions', 'SHOW_QS')],
      [Markup.button.callback('Talk to admin', 'TALK_ADMIN')]
    ])
  )
);

bot.command('questions', ctx => {
  const p = buildPage(0);
  return ctx.reply(p.text, p.keyboard);
});

bot.action('SHOW_QS', ctx => {
  const p = buildPage(0);
  return ctx.editMessageText(p.text, p.keyboard);
});

bot.action(/PG_(\d+)/, ctx => {
  const page = parseInt(ctx.match[1], 10);
  const p = buildPage(page);
  return ctx.editMessageText(p.text, p.keyboard);
});

bot.action(/Q_(.+)/, ctx => {
  const key = ctx.match[1];
  const qa = QUESTIONS.find(q => q.key === key);
  return ctx.reply(qa?.answer ?? 'No answer found.');
});

// #CODE handler
bot.hears(/^#\w+/i, async ctx => {
  const code = ctx.message.text.trim().toUpperCase();
  const hit = CODES[code];
  if (!hit) return ctx.reply('❌ Unknown code.');
  await ctx.reply(hit.text);
  if (hit.image) await ctx.replyWithPhoto(hit.image);
});

// Talk to admin
bot.action('TALK_ADMIN', ctx => {
  userStates.set(ctx.from.id, 'talking_to_admin');
  return ctx.reply('You are now connected to an admin. Send your message:');
});

// User messages in admin-chat mode
bot.on('text', async ctx => {
  const state = userStates.get(ctx.from.id) ?? 'default';
  if (state !== 'talking_to_admin') return;

  if (!ADMIN_GROUP_ID) return ctx.reply('Admin chat not configured yet.');

  const fwd = await ctx.telegram.sendMessage(
    ADMIN_GROUP_ID,
    `From ${ctx.from.username || ctx.from.first_name} (${ctx.from.id}):\n${ctx.message.text}`
  );
  adminThreadMap.set(fwd.message_id, ctx.from.id);
  await ctx.reply('📨 Sent to admin. We will reply soon.');
});

// Admin replies back (reply to forwarded message)
bot.on('message', async ctx => {
  if (!ADMIN_GROUP_ID || ctx.chat.id !== ADMIN_GROUP_ID) return;

  const replyTo = (ctx.message as any).reply_to_message;
  if (!replyTo) return;

  const userId = adminThreadMap.get(replyTo.message_id);
  if (!userId) return;

  if ('text' in ctx.message) {
    await ctx.telegram.sendMessage(userId, ctx.message.text);
  }
});

// ----- Launch (polling) -----
(async () => {
  await bot.telegram.deleteWebhook(); // ensure polling
  await bot.launch();
  console.log('Bot started with long polling');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
