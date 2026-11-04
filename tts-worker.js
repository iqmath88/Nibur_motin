// Optional Cloudflare Worker example, NOT part of the GitHub Pages web app.
// SECURITY: This is a demonstration ONLY. Add authentication and rate limits
// before public deployment or someone may spend your API balance.
export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=env.ALLOWED_ORIGIN||'https://iqmath88.github.io';
  if(origin!==allowed)return new Response('Forbidden',{status:403});
  const cors={'Access-Control-Allow-Origin':allowed,'Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{headers:{...cors,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'}});
  if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
  if(!env.OPENAI_API_KEY)return new Response('Missing server secret',{status:500,headers:cors});
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.text!=='string'||!body.text.trim()||body.text.length>4000)return new Response('Invalid text',{status:400,headers:cors});
  const voices=['marin','cedar','coral','alloy','nova','onyx','shimmer'];
  const voice=voices.includes(body.voice)?body.voice:'marin';
  const speed=Math.min(1.3,Math.max(.7,Number(body.speed)||1));
  // TEMPORARY: gpt-4o-mini-tts is deprecated; migrate before 2027-01-06.
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',input:body.text,voice,speed,response_format:'mp3'})});
  if(!response.ok)return new Response('Upstream speech generation failed',{status:502,headers:cors});
  return new Response(response.body,{headers:{...cors,'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
}};
