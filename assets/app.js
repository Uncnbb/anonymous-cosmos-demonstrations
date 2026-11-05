(() => {
  'use strict';
  const runs = window.DEMO_RUNS || [];
  const titles = {flower:'Flower arrangement',book:'Book placement',watering:'Plant watering'};
  const tasks = {flower:'Pick up a flower from the table and insert it into the vase.',book:'Pick up the book and place it on the bookshelf.',watering:'Pick up the watering can and water the plant.'};
  const format = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const container = document.getElementById('video-pairs');
  Object.keys(titles).forEach((task,index) => {
    const pair = document.createElement('article');
    pair.className = 'pair'; pair.id = task;
    pair.innerHTML = `<div class="pair-head"><div class="task-title"><span class="task-number">0${index+1}</span><h3>${titles[task]}</h3></div><div class="pair-controls"><button class="play" type="button">Play both</button><button class="restart" type="button">Restart</button><label class="sr-only" for="speed-${task}">Playback speed for ${titles[task]}</label><select id="speed-${task}"><option value="1">1× speed</option><option value="2">2× speed</option><option value="4">4× speed</option></select></div></div><div class="video-grid"></div><p class="pair-note" aria-live="polite">Independent recordings · original timelines · audio removed</p>`;
    const instruction = document.createElement('p');
    instruction.className = 'task-instruction';
    instruction.innerHTML = `<strong>Task:</strong> ${tasks[task]}`;
    pair.querySelector('.pair-head').after(instruction);
    const grid=pair.querySelector('.video-grid');
    runs.filter(r=>r.task===task).forEach(run=>{
      const figure=document.createElement('figure');figure.className='video-card '+run.backend;
      const name=run.backend==='ours'?'Ours':'Native';
      figure.innerHTML=`<figcaption><span class="method">${name}</span><span>${format(run.duration)} · ${run.frames.length} observations</span></figcaption><video controls muted playsinline preload="none" poster="${run.poster}" aria-label="${titles[task]} ${name} recording"><source src="${run.video}" type="video/mp4"></video><div class="video-footer"><span>${name==='Native'?'Native backend':'Accelerated backend'}</span><a href="${run.video}" download>Download video ↗</a></div>`;
      grid.append(figure);
    });
    container.append(pair);
    const videos=[...pair.querySelectorAll('video')];
    const play=pair.querySelector('.play');
    const update=()=>{play.textContent=videos.some(v=>!v.paused&&!v.ended)?'Pause both':'Play both';};
    const note=pair.querySelector('.pair-note');
    videos.forEach(video=>{['play','pause','ended'].forEach(event=>video.addEventListener(event,update));video.addEventListener('error',()=>{note.textContent='Video could not load. Try the download link or refresh the page.';});});
    play.addEventListener('click',async()=>{
      if(videos.some(v=>!v.paused&&!v.ended)){videos.forEach(v=>v.pause());return;}
      const results=await Promise.allSettled(videos.map(v=>{if(v.ended)v.currentTime=0;return v.play();}));
      if(results.some(r=>r.status==='rejected')) note.textContent='Use the individual video controls if your browser blocks paired playback.';
    });
    pair.querySelector('.restart').addEventListener('click',()=>{videos.forEach(v=>{v.pause();if(v.readyState>0)v.currentTime=0;});update();});
    pair.querySelector('select').addEventListener('change',e=>{videos.forEach(v=>v.playbackRate=Number(e.target.value));});
  });
  const select=document.getElementById('run-select');
  runs.forEach(run=>select.add(new Option(`${titles[run.task]} — ${run.backend==='ours'?'Ours':'Native'}`,run.id)));
  const range=document.getElementById('frame-range');
  const previous=document.getElementById('previous-frame');
  const next=document.getElementById('next-frame');
  function renderFrame(){
    const run=runs.find(r=>r.id===select.value);if(!run)return;
    const index=Number(range.value);const frame=run.frames[index];if(!frame)return;
    ['wrist','external'].forEach(view=>{const img=document.getElementById(view+'-frame');img.src=frame[view];img.alt=`${titles[run.task]}, ${run.backend}, chunk ${frame.chunk}, ${view} camera`;});
    document.getElementById('frame-status').textContent=`Chunk ${String(frame.chunk).padStart(3,'0')} · Observation ${index+1} / ${run.frames.length}`;
    previous.disabled=index===0;next.disabled=index===run.frames.length-1;
  }
  function selectRun(){const run=runs.find(r=>r.id===select.value);range.max=run.frames.length-1;range.value=0;renderFrame();}
  select.addEventListener('change',selectRun);range.addEventListener('input',renderFrame);
  previous.addEventListener('click',()=>{range.value=Number(range.value)-1;renderFrame();});next.addEventListener('click',()=>{range.value=Number(range.value)+1;renderFrame();});
  selectRun();
})();
