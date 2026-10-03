const API="https://api.geckoterminal.com/api/v2";
const NETWORK="base";
let pools=[], bitqueryTokens=[], watchlist=JSON.parse(localStorage.getItem("baseHunterWatchlist")||"[]");

const $=id=>document.getElementById(id);
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>{v=num(v);if(!v)return"$0";if(v>=1e6)return`$${(v/1e6).toFixed(2)}M`;if(v>=1e3)return`$${(v/1e3).toFixed(1)}K`;return`$${v.toFixed(2)}`};
const price=v=>{v=num(v);if(!v)return"—";return v>=1?`$${v.toFixed(4)}`:`$${v.toPrecision(4)}`};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ageMin=d=>{let t=new Date(d).getTime();return Number.isFinite(t)?Math.max(0,(Date.now()-t)/60000):Infinity};
const ageText=m=>!Number.isFinite(m)?"—":m<1?"<۱ دقیقه":m<60?`${Math.floor(m)} دقیقه`:m<1440?`${Math.floor(m/60)} ساعت`:`${Math.floor(m/1440)} روز`;

async function gecko(){
  const urls=[1,2].map(p=>`${API}/networks/${NETWORK}/new_pools?page=${p}&include=base_token,quote_token,dex`);
  const data=(await Promise.all(urls.map(u=>fetch(u,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()})))).flatMap(x=>x.data||[]);
  return data.map(pool=>{
    const a=pool.attributes||{}, r=pool.relationships||{}, id=r?.base_token?.data?.id||"";
    return {id:"g:"+pool.id,name:a.name||"Unknown",symbol:a.symbol||"",address:id.includes("_")?id.split("_").pop():"",price:num(a.base_token_price_usd),liquidity:num(a.reserve_in_usd),volume:num(a.volume_usd?.h24),tx:num(a.transactions?.h24?.buys)+num(a.transactions?.h24?.sells),createdAt:a.pool_created_at,pool:pool.id?.split("_").pop()||"",source:"GeckoTerminal"};
  });
}

async function bitqueryFile(){
  try{
    const r=await fetch("data/bitquery.json?ts="+Date.now(),{cache:"no-store"});
    if(!r.ok)return[];
    const j=await r.json();
    return Array.isArray(j.tokens)?j.tokens:[];
  }catch{return[]}
}

function watchRows(){
  return watchlist.map(address=>({id:"u:"+address,address,source:"Unibot Scanner",name:"Imported CA",symbol:"",price:0,liquidity:0,volume:0,tx:0,createdAt:null}));
}

function render(){
  const f={maxAge:num($("maxAge").value),minLiquidity:num($("minLiquidity").value),minVolume:num($("minVolume").value),sort:$("sortBy").value};
  let list=[...pools,...bitqueryTokens,...watchRows()];
  const seen=new Set();list=list.filter(x=>{let k=(x.address||x.id||"").toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true});
  list=list.map(x=>({...x,age:ageMin(x.createdAt)})).filter(x=>!Number.isFinite(x.age)||x.age<=f.maxAge).filter(x=>x.liquidity>=f.minLiquidity||x.source==="Unibot Scanner").filter(x=>x.volume>=f.minVolume||x.source==="Unibot Scanner");
  if(f.sort==="liquidity")list.sort((a,b)=>b.liquidity-a.liquidity);else if(f.sort==="volume")list.sort((a,b)=>b.volume-a.volume);else if(f.sort==="tx")list.sort((a,b)=>b.tx-a.tx);else list.sort((a,b)=>a.age-b.age);
  $("tokenRows").innerHTML="";
  for(const p of list){
    const tr=document.createElement("tr"), addr=esc(p.address);
    const cls=p.source==="Bitquery"?"source-bitquery":p.source==="Unibot Scanner"?"source-unibot":"source-gecko";
    tr.innerHTML=`<td class="${cls}">${esc(p.source)}</td><td><b>${esc(p.name)}</b><span class="symbol"> ${esc(p.symbol)}</span></td><td>${ageText(p.age)}</td><td>${price(p.price)}</td><td>${money(p.liquidity)}</td><td>${money(p.volume)}</td><td>${num(p.tx).toLocaleString("en-US")}</td><td><span class="address"><code title="${addr}">${addr||"—"}</code>${addr?`<button class="copy-btn" data-address="${addr}">کپی</button>`:""}</span></td><td>${p.pool?`<a class="link" target="_blank" rel="noopener" href="https://www.geckoterminal.com/base/pools/${encodeURIComponent(p.pool)}">Gecko</a>`:addr?`<a class="link" target="_blank" rel="noopener" href="https://basescan.org/token/${encodeURIComponent(p.address)}">BaseScan</a>`:"—"}</td>`;
    $("tokenRows").appendChild(tr);
  }
  $("empty").classList.toggle("hidden",list.length>0);
  $("status").textContent=`${list.length} مورد نمایش داده شد · Gecko ${pools.length} · Bitquery ${bitqueryTokens.length} · Unibot واردشده ${watchlist.length}`;
}

function renderWatchlist(){
  $("watchlist").innerHTML=watchlist.map(a=>`<span class="tag">${esc(a)} <button data-remove="${esc(a)}">×</button></span>`).join("");
}

async function load(){
  $("status").textContent="در حال دریافت GeckoTerminal و داده Bitquery...";
  try{
    const [g,b]=await Promise.all([gecko(),bitqueryFile()]);
    pools=g;bitqueryTokens=b;render();
    $("lastUpdated").textContent="آخرین بروزرسانی: "+new Date().toLocaleTimeString("fa-IR");
  }catch(e){console.error(e);$("status").textContent="خطا در دریافت GeckoTerminal؛ داده Bitquery ممکن است همچنان قابل نمایش باشد.";bitqueryTokens=await bitqueryFile();render()}
}

$("refreshBtn").onclick=load;
["maxAge","minLiquidity","minVolume","sortBy"].forEach(id=>$(id).onchange=render);
$("addCaBtn").onclick=()=>{
  const a=$("caInput").value.trim();
  if(/^0x[a-fA-F0-9]{40}$/.test(a)&&!watchlist.map(x=>x.toLowerCase()).includes(a.toLowerCase())){
    watchlist.unshift(a);localStorage.setItem("baseHunterWatchlist",JSON.stringify(watchlist));$("caInput").value="";renderWatchlist();render();
  }else alert("Contract Address معتبر Base را وارد کن.");
};
$("watchlist").onclick=e=>{const a=e.target.dataset.remove;if(!a)return;watchlist=watchlist.filter(x=>x!==a);localStorage.setItem("baseHunterWatchlist",JSON.stringify(watchlist));renderWatchlist();render()};
document.addEventListener("click",async e=>{const b=e.target.closest(".copy-btn");if(!b)return;try{await navigator.clipboard.writeText(b.dataset.address)}catch{const t=document.createElement("textarea");t.value=b.dataset.address;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}b.textContent="کپی شد ✓";setTimeout(()=>b.textContent="کپی",1000)});
renderWatchlist();load();setInterval(load,60000);
