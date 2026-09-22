(function(){
  const block=(kind='line')=>`<div class="sk-block sk-${kind}"></div>`;
  const repeat=(count,markup)=>Array.from({length:count},()=>markup).join('');
  const cards=(count=14)=>`<div class="sk-grid">${repeat(count,`<div>${block('poster')}${block()}${block('short')}</div>`)}</div>`;
  function skeleton(path){
    let content='';
    if(path==='/')content=block('hero')+`<div class="sk-safe">${block('filters')}${block('heading')}${cards()}</div>`;
    else if(path.startsWith('/movie/detail/'))content=`<div class="sk-safe sk-detail"><div>${block('video')}${block('actions')}${block('heading')}${repeat(3,block())}${block('heading')}<div class="sk-episodes">${repeat(16,block('button'))}</div></div><aside>${block('video')}${block('heading')}${repeat(4,`<div class="sk-related">${block('poster')}<div>${block()}${block('short')}</div></div>`)}</aside></div>`;
    else if(path==='/movie/rank')content=block('banner')+`<div class="sk-safe">${block('actions')}<div class="sk-ranks">${repeat(9,`<div class="sk-related">${block('poster')}<div>${block()}${block('short')}${block('short')}</div></div>`)}</div></div>`;
    else if(path==='/apps')content=`<div class="sk-safe">${block('actions')}<div class="sk-apps">${repeat(80,`<div>${block('square')}${block('short')}</div>`)}</div></div>`;
    else if(path==='/mine/help')content=`<div class="sk-safe">${block('heading')}${repeat(6,block('actions'))}</div>`;
    else if(path.startsWith('/mine/'))content=`<div class="sk-safe sk-personal"><aside>${block('profile')}${repeat(3,block('actions'))}</aside><div>${block('heading')}${cards()}</div></div>`;
    else if(path.startsWith('/theme-detail/'))content=block('banner')+`<div class="sk-safe">${block('heading')}${cards()}</div>`;
    else content=`<div class="sk-safe">${block('heading')}${block('filters')}${block('actions')}${cards(28)}</div>`;
    return `<div class="page-skeleton" role="status" aria-label="页面加载中"><span class="sr-only">页面加载中，请稍候</span><div aria-hidden="true">${content}</div></div>`;
  }
  window.showPageSkeleton=function(){
    const app=document.querySelector('#app');app.setAttribute('aria-busy','true');app.innerHTML=skeleton(location.pathname);
    document.querySelector('#header').innerHTML=`<div class="sk-header" aria-hidden="true">${block('brand')}${block('short')}${block('short')}${block('search')}${block('button')}</div>`;
  };
  window.clearPageSkeleton=function(){document.querySelector('#app').setAttribute('aria-busy','false')};
  window.showPageSkeleton();
})();
