import 'dotenv/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { CODES } from './content';
import { userStates } from './state';

if (!process.env.BOT_TOKEN) {
  console.error('FATAL: BOT_TOKEN is not set in environment!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Map of admin Telegram IDs to display names
const ADMIN_NAMES: Record<number, string> = {
  5937823486: 'Wei Bin',
  189533640: 'Wei Ting',
  // …add more as needed
};

// Track which user an admin is currently replying to with images
const adminImageTargets = new Map<number, number>();  // adminId -> userId

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
function pickAdmin(): number | undefined {
  if (ADMIN_IDS.length === 0) return undefined;
  const adminId = ADMIN_IDS[rrIndex % ADMIN_IDS.length];
  rrIndex += 1;
  return adminId;
}

function formatUser(ctx: Context) {
  const user = ctx.from!;
  return user.username ? `@${user.username}` : user.first_name || `${user.id}`;
}

// ---------- Start & Main Menu ----------
bot.start(ctx =>
  ctx.reply(
        `👋 Welcome!
To get started, type /start and choose one:

🔑 Enter Code
- Submit a clue code you found
- Ensure that your CODE is prefixed with a # (e.g. #AB12)

🗣️ Talk to Admin
- Ask us a question

To do another action later, just tap a button or type /start again.`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Enter Code', 'ENTER_CODE')],
      [Markup.button.callback('Talk to admin', 'TALK_ADMIN')]
    ])
  )
);

// ---------- Code Entry Flow ----------
// User clicks "Enter Code"
bot.action('ENTER_CODE', async ctx => {
  await ctx.answerCbQuery();
  userStates.set(ctx.from!.id, 'entering_code');
  return ctx.reply('(Code must be prefixed with #. For example: #AB34) Please enter your code:');
});

// ---------- Admin Text Reply Handler ----------
bot.hears(/^#(\d+)\s+([\s\S]+)/, async ctx => {
  if (ctx.chat.type !== 'private') return;
  const adminId = ctx.from!.id;
  if (!ADMIN_IDS.includes(adminId)) return;

  const [, code, reply] = ctx.message.text.match(/^#(\d+)\s+([\s\S]+)/)!;
  const userId = Number(code);
  const ticket = tickets.get(userId);
  if (!ticket || ticket.adminId !== adminId || !ticket.open) {
    return ctx.reply('❌ Invalid code or no open ticket.');
  }

  const adminName = ADMIN_NAMES[adminId] || 'Admin';
  // send the text reply
  await ctx.telegram.sendMessage(
    userId,
    `From Admin ${adminName}\n\n${reply}`
  );
  // arm next image
  adminImageTargets.set(adminId, userId);

  return ctx.reply('✅ Sent to user.');
});


// ---------- Admin Reply Handler (must come before the generic text handler) ----------
// ---------- Admin “check-in” for image-only replies ----------
bot.hears(/^#(\d+)$/, async ctx => {
  if (ctx.chat.type !== 'private') return;
  const adminId = ctx.from!.id;
  if (!ADMIN_IDS.includes(adminId)) return;

  const [, code] = ctx.message.text.match(/^#(\d+)$/)!;
  const userId = Number(code);
  const ticket = tickets.get(userId);
  if (!ticket || ticket.adminId !== adminId || !ticket.open) {
    return ctx.reply('❌ Invalid code or no open ticket.');
  }

  // arm the next photo to go to this user
  adminImageTargets.set(adminId, userId);
  return ctx.reply('✅ Ready to receive image. Please send the image now.');
});


// ---------- Fallback Generic Code (optional) ----------
// Only catch non-numeric codes; numeric ticket replies go to the admin handler
bot.hears(/^#[A-Za-z]\w*/, ctx => ctx.reply('❌ Invalid code. Find the clues first to obtain the code! Press /start again to re-enter code.'));

// ---------- Admin Image Reply Handler ----------
bot.on(['photo', 'document'] as const, async ctx => {
  if (ctx.chat.type !== 'private') return;
  const adminId = ctx.from?.id;
  if (!adminId || !ADMIN_IDS.includes(adminId)) return;

  const userId = adminImageTargets.get(adminId);
  if (!userId) return;  // no outstanding ticket for an image

  // Narrow the union type on ctx.message
  const msg = ctx.message as {
    photo?: { file_id: string }[];
    document?: { file_id: string; mime_type?: string };
  };

  if ('photo' in msg && Array.isArray(msg.photo)) {
    // highest-res photo
    const photos = msg.photo;
    const fileId = photos[photos.length - 1].file_id;
    await ctx.telegram.sendPhoto(userId, fileId);

  } else if ('document' in msg && msg.document?.mime_type?.startsWith('image/')) {
    // image sent as a document
    const fileId = msg.document.file_id;
    await ctx.telegram.sendDocument(userId, fileId);

  } else {
    // neither a photo nor an image-typed document
    return;
  }

  // confirm back to the admin
  await ctx.reply('✅ Sent to user.');

  // require a fresh "#ID" before the next image
  adminImageTargets.delete(adminId);
});

// ---------- Handle user text: Code entry & Talk-to-admin ----------
bot.on('text', async ctx => {
  if (ctx.chat.type !== 'private') return;
  const uid = ctx.from!.id;
  const state = userStates.get(uid) || 'default';

  // 1) Code entry
  if (state === 'entering_code') {
    const code = ctx.message.text.trim().toUpperCase();
    const entry = CODES[code];
    if (entry) {
      await ctx.reply(entry.text);
      if (entry.image) await ctx.replyWithPhoto(entry.image);
    } else {
      await ctx.reply('❌ Invalid code. Please press /start to try again.');
    }
    userStates.delete(uid);
    return;
  }

  // 2) Talk-to-admin flow
  if (state === 'talking_to_admin') {
    const text = ctx.message.text || '';
    let ticket = tickets.get(uid);

    if (!ticket || !ticket.open) {
      // first message: create ticket and notify admin
      const adminId = pickAdmin();
      if (!adminId) {
        await ctx.reply('No admins available. Please try later.');
        return;
      }
      const code = `${uid}`;
      ticket = { adminId, code, open: true };
      tickets.set(uid, ticket);

      const header = `🆕 New request #${code} from ${formatUser(ctx)}:`;
      await bot.telegram.sendMessage(adminId, `${header}\n${text}`);

      // confirm to user
      await ctx.reply(`📨 Sent to admin as #${code}.`);
    } else {
      // follow‑up messages route to same admin
      ticket.open = true;
      tickets.set(uid, ticket);

      await bot.telegram.sendMessage(
        ticket.adminId,
        `🔁 Follow-up #${ticket.code} from ${formatUser(ctx)}:\n${text}`
      );
      await ctx.reply(`📨 Sent to admin as #${ticket.code}.`);
    }

    // in both cases, prompt them to /start again
    await ctx.reply('Type /start to send a message again to the admin. Or simply select "Enter Code" or "Talk to admin" from the previous prompt');
    // clear their state so they must restart
    userStates.delete(uid);
  }
});

// ---------- Talk to Admin Button ----------
bot.action('TALK_ADMIN', async ctx => {
  await ctx.answerCbQuery();
  userStates.set(ctx.from!.id, 'talking_to_admin');
  return ctx.reply('You are now connected to an admin. Send your message.');
});

// ---------- Launch ----------
(async () => {
  await bot.telegram.deleteWebhook();
  await bot.launch();
  console.log('Bot started');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
