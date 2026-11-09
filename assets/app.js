'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n,c='CAD')=>n==null?'Unavailable':(c==='CAD'?'C$':'US$')+Number(n).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=s=>s?new Date(s).toLocaleString('en-CA',{timeZone:'America/Vancouver',dateStyle:'medium',timeStyle:'short'})+' Pacific':'No observation';
let timer,loading=false;
async function load(){if(loading)return;loading=true;try{const r=await fetch('/published_state.json',{cache:'no-store'});if(!r.ok)throw Error('Published snapshot temporarily unavailable');const s=await r.json(),v=s.valuation,live=s.mode==='yahoo_authorized';
 $('feed').textContent=s.feed_notice+(s.market.refreshing?' Refresh in progress.':'')+(s.market.any_stale_observations?' STALE observations are in use.':'');
 $('asof').textContent=`Reference inputs: ${s.snapshot.model_reference_date} · prepared: ${s.snapshot.prepared_date} · public read-only snapshot`;
 $('timestamps').textContent=live?`Last successful fetch: ${date(s.market.last_success)} · Shared refresh target: five minutes; rate-limit backoff may extend this. Prices below retain their actual market-bar timestamps. No real-time guarantee.`:'Snapshot mode: no quote-provider requests are made. Displayed capital and FX are explicitly static original model references—not live market values.';
 $('capital-label').textContent=v.label;$('capital').textContent=money(v.total_cad);$('coverage').textContent=`${v.priced_count} / ${v.holding_count} rows valued${v.complete?'':' · incomplete; missing values excluded'}`;
 $('count').textContent=v.holding_count;$('planned').textContent=`${s.holdings.filter(h=>h.status==='PLANNED').length} PLANNED · statuses are not independently verified`;
 $('fx').textContent=v.fx_cad_per_usd==null?'Unavailable':v.fx_cad_per_usd.toFixed(5);$('fx-basis').textContent=live?(v.fx_quote?`Observed bar: ${date(v.fx_quote.market_bar_start)}${v.fx_quote.stale?' · STALE':''}`:'Observed FX missing'):'Static original model FX · not a current quote';$('reference').textContent=money(v.reference_total_cad);
 $('holdings').innerHTML=s.holdings.map(h=>`<article class="holding"><h3>${esc(h.symbol)} <small class="status">${esc(h.status)}</small></h3><p class="name">${esc(h.name)}<br>${esc(h.sector)}</p><p class="fine">${live?'Observed position value':'Planned capital · model reference'}</p><div class="quote">${money(h.value_native,h.currency)}</div><div class="row-metrics"><span>CAD equivalent: ${money(h.value_cad)}</span><span>Weight: ${h.weight_cad==null?'—':(h.weight_cad*100).toFixed(2)+'%'}</span></div>${live?`<p class="quote-state">${h.quote?(h.quote.stale?'STALE cached observation':'Observed bar, possibly delayed'):'UNAVAILABLE'}<br>Market bar start: ${esc(date(h.quote?.market_bar_start))}<br>Last fetch: ${esc(date(h.quote?.fetched_at))}</p>`:'<p class="fine">Original model reference · not a confirmed purchase</p>'}</article>`).join('');
 $('sector-note').textContent=v.complete?(live?'CAD weights use the observed prices/FX above, including any flagged stale values.':'CAD weights use original model capital and fixed reference FX. Custom mutually exclusive business categories sum to 100%.'):'Weights hidden until all required observations are available.';
 $('sectors').innerHTML=Object.entries(s.sectors).sort((a,b)=>b[1]-a[1]).map(([name,w])=>`<div class="sector"><div class="sector-label"><span>${esc(name)}</span><span>${(w*100).toFixed(2)}%</span></div><div class="bar"><span style="width:${Math.max(0,Math.min(100,w*100))}%"></span></div></div>`).join('');
 clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden)load()},s.market.refreshing?2500:300000);
 }catch(e){$('feed').textContent=e.message+'; existing display is not refreshed.'}finally{loading=false}}
$('refresh').addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});load();

// Five physical slides, three content pages; portfolio data stays read-only.
(()=>{
 const slides=[...document.querySelectorAll('.slide')],deck=$('deck');
 const nav=[...document.querySelectorAll('[data-page]')],ids=slides.map(s=>s.id);
 let index=0,wheelTotal=0,lastWheel=0,lockedUntil=0,touchStart=null;
 const dialogOpen=()=>!!document.querySelector('dialog[open]');
 function goTo(value){
  const next=Math.max(0,Math.min(slides.length-1,Number(value)));if(!Number.isInteger(next))return;
  const old=slides[index],moveFocus=old?.contains(document.activeElement);index=next;
  deck.style.transform=`translate3d(${-index*100}%,0,0)`;
  $('portfolio-deck').scrollLeft=0;$('portfolio-deck').scrollTop=0;
  slides.forEach((slide,i)=>{slide.inert=i!==index;slide.setAttribute('aria-hidden',String(i!==index))});
  nav.forEach(button=>{if(Number(button.dataset.page)===index)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  const content=[0,2,4].indexOf(index),position=`Slide ${index+1} of ${slides.length}`;
  $('page-counter').textContent=content>=0?`Page ${content+1} of 3 · ${position}`:`Logo transition ${index===1?'1 → 2':'2 → 3'} · ${position}`;
  $('previous-slide').disabled=index===0;$('next-slide').disabled=index===slides.length-1;
  history.replaceState(null,'',`#${ids[index]}`);
  if(moveFocus)slides[index].querySelector('h2')?.focus({preventScroll:true});
 }
 nav.forEach(button=>button.addEventListener('click',()=>goTo(button.dataset.page)));
 $('previous-slide').addEventListener('click',()=>goTo(index-1));$('next-slide').addEventListener('click',()=>goTo(index+1));
 document.addEventListener('keydown',event=>{
  if(dialogOpen()||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();goTo(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1))}
 });
 $('portfolio-deck').addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||dialogOpen()||event.target.closest('[data-scroll-region]'))return;
  const now=performance.now(),scale=event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1;
  const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*scale;if(!delta)return;
  event.preventDefault();if(now<lockedUntil){lastWheel=now;return}
  if(now-lastWheel>220||Math.sign(wheelTotal)!==Math.sign(delta))wheelTotal=0;lastWheel=now;wheelTotal+=delta;
  if(Math.abs(wheelTotal)>=75){goTo(index+Math.sign(wheelTotal));wheelTotal=0;lockedUntil=now+700}
 },{passive:false});
 const viewport=$('portfolio-deck');
 viewport.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||dialogOpen()||event.target.closest('[data-scroll-region],button')){touchStart=null;return}
  touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 viewport.addEventListener('touchend',event=>{
  if(!touchStart||event.touches.length||event.changedTouches.length!==1)return;
  const dx=touchStart.x-event.changedTouches[0].clientX,dy=touchStart.y-event.changedTouches[0].clientY;touchStart=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25){event.preventDefault();goTo(index+Math.sign(dx))}
 },{passive:false});
 viewport.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
 document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.open).showModal()));
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
 window.addEventListener('hashchange',()=>{const found=ids.indexOf(location.hash.slice(1));if(found>=0)goTo(found)});
 goTo(Math.max(0,ids.indexOf(location.hash.slice(1))));
})();
