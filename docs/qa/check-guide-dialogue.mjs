// Live check with synthetic input only. Never prints credentials or provider errors.
import dotenv from '../../backend/node_modules/dotenv/lib/main.js';
import { handleLabyrinthRequest } from '../../backend/services/labyrinthService.js';
const env = dotenv.config({path:new URL('../../backend/.env',import.meta.url),quiet:true}).parsed||{};
const history = [{role:'assistant',content:'Что обещает перекур после сложного разговора?'}];
const messages = [
  'Вчера после рабочего звонка я вышел во двор и закурил. Я ожидал, что сигарета уберёт тревогу из-за разговора.',
  'Потом сравнил: тревога о работе осталась. Стало легче от того, что вышел и побыл один. Сигарета закончилась, а проблему всё равно пришлось решать.',
  'Мой вывод: мне нужна пауза и тишина, а не обязательно сигарета. Ожидал исчезновения тревоги, но фактически получил передышку. Я хочу сохранять паузу другим способом.'
];
for (const message of messages) {
  const reply = await handleLabyrinthRequest({roomId:'stress',message,history},{env});
  console.log(JSON.stringify({turn:history.filter(l=>l.role==='user').length+1,mode:reply.mode,issue:reply.issue,phase:reply.progress.phase,ready:reply.progress.ready,evidence:Object.keys(reply.progress.evidence).filter(k=>reply.progress.evidence[k]),response:reply.response}));
  if(reply.mode!=='ai') {process.exitCode=1;break;}
  history.push({role:'user',content:message},{role:'assistant',content:reply.response});
}
