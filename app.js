'use strict';
const cards=window.WORDS;
const $=id=>document.getElementById(id);
let index=0,expanded=false,start=null;
const drafts=new Map();
const key=id=>'pocket-words:note:v1:'+id;
function render(){
 stopPronunciation();
 const c=cards[index];
 $('word').textContent=c.word;$('back-word').textContent=c.word;$('part').textContent=c.part;$('phonetic').textContent=c.phonetic;
 $('meaning').textContent=c.meaning;$('english').textContent=c.english;
 $('position').textContent=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
 $('total').textContent=cards.length+' 張字卡';
 $('examples').replaceChildren(...c.examples.map(([en,zh])=>{const li=document.createElement('li');for(const [text,lang] of [[en,'en'],[zh,'zh-Hant']]){const p=document.createElement('p');p.textContent=text;p.lang=lang;li.append(p)}return li}));
 $('dots').replaceChildren(...cards.map((_,i)=>{const dot=document.createElement('i');dot.className=i===index?'active':'';return dot}));
 $('save-state').textContent='自動儲存';
 try{$('note').value=drafts.has(c.id)?drafts.get(c.id):(localStorage.getItem(key(c.id))||'')}catch{$('note').value=drafts.get(c.id)||'';$('save-state').textContent='無法儲存，請保留備註副本'}
 syncReveal();
}
function syncReveal(){if(!expanded)stopPronunciation();$('answer').hidden=!expanded;$('front').hidden=expanded;}
let moving=false,dragX=0,suppressClickUntil=0,neighbor=null,neighborStep=0;
const stage=document.createElement('div');
stage.className='card-stage';
$('card').before(stage);stage.append($('card'));
const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cardDistance=()=>$('card').getBoundingClientRect().width+16;
function clearNeighbor(){
 if(neighbor)neighbor.remove();
 neighbor=null;neighborStep=0;stage.style.minHeight='';
}
function prepareNeighbor(step){
 if(neighbor&&neighborStep===step)return;
 clearNeighbor();
 const c=cards[(index+step+cards.length)%cards.length];
 neighbor=$('card').cloneNode(true);
 neighbor.classList.add('card-neighbor');
 neighbor.style.transform='';
 neighbor.inert=true;neighbor.setAttribute('aria-hidden','true');
 const find=id=>neighbor.querySelector('[id="'+id+'"]');
 for(const [id,value] of Object.entries({'word':c.word,'back-word':c.word,'part':c.part,'phonetic':c.phonetic,'meaning':c.meaning,'english':c.english}))find(id).textContent=value;
 find('front').hidden=expanded;find('answer').hidden=!expanded;
 find('speech-status').hidden=true;find('pronounce').dataset.speaking='false';
 find('examples').replaceChildren(...c.examples.map(([en,zh])=>{
  const li=document.createElement('li');
  for(const [text,lang] of [[en,'en'],[zh,'zh-Hant']]){const p=document.createElement('p');p.textContent=text;p.lang=lang;li.append(p);}
  return li;
 }));
 try{find('note').value=drafts.has(c.id)?drafts.get(c.id):(localStorage.getItem(key(c.id))||'');}
 catch{find('note').value=drafts.get(c.id)||'';}
 find('save-state').textContent='自動儲存';
 // Preserve styling without introducing duplicate IDs into the document.
 for(const el of [neighbor,...neighbor.querySelectorAll('[id]')]){
  if(el.id){el.dataset.cardId=el.id;el.removeAttribute('id');}
 }
 neighborStep=step;
 neighbor.style.transform='translateX('+(step*cardDistance())+'px)';
 stage.append(neighbor);
 stage.style.minHeight=Math.max($('card').offsetHeight,neighbor.offsetHeight)+'px';
}
function positionPair(x){
 dragX=x;
 if(reduceMotion())return;
 if(x)prepareNeighbor(x<0?1:-1);
 $('card').style.transform='translateX('+x+'px)';
 if(neighbor)neighbor.style.transform='translateX('+(x+neighborStep*cardDistance())+'px)';
}
async function animateCard(card,to,duration){
 const transform='translateX('+to+'px)';
 if(reduceMotion()||!card.animate){card.style.transform=transform;return;}
 const animation=card.animate([{transform:card.style.transform||'translateX(0px)'},{transform}],{duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'});
 try{await animation.finished;}catch{}finally{card.style.transform=transform;animation.cancel();}
}
async function move(step){
 if(moving)return;
 moving=true;start=null;stopPronunciation();
 const card=$('card');
 card.inert=true;$('prev').disabled=true;$('next').disabled=true;
 try{
  prepareNeighbor(step);
  const distance=cardDistance();
  if(!reduceMotion())neighbor.style.transform='translateX('+(dragX+step*distance)+'px)';
  // Start both animations in the same frame, keeping the gap fixed.
  await Promise.all([animateCard(card,-step*distance,280),animateCard(neighbor,0,280)]);
  index=(index+step+cards.length)%cards.length;
  render();
 }finally{
  card.style.transform='';clearNeighbor();dragX=0;moving=false;card.inert=false;
  $('prev').disabled=false;$('next').disabled=false;
 }
}
async function resetDrag(){
 start=null;
 if(moving)return;
 moving=true;
 try{
  const motions=[animateCard($('card'),0,200)];
  if(neighbor)motions.push(animateCard(neighbor,neighborStep*cardDistance(),200));
  await Promise.all(motions);
 }finally{$('card').style.transform='';clearNeighbor();dragX=0;moving=false;}
}
$('card').addEventListener('click',e=>{
 if(moving||Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}
},true);
$('front').addEventListener('click',()=>{expanded=true;syncReveal();$('flip-back').focus({preventScroll:true})});
$('flip-back').addEventListener('click',()=>{expanded=false;syncReveal();$('front').focus({preventScroll:true})});
$('prev').addEventListener('click',()=>move(-1));$('next').addEventListener('click',()=>move(1));
$('note').addEventListener('input',()=>{const id=cards[index].id;drafts.set(id,$('note').value);try{localStorage.setItem(key(id),$('note').value);$('save-state').textContent='已儲存'}catch{$('save-state').textContent='儲存失敗，請複製備份'}});
document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable="true"]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
$('card').addEventListener('touchstart',e=>{
 if(moving)return;
 if(e.touches.length!==1||e.target.closest('textarea,input,#pronounce,#flip-back')){start=null;return;}
 start={x:e.touches[0].clientX,y:e.touches[0].clientY,axis:null};dragX=0;
},{passive:true});
$('card').addEventListener('touchmove',e=>{
 if(!start||moving)return;
 if(e.touches.length!==1){resetDrag();return;}
 const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;
 if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)start.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
 if(start.axis!=='x')return;
 if(e.cancelable)e.preventDefault();
 suppressClickUntil=Date.now()+500;
 positionPair(Math.max(-cardDistance(),Math.min(cardDistance(),dx)));
},{passive:false});
$('card').addEventListener('touchend',e=>{
 if(!start||moving)return;
 const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
 const horizontal=start.axis==='x'||(!start.axis&&Math.abs(dx)>Math.abs(dy)*1.5);
 start=null;
 if(horizontal&&Math.abs(dx)>Math.min(65,$('card').getBoundingClientRect().width*.2)){
  suppressClickUntil=Date.now()+500;move(dx<0?1:-1);
 }else if(dragX){suppressClickUntil=Date.now()+500;resetDrag();}
},{passive:true});
$('card').addEventListener('touchcancel',()=>{if(dragX)suppressClickUntil=Date.now()+500;resetDrag();},{passive:true});
const speechSupported='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let activeUtterance=null;
function stopPronunciation(){
 if(activeUtterance && speechSupported){activeUtterance=null;window.speechSynthesis.cancel();}
 $('pronounce').dataset.speaking='false';
 $('speech-status').hidden=true;
}
$('pronounce').addEventListener('click',()=>{
 stopPronunciation();
 const report=message=>{$('speech-status').textContent=message;$('speech-status').hidden=false;};
 if(!speechSupported){report('此瀏覽器不支援發音，請使用 Safari 或 Chrome 開啟。');return;}
 try{
  const utterance=new window.SpeechSynthesisUtterance(cards[index].word);
  const voices=window.speechSynthesis.getVoices();
  const voice=voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en([-_]|$)/i.test(v.lang));
  utterance.lang=voice?voice.lang:'en-US';
  if(voice)utterance.voice=voice;
  utterance.rate=0.85;
  activeUtterance=utterance;
  utterance.onend=()=>{if(activeUtterance===utterance){activeUtterance=null;$('pronounce').dataset.speaking='false';}};
  utterance.onerror=e=>{if(activeUtterance!==utterance)return;activeUtterance=null;$('pronounce').dataset.speaking='false';if(e.error!=='canceled'&&e.error!=='interrupted')report('暫時無法播放發音，請再試一次，並確認裝置已提供英文語音。');};
  $('pronounce').dataset.speaking='true';
  window.speechSynthesis.speak(utterance);
 }catch{activeUtterance=null;$('pronounce').dataset.speaking='false';report('暫時無法播放發音，請再試一次。');}
});
window.addEventListener('pagehide',stopPronunciation);
render();
