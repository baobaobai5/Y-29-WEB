import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
const source=fs.readFileSync('dist/app.js','utf8');
const required=['dist/index.html','dist/styles.css','dist/app.js','dist/catalog.json'];
for(const file of required)assert(fs.statSync(file).size>0,file);
const urls=new Set();function assets(x){if(typeof x==='string'&&x.startsWith('/assets/'))urls.add(x);else if(Array.isArray(x))x.forEach(assets);else if(x&&typeof x==='object')Object.values(x).forEach(assets)}assets(catalog);
for(const url of urls)assert(fs.existsSync('dist'+url),'Missing asset '+url);
const els=new Map();function element(key){if(!els.has(key))els.set(key,{innerHTML:'',textContent:'',value:'',hidden:false,style:{},classList:{toggle(){},remove(){}},addEventListener(){},close(){},showModal(){},querySelector:element,scrollIntoView(){}});return els.get(key)}
const storage=new Map(),location={pathname:'/',search:'',href:'http://localhost:5173/'};
const setUrl=url=>{const u=new URL(url,location.href);Object.assign(location,{pathname:u.pathname,search:u.search,href:u.href})};
const context={console,URL,URLSearchParams,Map,Set,AbortController,document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}},location,history:{pushState:(a,b,url)=>setUrl(url),replaceState:(a,b,url)=>setUrl(url)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>structuredClone(catalog)}),matchMedia:()=>({matches:true}),setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){},scrollTo(){}},navigator:{}};
await vm.runInNewContext('(async()=>{'+source+';globalThis.test={navigate,actions,listing,renderListing,themePage,read,getMovies:()=>movies,getCurrent:()=>currentMovie};})()',context);
const test=context.test;assert(test,'Application initialization failed');assert(element('#app').innerHTML.includes('推荐影片轮播'));
for(const path of ['/movie/list?cat_id=13','/movie/list?cat_id=14','/movie/rank','/mine/help','/mine/favorites','/mine/history']){test.navigate(path);assert(element('#app').innerHTML.length>100,path)}
test.navigate('/search?q='+encodeURIComponent('醒来'));assert(element('#app').innerHTML.includes('醒来'));assert(element('#app').innerHTML.includes('movie-card'));
test.navigate('/search?q='+encodeURIComponent('不会存在的片名__test'));assert(element('#app').innerHTML.includes('暂无符合条件'));
test.navigate('/search?q='+encodeURIComponent('<img src=x onerror=alert(1)>'));assert(!element('#app').innerHTML.includes('<img src=x'));
const movie=test.getMovies().find(m=>m.name==='醒来');assert(movie);test.navigate('/movie/detail/'+movie.slug+'-'+movie.id);assert(element('#app').innerHTML.includes('data-episode="22"'));assert(test.read('history').some(m=>m.id===movie.id));test.actions.favorite();assert(test.read('favorites').includes(movie.id));test.actions.favorite();assert(!test.read('favorites').includes(movie.id));
for(const t of catalog.themeDetails){test.navigate('/theme-detail/'+t.id);assert(element('#app').innerHTML.includes('theme-hero'));assert(element('#app').innerHTML.includes(t.name))}
for(const b of catalog.banners.filter(b=>b.link.startsWith('/movie/detail/'))){test.navigate(b.link);assert(!element('#app').innerHTML.includes('暂未收录'),b.name)}
test.navigate('/movie/list?cat_id=15');assert(element('#app').innerHTML.includes('movie-card'),'Documentary category empty');
console.log(`Validated: ${test.getMovies().length} films, ${catalog.themeDetails.length} topics, ${urls.size} local assets; search, empty state, escaping, filters, detail, episodes, favorites, history and banner routes.`);
