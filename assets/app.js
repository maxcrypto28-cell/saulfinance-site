'use strict';
const $=id=>document.getElementById(id);
const MOBILE=window.matchMedia?window.matchMedia('(max-width: 1023px)'):{matches:false,addEventListener(){}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const displayTicker=s=>String(s??'').replace(/\.TO$/i,'').replace('CRT-UN','CRT.UN');
function stockAnalysisUrl(h){
  const sym=String(h?.symbol||'');
  if(!sym)return '';
  const tsx=(h?.currency==='CAD')||/\.TO$/i.test(sym);
  const ticker=displayTicker(sym);
  if(!ticker)return '';
  return tsx?`https://stockanalysis.com/quote/tsx/${encodeURIComponent(ticker)}/`:`https://stockanalysis.com/stocks/${encodeURIComponent(ticker.toLowerCase())}/`;
}
function saNameLink(h,text,cls){
  const label=text??h?.name??'';
  const url=stockAnalysisUrl(h);
  const klass=cls?` class="${cls}"`:'';
  if(!url)return `<span${klass}>${esc(label)}</span>`;
  const title=h?.name?` title="${esc(h.name)}"`:'';
  return `<a${klass}${title} href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}
const money=(n,c='CAD')=>n==null?'Unavailable':(c==='CAD'?'C$':'US$')+Number(n).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=s=>s?new Date(s).toLocaleString('en-CA',{timeZone:'America/Vancouver',dateStyle:'medium',timeStyle:'short'})+' Pacific':'No observation';
let timer,loading=false;
async function load(){if(loading)return;loading=true;try{const r=await fetch('/published_state.json',{cache:'no-store'});if(!r.ok)throw Error('Published snapshot temporarily unavailable');const s=await r.json(),v=s.valuation,live=s.mode==='yahoo_authorized';
 $('feed').textContent=s.feed_notice+(s.market.refreshing?' Refresh in progress.':'')+(s.market.any_stale_observations?' STALE observations are in use.':'');
 $('asof').textContent=`Reference inputs: ${s.snapshot.model_reference_date} · prepared: ${s.snapshot.prepared_date} · public read-only snapshot`;
 $('timestamps').textContent=live?`Last successful fetch: ${date(s.market.last_success)} · Shared refresh target: five minutes; rate-limit backoff may extend this. Prices below retain their actual market-bar timestamps. No real-time guarantee.`:'Snapshot mode: no quote-provider requests are made. Displayed capital and FX are the Nov 9, 2026 Wealthsimple TFSA market snapshot—not a live licensed quote feed.';
 $('capital-label').textContent=v.label;$('capital').textContent=money(v.total_cad);$('coverage').textContent=`${v.priced_count} / ${v.holding_count} rows valued${v.complete?'':' · incomplete; missing values excluded'}`;
 $('count').textContent=v.holding_count;$('planned').textContent=`${s.holdings.filter(h=>h.status==='ACTUAL').length || s.holdings.length} ACTUAL · Wealthsimple TFSA snapshot`;
 $('fx').textContent=v.fx_cad_per_usd==null?'Unavailable':v.fx_cad_per_usd.toFixed(5);$('fx-basis').textContent=live?(v.fx_quote?`Observed bar: ${date(v.fx_quote.market_bar_start)}${v.fx_quote.stale?' · STALE':''}`:'Observed FX missing'):'Snapshot FX (live USDCAD at publish) · not continuously refreshed';$('reference').textContent=money(v.reference_total_cad);
 $('holdings').innerHTML=s.holdings.map(h=>`<article class="holding"><h3 data-hot-symbol="${esc(displayTicker(h.symbol))}">${esc(h.symbol)} <small class="status">${esc(h.status)}</small></h3><p class="name">${saNameLink(h,h.name,"sa-link")}<br>${esc(h.sector)}</p><p class="fine">${live?'Observed position value':'Snapshot market value · Nov 9, 2026'}</p><div class="quote">${money(h.value_native,h.currency)}</div><div class="row-metrics"><span>CAD equivalent: ${money(h.value_cad)}</span><span>Weight: ${h.weight_cad==null?'—':(h.weight_cad*100).toFixed(2)+'%'}</span></div>${live?`<p class="quote-state">${h.quote?(h.quote.stale?'STALE cached observation':'Observed bar, possibly delayed'):'UNAVAILABLE'}<br>Market bar start: ${esc(date(h.quote?.market_bar_start))}<br>Last fetch: ${esc(date(h.quote?.fetched_at))}</p>`:'<p class="fine">Wealthsimple TFSA snapshot · not a live quote</p>'}</article>`).join('');
 const sectorNote=$('sector-note');if(sectorNote)sectorNote.textContent=v.complete?(live?'CAD weights use the observed prices/FX above, including any flagged stale values.':'CAD weights use Nov 9, 2026 snapshot market values and publish-time FX. Custom mutually exclusive business categories sum to 100%.'):'Weights hidden until all required observations are available.';
 const bySector={};for(const h of s.holdings){(bySector[h.sector]=bySector[h.sector]||[]).push(h)}
 const sectorRows=$('sector-rows');if(sectorRows)sectorRows.innerHTML=Object.entries(s.sectors).sort((a,b)=>b[1]-a[1]).map(([name,w])=>{
  const members=(bySector[name]||[]).slice().sort((a,b)=>(b.weight_cad||0)-(a.weight_cad||0));
  const tickers=members.map(h=>{const t=displayTicker(h.symbol);const pct=h.weight_cad==null?'':` · ${(h.weight_cad*100).toFixed(1)}%`;return saNameLink(h,`${t}${pct}`,'sector-ticker sa-link').replace(/^<(a|span)\b/, `<$1 data-hot-symbol="${esc(t)}"`)}).join('');
  const count=members.length;
  return `<article class="sector"><div class="sector-label"><span>${esc(name)}</span><span>${(w*100).toFixed(2)}%</span></div><div class="bar"><span style="width:${Math.max(0,Math.min(100,w*100))}%"></span></div><div class="sector-holdings" aria-label="${esc(name)} holdings">${tickers||'<span class="muted">No holdings</span>'}</div><p class="sector-count">${count} holding${count===1?'':'s'}</p></article>`;
 }).join('');
 await renderDesktop(s);if(typeof paintHotOtd==='function')paintHotOtd();clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden)load()},s.market.refreshing?2500:300000);
 }catch(e){$('feed').textContent=e.message+'; existing display is not refreshed.'}finally{loading=false}}
$('refresh').addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});load();

// Nine physical panels; ONLY the five content panels are navigation destinations.
(()=>{
 const slides=[...document.querySelectorAll('.slide')],deck=$('deck'),stops=[0,2,4,6,8];
 const nav=[...document.querySelectorAll('[data-page]')],ids=stops.map(i=>slides[i].id);
 const motion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
 const GLIDE_MS=900,WHEEL_IDLE_MS=260,MIN_WHEEL_PX=4;
 let page=0,lockedUntil=0,lastWheel=-Infinity,wheelConsumed=false,touchStart=null;
 const dialogOpen=()=>!!document.querySelector('dialog[open]');
 const moving=()=>!motion.matches&&performance.now()<lockedUntil;
 function goTo(value,instant=false){
  const next=Math.max(0,Math.min(stops.length-1,Number(value)));if(!Number.isInteger(next)||(!instant&&moving()))return false;
  if(!instant&&next===page)return false;
  const old=slides[stops[page]],moveFocus=old?.contains(document.activeElement);page=next;
  lockedUntil=performance.now()+(instant||motion.matches?0:GLIDE_MS);
  const previousTransition=deck.style.transition;if(instant)deck.style.transition='none';
  deck.style.transform=`translate3d(${-stops[page]*100}%,0,0)`;
  if(instant){void deck.offsetWidth;deck.style.transition=previousTransition||''}
  $('portfolio-deck').scrollLeft=0;$('portfolio-deck').scrollTop=0;
  if(MOBILE.matches&&!instant)slides[stops[page]].scrollTop=0;
  slides.forEach((slide,i)=>{const active=i===stops[page];slide.inert=!active;slide.setAttribute('aria-hidden',String(!active))});
  nav.forEach(button=>{if(Number(button.dataset.page)===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  $('page-counter').textContent=`Page ${page+1} of ${stops.length}`;
  $('previous-slide').disabled=page===0;$('next-slide').disabled=page===stops.length-1;
  history.replaceState(null,'',`#${ids[page]}`);
  if(moveFocus)slides[stops[page]].querySelector('h2')?.focus({preventScroll:true});
  return true;
 }
 nav.forEach(button=>button.addEventListener('click',()=>goTo(button.dataset.page)));
 $('previous-slide').addEventListener('click',()=>goTo(page-1));$('next-slide').addEventListener('click',()=>goTo(page+1));
 document.addEventListener('keydown',event=>{
  if(dialogOpen()||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
   if(event.cancelable)event.preventDefault();
   if(!event.repeat)goTo(event.key==='Home'?0:event.key==='End'?stops.length-1:page+(event.key==='ArrowRight'?1:-1));
  }
 });
 const viewport=$('portfolio-deck');
 viewport.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||dialogOpen()||event.target.closest('[data-scroll-region]'))return;
  // Mobile pages scroll vertically; only a horizontal wheel/trackpad gesture changes pages there.
  if(MOBILE.matches&&Math.abs(event.deltaY)>=Math.abs(event.deltaX))return;
  const now=performance.now(),scale=event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1;
  const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*scale;if(!delta)return;
  if(now-lastWheel>WHEEL_IDLE_MS)wheelConsumed=false;lastWheel=now;
  if(event.cancelable)event.preventDefault();
  if(moving()){wheelConsumed=true;return}
  if(wheelConsumed||Math.abs(delta)<MIN_WHEEL_PX)return;
  // A single ordinary wheel event commits a complete page glide. Momentum cannot add a second page.
  wheelConsumed=true;goTo(page+Math.sign(delta));
 },{passive:false});
 viewport.addEventListener('touchstart',event=>{
  const region=event.target.closest('[data-scroll-region]'),mobileRegion=region&&MOBILE.matches&&region.scrollWidth<=region.clientWidth+1;
  if(event.touches.length!==1||moving()||dialogOpen()||event.target.closest('button')||(region&&!mobileRegion)){touchStart=null;return}
  touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 viewport.addEventListener('touchend',event=>{
  const start=touchStart;touchStart=null;
  if(!start||event.touches.length||event.changedTouches.length!==1)return;
  const dx=start.x-event.changedTouches[0].clientX,dy=start.y-event.changedTouches[0].clientY;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25){if(event.cancelable)event.preventDefault();goTo(page+Math.sign(dx))}
 },{passive:false});
 viewport.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
 document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.open).showModal()));
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
 function pageForHash(){const hash=location.hash.slice(1),found=ids.indexOf(hash);if(found>=0)return found;const physical=slides.findIndex(s=>s.id===hash);return physical>=0?Math.min(stops.length-1,Math.ceil(physical/2)):0}
 window.addEventListener('hashchange',()=>{if(!goTo(pageForHash()))history.replaceState(null,'',`#${ids[page]}`)});
 goTo(pageForHash(),true);
})();

const MODEL_DISPLAY={"monthly":[["Jan",306.5352860552,286.54999314692],["Feb",220.27041925000003,199.9465395625],["Mar",579.0290366777,546.754811276045],["Apr",230.51533525,217.9280349625],["May",251.16495025,230.2118909125],["Jun",579.0290366777,546.754811276045],["Jul",253.02080424999997,241.0626836125],["Aug",220.27041925000003,199.9465395625],["Sep",583.2235676777,550.320162626045],["Oct",253.02080424999997,241.0626836125],["Nov",220.27041925000003,199.9465395625],["Dec",529.7090858725,504.832853091625]],"annual":[["Bearish",1,3040.922312061721,2843.1683072530604,98839.81792042643,-0.12746834533183193],["Bearish",2,3135.3978049698617,2936.7928705980858,102037.51920783415,-0.099239887872687],["Bearish",3,3294.4450379248146,3086.1052225413086,108053.3187271208,-0.04613400788269173],["Bearish",4,3464.522074094691,3248.482715009007,115161.67933226643,0.01661671112186003],["Bearish",5,3668.391141871632,3437.7345760516055,121755.71541309974,0.07482710986200236],["Neutral",1,3528.2542293332426,3292.014024319578,122337.4077015088,0.07996213485083703],["Neutral",2,3772.05028301782,3523.5326540417354,132367.13586383127,0.1685019105552863],["Neutral",3,4023.747231034638,3758.9522229503427,142576.36341694836,0.25862625919559457],["Neutral",4,4272.717506040086,3991.7368564620465,154132.20001645316,0.3606381147552473],["Neutral",5,4559.018826643058,4258.935779925718,165718.89420769038,0.46292237293703975],["Bullish",1,3623.259993775615,3381.5533356662913,128184.55499242317,0.1315791977731644],["Bullish",2,3991.125703344346,3729.7644671796525,145142.0809183089,0.28127573168526965],["Bullish",3,4382.258816573044,4097.181338642599,163575.20286470393,0.4439984352573929],["Bullish",4,4786.969511313348,4475.3172536226,184785.31124060167,0.6312356372908119],["Bullish",5,5254.653753414544,4912.888654963636,207616.47451287173,0.8327830812975456]],"paths":{"Bearish":[112146.34043553405,110811.98826531622,109443.52623834036,108357.12722106269,107043.46953132116,105753.87793726262,104714.58587273868,103472.32179521224,102204.90979167879,101233.13092697781,100049.66947567399,98839.81792042643,99249.74312022806,99462.51938709,99621.02897571678,100045.69592686219,100240.88708896196,100445.93398485154,100875.90502458808,101090.88987240999,101263.29304667209,101693.38454648253,101892.1919306601,102037.51920783415,102687.66034656546,103133.60700621636,103511.99710646935,104148.74469234332,104559.53353301098,104968.85859609437,105609.33541486792,106054.95458342046,106453.61099831463,107136.03515219211,107616.75613333269,108053.3187271208,108772.36407751842,109312.7842540555,109790.09433262672,110549.38701884501,111085.00886913866,111621.3914183213,112391.98133329277,112942.98898558751,113425.86924348302,114192.14646445512,114714.20118613158,115161.67933226643,115886.12416257644,116382.7334214197,116795.53786256225,117492.20936618521,117932.19255772805,118376.01588250037,119076.7819400763,119555.71537001629,119988.41103236479,120738.91190599003,121267.3000989456,121755.71541309974],"Neutral":[114192.47641390325,114857.1292536101,115472.84730102375,116395.33670329864,117038.71167365547,117706.57239936953,118645.60238829051,119326.29203285345,119977.30697188497,120950.30640375972,121661.64250290592,122337.4077015088,123341.48541821392,124098.95291787418,124803.87562076125,125835.2681515727,126567.86088125597,127328.3076585841,128371.17358547816,129132.54810866414,129847.33161352799,130904.46162981716,131660.82979432226,132367.13586383127,133424.09314811337,134180.95515435725,134868.47062276033,135904.99594929052,136615.49621767833,137349.22973941662,138395.11725476474,139159.96009008918,139880.75149843202,140982.99266168333,141805.14886022787,142576.36341694836,143750.37671601004,144612.5485475213,145418.45463218106,146607.34494468174,147463.52513693922,148332.91169603166,149535.54140806114,150421.92840343493,151239.37981362955,152453.8640648636,153329.88674436262,154132.20001645316,155355.4379678854,156203.50947413102,156974.2406085563,158149.36692862972,158960.77460698338,159777.47978095018,160961.16244848934,161833.26942777468,162641.01348719827,163893.79469193393,164838.99512150904,165718.89420769038],"Bullish":[114647.2950651813,115766.1869328458,116837.99927017845,118233.9732773308,119350.95883251134,120501.43848126831,121933.86057934118,123110.05047504752,124265.38820656175,125754.61916802434,126982.43477571166,128184.55499242317,129741.80098402286,131038.94241063284,132287.8028994177,133883.73419925052,135173.1919491179,136500.92376860895,138131.0174218621,139474.5455353485,140779.39888310793,142451.3372165944,143817.5160288573,145142.0809183089,146860.7149563469,148269.68630746132,149614.0339928677,151342.92310872045,152718.6386218889,154128.40105859912,155881.00435773132,157328.41668544838,158736.80028358684,160564.20172150314,162089.16674305932,163575.20286470393,165522.5542449971,167126.75490464683,168680.913374096,170670.5461359096,172297.30021078934,173953.39290579606,175991.59852013772,177687.14019554647,179321.5432681036,181410.0279374556,183131.21212540194,184785.31124060167,186943.24960527485,188677.06438466645,190335.2290422559,192465.02332601554,194179.78056454932,195911.40480939602,198069.63197993423,199871.5613785776,201610.2092169194,203866.12775594447,205772.1043448722,207616.47451287173]},"source_note":"Holdings/monthly income reflect actual Wealthsimple TFSA basket (26 names, Nov 9 2026 snapshot); multi-year paths remain original illustrative v3 scenarios."};
const OPEN_CALENDAR={"start":1767243600000,"end":1830315599000,"sessions":[[1767364200000,"NYSE + TSX"],[1767623400000,"NYSE + TSX"],[1767709800000,"NYSE + TSX"],[1767796200000,"NYSE + TSX"],[1767882600000,"NYSE + TSX"],[1767969000000,"NYSE + TSX"],[1768228200000,"NYSE + TSX"],[1768314600000,"NYSE + TSX"],[1768401000000,"NYSE + TSX"],[1768487400000,"NYSE + TSX"],[1768573800000,"NYSE + TSX"],[1768833000000,"TSX"],[1768919400000,"NYSE + TSX"],[1769005800000,"NYSE + TSX"],[1769092200000,"NYSE + TSX"],[1769178600000,"NYSE + TSX"],[1769437800000,"NYSE + TSX"],[1769524200000,"NYSE + TSX"],[1769610600000,"NYSE + TSX"],[1769697000000,"NYSE + TSX"],[1769783400000,"NYSE + TSX"],[1770042600000,"NYSE + TSX"],[1770129000000,"NYSE + TSX"],[1770215400000,"NYSE + TSX"],[1770301800000,"NYSE + TSX"],[1770388200000,"NYSE + TSX"],[1770647400000,"NYSE + TSX"],[1770733800000,"NYSE + TSX"],[1770820200000,"NYSE + TSX"],[1770906600000,"NYSE + TSX"],[1770993000000,"NYSE + TSX"],[1771338600000,"NYSE + TSX"],[1771425000000,"NYSE + TSX"],[1771511400000,"NYSE + TSX"],[1771597800000,"NYSE + TSX"],[1771857000000,"NYSE + TSX"],[1771943400000,"NYSE + TSX"],[1772029800000,"NYSE + TSX"],[1772116200000,"NYSE + TSX"],[1772202600000,"NYSE + TSX"],[1772461800000,"NYSE + TSX"],[1772548200000,"NYSE + TSX"],[1772634600000,"NYSE + TSX"],[1772721000000,"NYSE + TSX"],[1772807400000,"NYSE + TSX"],[1773063000000,"NYSE + TSX"],[1773149400000,"NYSE + TSX"],[1773235800000,"NYSE + TSX"],[1773322200000,"NYSE + TSX"],[1773408600000,"NYSE + TSX"],[1773667800000,"NYSE + TSX"],[1773754200000,"NYSE + TSX"],[1773840600000,"NYSE + TSX"],[1773927000000,"NYSE + TSX"],[1774013400000,"NYSE + TSX"],[1774272600000,"NYSE + TSX"],[1774359000000,"NYSE + TSX"],[1774445400000,"NYSE + TSX"],[1774531800000,"NYSE + TSX"],[1774618200000,"NYSE + TSX"],[1774877400000,"NYSE + TSX"],[1774963800000,"NYSE + TSX"],[1775050200000,"NYSE + TSX"],[1775136600000,"NYSE + TSX"],[1775482200000,"NYSE + TSX"],[1775568600000,"NYSE + TSX"],[1775655000000,"NYSE + TSX"],[1775741400000,"NYSE + TSX"],[1775827800000,"NYSE + TSX"],[1776087000000,"NYSE + TSX"],[1776173400000,"NYSE + TSX"],[1776259800000,"NYSE + TSX"],[1776346200000,"NYSE + TSX"],[1776432600000,"NYSE + TSX"],[1776691800000,"NYSE + TSX"],[1776778200000,"NYSE + TSX"],[1776864600000,"NYSE + TSX"],[1776951000000,"NYSE + TSX"],[1777037400000,"NYSE + TSX"],[1777296600000,"NYSE + TSX"],[1777383000000,"NYSE + TSX"],[1777469400000,"NYSE + TSX"],[1777555800000,"NYSE + TSX"],[1777642200000,"NYSE + TSX"],[1777901400000,"NYSE + TSX"],[1777987800000,"NYSE + TSX"],[1778074200000,"NYSE + TSX"],[1778160600000,"NYSE + TSX"],[1778247000000,"NYSE + TSX"],[1778506200000,"NYSE + TSX"],[1778592600000,"NYSE + TSX"],[1778679000000,"NYSE + TSX"],[1778765400000,"NYSE + TSX"],[1778851800000,"NYSE + TSX"],[1779111000000,"NYSE"],[1779197400000,"NYSE + TSX"],[1779283800000,"NYSE + TSX"],[1779370200000,"NYSE + TSX"],[1779456600000,"NYSE + TSX"],[1779715800000,"TSX"],[1779802200000,"NYSE + TSX"],[1779888600000,"NYSE + TSX"],[1779975000000,"NYSE + TSX"],[1780061400000,"NYSE + TSX"],[1780320600000,"NYSE + TSX"],[1780407000000,"NYSE + TSX"],[1780493400000,"NYSE + TSX"],[1780579800000,"NYSE + TSX"],[1780666200000,"NYSE + TSX"],[1780925400000,"NYSE + TSX"],[1781011800000,"NYSE + TSX"],[1781098200000,"NYSE + TSX"],[1781184600000,"NYSE + TSX"],[1781271000000,"NYSE + TSX"],[1781530200000,"NYSE + TSX"],[1781616600000,"NYSE + TSX"],[1781703000000,"NYSE + TSX"],[1781789400000,"NYSE + TSX"],[1781875800000,"TSX"],[1782135000000,"NYSE + TSX"],[1782221400000,"NYSE + TSX"],[1782307800000,"NYSE + TSX"],[1782394200000,"NYSE + TSX"],[1782480600000,"NYSE + TSX"],[1782739800000,"NYSE + TSX"],[1782826200000,"NYSE + TSX"],[1782912600000,"NYSE"],[1782999000000,"NYSE + TSX"],[1783085400000,"TSX"],[1783344600000,"NYSE + TSX"],[1783431000000,"NYSE + TSX"],[1783517400000,"NYSE + TSX"],[1783603800000,"NYSE + TSX"],[1783690200000,"NYSE + TSX"],[1783949400000,"NYSE + TSX"],[1784035800000,"NYSE + TSX"],[1784122200000,"NYSE + TSX"],[1784208600000,"NYSE + TSX"],[1784295000000,"NYSE + TSX"],[1784554200000,"NYSE + TSX"],[1784640600000,"NYSE + TSX"],[1784727000000,"NYSE + TSX"],[1784813400000,"NYSE + TSX"],[1784899800000,"NYSE + TSX"],[1785159000000,"NYSE + TSX"],[1785245400000,"NYSE + TSX"],[1785331800000,"NYSE + TSX"],[1785418200000,"NYSE + TSX"],[1785504600000,"NYSE + TSX"],[1785763800000,"NYSE"],[1785850200000,"NYSE + TSX"],[1785936600000,"NYSE + TSX"],[1786023000000,"NYSE + TSX"],[1786109400000,"NYSE + TSX"],[1786368600000,"NYSE + TSX"],[1786455000000,"NYSE + TSX"],[1786541400000,"NYSE + TSX"],[1786627800000,"NYSE + TSX"],[1786714200000,"NYSE + TSX"],[1786973400000,"NYSE + TSX"],[1787059800000,"NYSE + TSX"],[1787146200000,"NYSE + TSX"],[1787232600000,"NYSE + TSX"],[1787319000000,"NYSE + TSX"],[1787578200000,"NYSE + TSX"],[1787664600000,"NYSE + TSX"],[1787751000000,"NYSE + TSX"],[1787837400000,"NYSE + TSX"],[1787923800000,"NYSE + TSX"],[1788183000000,"NYSE + TSX"],[1788269400000,"NYSE + TSX"],[1788355800000,"NYSE + TSX"],[1788442200000,"NYSE + TSX"],[1788528600000,"NYSE + TSX"],[1788874200000,"NYSE + TSX"],[1788960600000,"NYSE + TSX"],[1789047000000,"NYSE + TSX"],[1789133400000,"NYSE + TSX"],[1789392600000,"NYSE + TSX"],[1789479000000,"NYSE + TSX"],[1789565400000,"NYSE + TSX"],[1789651800000,"NYSE + TSX"],[1789738200000,"NYSE + TSX"],[1789997400000,"NYSE + TSX"],[1790083800000,"NYSE + TSX"],[1790170200000,"NYSE + TSX"],[1790256600000,"NYSE + TSX"],[1790343000000,"NYSE + TSX"],[1790602200000,"NYSE + TSX"],[1790688600000,"NYSE + TSX"],[1790775000000,"NYSE + TSX"],[1790861400000,"NYSE + TSX"],[1790947800000,"NYSE + TSX"],[1791207000000,"NYSE + TSX"],[1791293400000,"NYSE + TSX"],[1791379800000,"NYSE + TSX"],[1791466200000,"NYSE + TSX"],[1791552600000,"NYSE + TSX"],[1791811800000,"NYSE"],[1791898200000,"NYSE + TSX"],[1791984600000,"NYSE + TSX"],[1792071000000,"NYSE + TSX"],[1792157400000,"NYSE + TSX"],[1792416600000,"NYSE + TSX"],[1792503000000,"NYSE + TSX"],[1792589400000,"NYSE + TSX"],[1792675800000,"NYSE + TSX"],[1792762200000,"NYSE + TSX"],[1793021400000,"NYSE + TSX"],[1793107800000,"NYSE + TSX"],[1793194200000,"NYSE + TSX"],[1793280600000,"NYSE + TSX"],[1793367000000,"NYSE + TSX"],[1793629800000,"NYSE + TSX"],[1793716200000,"NYSE + TSX"],[1793802600000,"NYSE + TSX"],[1793889000000,"NYSE + TSX"],[1793975400000,"NYSE + TSX"],[1794234600000,"NYSE + TSX"],[1794321000000,"NYSE + TSX"],[1794407400000,"NYSE + TSX"],[1794493800000,"NYSE + TSX"],[1794580200000,"NYSE + TSX"],[1794839400000,"NYSE + TSX"],[1794925800000,"NYSE + TSX"],[1795012200000,"NYSE + TSX"],[1795098600000,"NYSE + TSX"],[1795185000000,"NYSE + TSX"],[1795444200000,"NYSE + TSX"],[1795530600000,"NYSE + TSX"],[1795617000000,"NYSE + TSX"],[1795703400000,"TSX"],[1795789800000,"NYSE + TSX"],[1796049000000,"NYSE + TSX"],[1796135400000,"NYSE + TSX"],[1796221800000,"NYSE + TSX"],[1796308200000,"NYSE + TSX"],[1796394600000,"NYSE + TSX"],[1796653800000,"NYSE + TSX"],[1796740200000,"NYSE + TSX"],[1796826600000,"NYSE + TSX"],[1796913000000,"NYSE + TSX"],[1796999400000,"NYSE + TSX"],[1797258600000,"NYSE + TSX"],[1797345000000,"NYSE + TSX"],[1797431400000,"NYSE + TSX"],[1797517800000,"NYSE + TSX"],[1797604200000,"NYSE + TSX"],[1797863400000,"NYSE + TSX"],[1797949800000,"NYSE + TSX"],[1798036200000,"NYSE + TSX"],[1798122600000,"NYSE + TSX"],[1798468200000,"NYSE"],[1798554600000,"NYSE + TSX"],[1798641000000,"NYSE + TSX"],[1798727400000,"NYSE + TSX"],[1799073000000,"NYSE + TSX"],[1799159400000,"NYSE + TSX"],[1799245800000,"NYSE + TSX"],[1799332200000,"NYSE + TSX"],[1799418600000,"NYSE + TSX"],[1799677800000,"NYSE + TSX"],[1799764200000,"NYSE + TSX"],[1799850600000,"NYSE + TSX"],[1799937000000,"NYSE + TSX"],[1800023400000,"NYSE + TSX"],[1800282600000,"TSX"],[1800369000000,"NYSE + TSX"],[1800455400000,"NYSE + TSX"],[1800541800000,"NYSE + TSX"],[1800628200000,"NYSE + TSX"],[1800887400000,"NYSE + TSX"],[1800973800000,"NYSE + TSX"],[1801060200000,"NYSE + TSX"],[1801146600000,"NYSE + TSX"],[1801233000000,"NYSE + TSX"],[1801492200000,"NYSE + TSX"],[1801578600000,"NYSE + TSX"],[1801665000000,"NYSE + TSX"],[1801751400000,"NYSE + TSX"],[1801837800000,"NYSE + TSX"],[1802097000000,"NYSE + TSX"],[1802183400000,"NYSE + TSX"],[1802269800000,"NYSE + TSX"],[1802356200000,"NYSE + TSX"],[1802442600000,"NYSE + TSX"],[1802788200000,"NYSE + TSX"],[1802874600000,"NYSE + TSX"],[1802961000000,"NYSE + TSX"],[1803047400000,"NYSE + TSX"],[1803306600000,"NYSE + TSX"],[1803393000000,"NYSE + TSX"],[1803479400000,"NYSE + TSX"],[1803565800000,"NYSE + TSX"],[1803652200000,"NYSE + TSX"],[1803911400000,"NYSE + TSX"],[1803997800000,"NYSE + TSX"],[1804084200000,"NYSE + TSX"],[1804170600000,"NYSE + TSX"],[1804257000000,"NYSE + TSX"],[1804516200000,"NYSE + TSX"],[1804602600000,"NYSE + TSX"],[1804689000000,"NYSE + TSX"],[1804775400000,"NYSE + TSX"],[1804861800000,"NYSE + TSX"],[1805117400000,"NYSE + TSX"],[1805203800000,"NYSE + TSX"],[1805290200000,"NYSE + TSX"],[1805376600000,"NYSE + TSX"],[1805463000000,"NYSE + TSX"],[1805722200000,"NYSE + TSX"],[1805808600000,"NYSE + TSX"],[1805895000000,"NYSE + TSX"],[1805981400000,"NYSE + TSX"],[1806327000000,"NYSE + TSX"],[1806413400000,"NYSE + TSX"],[1806499800000,"NYSE + TSX"],[1806586200000,"NYSE + TSX"],[1806672600000,"NYSE + TSX"],[1806931800000,"NYSE + TSX"],[1807018200000,"NYSE + TSX"],[1807104600000,"NYSE + TSX"],[1807191000000,"NYSE + TSX"],[1807277400000,"NYSE + TSX"],[1807536600000,"NYSE + TSX"],[1807623000000,"NYSE + TSX"],[1807709400000,"NYSE + TSX"],[1807795800000,"NYSE + TSX"],[1807882200000,"NYSE + TSX"],[1808141400000,"NYSE + TSX"],[1808227800000,"NYSE + TSX"],[1808314200000,"NYSE + TSX"],[1808400600000,"NYSE + TSX"],[1808487000000,"NYSE + TSX"],[1808746200000,"NYSE + TSX"],[1808832600000,"NYSE + TSX"],[1808919000000,"NYSE + TSX"],[1809005400000,"NYSE + TSX"],[1809091800000,"NYSE + TSX"],[1809351000000,"NYSE + TSX"],[1809437400000,"NYSE + TSX"],[1809523800000,"NYSE + TSX"],[1809610200000,"NYSE + TSX"],[1809696600000,"NYSE + TSX"],[1809955800000,"NYSE + TSX"],[1810042200000,"NYSE + TSX"],[1810128600000,"NYSE + TSX"],[1810215000000,"NYSE + TSX"],[1810301400000,"NYSE + TSX"],[1810560600000,"NYSE + TSX"],[1810647000000,"NYSE + TSX"],[1810733400000,"NYSE + TSX"],[1810819800000,"NYSE + TSX"],[1810906200000,"NYSE + TSX"],[1811165400000,"NYSE"],[1811251800000,"NYSE + TSX"],[1811338200000,"NYSE + TSX"],[1811424600000,"NYSE + TSX"],[1811511000000,"NYSE + TSX"],[1811770200000,"TSX"],[1811856600000,"NYSE + TSX"],[1811943000000,"NYSE + TSX"],[1812029400000,"NYSE + TSX"],[1812115800000,"NYSE + TSX"],[1812375000000,"NYSE + TSX"],[1812461400000,"NYSE + TSX"],[1812547800000,"NYSE + TSX"],[1812634200000,"NYSE + TSX"],[1812720600000,"NYSE + TSX"],[1812979800000,"NYSE + TSX"],[1813066200000,"NYSE + TSX"],[1813152600000,"NYSE + TSX"],[1813239000000,"NYSE + TSX"],[1813325400000,"TSX"],[1813584600000,"NYSE + TSX"],[1813671000000,"NYSE + TSX"],[1813757400000,"NYSE + TSX"],[1813843800000,"NYSE + TSX"],[1813930200000,"NYSE + TSX"],[1814189400000,"NYSE + TSX"],[1814275800000,"NYSE + TSX"],[1814362200000,"NYSE + TSX"],[1814448600000,"NYSE"],[1814535000000,"NYSE + TSX"],[1814794200000,"TSX"],[1814880600000,"NYSE + TSX"],[1814967000000,"NYSE + TSX"],[1815053400000,"NYSE + TSX"],[1815139800000,"NYSE + TSX"],[1815399000000,"NYSE + TSX"],[1815485400000,"NYSE + TSX"],[1815571800000,"NYSE + TSX"],[1815658200000,"NYSE + TSX"],[1815744600000,"NYSE + TSX"],[1816003800000,"NYSE + TSX"],[1816090200000,"NYSE + TSX"],[1816176600000,"NYSE + TSX"],[1816263000000,"NYSE + TSX"],[1816349400000,"NYSE + TSX"],[1816608600000,"NYSE + TSX"],[1816695000000,"NYSE + TSX"],[1816781400000,"NYSE + TSX"],[1816867800000,"NYSE + TSX"],[1816954200000,"NYSE + TSX"],[1817213400000,"NYSE"],[1817299800000,"NYSE + TSX"],[1817386200000,"NYSE + TSX"],[1817472600000,"NYSE + TSX"],[1817559000000,"NYSE + TSX"],[1817818200000,"NYSE + TSX"],[1817904600000,"NYSE + TSX"],[1817991000000,"NYSE + TSX"],[1818077400000,"NYSE + TSX"],[1818163800000,"NYSE + TSX"],[1818423000000,"NYSE + TSX"],[1818509400000,"NYSE + TSX"],[1818595800000,"NYSE + TSX"],[1818682200000,"NYSE + TSX"],[1818768600000,"NYSE + TSX"],[1819027800000,"NYSE + TSX"],[1819114200000,"NYSE + TSX"],[1819200600000,"NYSE + TSX"],[1819287000000,"NYSE + TSX"],[1819373400000,"NYSE + TSX"],[1819632600000,"NYSE + TSX"],[1819719000000,"NYSE + TSX"],[1819805400000,"NYSE + TSX"],[1819891800000,"NYSE + TSX"],[1819978200000,"NYSE + TSX"],[1820323800000,"NYSE + TSX"],[1820410200000,"NYSE + TSX"],[1820496600000,"NYSE + TSX"],[1820583000000,"NYSE + TSX"],[1820842200000,"NYSE + TSX"],[1820928600000,"NYSE + TSX"],[1821015000000,"NYSE + TSX"],[1821101400000,"NYSE + TSX"],[1821187800000,"NYSE + TSX"],[1821447000000,"NYSE + TSX"],[1821533400000,"NYSE + TSX"],[1821619800000,"NYSE + TSX"],[1821706200000,"NYSE + TSX"],[1821792600000,"NYSE + TSX"],[1822051800000,"NYSE + TSX"],[1822138200000,"NYSE + TSX"],[1822224600000,"NYSE + TSX"],[1822311000000,"NYSE + TSX"],[1822397400000,"NYSE + TSX"],[1822656600000,"NYSE + TSX"],[1822743000000,"NYSE + TSX"],[1822829400000,"NYSE + TSX"],[1822915800000,"NYSE + TSX"],[1823002200000,"NYSE + TSX"],[1823261400000,"NYSE"],[1823347800000,"NYSE + TSX"],[1823434200000,"NYSE + TSX"],[1823520600000,"NYSE + TSX"],[1823607000000,"NYSE + TSX"],[1823866200000,"NYSE + TSX"],[1823952600000,"NYSE + TSX"],[1824039000000,"NYSE + TSX"],[1824125400000,"NYSE + TSX"],[1824211800000,"NYSE + TSX"],[1824471000000,"NYSE + TSX"],[1824557400000,"NYSE + TSX"],[1824643800000,"NYSE + TSX"],[1824730200000,"NYSE + TSX"],[1824816600000,"NYSE + TSX"],[1825075800000,"NYSE + TSX"],[1825162200000,"NYSE + TSX"],[1825248600000,"NYSE + TSX"],[1825335000000,"NYSE + TSX"],[1825421400000,"NYSE + TSX"],[1825684200000,"NYSE + TSX"],[1825770600000,"NYSE + TSX"],[1825857000000,"NYSE + TSX"],[1825943400000,"NYSE + TSX"],[1826029800000,"NYSE + TSX"],[1826289000000,"NYSE + TSX"],[1826375400000,"NYSE + TSX"],[1826461800000,"NYSE + TSX"],[1826548200000,"NYSE + TSX"],[1826634600000,"NYSE + TSX"],[1826893800000,"NYSE + TSX"],[1826980200000,"NYSE + TSX"],[1827066600000,"NYSE + TSX"],[1827153000000,"TSX"],[1827239400000,"NYSE + TSX"],[1827498600000,"NYSE + TSX"],[1827585000000,"NYSE + TSX"],[1827671400000,"NYSE + TSX"],[1827757800000,"NYSE + TSX"],[1827844200000,"NYSE + TSX"],[1828103400000,"NYSE + TSX"],[1828189800000,"NYSE + TSX"],[1828276200000,"NYSE + TSX"],[1828362600000,"NYSE + TSX"],[1828449000000,"NYSE + TSX"],[1828708200000,"NYSE + TSX"],[1828794600000,"NYSE + TSX"],[1828881000000,"NYSE + TSX"],[1828967400000,"NYSE + TSX"],[1829053800000,"NYSE + TSX"],[1829313000000,"NYSE + TSX"],[1829399400000,"NYSE + TSX"],[1829485800000,"NYSE + TSX"],[1829572200000,"NYSE + TSX"],[1829658600000,"TSX"],[1829917800000,"NYSE"],[1830004200000,"NYSE"],[1830090600000,"NYSE + TSX"],[1830177000000,"NYSE + TSX"],[1830263400000,"NYSE + TSX"]],"coverage":"2026\u20132027","sources":["https://www.nyse.com/trade/hours-calendars","https://www.tsx.com/en/trading/calendars-and-trading-hours/calendar","https://www.tsx.com/en/trading/calendars-and-trading-hours/trading-hours"]};

function allocationLabelGeometry(rows){
 const cx=360,radius=160,outer=183,groups={left:[],right:[]};let cumulative=0;
 for(const holding of rows){const angle=-Math.PI/2+(cumulative+holding.weight_cad/2)*Math.PI*2;cumulative+=holding.weight_cad;
  const side=Math.cos(angle)>=0?'right':'left';groups[side].push({symbol:holding.symbol,ticker:holding.symbol.replace(/\.TO$/,'').replace('CRT-UN','CRT.UN'),angle,side,rawY:outer*Math.sin(angle)});
 }
 const height=Math.max(600,(Math.max(groups.left.length,groups.right.length)-1)*34+90),cy=height/2,labels=[];
 for(const side of ['left','right']){const list=groups[side].sort((a,b)=>a.rawY-b.rawY),sign=side==='right'?1:-1;
  list.forEach((label,i)=>{const y=list.length===1?cy:45+i*(height-90)/(list.length-1);
   labels.push({...label,x:side==='right'?595:125,y,anchor:[cx+outer*Math.cos(label.angle),cy+outer*Math.sin(label.angle)],points:[[cx+outer*Math.cos(label.angle),cy+outer*Math.sin(label.angle)],[cx+(outer+11)*Math.cos(label.angle),cy+(outer+11)*Math.sin(label.angle)],[cx+sign*200,y],[cx+sign*225,y]]});
  });
 }
 return {width:720,height,cx,cy,radius,labels};
}
// Mobile: top N slices by weight with outside tickers + thin leaders; desktop geometry untouched.
const MOBILE_DONUT_LABELS=8;
function mobileAllocationLabelGeometry(rows,desk,n=MOBILE_DONUT_LABELS){
 // Reuse desktop pie center so arc geometry stays correct; only the label set and mobile viewBox crop change.
 const cx=desk.cx,cy=desk.cy,radius=desk.radius,outer=186;let cumulative=0;
 const angled=rows.map(holding=>{const angle=-Math.PI/2+(cumulative+holding.weight_cad/2)*Math.PI*2;cumulative+=holding.weight_cad;
  return {symbol:holding.symbol,ticker:holding.symbol.replace(/\.TO$/,'').replace('CRT-UN','CRT.UN'),weight:holding.weight_cad,angle,side:Math.cos(angle)>=0?'right':'left',rawY:outer*Math.sin(angle)};
 });
 const top=[...angled].sort((a,b)=>b.weight-a.weight).slice(0,n);
 const groups={left:top.filter(l=>l.side==='left'),right:top.filter(l=>l.side==='right')};
 const labels=[];
 for(const side of ['left','right']){const list=groups[side].sort((a,b)=>a.rawY-b.rawY),sign=side==='right'?1:-1;
  const minGap=48,span=Math.max(280,(list.length-1)*minGap),topY=cy-span/2;
  const ys=list.map((label,i)=>list.length===1?cy:topY+i*(span/Math.max(1,list.length-1)));
  // Push apart if still closer than minGap (stable)
  for(let pass=0;pass<4;pass++){for(let i=1;i<ys.length;i++){if(ys[i]-ys[i-1]<minGap)ys[i]=ys[i-1]+minGap}}
  const mid=(ys[0]+ys[ys.length-1])/2;const shift=cy-mid;for(let i=0;i<ys.length;i++)ys[i]+=shift;
  list.forEach((label,i)=>{const y=ys[i];
   labels.push({...label,x:side==='right'?cx+268:cx-268,y,points:[[cx+outer*Math.cos(label.angle),cy+outer*Math.sin(label.angle)],[cx+(outer+12)*Math.cos(label.angle),cy+(outer+12)*Math.sin(label.angle)],[cx+sign*228,y],[cx+sign*248,y]]});
  });
 }
 const padX=330,padY=310;
 return {width:desk.width,height:desk.height,cx,cy,radius,labels,count:top.length,viewBox:`${cx-padX} ${cy-padY} ${padX*2} ${padY*2}`};
}
function normalizeTicker(t){return String(t||'').toUpperCase().replace(/-UN\.TO$/,'-UN').replace(/\.TO$/,'').replace('CRT-UN','CRT.UN')}
function daysToExpiration(opened,expiration){
 if(!expiration)return null;
 const end=new Date(expiration+'T12:00:00');
 const start=new Date((opened||new Date().toISOString().slice(0,10))+'T12:00:00');
 if(Number.isNaN(end.getTime())||Number.isNaN(start.getTime()))return null;
 const days=(end-start)/86400000;return days>0?days:null;
}
function premiumToCad(pos,fx){
 const t=premiumTotal(pos);if(t==null)return null;
 return (String(pos.currency||'CAD').toUpperCase()==='USD')?t*Number(fx||1):t;
}
function ccYieldMap(holdings,positions,fx){
 const map=new Map();
 const open=(positions||[]).filter(p=>String(p.status||'').toLowerCase()==='open');
 for(const h of holdings){
  const matches=open.filter(p=>normalizeTicker(p.underlying)===normalizeTicker(h.symbol));
  if(!matches.length){map.set(h.symbol,null);continue}
  const valueCad=Number(h.value_cad??h.reference_capital_cad??h.planned_capital_native);
  if(!valueCad){map.set(h.symbol,null);continue}
  let sum=0,ok=false;
  for(const p of matches){
   const premCad=premiumToCad(p,fx);const days=daysToExpiration(p.opened_date,p.expiration);
   if(premCad==null||days==null)continue;
   sum+=(premCad/valueCad)*(365/days);ok=true;
  }
  map.set(h.symbol,ok?sum:null);
 }
 return map;
}
function formatCcYield(frac){
 if(frac==null||Number.isNaN(frac))return '—';
 return (frac*100).toFixed(1)+'%';
}
function formatDivYield(h){
 const rate=Number(h.annual_rate_native), px=Number(h.reference_price_native);
 if(!Number.isFinite(rate)||!Number.isFinite(px)||px===0)return '—';
 return ((rate/px)*100).toFixed(2)+'%';
}
function formatShares(n){
 if(n==null||Number.isNaN(Number(n)))return '—';
 const v=Number(n);
 if(Number.isInteger(v)||Math.abs(v-Math.round(v))<1e-9)return Math.round(v).toLocaleString('en-CA')+' sh';
 return v.toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+' sh';
}
// Desktop: full labelled viewBox. Mobile: taller labelled viewBox for top-N tickers (not ring crop).
function fitDonut(){const svg=document.querySelector('#native-holdings .native-donut');if(!svg)return;
 if(MOBILE.matches){if(svg.dataset.mobile)svg.setAttribute('viewBox',svg.dataset.mobile)}
 else{if(svg.dataset.full)svg.setAttribute('viewBox',svg.dataset.full)}
}
MOBILE.addEventListener?.('change',fitDonut);
async function renderDesktop(s){
 const palette=['#00dca6','#49ffd0','#0daa96','#7af5be','#29b9c8','#52d878','#a6dc63','#73bcac','#1bdbb4','#74f3df','#97c7a0','#40f1bc'];
 const sorted=[...s.holdings].sort((a,b)=>b.weight_cad-a.weight_cad),pie=allocationLabelGeometry(sorted),mobilePie=mobileAllocationLabelGeometry(sorted,pie),circumference=2*Math.PI*pie.radius;let offset=0;
 try{if(!COVERED_CALLS._loaded){const r=await fetch('/data/covered-calls.json',{cache:'no-store'});if(r.ok){COVERED_CALLS=await r.json();COVERED_CALLS._loaded=true;renderCoveredCalls(COVERED_CALLS)}}}catch(e){}
  const arcs=sorted.map((h,i)=>{const percent=h.weight_cad*100,arc=`<circle cx="${pie.cx}" cy="${pie.cy}" r="${pie.radius}" fill="none" stroke="${palette[i%palette.length]}" stroke-width="46" stroke-dasharray="${h.weight_cad*circumference} ${circumference*(1-h.weight_cad)}" stroke-dashoffset="${-offset*circumference/100}" transform="rotate(-90 ${pie.cx} ${pie.cy})"><title>${esc(h.symbol)} · ${percent.toFixed(2)}%</title></circle>`;offset+=percent;return arc}).join('');
 const deskLabels=pie.labels.map(label=>`<polyline class="donut-leader" points="${label.points.map(point=>point.map(n=>n.toFixed(3)).join(',')).join(' ')}"/><text class="donut-ticker" x="${label.x}" y="${label.y}" text-anchor="${label.side==='right'?'start':'end'}" dominant-baseline="middle">${esc(label.ticker)}</text>`).join('');
 const mobLabels=mobilePie.labels.map(label=>`<polyline class="donut-leader" points="${label.points.map(point=>point.map(n=>n.toFixed(3)).join(',')).join(' ')}"/><text class="donut-ticker-mobile" x="${label.x}" y="${label.y}" text-anchor="${label.side==='right'?'start':'end'}" dominant-baseline="middle" font-size="28">${esc(label.ticker)}</text>`).join('');
  const n=sorted.length;
 $('native-holdings').innerHTML=`<section class="native-panel allocation-overview" data-scroll-region tabindex="0" aria-label="Allocation overview"><div class="daily-pnl-strip" id="daily-pnl-strip" aria-live="polite"><span class="daily-pnl-label">Daily PNL</span><span class="daily-pnl-face" aria-hidden="true"></span><span class="daily-pnl-value">—</span><span class="daily-pnl-meta"></span><span class="daily-pnl-hot" hidden></span></div><svg class="native-donut" viewBox="0 0 ${pie.width} ${pie.height}" data-full="0 0 ${pie.width} ${pie.height}" data-mobile="${mobilePie.viewBox}" role="img" aria-label="Capital-weighted allocation across ${n} holdings, with outside ticker labels and leader lines">${arcs}<g class="donut-labels" aria-hidden="true">${deskLabels}</g><g class="donut-labels-mobile" aria-hidden="true">${mobLabels}</g><text class="donut-center-value" x="${pie.cx}" y="${pie.cy-5}" text-anchor="middle" fill="#e1f3e6" font-size="34" font-weight="600">${money(s.valuation.total_cad)}</text><text class="donut-center-label" x="${pie.cx}" y="${pie.cy+30}" text-anchor="middle" fill="#8cbca0" font-size="20">CAD HOLDINGS</text></svg><ul class="donut-legend" aria-label="Allocation legend">${sorted.map((h,i)=>`<li><i style="background:${palette[i%palette.length]}"></i><b>${esc(h.symbol.replace(/\.TO$/,'').replace('CRT-UN','CRT.UN'))}</b><span>${(h.weight_cad*100).toFixed(1)}%</span></li>`).join('')}</ul><p class="native-summary"><strong>${n} holdings</strong> · Actual TFSA positions</p><p>Native C$ / US$ allocations.<br>CAD weights use FX ${s.valuation.fx_cad_per_usd.toFixed(4)}.</p></section><section class="native-panel holdings-table-panel"><div class="native-table-heading"><h3>The machine</h3><span>${n} holdings · CAD weights</span></div><div class="native-scroll" data-scroll-region tabindex="0" aria-label="Scroll all ${n} holdings in the machine"><table class="allocation-table"><thead><tr><th scope="col">Ticker</th><th scope="col">Business</th><th scope="col">Shares</th><th scope="col">Native capital</th><th scope="col">Weight</th><th scope="col" title="Annual dividend rate ÷ snapshot price (Nov 9, 2026).">Div yield</th></tr></thead><tbody>${sorted.map((h,i)=>`<tr><th scope="row" data-hot-symbol="${esc(displayTicker(h.symbol))}"><span class="ticker-dot" style="background:${palette[i%palette.length]}"></span>${esc(displayTicker(h.symbol))}</th><td class="business-name">${saNameLink(h,h.name,"sa-link")}</td><td class="shares-cell" data-label="Shares">${formatShares(h.shares??h.starting_shares_theoretical)}</td><td data-label="Native capital">${money(h.planned_capital_native,h.currency)}</td><td data-label="Weight">${(h.weight_cad*100).toFixed(2)}%</td><td class="div-yield" data-label="Div yield">${formatDivYield(h)}</td></tr>`).join('')}</tbody></table></div><p class="fine div-yield-note">Shares = actual Wealthsimple TFSA quantity. Div yield = annual dividend rate ÷ Nov 9, 2026 snapshot price.</p></section>`;
 fitDonut(); loadDailyPnl();
 // Keep every visible holdings-count label in sync with the published model.
 const hc=(s.holdings||[]).length || (s.valuation&&s.valuation.holding_count) || 0;
 document.querySelectorAll('[data-holdings-count]').forEach(el=>{el.textContent=String(hc)});
 const disc=$('persistent-disclosure');
 if(disc) disc.innerHTML=`<span data-holdings-count>${hc}</span> holdings · Wealthsimple TFSA`;
 const line=$('holdings-count-line');
 if(line) line.innerHTML=`<span data-holdings-count>${hc}</span> holdings. Every dollar at work.`;

 const gross=MODEL_DISPLAY.monthly.reduce((a,r)=>a+r[1],0),net=MODEL_DISPLAY.monthly.reduce((a,r)=>a+r[2],0),maxNet=Math.max(...MODEL_DISPLAY.monthly.map(r=>r[2]));
 const fx=s.valuation.fx_cad_per_usd||1.4123;
 const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const payerPalette=['#00dca6','#49ffd0','#0daa96','#7af5be','#29b9c8','#52d878','#a6dc63','#73bcac','#1bdbb4','#74f3df','#97c7a0','#40f1bc','#2ee6a8','#68c9ff','#9dffb0','#3ad1c2'];
 // Per-month CAD gross by ticker from published holdings (annual_rate × shares / pay-count; USD×FX).
 const monthStacks=monthNames.map((name,mi)=>{
  const month=mi+1; const parts=[];
  for(const h of (s.holdings||[])){
   const pays=String(h.pay_months||'').split(',').map(x=>parseInt(x,10)).filter(Boolean);
   if(!pays.includes(month)) continue;
   const shares=Number(h.shares??h.starting_shares_theoretical)||0;
   const rate=Number(h.annual_rate_native)||0;
   let cad=(rate*shares)/pays.length;
   if(h.currency==='USD') cad*=fx;
   const ticker=String(h.symbol||'').replace(/\.TO$/,'').replace('CRT-UN','CRT.UN');
   if(cad>0) parts.push({ticker,cad});
  }
  parts.sort((a,b)=>b.cad-a.cad);
  const grossM=parts.reduce((a,p)=>a+p.cad,0);
  const netM=MODEL_DISPLAY.monthly[mi]?.[2]??grossM;
  return {name,month,parts,gross:grossM,net:netM};
 });
 const maxGross=Math.max(...monthStacks.map(m=>m.gross),1);
 const peakMonths=new Set([...monthStacks].sort((a,b)=>b.gross-a.gross).slice(0,4).map(m=>m.month));
 function moneyShort(n){return 'C$'+Number(n).toLocaleString('en-CA',{minimumFractionDigits:0,maximumFractionDigits:0});}
 function moneyFull(n){return money(n);}
 const monthlyHost=$('native-monthly');
 if(monthlyHost){
  if(MOBILE.matches){
   monthlyHost.innerHTML=`<div class="income-totals"><div><span>Annual gross</span><strong>${money(gross)}</strong></div><div><span>Net reinvestable</span><strong>${money(net)}</strong></div></div><div class="monthly-bars">${MODEL_DISPLAY.monthly.map(r=>`<div class="monthly-row"><span>${esc(r[0])}</span><div class="monthly-track"><span style="width:${r[2]/maxNet*100}%"></span></div><strong>${money(r[2])}</strong></div>`).join('')}</div><p class="native-note income-footnote">Net modeled C$ · indicated rates · not receipts</p>`;
  }else{
   // Bars stay in a stretch-filled SVG (preserveAspectRatio=none). Dollar/month labels are
   // HTML overlays so they are never distorted by non-uniform SVG scaling.
   const chartH=420, chartW=920, padL=8, padR=8, padT=48, padB=30;
   const plotW=chartW-padL-padR, plotH=chartH-padT-padB;
   const gap=10, barW=(plotW-gap*11)/12;
   const barScale=0.90; // leave headroom above the tallest bar for crisp HTML labels
   let bars='', labels='';
   monthStacks.forEach((m,i)=>{
    const x=padL+i*(barW+gap);
    const h=Math.max(2,(m.gross/maxGross)*plotH*barScale);
    const y=padT+plotH-h;
    let yCursor=padT+plotH;
    const segs=m.parts.map((p,pi)=>{
     const segH=Math.max(0.5,(p.cad/maxGross)*plotH*barScale);
     yCursor-=segH;
     const color=payerPalette[pi%payerPalette.length];
     return `<rect class="pay-seg" x="${x.toFixed(2)}" y="${yCursor.toFixed(2)}" width="${barW.toFixed(2)}" height="${segH.toFixed(2)}" fill="${color}" rx="1"><title>${esc(p.ticker)} · ${moneyFull(p.cad)} in ${m.name}</title></rect>`;
    }).join('');
    const peak=peakMonths.has(m.month);
    const centerPct=((x+barW/2)/chartW)*100;
    const topPct=(y/chartH)*100;
    const monthTopPct=((padT+plotH+16)/chartH)*100;
    bars+=`<g class="month-bar${peak?' peak':''}">${segs}</g>`;
    labels+=`<span class="bar-val${peak?' peak':''}" style="left:${centerPct.toFixed(3)}%;top:${topPct.toFixed(3)}%">${moneyShort(m.net)}</span><span class="bar-month" style="left:${centerPct.toFixed(3)}%;top:${monthTopPct.toFixed(3)}%">${esc(m.name)}</span>`;
   });
   const payersStrip=monthStacks.map(m=>`<div class="pay-when-row"><span class="pay-when-m">${m.name}</span><span class="pay-when-tickers">${m.parts.map(p=>esc(p.ticker)).join(' · ')}</span></div>`).join('');
   monthlyHost.innerHTML=`<div class="income-totals"><div><span>Annual gross</span><strong>${money(gross)}</strong></div><div><span>Net reinvestable</span><strong>${money(net)}</strong></div></div><div class="income-chart-wrap"><svg class="income-barchart" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none" role="img" aria-label="Monthly net dividend calendar from current holdings">${bars}</svg><div class="income-chart-labels" aria-hidden="true">${labels}</div></div><div class="pay-when" aria-label="Who pays when"><div class="pay-when-head">Who pays when</div><div class="pay-when-grid">${payersStrip}</div></div><p class="native-note income-footnote">Bars = indicated monthly CAD (stacked by payer) · labels show net reinvestable · not receipts</p>`;
  }
 }
 const colors={Bearish:'#8bb4a2',Neutral:'#20ed87',Bullish:'#32d2e7'},start=s.valuation.reference_total_cad,low=80000,high=220000,L=70,R=610,T=14,B=250;
 const y=v=>T+(high-v)/(high-low)*(B-T),x=i=>L+i/60*(R-L);
 let svg=`<svg class="native-linechart" viewBox="0 0 630 280" preserveAspectRatio="none" role="img" aria-label="Hypothetical five-year compounding scenarios in Canadian dollars">`;
 for(let value=80000;value<=220000;value+=40000)svg+=`<line x1="${L}" y1="${y(value)}" x2="${R}" y2="${y(value)}" stroke="#244331"/><text x="62" y="${y(value)+4}" text-anchor="end" fill="#8cbca0" font-size="16">C$${value/1000}k</text>`;
 for(let year=0;year<=5;year++)svg+=`<text x="${x(year*12)}" y="272" text-anchor="${year===5?'end':'middle'}" fill="#8cbca0" font-size="15">${year===0?'Start':'Y'+year}</text>`;
 for(const [name,path] of Object.entries(MODEL_DISPLAY.paths)){const values=[start,...path];svg+=`<polyline points="${values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${colors[name]}" stroke-width="2.8"/>`}
 svg+='</svg>';
 const pathsHost=$('native-paths'); if(pathsHost) pathsHost.innerHTML=`<div class="path-legend">${Object.entries(colors).map(([n,c])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')}</div><div class="path-chart-wrap">${svg}</div><div class="path-outcomes">${['Bearish','Neutral','Bullish'].map(name=>{const a=MODEL_DISPLAY.annual.find(r=>r[0]===name&&r[1]===5);return `<div><span style="color:${colors[name]}">${name}</span><strong>${money(a[4])}</strong><small>${(a[5]*100).toFixed(0)}%</small></div>`}).join('')}</div><p class="native-note">Illustrative · not predictions</p>`;
 renderAnnual('Neutral');
}
function renderAnnual(scenario){
 const rows=MODEL_DISPLAY.annual.filter(r=>r[0]===scenario);
 const annualHost=$('native-annual'); if(annualHost) annualHost.innerHTML=`<div class="scenario-tabs" aria-label="Projection scenarios">${['Bearish','Neutral','Bullish'].map(name=>`<button data-scenario="${name}" aria-pressed="${name===scenario}">${name}</button>`).join('')}</div><table class="annual-table"><thead><tr><th scope="col">Yr</th><th scope="col">Gross</th><th scope="col">Net</th><th scope="col">Portfolio</th><th scope="col">Gain</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${r[1]}</th><td>${money(r[2])}</td><td>${money(r[3])}</td><td>${money(r[4])}</td><td>${r[5]>=0?'+':''}${(r[5]*100).toFixed(0)}%</td></tr>`).join('')}</tbody></table><div class="annual-result"><span>Year 5</span><strong>${money(rows[4][4])}</strong><span>${(rows[4][5]*100).toFixed(0)}% model gain</span></div>`;
 document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>renderAnnual(button.dataset.scenario)));
}
// NYSE early closes at 13:00 ET (day after Thanksgiving + Christmas Eve when it is a trading day).
// TSX has no Black Friday early close and stays 09:30–16:00 ET; NYSE is primary for this close clock.
const NYSE_EARLY_CLOSES=new Set(['2026-11-27','2026-12-24','2027-11-26']);
function etYmd(ms){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
 const g=t=>parts.find(p=>p.type===t)?.value;
 return `${g('year')}-${g('month')}-${g('day')}`;
}
function sessionCloseMs(openMs){
 // Regular: 09:30→16:00 = 6.5h; early close: 09:30→13:00 = 3.5h. Open stamps already encode ET/DST.
 return openMs+(NYSE_EARLY_CLOSES.has(etYmd(openMs))?3.5:6.5)*3600*1000;
}
function findNextOpen(now){
 if(now<OPEN_CALENDAR.start||now>OPEN_CALENDAR.end)return null;
 let low=0,high=OPEN_CALENDAR.sessions.length;
 while(low<high){const mid=(low+high)>>1;if(OPEN_CALENDAR.sessions[mid][0]<=now)low=mid+1;else high=mid}
 return OPEN_CALENDAR.sessions[low]||null;
}
function findCurrentClose(now){
 if(now<OPEN_CALENDAR.start||now>OPEN_CALENDAR.end)return null;
 let low=0,high=OPEN_CALENDAR.sessions.length;
 while(low<high){const mid=(low+high)>>1;if(OPEN_CALENDAR.sessions[mid][0]<=now)low=mid+1;else high=mid}
 const idx=low-1; if(idx<0)return null;
 const sess=OPEN_CALENDAR.sessions[idx], close=sessionCloseMs(sess[0]);
 if(now<sess[0]||now>=close)return null;
 return [close,sess[1]];
}
function formatCountdown(ms){const total=Math.max(0,Math.ceil(ms/1000)),days=Math.floor(total/86400),pad=n=>String(n).padStart(2,'0');return `${days?days+'d ':''}${pad(Math.floor(total/3600)%24)}:${pad(Math.floor(total/60)%60)}:${pad(total%60)}`}
function setText(id,value){const el=$(id); if(el) el.textContent=value}
function clockNow(){
 // ?now= ISO override is localhost/127.0.0.1 only — ignored on the live site.
 try{
  const host=location.hostname;
  if(host!=='localhost'&&host!=='127.0.0.1')return Date.now();
  const raw=new URLSearchParams(location.search).get('now');
  if(!raw)return Date.now();
  const t=Date.parse(raw);
  return Number.isFinite(t)?t:Date.now();
 }catch(e){return Date.now()}
}
(()=>{
 const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'});
 let lastOpen=null, lastClose=null;
 function tick(){
  const now=clockNow(), next=findNextOpen(now), close=findCurrentClose(now);
  setText('open-market-label', next?`NEXT OPEN · ${next[1]}`:'SCHEDULE UNAVAILABLE');
  setText('open-countdown', next?formatCountdown(next[0]-now):'—');
  if((next?.[0]??null)!==lastOpen){
   lastOpen=next?.[0]??null;
   setText('open-at', next?dateFormat.format(new Date(next[0])):'Calendar covers 2026–2027');
  }
  if(!next) setText('open-at','Calendar covers 2026–2027');

  const closeEl=$('close-clock');
  if(closeEl){
   if(close){
    closeEl.hidden=false;
    setText('close-market-label', `MARKET CLOSES · ${close[1]}`);
    setText('close-countdown', formatCountdown(close[0]-now));
    if(close[0]!==lastClose){
     lastClose=close[0];
     setText('close-at', dateFormat.format(new Date(close[0])));
    }
   }else{
    closeEl.hidden=true;
    lastClose=null;
    setText('close-countdown','--:--:--');
    setText('close-at','');
   }
  }
  setTimeout(tick,1000);
 }
 tick();
})();
// Subtle descending SAUL FINANCE streams, adapted from the approved Matrix graphics.
(()=>{
 const canvas=$('matrix-rain');if(!canvas?.getContext)return;const ctx=canvas.getContext('2d');if(!ctx)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let width=0,height=0,columns=0,raf=null,last=0,resizeTimer;
 function size(){const ratio=Math.min(window.devicePixelRatio||1,1.5);width=window.innerWidth;height=window.innerHeight;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);columns=Math.min(width<700?14:42,Math.ceil(width/36));draw(0)}
 function draw(time){ctx.clearRect(0,0,width,height);ctx.font='14px ui-monospace, monospace';ctx.textAlign='center';const letters='SAULFINANCE';
  for(let c=0;c<columns;c++){const x=(c+.5)*width/columns,period=height+460,speed=23+(c%4)*7,head=((time/1000*speed+c*91)%period)-40;
   for(let k=0;k<25;k++){const y=head-432+k*18;if(y<0||y>height)continue;ctx.fillStyle=k===24?'rgba(119,255,168,.65)':`rgba(30,170,78,${.1+k/100})`;ctx.fillText(letters[k%letters.length],x,y)}
  }
 }
 function frame(time){raf=null;if(document.hidden||reduced.matches)return;if(time-last>=80){draw(time);last=time}raf=requestAnimationFrame(frame)}
 function restart(){if(raf!==null)cancelAnimationFrame(raf);raf=null;if(reduced.matches){draw(0);return}if(!document.hidden)raf=requestAnimationFrame(frame)}
 window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{size();restart()},150)});document.addEventListener('visibilitychange',restart);reduced.addEventListener('change',restart);size();restart();
})();


// Covered calls page: load data/covered-calls.json; empty positions show intentional empty state.
let COVERED_CALLS={updated_at:null,positions:[]};
function premiumTotal(pos){
  if(pos.premium_received==null)return null;
  if(typeof pos.premium_received==='number')return pos.premium_received;
  if(pos.premium_received.total!=null)return Number(pos.premium_received.total);
  if(pos.premium_received.per_share!=null){
    const shares=pos.shares_covered??((pos.contracts||0)*100);
    return Number(pos.premium_received.per_share)*shares;
  }
  return null;
}
function formatShortDate(s){
  if(!s)return '—';
  const d=new Date(s+'T12:00:00');
  if(Number.isNaN(d.getTime()))return esc(s);
  return d.toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
}
function renderCoveredCalls(data){
  const host=$('native-covered-calls'); if(!host)return;
  COVERED_CALLS=data||{updated_at:null,positions:[]};COVERED_CALLS._loaded=true;
  const positions=Array.isArray(COVERED_CALLS.positions)?COVERED_CALLS.positions:[];
  const open=positions.filter(p=>String(p.status||'').toLowerCase()==='open');
  const history=positions.filter(p=>['closed','assigned','expired'].includes(String(p.status||'').toLowerCase()));
  const premiumSum=open.reduce((a,p)=>{const t=premiumTotal(p);return a+(t==null?0:t)},0);
  const realizedSum=history.reduce((a,p)=>a+(p.realized_pnl==null?0:Number(p.realized_pnl)),0);
  const currencyHint=open[0]?.currency||history[0]?.currency||'CAD';
  const moneyOrDash=(n,c)=>n==null?'—':money(n,c||currencyHint);

  if(!open.length&&!history.length){
    host.innerHTML=`<div class="cc-empty native-panel" role="status"><p class="eyebrow">COVERED CALLS</p><h3>No open covered calls yet</h3><p class="muted">Positions will appear here once calls are sold. Eligible 100-share lots: ENB, PPL, CNQ, CU, SOBO, O, NNN. CRT.UN (250) has no listed Montréal options.</p></div>`;
    return;
  }

  const row=(p,hist=false)=>{
    const cur=p.currency||'CAD';
    const prem=premiumTotal(p);
    const premPer=p.premium_received&&typeof p.premium_received==='object'?p.premium_received.per_share:null;
    return `<tr>
      <th scope="row">${esc(p.underlying)}</th>
      <td data-label="Shares">${esc(p.shares_covered??'—')}</td>
      <td data-label="Contracts">${esc(p.contracts??'—')}</td>
      <td data-label="Strike">${p.strike==null?'—':Number(p.strike).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td data-label="Expiration">${formatShortDate(p.expiration)}</td>
      <td data-label="Premium">${prem==null?'—':money(prem,cur)}${premPer!=null?`<span class="cc-per"> · ${money(premPer,cur)}/sh</span>`:''}</td>
      <td data-label="Status"><span class="cc-status cc-status-${esc(String(p.status||'').toLowerCase())}">${esc(p.status||'—')}</span></td>
      ${hist?`<td data-label="P&amp;L">${p.realized_pnl==null?'—':money(p.realized_pnl,cur)}</td>`:''}
    </tr>`;
  };

  const openTable=open.length?`<section class="native-panel cc-panel"><div class="native-table-heading"><h3>Open positions</h3><span>${open.length} open</span></div><div class="native-scroll" data-scroll-region tabindex="0" aria-label="Open covered calls"><table class="cc-table"><thead><tr><th scope="col">Ticker</th><th scope="col">Shares</th><th scope="col">Contracts</th><th scope="col">Strike</th><th scope="col">Expiration</th><th scope="col">Premium</th><th scope="col">Status</th></tr></thead><tbody>${open.map(p=>row(p,false)).join('')}</tbody></table></div></section>`:'<section class="native-panel cc-panel"><div class="cc-empty-inline" role="status"><h3>No open covered calls yet</h3><p class="muted">Positions will appear here once calls are sold. Eligible 100-share lots: ENB, PPL, CNQ, CU, SOBO, O, NNN.</p></div></section>';

  const histTable=history.length?`<section class="native-panel cc-panel"><div class="native-table-heading"><h3>Closed / assigned</h3><span>${history.length} recorded</span></div><div class="native-scroll" data-scroll-region tabindex="0" aria-label="Covered call history"><table class="cc-table"><thead><tr><th scope="col">Ticker</th><th scope="col">Shares</th><th scope="col">Contracts</th><th scope="col">Strike</th><th scope="col">Expiration</th><th scope="col">Premium</th><th scope="col">Status</th><th scope="col">P&amp;L</th></tr></thead><tbody>${history.map(p=>row(p,true)).join('')}</tbody></table></div></section>`:'';

  host.innerHTML=`<section class="native-panel cc-summary" aria-label="Covered call summary"><div class="cc-stats"><div><span>Open</span><strong>${open.length}</strong></div><div><span>Premium collected (open)</span><strong>${open.length?money(premiumSum,currencyHint):'—'}</strong></div><div><span>Realized P&amp;L</span><strong>${history.length?money(realizedSum,currencyHint):'—'}</strong></div></div><p class="fine">Updated ${esc(COVERED_CALLS.updated_at||'—')} · educational display, not a brokerage blotter</p></section>${openTable}${histTable}`;
}
async function loadCoveredCalls(){
  try{
    const r=await fetch('/data/covered-calls.json',{cache:'no-store'});
    if(!r.ok)throw Error('unavailable');
    renderCoveredCalls(await r.json());
  }catch(e){
    renderCoveredCalls({updated_at:null,positions:[]});
  }
}
loadCoveredCalls();

// PNL strip: live feed (Render JSON API, no redeploy) with same-origin fallback.
// Regular session → Daily PNL. Market closed → Since Nov 9 inception P&L (same spot).
const PNL_LIVE='https://saulfinance-pnl.onrender.com/daily-pnl.json';
const PNL_FALLBACK='/data/daily-pnl.json';
const INCEPTION_FALLBACK='/data/inception.json';
const INCEPTION_DEFAULT={inception_date:'2026-11-09',label:'Since Nov 9',start_value_cad:114897.09};
let INCEPTION=INCEPTION_DEFAULT;
function pnlMarketOpen(now=clockNow()){
  // Reuse findCurrentClose: open when a session is in progress (incl. early closes).
  return !!findCurrentClose(now);
}
function setPnlStripVisible(show){
  const els=[...document.querySelectorAll('.daily-pnl-strip')];
  for(const el of els){
    if(!el)continue;
    el.hidden=!show;
    if(!show){
      el.classList.remove('pnl-up','pnl-down');
      const label=el.querySelector('.daily-pnl-label');
      const value=el.querySelector('.daily-pnl-value');
      const face=el.querySelector('.daily-pnl-face');
      const meta=el.querySelector('.daily-pnl-meta');
      if(label)label.textContent='';
      if(value)value.textContent='';
      if(face)face.innerHTML='';
      if(meta)meta.textContent='';
      const hot=el.querySelector('.daily-pnl-hot');
      if(hot){hot.hidden=true;hot.innerHTML='';}
    }
  }
}
async function loadInception(){
  try{
    const r=await fetch(`${INCEPTION_FALLBACK}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    const j=await r.json();
    if(j&&j.start_value_cad!=null) INCEPTION={...INCEPTION_DEFAULT,...j};
  }catch(e){ /* keep default */ }
}
function sinceFromData(data){
  if(data&&data.since_cad!=null&&!Number.isNaN(Number(data.since_cad))){
    return {cad:Number(data.since_cad), pct:data.since_pct!=null?Number(data.since_pct):null};
  }
  const start=Number(data?.inception_start_cad ?? INCEPTION.start_value_cad);
  const mv=data&&data.market_value_cad!=null?Number(data.market_value_cad):null;
  if(mv==null||!start)return null;
  const cad=mv-start;
  return {cad, pct:(cad/start)*100};
}
function pnlFace(positive){
  // Inline SVG so fill color is reliable (not emoji).
  if(positive)return '<svg class="pnl-face" viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/><circle cx="10.5" cy="6.5" r="1" fill="currentColor"/><path d="M4.5 9.5c1.2 2 5.8 2 7 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  return '<svg class="pnl-face" viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/><circle cx="10.5" cy="6.5" r="1" fill="currentColor"/><path d="M4.5 11.5c1.2-2 5.8-2 7 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
}
function formatPnl(cad,pct){
  if(cad==null||Number.isNaN(Number(cad)))return '—';
  const n=Number(cad), sign=n>0?'+':(n<0?'':''); // zero still gets + below
  const signed=(n>=0?'+':'')+Math.abs(n).toLocaleString('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:0,maximumFractionDigits:0}).replace('CA$','$');
  // en-CA currency may be "$1,240"; ensure leading sign
  const dollar=(n>0?'+':n<0?'−':'+')+'$'+Math.abs(Math.round(n)).toLocaleString('en-CA');
  let pctPart='';
  if(pct!=null&&!Number.isNaN(Number(pct))){
    const p=Number(pct);
    pctPart=', '+(p>0?'+':p<0?'':'+')+p.toFixed(1)+'%';
  }
  return dollar+pctPart;
}
async function fetchPnlJson(){
  const bust='t='+Date.now();
  const urls=[`${PNL_LIVE}?${bust}`, `${PNL_FALLBACK}?${bust}`];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:'no-store',mode:'cors'});
      if(!r.ok)throw Error('HTTP '+r.status);
      return await r.json();
    }catch(e){ /* try next */ }
  }
  return null;
}

let lastPnlData=null, lastPnlOpen=null;
function formatHotPct(p){
  const n=Number(p);
  if(!Number.isFinite(n))return '';
  return (n>0?'+':n<0?'':'')+n.toFixed(1)+'%';
}
function bestPerformers(data){
  const rows=data&&Array.isArray(data.holdings_day_pct)?data.holdings_day_pct:[];
  let best=0, winners=[];
  for(const r of rows){
    const p=Number(r&&r.pct);
    const s=displayTicker(r&&r.symbol);
    if(!s||!Number.isFinite(p)||p<=0)continue;
    if(p>best){best=p;winners=[{symbol:s,pct:p}];}
    else if(p===best)winners.push({symbol:s,pct:p});
  }
  return winners;
}
function paintHotOtd(data=lastPnlData, marketOpen=lastPnlOpen){
  lastPnlData=data;
  lastPnlOpen=marketOpen;
  const winners=bestPerformers(data);
  const winnerSet=new Set(winners.map(w=>w.symbol));
  document.querySelectorAll('.hot-otd').forEach(el=>el.remove());
  if(winners.length){
    document.querySelectorAll('[data-hot-symbol]').forEach(el=>{
      const sym=el.getAttribute('data-hot-symbol');
      if(!winnerSet.has(sym))return;
      if(el.querySelector('.hot-otd'))return;
      const chip=el.classList.contains('sector-ticker')||!!el.closest('.sector-holdings');
      const badge=document.createElement('span');
      badge.className='hot-otd';
      badge.title='Best performer OTD';
      badge.setAttribute('aria-label','Best performer OTD');
      if(chip) badge.textContent='🔥';
      else badge.innerHTML='🔥 <span class="hot-otd-label">Best performer OTD</span>';
      el.appendChild(badge);
    });
  }
  const line=(marketOpen===true&&winners.length)
    ? ('🔥 '+winners.map(w=>w.symbol+' '+formatHotPct(w.pct)).join(' · ')+(winners.length===1?' today':''))
    : '';
  document.querySelectorAll('.daily-pnl-hot').forEach(el=>{
    if(!el)return;
    if(!line){el.hidden=true;el.innerHTML='';return;}
    el.hidden=false;
    el.innerHTML='<span class="daily-pnl-hot-line"></span><span class="daily-pnl-hot-sub">Best performer OTD</span>';
    const lineEl=el.querySelector('.daily-pnl-hot-line');
    if(lineEl)lineEl.textContent=line;
  });
}

function paintPnl(data, mode='daily'){
  const els=[...document.querySelectorAll('.daily-pnl-strip')]; if(!els.length)return;
  let text='—', faceHtml='', metaText='', up=null;
  const labelText=mode==='since'?(INCEPTION.label||'Since Nov 9'):'Daily PNL';
  if(mode==='since'){
    const since=sinceFromData(data);
    if(since){
      const cad=since.cad; up=cad>=0;
      text=formatPnl(cad, since.pct);
      faceHtml=pnlFace(up);
      const bits=[];
      if(data&&data.basis&&String(data.basis).toUpperCase().includes('ACTUAL'))bits.push('actual');
      if(data&&data.basis&&String(data.basis).toUpperCase().includes('PLANNED'))bits.push('model');
      if(data&&data.price_as_of)bits.push(String(data.price_as_of));
      else if(data&&data.updated_et)bits.push('updated '+data.updated_et);
      metaText=bits.join(' · ');
    }
  }else if(data&&data.day_change_cad!=null){
    const cad=Number(data.day_change_cad); up=cad>=0;
    text=formatPnl(cad,data.day_change_pct);
    faceHtml=pnlFace(up);
    const bits=[];
    if(data.basis&&String(data.basis).toUpperCase().includes('PLANNED'))bits.push('model');
    if(data.basis&&String(data.basis).toUpperCase().includes('ACTUAL'))bits.push('actual');
    if(data.delayed||(data.session==='open'))bits.push('delayed ~15 min');
    if(data.updated_et)bits.push('updated '+data.updated_et);
    else if(data.price_as_of)bits.push(String(data.price_as_of));
    metaText=bits.join(' · ');
  }
  for(const el of els){
    const label=el.querySelector('.daily-pnl-label');
    const value=el.querySelector('.daily-pnl-value');
    const face=el.querySelector('.daily-pnl-face');
    const meta=el.querySelector('.daily-pnl-meta');
    el.classList.remove('pnl-up','pnl-down');
    if(label)label.textContent=labelText;
    if(up==null){ if(value)value.textContent='—'; if(face)face.innerHTML=''; if(meta)meta.textContent=''; continue; }
    el.classList.add(up?'pnl-up':'pnl-down');
    if(value)value.textContent=text;
    if(face)face.innerHTML=faceHtml;
    if(meta)meta.textContent=metaText;
  }
}
async function fetchFallbackPnl(){
  try{
    const r=await fetch(`${PNL_FALLBACK}?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw Error('HTTP '+r.status);
    return await r.json();
  }catch(e){return null}
}
function liveMarketValue(data){
  if(!data||data.market_value_cad==null)return null;
  const n=Number(data.market_value_cad);
  return Number.isFinite(n)?n:null;
}
function paintDonutTotal(data){
  // Same public CAD total as the PNL feed (excludes CTGO / VGFCQ). Keep snapshot text if the feed has no MV.
  const els=[...document.querySelectorAll('.donut-center-value')];
  if(!els.length)return;
  const mv=liveMarketValue(data);
  if(mv==null)return;
  const text=money(mv);
  for(const el of els){ if(el) el.textContent=text; }
}
async function loadDailyPnl(){
  const open=pnlMarketOpen();
  setPnlStripVisible(true);
  let data=await fetchPnlJson();
  // If the live API is a stale pre-market seed without inception fields, prefer same-origin close snapshot.
  if(!open){
    const since=sinceFromData(data);
    if(!since){
      const fb=await fetchFallbackPnl();
      if(sinceFromData(fb)) data=fb;
    }
  }else if(!data||data.day_change_cad==null){
    const fb=await fetchFallbackPnl();
    if(fb&&fb.day_change_cad!=null) data=fb;
  }
  if(liveMarketValue(data)==null){
    const fb=await fetchFallbackPnl();
    if(liveMarketValue(fb)!=null){
      data=data?{...data,...fb}:fb;
    }
  }
  paintPnl(data, open?'daily':'since');
  paintDonutTotal(data);
  paintHotOtd(data, open);
}
(()=>{
  const tick=()=>{loadDailyPnl();};
  // After native holdings render, strip exists; re-check ~30s so open/close flip without reload.
  const boot=async()=>{await loadInception(); tick();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
  setInterval(()=>{if(document.hidden)return; tick();},30*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
})();

// Launch-day pixel firework: once per visitor, only on 2026-11-09 local date, ~2 s at 3 fps, beside the page-one title.
window.addEventListener('load',()=>setTimeout(()=>{try{
 const KEY='sff-launch-fireworks-v1',d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 if(today!=='2026-11-09'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||localStorage.getItem(KEY))return;
 const title=$('holdings-title'),host=title?.closest('.slide-heading');if(!host)return;localStorage.setItem(KEY,new Date().toISOString());
 const c=document.createElement('canvas');c.className='launch-firework';c.width=c.height=16;c.setAttribute('aria-hidden','true');
 const range=document.createRange();range.selectNodeContents(title);const rects=[...range.getClientRects()],last=rects[rects.length-1],box=host.getBoundingClientRect(),size=56;
 const copy=host.querySelector('.page-one-heading-copy')?.getBoundingClientRect();let left=last.right-box.left+10;
 if(copy&&copy.width&&left+size>copy.left-box.left-4)left=Math.max(0,copy.left-box.left-size-4);
 c.style.cssText=`position:absolute;left:${left}px;top:${last.top-box.top+last.height/2-size/2}px;width:${size}px;height:${size}px;pointer-events:none;image-rendering:pixelated;z-index:2`;
 host.style.position='relative';host.prepend(c);const g=c.getContext('2d'),cols=['#38ff77','#ffd84a','#ff6bb5','#6be8ff'];
 const frames=[[[8,14,0],[8,13,1]],[[8,9,1],[8,11,0]],[2],[4],[6],[7]];let f=0;
 const draw=()=>{g.clearRect(0,0,16,16);const fr=frames[f];
  if(Array.isArray(fr[0]))fr.forEach(([x,y,k])=>{g.fillStyle=cols[k];g.fillRect(x,y,1,1)});
  else{const r=fr[0];g.globalAlpha=f===5?.45:1;for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle=cols[i%4];g.fillRect(Math.round(8+r*Math.cos(a)),Math.round(8+r*Math.sin(a)),1,1);if(r>3&&f<5){g.fillRect(Math.round(8+(r-2)*Math.cos(a+.4)),Math.round(8+(r-2)*Math.sin(a+.4)),1,1)}}g.globalAlpha=1;g.fillStyle='#fff';if(f===2)g.fillRect(8,8,1,1)}
  if(++f<frames.length)setTimeout(draw,333);else setTimeout(()=>c.remove(),333)};draw();
}catch(e){}},400));
