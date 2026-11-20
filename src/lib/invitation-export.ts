import type {InvitationCardData,InvitationDraft} from "./invitation-cards";
import { invitationUrl } from "./invitation-cards";

type Card = InvitationDraft|InvitationCardData;
type ExportShape = "story"|"post";
const palette={
 neon:{a:"#ff319e",b:"#8068ff",c:"#24dcee",bg:"#090814"},
 smoke:{a:"#ff841f",b:"#bb5fff",c:"#ffbe73",bg:"#09080e"},
 gold:{a:"#f2c575",b:"#ad7b42",c:"#fff0b8",bg:"#0c0a0a"},
};

function roundedRectangle(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();
}
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxW:number,maxLines=4){
 const words=text.replace(/\s+/g," ").trim().split(" ");
 const lines:string[]=[];let line="";
 for(const word of words){
  const next=line?line+" "+word:word;
  if(ctx.measureText(next).width>maxW&&line){lines.push(line);line=word;}
  else line=next;
 }
 if(line)lines.push(line);
 if(lines.length>maxLines){lines.length=maxLines;let tail=lines[maxLines-1] ?? "";while(ctx.measureText(tail+"…").width>maxW)tail=tail.slice(0,-1);lines[maxLines-1]=tail+"…";}
 return lines;
}
async function loadInviteImage(url:string):Promise<HTMLImageElement|null>{
 try{
  const img=new Image();img.crossOrigin="anonymous";img.referrerPolicy="no-referrer";img.src=url;
  await img.decode();return img;
 }catch{return null;}
}
function coverImage(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number){
 const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
 const sw=w/scale,sh=h/scale;
 ctx.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h);
}
export async function downloadInvitationCreative(card:Card,shape:ExportShape){
 const story=shape==="story";const width=1080,height=story?1920:1080;
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Seu navegador não permite gerar esta imagem.");
 const c=palette[card.theme]||palette.neon;
 const gradient=ctx.createLinearGradient(0,0,width,height);
 gradient.addColorStop(0,c.bg);gradient.addColorStop(.54,"#171125");gradient.addColorStop(1,c.bg);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 const glow=(x:number,y:number,r:number,color:string)=>{
  const radial=ctx.createRadialGradient(x,y,10,x,y,r);
  radial.addColorStop(0,color);radial.addColorStop(1,"transparent");
  ctx.fillStyle=radial;ctx.fillRect(x-r,y-r,r*2,r*2);
 };
 ctx.globalAlpha=.25;glow(width*.82,height*.28,width*.7,c.a);glow(width*.15,height*.72,width*.68,c.b);ctx.globalAlpha=1;
 ctx.save();ctx.translate(width*.50,height*.33);ctx.rotate(-.17);
 ctx.strokeStyle=c.b;ctx.globalAlpha=.32;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,440,330,0,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.globalAlpha=1;
 const padding=80;
 // Soft framed artwork is optional; text remains legible on opaque glass.
 const image=card.image_url?await loadInviteImage(card.image_url):null;
 if(image){
  const x=story?115:540,y=story?245:120,w=story?850:450,h=story?680:520;
  ctx.save();roundedRectangle(ctx,x,y,w,h,42);ctx.clip();coverImage(ctx,image,x,y,w,h);
  ctx.fillStyle="rgba(8,6,17,.30)";ctx.fillRect(x,y,w,h);ctx.restore();
 }else{
  ctx.save();ctx.translate(story?540:780,story?640:310);
  ctx.strokeStyle=c.b;ctx.lineWidth=17;ctx.globalAlpha=.75;
  roundedRectangle(ctx,-165,-145,330,330,60);ctx.stroke();
  ctx.fillStyle=c.a;ctx.font='900 60px "Unbounded", sans-serif';ctx.textAlign="center";ctx.fillText("CRAZY",0,24);
  ctx.restore();ctx.globalAlpha=1;
 }
 await document.fonts.ready;
 ctx.textAlign="left";ctx.fillStyle="#ffffff";ctx.font='900 56px "Unbounded", sans-serif';
 ctx.fillText("CRAZY",padding,story?125:95);
 const brandWidth=ctx.measureText("CRAZY").width;
 ctx.fillStyle=c.a;ctx.fillText("PODS",padding+brandWidth+9,story?125:95);
 ctx.textAlign="center";
 const contentStart=story?1050:520;
 ctx.font='800 29px "Manrope", sans-serif';ctx.fillStyle=c.c;
 ctx.fillText(card.eyebrow.toUpperCase(),width/2,contentStart);
 ctx.font='900 66px "Unbounded", sans-serif';ctx.fillStyle="#ffffff";
 const title=wrapText(ctx,card.title,900,story?4:3);
 const lineHeight=87;let y=contentStart+95;
 for(const line of title){ctx.fillText(line,width/2,y);y+=lineHeight;}
 ctx.font='500 29px "Manrope", sans-serif';ctx.fillStyle="#d6ccdf";
 const subtitle=wrapText(ctx,card.subtitle,880,story?5:2);
 y+=15;for(const line of subtitle){ctx.fillText(line,width/2,y);y+=43;}
 y+=33;
 const btnWidth=690,btnHeight=96;
 const btnX=(width-btnWidth)/2;
 const btnGradient=ctx.createLinearGradient(btnX,0,btnX+btnWidth,0);
 btnGradient.addColorStop(0,c.a);btnGradient.addColorStop(1,c.b);
 ctx.fillStyle=btnGradient;roundedRectangle(ctx,btnX,y,btnWidth,btnHeight,35);ctx.fill();
 ctx.font='900 32px "Manrope",sans-serif';ctx.fillStyle="#ffffff";
 ctx.fillText(card.cta_label.toUpperCase(),width/2,y+62);
 const footer=story?height-120:height-65;
 ctx.fillStyle=c.c;ctx.font='800 22px "Manrope",sans-serif';ctx.fillText("LINK DISPONÍVEL NA MENSAGEM OU NO PERFIL",width/2,footer-40);
 ctx.fillStyle="#b6abc2";ctx.font='600 20px "Manrope",sans-serif';ctx.fillText(invitationUrl(card.slug),width/2,footer);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Não foi possível gerar o PNG.")),"image/png"));
 const href=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=href;a.download=`crazy-${card.slug}-${shape}.png`;a.click();
 window.setTimeout(()=>URL.revokeObjectURL(href),60_000);
}
