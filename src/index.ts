import 'dotenv/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { QUESTIONS, CODES } from './content';
import { userStates } from './state';

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Map of admin Telegram IDs to display names
const ADMIN_NAMES: Record<number, string> = {
  5937823486: 'Wei Bin',
  189533640: 'Wei Ting',
  // …add more as needed
};

// ---------- Configuration ----------
const ADMIN_IDS: number[] = (process.env.ADMIN_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);

let rrIndex = 0;

interface Ticket {
  adminId: number;
  code: string;
  open: boolean;
}
const tickets = new Map<number, Ticket>();

// ---------- Helpers ----------
const PAGE_SIZE = 8;
type IKBtn = ReturnType<typeof Markup.button.callback>;

function buildPage(page: number) {
  const start = page * PAGE_SIZE;
  const slice = QUESTIONS.slice(start, start + PAGE_SIZE);
  const text = slice.map(q => `${q.key}. ${q.question}`).join('\n');
  const qButtons: IKBtn[] = slice.map(q => Markup.button.callback(q.key, `Q_${q.key}`));
  const nav: IKBtn[] = [];
  if (page > 0) nav.push(Markup.button.callback('◀️ Prev', `PG_${page - 1}`));
  if (start + PAGE_SIZE < QUESTIONS.length)
    nav.push(Markup.button.callback('Next ▶️', `PG_${page + 1}`));
  return { text, keyboard: Markup.inlineKeyboard([...qButtons, ...nav], { columns: 4 }) };
}

function pickAdmin(): number | undefined {
  if (!ADMIN_IDS.length) return undefined;
  const adminId = ADMIN_IDS[rrIndex % ADMIN_IDS.length];
  rrIndex += 1;
  return adminId;
}

function formatUser(ctx: Context) {
  const user = ctx.from!;
  return user.username ? `@${user.username}` : user.first_name || `${user.id}`;
}

// ---------- Q&A & Code Handlers ----------
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

bot.action('SHOW_QS', async ctx => {
  await ctx.answerCbQuery();
  const p = buildPage(0);
  return ctx.editMessageText(p.text, p.keyboard);
});

bot.action(/PG_(\d+)/, async ctx => {
  await ctx.answerCbQuery();
  const page = parseInt(ctx.match![1], 10);
  const p = buildPage(page);
  return ctx.editMessageText(p.text, p.keyboard);
});

bot.action(/Q_(.+)/, async ctx => {
  await ctx.answerCbQuery();
  const key = ctx.match![1];
  const qa = QUESTIONS.find(q => q.key === key);
  return ctx.reply(qa?.answer ?? 'No answer found.');
});

// ---------- Admin Reply Handler (must come before generic #CODE handler) ----------
bot.hears(/^#(\d+)\s+([\s\S]+)/, async ctx => {
  if (ctx.chat.type !== 'private') return;
  const adminId = ctx.from!.id;
  if (!ADMIN_IDS.includes(adminId)) return;

  const match = ctx.message.text.match(/^#(\d+)\s+([\s\S]+)/);
  if (!match) return;
  const userId = parseInt(match[1], 10);
  const reply = match[2];

  const ticket = tickets.get(userId);
  if (!ticket || ticket.adminId !== adminId || !ticket.open) {
    return ctx.reply('❌ Invalid code or no open ticket.');
  }

  // Lookup the friendly name (fall back to adminId if missing)
  const adminName = ADMIN_NAMES[adminId] || `#${adminId}`;

  try {
    await bot.telegram.sendMessage(userId, `From Admin ${adminName}\n\n${reply}`);
    await ctx.reply('✅ Sent to user.');
  } catch (e) {
    console.error('Failed to send reply to user:', e);
    await ctx.reply('❌ Failed to send to user.');
  }
});

// ---------- Generic #CODE Handler ----------
bot.hears(/^#\w+/i, async ctx => {
  // Skip numeric codes (handled by admin handler)
  if (/^#\d+/.test(ctx.message.text)) return;
  const code = ctx.message.text.trim().toUpperCase();
  const hit = CODES[code];
  if (!hit) return ctx.reply('❌ Unknown code.');
  await ctx.reply(hit.text);
  if (hit.image) await ctx.replyWithPhoto(hit.image);
});

// ---------- Talk to Admin Flow ----------
bot.action('TALK_ADMIN', async ctx => {
  await ctx.answerCbQuery();
  userStates.set(ctx.from!.id, 'talking_to_admin');
  return ctx.reply('You are now connected to an admin. Send your message.');
});

bot.on('text', async ctx => {
  if (ctx.chat.type !== 'private') return;
  const state = userStates.get(ctx.from!.id) || 'default';
  if (state !== 'talking_to_admin') return;

  const userId = ctx.from!.id;
  const text = ctx.message.text || '';

  let ticket = tickets.get(userId);
  if (!ticket || !ticket.open) {
    const adminId = pickAdmin();
    if (!adminId) {
      return ctx.reply('No admins available. Please try again later.');
    }
    const code = `${userId}`;
    ticket = { adminId, code, open: true };
    tickets.set(userId, ticket);

    try {
      await bot.telegram.sendMessage(
        adminId,
        `🆕 New request #${code} from ${formatUser(ctx)}:\n${text}`
      );
    } catch (e) {
      console.error('Failed to DM admin:', e);
    }
    await ctx.reply(`📨 Sent to admin as #${code}.`);
// Prompt user to restart
await ctx.reply("Type /start again to use the bot or talk to the admins.");
// Reset state until user restarts
userStates.delete(userId);
  } else {
    ticket.open = true;
    tickets.set(userId, ticket);
    try {
      await bot.telegram.sendMessage(
        ticket.adminId,
        `🔁 Follow-up #${ticket.code} from ${formatUser(ctx)}:\n${text}`
      );
    } catch (e) {
      console.error('Failed to DM admin:', e);
    }
    await ctx.reply(`📨 Sent to admin as #${ticket.code}.`);
  }
});

// ---------- Launch (polling) ----------
(async () => {
  await bot.telegram.deleteWebhook();
  await bot.launch();
  console.log('Bot started with long polling');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
