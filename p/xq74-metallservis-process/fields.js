(function(root){
  'use strict';
  function classify(v){
    if(v.target_company==='no')return 'not_target_company';
    if(v.target_request==='no')return 'not_target_request';
    if(v.target_company!=='yes'||v.target_request!=='yes')return 'unknown';
    if(v.need==='no')return 'D';
    if(v.need!=='yes')return 'unknown';
    if(v.funding==='no'||v.funding==='pending')return 'C';
    if(v.funding!=='yes')return 'unknown';
    return v.urgency==='yes'?'A':v.urgency==='no'?'Б':'unknown';
  }
  root.MSFields={classify:classify};
  if(typeof document==='undefined')return;
  var rootEl=document.getElementById('ms-fields-root');
  if(!rootEl)return;
  var KEY='solutioncrm:metallservis:fields:20261124:v1';
  var groups=[['sources','Источники и каналы'],['qualification','Фильтры квалификации'],['formula','Формула продаж · 5 критериев'],['decision','Участники и решение'],['product','Заявка и исполнение'],['refusal','Отказы и возврат']];
  var defs=[],state={values:{},reviews:{},comments:{}},storageOK=true;
  var controls={},cards={},reviewControls={},commentControls={};
  var statusEl=document.getElementById('ms-save-status');
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function status(text){statusEl.textContent=text;}
  function defaultValue(f){return f.kind==='multi'?[]:f.kind==='utm'?{}:f.kind==='select'?f.options[0][0]:'';}
  function allowed(f,value){
    if(f.kind==='select'&&f.valueAliases&&typeof value==='string'&&Object.prototype.hasOwnProperty.call(f.valueAliases,value))value=f.valueAliases[value];
    if(f.kind==='select')return f.options.some(function(x){return x[0]===value})?value:defaultValue(f);
    if(f.kind==='multi')return Array.isArray(value)?value.filter(function(x){return f.options.some(function(o){return o[0]===x})}):[];
    if(f.kind==='utm'){var out={};['source','medium','campaign','content','term'].forEach(function(k){out[k]=value&&typeof value[k]==='string'?value[k].slice(0,300):''});return out;}
    if(typeof value!=='string')return '';
    if(f.kind==='number')return /^(\d{1,6})?$/.test(value)?value:'';
    if(f.kind==='date')return /^(\d{4}-\d{2}-\d{2})?$/.test(value)?value:'';
    if(f.kind==='datetime-local')return /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/.test(value)?value:'';
    return value.slice(0,1000);
  }
  function restore(){
    var saved=null;
    try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){storageOK=false}
    if(!saved||typeof saved!=='object')return;
    defs.forEach(function(f){
      if(saved.values&&Object.prototype.hasOwnProperty.call(saved.values,f.id))state.values[f.id]=allowed(f,saved.values[f.id]);
      var review=saved.reviews&&saved.reviews[f.id];
      state.reviews[f.id]=['pending','accept','discuss','omit'].indexOf(review)>=0?review:'pending';
      var comment=saved.comments&&saved.comments[f.id];state.comments[f.id]=typeof comment==='string'?comment.slice(0,400):'';
    });
  }
  function save(field,part){
    try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;status('Выбор сохранён в этом браузере.');}
    catch(e){storageOK=false;status('Браузер не сохраняет выбор. Скачайте итог перед закрытием страницы.');}
    if(root.MSShared && field)root.MSShared.edit(field,part,state[part==='value'?'values':part==='review'?'reviews':'comments'][field]);
  }
  function updateCategory(){
    var v=state.values,cat=classify(v);
    var info={A:['A','Потребность, финансирование и срочность подтверждены. Приоритет — быстро провести разбор и согласовать решение.'],
      'Б':['Б','Потребность и финансирование есть, срочности нет. Планируем контакт по реальным срокам закупки.'],
      C:['C','Потребность есть, деньги пока не подтверждены или ожидаются. Уточняем дату финансирования и возвращаемся по договорённости.'],
      D:['D','Актуальной потребности пока нет. Если компания целевая, сохраняем её в базе и планируем уместный контакт.'],
      unknown:['Не определена','Квалификация ещё не завершена: нужны ответы по целевости, потребности, финансированию и срочности.'],
      not_target_company:['Нецелевой клиент','Профиль компании не подходит. Это отдельный результат фильтра, а не категория D.'],
      not_target_request:['Нецелевая заявка','Запрос не по нашей номенклатуре. Целевость самой компании не меняется: возможны подходящие будущие заявки.']}[cat];
    document.getElementById('ms-category').textContent=info[0];
    document.getElementById('ms-category-description').textContent=info[1];
    var ready=v.lpr==='Известны оба участника'||v.lpr==='Один человек решает и технику, и оплату';
    document.getElementById('ms-readiness').textContent=(ready?'Цепочка решения отмечена. ':'Перед следующим шагом уточните технического участника и согласующего оплату. ')+(v.urgency_window==='Не согласовано'?'Окно срочности ещё не согласовано. ':'Окно срочности пока демонстрационное. ')+'Доверие и результат КЭВа проверяем отдельно.';
  }
  function buildControl(f){
    var wrap=el('div');
    var id='ms-value-'+f.id;
    if(f.kind==='select'){
      var sel=el('select');sel.id=id;sel.setAttribute('aria-label',f.title+' — пример значения');
      f.options.forEach(function(o){var opt=el('option',null,o[1]);opt.value=o[0];sel.appendChild(opt)});
      sel.value=state.values[f.id];sel.addEventListener('change',function(){state.values[f.id]=sel.value;updateCategory();save(f.id,'value')});wrap.appendChild(sel);controls[f.id]=sel;
    }else if(f.kind==='multi'){
      wrap.className='ms-multi';wrap.id=id;wrap.setAttribute('role','group');wrap.setAttribute('aria-label',f.title);
      f.options.forEach(function(o,i){var lab=el('label','ms-choice');var input=el('input');input.type='checkbox';input.value=o[0];input.checked=state.values[f.id].indexOf(o[0])>=0;input.addEventListener('change',function(){state.values[f.id]=Array.from(wrap.querySelectorAll('input:checked')).map(function(x){return x.value});save(f.id,'value')});lab.appendChild(input);lab.appendChild(el('span',null,o[1]));wrap.appendChild(lab)});controls[f.id]=wrap;
    }else if(f.kind==='utm'){
      wrap.className='ms-utm';wrap.id=id;
      ['source','medium','campaign','content','term'].forEach(function(key){var lab=el('label',null,'utm_'+key);var inp=el('input');inp.type='text';inp.maxLength=300;inp.setAttribute('aria-label','utm_'+key);inp.value=state.values[f.id][key]||'';inp.placeholder='Автоматически с сайта';inp.addEventListener('input',function(){state.values[f.id][key]=inp.value;save(f.id,'value')});lab.appendChild(inp);wrap.appendChild(lab)});controls[f.id]=wrap;
    }else{
      var inp=el('input');inp.id=id;inp.type=f.kind;inp.setAttribute('aria-label',f.title+' — пример значения');
      if(f.kind==='number'){inp.min='0';inp.max='999999';inp.step='1';}else inp.maxLength=1000;
      inp.placeholder=f.kind==='text'?'Введите пример / формулировку':'';inp.value=state.values[f.id];inp.addEventListener('input',function(){state.values[f.id]=allowed(f,inp.value);save(f.id,'value')});wrap.appendChild(inp);controls[f.id]=inp;
    }
    return wrap;
  }
  function render(){
    var nav=document.querySelector('.ms-group-nav');
    groups.forEach(function(g){
      var groupEl=el('section','ms-field-group');groupEl.dataset.group=g[0];
      var heading=el('div','ms-group-heading');heading.appendChild(el('h3',null,g[1]));groupEl.appendChild(heading);
      var grid=el('div','ms-cards');
      defs.filter(function(f){return f.group===g[0]&&!f.retired&&!f.embeddedIn}).forEach(function(f){
        var card=el('article','ms-card');card.dataset.field=f.id;card.dataset.review=state.reviews[f.id]||'pending';
        var proposal=el('div','ms-proposal');
        proposal.appendChild(el('div','ms-section-label','1 · Предлагаемое поле'));
        proposal.appendChild(el('div','ms-entity',f.entity));proposal.appendChild(el('h4',null,f.title));
        proposal.appendChild(el('div','ms-fill-badge ms-fill-'+f.fillMode,f.fillLabel));
        var lab=el('label','ms-value-label','Значение поля — попробуйте варианты');lab.htmlFor='ms-value-'+f.id;proposal.appendChild(lab);proposal.appendChild(buildControl(f));
        proposal.appendChild(el('p','ms-why',f.why));
        if(f.meetingNote)proposal.appendChild(el('p','ms-meeting-label',f.meetingNote));
        if(f.note)proposal.appendChild(el('p','ms-field-note',f.note));
        var det=el('details');det.appendChild(el('summary',null,'Когда заполняем и откуда требование'));det.appendChild(el('p',null,'Когда: '+f.when));det.appendChild(el('p',null,'Основание: '+f.source));proposal.appendChild(det);
        defs.filter(function(child){return child.embeddedIn===f.id}).forEach(function(child){
          var extra=el('details','ms-extra-detail');extra.dataset.parent=f.id;extra.dataset.showWhen=child.showWhen||'';
          extra.appendChild(el('summary',null,child.title+' · при необходимости'));
          extra.appendChild(buildControl(child));extra.appendChild(el('p','ms-muted',child.note||child.why));
          if(child.showWhen){extra.hidden=state.values[f.id]!==child.showWhen;controls[f.id].addEventListener('change',function(){extra.hidden=state.values[f.id]!==child.showWhen});}
          proposal.appendChild(extra);
        });
        card.appendChild(proposal);
        var review=el('div','ms-review');review.appendChild(el('div','ms-section-label','2 · Согласование поля'));
        var rlab=el('label',null,'Нужно ли добавлять это поле в CRM?');rlab.htmlFor='ms-review-'+f.id;review.appendChild(rlab);
        var sel=el('select');sel.id=rlab.htmlFor;sel.setAttribute('aria-label',f.title+' — решение');
        [['pending','Пока не выбрано'],['accept','Согласовать поле'],['discuss','Нужно обсудить'],['omit','Не добавлять поле']].forEach(function(o){var opt=el('option',null,o[1]);opt.value=o[0];sel.appendChild(opt)});
        sel.value=state.reviews[f.id]||'pending';sel.addEventListener('change',function(){state.reviews[f.id]=sel.value;card.dataset.review=sel.value;save(f.id,'review')});review.appendChild(sel);reviewControls[f.id]=sel;
        var clab=el('label',null,'Комментарий / другой вариант');clab.htmlFor='ms-comment-'+f.id;review.appendChild(clab);
        var note=el('textarea');note.id=clab.htmlFor;note.maxLength=400;note.rows=2;note.placeholder='Например: другое название или значение';note.value=state.comments[f.id]||'';note.addEventListener('input',function(){state.comments[f.id]=note.value;save(f.id,'comment')});review.appendChild(note);commentControls[f.id]=note;
        card.appendChild(review);grid.appendChild(card);cards[f.id]=card;
      });
      groupEl.appendChild(grid);rootEl.appendChild(groupEl);
      var b=el('button',null,g[1]);b.type='button';b.dataset.group=g[0];b.addEventListener('click',function(){document.querySelectorAll('.ms-field-group').forEach(function(e){e.hidden=e.dataset.group!==g[0]});nav.querySelectorAll('button').forEach(function(e){e.classList.toggle('on',e===b)});});nav.appendChild(b);
    });
    var all=el('button','on','Все поля · '+defs.filter(function(f){return !f.retired&&!f.embeddedIn}).length);all.type='button';all.dataset.group='all';all.addEventListener('click',function(){document.querySelectorAll('.ms-field-group').forEach(function(e){e.hidden=false});nav.querySelectorAll('button').forEach(function(e){e.classList.toggle('on',e===all)})});nav.prepend(all);
    updateCategory();
  }
  root.MSFields.getLocal=function(){return JSON.parse(JSON.stringify(state));};
  root.MSFields.validChange=function(x){
    var f=defs.find(function(f){return f.id===x.field});if(!f || !Number.isInteger(x.base)||x.base<0)return false;
    if(x.part==='comment')return typeof x.data==='string'&&x.data.length<=400;
    if(x.part==='review')return ['pending','accept','discuss','omit'].indexOf(x.data)>=0;
    if(x.part==='value')return JSON.stringify(allowed(f,x.data))===JSON.stringify(x.data);
    return false;
  };
  root.MSFields.getDefinitions=function(){return defs;};
  root.MSFields.applyCells=function(cells,pending){
    defs.forEach(function(f){['value','review','comment'].forEach(function(part){
      var key=f.id+'.'+part;
      var cell=pending&&pending[key]?{data:pending[key].data}:cells[key],data=cell?cell.data:part==='value'?defaultValue(f):part==='review'?'pending':'';
      if(part==='value'){
        data=allowed(f,data);state.values[f.id]=data;var c=controls[f.id];
        if(!c)return;
        if(f.kind==='multi'){c.querySelectorAll('input').forEach(function(e){e.checked=data.indexOf(e.value)>=0});}
        else if(f.kind==='utm'){c.querySelectorAll('input').forEach(function(e){var k=e.getAttribute('aria-label').slice(4);if(e.value!==(data[k]||''))e.value=data[k]||'';});}
        else if(c.value!==data)c.value=data;
      }else if(part==='review'){
        state.reviews[f.id]=data;if(reviewControls[f.id])reviewControls[f.id].value=data;if(cards[f.id])cards[f.id].dataset.review=data;
      }else{state.comments[f.id]=data;if(commentControls[f.id]&&commentControls[f.id].value!==data)commentControls[f.id].value=data;}
    });});
    document.querySelectorAll('.ms-extra-detail[data-show-when]').forEach(function(e){if(e.dataset.showWhen)e.hidden=state.values[e.dataset.parent]!==e.dataset.showWhen});
    updateCategory();try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
  };
  function printable(f,value){
    if(f.kind==='multi')return value.length?value.join(', '):'Не выбрано';
    if(f.kind==='utm')return ['source','medium','campaign','content','term'].map(function(k){return 'utm_'+k+': '+(value[k]||'не задано')}).join('; ');
    if(f.kind==='select'){var o=f.options.find(function(x){return x[0]===value});return o?o[1]:'Не выбрано';}
    return value||'Не заполнено';
  }
  function exportText(){
    var reviews={pending:'Пока не выбрано',accept:'Согласовать поле',discuss:'Нужно обсудить',omit:'Не добавлять поле'};
    var lines=['МеталлСервис — выбор полей для обсуждения','Редакция предложения: 25.11.2026','Выгружено: '+new Date().toLocaleString('ru-RU',{timeZone:'Asia/Yekaterinburg'}),'Примеры значений не являются настройкой CRM или окончательной приёмкой.','Текущая категория в примере: '+document.getElementById('ms-category').textContent,''];
    groups.forEach(function(g){lines.push(g[1]);defs.filter(function(f){return f.group===g[0]}).forEach(function(f){lines.push('• '+f.title+(f.retired?' [объединено / история]':f.embeddedIn?' [уточнение внутри критерия]':''),'  Где: '+f.entity,'  Пример: '+printable(f,state.values[f.id]),'  Решение: '+reviews[state.reviews[f.id]||'pending']);if(state.comments[f.id])lines.push('  Комментарий: '+state.comments[f.id]);lines.push('')});});
    return lines.join('\n');
  }
  root.MSFields.exportText=exportText;
  document.getElementById('ms-export').addEventListener('click',function(){
    var url=URL.createObjectURL(new Blob(['\uFEFF'+exportText()],{type:'text/plain;charset=utf-8'}));var a=el('a');a.href=url;a.download='metallservis-fields-agreement-20261125.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);status(storageOK?'Итог скачан. Сохранение в этом браузере включено.':'Итог скачан. Выбор в браузере не сохраняется.');
  });
  document.getElementById('ms-reset').addEventListener('click',function(){
    if(!root.confirm('Сбросить все примеры значений, отметки согласования и комментарии в этом браузере?'))return;
    defs.forEach(function(f){state.values[f.id]=defaultValue(f);state.reviews[f.id]='pending';state.comments[f.id]=''});
    rootEl.replaceChildren();document.querySelector('.ms-group-nav').replaceChildren();render();save();
  });
  fetch('fields-data.json?v=20261125-kb1').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(data){
    defs=data;defs.forEach(function(f){state.values[f.id]=defaultValue(f);state.reviews[f.id]='pending';state.comments[f.id]=''});restore();render();
    root.MSFields.ready=true;document.dispatchEvent(new Event('ms-fields-ready'));
    document.getElementById('ms-export').disabled=false;document.getElementById('ms-reset').disabled=false;
    status(storageOK?'Выбор хранится только в этом браузере.':'Браузер не сохраняет выбор. Скачайте итог перед закрытием.');
  }).catch(function(){rootEl.appendChild(el('p','note','Не удалось загрузить поля. Обновите страницу; если ошибка остаётся, сообщите SolutionCRM.'));document.getElementById('ms-export').disabled=true;document.getElementById('ms-reset').disabled=true;});
})(typeof globalThis!=='undefined'?globalThis:this);
