import json,numpy as np,soundfile as sf
TL=json.load(open('timeline.json'));SR=44100;T=TL['total'];N=int(T*SR)+SR
sc={s['id']:s for s in TL['scenes']};ph=lambda i,k:sc[i]['phrases'][k]
rng=np.random.default_rng(3)
mus=np.zeros(N);sfx=np.zeros(N)
def add(buf,t,x,g=1.0):
    i=int(t*SR);x=x[:max(0,N-i)];buf[i:i+len(x)]+=x*g
tt=lambda d:np.arange(int(d*SR))/SR
def env(d,a=0.005,r=None):
    t=tt(d);e=np.minimum(1,t/a);return e*np.exp(-t/(r or d/4))
def note(f,d,kind='pluck'):
    t=tt(d)
    if kind=='pluck':return (np.sign(np.sin(2*np.pi*f*t))*0.3+np.sin(2*np.pi*f*t)*0.7)*env(d,0.004,0.12)
    if kind=='pad':return (np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*f*2.003*t))*np.minimum(1,t/0.08)*np.exp(-t/1.2)
    if kind=='bass':return np.sin(2*np.pi*f*t)*env(d,0.005,0.25)
# music 104 bpm
bpm=104;beat=60/bpm;bar=beat*4
mid=lambda n:440*2**((n-69)/12)
prog=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]]
bars=int(T/bar)+1
for b in range(bars):
    ch=prog[b%4];t0=b*bar
    for n in ch:add(mus,t0,note(mid(n),bar,'pad'),0.05)
    add(mus,t0,note(mid(ch[0]-24),beat*1.5,'bass'),0.25);add(mus,t0+beat*2,note(mid(ch[0]-24),beat*1.5,'bass'),0.22)
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12]
    for k in range(8):add(mus,t0+k*beat/2,note(mid(arp[k%4]),beat/2,'pluck'),0.045)
    for k in range(4):  # kick
        t=tt(0.25);add(mus,t0+k*beat,np.sin(2*np.pi*(50+90*np.exp(-t*30))*t)*np.exp(-t*12),0.35)
        h=rng.standard_normal(int(0.04*SR))*np.exp(-tt(0.04)*90);add(mus,t0+k*beat+beat/2,np.diff(h,prepend=0),0.05)
# mute music briefly for the werewolf punchline
m=np.ones(N);a,b_=int((ph('lobisomem',1)['start']-0.05)*SR),int((ph('lobisomem',1)['start']+1.4)*SR);m[a:b_]=0.25
mus*=m
# fade in/out
mus[:int(0.5*SR)]*=np.linspace(0,1,int(0.5*SR));fo=int(2*SR);e=int(T*SR);mus[e-fo:e]*=np.linspace(1,0,fo);mus[e:]=0
# sfx
def whoosh(d=0.45):
    n=rng.standard_normal(int(d*SR));t=tt(d);
    from numpy.fft import rfft,irfft
    w=np.sin(np.pi*t/d)**2;return np.convolve(n,np.ones(30)/30,'same')*w
P=ph('hook',1);pop=P['start']+P['dur']*0.72
t=tt(0.6);add(sfx,pop,(np.sin(2*np.pi*(180-120*t)*t)*np.exp(-t*8)+0.6*rng.standard_normal(len(t))*np.exp(-t*25)),0.6)
for s in TL['scenes'][1:]:add(sfx,s['start']-0.2,whoosh(),0.35)
# sad trombone
st=ph('lobisomem',1)['start']+0.2
for i,f in enumerate([294,277,262,247]):
    d=0.32 if i<3 else 0.9;t=tt(d);vib=np.sin(2*np.pi*5*t)*(3 if i==3 else 0)
    x=sum(np.sin(2*np.pi*(f+vib)*k*t)/k for k in range(1,6))*np.minimum(1,t/0.03)*np.minimum(1,(d-t)/0.08)
    add(sfx,st+i*0.3,x,0.12)
# wind in winter
c=ph('clima',3)['start'];d=sc['clima']['end']-c;n=rng.standard_normal(int(d*SR));n=np.convolve(n,np.ones(80)/80,'same');t=tt(d)
add(sfx,c,n*(0.6+0.4*np.sin(2*np.pi*0.8*t))*np.minimum(1,t/0.3)*np.minimum(1,(d-t)/0.3),1.2)
# sticker pops (soft blips)
def blip(f=900):t=tt(0.09);return np.sin(2*np.pi*f*t*(1+t*4))*np.exp(-t*40)
for t0 in [ph('praia',0)['start']+1.2,ph('praia',2)['start']+0.1,ph('clima',1)['start']+1.0,ph('clima',2)['start']+0.1,ph('final',0)['start']+1.6,ph('final',0)['start']+2.4,ph('final',1)['start']+0.1,ph('noite',1)['start'],ph('noite',2)['start']]:
    add(sfx,t0,blip(),0.25)
sf.write('music.wav',np.stack([mus,mus],1).astype(np.float32),SR)
sf.write('sfx.wav',np.stack([sfx,sfx],1).astype(np.float32),SR)
print('ok',T)
