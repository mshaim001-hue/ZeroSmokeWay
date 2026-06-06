/**
 * Email-последовательность от Алекса после регистрации.
 *
 * Письма отправляются через Resend (resend.com — бесплатный tier 3000/мес).
 * Нужна переменная среды RESEND_API_KEY.
 * FROM_EMAIL — отправитель, например "alex@zersmokeway.com" (должен быть верифицирован в Resend).
 *
 * Письма персонализированы: если есть анамнез — используем его данные.
 * Если нет — базовая версия.
 */

import { createClient } from '@supabase/supabase-js';

const SEQUENCE = [
  {
    // День 1 — сразу после регистрации
    delayHours: 1,
    subject: 'Алекс: одна мысль о том, что ты сказал',
    getBody: (name, anamnesis) => {
      const n = name || 'привет';
      const attempts = anamnesis?.previousAttempts;
      return `
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${n},
</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${attempts
  ? `Ты говорил про попытки бросить. Я думал об этом. Вот вопрос: что происходило в первые дни — физически было плохо или просто было скучно без привычного ритуала?`
  : `Ты ответил на первый вопрос. Я думал о том, что ты написал. Один вопрос: когда ты куришь — ты получаешь что-то, или убираешь что-то неприятное?`}
</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
Ответь сюда или открой чат — продолжим.
</p>
<p style="font-family:sans-serif;font-size:14px;color:#64748b">— Алекс</p>
<p style="margin-top:24px"><a href="${process.env.APP_URL || 'https://zersmokeway.com'}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:15px">Открыть чат</a></p>
      `.trim();
    },
  },
  {
    // День 2
    delayHours: 26,
    subject: 'Алекс: вопрос на сегодня',
    getBody: (name, anamnesis) => {
      const n = name || 'привет';
      const triggers = anamnesis?.triggers?.[0];
      return `
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${n},
</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${triggers
  ? `Ты говорил про ${triggers}. Когда это случается — ты хочешь именно сигарету, или просто хочется паузы?`
  : `Один вопрос: в какой момент сегодня тянуло сильнее всего? Утро, после еды, на нервах?`}
</p>
<p style="font-family:sans-serif;font-size:14px;color:#64748b">— Алекс</p>
<p style="margin-top:24px"><a href="${process.env.APP_URL || 'https://zersmokeway.com'}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:15px">Ответить</a></p>
      `.trim();
    },
  },
  {
    // День 4
    delayHours: 4 * 24,
    subject: 'Алекс пишет',
    getBody: (name, anamnesis) => {
      const n = name || 'привет';
      const likes = anamnesis?.likes?.[0];
      return `
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${n},
</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${likes
  ? `Ты говорил, что нравится ${likes}. Некурящие тоже это получают — без сигарет. Откуда у них эта возможность без никотина?`
  : `Я думал — что именно нравится в курении? Вкус, ощущение, пауза? Это важно понять.`}
</p>
<p style="font-family:sans-serif;font-size:14px;color:#64748b">— Алекс</p>
<p style="margin-top:24px"><a href="${process.env.APP_URL || 'https://zersmokeway.com'}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:15px">Ответить</a></p>
      `.trim();
    },
  },
  {
    // День 7
    delayHours: 7 * 24,
    subject: 'Неделя прошла. Как ты?',
    getBody: (name) => {
      const n = name || 'привет';
      return `
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
${n},
</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
Прошла неделя с нашего первого разговора. Не спрошу про сигареты. Как вообще?
</p>
<p style="font-family:sans-serif;font-size:14px;color:#64748b">— Алекс</p>
<p style="margin-top:24px"><a href="${process.env.APP_URL || 'https://zersmokeway.com'}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:15px">Открыть чат</a></p>
      `.trim();
    },
  },
];

/**
 * Ставит письма в очередь для нового пользователя.
 * Вызывается сразу после регистрации.
 */
export async function scheduleEmailSequence({ userId, email, name, anamnesis }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('emailSequence: Supabase не настроен, пропускаем');
    return;
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  const rows = SEQUENCE.map((step) => {
    const sendAfter = new Date(now.getTime() + step.delayHours * 3600 * 1000);
    return {
      user_id: userId,
      email,
      subject: step.subject,
      body_html: step.getBody(name, anamnesis),
      send_after: sendAfter.toISOString(),
    };
  });

  const { error } = await sb.from('email_queue').insert(rows);
  if (error) console.error('emailSequence: ошибка вставки', error);
}

/**
 * Отправляет все pending письма из очереди.
 * Вызывается Vercel Cron (каждые 30 минут) или вручную.
 */
export async function flushEmailQueue() {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'alex@zersmokeway.com';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendKey || !supabaseUrl || !serviceKey) {
    console.warn('flushEmailQueue: RESEND_API_KEY или Supabase не настроены');
    return { sent: 0, skipped: true };
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const { data: pending, error: fetchErr } = await sb
    .from('email_queue')
    .select('*')
    .lte('send_after', new Date().toISOString())
    .is('sent_at', null)
    .is('error', null)
    .limit(50);

  if (fetchErr) throw fetchErr;
  if (!pending?.length) return { sent: 0 };

  let sent = 0;
  for (const row of pending) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Алекс <${fromEmail}>`,
          to: row.email,
          subject: row.subject,
          html: row.body_html,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Resend ${res.status}: ${txt}`);
      }

      await sb.from('email_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } catch (err) {
      console.error('flushEmailQueue: ошибка отправки', row.id, err);
      await sb.from('email_queue').update({ error: String(err) }).eq('id', row.id);
    }
  }

  return { sent };
}
