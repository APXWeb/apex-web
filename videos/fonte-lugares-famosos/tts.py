import json,soundfile as sf,numpy as np
from kokoro_onnx import Kokoro
k=Kokoro("/tmp/tts/kokoro-v1.0.onnx","/tmp/tts/voices-v1.0.bin")
S=json.load(open("script.json"));sr=24000;out=[];t=0.4;audio=[np.zeros(int(0.4*sr))]
for si,sc in enumerate(S):
  sc["start"]=t;ph=[]
  for li,line in enumerate(sc["lines"]):
    s,_=k.create(line,voice="pm_alex",speed=1.15,lang="pt-br")
    # trim silence
    idx=np.where(np.abs(s)>0.01)[0];s=s[max(0,idx[0]-240):idx[-1]+480]
    d=len(s)/sr;ph.append({"text":line,"start":round(t,3),"dur":round(d,3)})
    audio.append(s);t+=d
    gap=0.22 if li<len(sc["lines"])-1 else 0.45
    audio.append(np.zeros(int(gap*sr)));t+=gap
  sc["phrases"]=ph;sc["end"]=t
audio.append(np.zeros(int(1.2*sr)));t+=1.2;S[-1]["end"]=t
sf.write("vo/voice.wav",np.concatenate(audio),sr)
json.dump({"total":t,"scenes":S},open("timeline.json","w"),ensure_ascii=False,indent=1)
print("total",round(t,2));[print(s["id"],round(s["start"],2),round(s["end"],2)) for s in S]
