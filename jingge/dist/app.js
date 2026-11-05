"use strict";
const $=s=>document.querySelector(s);
const main=$("#main");
const DAY=86400000;
const names={home:"学习总览",quiz:"闭卷训练",cards:"知识卡片",review:"错题复测",library:"教材与资料",ai:"AI 制题"};
const topicName=key=>topics.find(([id])=>key===id)?.[1]??"全部专题";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function mathText(value){
 const parts=String(value??"").split(/(\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g);
 return parts.map((part,index)=>{
  if(index%2===0||typeof katex==="undefined")return esc(part);
  const displayMode=part.startsWith("$$");
  const width=displayMode?2:1;
  const rendered=katex.renderToString(part.slice(width,-width),{displayMode,throwOnError:false,trust:false});
  return displayMode?`<span class="math-block">${rendered}</span>`:rendered;
 }).join("");
}
const normal=s=>s.normalize("NFKC").toLowerCase().replace(/\s+/g,"").replaceAll("−","-");
const now=()=>Date.now();
const fresh=()=>({edition:"2",attempts:[],wrong:{},cards:{}});
function load(){
 try{const parsed=JSON.parse(localStorage.getItem("jingge-study-v1"));return parsed&&Array.isArray(parsed.attempts)&&parsed.wrong&&parsed.cards?{...fresh(),...parsed}:fresh();}
 catch{return fresh();}
}
let state=load();
if(Array.isArray(state.personal))state.personal.forEach(addPersonalItem);
function save(){
 try{localStorage.setItem("jingge-study-v1",JSON.stringify(state));}
 catch{$("#saveStatus").textContent="浏览器未能保存这次记录";}
}
let quiz={topic:"all",type:"all",source:"general",year:"all",question:null,result:null,review:false};
let paper={counts:{"名词解释":5,"简答":3,"计算":2,"相图读图":1},items:[],draft:[],answers:null};
let card={topic:"all",type:"all",source:"all",mode:"due",query:"",current:null,flipped:false};
const option=(v,t,s)=>`<option value="${v}" ${v===s?"selected":""}>${esc(t)}</option>`;
const topicOptions=v=>option("all","全部专题",v)+topics.map(([id,name])=>option(id,name,v)).join("");
const btn=(act,text,variant="")=>`<button type="button" class="btn ${variant}" data-act="${act}">${text}</button>`;
const intro=(title,desc)=>`<div class="intro"><h1>${title}</h1><p>${desc}</p></div>`;
const pending=()=>studyCards.filter(q=>!state.cards[q.id]||state.cards[q.id].due<=now());
function route(){const value=location.hash.slice(1).split("/")[0];return Object.hasOwn(names,value)?value:"home";}
function display(){
 const page=route();
 $("#crumb").textContent=names[page];
 $("#edition").value=state.edition;
 $("#reviewBadge").textContent=Object.keys(state.wrong).length||"";
 for(const item of document.querySelectorAll("nav a")){
  if(item.hash==="#"+page)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");
 }
 if(page==="home")home();
 if(page==="quiz")quizView();
 if(page==="cards")cardsView();
 if(page==="review")reviewView();
 if(page==="library")libraryView();
 if(page==="ai")aiView();
}
function home(){
 const completed=state.attempts.length;
 const avg=completed?Math.round(state.attempts.reduce((sum,x)=>sum+x.hits/x.total,0)/completed*100)+"%":"—";
 main.innerHTML=`<section class="hero"><span class="kicker">JINGGE / MATERIALS LAB</span><h1>晶格研习室</h1><p>从晶体结构到相图与热处理，做一道闭卷题，找出漏掉的得分点，再用卡片巩固。</p><a class="btn" href="#quiz">开始闭卷训练 <span aria-hidden="true">→</span></a> <a class="btn alt" href="#cards">复习卡片</a><p class="creator-line">创作人 Drinking Ice Man · <a href="https://github.com/wanghaotian417-star/materials-science-exam-coach/tree/main/jingge" target="_blank" rel="noopener">源码与自部署 ↗</a></p></section><section class="stats" aria-label="学习数据"><div class="stat"><small>已完成练习</small><b>${completed}</b><small>累计作答次数</small></div><div class="stat"><small>要点命中率</small><b>${avg}</b><small>关键词筛查参考</small></div><div class="stat"><small>今日待复习</small><b>${pending().length}</b><small>到期及新卡片</small></div></section><section><div class="section-head"><h2>按专题练</h2><span class="muted">${topics.length} 个专题 · ${paperBank.length} 道练习 · ${studyCards.length} 张卡片</span></div><div class="grid">${topics.map(([id,title,desc],i)=>`<a class="topic" href="#quiz/${id}"><span class="tag">专题 ${String(i+1).padStart(2,"0")}</span><b>${title}</b><span class="muted">${desc}</span></a>`).join("")}</div></section>`;
 $(".hero").classList.add("lab-hero");
 const companion=document.createElement("div");
 companion.className="lab-mascot";
 companion.innerHTML=`<button type="button" class="mascot-trigger" aria-label="与奶龙互动"><img src="mascot/idle.webp" width="200" height="200" alt=""></button><div><small>LAB COMPANION / 01</small><strong>奶龙学习搭档</strong><span class="mascot-message" role="status">点我换个学习状态</span></div>`;
 const moods=[["reading","翻张闪卡，回忆一下刚背的定义。"],["focus","先做一题，再核对步骤。"],["thinking","遇到相图，先确认坐标和相区。"],["quiz","试试给自己组一套卷。"],["celebrate","今天又掌握了一个考点！"],["break","休息一下，回来继续。"],["sleepy","累了就先歇会儿。"],["levelup","复盘完成，下一个考点见。"],["idle","准备好开始学习了吗？"]];
 let mood=0;
 companion.querySelector("button").addEventListener("click",()=>{
  const [pose,message]=moods[mood++%moods.length];
  companion.querySelector("img").src=`mascot/${pose}.webp`;
  companion.querySelector(".mascot-message").textContent=message;
 });
 $(".hero").append(companion);
}
function quizPool(){
 const sourceItems=paperBank.filter(q=>{
  if(quiz.source==="personal")return q.personal;
  if(quiz.source==="exam")return q.year&&(quiz.year==="all"||String(q.year)===quiz.year);
  if(quiz.source==="glossary")return q.glossaryRefs?.length;
  return quiz.source==="all"||(!q.year&&!q.personal);
 });
 return sourceItems.filter(q=>quiz.topic==="all"||q.topic===quiz.topic);
}
function singlePool(pool=quizPool()){
 return pool.filter(q=>quiz.type==="all"||q.type===quiz.type);
}
function pick(){
 const pool=singlePool();
 const eligible=pool.filter(q=>q!==quiz.question);
 const list=eligible.length?eligible:pool;
 quiz.question=list[Math.floor(Math.random()*list.length)]??null;
 quiz.result=null;
 quiz.review=false;
}
function groupedPool(pool){
 const groups=new Map(types.map(type=>[type,new Map()]));
 for(const q of pool){
  const key=q.stemScan?q.id:normal(q.stem).replace(/[？?。]/g,"");
  const group=groups.get(q.type);
  if(!group.has(key))group.set(key,q);
 }
 return [...groups].map(([type,group])=>[type,[...group.values()]]);
}
function shuffled(items){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}
function buildPaper(groups=groupedPool(quizPool())){
 const requested=groups.map(([type,items])=>[type,items,Number(paper.counts[type]??0)]);
 const invalid=requested.filter(([,items,count])=>!Number.isInteger(count)||count<0||count>items.length);
 if(invalid.length)return `请调整题量。当前筛选中${invalid.map(([type,items])=>`${type}最多 ${items.length} 道`).join("、")}。`;
 const items=requested.flatMap(([,available,count])=>shuffled(available).slice(0,count));
 if(!items.length)return "请至少为一种题型填写大于 0 的题量。";
 paper.items=items;
 paper.draft=[];
 paper.answers=null;
 quiz.question=null;
 quiz.result=null;
 return "";
}
function paperCountTotal(){
 return types.reduce((total,type)=>total+Math.max(0,Number(paper.counts[type])||0),0);
}
function paperConfig(groups){
 return `<form id="paperConfig" class="paper-settings" novalidate>
 <h2>自定义套卷</h2>
 <div class="muted">沿用上方题源和专题。按题型填题量，填 0 可跳过。</div>
 <div class="paper-counts">${groups.map(([type,items],i)=>`<label class="paper-count">
  <b>${esc(type)}</b>
  <input type="number" name="count-${i}" data-count-type="${esc(type)}" min="0" max="${items.length}" step="1" inputmode="numeric" value="${esc(paper.counts[type]??0)}" aria-label="${esc(type)}题量" aria-describedby="paper-limit-${i}">
  <small id="paper-limit-${i}">可用 ${items.length} 道</small></label>`).join("")}</div>
 <div class="row paper-actions"><div class="actions"><button type="submit" class="btn">${paper.items.length?"重新生成套卷":"生成完整套卷"}</button>${btn("clearCounts","清空题量","alt")}</div>
 <span id="paperTotal" class="muted">计划 ${paperCountTotal()} 道 · 交卷后统一查看答案</span></div>
 <div id="paperError" class="paper-error" role="status"></div>
 </form>`;
}
function pageSpan(first,last=first){
 return first===last?`PDF 第 ${first} 页`:`PDF 第 ${first}–${last} 页`;
}
function sourceLabel(q){
 if(q.personal)return q.page?`个人资料 · AI 草稿已确认 · PDF 第 ${q.page} 页`:"个人资料 · AI 草稿已确认";
 if(q.year)return `云南大学 837 · ${q.year} 年 · ${q.num} · ${pageSpan(q.page,q.lastPage)}${q.transcribed?" · 填空整理":""}`;
 if(q.glossaryRefs?.length)return "《名词解释》27 版 · "+q.glossaryRefs.map(r=>`条目 ${r.number}（${pageSpan(r.page,r.lastPage)}）`).join("、");
 return "通用练习";
}
function priorityTag(q){
 if(!q.priority)return "";
 const style={"重点中的重点":"priority-high","重点":"priority-normal","原资料黄标":"priority-other"}[q.priority];
 return `<span class="tag ${style}">${esc(q.priority)}</span>`;
}
function sourceFigures(images,alt){
 return (images??[]).map((src,i)=>`<figure class="source-figure"><a href="${esc(src)}" target="_blank" rel="noopener" title="打开大图"><img src="${esc(src)}" loading="lazy" alt="${esc(alt+(images.length>1?`（${i+1}/${images.length}）`:""))}"></a></figure>`).join("");
}
function studyFigure(name,label,caption){
 const src=`study-figures/${name}.svg`;
 return `<figure class="diagram study-figure"><a href="${src}" target="_blank" rel="noopener" title="打开大图"><img src="${src}" alt="${esc(label)}"></a><figcaption>${caption}</figcaption></figure>`;
}
function figureMarkup(q){
 if(q.stemImages?.length)return sourceFigures(q.stemImages,q.stemScan?q.stem:"题设原图");
 return q.figure?studyFigure(q.figure,phaseFigures[q.figure],"题设示意图"):"";
}
function answerMarkup(q){
 const solution=q.steps?`<ol class="solution-steps">${q.steps.map(([title,body])=>`<li><h4>${esc(title)}</h4><div class="multiline">${mathText(body)}</div></li>`).join("")}</ol>`:"";
 return `${q.answer?`<p class="multiline ${q.steps?"calculation-result":""}">${mathText(q.answer)}</p>`:""}
 ${q.solutionFigure?studyFigure(q.solutionFigure,`${topicName(q.topic)}计算图解`,"解析图 · 教材模型示意"):""}
 ${solution}
 ${sourceFigures(q.answerImages,"资料参考答案原图")}
 ${q.personal&&q.quote?`<details><summary>查看原文依据${q.page?` · PDF 第 ${q.page} 页`:""}</summary><p class="multiline">${esc(q.quote)}</p></details>`:""}
 ${q.note?`<p class="note"><strong>校核说明</strong> ${esc(q.note)}</p>`:""}`;
}
function questionBody(q,n){
 const heading=n?`${n}. ${q.stemScan?"按题图作答":q.stem}`:q.stemScan?"按题图作答":q.stem;
 return `<div class="row"><span class="tag">${esc(topicName(q.topic))} · ${esc(q.type)}</span><span class="source-tag">${esc(sourceLabel(q))}</span></div>
 <h2 class="multiline">${mathText(heading)}</h2>${figureMarkup(q)}`;
}
function paperView(){
 let number=0;
 const sections=types.map(type=>{
  const questions=paper.items.filter(q=>q.type===type);
  if(!questions.length)return "";
  const entries=questions.map(q=>{
   const index=number++;
   const feedback=paper.answers?`<div class="feedback"><h3>你的作答</h3><p class="multiline">${esc(paper.answers[index]||"未作答")}</p>
    <h3>${q.year?"资料参考答案":"参考答案"}</h3>${answerMarkup(q)}</div>`:
    `<label for="paperAnswer${index}">你的作答</label><textarea id="paperAnswer${index}" name="answer" data-paper-index="${index}" maxlength="4000">${esc(paper.draft[index]??"")}</textarea>`;
   return `<article class="panel question">${questionBody(q,number)}${feedback}</article>`;
  }).join("");
  return `<section class="paper-section"><div class="row"><h3>${esc(type)}</h3><span class="muted">${questions.length} 道</span></div><div class="stack">${entries}</div></section>`;
 }).join("");
 return `<form id="paperForm" class="paper-form"><header class="panel row" tabindex="-1" id="paperStart">
  <h2>${paper.answers?"套卷答案":"自定义套卷"}</h2><span class="muted">共 ${paper.items.length} 道 · ${paper.answers?"已交卷":"可先跳过难题"}</span></header>
  ${sections}${paper.answers?"":'<div class="actions"><button class="btn" type="submit">交卷并查看参考答案</button></div>'}</form>`;
}
function singleView(q,result,count){
 if(!q)return `<section class="panel empty question">${count?"选择专题和题型后开始抽题，或填写题量生成套卷。":"该筛选组合下暂无单题练习。"}</section>`;
 const keywordFeedback=result?.hits?`<h3>参考命中 ${result.hits.filter(Boolean).length} / ${q.points.length}</h3>
 <div class="muted">按关键词筛查，请对照参考答案自评。</div>
 <h4>得分点</h4><ul>${q.points.map(([label],i)=>`<li>${result.hits[i]?"✓ 可能命中":"○ 待核对"} · ${esc(label)}</li>`).join("")}</ul>`:"";
 const content=result?`<div class="feedback" aria-live="polite">${keywordFeedback}
 <h4>你的作答</h4><p class="multiline">${esc(result.input)}</p><h4>${q.year?"资料参考答案":"参考答案"}</h4>${answerMarkup(q)}
 <div class="actions">${btn("wrong","仍需复测","alt")}${btn("mastered","自评已掌握","alt")}${btn("pick","下一题")}</div>
 <small id="answerStatus" class="muted" role="status">${state.wrong[q.id]?"已加入错题本":""}</small></div>`:
 `<form id="answerForm"><label for="answer">你的作答</label><textarea id="answer" required maxlength="4000" placeholder="按考场写法分点作答…"></textarea><button class="btn" type="submit">${q.points?"提交并查看得分点":"提交并查看参考答案"}</button></form>`;
 return `<section class="panel question">${quiz.review?'<span class="muted">错题复测</span>':""}${questionBody(q)}${content}</section>`;
}
function quizView(){
 const pool=quizPool();
 const count=singlePool(pool).length;
 main.innerHTML=intro("闭卷训练","可按题型抽单题，也可以分别设定各题型题量来组卷。")+ `<section class="panel">
  <div class="form-row">
   <label>题源<select id="quizSource">${option("general","通用题库",quiz.source)}${examYears.length?option("exam","云南大学 837 历年题",quiz.source):""}${importedGlossary.length?option("glossary","《名词解释》27 版",quiz.source):""}${option("personal","个人题库",quiz.source)}${option("all","全部题源",quiz.source)}</select></label>
   ${quiz.source==="exam"?`<label>年份<select id="quizYear">${option("all","全部收录年份",quiz.year)}${examYears.map(year=>option(String(year),`${year} 年`,quiz.year)).join("")}</select></label>`:""}
   <label>专题<select id="quizTopic">${topicOptions(quiz.topic)}</select></label>
  </div>
  <div class="form-row paper-controls">
   <label>单题题型<select id="quizType">${["all",...types].map(v=>option(v,v==="all"?"全部题型":v,quiz.type)).join("")}</select></label>
   <button type="button" class="btn alt" data-act="pick" ${count?"":"disabled"}>${quiz.question?"换一道题":"开始抽题"}</button>
   <span class="muted">${count} 道可抽</span>
  </div>
  ${paperConfig(groupedPool(pool))}
  ${quiz.source==="exam"?'<small class="muted">回忆整理与参考解答，原件可在「教材与资料」查看。</small>':""}
 </section>`+(paper.items.length?paperView():singleView(quiz.question,quiz.result,count));
}
function evaluate(input,q){
 const value=normal(input);
 return q.points.map(([,terms])=>terms.split("|").some(group=>group.split("&").every(term=>value.includes(normal(term)))));
}
function reviewView(){
 const list=paperBank.filter(q=>Object.hasOwn(state.wrong,q.id)).sort((a,b)=>state.wrong[b.id]-state.wrong[a.id]);
 main.innerHTML=intro("错题复测","漏掉得分点的题目会留在这里。重做后，可对照参考答案自行标为已掌握。")+
 (list.length?`<div class="stack">${list.map(q=>`<article class="panel"><span class="tag">${topicName(q.topic)}</span><h3 style="margin-top:8px">${mathText(q.stem)}</h3><p class="source-tag">${esc(sourceLabel(q))}</p><button class="btn alt" data-retry="${q.id}">重做这道题</button></article>`).join("")}</div>`:`<section class="panel empty"><h2>错题本暂时为空</h2><a class="btn" href="#quiz">去练一道题</a></section>`);
}
function cardCatalogOpen(){
 return location.hash==="#cards/all";
}
function inCardScope(q){
 return (card.topic==="all"||q.topic===card.topic)&&(card.source==="all"||(card.source==="personal"?q.personal:q.glossaryRefs?.length));
}
function cardsByType(){
 return studyCards.filter(q=>inCardScope(q)&&(card.type==="all"||q.type===card.type));
}
function availableCards(){
 return cardsByType().filter(q=>card.mode==="all"||!state.cards[q.id]||state.cards[q.id].due<=now());
}
function referenceMarkup(q){
 const ref=q.reference;
 if(!ref)return "";
 const isHit=ref.edition==="H";
 const title=isHit?"哈工大《金属学与热处理原理》第 3 版":"上交《材料科学基础》第 1 版";
 const url=books[isHit?2:0][3];
 return `<div class="study-reference"><a href="${esc(url)}" target="_blank" rel="noopener">${title} ↗</a>
 <span>§${esc(ref.section)} ${esc(ref.title)} · 印刷第 ${ref.page} 页起</span></div>`;
}
function cardAttribution(q){
 return referenceMarkup(q)+((q.personal||q.glossaryRefs?.length)?`<div class="source-tag card-provenance">${esc(sourceLabel(q))}</div>`:"");
}
function cardContent(q){
 return `<div class="card-solution">${answerMarkup(q)}${cardAttribution(q)}</div>`;
}
function chapterName(q){
 const index=cardChapters.findIndex(([topic])=>topic===q.topic);
 return `第 ${index+1} 章 · ${cardChapters[index][1]}`;
}
function catalogListMarkup(){
 const query=normal(card.query.trim());
 const filtered=cardsByType().filter(q=>!query||normal(`${q.stem} ${q.answer} ${chapterName(q)}`).includes(query));
 if(!filtered.length)return '<section class="panel empty">没有找到符合筛选条件的卡片。</section>';
 const ordered=cardChapters.flatMap(([topic])=>filtered.filter(q=>q.topic===topic));
 return `<p class="muted" role="status">共 ${ordered.length} 张 · 点开卡片查看答案</p>
 ${cardTypes.map(type=>{
  const items=ordered.filter(q=>q.type===type);
  if(!items.length)return "";
  return `<section class="card-list-section"><div class="section-head"><h2>${type}</h2><span class="muted">${items.length} 张</span></div>
   <div class="card-list-items">${items.map(q=>`<details class="card-entry" data-card-entry="${q.id}">
    <summary><span class="entry-label">${esc(chapterName(q))}</span>
     <span class="entry-title">${mathText(q.stem)}</span>
     ${priorityTag(q)}
    </summary><div class="entry-content"></div></details>`).join("")}</div></section>`;
 }).join("")}`;
}
function cardsView(){
 const isCatalog=cardCatalogOpen();
 const counts=cardTypes.map(type=>studyCards.filter(c=>c.type===type&&inCardScope(c)).length);
 const list=availableCards();
 if(!isCatalog&&!list.includes(card.current)){card.current=list[0]??null;card.flipped=false;}
 const q=card.current;
 const mode=`<div class="card-switch" aria-label="卡片视图"><a href="#cards" ${isCatalog?"":'aria-current="page"'}>闪卡记忆</a><a href="#cards/all" ${isCatalog?'aria-current="page"':""}>卡片总览</a></div>`;
 const filters=`<section class="panel card-filters"><div class="form-row card-controls">
  <label for="cardChapter">章节<select id="cardChapter">${option("all","全部章节",card.topic)}${cardChapters.map(([id,title],i)=>option(id,`第 ${i+1} 章 · ${title}`,card.topic)).join("")}</select></label>
  <label for="cardSource">资料<select id="cardSource">${option("all","全部卡片",card.source)}${option("personal","个人资料",card.source)}${importedGlossary.length?option("glossary","《名词解释》27 版",card.source):""}</select></label>
  ${isCatalog?`<label for="cardSearch" class="card-search">搜索卡片<input id="cardSearch" type="search" placeholder="如：位错、共晶、杠杆定律" value="${esc(card.query)}"></label>`:
   `<label for="cardMode">范围<select id="cardMode">${option("due","到期与新卡",card.mode)}${option("all","全部卡片",card.mode)}</select></label><span class="muted">${list.length} 张可复习</span>`}
 </div><div class="type-list card-type-filter" aria-label="卡片类型">${["all",...cardTypes].map((type,i)=>`<button type="button" class="chapter-option" data-card-type="${type}" aria-pressed="${card.type===type}">${i?`${type} · ${counts[i-1]}`:`全部类型 · ${counts.reduce((a,b)=>a+b,0)}`}</button>`).join("")}</div></section>`;
 let content;
 if(isCatalog){
  content=`<div id="cardCatalog">${catalogListMarkup()}</div>`;
 }else if(q){
  content=`<article class="panel question card-face">
   <div class="row"><div><span class="tag">${q.type} · ${card.flipped?"背面":"正面"}</span> ${priorityTag(q)}</div>
   <span class="muted">${list.indexOf(q)+1} / ${list.length}</span></div>
   <h2 class="card-prompt">${mathText(q.stem)}</h2>
   ${figureMarkup(q)}
   ${card.flipped?cardContent(q):""}
   <div class="actions">${btn("flip",card.flipped?"收起答案":"翻卡看答案","alt")}${btn("cardNext","下一张","alt")}</div>
   ${card.flipped?`<div class="actions" aria-label="选择复习间隔">${btn("rate0","忘了 · 10 分钟","alt")}${btn("rate1","模糊 · 1 天","alt")}${btn("rate2","记得 · 3 天","alt")}${btn("rate3","熟练 · 7 天")}</div>`:""}
  </article>`;
 }else{
  content='<section class="panel empty question">此范围内没有待复习卡片。</section>';
 }
 main.innerHTML=intro("知识卡片","基础内容以上交第 1 版为主，热处理按哈工大第 3 版核对。")+mode+filters+content;
}
function libraryView(){
 main.innerHTML=intro("教材与资料","按用途找教材、笔记和原题。切换教材会更新选读标记和批改提示词。")+
 `<div class="grid">${books.map(([id,title,desc,url])=>`<article class="panel"><span class="tag ${id===state.edition?"good":""}">${id===state.edition?"当前选读":"教材 "+id}</span><h3 style="margin-top:9px">${title}</h3><p class="muted">${desc}</p><div class="actions"><a class="btn alt" target="_blank" rel="noopener" href="${esc(url)}">打开原资料 ↗</a><button class="quiet" data-book="${id}">${id===state.edition?"已选用":"选这本"}</button></div></article>`).join("")}</div><p class="note muted">通用练习使用站内答案，历年题使用资料参考解答。需要按选读教材逐点核对时，可在单题提交后复制批改提示词。</p><div class="source-list stack">${resources.map(([tag,title,desc,url])=>`<article class="panel row"><div><span class="tag">${tag}</span> <b class="resource-title">${title}</b><div class="muted">${desc}</div></div><a href="${esc(url)}" target="_blank" rel="noopener">打开资料 ↗</a></article>`).join("")}</div>`;
}
$("#edition").addEventListener("change",e=>{state.edition=e.target.value;save();if(route()==="library")display();});
main.addEventListener("change",e=>{
 const id=e.target.id;
 const quizFields={quizTopic:"topic",quizType:"type",quizSource:"source",quizYear:"year"};
 if(Object.hasOwn(quizFields,id)){
  quiz[quizFields[id]]=e.target.value;
  if(id==="quizSource")quiz.year="all";
  quiz.question=null;
  quiz.result=null;
  display();
  document.getElementById(id)?.focus();
 }
 const cardFields={cardMode:"mode",cardChapter:"topic",cardSource:"source"};
 if(Object.hasOwn(cardFields,id)){
  card[cardFields[id]]=e.target.value;
  card.current=null;
  display();
  document.getElementById(id)?.focus();
 }
});
main.addEventListener("input",e=>{
 if(e.target.id==="cardSearch"){
  card.query=e.target.value;
  $("#cardCatalog").innerHTML=catalogListMarkup();
  return;
 }
 const {countType,paperIndex}=e.target.dataset;
 if(paperIndex!==undefined)paper.draft[Number(paperIndex)]=e.target.value;
 if(!countType)return;
 paper.counts[countType]=e.target.value;
 const value=Number(e.target.value);
 const invalid=!Number.isInteger(value)||value<0||value>Number(e.target.max);
 e.target.setAttribute("aria-invalid",String(invalid));
 $("#paperTotal").textContent=`计划 ${paperCountTotal()} 道 · 交卷后统一查看答案`;
 $("#paperError").textContent="";
});
main.addEventListener("submit",e=>{
 if(e.target.id==="paperConfig"){
  e.preventDefault();
  const values=new FormData(e.target);
  paper.counts=Object.fromEntries(types.map((type,i)=>[type,values.get(`count-${i}`)??0]));
  const error=buildPaper();
  if(error){$("#paperError").textContent=error;return;}
  display();
  $("#paperStart").focus();
  return;
 }
 if(e.target.id==="paperForm"&&!paper.answers){
  e.preventDefault();
  paper.answers=new FormData(e.target).getAll("answer");
  display();
  $("#paperStart").focus();
  return;
 }
 if(e.target.id!=="answerForm"||!quiz.question||quiz.result)return;
 e.preventDefault();
 const input=$("#answer").value.trim();if(!input){$("#answer").focus();return;}
 const q=quiz.question;
 const hits=q.points?evaluate(input,q):null;
 quiz.result={input,hits};
 if(hits){
  const count=hits.filter(Boolean).length;
  state.attempts.push({id:q.id,hits:count,total:hits.length,at:now()});
  if(count<hits.length)state.wrong[q.id]=now();
  save();
 }
 display();
 const note=document.createElement("details");
 note.innerHTML=`<summary>按所选教材精批</summary><p class="muted">复制以下文字到材科基考研训练 Skill。${q.stemImages?.length?"图题请同时附题图。":""}</p><textarea readonly aria-label="可复制的批改提示词"></textarea>`;
 $(".feedback").append(note);
 note.querySelector("textarea").value=`选教材 ${state.edition}，按教材原页逐点批改并标页码。\n题目：${q.stem}\n我的作答：${input}`;
});
main.addEventListener("toggle",e=>{
 const detail=e.target;
 if(!detail.open||!detail.dataset.cardEntry)return;
 const body=detail.querySelector(".entry-content");
 if(body.childElementCount)return;
 const q=studyCardsById.get(detail.dataset.cardEntry);
 body.innerHTML=figureMarkup(q)+cardContent(q)+`<div class="actions"><button type="button" class="btn alt" data-study-card="${q.id}">复习这张卡</button></div>`;
},true);
main.addEventListener("click",e=>{
 const el=e.target.closest("button");if(!el)return;
 if(el.dataset.studyCard){
  card.current=studyCardsById.get(el.dataset.studyCard);
  card.mode="all";
  card.flipped=false;
  location.hash="cards";
  return;
 }
 if(el.dataset.cardType){
  card.type=el.dataset.cardType;
  card.current=null;display();return;
 }
 if(el.dataset.book){state.edition=el.dataset.book;save();display();return;}
 if(el.dataset.retry){
  const q=paperBank.find(q=>q.id===el.dataset.retry);
  if(q){
   paper.items=[];
   quiz={topic:q.topic,type:"all",source:q.year?"exam":"general",year:q.year?String(q.year):"all",question:q,result:null,review:true};
   location.hash="quiz";
  }
  return;
 }
 const act=el.dataset.act;
 if(act==="pick"){paper.items=[];pick();display();}
 if(act==="clearCounts"){paper.counts={};display();$("#paperConfig").querySelector("input")?.focus();}
 if(act==="wrong"||act==="mastered"){
  if(act==="wrong")state.wrong[quiz.question.id]=now();else delete state.wrong[quiz.question.id];
  save();$("#reviewBadge").textContent=Object.keys(state.wrong).length||"";$("#answerStatus").textContent=act==="wrong"?"已加入错题本":"已按自评标为掌握";
 }
 if(act==="flip"){card.flipped=!card.flipped;display();}
 if(act==="cardNext"){const list=availableCards();card.current=list[(list.indexOf(card.current)+1)%list.length];card.flipped=false;display();}
 if(/^rate[0-3]$/.test(act??"")&&card.current&&card.flipped){
  const list=availableCards();const next=list[(list.indexOf(card.current)+1)%list.length];
  state.cards[card.current.id]={due:now()+[600000,DAY,3*DAY,7*DAY][Number(act.at(-1))]};
  card.current=next;card.flipped=false;save();display();
 }
});
function hashChanged(){
 const [page,topic]=location.hash.slice(1).split("/");
 if(page==="quiz"&&topics.some(([id])=>id===topic)){paper.items=[];quiz={topic,type:"all",source:"general",year:"all",question:null,result:null,review:false};pick();}
 display();main.focus({preventScroll:true});
}
main.addEventListener("submit",aiSubmit);
window.addEventListener("hashchange",hashChanged);
hashChanged();
