from html.parser import HTMLParser
from pathlib import Path
import json,re,hashlib
class N:
 def __init__(self,t='',a={},p=None):self.t=t;self.a=a;self.p=p;self.c=[]
 def all(self,fn):
  out=[]
  for c in self.c:
   if isinstance(c,N):
    if fn(c):out.append(c)
    out+=c.all(fn)
  return out
 def text(self):return ''.join(c.text() if isinstance(c,N) else c for c in self.c)
 def has(self,s):return s in self.a.get('class','').split()
class P(HTMLParser):
 def __init__(self):super().__init__();self.root=N();self.n=self.root
 def handle_starttag(self,t,a):
  n=N(t,dict(a),self.n);self.n.c.append(n)
  if t not in ['img','input','meta','link','br','hr','source','wbr','area','embed']:self.n=n
 def handle_endtag(self,t):
  n=self.n
  while n.p:
   if n.t==t:self.n=n.p;return
   n=n.p
 def handle_data(self,d):self.n.c.append(d)
p=P();p.feed(Path('/tmp/safilm.html').read_text());h=json.load(open('/tmp/home-data.json'))
sections=[]
for sec in p.root.all(lambda n:n.t=='section'):
 heads=sec.all(lambda n:n.t=='h2')
 if len(heads)!=1:continue
 cards=[]
 for card in sec.all(lambda n:n.has('c-movie-list-item')):
  overlay=card.all(lambda n:n.has('movie-overlay'))
  if not overlay:continue
  ov=overlay[0]; imgs=ov.all(lambda n:n.t=='img' and n.a.get('alt')=='预览')
  if not imgs:continue
  name=ov.all(lambda n:n.has('text-[16px]'))[0].text()
  txt=ov.text();match=lambda s: re.search(s,txt).group(1) if re.search(s,txt) else ''
  tags=[n.text() for n in card.all(lambda n:n.t=='span' and n.has('movie-overlay__tag'))]
  score=card.all(lambda n:n.has('italic'))
  alltext=card.text();dur=re.search(r'(?:全|更新至)\d+集',alltext)
  img=imgs[0].a['src'];tail=card.c[-1].text() if isinstance(card.c[-1],N) else ''
  cards.append(dict(id=hashlib.md5(name.encode()).hexdigest()[:16],name=name,img=img,score=score[0].text() if score else '9.0',duration=dur.group() if dur else '全1集',category=tags[0] if tags else '电影',tags=[{'name':t} for t in tags[1:]],actor=match(r'主演:(.*?)简介:'),description=match(r'简介:(.*?)(?:[0-9.]+w)'),issue_date=match(r'上映:(.*?)主演:'),heat=match(r'([0-9.]+w)'),slug=hashlib.md5(name.encode()).hexdigest()[:16]))
 if cards:sections.append(dict(name=heads[0].text(),items=cards))
h['sections']=sections
# Keep only public catalog fields; do not copy remote scripts or service configuration.
keep=['id','name','img','score','duration','category','tags','actor','description','issue_date','issue_year','heat','slug','area','language','director']
for sec in h['home_recommends']+h['sections']:
 sec['items']=[{k:v for k,v in c.items() if k in keep} for c in sec['items']]
h.pop('block_filter',None)
Path('dist/catalog.json').write_text(json.dumps(h,ensure_ascii=False))
urls={b['content'] for b in h['banners']}|{c['img'] for s in h['home_recommends']+h['sections'] for c in s['items']}|{s['icon'] for s in h['home_recommends']}
urls.add('https://safilm69.com/images/header/pc/logo.png')
assetmap={u:'/assets/'+hashlib.sha256(u.encode()).hexdigest()[:20]+('.png' if u.endswith('.png') else '.jpg') for u in urls}
Path('scripts/asset-manifest.json').write_text(json.dumps(assetmap,indent=2))
for b in h['banners']:b['content']=assetmap[b['content']]
for s in h['home_recommends']+h['sections']:
 if 'icon' in s:s['icon']=assetmap[s['icon']]
 for c in s['items']:c['img']=assetmap[c['img']]
h['logo']=assetmap['https://safilm69.com/images/header/pc/logo.png']
Path('dist/catalog.json').write_text(json.dumps(h,ensure_ascii=False))
print('Sections:',[(s['name'],len(s['items'])) for s in sections]);print('Assets:',len(urls))
