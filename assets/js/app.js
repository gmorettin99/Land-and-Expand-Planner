/* Piano di ramp-up Factorial IT */
(function(){
  'use strict';
  var KEY = 'fit-rampup-v3';
  var LANG_KEY = 'fit-rampup-lang', LANGS = ['it','en','es','pt','de'];
  var lang = null;
  try{ lang = localStorage.getItem(LANG_KEY); }catch(e){}
  if(LANGS.indexOf(lang)<0){ var nav=(navigator.language||'it').slice(0,2).toLowerCase(); lang=LANGS.indexOf(nav)>-1?nav:'it'; }
  var T = window.I18N[lang];
  var PACKS = [10,15,20];
  var ALERT_RATIO = 2; // la chiusura scatta come alert se supera il doppio della media dei mesi precedenti

  /* ---------- Utility ---------- */
  function pad(n){ return String(n).padStart(2,'0'); }
  function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function uid(){ return Math.random().toString(36).slice(2,8); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function parse(s){ if(!s) return null; var p=s.split('-').map(Number); if(!p[0]||!p[1]) return null; return {y:p[0],m:p[1],d:p[2]||1}; }
  function mIdx(p){ return p.y*12+(p.m-1); }
  function frac(p){ var dim=new Date(p.y,p.m,0).getDate(); return mIdx(p)+(p.d-1)/dim; }
  function mDate(i){ return new Date(Math.floor(i/12),((i%12)+12)%12,1); }
  function lbl(i){ return new Intl.DateTimeFormat(T.locale,{month:'short',year:'2-digit'}).format(mDate(i)).replace('.',''); }
  function lblL(i){ return new Intl.DateTimeFormat(T.locale,{month:'long',year:'numeric'}).format(mDate(i)); }
  function plural(n,unit){ var u=T.units[unit]; return n+' '+(n===1?u[0]:u[1]); }

  /* ---------- Stato ---------- */
  function blank(){
    return {
      today: todayISO(), ob:'', setup:'', pilot:'', cap:3, pct:10, curve:'lin', order:'free',
      price:{open:false,pc:'lap',mob:'mob',sec:'none',disc:0,bill:'m'},
      entities:[{id:uid(),name:'',pc:0,mob:0}],
      tools:[
        {key:'mdm',label:'MDM attuale',scope:'both',on:false,name:'',date:'',ents:[]},
        {key:'edr',label:'EDR attuale',scope:'pc',on:false,name:'',date:'',ents:[]}
      ]
    };
  }
  function example(){
    return {
      price:{open:false,pc:'lap',mob:'mob',sec:'edr',disc:0,bill:'m'},
      today: todayISO(), ob:'2026-11-01', setup:2, pilot:25, cap:3, pct:10, curve:'lin', order:'free',
      entities:[{id:'a',name:T.entity+' A',pc:60,mob:20},{id:'b',name:T.entity+' B',pc:40,mob:15}],
      tools:[
        {key:'mdm',label:'MDM attuale',scope:'both',on:true,name:'ManageEngine',date:'2027-02-01',ents:['a']},
        {key:'edr',label:'EDR attuale',scope:'pc',on:true,name:'SentinelOne',date:'2027-03-01',ents:['a']}
      ]
    };
  }
  var st;
  try{ var raw=localStorage.getItem(KEY); st=raw?JSON.parse(raw):null; }catch(e){ st=null; }
  if(!st||!st.entities||!st.tools) st=blank();
  var dflt=blank(); Object.keys(dflt).forEach(function(k){ if(st[k]===undefined) st[k]=dflt[k]; });
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(e){} }

  function dn(e){ if(e.name&&e.name.trim()) return e.name; var i=st.entities.indexOf(e); return T.entity+' '+String.fromCharCode(65+(i<0?0:i)); }
  function entById(id){ for(var i=0;i<st.entities.length;i++) if(st.entities[i].id===id) return st.entities[i]; return null; }
  function entNames(ids){ var n=ids.map(function(id){ var e=entById(id); return e?dn(e):null; }).filter(Boolean); if(n.length<=1) return n.join(''); return n.slice(0,-1).join(', ')+T.and+n[n.length-1]; }
  function activeTools(){ return st.tools.filter(function(t){ return t.on && parse(t.date) && t.ents.length; }); }
  function toolEnd(t){ var r=frac(parse(t.date)); return Number.isInteger(r)?r:Math.floor(r)+1; } // primo mese senza lo strumento
  function toolActive(t,entId,idx){ return t.on && parse(t.date) && t.ents.indexOf(entId)>-1 && idx<frac(parse(t.date)); }

  function entRenewal(e){ var r=Infinity; activeTools().forEach(function(t){ if(t.ents.indexOf(e.id)>-1) r=Math.min(r,frac(parse(t.date))); }); return r; }
  function ordered(){
    var list=st.entities.map(function(e,i){ return {e:e,i:i,r:entRenewal(e)}; });
    if(st.order==='free') list.sort(function(a,b){ var ha=a.r===Infinity?0:1, hb=b.r===Infinity?0:1; if(ha!==hb) return ha-hb; if(a.r!==b.r) return a.r-b.r; return a.i-b.i; });
    else if(st.order==='soon') list.sort(function(a,b){ if(a.r!==b.r) return a.r-b.r; return a.i-b.i; });
    return list.map(function(x){ return x.e; });
  }

  /* ---------- Simulazione ----------
     Mesi dall'inizio onboarding (set up incluso) fino a "cap": ramp-up graduale.
     Mese obIdx+cap: chiusura, entra tutta la flotta rimanente. */
  function simulate(pct,curve){
    var ob=parse(st.ob); if(!ob) return null;
    var obIdx=mIdx(ob), setup=Math.max(0,st.setup|0), cap=Math.max(1,st.cap|0);
    var rampStart=obIdx+setup, closeIdx=obIdx+cap;
    var ents=st.entities, order=ordered();
    var totPC=0,totMob=0; ents.forEach(function(e){ totPC+=e.pc; totMob+=e.mob; });
    var tot=totPC+totMob;
    var rem={},cum={}; ents.forEach(function(e){ rem[e.id]={pc:e.pc,mob:e.mob}; cum[e.id]={pc:0,mob:0}; });
    var pilot=Math.min(Math.max(0,st.pilot|0),tot);
    var pilotPC=tot?Math.min(totPC,Math.round(pilot*totPC/tot)):0, pilotMob=Math.min(totMob,pilot-pilotPC);
    var basePC=totPC*pct/100, baseMob=totMob*pct/100;
    var firstPC=totPC?Math.max(1,Math.ceil(basePC)):0, firstMob=totMob?Math.max(1,Math.ceil(baseMob)):0;
    function remaining(){ var s=0; for(var k in rem) s+=rem[k].pc+rem[k].mob; return s; }
    function alloc(kind,qty,add){ for(var i=0;i<order.length&&qty>0;i++){ var id=order[i].id, take=Math.min(rem[id][kind],qty); if(take>0){ rem[id][kind]-=take; add[id][kind]+=take; cum[id][kind]+=take; qty-=take; } } }
    var months=[], idx=obIdx;
    while(idx<=closeIdx){
      var add={}; ents.forEach(function(e){ add[e.id]={pc:0,mob:0}; });
      var phase=idx<rampStart?'setup':'ramp';
      if(idx===obIdx){ alloc('pc',pilotPC,add); alloc('mob',pilotMob,add); }
      if(idx===closeIdx){ alloc('pc',Infinity,add); alloc('mob',Infinity,add); phase='close'; }
      else if(idx>=rampStart){
        var mult=curve==='prog'?Math.pow(2,idx-rampStart):1;
        alloc('pc',totPC?Math.max(1,Math.ceil(basePC*mult)):0,add);
        alloc('mob',totMob?Math.max(1,Math.ceil(baseMob*mult)):0,add);
      }
      var c={}; for(var k in cum) c[k]={pc:cum[k].pc,mob:cum[k].mob};
      var sum=0; for(var k2 in add) sum+=add[k2].pc+add[k2].mob;
      months.push({idx:idx,add:add,cum:c,phase:phase,sum:sum});
      if(remaining()===0) break;
      idx++;
    }
    var completion=obIdx, gradual=0, closing=0, before=0, beforeMonths=0;
    months.forEach(function(m){
      if(m.sum>0) completion=m.idx;
      if(m.phase==='close'){ closing=m.sum; }
      else if(m.sum>0){ before+=m.sum; beforeMonths++; if(m.phase==='ramp') gradual++; }
    });
    var avg=beforeMonths?before/beforeMonths:0;
    var jump=closing>0 && (avg===0 || closing>ALERT_RATIO*avg);
    var last=months[months.length-1].cum;
    function cumAt(i,id){ if(i<obIdx) return {pc:0,mob:0}; var k=i-obIdx; if(k>=months.length) return last[id]||{pc:0,mob:0}; return months[k].cum[id]||{pc:0,mob:0}; }
    return {obIdx:obIdx,rampStart:rampStart,closeIdx:closeIdx,totPC:totPC,totMob:totMob,tot:tot,firstPC:firstPC,firstMob:firstMob,
      pilotPC:pilotPC,pilotMob:pilotMob,months:months,completion:completion,gradual:gradual,closing:closing,avg:avg,jump:jump,cumAt:cumAt};
  }

  function inPlatform(sim,idx){ var s=0; st.entities.forEach(function(e){ var c=sim.cumAt(idx,e.id); s+=c.pc+c.mob; }); return s; }
  function overlapAt(sim,idx){
    var s=0, tools=activeTools();
    st.entities.forEach(function(e){
      var c=sim.cumAt(idx,e.id), pcCov=false, mobCov=false;
      tools.forEach(function(t){ if(toolActive(t,e.id,idx)){ pcCov=true; if(t.scope==='both') mobCov=true; } });
      if(pcCov) s+=c.pc; if(mobCov) s+=c.mob;
    });
    return s;
  }
  function evalTool(sim,t){
    var affTot=0; t.ents.forEach(function(id){ var e=entById(id); if(e) affTot+=e.pc+(t.scope==='both'?e.mob:0); });
    function cumAff(i){ var s=0; t.ents.forEach(function(id){ var c=sim.cumAt(i,id); s+=c.pc+(t.scope==='both'?c.mob:0); }); return s; }
    var end=toolEnd(t), lastActive=end-1;
    var remAt=affTot-cumAff(lastActive);
    var doneIdx=null; for(var i=sim.obIdx;i<=sim.completion;i++){ if(cumAff(i)>=affTot){ doneIdx=i; break; } }
    var ovMonths=0; for(var j=sim.obIdx;j<=lastActive;j++){ if(cumAff(j)>0) ovMonths++; }
    return {affTot:affTot,end:end,remAt:remAt,met:remAt<=0,doneIdx:doneIdx,ovMonths:ovMonths,beforeStart:end<=sim.obIdx};
  }
  function renewalsOk(sim){ return activeTools().every(function(t){ return evalTool(sim,t).met; }); }
  function minPct(curve,test){ for(var p=5;p<=100;p+=5){ var s=simulate(p,curve); if(s&&test(s)) return p; } return null; }

  /* ---------- Input ---------- */
  function bindSimple(){
    document.querySelectorAll('[data-k]').forEach(function(el){
      var k=el.getAttribute('data-k'); el.value=st[k];
      el.addEventListener('input',function(){ st[k]=(el.type==='number')?Math.max(0,parseInt(el.value,10)||0):el.value; update(); });
    });
  }
  function renderEnts(){
    document.getElementById('entRows').innerHTML=st.entities.map(function(e){
      return '<tr><td><input type="text" aria-label="'+esc(T.entName)+'" placeholder="'+esc(dn(Object.assign({},e,{name:''})))+'" data-ent="'+e.id+'" data-f="name" value="'+esc(e.name)+'"></td>'+
        '<td><input type="number" min="0" aria-label="'+esc(T.pcOf(dn(e)))+'" placeholder="0" data-ent="'+e.id+'" data-f="pc" value="'+(e.pc||'')+'"></td>'+
        '<td><input type="number" min="0" aria-label="'+esc(T.mobOf(dn(e)))+'" placeholder="0" data-ent="'+e.id+'" data-f="mob" value="'+(e.mob||'')+'"></td>'+
        '<td>'+(st.entities.length>1?'<button class="x" type="button" aria-label="'+esc(T.remove(dn(e)))+'" data-del="'+e.id+'">&times;</button>':'')+'</td></tr>';
    }).join('');
  }
  var entRows=document.getElementById('entRows');
  entRows.addEventListener('input',function(ev){
    var el=ev.target, id=el.getAttribute('data-ent'); if(!id) return;
    var e=entById(id), f=el.getAttribute('data-f');
    e[f]=(f==='name')?el.value:Math.max(0,parseInt(el.value,10)||0);
    if(f==='name') renderTools();
    update();
  });
  entRows.addEventListener('click',function(ev){
    var id=ev.target.getAttribute('data-del'); if(!id) return;
    st.entities=st.entities.filter(function(e){ return e.id!==id; });
    st.tools.forEach(function(t){ t.ents=t.ents.filter(function(x){ return x!==id; }); });
    renderEnts(); renderTools(); update();
  });
  document.getElementById('addEnt').addEventListener('click',function(){
    st.entities.push({id:uid(),name:'',pc:0,mob:0});
    renderEnts(); renderTools(); update();
  });

  function renderTools(){
    document.getElementById('tools').innerHTML=st.tools.map(function(t,ti){
      return '<div class="tool'+(t.on?'':' off')+'">'+
        '<div class="tool-head"><strong>'+esc(T.toolLabel[t.key])+'</strong><label class="switch"><input type="checkbox" data-t="'+ti+'" data-f="on"'+(t.on?' checked':'')+'>'+esc(T.present)+'</label></div>'+
        '<div class="tool-body"><div class="row2">'+
          '<label class="f"><span>'+esc(T.name)+'</span><input type="text" placeholder="'+esc(T.toolPh[t.key])+'" data-t="'+ti+'" data-f="name" value="'+esc(t.name)+'"></label>'+
          '<label class="f"><span>'+esc(T.renewalDate)+'</span><input type="date" data-t="'+ti+'" data-f="date" value="'+esc(t.date)+'"></label>'+
        '</div>'+
        '<label class="f" style="margin-bottom:0"><span>'+esc(T.covered[t.scope])+'</span></label>'+
        '<div class="chips">'+st.entities.map(function(e){ return '<button type="button" class="chip" data-t="'+ti+'" data-chip="'+e.id+'" aria-pressed="'+(t.ents.indexOf(e.id)>-1)+'">'+esc(dn(e))+'</button>'; }).join('')+'</div>'+
        '</div></div>';
    }).join('');
  }
  var toolsBox=document.getElementById('tools');
  toolsBox.addEventListener('input',function(ev){
    var el=ev.target, ti=el.getAttribute('data-t'); if(ti===null) return;
    var t=st.tools[+ti], f=el.getAttribute('data-f');
    if(f==='on'){ t.on=el.checked; el.closest('.tool').classList.toggle('off',!t.on); }
    else t[f]=el.value;
    update();
  });
  toolsBox.addEventListener('click',function(ev){
    var el=ev.target, id=el.getAttribute('data-chip'); if(!id) return;
    var t=st.tools[+el.getAttribute('data-t')], i=t.ents.indexOf(id);
    if(i>-1) t.ents.splice(i,1); else t.ents.push(id);
    el.setAttribute('aria-pressed',String(i===-1));
    update();
  });
  document.getElementById('pack').addEventListener('click',function(ev){
    var b=ev.target.closest('button'); if(!b) return; st.pct=+b.getAttribute('data-p'); update();
  });
  document.getElementById('curve').addEventListener('click',function(ev){
    var b=ev.target.closest('button'); if(!b) return; st.curve=b.getAttribute('data-c'); update();
  });
  function load(next){
    st=next;
    document.querySelectorAll('[data-k]').forEach(function(el){ el.value=st[el.getAttribute('data-k')]; });
    renderEnts(); renderTools(); renderPriceOpts(); syncPriceToggle(); update();
  }
  document.getElementById('reset').addEventListener('click',function(){
    if(isReady()&&!confirm(T.confirmReset)) return;
    load(blank());
  });
  document.getElementById('example').addEventListener('click',function(){ load(example()); });
  document.getElementById('example2').addEventListener('click',function(){ load(example()); });
  function isReady(){ var t=0; st.entities.forEach(function(e){ t+=e.pc+e.mob; }); return !!parse(st.ob)&&t>0; }

  /* ---------- Output ---------- */
  function update(){
    save();
    var totPC=0,totMob=0; st.entities.forEach(function(e){ totPC+=e.pc; totMob+=e.mob; });
    document.getElementById('totPC').textContent=totPC;
    document.getElementById('totMob').textContent=totMob;
    document.querySelectorAll('#curve button').forEach(function(b){ b.setAttribute('aria-pressed',String(b.getAttribute('data-c')===st.curve)); });
    document.getElementById('curveCap').textContent=T.curveCap[st.curve];

    var sim=simulate(st.pct,st.curve);
    var H=document.getElementById('headline'), V=document.getElementById('verdicts');
    var ready=!!sim&&sim.tot>0;
    document.querySelector('main').classList.toggle('is-empty',!ready);
    if(!ready){
      var anyTool=st.tools.some(function(t){ return t.on&&parse(t.date)&&t.ents.length; });
      var done=[!!parse(st.ob),totPC+totMob>0,anyTool];
      var steps=T.steps.map(function(x,i){ return {d:done[i],t:x[0],s:x[1]}; });
      document.getElementById('steps').innerHTML=steps.map(function(x){ return '<li'+(x.d?' class="done"':'')+'><div><b>'+x.t+'</b><span>'+x.s+'</span></div></li>'; }).join('');
      return;
    }

    // Selettore pacchetto
    var hasTools=activeTools().length>0;
    document.getElementById('pack').innerHTML=PACKS.map(function(p){
      var s=simulate(p,st.curve), status;
      if(s.jump) status='<span class="s ko">'+T.status.jump+'</span>';
      else if(hasTools&&!renewalsOk(s)) status='<span class="s ko">'+T.status.over+'</span>';
      else status='<span class="s ok">'+(hasTools?T.status.okTools:T.status.ok)+'</span>';
      var m=s.closing>0?T.packClosing(plural(s.closing,'device')):T.noClosing;
      return '<button type="button" data-p="'+p+'" aria-pressed="'+(st.pct===p)+'"><span class="p">'+p+'%</span><span class="m">'+m+'</span>'+status+'</button>';
    }).join('');

    // Titolo
    var span=sim.completion-sim.obIdx+1;
    H.textContent=T.headline(lblL(sim.completion),sim.tot,plural(span,'month'));

    // Esiti
    var items=[];
    items.push({c:'neutral',h:T.setupLine({ob:lblL(sim.obIdx),pilot:sim.pilotPC+sim.pilotMob>0,pc:sim.pilotPC,mob:sim.pilotMob,
      mode:sim.rampStart<sim.closeIdx?(sim.closeIdx-1===sim.rampStart?'one':'range'):'none',from:lblL(sim.rampStart),to:lblL(sim.closeIdx-1)})});
    if(sim.jump){
      var curveName=T.curveName[st.curve];
      var pSame=minPct(st.curve,function(s){ return !s.jump; });
      var other=st.curve==='prog'?'lin':'prog';
      var pOther=minPct(other,function(s){ return !s.jump; });
      var sugg=[];
      if(pSame&&pSame===pOther) sugg.push(T.suggBoth(pSame));
      else {
        if(pSame) sugg.push(T.suggSame(pSame,curveName));
        if(pOther) sugg.push(T.suggOther(T.curveName[other],pOther));
      }
      items.push({c:'warn',h:T.jumpLine({m:lblL(sim.closeIdx),n:plural(sim.closing,'device'),avg:Math.round(sim.avg),sugg:sugg.join(T.or)})});
    } else if(sim.closing>0){
      items.push({c:'ok',h:T.closeOk(lblL(sim.closeIdx),plural(sim.closing,'device'))});
    }
    st.tools.forEach(function(t){
      if(!t.on) return;
      var nm='<b>'+esc(t.name||T.toolLabel[t.key])+'</b>';
      if(!parse(t.date)){ items.push({c:'neutral',h:T.needDate(nm)}); return; }
      if(!t.ents.length){ items.push({c:'neutral',h:T.needEnts(nm)}); return; }
      var ev=evalTool(sim,t), who=esc(entNames(t.ents)), rn=lblL(Math.floor(frac(parse(t.date))));
      if(ev.beforeStart){ items.push({c:'warn',h:T.beforeStart(nm,rn,who)}); return; }
      if(ev.met){
        items.push({c:'ok',h:T.met({nm:nm,who:who,many:t.ents.length>1,done:lblL(ev.doneIdx),rn:rn,ov:plural(ev.ovMonths,'month'),ovN:ev.ovMonths,end:lblL(ev.end)})});
      } else {
        var mp=minPct(st.curve,function(s){ return evalTool(s,t).met; });
        items.push({c:'warn',h:T.notMet({nm:nm,rn:rn,rem:ev.remAt,who:who,mp:mp,prio:st.order==='free'})});
      }
    });
    V.innerHTML=items.map(function(i){ return '<li class="'+i.c+'"><span>'+i.h+'</span></li>'; }).join('');

    // Numeri chiave
    var t0=parse(st.today), weeks=null;
    if(t0){ var d0=new Date(t0.y,t0.m-1,t0.d), ob=parse(st.ob), d1=new Date(ob.y,ob.m-1,ob.d); weeks=Math.round((d1-d0)/(7*864e5)); }
    document.getElementById('facts').innerHTML=
      '<div><dt>'+T.facts.first+'</dt><dd>'+T.firstVal(sim.firstPC,sim.firstMob)+'</dd></div>'+
      '<div><dt>'+T.facts.gradual+'</dt><dd>'+sim.gradual+'</dd></div>'+
      '<div><dt>'+T.facts.closing+'</dt><dd'+(sim.jump?' class="warn"':'')+'>'+(sim.closing>0?plural(sim.closing,'device'):T.none)+'</dd></div>'+
      '<div><dt>'+T.facts.start+'</dt><dd>'+(weeks===null?lbl(sim.obIdx):(weeks>0?T.inWeeks(weeks):(weeks===0?T.thisWeek:T.started)))+'</dd></div>';

    drawChart(sim);
    drawPlan(sim);
    drawPrice(sim);
  }

  function drawChart(sim){
    var todayP=parse(st.today), todayIdx=todayP?mIdx(todayP):sim.obIdx;
    var start=Math.min(todayIdx,sim.obIdx), end=Math.max(sim.completion,sim.closeIdx);
    activeTools().forEach(function(t){ end=Math.max(end,toolEnd(t)); });
    end=Math.max(end+1,start+5); if(end-start>47) end=start+47;
    var n=end-start+1, W=940, Hh=372, ml=44, mr=18, mt=78, mb=46;
    var cw=(W-ml-mr)/n, bw=Math.min(38,cw*.64);
    var ymax=Math.max(20,Math.ceil(sim.tot*1.12/20)*20);
    function y(v){ return mt+(Hh-mt-mb)*(1-v/ymax); }
    function xAt(f){ return ml+(f-start)*cw; }
    var s='<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="'+esc(T.chartAria)+'">';
    // finestra di ramp-up
    var wx=xAt(sim.obIdx), wx2=xAt(sim.closeIdx);
    if(wx2>wx) s+='<rect class="win" x="'+wx+'" y="'+mt+'" width="'+(wx2-wx)+'" height="'+(y(0)-mt)+'" rx="6"/>';
    for(var g=0;g<=4;g++){ var v=Math.round(ymax*g/4), yy=y(v); s+='<line class="grid" x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yy+'" y2="'+yy+'"/><text class="ax" x="'+(ml-8)+'" y="'+(yy+4)+'" text-anchor="end">'+v+'</text>'; }
    var every=n>24?3:(n>14?2:1);
    for(var i=0;i<n;i++){
      var idx=start+i, tot=inPlatform(sim,idx), ov=overlapAt(sim,idx), clean=tot-ov, cx=ml+(i+.5)*cw, bx=cx-bw/2;
      if(tot>0){
        s+='<rect class="bar b-clean" x="'+bx+'" y="'+y(clean)+'" width="'+bw+'" height="'+(y(0)-y(clean))+'" rx="3"><title>'+esc(T.tipBar(lblL(idx),tot,ov))+'</title></rect>';
        if(ov>0) s+='<rect class="bar b-ov" x="'+bx+'" y="'+y(tot)+'" width="'+bw+'" height="'+(y(clean)-y(tot))+'" rx="3"><title>'+esc(T.tipOv(lblL(idx),ov))+'</title></rect>';
        if(n<=24) s+='<text class="val" x="'+cx+'" y="'+(y(tot)-5)+'" text-anchor="middle">'+tot+'</text>';
      }
      var isClose=idx===sim.closeIdx&&sim.closing>0;
      if(i%every===0||isClose) s+='<text class="ax'+(isClose?' close':'')+'" x="'+cx+'" y="'+(Hh-mb+18)+'" text-anchor="middle">'+lbl(idx)+'</text>';
      if(isClose) s+='<text class="ax close" x="'+cx+'" y="'+(Hh-mb+33)+'" text-anchor="middle">'+esc(T.closeLbl)+'</text>';
    }
    s+='<line class="tot" x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(sim.tot)+'" y2="'+y(sim.tot)+'"/>';
    s+='<text class="tot-l" x="'+(ml+6)+'" y="'+(y(sim.tot)-6)+'" text-anchor="start">'+esc(T.totLbl(sim.tot))+'</text>';

    var mk=[];
    if(todayP) mk.push({f:frac(todayP),t:T.todayMk,c:'var(--muted)',d:'2 3'});
    mk.push({f:frac(parse(st.ob)),t:T.obMk,c:'var(--brand-deep)',d:''});
    activeTools().forEach(function(t){ mk.push({f:frac(parse(t.date)),t:T.renewalMk(t.name||T.toolLabel[t.key]),c:'var(--amber)',d:''}); });
    mk=mk.filter(function(m){ return m.f>=start&&m.f<=end+1; }).sort(function(a,b){ return a.f-b.f; });
    var lanes=[-Infinity,-Infinity,-Infinity];
    mk.forEach(function(m){
      var x=xAt(m.f), w=m.t.length*6.4+8, lane=2;
      for(var L=0;L<3;L++){ if(x>lanes[L]+6){ lane=L; break; } }
      var anchorEnd=x+w>W-mr, lx=anchorEnd?x-4:x+4;
      lanes[lane]=anchorEnd?x:x+w;
      var ly=16+lane*18;
      s+='<line class="mk" x1="'+x+'" x2="'+x+'" y1="'+(ly+4)+'" y2="'+y(0)+'" stroke="'+m.c+'"'+(m.d?' stroke-dasharray="'+m.d+'"':'')+'/>';
      s+='<text class="mk-l" x="'+lx+'" y="'+ly+'" fill="'+m.c+'" text-anchor="'+(anchorEnd?'end':'start')+'">'+esc(m.t)+'</text>';
    });
    s+='</svg>';
    document.getElementById('chart').innerHTML=s;
  }

  function drawPlan(sim){
    var ends={}; activeTools().forEach(function(t){ var e=toolEnd(t); (ends[e]=ends[e]||[]).push(t.name||T.toolLabel[t.key]); });
    var rows=sim.months.map(function(m){
      var pc=0,mob=0,who=[];
      st.entities.forEach(function(e){ var a=m.add[e.id]; if(!a) return; pc+=a.pc; mob+=a.mob; if(a.pc||a.mob){ var parts=[]; if(a.pc) parts.push(a.pc+' '+T.pc); if(a.mob) parts.push(plural(a.mob,'phone')); who.push(esc(dn(e))+': '+parts.join(', ')); } });
      var tag;
      if(m.phase==='close') tag='<span class="tag close">'+T.tag.close+'</span>';
      else if(m.phase==='setup') tag='<span class="tag setup">'+T.tag.setup+'</span>';
      else tag='<span class="tag">'+T.tag.ramp+'</span>';
      if(m.idx===sim.completion&&m.phase!=='close') tag+=' <span class="tag">'+T.tag.full+'</span>';
      var endTag=ends[m.idx]?' <span class="tag end">'+esc(T.without(ends[m.idx].join(T.and)))+'</span>':'';
      return '<tr'+(m.phase==='close'&&sim.jump?' class="close"':'')+'><td>'+lblL(m.idx)+'</td><td>'+tag+endTag+'</td><td class="n">'+pc+'</td><td class="n">'+mob+'</td><td class="n">'+inPlatform(sim,m.idx)+'</td><td class="who">'+(who.join('<br>')||T.envSetup)+'</td></tr>';
    });
    document.getElementById('plan').innerHTML='<table class="plan"><thead><tr><th>'+T.planH[0]+'</th><th>'+T.planH[1]+'</th><th class="n">'+T.planH[2]+'</th><th class="n">'+T.planH[3]+'</th><th class="n">'+T.planH[4]+'</th><th>'+T.planH[5]+'</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
  }

  /* ---------- Proiezione a prezzo di listino ---------- */
  var P=window.PRICING;
  function money(v){ return new Intl.NumberFormat(T.locale,{style:'currency',currency:P.currency,maximumFractionDigits:2,minimumFractionDigits:2}).format(v); }
  function unitPrices(){
    var pr=st.price;
    return {pc:(P.pc[pr.pc]||0)+(pr.sec==='edr'?P.sec.edr:0)+(pr.sec==='mdr'?P.sec.edr+P.sec.mdr:0), mob:P.mob[pr.mob]||0,
      mult:(1-Math.min(P.maxDiscount,Math.max(0,+pr.disc||0))/100)*(pr.bill==='y'?P.annualFactor:1)};
  }
  function opt(v,label,price,cur){ return '<option value="'+v+'"'+(v===cur?' selected':'')+'>'+esc(label)+(price?' · '+esc(money(price).replace(/[.,]00(?=\D|$)/,''))+' '+esc(T.perDev):'')+'</option>'; }
  function renderPriceOpts(){
    var pr=st.price;
    document.getElementById('priceOpts').innerHTML=
      '<label class="f"><span>'+esc(T.optPc)+'</span><select data-p="pc">'+opt('lap',T.modLap,P.pc.lap,pr.pc)+opt('intune',T.modIntune,P.pc.intune,pr.pc)+opt('none',T.noneOpt,0,pr.pc)+'</select></label>'+
      '<label class="f"><span>'+esc(T.optMob)+'</span><select data-p="mob">'+opt('mob',T.modMob,P.mob.mob,pr.mob)+opt('none',T.noneOpt,0,pr.mob)+'</select></label>'+
      '<label class="f"><span>'+esc(T.optSec)+'</span><select data-p="sec">'+opt('none',T.noneOpt,0,pr.sec)+opt('edr',T.modEdr,P.sec.edr,pr.sec)+opt('mdr',T.modMdr,P.sec.edr+P.sec.mdr,pr.sec)+'</select></label>'+
      '<label class="f"><span>'+esc(T.optDisc)+'</span><input type="number" min="0" max="'+P.maxDiscount+'" placeholder="0" data-p="disc" value="'+(pr.disc||'')+'"></label>'+
      '<label class="f"><span>'+esc(T.optBill)+'</span><select data-p="bill">'+opt('m',T.billM,0,pr.bill)+opt('y',T.billY,0,pr.bill)+'</select></label>';
  }
  function syncPriceToggle(){
    var b=document.getElementById('priceToggle'), open=!!st.price.open;
    b.textContent=open?T.priceHide:T.priceShow; b.setAttribute('aria-expanded',String(open));
    document.getElementById('priceBody').hidden=!open;
  }
  document.getElementById('priceToggle').addEventListener('click',function(){ st.price.open=!st.price.open; syncPriceToggle(); update(); });
  document.getElementById('priceOpts').addEventListener('input',function(ev){
    var k=ev.target.getAttribute('data-p'); if(!k) return;
    if(k==='disc'){ var d=Math.max(0,parseFloat(ev.target.value)||0); if(d>P.maxDiscount){ d=P.maxDiscount; ev.target.value=d; } st.price.disc=d; }
    else st.price[k]=ev.target.value;
    update();
  });
  function kindAt(sim,idx){ var pc=0,mob=0; st.entities.forEach(function(e){ var c=sim.cumAt(idx,e.id); pc+=c.pc; mob+=c.mob; }); return {pc:pc,mob:mob}; }
  function drawPrice(sim){
    if(!st.price.open) return;
    var u=unitPrices(), F=document.getElementById('priceFacts'), TB=document.getElementById('priceTable');
    if(u.pc===0&&u.mob===0){ F.innerHTML=''; TB.innerHTML='<div class="empty">'+esc(T.priceEmpty)+'</div>'; return; }
    function cost(k){ return {pc:k.pc*u.pc*u.mult, mob:k.mob*u.mob*u.mult}; }
    var full=cost({pc:sim.totPC,mob:sim.totMob}), fullTot=full.pc+full.mob;
    var cum=0, rampCost=0, y1=0, rows=[];
    for(var i=sim.obIdx;i<=Math.max(sim.obIdx+11,sim.completion);i++){
      var k=kindAt(sim,i), c=cost(k), t=c.pc+c.mob; if(i<sim.obIdx+12) y1+=t;
      if(i<=sim.completion){
        cum+=t; rampCost+=t;
        var mo=sim.months[i-sim.obIdx], added=mo?mo.sum:0;
        rows.push('<tr'+(i===sim.completion?' class="full"':'')+'><td>'+lblL(i)+(i===sim.completion?' <span class="tag">'+esc(T.fullRow)+'</span>':'')+'</td><td class="n new">'+(added?'+'+added:'–')+'</td><td class="n">'+k.pc+'</td><td class="n">'+k.mob+'</td><td class="n">'+money(c.pc)+'</td><td class="n">'+money(c.mob)+'</td><td class="n"><b>'+money(t)+'</b></td><td class="n">'+money(cum)+'</td></tr>');
      }
    }
    var save=fullTot*12-y1;
    F.innerHTML='<div><dt>'+esc(T.pf.full)+'</dt><dd>'+money(fullTot)+'</dd></div>'+
      '<div><dt>'+esc(T.pf.ramp)+'</dt><dd>'+money(rampCost)+'</dd></div>'+
      '<div><dt>'+esc(T.pf.y1)+'</dt><dd>'+money(y1)+'</dd></div>'+
      '<div><dt>'+esc(T.pf.save)+'</dt><dd class="good">'+money(save)+'</dd></div>';
    var H=T.priceH;
    TB.innerHTML='<table class="plan"><thead><tr><th>'+H[0]+'</th>'+H.slice(1).map(function(h){ return '<th class="n">'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>';
  }

  function applyStatic(){
    document.documentElement.lang=lang;
    document.title=T.title;
    document.querySelectorAll('[data-i18n]').forEach(function(el){ var v=T[el.getAttribute('data-i18n')]; if(typeof v==='string') el.textContent=v; });
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el){ var v=T[el.getAttribute('data-i18n-aria')]; if(typeof v==='string') el.setAttribute('aria-label',v); });
    document.getElementById('lang').value=lang;
  }
  document.getElementById('lang').addEventListener('change',function(ev){
    if(LANGS.indexOf(ev.target.value)<0) return;
    lang=ev.target.value; T=window.I18N[lang];
    var defaultName=new RegExp('^('+LANGS.map(function(l){ return window.I18N[l].entity; }).join('|')+') ([A-Z])$');
    st.entities.forEach(function(e){ var m=defaultName.exec(e.name||''); if(m) e.name=T.entity+' '+m[2]; });
    try{ localStorage.setItem(LANG_KEY,lang); }catch(e){}
    applyStatic(); renderEnts(); renderTools(); renderPriceOpts(); syncPriceToggle(); update();
  });

  applyStatic(); bindSimple(); renderEnts(); renderTools(); renderPriceOpts(); syncPriceToggle(); update();
})();
