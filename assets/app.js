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
    pair.innerHTML = `<div class="pair-head"><div class="task-title"><span class="task-number">0${index+1}</span><h3>${titles[task]}</h3></div><div class="pair-controls"><button class="play" type="button">Play both</button><button class="restart" type="button">Restart</button><label class="sr-only" for="speed-${task}">Playback speed for ${titles[task]}</label><select id="speed-${task}"><option value="1">1× speed</option><option value="2">2× speed</option><option value="4">4× speed</option></select></div></div><p class="task-instruction"><strong>Task:</strong> ${tasks[task]}</p><div class="video-grid"></div><p class="pair-note" aria-live="polite">20-step denoising schedule · successful trajectory examples · approximate motion-based alignment</p>`;
    const grid=pair.querySelector('.video-grid');
    runs.filter(r=>r.task===task).forEach(run=>{
      const figure=document.createElement('figure');figure.className='video-card '+run.backend;
      const name=run.backend==='ours'?'Ours':'Native';
      figure.innerHTML=`<figcaption><span class="method">${name}</span><span>${format(run.duration)} · ${run.frames.length} observations</span></figcaption><video controls muted playsinline preload="metadata" poster="${run.poster}" aria-label="${titles[task]} ${name} recording"><source src="${run.video}" type="video/mp4"></video><div class="sync-status"><span class="sync-clock">0:00</span><input class="sync-seek" type="range" min="0" max="${run.duration}" step="0.1" value="0" aria-label="Seek ${titles[task]} ${name}"><span>Video + cameras</span></div><div class="synced-cameras">${['wrist','external'].map(view=>`<div class="synced-view"><img data-view="${view}" alt="${titles[task]} ${name} ${view} observation" width="800" height="450"><div><span>${view==='wrist'?'Wrist':'External'} camera</span><span class="capture-${view}"></span></div></div>`).join('')}</div><div class="video-footer"><span>Cosmos3-Edge-Policy-DROID</span><a href="${run.video}" download>Download clip ↗</a></div>`;
      grid.append(figure);
      const video=figure.querySelector('video');
      const seek=figure.querySelector('.sync-seek');
      seek.addEventListener('input',()=>{video.currentTime=Number(seek.value);sync(Number(seek.value));});
      const current={wrist:-1,external:-1};
      const warmed=new Map();
      function sync(time=video.currentTime){
        figure.querySelector('.sync-clock').textContent=format(time);
        seek.value=time;
        ['wrist','external'].forEach(view=>{
          let lo=0,hi=run.frames.length;
          while(lo<hi){const mid=(lo+hi)>>1;if(run.frames[mid][view+'Time']<=time)lo=mid+1;else hi=mid;}
          const idx=Math.max(0,lo-1),frame=run.frames[idx];
          if(idx!==current[view]){
            current[view]=idx;
            const img=figure.querySelector(`[data-view="${view}"]`);img.src=frame[view];img.alt=`${titles[task]} ${name} ${view} camera, chunk ${frame.chunk}`;
            figure.querySelector('.capture-'+view).textContent=`C${frame.chunk} · ${Math.max(0,frame[view+'Time']).toFixed(1)} s`;
            for(let n=idx+1;n<=Math.min(idx+2,run.frames.length-1);n++){
              const url=run.frames[n][view];if(!warmed.has(url)){const next=new Image();next.src=url;warmed.set(url,next);}
            }
            if(warmed.size>12){for(const key of [...warmed.keys()].slice(0,warmed.size-12))warmed.delete(key);}
          }
        });
      }
      ['timeupdate','seeking','seeked','loadedmetadata','pause','ended'].forEach(event=>video.addEventListener(event,()=>sync()));
      if('requestVideoFrameCallback' in video){const tick=(_,info)=>{sync(info.mediaTime);video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
      sync(0);
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
      if(results.some(r=>r.status==='rejected'))note.textContent='Use the individual video controls if your browser blocks paired playback.';
    });
    pair.querySelector('.restart').addEventListener('click',()=>{videos.forEach(v=>{v.pause();if(v.readyState>0)v.currentTime=0;});update();});
    pair.querySelector('select').addEventListener('change',e=>{videos.forEach(v=>v.playbackRate=Number(e.target.value));});
  });
})();
