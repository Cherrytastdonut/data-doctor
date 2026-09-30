const state={file:null,headers:[],rows:[],cleaned:[],analysis:null};
const $=id=>document.getElementById(id);
const NULLS=new Set(["","-","n/a","na","null","none","없음","미입력","unknown"]);
const missing=v=>v==null||NULLS.has(String(v).trim().toLowerCase());

function parseCSV(text){
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(quoted){
      if(c==='"'&&n==='"'){field+='"';i++}
      else if(c==='"')quoted=false;
      else field+=c;
    }else{
      if(c==='"')quoted=true;
      else if(c===","){row.push(field);field=""}
      else if(c==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field=""}
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,""));rows.push(row)}
  while(rows.length&&rows.at(-1).every(v=>String(v).trim()===""))rows.pop();
  if(rows.length<2)throw new Error("헤더와 데이터 행이 필요합니다.");
  const headers=rows[0].map((h,i)=>String(h||`column_${i+1}`).trim());
  return {headers,rows:rows.slice(1).map(vals=>Object.fromEntries(headers.map((h,i)=>[h,vals[i]??""])))};
}
function csvCell(v){const s=v==null?"":String(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function toCSV(rows){return "\uFEFF"+[state.headers.map(csvCell).join(","),...rows.map(r=>state.headers.map(h=>csvCell(r[h])).join(","))].join("\r\n")}
function rowKey(r){return state.headers.map(h=>String(r[h]??"").trim()).join("␟")}
function mode(rows,col){
  const m=new Map();for(const r of rows){const v=String(r[col]??"").trim();if(!missing(v))m.set(v,(m.get(v)||0)+1)}
  let best="",count=0;for(const [v,c] of m)if(c>count){best=v;count=c}return best;
}
function numericStats(rows,col){
  const a=rows.map(r=>r[col]).filter(v=>!missing(v)).map(v=>Number(String(v).replace(/,/g,"").trim())).filter(Number.isFinite);
  if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),mid=Math.floor(s.length/2);
  return {avg:round(a.reduce((x,y)=>x+y,0)/a.length),median:round(s.length%2?s[mid]:(s[mid-1]+s[mid])/2)};
}
const round=n=>Math.round(n*100)/100;

function analyze(){
  const miss=Object.fromEntries(state.headers.map(h=>[h,0]));let spaces=0;
  for(const r of state.rows)for(const h of state.headers){if(missing(r[h]))miss[h]++;if(typeof r[h]==="string"&&r[h]!==r[h].trim())spaces++}
  const seen=new Map();for(const r of state.rows){const k=rowKey(r);seen.set(k,(seen.get(k)||0)+1)}
  let dup=0;for(const c of seen.values())if(c>1)dup+=c-1;
  return {missing:miss,whitespaceCount:spaces,duplicateRows:dup,issueCount:dup+spaces+Object.values(miss).reduce((a,b)=>a+b,0)};
}
function table(id,rows){
  $(id).innerHTML=`<thead><tr><th>#</th>${state.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
    rows.slice(0,100).map((r,i)=>`<tr><td>${i+1}</td>${state.headers.map(h=>`<td title="${esc(r[h]??"")}">${esc(r[h]??"")}</td>`).join("")}</tr>`).join("")
  }</tbody>`;
}
function renderIssues(){
  const a=state.analysis,items=[];
  if(a.duplicateRows)items.push(["중복 행 "+a.duplicateRows+"개","모든 열 값이 같은 행입니다.","danger","중복"]);
  if(a.whitespaceCount)items.push(["앞뒤 공백 "+a.whitespaceCount+"개","문자열 시작/끝의 불필요한 공백입니다.","warn","공백"]);
  for(const [c,n] of Object.entries(a.missing))if(n)items.push([`${c} 결측값 ${n}개`,"빈칸, -, N/A, NULL, 없음 등을 결측값으로 탐지했습니다.","warn","결측"]);
  if(!items.length)items.push(["기본 검사에서 문제가 발견되지 않았습니다.","Gemini 형식 분석으로 의미상 불일치를 추가 확인할 수 있습니다.","good","정상"]);
  $("issues").innerHTML=`<div class="issue-list">${items.map(x=>`<div class="issue-card"><div><strong>${esc(x[0])}</strong><p>${esc(x[1])}</p></div><span class="badge ${x[2]}">${x[3]}</span></div>`).join("")}</div>`;
  $("issueCount").textContent=a.issueCount.toLocaleString();
}
function renderMissing(){
  const cols=Object.entries(state.analysis.missing).filter(([,n])=>n);
  if(!cols.length){$("missingControls").innerHTML="";return}
  $("missingControls").innerHTML=`<h3 class="missing-title">결측값 처리</h3><div class="missing-grid">${cols.map(([col,n],i)=>{
    const s=numericStats(state.rows,col),m=mode(state.rows,col);
    return `<div class="control-card"><label>${esc(col)} <span class="badge warn">${n}개</span></label>
    <select class="missing-action" data-column="${esc(col)}" data-custom="custom-${i}">
      <option value="keep">그대로 유지</option><option value="delete">결측값이 있는 행 삭제</option>
      ${s?`<option value="average">평균값으로 채우기 (${s.avg})</option><option value="median">중앙값으로 채우기 (${s.median})</option>`:""}
      <option value="mode">최빈값으로 채우기${m?` (${esc(m)})`:""}</option><option value="custom">직접 입력</option>
    </select><input class="custom-input" id="custom-${i}" placeholder="채울 값을 입력하세요"><small>숫자형 데이터에는 평균·중앙값 옵션이 표시됩니다.</small></div>`
  }).join("")}</div>`;
  document.querySelectorAll(".missing-action").forEach(s=>s.onchange=()=>$(s.dataset.custom).style.display=s.value==="custom"?"block":"none");
}
function applyCleaning(){
  let rows=state.rows.map(r=>({...r})),changed=0,actions=[];
  if($("trimAction").value==="trim"){for(const r of rows)for(const h of state.headers)if(typeof r[h]==="string"){const v=r[h].trim();if(v!==r[h])changed++;r[h]=v}actions.push("앞뒤 공백 제거")}
  for(const sel of document.querySelectorAll(".missing-action")){
    const col=sel.dataset.column,action=sel.value;if(action==="keep")continue;
    if(action==="delete"){const before=rows.length;rows=rows.filter(r=>!missing(r[col]));changed+=before-rows.length;actions.push(`${col}: 결측 행 삭제`);continue}
    let fill;
    if(action==="mode")fill=mode(rows,col);
    if(action==="average"||action==="median"){const s=numericStats(rows,col);fill=s?.[action==="average"?"avg":"median"]}
    if(action==="custom")fill=$(sel.dataset.custom).value;
    if(fill!==undefined&&fill!==""){for(const r of rows)if(missing(r[col])){r[col]=fill;changed++}actions.push(`${col}: ${action} 채우기`)}
  }
  if($("duplicateAction").value==="remove"){const seen=new Set(),out=[];for(const r of rows){const k=state.headers.map(h=>String(r[h]??"").trim()).join("␟");if(seen.has(k))changed++;else{seen.add(k);out.push(r)}}rows=out;actions.push("중복 행 삭제")}
  state.cleaned=rows;table("resultTable",rows);$("resultSummary").innerHTML=`<span class="pill">원본 ${state.rows.length}행</span><span class="pill">결과 ${rows.length}행</span><span class="pill">${changed}개 수정/삭제</span><span class="pill">${actions.length}개 규칙</span>`;
  $("resultPanel").classList.remove("hidden");
  fetch("/api/save-run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({file_name:state.file.name,original_rows:state.rows.length,cleaned_rows:rows.length,issue_count:state.analysis.issueCount,actions})}).finally(loadHistory);
}
function download(){if(!state.cleaned.length)return;const b=new Blob([toCSV(state.cleaned)],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=state.file.name.replace(/\.csv$/i,"")+"_cleaned.csv";a.click();URL.revokeObjectURL(u)}
async function aiAnalyze(){
  const btn=$("aiAnalyzeBtn"),box=$("aiResult");btn.disabled=true;btn.textContent="Gemini 분석 중...";box.classList.remove("hidden");box.textContent="열 이름과 일부 샘플을 분석하고 있습니다.";
  try{
    const samples=Object.fromEntries(state.headers.map(h=>[h,state.rows.slice(0,20).map(r=>r[h])]));
    const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileName:state.file.name,rowCount:state.rows.length,headers:state.headers,samples})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||"AI 분석 실패");
    const list=data.analysis?.suggestions||[];
    box.innerHTML=list.length?`<strong>Gemini 형식 분석 결과</strong><div class="issue-list" style="margin-top:12px">${list.map(s=>`<div class="issue-card"><div><strong>${esc(s.column||"열")}</strong><p>${esc(s.problem||"")}<br>추천: ${esc(s.recommendation||"")}</p></div><span class="badge warn">${esc(s.type||"AI")}</span></div>`).join("")}</div>`:esc(data.raw||"추가 형식 문제가 발견되지 않았습니다.");
  }catch(e){box.textContent="Gemini 연결 오류: "+e.message}
  finally{btn.disabled=false;btn.textContent="Gemini로 형식 분석"}
}
async function loadHistory(){
  try{const r=await fetch("/api/history"),d=await r.json();if(!r.ok)throw 0;$("dbStatus").textContent="Supabase 연결됨";$("history").innerHTML=d.rows?.length?d.rows.map(x=>`<div class="history-item"><strong>${esc(x.file_name)}</strong><span>원본 ${x.original_rows}행</span><span>결과 ${x.cleaned_rows}행</span><span>문제 ${x.issue_count}개</span><span>${new Date(x.created_at).toLocaleString("ko-KR")}</span></div>`).join(""):'<div class="empty">아직 저장된 작업이 없습니다.</div>'}
  catch{$("dbStatus").textContent="Supabase 미연결";$("history").innerHTML='<div class="empty">Supabase 환경변수와 테이블을 연결하면 기록이 표시됩니다.</div>'}
}
async function handleFile(file){
  if(!file||!file.name.toLowerCase().endsWith(".csv"))return alert("현재 버전은 CSV 파일만 지원합니다.");
  try{const p=parseCSV(await file.text());state.file=file;state.headers=p.headers;state.rows=p.rows;state.cleaned=[];state.analysis=analyze();$("fileName").textContent=file.name;$("rowCount").textContent=p.rows.length;$("columnCount").textContent=p.headers.length;$("uploadPanel").classList.add("hidden");$("workspace").classList.remove("hidden");$("resultPanel").classList.add("hidden");$("aiResult").classList.add("hidden");table("previewTable",p.rows);renderIssues();renderMissing()}
  catch(e){alert("CSV를 읽지 못했습니다: "+e.message)}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("fileInput").onchange=e=>handleFile(e.target.files?.[0]);$("resetBtn").onclick=()=>location.reload();$("applyBtn").onclick=applyCleaning;$("downloadBtn").onclick=download;$("aiAnalyzeBtn").onclick=aiAnalyze;$("refreshHistoryBtn").onclick=loadHistory;
const dz=$("dropzone");["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add("drag")}));["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove("drag")}));dz.addEventListener("drop",e=>handleFile(e.dataTransfer.files?.[0]));
loadHistory();