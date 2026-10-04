import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ROOM_IDS, ROOMS, type RoomId } from './rooms';
import { canEnter, completedThemes, type GameState } from './gameState';
type StageProps = { state:GameState; mode:'room'|'map'|'ambient'; reducedMotion:boolean; onObject:(id:string)=>void; onDoor:(id:RoomId)=>void };
export function PhaserStage(props:StageProps) {
  const host=useRef<HTMLDivElement>(null);const latest=useRef(props);const redraw=useRef<(()=>void)|null>(null);latest.current=props;
  useEffect(()=>{
    const parent=host.current;if(!parent)return;let disposed=false;
    class LabyrinthScene extends Phaser.Scene {
      private image?:Phaser.GameObjects.Image;
      private art!:Phaser.GameObjects.Graphics;
      private motion!:Phaser.GameObjects.Graphics;
      private controls:Phaser.GameObjects.GameObject[]=[];
      private profile='';private generation=0;
      create(){this.art=this.add.graphics().setDepth(2);this.motion=this.add.graphics().setDepth(3);this.scale.on('resize',this.draw,this);redraw.current=()=>this.draw();this.draw();}
      private background(profile:string) {
        if(this.profile===profile)return;this.profile=profile;const generation=++this.generation,key=`room-${profile}`;
        const apply=()=>{if(disposed || generation!==this.generation)return;this.image?.destroy();this.image=this.textures.exists(key)?this.add.image(0,0,key).setDepth(0):undefined;this.draw();this.cameras.main.fadeIn(latest.current.reducedMotion?0:500,5,8,12);};
        if(this.textures.exists(key)){apply();return;}
        this.load.once(Phaser.Loader.Events.COMPLETE,apply);this.load.image(key,`/game/${profile}.webp`);if(!this.load.isLoading())this.load.start();
      }
      private tap(zone:Phaser.GameObjects.Zone, action:()=>void) {
        let down:{id:number;x:number;y:number}|undefined;
        zone.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.event?.target!==this.game.canvas)return;down={id:p.id,x:p.x,y:p.y};});
        zone.on('pointerout',()=>{down=undefined;});
        zone.on('pointerup',(p:Phaser.Input.Pointer)=>{const start=down;down=undefined;if(start && start.id===p.id && Math.hypot(p.x-start.x,p.y-start.y)<12)action();});
      }
      private label(x:number,y:number,text:string,width:number,color='#f1e9dc',size=16) {
        const t=this.add.text(Math.round(x),Math.round(y),text,{resolution:2,stroke:'#071019',strokeThickness:2,fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,align:'center',wordWrap:{width},lineSpacing:3}).setOrigin(.5).setDepth(5);this.controls.push(t);return t;
      }
      private icon(x:number,y:number,symbol:string,color:number,alpha=1) {
        const g=this.art;g.lineStyle(2,color,alpha);g.fillStyle(color,alpha*.22);
        switch(symbol){
          case 'cup':g.fillRoundedRect(x-18,y-12,32,28,4);g.strokeRoundedRect(x-18,y-12,32,28,4);g.strokeCircle(x+18,y,8);g.lineBetween(x-24,y+22,x+25,y+22);g.lineBetween(x-8,y-28,x-11,y-19);g.lineBetween(x+5,y-29,x+2,y-20);break;
          case 'cigarette':g.strokeRoundedRect(x-27,y-5,54,10,2);g.fillRect(x+12,y-5,15,10);g.lineBetween(x-24,y-18,x-28,y-30);break;
          case 'clock':g.strokeCircle(x,y,24);g.lineBetween(x,y,x,y-15);g.lineBetween(x,y,x+12,y+7);break;
          case 'ring':g.strokeCircle(x,y,23);g.strokeCircle(x,y,12);g.fillTriangle(x+17,y-22,x+27,y-13,x+9,y-13);break;
          case 'phone':g.strokeRoundedRect(x-14,y-25,28,50,4);g.lineBetween(x-6,y+18,x+6,y+18);break;
          case 'pack':g.fillRoundedRect(x-20,y-27,40,54,3);g.strokeRoundedRect(x-20,y-27,40,54,3);g.lineBetween(x-20,y-9,x+20,y-9);g.strokeRect(x-11,y-1,22,16);break;
          case 'mirror':g.strokeEllipse(x,y,39,53);g.lineBetween(x-10,y+31,x+10,y+31);g.lineBetween(x-10,y+10,x+10,y-10);break;
          case 'match':g.lineBetween(x-18,y+22,x+13,y-20);g.fillCircle(x+13,y-20,6);break;
          case 'people':for(const off of [-21,0,21]){g.strokeCircle(x+off,y-14,7);g.strokeRoundedRect(x+off-9,y-3,18,26,5);}break;
          case 'chair':g.strokeRoundedRect(x-16,y-22,32,27,3);g.lineBetween(x-19,y+7,x+19,y+7);g.lineBetween(x-14,y+7,x-14,y+25);g.lineBetween(x+14,y+7,x+14,y+25);break;
          case 'hand':g.strokeRoundedRect(x-13,y-4,26,29,8);for(let i=0;i<4;i++)g.lineBetween(x-11+i*7,y-4,x-11+i*7,y-21+(i===0?7:0));break;
          case 'coin':g.strokeCircle(x,y,25);g.strokeCircle(x,y,19);g.lineBetween(x,y-12,x,y+12);g.lineBetween(x-7,y-8,x+7,y-8);g.lineBetween(x-7,y+8,x+7,y+8);break;
          case 'door':g.strokeRoundedRect(x-19,y-29,38,58,3);g.fillCircle(x+10,y+3,2);break;
          case 'wave':for(let i=0;i<3;i++)g.strokeEllipse(x,y-13+i*13,54,14);break;
          case 'cloud':g.strokeCircle(x-14,y,13);g.strokeCircle(x+1,y-8,19);g.strokeCircle(x+20,y,12);g.lineBetween(x-24,y+16,x+29,y+16);break;
          case 'sign':g.strokeTriangle(x,y-27,x-27,y+23,x+27,y+23);g.lineBetween(x,y-9,x,y+7);g.fillCircle(x,y+15,2);break;
          default:g.strokeCircle(x,y-7,18);g.lineBetween(x,y+11,x,y+25);g.lineBetween(x-13,y+26,x+13,y+26);
        }
      }
      draw(){
        if(disposed || !this.art)return;
        const {state:s,mode}=latest.current;const d=ROOMS[s.room],r=s.rooms[s.room],w=this.scale.width,h=this.scale.height;
        const profile=mode==='room'?d.profile:s.view==='ending'?'freedom':'corridor';this.background(profile);
        if(this.image){const factor=Math.max(w/this.image.width,h/this.image.height);this.image.setPosition(w/2,h/2).setScale(factor);}
        this.controls.forEach(o=>o.destroy());this.controls=[];this.art.clear();
        const g=this.art;g.fillStyle(0x050d13,mode==='ambient'?.24:.54);g.fillRect(0,0,w,h);
        if(mode==='ambient')return;
        if(mode==='map'){this.map(s,w,h);return;}
        const bright=r.completed || r.changed;const color=d.color;
        g.fillGradientStyle(color,color,0x0b1920,0x0b1920,bright?.17:.05);g.fillRect(0,0,w,h);
        g.lineStyle(1,color,.25);g.lineBetween(w*.05,h*.82,w*.95,h*.82);g.lineBetween(w*.1,h,w*.4,h*.39);g.lineBetween(w*.9,h,w*.6,h*.39);
        this.world(s,w,h);
        d.objects.forEach((o,i)=>{
          const x=w*(.19+i*.31),y=h*.66,seen=r.inspected.includes(o.id),selected=r.selected.includes(o.id);
          const dim=d.mechanic==='keep' && r.action>0 && !selected;
          g.fillStyle(0x06121a,.82);g.fillRoundedRect(x-w*.14,y-42,w*.28,104,9);g.lineStyle(seen?2:1,seen?color:0x768c96,seen?.9:.55);g.strokeRoundedRect(x-w*.14,y-42,w*.28,104,9);
          this.icon(x,y-2,o.symbol,color,dim?.28:1);
          this.label(x,y+44,o.label,w*.27,dim?'#aaa9a3':'#f1e9dc',w<370?14:16);
          const zone=this.add.zone(x,y+9,w*.28,108).setDepth(6).setInteractive({useHandCursor:true});this.controls.push(zone);
          this.tap(zone,()=>{latest.current.onObject(o.id);if(!latest.current.reducedMotion)this.cameras.main.flash(120,Math.round(color>>16&255),Math.round(color>>8&255),Math.round(color&255),false);});
          if(seen)this.label(x,y-54,selected?'●':'✓',40,'#dec19a',14);
        });
        this.label(w/2,h*.94,r.completed?'ПРОХОД ОТКРЫТ':r.changed?'Сцена изменилась':'Коснись предметов',w*.9,'#ddc9a9',13);
      }
      private world(s:GameState,w:number,h:number){
        const d=ROOMS[s.room],r=s.rooms[s.room],g=this.art,c=d.color,cx=w/2,cy=h*.3;
        g.lineStyle(2,c,.75);
        switch(d.mechanic){
          case 'rewind': {g.lineBetween(w*.15,cy,w*.85,cy);for(let i=0;i<3;i++){g.fillStyle(c,r.action>0 || i===2?1:.25);g.fillCircle(w*(.15+i*.35),cy,7);}this.label(cx,cy-40,r.action?'До первой сигареты':'Сегодня',w*.8,'#f1e9dc',19);break;}
          case 'cycle': {g.beginPath();g.arc(cx,cy,Math.min(w*.18,h*.17),r.action?-.8:0,r.action?Math.PI*1.3:Math.PI*2,false);g.strokePath();if(r.action){g.lineBetween(cx-16,cy,cx+16,cy);this.label(cx,cy+2,'Проход',w*.6);}else this.label(cx,cy,'Ещё одна',w*.6);break;}
          case 'clock': {const radius=Math.min(w*.15,h*.16);g.strokeCircle(cx,cy,radius);const angle=r.value/100*Math.PI*2-Math.PI/2;g.lineBetween(cx,cy,cx+Math.cos(angle)*radius*.7,cy+Math.sin(angle)*radius*.7);g.fillCircle(cx,cy,3);this.label(cx,cy+radius+24,r.action?'Остановлено':['Завтра','Через месяц','Когда-нибудь'][Math.min(2,Math.floor(r.value/34))],w*.8,'#f1e9dc',17);break;}
          case 'price': {const amount=Math.round(r.value/20*r.price*(r.action?365:1));for(let i=0;i<Math.min(24,Math.ceil(amount/Math.max(1,r.price)));i++){g.fillStyle(c,.18);g.fillCircle(w*.17+(i%8)*w*.094,h*.18+Math.floor(i/8)*15,8);}this.label(cx,cy+32,amount.toLocaleString('ru-RU'),w*.9,'#f6dfb0',30);this.label(cx,cy+65,r.action?'за год':'за день',w*.8,'#ded7cb',16);break;}
          case 'company': {g.fillStyle(c,.14);g.fillEllipse(cx,cy+25,w*.55,h*.19);g.strokeEllipse(cx,cy+25,w*.55,h*.19);for(let i=0;i<3;i++)this.icon(w*(.25+i*.25),cy-13,'people',c);if(!r.action)this.icon(cx,cy+32,'cigarette',c);break;}
          case 'unpack': {g.fillStyle(c,.14);g.fillRoundedRect(cx-46,cy-45,92,100,6);g.strokeRoundedRect(cx-46,cy-45,92,100,6);const layers=['Свобода','Так принято','Страшно'];this.label(cx,cy-12,r.action===3?'Что думаю я?':layers[r.action],w*.8,'#f1e9dc',19);for(let i=r.action;i<3;i++){g.lineStyle(1,c,.4);g.strokeRoundedRect(cx-50-i*5,cy-50-i*5,100+i*10,110+i*10,5);}break;}
          case 'weather': {g.strokeRoundedRect(cx-48,cy-45,96,100,3);g.lineBetween(cx,cy-45,cx,cy+55);g.lineBetween(cx-48,cy+5,cx+48,cy+5);if(r.action){g.fillStyle(0xe7d3a0,.18);g.fillTriangle(cx,cy+5,w*.1,h*.53,w*.9,h*.53);}this.label(cx,cy+80,r.action?'Окно открыто':'Твой страх, не прогноз',w*.9,'#ded7cb',14);break;}
          case 'exit': {g.lineStyle(3,c,.8);g.strokeRoundedRect(cx-45,cy-50,90,120,40);g.fillStyle(c,r.action?.55:.06);g.fillRoundedRect(cx-40,cy-45,80,112,36);if(r.action)this.label(cx,cy+13,'→',80,'#fff2ce',35);break;}
          case 'pause': {g.strokeCircle(cx,cy,30);if(r.action){g.lineBetween(cx-9,cy-15,cx-9,cy+15);g.lineBetween(cx+9,cy-15,cx+9,cy+15);}else{g.fillStyle(c,.55);g.fillTriangle(cx-9,cy-16,cx-9,cy+16,cx+15,cy);}this.label(cx,cy+53,r.action?'Пауза':'Шум',w*.7,'#f1e9dc',18);break;}
          default: {g.lineStyle(1,c,.4);g.strokeEllipse(cx,cy,w*.6,h*.2);const visible=r.action?d.objects.filter(o=>r.selected.includes(o.id)):d.objects;visible.forEach((o,i)=>this.icon(cx+(i-(visible.length-1)/2)*w*.19,cy,o.symbol,c));this.label(cx,cy+h*.14,r.action?'Что осталось?':'Привычный состав',w*.8,'#f1e9dc',16);}
        }
      }
      private map(s:GameState,w:number,h:number){
        const g=this.art;g.fillStyle(0xe6c88b,.025+completedThemes(s)*.013);g.fillRect(0,0,w,h);const ids=s.rooms.entry.completed?[...ROOM_IDS.filter(id=>id!=='entry')]:ROOM_IDS;
        const rows=Math.ceil(ids.length/3),top=36,cellH=(h-70)/rows;
        const positions=ids.map((id,i)=>({id,x:w*(.17+(i%3)*.33),y:top+Math.floor(i/3)*cellH}));
        g.lineStyle(1,0xd8bc8e,.27);
        positions.forEach(p=>ROOMS[p.id].neighbours.forEach(id=>{const q=positions.find(p=>p.id===id);if(q)g.lineBetween(p.x,p.y,q.x,q.y);}));
        positions.forEach(p=>{const d=ROOMS[p.id],r=s.rooms[p.id],open=canEnter(s,p.id);g.fillStyle(0x08141b,.95);g.fillRoundedRect(p.x-29,p.y-21,58,48,5);g.lineStyle(r.completed?2:1,r.completed?0xf0d298:open?d.color:0x56606b,open?1:.45);g.strokeRoundedRect(p.x-29,p.y-21,58,48,5);g.fillStyle(d.color,r.completed?.55:open?.14:.03);g.fillRoundedRect(p.x-23,p.y-16,46,37,3);g.fillStyle(0xf2d39f,.8);g.fillCircle(p.x+15,p.y+3,2);
          this.label(p.x,p.y+42,d.title,w*.3,open?'#eee4d3':'#afb0b1',w<370?15:16);
          if(r.completed)this.label(p.x,p.y,'✓',40,'#ffdea1',22);
          if(open){const z=this.add.zone(p.x,p.y+10,w*.29,cellH-5).setDepth(7).setInteractive({useHandCursor:true});this.controls.push(z);this.tap(z,()=>latest.current.onDoor(p.id));}
        });
        this.label(w/2,h-13,`${completedThemes(s)} / 10 · ${canEnter(s,'freedom')?'выход открыт':'выход впереди'}`,w*.9,'#ddc9a9',14);
      }
      update(time:number){
        if(disposed || !this.motion)return;this.motion.clear();const {state:s,mode,reducedMotion}=latest.current;if(reducedMotion)return;
        const w=this.scale.width,h=this.scale.height,r=s.rooms[s.room],d=ROOMS[s.room];const g=this.motion;
        if(mode==='room' && (d.mechanic==='weather' || d.mechanic==='pause') && !r.action){g.lineStyle(1,d.color,d.mechanic==='weather'?.12+r.value/100*.22:.15);for(let i=0;i<16;i++){const x=(i*27+time/60)%w,y=(i*17+time/20)%Math.max(1,h*.45);g.lineBetween(x,y,x-5,y+17);}}
        else {g.fillStyle(d.color,.2);for(let i=0;i<9;i++)g.fillCircle((i*w*.137+Math.sin(time/4000+i)*6)%w,(i*h*.173-time/190+i*h)%h,1.2);}
        if(mode==='room' && r.completed){g.lineStyle(2,d.color,.3+Math.sin(time/1400)*.1);g.strokeRoundedRect(w*.08,h*.06,w*.84,h*.85,12);}
      }
    }
    const game=new Phaser.Game({type:Phaser.AUTO,parent,width:Math.max(1,parent.clientWidth),height:Math.max(1,parent.clientHeight),backgroundColor:'#091117',audio:{noAudio:true},input:{windowEvents:false},scale:{mode:Phaser.Scale.RESIZE},scene:LabyrinthScene,fps:{target:30},render:{powerPreference:'low-power'},antialias:true});
    const observer=new ResizeObserver(()=>{if(!disposed)game.scale.resize(Math.max(1,parent.clientWidth),Math.max(1,parent.clientHeight));});observer.observe(parent);
    const visibility=()=>{if(document.hidden)game.loop.sleep();else game.loop.wake();};document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;redraw.current=null;observer.disconnect();document.removeEventListener('visibilitychange',visibility);game.destroy(true);};
  },[]);
  useEffect(()=>{redraw.current?.();},[props.state,props.mode,props.reducedMotion]);
  return <div ref={host} className="quest-canvas" aria-hidden="true" />;
}
