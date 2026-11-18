const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n||0)),day=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")},month=()=>day().slice(0,7),df=s=>s?new Date(s+"T12:00:00").toLocaleDateString("pt-BR"):"—",esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LOCAL_PROFILE_ID="ray-personal-profile";
const THEME_STORAGE_KEY="ray-personal-theme";
const cats=["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Compras","Assinaturas","Salário","Freelance","Investimentos","Outros"],titles={dashboard:"Visão geral",transactions:"Lançamentos",cards:"Cartões e parcelas",bills:"Contas a pagar",goals:"Metas de economia",reports:"Relatórios",privacy:"Dados e privacidade"},tables={transaction:"transactions",card:"cards",installment:"installments",bill:"bills",goal:"goals"};
let db=null,user,rows={transactions:[],cards:[],installments:[],bills:[],goals:[]},edit=null,kind=null;
function parseMoney(value){const raw=String(value??"").trim().replace(/R\$|\s/g,"");if(!raw)return null;let normalized=raw;if(raw.includes(",")&&raw.includes(".")){normalized=raw.lastIndexOf(",")>raw.lastIndexOf(".")?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"")}else if(raw.includes(",")){normalized=raw.replace(",",".")}const number=Number(normalized);return Number.isFinite(number)?number:NaN}
function msg(id,s){const node=$(id);if(node)node.textContent=s||""}
let toastTimer;
function toast(s,err=false){
 const root=$("toast"),label=$("toastMessage"),closeButton=$("toastCloseBtn");
 if(!root||!label)return;
 window.clearTimeout(toastTimer);
 label.textContent=s;root.classList.remove("hidden");root.classList.toggle("error",err);
 root.setAttribute("role",err?"alert":"status");root.setAttribute("aria-live",err?"assertive":"polite");
 if(closeButton)closeButton.hidden=!err;
 if(!err)toastTimer=window.setTimeout(dismissToast,3500);
}
function dismissToast(){const root=$("toast");if(root)root.classList.add("hidden")}
function setMenuButtonState(isOpen){
 const button=$("menuBtn");
 if(!button)return;
 button.setAttribute("aria-expanded",String(isOpen));
 button.setAttribute("aria-label",isOpen?"Fechar menu":"Abrir menu");
 button.title=isOpen?"Fechar menu":"Abrir menu";
 button.textContent=isOpen?"×":"☰";
}
function closeMenu(){
 const nav=$("app")?.querySelector(".sidebar"),wasOpen=nav?.classList.contains("open");
 if(nav)nav.classList.remove("open");
 setMenuButtonState(false);
 if(wasOpen)$("menuBtn")?.focus();
}
function emptyState(title,description,action,kind){
 return '<div class="empty-state"><strong>'+esc(title)+'</strong><p>'+esc(description)+'</p><button type="button" class="text-btn" data-new="'+esc(kind)+'">'+esc(action)+'</button></div>';
}
function showDashboardSkeletons(){
 const line='<div class="skeleton-row"><span class="skeleton skeleton-label"></span><span class="skeleton skeleton-value"></span></div>';
 const rows=line+line+line+line;
 $("content").setAttribute("aria-busy","true");
 $("categoryChart").innerHTML='<div class="skeleton-stack" aria-hidden="true">'+rows+'</div>';
 $("upcomingBills").innerHTML='<div class="skeleton-stack" aria-hidden="true">'+line+line+'</div>';
 $("recentTransactions").innerHTML='<div class="skeleton-stack" aria-hidden="true">'+rows+'</div>';
}
function loadErrorState(id,message){
 const node=$(id);
 if(node)node.innerHTML='<div class="empty-state error-state" role="alert"><strong>Não foi possível carregar</strong><p>'+esc(message)+'</p><button type="button" class="text-btn" data-reload>Recarregar</button></div>';
}
function writeFilterState(){
 const url=new URL(window.location.href),selectedMonth=$("monthFilter").value,type=$("typeFilter").value;
 if(/^\d{4}-\d{2}$/.test(selectedMonth))url.searchParams.set("month",selectedMonth);else url.searchParams.delete("month");
 if(type==="income"||type==="expense")url.searchParams.set("type",type);else url.searchParams.delete("type");
 history.replaceState(history.state,"",url);
}
function restoreUrlState(){
 const params=new URLSearchParams(window.location.search),selectedMonth=params.get("month"),type=params.get("type");
 if(/^\d{4}-\d{2}$/.test(selectedMonth||""))$("monthFilter").value=selectedMonth;
 $("typeFilter").value=type==="income"||type==="expense"?type:"";
 const requested=window.location.hash.slice(1),page=titles[requested]?requested:"dashboard";
 if(requested!==page){const url=new URL(window.location.href);url.hash=page;history.replaceState({page},"",url)}
 go(page,false);
}

function applyTheme(theme,persist=false){
 const mode=theme==="dark"?"dark":"light";
 const dark=mode==="dark";
 document.documentElement.dataset.theme=mode;
 const meta=$("themeColorMeta");
 if(meta)meta.setAttribute("content",dark?"#071B31":"#F1EEE7");
 const button=$("themeToggleBtn"),label=$("themeToggleLabel");
 if(button){
  const next=dark?"Modo claro":"Modo azul";
  if(label)label.textContent=next;
  button.setAttribute("aria-pressed",String(dark));
  button.setAttribute("aria-label",dark?"Ativar modo claro":"Ativar modo azul");
  button.title=dark?"Mudar para tema claro":"Mudar para tema azul";
 }
 if(persist){
  try{localStorage.setItem(THEME_STORAGE_KEY,mode)}catch(error){console.warn("Não foi possível guardar a preferência de tema:",error)}
 }
}
function initTheme(){
 let saved="light";
 try{saved=localStorage.getItem(THEME_STORAGE_KEY)||"light"}catch(_){}
 applyTheme(saved,false);
 const button=$("themeToggleBtn");
 if(button)button.addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark",true));
}

function initMobileModalSupport(){
 const dialog=$("modalBackdrop");
 if(!dialog)return;
 const viewport=window.visualViewport;
 const clear=()=>{
  dialog.classList.remove("keyboard-visible");
  document.body.classList.remove("keyboard-visible");
  dialog.style.removeProperty("--visual-viewport-height");
  dialog.style.removeProperty("--visual-viewport-top");
 };
 const sync=()=>{
  if(!window.matchMedia("(max-width: 48rem)").matches||!dialog.open||!viewport){clear();return}
  const keyboardOpen=(window.innerHeight-viewport.height)>120;
  if(!keyboardOpen){clear();return}
  dialog.style.setProperty("--visual-viewport-height",Math.max(180,viewport.height-12)+"px");
  dialog.style.setProperty("--visual-viewport-top",Math.max(0,viewport.offsetTop)+"px");
  dialog.classList.add("keyboard-visible");
  document.body.classList.add("keyboard-visible");
 };
 viewport?.addEventListener("resize",sync);
 viewport?.addEventListener("scroll",sync);
 window.addEventListener("orientationchange",sync);
 dialog.addEventListener("close",clear);
 dialog.addEventListener("focusin",event=>{
  const target=event.target;
  if(!target.matches("input,select,textarea"))return;
  window.requestAnimationFrame(()=>target.scrollIntoView({block:"nearest",behavior:"smooth"}));
 });
}
function init(){
 initTheme();
 initMobileModalSupport();
 if($("monthFilter"))$("monthFilter").value=month();
 $("navigation").onclick=e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page)};
 const mobileTabs=$("mobileTabbar");
 if(mobileTabs)mobileTabs.addEventListener("click",event=>{
  const moreButton=event.target.closest("#mobileMoreToggle");
  if(moreButton){
   const menu=$("mobileMoreMenu"),opening=menu.classList.contains("hidden");
   menu.classList.toggle("hidden",!opening);moreButton.setAttribute("aria-expanded",String(opening));return;
  }
  const action=event.target.closest("[data-action]");
  if(action){
   const actions={theme:"themeToggleBtn",backup:"exportBackupBtn",restore:"importBackupBtn",install:"installAppBtn"};
   $(actions[action.dataset.action])?.click();return;
  }
  const tab=event.target.closest("[data-page]");
  if(tab)go(tab.dataset.page);
 });
 document.addEventListener("click",event=>{
  if(mobileTabs&&!mobileTabs.contains(event.target)){
   $("mobileMoreMenu")?.classList.add("hidden");
   $("mobileMoreToggle")?.setAttribute("aria-expanded","false");
  }
 });
 $("menuBtn").onclick=()=>{
  const nav=$("app").querySelector(".sidebar"),isOpen=nav.classList.toggle("open");
  setMenuButtonState(isOpen);
  if(isOpen)nav.querySelector("#navigation .nav-item")?.focus();
 };
 $("monthFilter").onchange=()=>{render();writeFilterState()};
 $("quickAddBtn").onclick=$("addTransactionBtn").onclick=()=>open("transaction");
 $("addCardBtn").onclick=()=>open("card");
 $("addInstallmentBtn").onclick=()=>open("installment");
 $("addBillBtn").onclick=()=>open("bill");
 $("addGoalBtn").onclick=()=>open("goal");
 $("transactionSearch").oninput=renderTransactions;
 $("typeFilter").onchange=()=>{renderTransactions();writeFilterState()};
 $("closeModalBtn").onclick=$("cancelModalBtn").onclick=close;
 $("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))close()});
 $("modalBackdrop").addEventListener("close",()=>{edit=null;kind=null;msg("formMessage","")});
 $("editorForm").onsubmit=save;
 $("editorForm").addEventListener("input",e=>{
  if(e.target.hasAttribute("aria-invalid")){
   e.target.removeAttribute("aria-invalid");e.target.removeAttribute("aria-describedby");
   if(!$("editorForm").querySelector("[aria-invalid]"))msg("formMessage","");
  }
 });
 $("toastCloseBtn").onclick=dismissToast;
 document.addEventListener("click",e=>{
  const sidebar=$("app").querySelector(".sidebar");
  if(sidebar.classList.contains("open")&&!e.target.closest(".sidebar")&&!e.target.closest("#menuBtn"))closeMenu();
  const create=e.target.closest("[data-new]"),destination=e.target.closest("[data-goto]");
  if(create){open(create.dataset.new);closeMenu();return}
  if(destination){go(destination.dataset.goto);return}
  if(e.target.closest("[data-reload]"))load();
 });
 window.addEventListener("popstate",restoreUrlState);
 window.addEventListener("hashchange",()=>go(window.location.hash.slice(1),false));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
 $("exportBackupBtn").onclick=exportBackup;
 $("importBackupBtn").onclick=()=>$("backupFileInput").click();
 $("backupFileInput").onchange=restoreBackup;
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user)load()});
 restoreUrlState();
 enterLocalSpace();
}
async function enterLocalSpace(){
 user={id:LOCAL_PROFILE_ID,email:"Salvo neste aparelho",offlineOnly:true};
 $("authScreen").classList.add("hidden");
 $("app").classList.remove("hidden");
 const todayLabel=$("todayLabel");if(todayLabel)todayLabel.textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
 showDashboardSkeletons();
 await load();
}
async function refreshSyncStatus(){
 const badge=$("syncStatus");
 if(!badge)return;
 badge.classList.remove("hidden");
 badge.textContent="Salvo neste aparelho";
 badge.title="Os dados ficam neste navegador. Exporte um backup para guardá-los.";
}
async function exportBackup(){
 try{
  const contents=await FinanceOffline.exportBackup(user.id);
  const blob=new Blob([contents],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="ray-backup-"+day()+".json";
  document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Backup baixado. Guarde o arquivo em um local seguro.");
 }catch(error){toast(error.message||"Não foi possível criar o backup.",true)}
}
async function restoreBackup(event){
 const file=event.target.files?.[0];
 if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error("O arquivo é maior que o limite de 5 MB.");
  if(!window.confirm("Restaurar este backup substituirá os dados atuais deste aparelho. Exporte um backup atual antes de continuar. Deseja prosseguir?"))return;
  await FinanceOffline.restoreBackup(user.id,await file.text());
  rows=await FinanceOffline.getRows(user.id);render();go("dashboard");
 }catch(error){toast(error.message||"Não foi possível restaurar este backup.",true)}
 finally{event.target.value=""}
}
function go(p,writeHistory=true){
 if(!titles[p])p="dashboard";
 if(writeHistory&&window.location.hash!=="#"+p){
  const url=new URL(window.location.href);url.hash=p;history.pushState({page:p},"",url);
 }
 document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
 $(p+"Page").classList.remove("hidden");
 document.querySelectorAll(".nav-item[data-page]").forEach(b=>{
  const active=b.dataset.page===p;b.classList.toggle("active",active);
  if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
 });
 const mobileTabs=$("mobileTabbar");
 if(mobileTabs){
  mobileTabs.querySelectorAll(".mobile-tab[data-page]").forEach(b=>{
   if(b.dataset.page===p)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  const more=$("mobileMoreToggle"),moreActive=["goals","reports","privacy"].includes(p);
  if(more){if(moreActive)more.setAttribute("aria-current","page");else more.removeAttribute("aria-current");more.setAttribute("aria-expanded","false")}
  $("mobileMoreMenu")?.classList.add("hidden");
 }
 $("pageTitle").textContent=titles[p];closeMenu();render();scrollTo({top:0,behavior:"auto"});
}
async function load(){
 if(!user||!window.FinanceOffline)return;
 $("content").setAttribute("aria-busy","true");
 try{
  rows=await FinanceOffline.getRows(user.id);
  render();await refreshSyncStatus();
 }catch(error){
  console.error("Falha ao abrir dados locais:",error);
  const message=error.message||"Tente recarregar a página para abrir os dados deste aparelho.";
  ["categoryChart","upcomingBills","recentTransactions"].forEach(id=>loadErrorState(id,message));
  toast(message,true);
 }finally{$("content").setAttribute("aria-busy","false")}
}
function monthly(){let m=$("monthFilter").value||month();return rows.transactions.filter(t=>(t.date||"").startsWith(m))}function sum(a){return a.reduce((s,x)=>s+Number(x.amount||0),0)}function group(a){let g={};a.forEach(x=>g[x.category||"Outros"]=(g[x.category||"Outros"]||0)+Number(x.amount));return Object.entries(g).sort((a,b)=>b[1]-a[1])}
function bars(g,limit=99){
 let max=g[0]?.[1]||1;
 return g.length?g.slice(0,limit).map(([n,v])=>'<div class="category-line"><span class="cat-name">'+esc(n)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(v/max*100)+'%"></div></div><strong>'+fmt(v)+'</strong></div>').join(""):emptyState("Ainda não há despesas por categoria.","O resumo aparece depois que você registrar uma despesa.","Adicionar despesa","transaction");
}
function render(){dashboard();renderTransactions();renderCards();renderInstallments();renderBills();renderGoals();reports()}
function dashboard(){
 let a=monthly(),inc=sum(a.filter(x=>x.type==="income")),exp=sum(a.filter(x=>x.type==="expense"));
 $("balanceValue").textContent=fmt(inc-exp);$("incomeValue").textContent=fmt(inc);$("expenseValue").textContent=fmt(exp);
 let pending=rows.bills.filter(x=>!x.paid);
 $("categoryChart").innerHTML=bars(group(a.filter(x=>x.type==="expense")),6);
 let bills=pending.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,4);
 $("upcomingBills").innerHTML=bills.length?bills.map(b=>'<div class="compact-item"><div><strong>'+esc(b.name)+'</strong><small>'+df(b.due_date)+' · '+(b.due_date<day()?"Vencida":"A vencer")+'</small></div><strong>'+fmt(b.amount)+'</strong></div>').join(""):emptyState("Nenhuma conta pendente.","Cadastre vencimentos para acompanhar o que precisa ser pago.","Adicionar conta","bill");
 $("recentTransactions").innerHTML=txTable([...a].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,5),false);
}
function txTable(a,actions=true){
 if(!a.length)return emptyState("Nenhum lançamento neste período.","Registre entradas e despesas para acompanhar seu saldo.","Novo lançamento","transaction");
 return '<div class="table-wrap"><table data-actions="'+(actions?"true":"false")+'"><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th>'+(actions?"<th>Ações</th>":"")+'</tr></thead><tbody>'+a.map(t=>'<tr><td><strong>'+esc(t.description)+'</strong></td><td><span class="tag">'+esc(t.category||"Outros")+'</span></td><td>'+df(t.date)+'</td><td class="'+(t.type==="income"?"amount-income":"amount-expense")+'">'+(t.type==="income"?"+":"−")+' '+fmt(t.amount)+'</td>'+(actions?'<td><button type="button" class="mini-btn" data-edit="transaction" data-id="'+t.id+'">Editar</button> <button type="button" class="mini-btn danger" data-del="transaction" data-id="'+t.id+'">Excluir</button></td>':"")+'</tr>').join("")+'</tbody></table></div>';
}
function renderTransactions(){let q=($("transactionSearch").value||"").toLowerCase(),t=$("typeFilter").value,a=[...rows.transactions].filter(x=>(!q||(x.description+" "+x.category).toLowerCase().includes(q))&&(!t||x.type===t)).sort((a,b)=>b.date.localeCompare(a.date));$("transactionsTable").innerHTML=txTable(a);actions($("transactionsTable"))}
function bankIdentity(bank){
 const words=String(bank||"Banco").trim().split(/\s+/).filter(Boolean);
 return {short:words.slice(0,2).map(word=>word[0]).join("").toUpperCase()||"CC",bg:"var(--color-accent-wash)",fg:"var(--color-accent)"};
}
function renderCards(){
 $("cardsList").innerHTML=rows.cards.length?rows.cards.map(c=>{
  let bi=bankIdentity(c.bank);
  return '<article class="bank-card"><div class="bank-card-head"><div class="bank-identity"><span class="institution-mark" style="--mark-bg:'+bi.bg+';--mark-color:'+bi.fg+'">'+esc(bi.short)+'</span><div class="bank-identity-text"><span class="bank-institution">'+esc(c.bank||"Instituição não informada")+'</span><strong>'+esc(c.name)+'</strong></div></div><div class="row-actions card-actions"><button type="button" class="mini-btn" data-edit="card" data-id="'+c.id+'">Editar</button> <button type="button" class="mini-btn danger" data-del="card" data-id="'+c.id+'">Excluir</button></div></div><div class="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;'+esc(c.last_four||"••••")+'</div><div class="bank-card-foot"><div><span class="card-meta">Limite total</span><strong>'+fmt(c.limit_amount)+'</strong></div><span class="network-label">'+esc((c.network||"Visa").toUpperCase())+'</span></div><div class="card-cycle">Fecha '+esc(c.closing_day||"—")+' · Vence '+esc(c.due_day||"—")+'</div></article>';
 }).join(""):emptyState("Nenhum cartão cadastrado.","Cadastre um cartão para organizar seus limites e compras.","Adicionar cartão","card");
 actions($("cardsList"));
}
function renderInstallments(){
 const empty=rows.cards.length?emptyState("Nenhuma compra parcelada.","Adicione uma compra para acompanhar suas parcelas.","Nova compra","installment"):emptyState("Cadastre um cartão primeiro.","As compras parceladas precisam estar ligadas a um cartão.","Adicionar cartão","card");
 $("installmentsTable").innerHTML=rows.installments.length?'<div class="table-wrap"><table data-actions="true"><thead><tr><th>Compra</th><th>Cartão</th><th>Total</th><th>Parcela mensal</th><th>Progresso</th><th>Ações</th></tr></thead><tbody>'+rows.installments.map(i=>'<tr><td>'+esc(i.description)+'</td><td>'+esc(rows.cards.find(c=>c.id===i.card_id)?.name||"—")+'</td><td>'+fmt(i.total_amount)+'</td><td>'+fmt(Number(i.total_amount)/Number(i.installments_count))+'</td><td>'+i.paid_installments+'/'+i.installments_count+'</td><td><button type="button" class="mini-btn" data-edit="installment" data-id="'+i.id+'">Editar</button> <button type="button" class="mini-btn danger" data-del="installment" data-id="'+i.id+'">Excluir</button></td></tr>').join("")+'</tbody></table></div>':empty;
 actions($("installmentsTable"));
}
function renderBills(){
 $("billsTable").innerHTML=rows.bills.length?'<div class="table-wrap"><table data-actions="true"><thead><tr><th>Conta</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+[...rows.bills].sort((a,b)=>a.due_date.localeCompare(b.due_date)).map(b=>'<tr><td><strong>'+esc(b.name)+'</strong><br><small class="muted">'+esc(b.category||"Conta")+'</small></td><td>'+df(b.due_date)+'</td><td>'+fmt(b.amount)+'</td><td><span class="tag '+(b.paid?"paid":b.due_date<day()?"overdue":"")+'">'+(b.paid?"Paga":b.due_date<day()?"Atrasada":"Pendente")+'</span></td><td><button type="button" class="mini-btn" data-toggle="'+b.id+'">'+(b.paid?"Reabrir":"Marcar paga")+'</button> <button type="button" class="mini-btn" data-edit="bill" data-id="'+b.id+'">Editar</button> <button type="button" class="mini-btn danger" data-del="bill" data-id="'+b.id+'">Excluir</button></td></tr>').join("")+'</tbody></table></div>':emptyState("Nenhuma conta cadastrada.","Adicione os vencimentos para acompanhar o que está por vir.","Adicionar conta","bill");
 actions($("billsTable"));
 $("billsTable").querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>update("bills",b.dataset.toggle,{paid:!rows.bills.find(x=>x.id===b.dataset.toggle).paid}));
}
function renderGoals(){
 $("goalsList").innerHTML=rows.goals.length?rows.goals.map(g=>{
  let pct=Math.min(100,Number(g.target_amount)?Number(g.saved_amount)/Number(g.target_amount)*100:0);
  return '<article class="goal-card"><div class="goal-top"><div class="row-actions"><button type="button" class="mini-btn" data-edit="goal" data-id="'+g.id+'">Editar</button> <button type="button" class="mini-btn danger" data-del="goal" data-id="'+g.id+'">Excluir</button></div></div><h3>'+esc(g.name)+'</h3><p class="muted">'+(g.target_date?"Meta até "+df(g.target_date):"Sem data definida")+'</p><strong>'+fmt(g.saved_amount)+'</strong><div class="goal-numbers"><span>de '+fmt(g.target_amount)+'</span><strong>'+Math.round(pct)+'%</strong></div><div class="goal-progress"><span style="width:'+pct+'%"></span></div><div class="goal-actions"><button type="button" class="btn secondary" data-contribute="'+g.id+'">＋ Registrar economia</button></div></article>';
 }).join(""):emptyState("Nenhuma meta cadastrada.","Defina um objetivo e acompanhe o quanto já guardou.","Criar meta","goal");
 actions($("goalsList"));
 $("goalsList").querySelectorAll("[data-contribute]").forEach(b=>b.onclick=()=>open("contribution",rows.goals.find(g=>g.id===b.dataset.contribute)));
}
function reports(){let a=monthly(),inc=sum(a.filter(x=>x.type==="income")),exp=sum(a.filter(x=>x.type==="expense")),g=group(a.filter(x=>x.type==="expense"));$("savingRate").textContent=inc?Math.round((inc-exp)/inc*100)+"%":"Sem dados";$("topCategory").textContent=g[0]?.[0]||"Sem dados";$("reportCategories").innerHTML=bars(g)}
function actions(root){root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>open(b.dataset.edit,find(b.dataset.edit,b.dataset.id)));root.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>remove(b.dataset.del,b.dataset.id))}
function find(k,id){return rows[tables[k]].find(x=>x.id===id)}
async function remove(k,id){
 if(!confirm("Excluir este registro? Essa ação não pode ser desfeita."))return;
 if(!user||!window.FinanceOffline)return toast("Não foi possível abrir o armazenamento local.",true);
 try{
  await FinanceOffline.remove(user.id,db,tables[k],id,!user.offlineOnly);
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  
 }catch(error){toast(error.message||"Não foi possível excluir o registro.",true)}
}
async function update(table,id,p){
 if(!user||!window.FinanceOffline)return toast("Não foi possível abrir o armazenamento local.",true);
 try{
  await FinanceOffline.update(user.id,db,table,id,p,!user.offlineOnly);
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  
 }catch(error){toast(error.message||"Não foi possível atualizar.",true)}
}
function fieldError(name,message){
 const field=$("editorForm").elements.namedItem(name);
 if(field){field.setAttribute("aria-invalid","true");field.setAttribute("aria-describedby","formMessage");field.focus()}
 msg("formMessage",message);
}
function field(n,l,t="text",o={}){
 const id="field-"+n;let c;
 if(t==="select")c='<select id="'+id+'" name="'+n+'" '+(o.required?'required aria-required="true"':"")+'>'+o.options.map(x=>'<option value="'+esc(x.value)+'">'+esc(x.label)+'</option>').join("")+'</select>';
 else if(t==="textarea")c='<textarea id="'+id+'" name="'+n+'" rows="3" autocomplete="off" enterkeyhint="next"></textarea>';
 else if(t==="money")c='<input id="'+id+'" name="'+n+'" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" data-money="true" '+(o.required?'required aria-required="true"':"")+' placeholder="'+esc(o.placeholder||"0,00")+'">';
 else c='<input id="'+id+'" name="'+n+'" type="'+t+'" '+(o.required?'required aria-required="true"':"")+(o.min!==undefined?' min="'+esc(o.min)+'"':"")+(o.max!==undefined?' max="'+esc(o.max)+'"':"")+(o.step?' step="'+esc(o.step)+'"':"")+(o.inputmode?' inputmode="'+esc(o.inputmode)+'"':(t==="number"?' inputmode="numeric"':""))+(o.maxlength?' maxlength="'+esc(o.maxlength)+'"':"")+' autocomplete="off" enterkeyhint="next"'+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':"")+'>';
 return '<div class="form-field'+(o.full?" full-field":"")+'"><label for="'+id+'">'+esc(l)+(o.required?' <span class="required-word">obrigatório</span>':'')+'</label>'+c+'</div>';
}
function open(k,rec=null){edit=rec;kind=k;msg("formMessage","");let f=[],add=(...a)=>f.push(field(...a)),sel=a=>a.map(x=>({value:x,label:x}));if(k==="transaction"){add("type","Tipo","select",{required:true,options:[{value:"expense",label:"Despesa"},{value:"income",label:"Entrada"}]});add("description","Descrição","text",{required:true});add("amount","Valor (R$)","money",{required:true});add("category","Categoria","select",{options:sel(cats)});add("date","Data","date",{required:true});add("payment_method","Forma de pagamento","select",{options:sel(["Pix","Dinheiro","Débito","Crédito","Transferência","Outro"])});add("notes","Observações","textarea",{full:true})}
if(k==="card"){add("name","Nome do cartão","text",{required:true});add("bank","Instituição / banco","text",{placeholder:"Ex.: Nubank, Itaú, Inter..."});add("network","Bandeira do cartão","select",{required:true,options:[{value:"Visa",label:"Visa"},{value:"Mastercard",label:"Mastercard"},{value:"Elo",label:"Elo"},{value:"Hipercard",label:"Hipercard"},{value:"American Express",label:"American Express"},{value:"Outra",label:"Outra"}]});add("last_four","Últimos 4 dígitos","text",{placeholder:"Opcional",inputmode:"numeric",maxlength:"4"});add("limit_amount","Limite total (R$)","money",{placeholder:"Opcional"});add("closing_day","Dia de fechamento","number",{min:"1",step:"1"});add("due_day","Dia de vencimento","number",{min:"1",step:"1"})}
if(k==="installment"){add("description","Descrição da compra","text",{required:true});add("card_id","Cartão","select",{required:true,options:rows.cards.map(c=>({value:c.id,label:c.name}))});add("total_amount","Valor total (R$)","money",{required:true});add("installments_count","Quantidade de parcelas","number",{required:true,min:"1",step:"1"});add("paid_installments","Parcelas já pagas","number",{required:true,min:"0",step:"1"});add("purchase_date","Data da compra","date",{required:true})}
if(k==="bill"){add("name","Nome da conta","text",{required:true});add("amount","Valor (R$)","money",{required:true});add("due_date","Vencimento","date",{required:true});add("category","Categoria","select",{options:sel(["Moradia","Água","Energia","Internet","Telefone","Assinatura","Saúde","Educação","Outros"])});add("paid","Já foi paga?","select",{options:[{value:"false",label:"Não, está pendente"},{value:"true",label:"Sim, foi paga"}]});add("notes","Observações","textarea",{full:true})}
if(k==="goal"){add("name","Nome da meta","text",{required:true});add("target_amount","Valor desejado (R$)","money",{required:true});add("saved_amount","Quanto já guardou (R$)","money",{required:true});add("target_date","Data desejada","date");add("notes","Por que essa meta importa?","textarea",{full:true})}
if(k==="contribution"){add("amount","Quanto você guardou? (R$)","money",{required:true});f.push('<p class="muted full-field">A contribuição será somada à meta “'+esc(rec.name)+'”.</p>')}
$("modalTitle").textContent=({transaction:rec?"Editar lançamento":"Novo lançamento",card:rec?"Editar cartão":"Novo cartão",installment:rec?"Editar compra parcelada":"Nova compra parcelada",bill:rec?"Editar conta":"Nova conta",goal:rec?"Editar meta":"Nova meta",contribution:"Registrar economia"})[k];$("modalFields").innerHTML=f.join("");let form=$("editorForm");if(rec)for(let [n,v] of Object.entries(rec)){let el=form.elements.namedItem(n);if(el)el.value=v??""}if(k==="transaction"&&!rec){form.elements.date.value=day();form.elements.type.value="expense";form.elements.category.value="Outros"}if(k==="bill"&&!rec){form.elements.due_date.value=day();form.elements.paid.value="false"}if(k==="installment"&&!rec){form.elements.purchase_date.value=day();form.elements.paid_installments.value="0";form.elements.card_id.value=rows.cards[0]?.id||""}if(k==="goal"&&!rec)form.elements.saved_amount.value="0";const dialog=$("modalBackdrop");if(!dialog.open)dialog.showModal();
 window.requestAnimationFrame(()=>{
  if(window.matchMedia("(max-width: 48rem)").matches)$("modalTitle").focus({preventScroll:true});
  else dialog.querySelector("input,select,textarea")?.focus();
 });
}
function close(){const dialog=$("modalBackdrop");if(dialog.open)dialog.close();edit=null;kind=null}
async function save(e){
 e.preventDefault();
 if(!kind)return;
 if(!user||!window.FinanceOffline)return msg("formMessage","Não foi possível abrir o armazenamento local.");
 let v=Object.fromEntries(new FormData(e.target).entries()),k=kind,table=tables[k],p={},num=n=>parseMoney(v[n]);
 if(k==="transaction")p={type:v.type,description:v.description.trim(),amount:num("amount"),category:v.category||"Outros",date:v.date,payment_method:v.payment_method||null,notes:v.notes||null};
 if(k==="transaction"&&!(p.amount>0))return fieldError("amount","Informe um valor válido maior que zero. Exemplo: 125,90.");
 if(k==="card")p={name:v.name.trim(),bank:v.bank?.trim()||null,network:v.network||"Visa",last_four:v.last_four?.trim()||null,limit_amount:num("limit_amount"),closing_day:num("closing_day"),due_day:num("due_day")};
 if(k==="card"&&p.limit_amount!==null&&(!Number.isFinite(p.limit_amount)||p.limit_amount<0))return fieldError("limit_amount","Informe um limite válido ou deixe o campo em branco.");
 if(k==="installment"){
  if(!rows.cards.some(c=>c.id===v.card_id))return fieldError("card_id","Cadastre um cartão antes de adicionar parcelas.");
  p={description:v.description.trim(),card_id:v.card_id,total_amount:num("total_amount"),installments_count:num("installments_count"),paid_installments:num("paid_installments"),purchase_date:v.purchase_date};
  if(!(p.total_amount>0))return fieldError("total_amount","Informe um valor total válido. Exemplo: 350,00.");
  if(p.paid_installments>p.installments_count)return fieldError("paid_installments","As parcelas pagas não podem exceder o total.");
 }
 if(k==="bill"){p={name:v.name.trim(),amount:num("amount"),due_date:v.due_date,category:v.category||"Outros",paid:v.paid==="true",notes:v.notes||null};if(!(p.amount>0))return msg("formMessage","Informe um valor válido maior que zero. Exemplo: 125,90.");}
 if(k==="goal"){p={name:v.name.trim(),target_amount:num("target_amount"),saved_amount:num("saved_amount"),target_date:v.target_date||null,notes:v.notes||null};if(!(p.target_amount>0)||!(p.saved_amount>=0))return fieldError("target_amount","Confira os valores da meta. Use valores como 250,00.");}
 if(k==="contribution"){
  let amount=num("amount");
  if(!amount||amount<=0)return fieldError("amount","Informe um valor maior que zero.");
  try{
   await FinanceOffline.update(user.id,db,"goals",edit.id,{saved_amount:Number(edit.saved_amount)+amount},!user.offlineOnly);
   close();rows=await FinanceOffline.getRows(user.id);render();refreshSyncStatus();
   
  }catch(error){msg("formMessage",error.message||"Não foi possível registrar a economia.");}
  return;
 }
 let btn=e.submitter;
 $("editorForm").setAttribute("aria-busy","true");
 if(btn){btn.disabled=true;btn.setAttribute("aria-busy","true")}
 try{
  const id=edit?.id||undefined;
  const record={...(edit||{}),...p,...(id?{id}: {})};
  await FinanceOffline.save(user.id,db,table,record,!edit,!user.offlineOnly);
  close();
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  
 }catch(error){
  console.error("Falha ao salvar localmente:",error);
  msg("formMessage",error.message||"Não foi possível salvar neste aparelho.");
 }finally{if(btn){btn.disabled=false;btn.removeAttribute("aria-busy")} $("editorForm").removeAttribute("aria-busy")}
}
init();
