(function(){
 'use strict';
 var script=document.currentScript;
 var token=new URLSearchParams(location.hash.split('?')[1]||'').get('review');
 if(!token)return;
 var api=script.dataset.api.replace(/\/$/,'');
 var bridge=window.MSFields,ready=false,busy=false,sending=false,timer=null,remote={cells:{},revision:0},pending={},conflicts={},key,queueKey,previousQueue,backup,durable=true;
 var box=document.createElement('section');box.className='blk ms-shared-box';
 var title=document.createElement('h3');title.textContent='Общие ответы клиента и SolutionCRM';box.appendChild(title);
 var message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');box.appendChild(message);
 var tools=document.createElement('div');tools.className='ms-tools';box.appendChild(tools);
 function button(text,fn){var b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);tools.appendChild(b);return b;}
 var sync=button('Обновить ответы',function(){pull(true)});
 var mine=button('Сохранить мой вариант',function(){Object.keys(conflicts).forEach(function(k){if(pending[k])pending[k].base=remote.cells[k]?remote.cells[k].rev:0});conflicts={};persist();flush()});mine.hidden=true;
 var theirs=button('Принять общий вариант',function(){Object.keys(conflicts).forEach(function(k){delete pending[k]});conflicts={};persist();bridge.applyCells(remote.cells,pending);notice();flush()});theirs.hidden=true;
 var importButton=button('Перенести мои прежние локальные ответы',importLocal);importButton.hidden=true;
 var recover=button('Восстановить несохранённые правки другого окна',recoverDrafts);recover.hidden=true;
 var hint=document.createElement('p');hint.className='ms-muted';hint.textContent='Эту общую ссылку используете вы и клиент. Она даёт доступ к ответам; передавайте её только участникам согласования.';box.appendChild(hint);
 function say(t){message.textContent=t;}
 function hasChanges(){return Object.keys(pending).length>0;}
 function persist(){try{localStorage.setItem(queueKey,JSON.stringify({pending:pending,updated:Date.now()}));durable=true}catch(e){durable=false;say('Правки ещё не отправлены. Браузер не даёт сохранить резервную копию — не закрывайте страницу до отправки.')}}
 function notice(){
  var n=Object.keys(conflicts).length;mine.hidden=theirs.hidden=!n;
  if(n){say('Другой участник изменил '+n+' из редактируемых полей. Ваш вариант сохранён здесь. Выберите, какой вариант оставить.');return;}
  if(hasChanges())say(durable?'Есть несохранённые общие правки. Отправляем при доступной связи…':'Браузер не сохраняет резервную копию. Не закрывайте страницу, пока правки не отправлены.');
  else if(ready)say('Общие ответы сохранены. Другие участники увидят их при открытии или обновлении страницы.');
 }
 async function request(method,body){
  var controller=new AbortController(),timeout=setTimeout(function(){controller.abort()},10000);
  try{return await fetch(api+'/api/review',{method:method,headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal})}finally{clearTimeout(timeout)}
 }
 function restore(){
  try{var raw=JSON.parse(localStorage.getItem(previousQueue||queueKey)||'null');if(raw&&raw.pending)Object.keys(raw.pending).forEach(function(k){var x=raw.pending[k];if(x&&k===x.field+'.'+x.part&&bridge.validChange(x))pending[k]=x});}catch(e){}
 }
 function updateFrom(snapshot){
  if(!snapshot||!snapshot.cells||typeof snapshot.revision!=='number')throw new Error('response');
  remote=snapshot;try{localStorage.setItem(key+':server-cache',JSON.stringify(snapshot));}catch(e){}
  Object.keys(pending).forEach(function(k){var x=pending[k],c=remote.cells[k];if(c&&JSON.stringify(c.data)===JSON.stringify(x.data)){delete pending[k];delete conflicts[k]}else if((c?c.rev:0)!==x.base)conflicts[k]=true;});
  persist();bridge.applyCells(remote.cells,pending);
 }
 function enable(){document.querySelectorAll('#ms-fields-root input,#ms-fields-root select,#ms-fields-root textarea').forEach(function(e){e.disabled=false});}
 async function pull(force){
  if(busy||sending)return;busy=true;sync.disabled=true;
  try{
   var r=await request('GET');if(r.status===401){say('Нет доступа к общим ответам. Проверьте, что открыли полную общую ссылку.');return;}if(!r.ok)throw new Error('offline');
   updateFrom(await r.json());ready=true;enable();importButton.hidden=!backupChanges().length;recover.hidden=!orphanChanges().length;notice();
  }catch(e){say(ready?'Сервер недоступен. Ваши правки остаются в этом браузере и отправятся при восстановлении связи.':'Не удалось загрузить общие ответы. Нажмите «Обновить ответы», когда появится связь. Локальная копия сохранена.');}
  finally{busy=false;sync.disabled=false;if(ready&&hasChanges()&&!Object.keys(conflicts).length)flush();}
 }
 async function flush(){
  if(!ready||sending||busy||!hasChanges()||Object.keys(conflicts).length)return;
  sending=true;say('Сохраняем для всех участников…');var sent=JSON.parse(JSON.stringify(pending));
  try{
   var r=await request('PATCH',{changes:Object.values(sent)});
   if(r.status===409){var result=await r.json();updateFrom(result.snapshot);notice();return;}
   if(r.status===401){say('Общая ссылка больше не даёт доступа. Ваши правки сохранены в этом браузере; запросите актуальную ссылку.');return;}
   if(!r.ok)throw new Error('write');
   var snapshot=await r.json();
   Object.keys(sent).forEach(function(k){if(!pending[k])return;if(JSON.stringify(pending[k].data)===JSON.stringify(sent[k].data))delete pending[k];else pending[k].base=snapshot.cells[k]?snapshot.cells[k].rev:0;});
   updateFrom(snapshot);notice();
  }catch(e){say(durable?'Не удалось отправить правки. Они сохранены в этом браузере; повторим при восстановлении связи.':'Правки ещё не отправлены, а браузер не сохраняет копию. Не закрывайте страницу; восстановите связь и нажмите «Обновить ответы».');}
  finally{sending=false;if(hasChanges()&&!Object.keys(conflicts).length){clearTimeout(timer);timer=setTimeout(flush,5000)}}
 }
 function orphanChanges(){
  var changes={};
  try{Object.keys(localStorage).filter(function(k){return k.indexOf(key+':draft:')===0&&k!==queueKey}).map(function(k){return JSON.parse(localStorage.getItem(k)||'null')}).filter(Boolean).sort(function(a,b){return (a.updated||0)-(b.updated||0)}).forEach(function(record){Object.keys(record.pending||{}).forEach(function(k){var x=record.pending[k],c=remote.cells[k];if(x&&bridge.validChange(x)&&!pending[k]&&(!c||JSON.stringify(c.data)!==JSON.stringify(x.data)))changes[k]=x;});});}catch(e){}
  return Object.values(changes);
 }
 function recoverDrafts(){if(!ready)return;orphanChanges().forEach(function(x){pending[x.field+'.'+x.part]=x});persist();updateFrom(remote);recover.hidden=true;notice();flush();}
 function backupChanges(){
  if(!backup)return [];
  var out=[];bridge.getDefinitions().forEach(function(f){['value','review','comment'].forEach(function(part){
   var group=part==='value'?'values':part==='review'?'reviews':'comments',data=backup[group]&&backup[group][f.id];
   var empty=part==='review'?data==='pending':part==='comment'?!data:f.kind==='select'?data===f.options[0][0]:f.kind==='multi'?!data||!data.length:f.kind==='utm'?!data||!Object.values(data).some(Boolean):!data;
   if(empty||data===undefined)return;
   var change={field:f.id,part:part,data:data,base:0};if(bridge.validChange(change))out.push(change);
  });});return out;
 }
 function importLocal(){
  if(!ready)return;var changes=backupChanges(),n=0,skipped=0;
  changes.forEach(function(x){var k=x.field+'.'+x.part;if(remote.cells[k]||pending[k]){skipped++;return;}pending[k]=x;n++;});persist();
  var localCells=Object.assign({},remote.cells);Object.keys(pending).forEach(function(k){localCells[k]={data:pending[k].data,rev:pending[k].base}});bridge.applyCells(localCells,{});
  importButton.hidden=true;say('Добавлено локальных ответов: '+n+'. Уже заполненные общие ответы не заменены: '+skipped+'.');flush();
 }
 async function init(){
  bridge=window.MSFields;
  document.querySelector('.ms-intro').after(box);document.getElementById('ms-save-status').hidden=true;document.getElementById('ms-reset').hidden=true;
  document.querySelector('.ms-intro .ms-muted').textContent='Вы открыли общую ссылку. Ответы сохраняются на сервере и доступны всем участникам с этой ссылкой. Скачать итог можно по-прежнему.';
  if(!/^[A-Za-z0-9_-]{40,120}$/.test(token)){say('Общая ссылка неполная. Запросите её у SolutionCRM.');return;}
  document.querySelectorAll('#ms-fields-root input,#ms-fields-root select,#ms-fields-root textarea').forEach(function(e){e.disabled=true});
  var digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));key='ms-shared-v1:'+Array.from(new Uint8Array(digest)).map(function(x){return x.toString(16).padStart(2,'0')}).join('').slice(0,24);
  try{previousQueue=sessionStorage.getItem(key+':window-queue');queueKey=key+':draft:'+crypto.randomUUID();sessionStorage.setItem(key+':window-queue',queueKey);}catch(e){queueKey=key+':draft:'+crypto.randomUUID();}
  try{var prev=localStorage.getItem(key+':local-backup');if(!prev){backup=bridge.getLocal();localStorage.setItem(key+':local-backup',JSON.stringify(backup))}else backup=JSON.parse(prev);}catch(e){backup=bridge.getLocal();}
  restore();window.MSShared={edit:function(field,part,data){if(!ready)return;var k=field+'.'+part;if(!pending[k])pending[k]={field:field,part:part,data:data,base:remote.cells[k]?remote.cells[k].rev:0};else pending[k].data=data;persist();notice();clearTimeout(timer);timer=setTimeout(flush,650);}};
  try{var cached=JSON.parse(localStorage.getItem(key+':server-cache')||'null');if(cached&&cached.cells&&typeof cached.revision==='number'){updateFrom(cached);ready=true;enable();}else bridge.applyCells({},pending);}catch(e){bridge.applyCells({},pending);}
  say('Загружаем общие ответы…');await pull(true);
  setInterval(function(){if(!document.hidden)pull(false)},10000);window.addEventListener('online',function(){pull(true)});
 }
 if(window.MSFields&&window.MSFields.ready)init();else document.addEventListener('ms-fields-ready',init,{once:true});
})();
