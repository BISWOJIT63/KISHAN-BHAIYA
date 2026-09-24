import urllib.request, re, pathlib, concurrent.futures, json, html
from PIL import Image
P=pathlib.Path('C:/SIH-2026/output/kishan-bhaiya-architecture/assets');P.mkdir(exist_ok=True)
pages={'react':'https://commons.wikimedia.org/wiki/File:React_Logo_SVG.svg','node':'https://commons.wikimedia.org/wiki/File:Node.js_logo.svg','vite':'https://commons.wikimedia.org/wiki/File:Vitejs-logo.svg','tailwind':'https://commons.wikimedia.org/wiki/File:Tailwind_CSS_logo_with_dark_text.svg','mongoose':'https://mongoosejs.com/'}
urls={'express':'https://upload.wikimedia.org/wikipedia/commons/6/64/Expressjs.png','mongodb':'https://cdn.freebiesupply.com/logos/large/2x/mongodb-logo-png-transparent.png','vercel':'https://cdn.prod.website-files.com/68113529c481623a03ac2ae4/68c89fe94926d42923c5edaf_vercel-logotype-dark-transparent.png'}
urls.update({'react':'https://i.stack.imgur.com/kyKz5.png','node':'https://image.pngaaa.com/973/3729973-middle.png','vite':'https://images.seeklogo.com/logo-png/40/1/vite-logo-png_seeklogo-405912.png','tailwind':'https://logo.svgcdn.com/logos/tailwindcss.png','mongoose':'https://img.icons8.com/color/512/mongoose.png'})
urls.update({'vite':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Vitejs-logo.svg/2078px-Vitejs-logo.svg.png','tailwind':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Tailwind_CSS_logo_with_dark_text.svg/3840px-Tailwind_CSS_logo_with_dark_text.svg.png'})
for key, page in [('react','https://freebiesupply.com/logos/react-logo/'),('node','https://freebiesupply.com/logos/node-js-logo/')]:
 try:
  raw=urllib.request.urlopen(urllib.request.Request(page,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode()
  urls[key]=next(html.unescape(s) for s in re.findall(r'https://cdn.freebiesupply.com/[^\s"<>]+\.png',raw) if 'transparent' in s)
 except Exception as e:print('lookup',key,str(e))
def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read()
def work(k):
 try:
  u=urls.get(k)
  if not u:
   t=get(pages[k]).decode(); candidates=re.findall(r'(?:src|href)=["\']([^"\']+\.png(?:\?[^"\']*)?)["\']',t)
   candidates=[html.unescape(s) for s in candidates]
   if k=='mongoose':
    u='https://mongoosejs.com/docs/images/favicon/android-icon-192x192.png'
   else:
    names={'react':'React_Logo_SVG','node':'Node.js_logo','vite':'Vitejs-logo','tailwind':'Tailwind_CSS_logo_with_dark_text'}
    u=next(s for s in candidates if 'upload.wikimedia.org' in s and names[k] in s)
   if u.startswith('//'):u='https:'+u
  data=get(u);p=P/(k+'.png');p.write_bytes(data);a=Image.open(p);print(k,a.format,a.size,a.mode,'alpha',a.convert('RGBA').getchannel('A').getextrema());return k,u
 except Exception as e:print(k,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: results=list(ex.map(work,list(urls)))
(P/'sources.json').write_text(json.dumps(dict(x for x in results if x),indent=2))
