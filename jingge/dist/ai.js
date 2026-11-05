"use strict";
let aiDraft = [];
let aiRequest = false;

function aiView(){
 main.innerHTML=intro("AI 制题","上传文本 PDF 或粘贴笔记，使用你自己配置的模型生成草稿。")+`
 <form id="aiGenerate" class="panel stack">
 <details><summary>配置自己的 API</summary><p>在自部署环境设置 <code>JINGGE_API_BASE</code>、<code>JINGGE_MODEL</code> 和 <code>JINGGE_API_KEY</code>，再运行 <code>sh deploy.sh</code>。密钥保存在本机后端环境变量。在线静态版请下载自部署版后使用。</p></details>
 <label>文本 PDF（前 20 页，最多 5 MB） <input name="pdf" type="file" accept=".pdf,application/pdf"></label>
 <label>或粘贴笔记 <textarea name="notes" rows="5" maxlength="24000"></textarea></label>
 <div class="form-row"><label>专题<select name="topic">${topics.map(([id,name])=>option(id,name,"defect")).join("")}</select></label>
 <label>生成类型<select name="kind"><option>闪卡</option><option>名词解释</option><option>简答</option><option>计算</option></select></label>
 <label>数量<input type="number" name="count" value="5" min="1" max="10" required></label></div>
 <small class="muted">生成时，提取出的资料文字会发送到你配置的模型服务。</small>
 <button class="btn" ${aiRequest?"disabled":""}>生成草稿</button><div id="aiStatus" role="status"></div>
 </form><div id="aiDraft"></div>`;
 renderAiDraft();
}
function renderAiDraft(){
 const target=$("#aiDraft");
 if(!target)return;
 target.innerHTML=aiDraft.length?`<form id="aiImport" class="stack">
 <h2>审核草稿</h2>${aiDraft.map((q,i)=>`<article class="panel stack">
 <label><input type="checkbox" name="keep" value="${i}" checked> 保存这一条</label>
 <label>题面<textarea name="stem-${i}" rows="2" maxlength="1000">${esc(q.stem)}</textarea></label>
 <label>答案<textarea name="answer-${i}" rows="4" maxlength="4000">${esc(q.answer)}</textarea></label>
 <p class="muted">${q.page?`PDF 第 ${q.page} 页`:"粘贴笔记"} · ${esc(q.quote)}</p></article>`).join("")}
 <button class="btn">保存勾选项</button></form>`:"";
}
function addPersonalItem(item){
 const type={"闪卡":"名词解释","简答":"简答解答"}[item.type]??item.type;
 const flash={...item,type};
 studyCards.push(flash);
 studyCardsById.set(flash.id,flash);
 if(item.type!=="闪卡")paperBank.push(item);
}
async function aiSubmit(event){
 const form=event.target;
 if(!["aiGenerate","aiImport"].includes(form.id))return;
 event.preventDefault();
 const fields=new FormData(form);
 if(form.id==="aiImport"){
  const rows=fields.getAll("keep").map(i=>({...aiDraft[Number(i)],stem:fields.get("stem-"+i).trim(),answer:fields.get("answer-"+i).trim()}));
  if(!rows.length||rows.some(q=>!q.stem||!q.answer)){$("#aiStatus").textContent="请选择草稿，并填写题目和答案。";return;}
  const batch=rows.map(q=>({...q,id:"ai-"+crypto.randomUUID(),personal:true}));
  const updated=[...(state.personal??[]),...batch];
  try{localStorage.setItem("jingge-study-v1",JSON.stringify({...state,personal:updated}));}
  catch{$("#aiStatus").textContent="保存失败，浏览器存储空间不足。";return;}
  state.personal=updated;
  batch.forEach(addPersonalItem);
  aiDraft=[];
  renderAiDraft();
  $("#aiStatus").textContent=`已保存 ${batch.length} 条，请在知识卡片或闭卷训练选择个人资料。`;
  return;
 }
 if(aiRequest)return;
 const status=$("#aiStatus"), file=fields.get("pdf"), notes=fields.get("notes").trim();
 if(file.size>5_000_000||(!file.size&&!notes)){status.textContent="请选择不超过 5 MB 的 PDF，或粘贴笔记。";return;}
 aiRequest=true;
 form.querySelector("button").disabled=true;
 status.textContent="正在生成并核对原文依据…";
 try{
  let pdf="";
  if(file.size){
   const bytes=new Uint8Array(await file.arrayBuffer());
   const parts=[];
   for(let offset=0;offset<bytes.length;offset+=16384)parts.push(String.fromCharCode(...bytes.subarray(offset,offset+16384)));
   pdf=btoa(parts.join(""));
  }
  const kind=fields.get("kind"),topic=fields.get("topic");
  const response=await fetch("./api/materials/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,count:Number(fields.get("count")),pdf,notes})});
  if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("当前站点没有 AI 后端。请使用自部署版。");
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"生成失败。");
  aiDraft=result.items.map(q=>({...q,topic,type:kind}));
  renderAiDraft();
  const live=$("#aiStatus");if(live)live.textContent=`生成 ${aiDraft.length} 条可核对草稿。`;
 }catch(error){const live=$("#aiStatus");if(live)live.textContent=error.message;}
 finally{aiRequest=false;const button=$("#aiGenerate button");if(button)button.disabled=false;}
}
