import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
const source=fs.readFileSync('dist/app.js','utf8');
const required=['dist/index.html','dist/styles.css','dist/app.js','dist/catalog.json'];
for(const file of required)assert(fs.statSync(file).size>0,file);
const urls=new Set();function assets(x){if(typeof x==='string'&&x.startsWith('/assets/'))urls.add(x);else if(Array.isArray(x))x.forEach(assets);else if(x&&typeof x==='object')Object.values(x).forEach(assets)}assets(catalog);
for(const url of urls)assert(fs.existsSync('dist'+url),'Missing asset '+url);
const els=new Map();function element(key){if(!els.has(key))els.set(key,{innerHTML:'',textContent:'',value:'',hidden:false,style:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},close(){},showModal(){},querySelector:element,scrollIntoView(){}});return els.get(key)}
const storage=new Map(),location={pathname:'/',search:'',href:'http://localhost:5173/'};
const setUrl=url=>{const u=new URL(url,location.href);Object.assign(location,{pathname:u.pathname,search:u.search,href:u.href})};
const context={console,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},location,history:{pushState:(a,b,url)=>setUrl(url),replaceState:(a,b,url)=>setUrl(url)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>structuredClone(catalog)}),matchMedia:()=>({matches:true}),setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){},scrollTo(){}},navigator:{}};
await vm.runInNewContext('(async()=>{'+source+';globalThis.test={rank,periodHeat,getRankState:()=>rankState,navigate,actions,listing,renderListing,themePage,read,getMovies:()=>movies,getCurrent:()=>currentMovie};})()',context);
const test=context.test;assert(test,'Application initialization failed');assert(element('#app').innerHTML.includes('推荐影片轮播'));
for(const path of ['/movie/list?cat_id=13','/movie/list?cat_id=14','/movie/rank','/mine/help','/mine/favorites','/mine/history']){test.navigate(path);assert(element('#app').innerHTML.length>100,path)}
test.navigate('/search?q='+encodeURIComponent('醒来'));assert(element('#app').innerHTML.includes('醒来'));assert(element('#app').innerHTML.includes('movie-card'));
test.navigate('/search?q='+encodeURIComponent('不会存在的片名__test'));assert(element('#app').innerHTML.includes('暂无符合条件'));
test.navigate('/search?q='+encodeURIComponent('<img src=x onerror=alert(1)>'));assert(!element('#app').innerHTML.includes('<img src=x'));
const movie=test.getMovies().find(m=>m.name==='醒来');assert(movie);test.navigate('/movie/detail/'+movie.slug+'-'+movie.id);assert(element('#app').innerHTML.includes('data-episode="22"'));assert(test.read('history').some(m=>m.id===movie.id));test.actions.favorite();assert(test.read('favorites').includes(movie.id));test.actions.favorite();assert(!test.read('favorites').includes(movie.id));assert(test.read('favorite-counts').find(x=>x.id===movie.id).count===368);test.actions.favorite();assert(test.read('favorites').includes(movie.id));assert(test.read('favorite-counts').find(x=>x.id===movie.id).count===369);
test.actions.feedback();const feedback=element('#modal').innerHTML;assert((feedback.match(/name="issue"/g)||[]).length===6);assert(feedback.includes('maxlength="100"'));assert(feedback.includes('feedback-count'));
test.actions.share();const share=element('#modal').innerHTML;assert(share.includes(movie.name));assert(share.includes('facebook.com/sharer/sharer.php'));assert(share.includes('twitter.com/intent/tweet'));assert(share.includes('t.me/share/url'));assert(share.includes('data-action="copy-share"'));
for(const t of catalog.themeDetails){test.navigate('/theme-detail/'+t.id);assert(element('#app').innerHTML.includes('theme-hero'));assert(element('#app').innerHTML.includes(t.name))}
for(const b of catalog.banners.filter(b=>b.link.startsWith('/movie/detail/'))){test.navigate(b.link);assert(!element('#app').innerHTML.includes('暂未收录'),b.name)}
test.navigate('/movie/list?cat_id=15');assert(element('#app').innerHTML.includes('movie-card'),'Documentary category empty');
console.log(`Validated: ${test.getMovies().length} films, ${catalog.themeDetails.length} topics, ${urls.size} local assets; search, empty state, escaping, filters, detail, episodes, favorites, history and banner routes.`);

const rankViews=[];for(const period of ['year','month','week']){test.rank('电影',period);const html=element('#app').innerHTML;assert(html.includes('data-rank-period="'+period+'" aria-pressed="true"'));assert.equal(test.getRankState().period,period);rankViews.push(html)}assert.equal(new Set(rankViews).size,3);test.rank('综艺');assert.equal(test.getRankState().period,'week');assert.equal(test.getRankState().cat,'综艺');assert.equal(test.periodHeat({id:'demo',heat:'1.2w'},'year'),12000);console.log('Validated ranking period selection, category preservation, and heat units.');
