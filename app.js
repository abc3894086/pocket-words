'use strict';
const cards=window.WORDS;
const $=id=>document.getElementById(id);
let index=0,expanded=false,start=null;
const drafts=new Map();
const key=id=>'pocket-words:note:v1:'+id;
function render(){
 stopPronunciation();
 const c=cards[index];expanded=false;
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
function move(step){index=(index+step+cards.length)%cards.length;render()}
$('front').addEventListener('click',()=>{expanded=true;syncReveal();$('flip-back').focus({preventScroll:true})});
$('flip-back').addEventListener('click',()=>{expanded=false;syncReveal();$('front').focus({preventScroll:true})});
$('prev').addEventListener('click',()=>move(-1));$('next').addEventListener('click',()=>move(1));
$('note').addEventListener('input',()=>{const id=cards[index].id;drafts.set(id,$('note').value);try{localStorage.setItem(key(id),$('note').value);$('save-state').textContent='已儲存'}catch{$('save-state').textContent='儲存失敗，請複製備份'}});
document.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,[contenteditable="true"]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
$('card').addEventListener('touchstart',e=>{start=!e.target.closest('textarea')&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
$('card').addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1)},{passive:true});
$('card').addEventListener('touchcancel',()=>{start=null},{passive:true});
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
