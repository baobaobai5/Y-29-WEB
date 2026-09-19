import json,subprocess,concurrent.futures,pathlib
assets=json.load(open('scripts/asset-manifest.json'))
def download(pair):
 u,p=pair;dest=pathlib.Path('dist'+p)
 if dest.exists() and dest.stat().st_size>500:return True
 r=subprocess.run(['curl','-fLsS','--retry','2','--max-time','40',u,'-o',str(dest)],capture_output=True)
 return r.returncode==0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 results=list(pool.map(download,assets.items()))
print('Downloaded',sum(results),'/',len(results))
