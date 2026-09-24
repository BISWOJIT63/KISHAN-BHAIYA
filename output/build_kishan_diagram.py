from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET
import html, math, pathlib, base64

OUT=pathlib.Path('C:/SIH-2026/output/kishan-bhaiya-architecture'); OUT.mkdir(parents=True,exist_ok=True)
W,H,S=2600,1800,2
im=Image.new('RGB',(W*S,H*S),'white'); d=ImageDraw.Draw(im)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="white"/>']
mx=ET.Element('mxfile',host='app.diagrams.net'); diagram=ET.SubElement(mx,'diagram',name='KISHAN BHAIYA'); model=ET.SubElement(diagram,'mxGraphModel',page='1',pageWidth=str(W),pageHeight=str(H),background='#ffffff'); root=ET.SubElement(model,'root'); ET.SubElement(root,'mxCell',id='0'); ET.SubElement(root,'mxCell',id='1',parent='0')
counter=1
INK='#172B40'; MUTED='#526477'; BLUE='#2474CF'; PURPLE='#8252C7'; GREEN='#2B8C58'; ORANGE='#D58223'; GRAY='#9CAAB8'
def cell(value,style,x,y,w,h):
 global counter
 counter+=1; c=ET.SubElement(root,'mxCell',id=str(counter),value=value,style=style,vertex='1',parent='1'); ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'}); return c
def rect(x,y,w,h,fill='white',stroke=GRAY,r=16,sw=2,dash=False):
 d.rounded_rectangle((x*S,y*S,(x+w)*S,(y+h)*S),radius=r*S,fill=fill,outline=stroke,width=sw*S)
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"'+(' stroke-dasharray="9 7"' if dash else '')+'/>')
 cell('',f'rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'+('dashed=1;' if dash else ''),x,y,w,h)
def text(x,y,s,size=25,color=INK,bold=False,anchor='start'):
 font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',size*S)
 width=d.textlength(s,font=font)/S; xx=x-width/2 if anchor=='middle' else x-width if anchor=='end' else x
 d.text((xx*S,y*S),s,font=font,fill=color)
 svg.append(f'<text x="{x}" y="{y+size*.91}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" text-anchor="{anchor}">{html.escape(s)}</text>')
 cell(s,f'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontFamily=Arial;fontSize={size};fontColor={color};fontStyle={1 if bold else 0};spacing=0;',xx,y,width+12,size*1.35)
def line(points,color=GRAY,sw=2,dash=False,start=False,end=True):
 def seg(a,b):
  if not dash:d.line([tuple(v*S for v in a),tuple(v*S for v in b)],fill=color,width=sw*S)
  else:
   dx,dy=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dy)
   for q in range(0,int(length),17):
    t=min(q+9,length); d.line([(int((a[0]+dx*q/length)*S),int((a[1]+dy*q/length)*S)),(int((a[0]+dx*t/length)*S),int((a[1]+dy*t/length)*S))],fill=color,width=sw*S)
 for a,b in zip(points,points[1:]):seg(a,b)
 svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="{sw}"'+(' stroke-dasharray="9 8"' if dash else '')+'/>')
 for enabled,p,q in [(start,points[0],points[1]),(end,points[-1],points[-2])]:
  if enabled:
   dx,dy=p[0]-q[0],p[1]-q[1]; le=math.hypot(dx,dy); ux,uy=dx/le,dy/le
   tri=[p,(p[0]-12*ux+5*uy,p[1]-12*uy-5*ux),(p[0]-12*ux-5*uy,p[1]-12*uy+5*ux)]
   d.polygon([(int(a*S),int(b*S)) for a,b in tri],fill=color);svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in tri)+f'" fill="{color}"/>')
 global counter
 counter+=1;c=ET.SubElement(root,'mxCell',id=str(counter),style=f'edgeStyle=none;rounded=0;strokeColor={color};strokeWidth={sw};startArrow={"block" if start else "none"};endArrow={"block" if end else "none"};'+('dashed=1;' if dash else ''),edge='1',parent='1');g=ET.SubElement(c,'mxGeometry',relative='1',**{'as':'geometry'});ET.SubElement(g,'mxPoint',x=str(points[0][0]),y=str(points[0][1]),**{'as':'sourcePoint'});ET.SubElement(g,'mxPoint',x=str(points[-1][0]),y=str(points[-1][1]),**{'as':'targetPoint'});a=ET.SubElement(g,'Array',**{'as':'points'});
 for x,y in points[1:-1]:ET.SubElement(a,'mxPoint',x=str(x),y=str(y))
def label(x,y,s,size=22,color=MUTED):text(x,y,s,size,color,anchor='middle')
def logo(name,x,y,w,h):
 p=OUT/'assets'/(name+'.png');a=Image.open(p).convert('RGBA'); scale=min(w/a.width,h/a.height); ww,hh=a.width*scale,a.height*scale;xx,yy=x+(w-ww)/2,y+(h-hh)/2
 resized=a.resize((round(ww*S),round(hh*S)),Image.Resampling.LANCZOS);im.paste(resized,(round(xx*S),round(yy*S)),resized)
 b64=base64.b64encode(p.read_bytes()).decode();uri='data:image/png;base64,'+b64
 svg.append(f'<image x="{xx}" y="{yy}" width="{ww}" height="{hh}" href="{uri}"/>')
 cell('',f'shape=image;imageAspect=1;aspect=fixed;image=data:image/png,{b64};',xx,yy,ww,hh)
def panel(x,w,title,sub,color,fill):
 rect(x,270,w,890,'white',color,20,2)
 rect(x+18,281,w-36,52,color,color,10,1);text(x+33,288,title.upper(),32,'white',True)
 if title=='Users':text(x+26,354,sub,25,INK,True)

text(50,35,'KISHAN BHAIYA',48,INK,True)
text(52,99,'Agricultural marketplace & logistics platform  /  System architecture',25,MUTED)
line([(1990,65),(2050,65)],INK,3);text(2070,48,'Main connection',22,MUTED)
line([(2290,65),(2350,65)],GRAY,2,True);text(2370,48,'Optional',22,MUTED)

panel(50,300,'Users','8 platform roles',MUTED,'#F7F9FB')
panel(430,640,'Frontend','React  ·  Vite  ·  Tailwind CSS',BLUE,'#F3F8FF')
panel(1200,680,'Backend','Node.js  ·  Express',PURPLE,'#F9F5FF')
panel(2010,540,'Database','Mongoose  ·  MongoDB',GREEN,'#F3FAF5')
for x,w in [(455,185),(652,150),(814,231)]:rect(x,344,w,58,'white','#D9E7F7',9,1)
logo('react',463,348,53,50);text(526,359,'React',23,INK,True)
logo('vite',660,348,49,50);text(720,359,'Vite',23,INK,True)
logo('tailwind',826,352,207,42)
rect(1230,344,294,58,'white','#D9CBEA',9,1);logo('node',1247,348,100,49);text(1370,359,'Node.js',24,INK,True)
rect(1536,344,314,58,'white','#D9CBEA',9,1);logo('express',1575,351,236,42)
rect(2035,344,220,58,'white','#D4E7DA',9,1);logo('mongoose',2040,344,68,58);text(2108,361,'Mongoose',21,INK,True)
rect(2267,344,258,58,'white','#D4E7DA',9,1);logo('mongodb',2279,351,234,44)
line([(750,270),(750,214),(1540,214),(1540,270)],BLUE,3,start=True)
label(1145,150,'HTTPS REST API / JSON · JWT authentication',25,BLUE)
line([(1700,270),(1700,214),(2280,214),(2280,270)],GREEN,3,start=True)
label(2025,165,'Mongoose · MONGODB_URI',24,GREEN)
line([(350,450),(430,450)],INK,3);label(390,394,'Use',21)
roles=['Consumer','Business Buyer','Farmer','FPO Manager','Fleet Partner','Driver','Logistics Operator','Admin']
for i,r in enumerate(roles):
 rect(72,424+i*83,256,62,'white','#D9E1E9',12,1);text(92,440+i*83,r,25)
text(458,412,'APPLICATION FEATURES',19,BLUE,True)
features=['Marketplace, cart and orders','Bulk procurement and negotiation','Farmer and FPO dashboards','Logistics and admin dashboards']
for i,t in enumerate(features):
 rect(455,451+i*65,590,53,'white','#D9E7F7',10,1);text(475,463+i*65,t,25)
text(458,743,'SUPPORTING TECHNOLOGIES',19,BLUE,True)
support=[('React Router','Navigation and role checks'),('TanStack Query','Server-data cache'),('Zustand','Session, cart and preferences'),('Axios','API communication'),('Dexie / IndexedDB','Offline drafts'),('PWA','Cached app assets')]
for i,(a,b) in enumerate(support):
 y=785+i*57;text(457,y,a,23,INK,True);text(685,y,b,23,MUTED)
text(1228,412,'REQUEST PROCESSING',19,PURPLE,True)
for y,t in [(452,'Authentication & Validation'),(551,'API Routes')]:
 rect(1230,y,620,65,'white','#D9CBEA',12,1);label(1540,y+17,t,27,INK)
line([(1540,517),(1540,551)],PURPLE,2)
line([(1540,616),(1540,650)],PURPLE,2)
rect(1230,650,620,328,'white','#D9CBEA',12,1);text(1252,670,'Business Services',27,PURPLE,True)
for i,t in enumerate(['Supplier matching and','multi-seller fulfilment','Inventory reservation','Route optimization','Demand forecasting','FPO aggregation and settlements']):text(1253,717+i*39,t,25)
line([(1540,978),(1540,1020)],PURPLE,2)
rect(1230,1020,620,65,'white','#D9CBEA',12,1);label(1540,1037,'Mongoose',27,PURPLE)
text(2037,412,'PERSISTENT RECORDS',19,GREEN,True)
records=[['Users and verification'],['Products, inventory','and harvests'],['Orders, quotations','and payments'],['Shipments and vehicles'],['FPO records, settlements','and audit logs']]
for i,ls in enumerate(records):
 y=451+i*127;rect(2035,y,490,104,'white','#D4E7DA',12,1)
 for j,t in enumerate(ls):text(2058,y+(33 if len(ls)==1 else 18)+j*34,t,26)

text(50,1220,'Optional / configuration-dependent',28,MUTED,True)
line([(750,1160),(750,1310)],BLUE,2,True,True)
line([(1540,1160),(1540,1280)],PURPLE,2,True,True,False)
line([(1410,1280),(2325,1280)],PURPLE,2,True,False,False)
for x in [1410,1850,2325]:line([(x,1280),(x,1310)],PURPLE,2,True,False,True)
rect(430,1310,640,150,'white',GRAY,16,1,True)
text(455,1329,'Socket.IO runtime',27,INK,True)
text(455,1371,'Live updates · VITE_SOCKET_URL',24,MUTED)
text(455,1410,'Requires a persistent server',24,MUTED)
for x,w,title,desc in [(1200,420,'OSRM / Nominatim','Routing and geocoding'),(1660,380,'OpenAI API','Forecasting and transcription'),(2080,470,'Razorpay test / mock provider','Payments')]:
 rect(x,1310,w,150,'white',GRAY,16,1,True);text(x+20,1336,title,25,INK,True);text(x+20,1390,desc,22,MUTED)

rect(50,1520,2500,230,'#FFF9F0',ORANGE,20,2)
text(75,1540,'Deployment',30,ORANGE,True);logo('vercel',75,1592,255,57)
rect(390,1550,570,105,'white','#EDCCA5',12,1)
text(410,1564,'Frontend deployment',27,BLUE,True)
text(410,1607,'client → hosts React application',25)
rect(1270,1550,570,105,'white','#EDCCA5',12,1)
text(1290,1564,'Backend deployment',27,PURPLE,True)
text(1290,1607,'server → hosts Express API',25)
line([(960,1580),(1270,1580)],ORANGE,2);label(1115,1546,'VITE_API_URL',22,ORANGE)
line([(1270,1633),(960,1633)],ORANGE,2);label(1115,1598,'CLIENT_URL',22,ORANGE)
label(1115,1650,'Allowed frontend origin',19,MUTED)
rect(2190,1550,325,105,'white','#B9D9C5',12,1);label(2352,1583,'MongoDB',28,GREEN)
line([(1840,1603),(2190,1603)],ORANGE,2);label(2015,1565,'MONGODB_URI',23,ORANGE)
rect(75,1668,280,56,'white','#EDCCA5',12,1);text(93,1681,'Vercel Cron',24,ORANGE,True)
line([(355,1696),(1555,1696),(1555,1655)],ORANGE,2)
rect(600,1676,640,40,'#FFF9F0','#FFF9F0',0,1);label(920,1681,'Freshness and recurring-procurement jobs',24,ORANGE)

svg.append('</svg>');(OUT/'KISHAN-BHAIYA-architecture.svg').write_text('\n'.join(svg),encoding='utf-8');ET.ElementTree(mx).write(OUT/'KISHAN-BHAIYA-architecture.drawio',encoding='utf-8',xml_declaration=True)
im.save(OUT/'KISHAN-BHAIYA-architecture.png',dpi=(300,300));im.resize((1560,1080),Image.Resampling.LANCZOS).save(OUT/'preview.png')
print(OUT)
