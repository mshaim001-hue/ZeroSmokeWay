import type { Message } from './gameState';
export type DialogueReply = {response:string;mode:'ai'|'authored';issue?:string};
export async function askDialogue(roomId:string,message:string,history:Message[],context:string[],signal:AbortSignal,personalReason?:string):Promise<DialogueReply> {
  const root=(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'');
  const bounded=history.length<=20?history:[...history.slice(0,3),...history.slice(-17)];
  const response=await fetch(`${root}/api/labyrinth`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,message,personalReason:personalReason || undefined,history:bounded.map(({role,content})=>({role,content:content.slice(0,2000)})),discoveries:context.slice(-12).map(x=>x.slice(0,600))}),signal});
  if(!response.ok)throw new Error('Не удалось получить ответ');
  const value=await response.json();
  if(typeof value.response!=='string' || !value.response.trim() || !['ai','authored'].includes(value.mode))throw new Error('Не удалось прочитать ответ');
  return {response:value.response.slice(0,2000),mode:value.mode,issue:typeof value.issue==='string'?value.issue:undefined};
}
