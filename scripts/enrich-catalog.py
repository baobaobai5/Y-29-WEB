import json,re,subprocess,concurrent.futures,pathlib,hashlib
root=pathlib.Path('dist');h=json.loads((root/'catalog.json').read_text());assets=json.load(open('scripts/asset-manifest.json'));cache=pathlib.Path('/tmp/safilm-pages');cache.mkdir(exist_ok=True)
urls=[('theme-'+t['id'],'https://safilm69.com/theme-detail/'+t['id']) for t in h['themes']]+[('cat-'+c,'https://safilm69.com/movie/list?cat_id='+c+'&position=movie') for c in ['13','12','11','16','14','15']]+[('detail-'+b['link'].split('/')[-1],'https://safilm69.com'+b['link']) for b in h['banners'] if b['link'].startswith('/movie/detail/')]
def fetch(pair):
 name,url=pair;dest=cache/(name+'.html')
 if not dest.exists():subprocess.run(['curl','-fLsS','--max-time','25',url,'-o',str(dest)],capture_output=True)
 return (name,dest)
def decode(path):
 x=json.loads(re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>',path.read_text()).group(1))
 def d(i):
  if i<0:return None
  a=x[i]
  if isinstance(a,dict):return {k:d(v) for k,v in a.items()}
  if isinstance(a,list):return d(a[1]) if a and isinstance(a[0],str) and len(a)>1 else [d(v) for v in a if isinstance(v,int)]
  return a
 return d(0)['data']
def image(url):
 if not url:return ''
 if url.startswith('/assets/'):return url
 if url not in assets:assets[url]='/assets/'+hashlib.sha256(url.encode()).hexdigest()[:20]+('.png' if url.endswith('.png') else '.jpg')
 return assets[url]
keep=['id','name','img','score','duration','category','tags','actor','description','issue_date','issue_year','heat','slug','area','language','director']
def clean(m):
 c={k:v for k,v in m.items() if k in keep};c['img']=image(c.get('img',''));
 if isinstance(c.get('category'),dict):c['category']=c['category']['name']
 if c.get('category') in ['国产动漫','日韩动漫','欧美动漫']:c['category']='动漫'
 if m.get('actors'):c['actor']=m['actors']
 if m.get('links') and m['links'][0].get('items'):c['duration']=('全' if m.get('update_status_text')=='已完结' else '更新至')+str(len(m['links'][0]['items']))+'集'
 return c
extra=[];h['themeDetails']=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for name,path in pool.map(fetch,urls):
  try:data=decode(path)
  except Exception as e:print('Unavailable:',name);continue
  if name.startswith('theme-'):
   t=next((v for k,v in data.items() if '/movie/themeDetail' in k),None)
   if t:
    blocks=[dict(name=s['name'],items=[clean(m) for m in s['items']]) for s in t['blocks']]
    h['themeDetails'].append(dict(id=t['id'],name=t['name'],description=t['description'],bg_img=image(t['bg_img']),blocks=blocks))
    extra.extend(m for s in blocks for m in s['items'])
  elif name.startswith('cat-'):
   result=next((v for k,v in data.items() if '/search/movie' in k),None)
   if result:extra.extend(clean(m) for m in result['data'] if m.get('type')=='video')
  else:
   result=next((v['data'] for k,v in data.items() if '/movie/detail' in k),None)
   if result:
    c=clean(result);c['slug']=name[7:].rsplit('-',1)[0]
    # Infer episode count only from the published episode list.
    for k in ['series','series_list','episodes']:
     if isinstance(result.get(k),list):c['duration']='全'+str(len(result[k]))+'集'
    extra.append(c)
# Fill existing cards with matching public metadata, preserving displayed duration.
byname={m['name']:m for m in extra}
for s in h['home_recommends']+h['sections']:
 for m in s['items']:
  if m['name'] in byname:
   old=m.copy();m.update({k:v for k,v in byname[m['name']].items() if v});m['duration']=old['duration']
h['extraMovies']=extra
h['ad']=image('https://cdn.g3ejjm8m.com/hc237/uploads/default/other/2026-04-24/de3bedb40e7b01f295d798ff8c4dcd28.jpg')
(root/'catalog.json').write_text(json.dumps(h,ensure_ascii=False));pathlib.Path('scripts/asset-manifest.json').write_text(json.dumps(assets,indent=2));print('Topics:',len(h['themeDetails']),'Additional records:',len(extra),'Assets:',len(assets))
