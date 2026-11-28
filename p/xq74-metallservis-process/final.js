(function(){
  'use strict';
  var lead=document.getElementById('fx-lead'), det=document.getElementById('fx-detail');
  if(!lead||!det)return;
  lead.querySelectorAll('.amo-tabs button').forEach(function(b){
    b.addEventListener('click',function(){
      var p=b.getAttribute('data-p');
      lead.querySelectorAll('.amo-tabs button').forEach(function(x){x.classList.toggle('on',x===b)});
      lead.querySelectorAll('.amo-pane').forEach(function(x){x.hidden=x.getAttribute('data-p')!==p});
    });
  });
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function row(label,text){var r=el('div','row');r.appendChild(el('b',null,label));if(text!=null)r.appendChild(document.createTextNode(text));return r}
  function show(f){
    var d;try{d=JSON.parse(f.getAttribute('data-f'))}catch(e){return}
    document.querySelectorAll('.amo-f.sel').forEach(function(x){x.classList.remove('sel')});
    f.classList.add('sel');
    det.textContent='';
    det.appendChild(el('h3',null,d.n));
    det.appendChild(row('Тип поля',d.t));
    det.appendChild(row('Кто заполняет',d.m));
    if(d.s)det.appendChild(row('Когда',d.s));
    if(d.v&&d.v.length){
      var r=row('Значения',null),c=el('div','amo-chips');
      d.v.forEach(function(v){var n=/\*$/.test(v);c.appendChild(el('span',n?'new':'',v.replace(/\*$/,'')))});
      r.appendChild(c);det.appendChild(r);
    }
    det.appendChild(row('Зачем',d.w));
    if(window.innerWidth<900)det.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  document.querySelectorAll('#p9 .amo-f').forEach(function(f){
    f.addEventListener('click',function(){show(f)});
    f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();show(f)}});
  });
})();
