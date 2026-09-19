from pathlib import Path
import json,subprocess,concurrent.futures,os
root=Path('dist');data=json.loads((root/'catalog.json').read_text());large={b['content'] for b in data['banners']}|{t['bg_img'] for t in data.get('themeDetails',[])};protected={data['logo']}|{s['icon'] for s in data['home_recommends']}
paths=list((root/'assets').glob('*'));before=sum(p.stat().st_size for p in paths);changes={}
def optimize(p):
 url='/assets/'+p.name
 if url in protected:return
 target=p.with_suffix('.jpg');tmp=Path('/tmp')/('safilm-opt-'+target.name)
 cmd=['sips','-s','format','jpeg','-s','formatOptions','80','-Z','1920' if url in large else '640',str(p),'--out',str(tmp)]
 r=subprocess.run(cmd,capture_output=True)
 if r.returncode==0 and tmp.exists() and tmp.stat().st_size<p.stat().st_size:
  os.replace(tmp,target)
  if target!=p:p.unlink()
  changes[url]='/assets/'+target.name
 elif tmp.exists():tmp.unlink()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(optimize,paths))
def rewrite(x):
 if isinstance(x,str):return changes.get(x,x)
 if isinstance(x,list):return [rewrite(v) for v in x]
 if isinstance(x,dict):return {k:rewrite(v) for k,v in x.items()}
 return x
(root/'catalog.json').write_text(json.dumps(rewrite(data),ensure_ascii=False));manifest=json.load(open('scripts/asset-manifest.json'));Path('scripts/asset-manifest.json').write_text(json.dumps(rewrite(manifest),indent=2));after=sum(p.stat().st_size for p in (root/'assets').glob('*'));print('Assets optimized:',round(before/1048576,1),'MB to',round(after/1048576,1),'MB')
