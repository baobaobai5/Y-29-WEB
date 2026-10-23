import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {showCoinRecharge} from '../dist/coin-recharge.js';
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
const aggregationSource=fs.readFileSync('dist/aggregation.js','utf8').replace('export function renderAggregation','function renderAggregation');
const source=aggregationSource+'\n'+fs.readFileSync('dist/app.js','utf8').replace("import {showCoinRecharge} from './coin-recharge.js';",'').replace("import {renderAggregation} from './aggregation.js';",'');
const required=['dist/index.html','dist/styles.css','dist/app.js','dist/catalog.json'];
for(const file of required)assert(fs.statSync(file).size>0,file);
const urls=new Set();function assets(x){if(typeof x==='string'&&x.startsWith('/assets/'))urls.add(x);else if(Array.isArray(x))x.forEach(assets);else if(x&&typeof x==='object')Object.values(x).forEach(assets)}assets(catalog);
for(const url of urls)assert(fs.existsSync('dist'+url),'Missing asset '+url);
const els=new Map();function element(key){if(!els.has(key))els.set(key,{innerHTML:'',textContent:'',value:'',hidden:false,style:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},close(){},showModal(){},querySelector:element,scrollIntoView(){}});return els.get(key)}
const storage=new Map(),location={pathname:'/',search:'',href:'http://localhost:5173/'};
const setUrl=url=>{const u=new URL(url,location.href);Object.assign(location,{pathname:u.pathname,search:u.search,href:u.href})};
const context={showCoinRecharge,console,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},location,history:{pushState:(a,b,url)=>setUrl(url),replaceState:(a,b,url)=>setUrl(url)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>structuredClone(catalog)}),matchMedia:()=>({matches:true}),setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){},scrollTo(){}},navigator:{}};
await vm.runInNewContext('(async()=>{'+source+';globalThis.test={rank,periodHeat,getRankState:()=>rankState,navigate,actions,listing,renderListing,themePage,read,getMovies:()=>movies,getCurrent:()=>currentMovie};})()',context);
const test=context.test;assert(test,'Application initialization failed');assert(element('#app').innerHTML.includes('推荐影片轮播'));
for(const path of ['/movie/list?cat_id=13','/movie/list?cat_id=14','/movie/rank','/mine/favorites','/mine/history']){test.navigate(path);assert(element('#app').innerHTML.length>100,path)}
test.navigate('/search?q='+encodeURIComponent('醒来'));assert(element('#app').innerHTML.includes('醒来'));assert(element('#app').innerHTML.includes('movie-card'));
test.navigate('/search?q='+encodeURIComponent('不会存在的片名__test'));assert(element('#app').innerHTML.includes('阿偶，没有找到您想要的内容哦~'));assert(element('#app').innerHTML.includes('/assets/search-empty.png'));
test.navigate('/search?q='+encodeURIComponent('<img src=x onerror=alert(1)>'));assert(!element('#app').innerHTML.includes('<img src=x'));
const movie=test.getMovies().find(m=>m.name==='醒来');assert(movie);test.navigate('/movie/detail/'+movie.slug+'-'+movie.id);assert(element('#app').innerHTML.includes('data-episode="22"'));assert(test.read('history').some(m=>m.id===movie.id));test.actions.favorite();assert(test.read('favorites').includes(movie.id));test.actions.favorite();assert(!test.read('favorites').includes(movie.id));assert(test.read('favorite-counts').find(x=>x.id===movie.id).count===368);test.actions.favorite();assert(test.read('favorites').includes(movie.id));assert(test.read('favorite-counts').find(x=>x.id===movie.id).count===369);
test.actions.feedback();const feedback=element('#modal').innerHTML;assert((feedback.match(/name="issue"/g)||[]).length===6);assert(feedback.includes('maxlength="100"'));assert(feedback.includes('feedback-count'));
test.actions.share();const share=element('#modal').innerHTML;assert(share.includes(movie.name));assert(share.includes('facebook.com/sharer/sharer.php'));assert(share.includes('twitter.com/intent/tweet'));assert(share.includes('t.me/share/url'));assert(share.includes('data-action="copy-share"'));
for(const t of catalog.themeDetails){test.navigate('/theme-detail/'+t.id);assert(element('#app').innerHTML.includes('theme-hero'));assert(element('#app').innerHTML.includes(t.name))}
// Every topic page includes 31 content cards and one advertisement, including the last page.
for(const t of catalog.themeDetails){
 test.navigate('/theme-detail/'+t.id);
 const first=element('#app').innerHTML;
 const total=Number(first.match(/<span>共 (\d+) 条<\/span>/)?.[1]);
 assert(total>=62&&total%31===0,'Topic demo data must fill complete pages');
 for(const page of [1,total/31]){
  test.navigate('/theme-detail/'+t.id+'?page='+page);
  const html=element('#app').innerHTML;
  assert.equal((html.match(/class="movie-card"/g)||[]).length,31,t.name);
  assert.equal((html.match(/class="listing-ad-card"/g)||[]).length,1,t.name);
  assert(html.includes('theme-pagination'));
 }
}
for(const b of catalog.banners.filter(b=>b.link.startsWith('/movie/detail/'))){test.navigate(b.link);assert(!element('#app').innerHTML.includes('暂未收录'),b.name)}
test.navigate('/movie/list?cat_id=15');assert(element('#app').innerHTML.includes('movie-card'),'Documentary category empty');
console.log(`Validated: ${test.getMovies().length} films, ${catalog.themeDetails.length} topics, ${urls.size} local assets; search, empty state, escaping, filters, detail, episodes, favorites, history and banner routes.`);

const rankViews=[];for(const period of ['year','month','week']){test.rank('电影',period);const html=element('#app').innerHTML;assert(html.includes('data-rank-period="'+period+'" aria-pressed="true"'));assert.equal(test.getRankState().period,period);rankViews.push(html)}assert.equal(new Set(rankViews).size,3);test.rank('综艺');assert.equal(test.getRankState().period,'week');assert.equal(test.getRankState().cat,'综艺');assert.equal(test.periodHeat({id:'demo',heat:'1.2w'},'year'),12000);console.log('Validated ranking period selection, category preservation, and heat units.');

test.rank('电影','month',1);const rankFirst=element('#app').innerHTML;assert.equal((rankFirst.match(/class="rank-item"/g)||[]).length,30);test.rank('电影','month',2);const rankSecond=element('#app').innerHTML;assert(rankSecond.includes('class="rank-badge">31</span>'));assert(!rankSecond.includes('class="rank-number">1</span>'));assert.equal(test.getRankState().page,2);test.rank('电影','week');assert.equal(test.getRankState().page,1);test.rank('电影','week',999);const totalMovies=test.getMovies().filter(m=>m.category==='电影').length;assert.equal(test.getRankState().page,Math.ceil(totalMovies/30));assert.equal((element('#app').innerHTML.match(/class="rank-item"/g)||[]).length,totalMovies%30||30);console.log('Validated ranking pagination: 30 rows, continuous ranks, filter reset and last-page bounds.');

test.navigate('/movie/rank?preview=empty');const rankEmpty=element('#app').innerHTML;assert(rankEmpty.includes('阿偶，没有找到您想要的内容哦~'));assert(rankEmpty.includes('/assets/rank-empty.png'));assert(!rankEmpty.includes('class="rank-item"'));assert(!rankEmpty.includes('rank-pagination'));test.navigate('/movie/rank');assert(element('#app').innerHTML.includes('class="rank-item"'));assert(!element('#app').innerHTML.includes('class="rank-empty"'));console.log('Validated ranking empty state and normal-list recovery.');
// Search and category pages share all six filter groups; resets retain the query.
test.navigate('/search?q='+encodeURIComponent('醒来'));
for(const key of ['cat','tag','area','language','year','status'])assert(element('#app').innerHTML.includes(`data-filter="${key}"`));
const searchMovie=test.getMovies().find(m=>m.name==='醒来');
test.navigate('/search?q='+encodeURIComponent('醒来')+'&cat_id=15');
assert(element('#app').innerHTML.includes('阿偶，没有找到您想要的内容哦~'));assert(element('#app').innerHTML.includes('/assets/search-empty.png'));
test.actions['reset-filters']();
assert.equal(new URLSearchParams(location.search).get('q'),'醒来');
assert(element('#app').innerHTML.includes('movie-card'));
console.log('Validated search filters and query-preserving reset.');
test.navigate('/search?q='+encodeURIComponent('醒来'));assert.equal((element('#app').innerHTML.match(/class="movie-card"/g)||[]).length,28);assert(element('#app').innerHTML.includes('共 36 条 · 每页 28 条'));test.navigate('/search?q='+encodeURIComponent('醒来')+'&page=2');assert.equal((element('#app').innerHTML.match(/class="movie-card"/g)||[]).length,8);assert(element('#app').innerHTML.includes('演示28'));assert(!element('#app').innerHTML.includes('演示01'));test.navigate('/search?q='+encodeURIComponent('醒来')+'&page=99');assert(element('#app').innerHTML.includes('演示35'));console.log('Validated search pagination: 28 items, 36 total, distinct pages and last-page bounds.');

const categoryLinks=[...element('#header').innerHTML.matchAll(/href="([^\"]*&amp;tag=[^\"]*)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
assert(categoryLinks.length>0,'Category submenus should expose tag filters');
for(const url of categoryLinks){test.navigate(url);assert(element('#app').innerHTML.includes('class="movie-card"'),'Submenu filter should have matching content: '+url)}
console.log('Validated category submenu links and matching filtered results.');

test.navigate('/apps');assert(element('#app').innerHTML.includes('应用中心'));assert.equal((element('#app').innerHTML.match(/class="app-tile"/g)||[]).length,80);assert(element('#header').innerHTML.indexOf('排行榜')<element('#header').innerHTML.indexOf('应用中心'));console.log('Validated application center route and 80 application entries.');

for(const category of ['游戏','工具','福利']){test.navigate('/apps?category='+encodeURIComponent(category));const count=(element('#app').innerHTML.match(/class="app-tile"/g)||[]).length;assert(count>0&&count<80,'Application category must filter items');}

test.navigate('/apps?category='+encodeURIComponent('任务'));assert(!element('#app').innerHTML.includes('class="app-tile"'));assert(element('#app').innerHTML.includes('/assets/app-task-empty.png'));assert(element('#app').innerHTML.includes('阿偶，没有找到您想要的内容哦~'));test.navigate('/apps');assert.equal((element('#app').innerHTML.match(/class="app-tile"/g)||[]).length,80);console.log('Validated task empty state and return to recommended apps.');

const skeletonSource=fs.readFileSync('dist/skeleton.js','utf8');
for(const [path,marker] of [['/','sk-hero'],['/movie/list','sk-filters'],['/search','sk-filters'],['/movie/rank','sk-ranks'],['/movie/detail/demo','sk-detail'],['/mine/favorites','sk-profile'],['/mine/history','sk-profile'],['/apps','sk-apps'],['/hot-topics','sk-aggregation'],['/theme-detail/demo','sk-banner']]){setUrl(path);vm.runInNewContext(skeletonSource,context);assert(element('#app').innerHTML.includes(marker),'Missing skeleton for '+path);assert(element('#app').innerHTML.includes('role="status"'));}
console.log('Validated skeleton layouts for all page routes.');

// Aggregation routes retain period/topic state and compose the existing cards.
test.navigate('/hot-topics');
let aggregationHTML=element('#app').innerHTML;
assert(aggregationHTML.includes('本期全部热词'));
assert.equal((aggregationHTML.match(/class="ag-topic"/g)||[]).length,4);
assert(aggregationHTML.includes('data-ag-load'));
assert(aggregationHTML.includes('class="home-ad-row"'));
test.navigate('/hot-topics?period=2026-09-1&topic=2');
aggregationHTML=element('#app').innerHTML;
assert(aggregationHTML.includes('2026 · 09月上半月'));
assert.equal((aggregationHTML.match(/class="ag-topic"/g)||[]).length,1);
assert(aggregationHTML.includes(catalog.themeDetails[2].name));
assert(!aggregationHTML.includes('data-ag-load'));
test.navigate('/hot-topics?period=invalid&topic=%3Cscript%3E');
assert.equal((element('#app').innerHTML.match(/class="ag-topic"/g)||[]).length,4);
assert(!element('#app').innerHTML.includes('<script>'));
test.navigate('/apps');assert.equal(element('#app').onclick,null);
console.log('Validated aggregation: 4 initial groups, period/topic filtering, invalid parameters, shared cards/ads and route cleanup.');

// Full-topic navigation, distinct pagination and safe parameter handling.
test.navigate('/hot-topics?period=2026-09-1&topic=2&view=all');
let allHTML=element('#app').innerHTML;
assert(allHTML.includes('全部内容列表'));
assert(allHTML.includes('短剧配饭刚刚好'));
assert.equal((allHTML.match(/class="movie-card/g)||[]).length,24);
assert(allHTML.includes('page=2'));
assert(!allHTML.includes('本期全部热词'));
const firstPage=allHTML;
test.navigate('/hot-topics?period=2026-09-1&topic=2&view=all&page=2');
allHTML=element('#app').innerHTML;
assert.notEqual(firstPage,allHTML);
assert.equal((allHTML.match(/class="movie-card/g)||[]).length,24);
test.navigate('/hot-topics?topic=2&view=all&page=999');
assert.equal((element('#app').innerHTML.match(/class="movie-card/g)||[]).length,12);
test.navigate('/hot-topics?topic=2&view=all&page=NaN');
assert.equal((element('#app').innerHTML.match(/class="movie-card/g)||[]).length,24);
test.navigate('/hot-topics?topic=invalid&view=all');
assert(element('#app').innerHTML.includes('未找到这个热搜专题'));
console.log('Validated full-topic view: independent page, 24-item paging, last page, invalid values and return link.');

// Archive entry and every published period resolve to their own topic page.
test.navigate('/hot-topics?period=2026-09-1');
assert(element('#app').innerHTML.includes('view=archive'));
test.navigate('/hot-topics?period=2026-09-1&view=archive');
const archiveHTML=element('#app').innerHTML;
assert.equal((archiveHTML.match(/class="ag-period-card"/g)||[]).length,20);
assert(archiveHTML.includes('href="/hot-topics?period=2026-09-1"'));
const archivedPeriods=[...archiveHTML.matchAll(/class="ag-period-open" href="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(archivedPeriods).size,20);
for(const path of archivedPeriods){test.navigate(path);const html=element('#app').innerHTML;assert(html.includes('本期全部热词'));assert(!html.includes('NaN'));assert(html.includes('aria-current="page"'));}
console.log('Validated archive: 20 distinct periods, preserved return period and valid topic destinations.');
