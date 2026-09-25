import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/+esm';

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
const yen = v => `${Math.round(v).toLocaleString('ja-JP')}円`;
const hours = v => `${Number(v).toFixed(2)}h`;
const nowIso = () => new Date().toISOString();
const localDateTimeValue = v => { const d=new Date(v||Date.now()); const shifted=new Date(d.getTime()-d.getTimezoneOffset()*60000); return shifted.toISOString().slice(0,16); };
const configured = !SUPABASE_URL.includes('PASTE_') && !SUPABASE_ANON_KEY.includes('PASTE_');
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const rich = (central, low=central, high=central, certainty='confirmed') => ({central,low,high,certainty});

const DEFAULT_SETTINGS = {
  common: {
    sleepHours: rich(8.5), mealHours: rich(1), otherLivingHours: rich(1),
    monthlySaving: rich(40000), monthlyInvestment: rich(10000), deviceReserve: rich(10000), irregularReserve: rich(10000),
    netSalaryRate: rich(0.80,0.76,0.84,'assumption')
  },
  companyDefaults: {
    scheduledWorkHours: rich(8,7.5,8,'assumption'),
    monthlyOvertimeHours: rich(20,10,30,'assumption'),
    monthlyWorkDays: rich(20,19,21,'assumption'),
    boundBreakHours: rich(0.5,0,1,'assumption'),
    officePrepHours: rich(0.75,0.5,1,'assumption'),
    remotePrepHours: rich(0.25,0.1,0.5,'assumption'),
    remoteRate: rich(0,0,0.4,'assumption'),
    baseSalary: rich(250000,230000,280000,'assumption'),
    fixedOvertimePay: rich(0,0,30000,'assumption'),
    fixedOvertimeHours: rich(0,0,20,'assumption'),
    otherFixedAllowance: rich(0,0,10000,'assumption'),
    cashHousingAllowance: rich(0,0,30000,'assumption'),
    commutingSelfCost: rich(0,0,5000,'assumption'),
    bonus: rich(0,0,0,'assumption'),
    manualNetSalary: rich(0,0,0,'assumption'),
    commuteOneWayHours: rich(1,0.5,1.5,'assumption'),
    actualRent: rich(80000,60000,100000,'assumption'),
    employeeRent: rich(80000,30000,100000,'assumption')
  },
  displaySets: [
    {name:'基本', columns:['tfree','mfree','higherUnmet','higherUncertain','assumptionCount']},
    {name:'労働環境', columns:['tfree','scheduledWorkHours','monthlyOvertimeHours','commuteOneWayHours','remoteRate','higherUnmet']},
    {name:'給与', columns:['mfree','baseSalary','fixedOvertimePay','cashHousingAllowance','actualRent','assumptionCount']}
  ],
  activeDisplaySet: '基本',
  careerPlanOverview: ''
};

const DEFAULT_SCENARIOS = [
  {
    name:'実家暮らし', kind:'home', settings:{
      houseworkHours:rich(0.2), hygieneHours:rich(1), rent:rich(0), food:rich(0), utilities:rich(0), internet:rich(0),
      mobilePhone:rich(4000,3000,6000,'assumption'), dailyGoods:rich(0), medical:rich(3000,1000,6000,'assumption'),
      privateTransport:rich(3000,1000,7000,'assumption'), otherEssential:rich(3000,0,7000,'assumption'),
      houseContribution:rich(50000), remittance:rich(0)
    }
  },
  {
    name:'一人暮らし', kind:'alone', settings:{
      houseworkHours:rich(1), hygieneHours:rich(0.75), rent:rich(80000,60000,100000,'assumption'),
      food:rich(40000,30000,55000,'assumption'), utilities:rich(12000,8000,18000,'assumption'),
      internet:rich(5000,3500,6500,'assumption'), mobilePhone:rich(4000,3000,6000,'assumption'),
      dailyGoods:rich(7000,4000,10000,'assumption'), medical:rich(3000,1000,6000,'assumption'),
      privateTransport:rich(3000,1000,7000,'assumption'), otherEssential:rich(5000,2000,10000,'assumption'),
      houseContribution:rich(0), remittance:rich(30000,0,50000,'assumption')
    }
  }
];

const VAR_DEFS = {
  scheduledWorkHours:{label:'所定労働時間',unit:'h/日',group:'時間',margin:0.5,max:8},
  monthlyOvertimeHours:{label:'月平均残業',unit:'h/月',group:'時間',margin:10},
  monthlyWorkDays:{label:'月勤務日数',unit:'日/月',group:'時間',margin:1},
  boundBreakHours:{label:'拘束される休憩',unit:'h/日',group:'時間',margin:0.4},
  officePrepHours:{label:'出社時仕事準備',unit:'h/日',group:'時間',margin:0.25},
  remotePrepHours:{label:'在宅時仕事準備',unit:'h/日',group:'時間',margin:0.15},
  remoteRate:{label:'リモート率',unit:'%',group:'時間',margin:0.15,percent:true,min:0,max:1},
  commuteOneWayHours:{label:'片道通勤時間',unit:'h',group:'時間',margin:0.25,scenarioSpecific:true},
  baseSalary:{label:'基本給',unit:'円/月',group:'給与',margin:15000,money:true},
  fixedOvertimePay:{label:'固定残業代',unit:'円/月',group:'給与',margin:10000,money:true},
  fixedOvertimeHours:{label:'固定残業時間',unit:'h/月',group:'給与',margin:5},
  otherFixedAllowance:{label:'その他固定手当',unit:'円/月',group:'給与',margin:5000,money:true},
  cashHousingAllowance:{label:'現金住宅手当',unit:'円/月',group:'住宅',margin:5000,money:true},
  commutingSelfCost:{label:'通勤費自己負担',unit:'円/月',group:'生活費',margin:3000,money:true},
  actualRent:{label:'実効家賃',unit:'円/月',group:'住宅',margin:15000,money:true,scenarioSpecific:true},
  employeeRent:{label:'借上社宅・寮の本人負担',unit:'円/月',group:'住宅',margin:10000,money:true,scenarioSpecific:true},
  bonus:{label:'賞与',unit:'円/年',group:'給与',margin:50000,money:true,noCalc:true},
  manualNetSalary:{label:'手取り見込（直接入力）',unit:'円/月',group:'給与',margin:10000,money:true}
};

const SCENARIO_DEFS = {
  houseworkHours:{label:'家事時間',unit:'h/日',group:'時間'}, hygieneHours:{label:'衛生・入浴・身支度',unit:'h/日',group:'時間'},
  rent:{label:'家賃＋管理費',unit:'円/月',group:'住宅',money:true}, food:{label:'必須食費',unit:'円/月',group:'生活費',money:true},
  utilities:{label:'水道光熱費',unit:'円/月',group:'生活費',money:true}, internet:{label:'固定インターネット',unit:'円/月',group:'生活費',money:true},
  mobilePhone:{label:'スマホ通信費',unit:'円/月',group:'生活費',money:true}, dailyGoods:{label:'日用品',unit:'円/月',group:'生活費',money:true},
  medical:{label:'通常医療費',unit:'円/月',group:'生活費',money:true}, privateTransport:{label:'必須私用交通費',unit:'円/月',group:'生活費',money:true},
  otherEssential:{label:'その他最低生活費',unit:'円/月',group:'生活費',money:true}, houseContribution:{label:'実家へ入れる金額',unit:'円/月',group:'生活費',money:true},
  remittance:{label:'実家への仕送り',unit:'円/月',group:'生活費',money:true}
};

const COMMON_DEFS = {
  sleepHours:{label:'睡眠',unit:'h/日',group:'時間'}, mealHours:{label:'勤務外の食事',unit:'h/日',group:'時間'}, otherLivingHours:{label:'その他生活時間',unit:'h/日',group:'時間'},
  monthlySaving:{label:'現金貯蓄',unit:'円/月',group:'資産形成',money:true}, monthlyInvestment:{label:'投資',unit:'円/月',group:'資産形成',money:true},
  deviceReserve:{label:'PC・スマホ等積立',unit:'円/月',group:'資産形成',money:true}, irregularReserve:{label:'不定期支出積立',unit:'円/月',group:'資産形成',money:true},
  netSalaryRate:{label:'推定手取り率',unit:'%',group:'給与',percent:true}
};

const CERTAINTY_RANK = {confirmed:5,high:4,medium:3,low:2,assumption:1};
const CERTAINTY_LABEL = {confirmed:'確定',high:'高',medium:'中',low:'低',assumption:'仮定'};
const SOURCE_LABEL = {official:'公式',employee:'社員情報',review:'口コミ',self:'自分で設定',other:'その他',system:'システム仮定'};
const STATUS_LABEL = {met:'満たす',partial:'一部',unmet:'未達',unknown:'不明',uncertain:'不確実'};

const COMPANY_STATUS_LABEL = {active:'選考中',offer:'内定',rejected:'落選',withdrawn:'辞退'};
const PREP_STATUS_LABEL = {not_started:'未着手',draft:'準備中',ready:'準備済み'};
const QUESTION_STATUS_LABEL = {not_started:'未着手',draft:'下書き',ready:'準備済み'};
const PERFORMANCE_LABEL = {good:'回答できた',partial:'少し詰まった',difficult:'答えにくかった'};
const MILESTONE_STATUS_LABEL = {todo:'未着手',doing:'進行中',done:'完了',skipped:'見送り'};

const DEFAULT_INTERVIEW_QUESTIONS = [
  ['基本','自己紹介をしてください'],['基本','研究内容を説明してください'],['研究・実績','共著論文であなたが担当したことは何ですか'],
  ['研究・実績','データ分析コンペについて教えてください'],['研究・実績','専門書執筆について教えてください'],['研究・実績','学会チュートリアルについて教えてください'],
  ['自己分析','あなたの強みは何ですか'],['自己分析','第二の強みは何ですか'],['自己分析','弱みは何ですか'],['自己分析','失敗経験を教えてください'],['自己分析','困難を乗り越えた経験を教えてください'],
  ['協働','他者と協働した経験を教えてください'],['協働','意見が対立した経験を教えてください'],
  ['進路','なぜ修士課程に進んだのですか'],['進路','なぜ博士課程ではなく就職するのですか'],['進路','将来、博士課程に進む可能性はありますか'],
  ['志望','なぜこの職種を志望するのですか'],['志望','なぜ企業で働きたいのですか'],['志望','入社後にやりたいことは何ですか'],['志望','キャリアプランを教えてください'],
  ['技術・専門','プログラミング・AI・機械学習の経験を教えてください'],['技術・専門','テスト理論・心理測定を専門外の人に説明してください'],['技術・専門','あなたを採用するメリットは何ですか'],['技術・専門','他の学生と何が違いますか'],['技術・専門','研究経験を実務でどう活かせますか'],
  ['働き方','顧客対応についてどう考えていますか'],['働き方','就活の軸を教えてください'],['働き方','他社の選考状況を教えてください'],['働き方','当社が第一志望ですか'],['働き方','勤務地・転勤についてどう考えていますか'],['働き方','働き方で重視することは何ですか']
];
const DEFAULT_INTERVIEW_EPISODES = ['データ分析コンペ','共著論文','専門書執筆','学会チュートリアル','研究上の失敗・修正'];
const DEFAULT_REVERSE_QUESTIONS = [
  ['配属','新卒の配属はどのタイミングで、どのように決定されますか。'],
  ['業務','若手社員の業務を、分析・資料作成・社内調整・顧客対応などに分けると、どのような割合でしょうか。'],
  ['研究','学会発表や論文投稿を行っている社員はいらっしゃいますか。'],
  ['異動','異動時には本人希望がどの程度考慮されますか。'],
  ['専門職','管理職以外に、専門性を高めながら待遇を上げていくキャリアはありますか。']
];

const state = {
  user:null, settings:structuredClone(DEFAULT_SETTINGS), scenarios:[], companies:[], companyValues:[], conditions:[], conditionEvals:[], notes:[], attachments:[],
  interviewQuestions:[], interviewEpisodes:[], questionEpisodeLinks:[], interviewPreps:[], companyAnswerOverrides:[], reverseQuestions:[], interviewEvents:[], interviewEventQuestions:[], careerMilestones:[],
  page:'companies', companyId:null, companyTab:'overview', noteScope:'all', noteSearch:'', compareSort:{key:null,dir:1}, saveState:'saved',
  showRejected:false, interviewTab:'home', interviewMasterTab:'questions', interviewCompanyId:null, interviewEventId:null, conditionSubTab:'higher'
};

let bootPromise = null;

function mergeDeep(base, patch){
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  const out = {...base};
  if (!patch || typeof patch !== 'object') return out;
  for (const [k,v] of Object.entries(patch)) out[k] = (v && typeof v==='object' && !Array.isArray(v) && base?.[k] && typeof base[k]==='object' && !Array.isArray(base[k])) ? mergeDeep(base[k],v) : v;
  return out;
}
function richObj(v, fallback=0){
  if (v && typeof v==='object' && 'central' in v) return {central:num(v.central),low:num(v.low ?? v.central),high:num(v.high ?? v.central),certainty:v.certainty||'confirmed'};
  return rich(num(v ?? fallback));
}
function formatVal(key,v){
  const d = VAR_DEFS[key] || SCENARIO_DEFS[key] || COMMON_DEFS[key] || {};
  if (d.money) return yen(v);
  if (d.percent) return `${Math.round(num(v)*100)}%`;
  if (d.unit?.startsWith('h')) return `${num(v).toFixed(2)}h`;
  return `${Number.isInteger(num(v))?num(v):num(v).toFixed(2)}${d.unit?` ${d.unit}`:''}`;
}
function setSaveStatus(s){ state.saveState=s; const el=$('#saveStatus'); if(el){el.className=`save-status ${s}`;el.textContent=s==='saving'?'保存中…':s==='error'?'⚠ 保存失敗':'✓ 保存済み';} }
function toast(msg){
  let t=document.getElementById('toastBox');
  if(!t){t=document.createElement('div');t.id='toastBox';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._timer); toast._timer=setTimeout(()=>t.classList.remove('show'),3200);
}
function normalizeQuestionText(s){ return String(s||'').replace(/[\s\u3000]+/g,'').replace(/[。、,.!?！？「」『』・\-—―]/g,'').toLowerCase(); }
function findSimilarMasterQuestion(text){
  const norm=normalizeQuestionText(text); if(norm.length<2) return null;
  const pool=state.interviewQuestions.filter(x=>!x.is_hidden);
  let match=pool.find(q=>normalizeQuestionText(q.question)===norm);
  if(match) return match;
  match=pool.find(q=>{ const qn=normalizeQuestionText(q.question); if(qn.length<4||norm.length<4) return false; return qn.includes(norm)||norm.includes(qn); });
  return match||null;
}
async function db(promise){ setSaveStatus('saving'); const {data,error}=await promise; if(error){console.error(error);setSaveStatus('error');throw error;} setSaveStatus('saved'); return data; }

function autoRange(key,central,certainty){
  const d=VAR_DEFS[key]||{}; if(certainty==='confirmed') return [central,central];
  const scale={high:.5,medium:1,low:1.5,assumption:2}[certainty] ?? 1;
  const m=(d.margin ?? Math.max(Math.abs(central)*.1,1))*scale;
  let lo=central-m, hi=central+m;
  if(d.min!=null) lo=Math.max(d.min,lo); if(d.max!=null) hi=Math.min(d.max,hi); if(d.money||central>=0) lo=Math.max(0,lo);
  return [lo,hi];
}

function defaultFor(key){ return richObj(state.settings.companyDefaults?.[key] ?? DEFAULT_SETTINGS.companyDefaults[key]); }
function scenarioValue(scenario,key){ return richObj(scenario?.settings?.[key] ?? 0); }
function commonValue(key){ return richObj(state.settings.common?.[key] ?? DEFAULT_SETTINGS.common[key]); }

function evidenceFor(companyId,scenarioId,key){
  const all=state.companyValues.filter(x=>!x.deleted_at&&!x.disabled&&x.company_id===companyId&&x.variable_key===key);
  const scoped=all.filter(x=>x.scenario_id===scenarioId);
  const base=all.filter(x=>!x.scenario_id);
  const pool=scoped.length?scoped:base;
  const nonAssumption=pool.filter(x=>x.certainty!=='assumption');
  return nonAssumption.length?nonAssumption:pool;
}
function resolveCompanyVar(company,scenario,key){
  const ev=evidenceFor(company.id,scenario?.id,key);
  if(!ev.length){ const d=defaultFor(key); return {...d,isAssumption:true,sourceLabel:'システム仮定',sourceCount:0}; }
  const primary=ev.find(x=>x.is_primary) || [...ev].sort((a,b)=>(CERTAINTY_RANK[b.certainty]||0)-(CERTAINTY_RANK[a.certainty]||0)||new Date(b.updated_at)-new Date(a.updated_at))[0];
  let [pl,ph]=autoRange(key,num(primary.central),primary.certainty);
  const pLow=primary.low==null?pl:num(primary.low), pHigh=primary.high==null?ph:num(primary.high);
  const rangePool=ev.filter(x=>x.is_range); const rp=rangePool.length?rangePool:[primary];
  const lows=[], highs=[];
  for(const x of rp){ const [al,ah]=autoRange(key,num(x.central),x.certainty); lows.push(x.low==null?al:num(x.low)); highs.push(x.high==null?ah:num(x.high)); }
  return {central:num(primary.central),low:Math.min(...lows,pLow),high:Math.max(...highs,pHigh),certainty:primary.certainty,isAssumption:primary.certainty==='assumption',sourceLabel:primary.source_label||SOURCE_LABEL[primary.source_type]||'情報',sourceCount:ev.length,primaryId:primary.id};
}
function hasRealEvidence(company,scenario,key){ return evidenceFor(company.id,scenario?.id,key).length>0; }

function picked(r,mode,cost=true){ if(mode==='central')return r.central; return mode==='worst'?(cost?r.high:r.low):(cost?r.low:r.high); }
function calcT(company,scenario){
  const common={sleep:commonValue('sleepHours'),meal:commonValue('mealHours'),other:commonValue('otherLivingHours')};
  const sc={house:scenarioValue(scenario,'houseworkHours'),hyg:scenarioValue(scenario,'hygieneHours')};
  const keys=['scheduledWorkHours','monthlyOvertimeHours','monthlyWorkDays','boundBreakHours','officePrepHours','remotePrepHours','remoteRate','commuteOneWayHours'];
  const cv=Object.fromEntries(keys.map(k=>[k,resolveCompanyVar(company,scenario,k)]));
  const one=mode=>{
    const remote=picked(cv.remoteRate,mode,false);
    const prep=(1-remote)*picked(cv.officePrepHours,mode,true)+remote*picked(cv.remotePrepHours,mode,true);
    const workDays=Math.max(.1,picked(cv.monthlyWorkDays,mode,false));
    return 24 - picked(common.sleep,mode,true)-picked(common.meal,mode,true)-picked(common.other,mode,true)-picked(sc.house,mode,true)-picked(sc.hyg,mode,true)
      - picked(cv.scheduledWorkHours,mode,true) - picked(cv.monthlyOvertimeHours,mode,true)/workDays - picked(cv.boundBreakHours,mode,true)
      - 2*picked(cv.commuteOneWayHours,mode,true)*(1-remote) - prep;
  };
  const central=one('central'), worst=one('worst'), best=one('best');
  const baseNoWork=24-common.sleep.central-common.meal.central-common.other.central-sc.house.central-sc.hyg.central-cv.scheduledWorkHours.central-cv.monthlyOvertimeHours.central/Math.max(.1,cv.monthlyWorkDays.central)-cv.boundBreakHours.central;
  const office=baseNoWork-2*cv.commuteOneWayHours.central-cv.officePrepHours.central;
  const remote=baseNoWork-cv.remotePrepHours.central;
  const assumptionCount=Object.values(cv).filter(x=>x.isAssumption).length+[...Object.values(sc),...Object.values(common)].filter(x=>x.certainty==='assumption').length;
  return {central,low:Math.min(worst,best),high:Math.max(worst,best),office,remote,assumptionCount,vars:cv};
}
function resolveRent(company,scenario){
  const actual=resolveCompanyVar(company,scenario,'actualRent');
  if(hasRealEvidence(company,scenario,'actualRent')) return actual;
  const s=scenarioValue(scenario,'rent'); return {...s,isAssumption:s.certainty==='assumption',sourceLabel:'Scenario'};
}
function calcM(company,scenario){
  const keys=['baseSalary','fixedOvertimePay','otherFixedAllowance','cashHousingAllowance','commutingSelfCost','employeeRent','manualNetSalary'];
  const cv=Object.fromEntries(keys.map(k=>[k,resolveCompanyVar(company,scenario,k)]));
  const netRate=commonValue('netSalaryRate');
  const scKeys=['rent','food','utilities','internet','mobilePhone','dailyGoods','medical','privateTransport','otherEssential','houseContribution','remittance'];
  const sc=Object.fromEntries(scKeys.map(k=>[k,scenarioValue(scenario,k)]));
  const assetKeys=['monthlySaving','monthlyInvestment','deviceReserve','irregularReserve']; const assets=Object.fromEntries(assetKeys.map(k=>[k,commonValue(k)]));
  const rent=resolveRent(company,scenario); const housingType=company.settings?.housingType||'none';
  const one=mode=>{
    const gross=picked(cv.baseSalary,mode,false)+picked(cv.fixedOvertimePay,mode,false)+picked(cv.otherFixedAllowance,mode,false)+picked(cv.cashHousingAllowance,mode,false);
    const manual=cv.manualNetSalary;
    const hasManual=hasRealEvidence(company,scenario,'manualNetSalary') && manual.central>0;
    const net=hasManual ? picked(manual,mode,false) : gross*picked(netRate,mode,false);
    let housing=picked(rent,mode,true);
    if(housingType==='leased' && hasRealEvidence(company,scenario,'employeeRent')) housing=picked(cv.employeeRent,mode,true);
    const living=['food','utilities','internet','mobilePhone','dailyGoods','medical','privateTransport','otherEssential'].reduce((a,k)=>a+picked(sc[k],mode,true),0)+picked(cv.commutingSelfCost,mode,true);
    const family=picked(sc.houseContribution,mode,true)+picked(sc.remittance,mode,true);
    const future=assetKeys.reduce((a,k)=>a+picked(assets[k],mode,true),0);
    return {gross,net,housing,living,family,future,free:net-housing-living-family-future};
  };
  const c=one('central'),w=one('worst'),b=one('best');
  const assumptionCount=[...Object.values(cv),rent,netRate,...Object.values(sc),...Object.values(assets)].filter(x=>x.isAssumption||x.certainty==='assumption').length;
  return {central:c.free,low:Math.min(w.free,b.free),high:Math.max(w.free,b.free),breakdown:c,assumptionCount,vars:cv,rent};
}

function metric(company,scenario,key){
  const t=calcT(company,scenario),m=calcM(company,scenario);
  if(key==='tfree') return {central:t.central,low:t.low,high:t.high};
  if(key==='mfree') return {central:m.central,low:m.low,high:m.high};
  if(VAR_DEFS[key]) return resolveCompanyVar(company,scenario,key);
  return {central:0,low:0,high:0};
}
function compareOp(v,op,t){ return op==='>='?v>=t:op==='>'?v>t:op==='<='?v<=t:op==='<'?v<t:op==='='?v===t:op==='!='?v!==t:false; }
function evalNumericCondition(condition,company,scenario){
  const r=conditionNumericMetric(condition,company,scenario); if(!r)return'unknown'; const t=num(condition.threshold),op=condition.operator;
  if(['>=','>'].includes(op)){ if(compareOp(r.low,op,t))return'met'; if(!compareOp(r.high,op,t))return'unmet'; return'uncertain'; }
  if(['<=','<'].includes(op)){ if(compareOp(r.high,op,t))return'met'; if(!compareOp(r.low,op,t))return'unmet'; return'uncertain'; }
  return compareOp(r.central,op,t)?'met':'unmet';
}
function conditionEvalRecord(condition,company,scenario){
  const list=state.conditionEvals.filter(x=>!x.deleted_at&&x.company_id===company.id&&x.condition_id===condition.id);
  return list.find(x=>x.scenario_id===scenario?.id)||list.find(x=>!x.scenario_id)||null;
}
function manualEval(condition,company,scenario){
  return conditionEvalRecord(condition,company,scenario)?.status||'unknown';
}
function conditionNumericMetric(condition,company,scenario){
  if(condition.variable_key!=='__custom__') return metric(company,scenario,condition.variable_key);
  const ev=conditionEvalRecord(condition,company,scenario);
  if(!ev || ev.numeric_central==null) return null;
  const c=num(ev.numeric_central), lo=ev.numeric_low==null?c:num(ev.numeric_low), hi=ev.numeric_high==null?c:num(ev.numeric_high);
  return {central:c,low:Math.min(lo,hi),high:Math.max(lo,hi),certainty:ev.certainty||'medium',sourceLabel:ev.source_label||SOURCE_LABEL[ev.source_type]||'入力値'};
}
function conditionStatus(condition,company,scenario){
  if(condition.eval_type==='numeric'){
    const r=conditionNumericMetric(condition,company,scenario); if(!r)return'unknown';
    const t=num(condition.threshold),op=condition.operator;
    if(['>=','>'].includes(op)){ if(compareOp(r.low,op,t))return'met'; if(!compareOp(r.high,op,t))return'unmet'; return'uncertain'; }
    if(['<=','<'].includes(op)){ if(compareOp(r.high,op,t))return'met'; if(!compareOp(r.low,op,t))return'unmet'; return'uncertain'; }
    return compareOp(r.central,op,t)?'met':'unmet';
  }
  return condition.eval_type==='info'?'unknown':manualEval(condition,company,scenario);
}
function statusBadge(s){ const cls=s==='met'?'ok':s==='unmet'?'bad':s==='unknown'?'info':'warn'; return `<span class="badge ${cls}">${esc(STATUS_LABEL[s]||s)}</span>`; }
function certaintyBadge(c){ const cls=c==='confirmed'||c==='high'?'ok':c==='medium'?'info':c==='low'?'warn':'warn'; return `<span class="badge ${cls}">${esc(CERTAINTY_LABEL[c]||c)}</span>`; }

function scenarioForCompany(company){ return state.scenarios.find(s=>s.id===company.default_scenario_id&&!s.deleted_at)||state.scenarios.find(s=>!s.deleted_at)||null; }
function higherSummary(company,scenario){
  const list=state.conditions.filter(c=>!c.deleted_at&&c.category==='higher'); const counts={met:0,unmet:0,uncertain:0,unknown:0,partial:0};
  list.forEach(c=>{const s=conditionStatus(c,company,scenario);counts[s]=(counts[s]||0)+1;}); return counts;
}
function higherPreview(company,scenario){
  return state.conditions.filter(c=>!c.deleted_at&&c.category==='higher').sort((a,b)=>a.order_index-b.order_index).slice(0,3).map(c=>({c,status:conditionStatus(c,company,scenario)}));
}
function preferencePreview(company,scenario){
  return state.conditions.filter(c=>!c.deleted_at&&c.category==='preference').sort((a,b)=>a.order_index-b.order_index).slice(0,3).map(c=>({c,status:conditionStatus(c,company,scenario)}));
}

async function init(){
  if(!configured){render();return;}
  const {data:{session}}=await supabase.auth.getSession(); state.user=session?.user||null;
  supabase.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;if(state.user)boot();else render();});
  if(state.user) await boot(); else render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
}
async function boot(){
  if(bootPromise) return bootPromise;
  bootPromise=(async()=>{await loadAll();await ensureInitialData();await loadAll();render();})();
  try{return await bootPromise;}finally{bootPromise=null;}
}
async function loadAll(){
  const uid=state.user.id;
  const [settings,scenarios,companies,values,conditions,evals,notes,attachments,interviewQuestions,interviewEpisodes,questionEpisodeLinks,interviewPreps,companyAnswerOverrides,reverseQuestions,interviewEvents,interviewEventQuestions,careerMilestones]=await Promise.all([
    db(supabase.from('app_settings').select('*').eq('user_id',uid).maybeSingle()),
    db(supabase.from('scenarios').select('*').eq('user_id',uid).is('deleted_at',null).order('created_at')),
    db(supabase.from('companies').select('*').eq('user_id',uid).is('deleted_at',null).order('created_at')),
    db(supabase.from('company_values').select('*').eq('user_id',uid).is('deleted_at',null).order('created_at')),
    db(supabase.from('conditions').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index')),
    db(supabase.from('company_condition_evals').select('*').eq('user_id',uid).is('deleted_at',null)),
    db(supabase.from('notes').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index')),
    db(supabase.from('attachments').select('*').eq('user_id',uid).is('deleted_at',null)),
    db(supabase.from('interview_questions').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index')),
    db(supabase.from('interview_episodes').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index')),
    db(supabase.from('interview_question_episode_links').select('*').eq('user_id',uid)),
    db(supabase.from('company_interview_preps').select('*').eq('user_id',uid).is('deleted_at',null)),
    db(supabase.from('company_answer_overrides').select('*').eq('user_id',uid).is('deleted_at',null)),
    db(supabase.from('reverse_questions').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index')),
    db(supabase.from('interview_events').select('*').eq('user_id',uid).is('deleted_at',null).order('interviewed_at',{ascending:false})),
    db(supabase.from('interview_event_questions').select('*').eq('user_id',uid).is('deleted_at',null)),
    db(supabase.from('career_milestones').select('*').eq('user_id',uid).is('deleted_at',null).order('order_index'))
  ]);
  state.settings=mergeDeep(structuredClone(DEFAULT_SETTINGS),settings?.settings||{});
  state.scenarios=scenarios||[]; state.companies=companies||[]; state.companyValues=values||[]; state.conditions=conditions||[]; state.conditionEvals=evals||[]; state.notes=notes||[]; state.attachments=attachments||[];
  state.interviewQuestions=interviewQuestions||[]; state.interviewEpisodes=interviewEpisodes||[]; state.questionEpisodeLinks=questionEpisodeLinks||[]; state.interviewPreps=interviewPreps||[]; state.companyAnswerOverrides=companyAnswerOverrides||[]; state.reverseQuestions=reverseQuestions||[]; state.interviewEvents=interviewEvents||[]; state.interviewEventQuestions=interviewEventQuestions||[]; state.careerMilestones=careerMilestones||[];
}
async function ensureInitialData(){
  const uid=state.user.id;
  const {data:s}=await supabase.from('app_settings').select('*').eq('user_id',uid).maybeSingle();
  if(!s) await db(supabase.from('app_settings').insert({user_id:uid,settings:DEFAULT_SETTINGS}));
  const {data:sc}=await supabase.from('scenarios').select('id').eq('user_id',uid).is('deleted_at',null);
  if(!sc?.length) await db(supabase.from('scenarios').insert(DEFAULT_SCENARIOS.map(x=>({...x,user_id:uid}))));
  const {data:co}=await supabase.from('conditions').select('id').eq('user_id',uid).is('deleted_at',null);
  if(!co?.length) await db(supabase.from('conditions').insert({user_id:uid,name:'純自由時間 2時間以上',category:'higher',eval_type:'numeric',variable_key:'tfree',operator:'>=',threshold:2,unit:'h/日',order_index:0}));
  const {data:iq}=await supabase.from('interview_questions').select('category,question').eq('user_id',uid).is('deleted_at',null);
  const existingQ=new Set((iq||[]).map(x=>`${x.category}\u0000${x.question}`));
  const missingQ=DEFAULT_INTERVIEW_QUESTIONS.filter(([category,question])=>!existingQ.has(`${category}\u0000${question}`));
  if(missingQ.length){const base=(iq||[]).length;await db(supabase.from('interview_questions').insert(missingQ.map(([category,question],i)=>({user_id:uid,category,question,prep_status:'not_started',order_index:base+i}))));}
  const {data:ie}=await supabase.from('interview_episodes').select('title').eq('user_id',uid).is('deleted_at',null);
  const existingE=new Set((ie||[]).map(x=>x.title)); const missingE=DEFAULT_INTERVIEW_EPISODES.filter(title=>!existingE.has(title));
  if(missingE.length){const base=(ie||[]).length;await db(supabase.from('interview_episodes').insert(missingE.map((title,i)=>({user_id:uid,title,order_index:base+i}))));}
  const {data:rq}=await supabase.from('reverse_questions').select('category,text').eq('user_id',uid).is('deleted_at',null).is('company_id',null);
  const existingR=new Set((rq||[]).map(x=>`${x.category}\u0000${x.text}`)); const missingR=DEFAULT_REVERSE_QUESTIONS.filter(([category,text])=>!existingR.has(`${category}\u0000${text}`));
  if(missingR.length){const base=(rq||[]).length;await db(supabase.from('reverse_questions').insert(missingR.map(([category,text],i)=>({user_id:uid,company_id:null,category,text,selected_for_next:false,order_index:base+i}))));}
}

function shell(content,title){
  const nav=(p,l)=>`<button class="nav-btn ${state.page===p?'active':''}" data-nav="${p}">${l}</button>`;
  const bnav=(p,l)=>`<button class="${state.page===p?'active':''}" data-nav="${p}">${l}</button>`;
  return `<div class="app-shell"><aside class="sidebar"><div class="brand">就職条件ノート</div>${nav('companies','企業')}${nav('compare','比較')}${nav('interview','面接')}${nav('notes','メモ')}${nav('settings','設定')}</aside><main class="main"><div class="topbar"><div class="page-title">${esc(title)}</div><div id="saveStatus" class="save-status ${state.saveState}">${state.saveState==='error'?'⚠ 保存失敗':state.saveState==='saving'?'保存中…':'✓ 保存済み'}</div></div>${content}</main><nav class="bottom-nav">${bnav('companies','企業')}${bnav('compare','比較')}${bnav('interview','面接')}${bnav('notes','メモ')}${bnav('settings','設定')}</nav></div>`;
}
function render(){
  const root=$('#app');
  if(!configured){root.innerHTML=`<div class="auth-wrap"><div class="auth-card"><h2>最初の設定が必要です</h2><div class="setup-card">Supabase の Project URL と Publishable/Anon key を <code>config.js</code> に貼り付けてください。</div><p class="muted">詳しい手順は同梱の README.md にあります。</p></div></div>`;return;}
  if(!state.user){root.innerHTML=authView(); bindAuth(); return;}
  if(state.companyId){ const c=state.companies.find(x=>x.id===state.companyId); if(c){root.innerHTML=shell(companyDetail(c),c.name);return;} state.companyId=null; }
  if(state.page==='compare') root.innerHTML=shell(comparePage(),'企業比較');
  else if(state.page==='interview') root.innerHTML=shell(interviewPage(),'面接準備');
  else if(state.page==='notes') root.innerHTML=shell(notesPage(),'メモ');
  else if(state.page==='settings') root.innerHTML=shell(settingsPage(),'設定');
  else root.innerHTML=shell(companiesPage(),'企業一覧');
}
function authView(){return `<div class="auth-wrap"><div class="auth-card"><h2>就職条件ノート</h2><p class="muted">個人用ログイン</p><form id="authForm"><div class="form-field"><label>メールアドレス</label><input class="input" name="email" type="email" required></div><div class="form-field" style="margin-top:10px"><label>パスワード</label><input class="input" name="password" type="password" minlength="6" required></div><div class="row" style="margin-top:14px"><button class="btn primary" name="mode" value="login">ログイン</button><button class="btn" name="mode" value="signup">新規登録</button></div><div id="authMsg" class="small muted" style="margin-top:10px"></div></form></div></div>`;}
function bindAuth(){ $('#authForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const mode=e.submitter?.value||'login';const email=fd.get('email'),password=fd.get('password');const msg=$('#authMsg');msg.textContent='処理中…';const r=mode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});msg.textContent=r.error?r.error.message:(mode==='signup'?'登録しました。確認メールが届く設定ならメール確認後にログインしてください。':'ログインしました。');}); }

function visibleCompanies(){ return state.companies.filter(c=>state.showRejected || (c.selection_status||'active')!=='rejected'); }
function companyStatusBadge(c){ const st=c.selection_status||'active'; const cls=st==='offer'?'ok':st==='rejected'?'bad':st==='withdrawn'?'warn':'info'; return `<span class="badge ${cls}">${esc(COMPANY_STATUS_LABEL[st]||st)}</span>`; }
function companiesPage(){
  const companies=visibleCompanies();
  const cards=companies.map(c=>{
    const s=scenarioForCompany(c),t=calcT(c,s),m=calcM(c,s),hs=higherSummary(c,s),highers=higherPreview(c,s),prefs=preferencePreview(c,s);
    return `<div class="card clickable company-card" data-company="${c.id}"><div class="company-head"><div><div class="company-name">${esc(c.name)}</div><div class="small muted">${esc(s?.name||'Scenario未設定')}</div></div><div class="row">${companyStatusBadge(c)}<span class="badge info">仮定 ${Math.max(t.assumptionCount,m.assumptionCount)}</span></div></div><div class="metric-row"><div class="mini-metric"><div class="tiny muted">T_free</div><div class="value mono">${hours(t.central)}</div><div class="tiny muted">${hours(t.low)}〜${hours(t.high)}</div></div><div class="mini-metric"><div class="tiny muted">M_free</div><div class="value mono">${yen(m.central)}</div><div class="tiny muted">${yen(m.low)}〜${yen(m.high)}</div></div></div><div class="small">Higher：未達 ${hs.unmet} / 不確実 ${hs.uncertain} / 不明 ${hs.unknown}</div>${highers.length?`<div class="pref-preview"><div class="tiny bold">Higher condition</div>${highers.map(x=>`<div class="small">${statusBadge(x.status)} ${esc(x.c.name)}</div>`).join('')}<button class="pill-link" data-action="open-higher" data-company-id="${c.id}">Higherをすべて見る →</button></div>`:''}${prefs.length?`<div class="pref-preview"><div class="tiny bold">Preference</div>${prefs.map(x=>`<div class="small">${statusBadge(x.status)} ${esc(x.c.name)}</div>`).join('')}<button class="pill-link" data-action="open-preference" data-company-id="${c.id}">Preferenceを見る →</button></div>`:''}</div>`;
  }).join('');
  const rejected=state.companies.filter(c=>(c.selection_status||'active')==='rejected').length;
  return `<div class="toolbar"><div class="muted">会社名だけ登録しても仮定値で計算を開始します。</div><div class="row">${rejected?`<button class="btn" data-action="toggle-rejected">${state.showRejected?'落選を隠す':`落選を表示 (${rejected})`}</button>`:''}<button class="btn primary" data-action="add-company">＋企業追加</button></div></div><div class="grid three">${cards||'<div class="card empty">表示対象の企業がありません。</div>'}</div>`;
}
function companyTabs(){return `<div class="tabs">${[['overview','概要'],['calc','計算'],['conditions','条件'],['info','情報']].map(([k,l])=>`<button class="tab ${state.companyTab===k?'active':''}" data-company-tab="${k}">${l}</button>`).join('')}</div>`;}
function scenarioSelect(company){return `<select class="select" data-action="company-scenario" data-company-id="${company.id}">${state.scenarios.map(s=>`<option value="${s.id}" ${s.id===company.default_scenario_id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`;}
function companyDetail(company){ const s=scenarioForCompany(company); let body=state.companyTab==='calc'?calcPage(company,s):state.companyTab==='conditions'?conditionsPage(company,s):state.companyTab==='info'?companyInfoPage(company):overviewPage(company,s); return `<div class="toolbar"><button class="btn" data-action="back-companies">← 企業一覧</button><div style="min-width:190px">${scenarioSelect(company)}</div></div>${companyTabs()}${body}`; }
function overviewPage(c,s){
  const t=calcT(c,s),m=calcM(c,s),hs=higherSummary(c,s),highers=higherPreview(c,s),prefs=preferencePreview(c,s);
  return `<div class="grid two"><div class="card"><div class="tiny muted">純自由時間 T_free</div><div class="metric mono">${hours(t.central)}</div><div class="metric-sub">想定 ${hours(t.low)}〜${hours(t.high)}</div></div><div class="card"><div class="tiny muted">純自由消費 M_free</div><div class="metric mono">${yen(m.central)}</div><div class="metric-sub">想定 ${yen(m.low)}〜${yen(m.high)}</div></div></div><div class="section-title">Higher condition</div><div class="card"><div class="status-grid"><div class="status-box"><b>${hs.met}</b><span class="tiny">満たす</span></div><div class="status-box"><b>${hs.uncertain}</b><span class="tiny">不確実</span></div><div class="status-box"><b>${hs.unmet}</b><span class="tiny">未達</span></div><div class="status-box"><b>${hs.unknown}</b><span class="tiny">不明</span></div></div>${highers.length?`<div class="condition-preview-list">${highers.map(x=>`<div class="condition-preview-row">${statusBadge(x.status)}<span>${esc(x.c.name)}</span></div>`).join('')}</div>`:''}<div class="row" style="margin-top:12px"><button class="pill-link" data-action="open-higher" data-company-id="${c.id}">Higherをすべて見る →</button></div></div>${prefs.length?`<div class="section-title">Preference</div><div class="card"><div class="condition-preview-list">${prefs.map(x=>`<div class="condition-preview-row">${statusBadge(x.status)}<span>${esc(x.c.name)}</span></div>`).join('')}</div><button class="pill-link" style="margin-top:10px" data-action="open-preference" data-company-id="${c.id}">Preferenceをすべて見る →</button></div>`:''}<div class="row" style="margin-top:14px"><button class="btn" data-action="goto-tab" data-tab="calc">計算を見る</button><button class="btn" data-action="goto-tab" data-tab="conditions">条件を見る</button><button class="btn" data-action="goto-tab" data-tab="info">情報を見る</button></div><div class="section-title">企業設定</div><div class="card"><div class="kv"><span>選考状況</span><select class="select" data-action="company-status-quick" data-company-id="${c.id}" style="width:auto">${Object.entries(COMPANY_STATUS_LABEL).map(([k,l])=>`<option value="${k}" ${(c.selection_status||'active')===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="kv"><span>業界</span><b>${esc(c.industry||'未設定')}</b></div><div class="kv"><span>住宅制度</span><b>${esc(({none:'なし',cash:'現金住宅手当',leased:'借上社宅・寮',other:'その他'})[c.settings?.housingType||'none'])}</b></div><div class="row" style="margin-top:12px"><button class="btn" data-action="edit-company" data-company-id="${c.id}">企業情報を編集</button><button class="btn danger" data-action="trash-company" data-company-id="${c.id}">ゴミ箱へ</button></div></div>`;
}

function mainVarRows(c,s){ const keys=['scheduledWorkHours','monthlyOvertimeHours','remoteRate','commuteOneWayHours','baseSalary','fixedOvertimePay','actualRent','cashHousingAllowance']; return keys.map(k=>{let r;if(k==='actualRent')r=resolveRent(c,s);else r=resolveCompanyVar(c,s,k);return `<div class="detail-row" data-action="open-variable" data-key="${k}"><div><b>${esc(VAR_DEFS[k].label)}</b></div><div class="value-main mono">${formatVal(k,r.central)}</div><div class="source-state">${r.isAssumption?certaintyBadge('assumption'):certaintyBadge(r.certainty||'medium')} ${esc(r.sourceLabel||'')}</div></div>`;}).join(''); }
function calcPage(c,s){
  const t=calcT(c,s),m=calcM(c,s); const tStatus=t.low>=2?'met':t.high<2?'unmet':'uncertain';
  return `<div class="grid two"><div class="card"><div class="tiny muted">純自由時間 T_free</div><div class="metric">${hours(t.central)}</div><div class="metric-sub">想定範囲 ${hours(t.low)}〜${hours(t.high)}</div><hr><div class="kv"><span>出社日</span><b>${hours(t.office)}</b></div><div class="kv"><span>在宅日</span><b>${hours(t.remote)}</b></div><div class="kv"><span>Higher ≥ 2h</span>${statusBadge(tStatus)}</div></div><div class="card"><div class="tiny muted">純自由消費 M_free</div><div class="metric">${yen(m.central)}</div><div class="metric-sub">想定範囲 ${yen(m.low)}〜${yen(m.high)}</div><hr><div class="kv"><span>固定額面給与</span><b>${yen(m.breakdown.gross)}</b></div><div class="kv"><span>推定手取り</span><b>${yen(m.breakdown.net)}</b></div><div class="kv"><span>住居費</span><b>${yen(m.breakdown.housing)}</b></div><div class="kv"><span>必須生活費</span><b>${yen(m.breakdown.living)}</b></div><div class="kv"><span>家族関連</span><b>${yen(m.breakdown.family)}</b></div><div class="kv"><span>貯蓄・投資等</span><b>${yen(m.breakdown.future)}</b></div></div></div><div class="section-title">主要変数</div><div class="card detail-list">${mainVarRows(c,s)}</div><div class="row" style="margin-top:12px"><button class="btn primary" data-action="detailed-calc">詳細計算を見る</button><button class="btn" data-action="salary-split">月給から基本給・固定残業代を計算</button></div>`;
}

function detailedCalcModal(c,s){
  const groups={時間:[],給与:[],住宅:[],生活費:[],資産形成:[]};
  Object.entries(VAR_DEFS).filter(([,d])=>!d.noCalc).forEach(([k,d])=>{const r=k==='actualRent'?resolveRent(c,s):resolveCompanyVar(c,s,k);groups[d.group]?.push(`<div class="detail-row" data-action="open-variable" data-key="${k}"><div><b>${esc(d.label)}</b></div><div>${formatVal(k,r.central)}<div class="tiny muted">${formatVal(k,r.low)}〜${formatVal(k,r.high)}</div></div><div class="source-state">${r.isAssumption?certaintyBadge('assumption'):certaintyBadge(r.certainty||'medium')} ${esc(r.sourceLabel||'')}</div></div>`);});
  Object.entries(SCENARIO_DEFS).forEach(([k,d])=>{const r=scenarioValue(s,k);groups[d.group]?.push(`<div class="detail-row"><div><b>${esc(d.label)}</b><div class="tiny muted">Scenario</div></div><div>${formatVal(k,r.central)}<div class="tiny muted">${formatVal(k,r.low)}〜${formatVal(k,r.high)}</div></div><button class="btn" data-action="edit-scenario" data-scenario-id="${s.id}">編集</button></div>`);});
  Object.entries(COMMON_DEFS).forEach(([k,d])=>{const r=commonValue(k);groups[d.group]?.push(`<div class="detail-row"><div><b>${esc(d.label)}</b><div class="tiny muted">共通設定</div></div><div>${formatVal(k,r.central)}<div class="tiny muted">${formatVal(k,r.low)}〜${formatVal(k,r.high)}</div></div><button class="btn" data-action="edit-common">編集</button></div>`);});
  return Object.entries(groups).filter(([,a])=>a.length).map(([g,a])=>`<details class="accordion" open><summary>${g}</summary><div class="accordion-body">${a.join('')}</div></details>`).join('');
}

function conditionsPage(c,s){
  const renderCat=cat=>{
    const list=state.conditions.filter(x=>!x.deleted_at&&x.category===cat).sort((a,b)=>a.order_index-b.order_index);
    if(!list.length)return '<div class="card empty">項目がありません。</div>';
    return list.map(cond=>{
      const st=conditionStatus(cond,c,s),ev=conditionEvalRecord(cond,c,s); let info='';
      if(cond.eval_type==='numeric'){
        const r=conditionNumericMetric(cond,c,s);
        if(cond.variable_key==='__custom__'){
          if(r){
            info=`<div class="small muted">現在 ${formatConditionNumber(cond,r.central)}${r.low!==r.central||r.high!==r.central?` / 範囲 ${formatConditionNumber(cond,r.low)}〜${formatConditionNumber(cond,r.high)}`:''} / 条件 ${esc(cond.operator)} ${esc(cond.threshold)} ${esc(cond.unit||'')}</div><div class="tiny muted">${certaintyBadge(ev?.certainty||'medium')} ${esc(ev?.source_label||SOURCE_LABEL[ev?.source_type]||'入力値')}</div>`;
          }else info=`<div class="small muted">企業ごとの数値が未入力です。条件 ${esc(cond.operator)} ${esc(cond.threshold)} ${esc(cond.unit||'')}</div>`;
        }else{
          info=r?`<div class="small muted">現在 ${formatVal(cond.variable_key,r.central)} / 範囲 ${formatVal(cond.variable_key,r.low)}〜${formatVal(cond.variable_key,r.high)} / 条件 ${esc(cond.operator)} ${esc(cond.threshold)} ${esc(cond.unit||'')}</div>`:'<div class="small muted">値がありません。</div>';
        }
      }else if(cond.eval_type==='manual'){
        info=`<select class="select" data-action="manual-condition" data-condition-id="${cond.id}" style="max-width:170px"><option value="unknown" ${st==='unknown'?'selected':''}>不明</option><option value="met" ${st==='met'?'selected':''}>満たす</option><option value="partial" ${st==='partial'?'selected':''}>一部満たす</option><option value="unmet" ${st==='unmet'?'selected':''}>満たさない</option></select>`;
      }
      const memo=ev?.note?`<div class="condition-memo">${esc(ev.note)}</div>`:'';
      const actions=[];
      if(cond.eval_type==='numeric'&&cond.variable_key==='__custom__') actions.push(`<button class="btn" data-action="edit-condition-value" data-condition-id="${cond.id}">${ev?.numeric_central!=null?'数値を編集':'数値を入力'}</button>`);
      if(cond.eval_type==='numeric'&&cond.variable_key==='__custom__'&&ev?.numeric_central!=null) actions.push(`<button class="btn danger" data-action="delete-condition-value" data-condition-id="${cond.id}">数値を削除</button>`);
      actions.push(`<button class="btn" data-action="edit-condition-memo" data-condition-id="${cond.id}">${ev?.note?'メモを編集':'メモを追加'}</button>`);
      return `<div class="card" style="margin-bottom:9px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div style="flex:1"><b>${esc(cond.name)}</b>${info}${memo}</div>${cond.eval_type==='numeric'?statusBadge(st):''}</div><div class="row" style="margin-top:10px">${actions.join('')}</div></div>`;
    }).join('');
  };
  return `<div class="tabs">${[['higher','Higher condition'],['preference','Preference'],['information','Information']].map(([k,l])=>`<button class="tab ${state.conditionSubTab===k||(!state.conditionSubTab&&k==='higher')?'active':''}" data-action="condition-subtab" data-subtab="${k}">${l}</button>`).join('')}</div><div id="conditionList">${renderCat(state.conditionSubTab||'higher')}</div><div class="row" style="margin-top:12px"><button class="btn" data-action="manage-conditions">条件そのものを管理</button></div>`;
}
function formatConditionNumber(cond,v){ return `${Number.isInteger(num(v))?num(v):num(v).toFixed(2)}${cond.unit?` ${esc(cond.unit)}`:''}`; }
function conditionValueForm(cond,c,s,ev={}){
  return `<form id="conditionValueForm" data-condition-id="${cond.id}"><div class="setup-card">「${esc(cond.name)}」に使う企業固有の数値です。入力した値は情報として保存され、条件判定にも利用されます。</div><div class="form-grid"><div><label>値 ${cond.unit?`(${esc(cond.unit)})`:''}</label><input class="input" type="number" step="any" name="central" value="${ev.numeric_central??''}" required></div><div><label>確証度</label><select class="select" name="certainty"><option value="confirmed" ${ev.certainty==='confirmed'?'selected':''}>確定</option><option value="high" ${ev.certainty==='high'?'selected':''}>高</option><option value="medium" ${!ev.certainty||ev.certainty==='medium'?'selected':''}>中</option><option value="low" ${ev.certainty==='low'?'selected':''}>低</option></select></div><div><label>下限（任意）</label><input class="input" type="number" step="any" name="low" value="${ev.numeric_low??''}"></div><div><label>上限（任意）</label><input class="input" type="number" step="any" name="high" value="${ev.numeric_high??''}"></div><div><label>情報源</label><select class="select" name="source_type"><option value="official" ${ev.source_type==='official'?'selected':''}>公式</option><option value="employee" ${ev.source_type==='employee'?'selected':''}>社員</option><option value="review" ${ev.source_type==='review'?'selected':''}>口コミ</option><option value="self" ${ev.source_type==='self'?'selected':''}>自分で設定</option><option value="other" ${!ev.source_type||ev.source_type==='other'?'selected':''}>その他</option></select></div><div><label>情報源名</label><input class="input" name="source_label" value="${esc(ev.source_label||'')}"></div><div class="full"><label>URL</label><input class="input" name="source_url" value="${esc(ev.source_url||'')}"></div><div class="full"><label>メモ</label><textarea class="textarea" name="note">${esc(ev.note||'')}</textarea></div></div><button class="btn primary" style="margin-top:14px">保存</button></form>`;
}
function conditionMemoForm(cond,ev={}){ return `<form id="conditionMemoForm" data-condition-id="${cond.id}"><div class="form-field"><label>${esc(cond.name)} のメモ</label><textarea class="textarea" name="note" placeholder="判断根拠や確認したい点など">${esc(ev.note||'')}</textarea></div><button class="btn primary" style="margin-top:14px">保存</button></form>`; }
function companyInfoPage(c){ const notes=state.notes.filter(n=>n.scope_type==='company'&&n.company_id===c.id); return `<div class="toolbar"><div class="muted">数値化しにくい情報をカードとして残します。</div><button class="btn primary" data-action="add-company-note">＋情報カード</button></div><div class="grid two">${notes.map(noteCard).join('')||'<div class="card empty">まだ情報カードがありません。</div>'}</div>`; }
function noteCard(n){ const at=state.attachments.filter(a=>a.note_id===n.id&&!a.deleted_at); return `<div class="card note-card"><div class="note-title">${esc(n.title)}</div><div class="note-body">${esc(n.body)}</div>${at.map(a=>`<button class="attachment" data-action="open-attachment" data-attachment-id="${a.id}"><span>📎 ${esc(a.file_name)}</span><span>開く</span></button>`).join('')}<div class="row"><button class="btn" data-action="edit-note" data-note-id="${n.id}">編集</button><button class="btn danger" data-action="trash-note" data-note-id="${n.id}">ゴミ箱へ</button></div></div>`; }


function interviewTabs(){return `<div class="tabs">${[['home','ホーム'],['master','マスター'],['companies','企業別'],['history','面接履歴'],['plan','就活計画']].map(([k,l])=>`<button class="tab ${state.interviewTab===k?'active':''}" data-action="interview-subtab" data-subtab="${k}">${l}</button>`).join('')}</div>`;}
function interviewPage(){
  let body=state.interviewTab==='master'?interviewMasterPage():state.interviewTab==='companies'?interviewCompaniesPage():state.interviewTab==='history'?interviewHistoryPage():state.interviewTab==='plan'?careerPlanPage():interviewHomePage();
  return `${interviewTabs()}${body}`;
}
function interviewHomePage(){
  const q=state.interviewQuestions.filter(x=>!x.is_hidden),ready=q.filter(x=>x.prep_status==='ready').length,draft=q.filter(x=>x.prep_status==='draft').length;
  const now=Date.now(); const upcoming=state.interviewPreps.filter(p=>p.scheduled_at&&new Date(p.scheduled_at).getTime()>=now).filter(p=>{const c=state.companies.find(x=>x.id===p.company_id);return c&&(c.selection_status||'active')!=='rejected';}).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at))[0];
  const nextCompany=upcoming?state.companies.find(c=>c.id===upcoming.company_id):null;
  const difficult={}; state.interviewEventQuestions.filter(x=>x.performance!=='good').forEach(x=>{const k=x.question_id||x.question_text; difficult[k]=(difficult[k]||{text:x.question_text||state.interviewQuestions.find(q=>q.id===x.question_id)?.question||'質問',count:0}); difficult[k].count++;});
  const improvement=Object.values(difficult).sort((a,b)=>b.count-a.count).slice(0,3);
  const done=state.careerMilestones.filter(x=>x.status==='done').length,total=state.careerMilestones.length;
  return `${upcoming&&nextCompany?`<div class="card interview-next"><div class="tiny muted">次の面接</div><div class="company-name">${esc(nextCompany.name)}</div><div class="small">${esc(upcoming.stage||'面接')} / ${new Date(upcoming.scheduled_at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div><button class="btn primary" style="margin-top:12px" data-action="open-interview-company" data-company-id="${nextCompany.id}" data-direct="1">直前確認</button></div>`:''}<div class="grid three"><div class="card"><div class="tiny muted">マスター</div><div class="metric">${ready} / ${q.length}</div><div class="small muted">準備済み / 全質問（下書き ${draft}）</div><button class="btn" style="margin-top:12px" data-action="interview-subtab" data-subtab="master">マスターを見る</button></div><div class="card"><div class="tiny muted">面接履歴</div><div class="metric">${state.interviewEvents.length}</div><div class="small muted">記録済み面接</div><button class="btn" style="margin-top:12px" data-action="add-interview-event">＋面接を記録</button></div><div class="card"><div class="tiny muted">就活計画</div><div class="metric">${done} / ${total}</div><div class="small muted">完了したマイルストーン</div><button class="btn" style="margin-top:12px" data-action="interview-subtab" data-subtab="plan">計画を見る</button></div></div>${improvement.length?`<div class="section-title">要改善質問</div><div class="card">${improvement.map(x=>`<div class="kv"><span>${esc(x.text)}</span><b>${x.count}回</b></div>`).join('')}</div>`:''}<div class="section-title">使い方</div><div class="card small muted">マスターを一度作り、企業ごとの差分だけ追加します。面接後は答えにくかった質問を記録し、必要なものだけマスターへ戻して改善します。</div>`;
}
function interviewMasterPage(){
  const tab=state.interviewMasterTab||'questions';
  return `<div class="toolbar"><div class="tabs" style="margin:0"><button class="tab ${tab==='questions'?'active':''}" data-action="master-subtab" data-subtab="questions">質問</button><button class="tab ${tab==='episodes'?'active':''}" data-action="master-subtab" data-subtab="episodes">エピソード庫</button></div><button class="btn primary" data-action="${tab==='questions'?'add-master-question':'add-episode'}">＋${tab==='questions'?'質問':'エピソード'}追加</button></div>${tab==='questions'?masterQuestionsList():episodeList()}`;
}
function questionStatusBadge(status){
  const label=QUESTION_STATUS_LABEL[status]||status;
  const cls=status==='ready'?'ready':status==='draft'?'draft':'not-started';
  return `<span class="question-status ${cls}">${esc(label)}</span>`;
}
function linkedEpisodesForQuestion(questionId){
  const ids=new Set(state.questionEpisodeLinks.filter(x=>x.question_id===questionId).map(x=>x.episode_id));
  return state.interviewEpisodes.filter(ep=>ids.has(ep.id));
}
function linkedQuestionsForEpisode(episodeId){
  const ids=new Set(state.questionEpisodeLinks.filter(x=>x.episode_id===episodeId).map(x=>x.question_id));
  return state.interviewQuestions.filter(q=>!q.is_hidden&&ids.has(q.id));
}
function questionAnswerPreview(q){
  const candidates=[['1分版',q.answer_60],['30秒版',q.answer_30],['3分版',q.answer_180],['要点',q.key_points]];
  const found=candidates.find(([,v])=>v&&String(v).trim());
  if(!found)return `<div class="answer-preview empty-answer">回答はまだ作成されていません。</div>`;
  return `<div class="answer-preview"><span class="answer-preview-label">${found[0]}</span><div class="answer-preview-text">${esc(found[1])}</div></div>`;
}
function episodeChipsForQuestion(q){
  const eps=linkedEpisodesForQuestion(q.id);
  if(!eps.length)return `<div class="episode-link-row muted tiny">使用エピソード：未設定</div>`;
  return `<div class="episode-link-row"><span class="tiny muted">使用エピソード</span><div class="episode-chip-wrap">${eps.map(ep=>`<button class="episode-chip" data-action="edit-episode" data-episode-id="${ep.id}" title="エピソードを開く">${esc(ep.title)}</button>`).join('')}</div></div>`;
}
function masterQuestionsList(){
  const preferred=['基本','研究・実績','自己分析','協働','進路','志望','技術・専門','働き方','逆質問','その他'];
  const present=[...new Set(state.interviewQuestions.filter(x=>!x.is_hidden).map(x=>x.category||'その他'))];
  const cats=[...preferred.filter(x=>present.includes(x)),...present.filter(x=>!preferred.includes(x))];
  return cats.map(cat=>{
    const list=state.interviewQuestions.filter(x=>!x.is_hidden&&(x.category||'その他')===cat).sort((a,b)=>a.order_index-b.order_index);
    return `<details class="accordion" open><summary>${esc(cat)} <span class="tiny muted">${list.filter(x=>x.prep_status==='ready').length}/${list.length} 準備済み</span></summary><div class="accordion-body"><div class="master-question-list" data-question-sort="${esc(cat)}">${list.map(q=>`<div class="master-question-row question-card" data-question-id="${q.id}"><span class="drag-handle">☰</span><div class="master-question-main"><div class="question-card-head"><b>${esc(q.question)}</b>${questionStatusBadge(q.prep_status)}</div>${questionAnswerPreview(q)}${episodeChipsForQuestion(q)}</div><button class="btn" data-action="edit-master-question" data-question-id="${q.id}">編集</button></div>`).join('')}</div></div></details>`;
  }).join('')||'<div class="card empty">質問がありません。</div>';
}
function setupQuestionSortables(){
  $$('[data-question-sort]').forEach(el=>new Sortable(el,{animation:150,handle:'.drag-handle',ghostClass:'drag-ghost',onEnd:async()=>{const ids=$$('[data-question-id]',el).map(x=>x.dataset.questionId);for(let i=0;i<ids.length;i++)await db(supabase.from('interview_questions').update({order_index:i}).eq('id',ids[i]));await loadAll();}}));
}
function masterQuestionForm(q={}){
  const linked=new Set(state.questionEpisodeLinks.filter(x=>x.question_id===q.id).map(x=>x.episode_id));
  return `<form id="masterQuestionForm" data-id="${q.id||''}"><div class="form-grid"><div class="full"><label>質問 *</label><input class="input" name="question" value="${esc(q.question||'')}" required></div><div><label>カテゴリー</label><input class="input" name="category" value="${esc(q.category||'その他')}"></div><div><label>状態</label><select class="select" name="prep_status">${Object.entries(QUESTION_STATUS_LABEL).map(([k,l])=>`<option value="${k}" ${(q.prep_status||'not_started')===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="full"><label>要点（キーワード）</label><textarea class="textarea" name="key_points">${esc(q.key_points||'')}</textarea></div><div class="full"><label>30秒版</label><textarea class="textarea" name="answer_30">${esc(q.answer_30||'')}</textarea></div><div class="full"><label>1分版</label><textarea class="textarea" name="answer_60">${esc(q.answer_60||'')}</textarea></div><div class="full"><label>3分版</label><textarea class="textarea" name="answer_180">${esc(q.answer_180||'')}</textarea></div><div class="full"><label>メモ</label><textarea class="textarea" name="memo">${esc(q.memo||'')}</textarea></div><div class="full"><label>使うエピソード</label><div class="checkbox-grid">${state.interviewEpisodes.map(ep=>`<label class="check-card"><input type="checkbox" name="episodes" value="${ep.id}" ${linked.has(ep.id)?'checked':''}> ${esc(ep.title)}</label>`).join('')||'<span class="small muted">エピソードがありません。</span>'}</div></div></div><div class="row" style="margin-top:14px"><button class="btn primary">保存</button>${q.id?'<button type="button" class="btn danger" data-action="trash-master-question" data-question-id="'+q.id+'">削除</button>':''}</div></form>`;
}
function episodeList(){
  return `<div class="grid two">${state.interviewEpisodes.map(ep=>{
    const qs=linkedQuestionsForEpisode(ep.id);
    return `<div class="card episode-card"><div class="company-name">${esc(ep.title)}</div><div class="small muted" style="margin-top:7px">${esc(ep.demonstrates||'')}</div><div class="episode-linked-questions"><div class="tiny muted">紐づく質問 ${qs.length}件</div>${qs.length?`<div class="episode-chip-wrap">${qs.slice(0,4).map(q=>`<button class="question-link-chip" data-action="edit-master-question" data-question-id="${q.id}" title="質問を開く">${esc(q.question)}</button>`).join('')}${qs.length>4?`<button class="question-link-chip more" data-action="show-episode-links" data-episode-id="${ep.id}">＋${qs.length-4}件</button>`:''}</div>`:'<div class="tiny muted">まだ質問に紐づいていません。</div>'}</div><div class="row" style="margin-top:12px"><button class="btn" data-action="edit-episode" data-episode-id="${ep.id}">編集</button><button class="btn danger" data-action="trash-episode" data-episode-id="${ep.id}">削除</button></div></div>`;
  }).join('')||'<div class="card empty">エピソードがありません。</div>'}</div>`;
}
function episodeLinksModal(ep){
  const qs=linkedQuestionsForEpisode(ep.id);
  return `<div class="small muted" style="margin-bottom:10px">「${esc(ep.title)}」を使用する質問</div>${qs.length?qs.map(q=>`<div class="card" style="margin-bottom:8px"><div class="row" style="justify-content:space-between"><div><b>${esc(q.question)}</b><div style="margin-top:6px">${questionStatusBadge(q.prep_status)}</div></div><button class="btn" data-action="edit-master-question" data-question-id="${q.id}">質問を開く</button></div></div>`).join(''):'<div class="card empty">紐づく質問はありません。</div>'}`;
}
function episodeForm(ep={}){return `<form id="episodeForm" data-id="${ep.id||''}"><div class="form-grid"><div class="full"><label>タイトル *</label><input class="input" name="title" value="${esc(ep.title||'')}" required></div>${[['situation','状況'],['task','課題'],['action','自分がしたこと'],['result','結果'],['demonstrates','この経験で示せること'],['memo','メモ']].map(([k,l])=>`<div class="full"><label>${l}</label><textarea class="textarea" name="${k}">${esc(ep[k]||'')}</textarea></div>`).join('')}</div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
function interviewCompaniesPage(){
  if(state.interviewCompanyId){const c=state.companies.find(x=>x.id===state.interviewCompanyId);if(c)return interviewCompanyDetail(c);state.interviewCompanyId=null;}
  const companies=state.companies.filter(c=>(c.selection_status||'active')!=='rejected');
  return `<div class="grid two">${companies.map(c=>{const p=state.interviewPreps.find(x=>x.company_id===c.id);return `<div class="card"><div class="company-head"><div><div class="company-name">${esc(c.name)}</div><div class="small muted">${esc(p?.role||'応募職種未設定')} / ${esc(p?.stage||'段階未設定')}</div></div><span class="badge info">${PREP_STATUS_LABEL[p?.prep_status||'not_started']}</span></div>${p?.scheduled_at?`<div class="small" style="margin-top:9px">次回：${new Date(p.scheduled_at).toLocaleString('ja-JP')}</div>`:''}<button class="btn primary" style="margin-top:12px" data-action="open-interview-company" data-company-id="${c.id}">${p?'対策を開く':'面接対策を作成'}</button></div>`;}).join('')||'<div class="card empty">対象企業がありません。</div>'}</div>`;
}
function prepForCompany(companyId){return state.interviewPreps.find(x=>x.company_id===companyId)||null;}
function answerOverride(companyId,questionId){return state.companyAnswerOverrides.find(x=>x.company_id===companyId&&x.question_id===questionId)||null;}
function answerForCompany(companyId,q){const o=answerOverride(companyId,q.id);return {answer_30:o?.answer_30??q.answer_30,answer_60:o?.answer_60??q.answer_60,answer_180:o?.answer_180??q.answer_180,memo:o?.memo??q.memo,isOverride:!!o};}
function interviewCompanyDetail(c){
  const p=prepForCompany(c.id),s=scenarioForCompany(c),candidates=state.conditions.filter(x=>x.category==='higher').map(cond=>({cond,status:conditionStatus(cond,c,s)})).filter(x=>x.status!=='met').slice(0,6);
  const topQs=state.interviewQuestions.filter(x=>!x.is_hidden).sort((a,b)=>a.order_index-b.order_index).slice(0,8);
  const companyRQ=state.reverseQuestions.filter(x=>x.company_id===c.id),templates=state.reverseQuestions.filter(x=>!x.company_id).slice(0,8);
  return `<div class="toolbar"><button class="btn" data-action="back-interview-companies">← 企業別一覧</button><div class="row"><button class="btn primary" data-action="direct-review" data-company-id="${c.id}">直前確認</button><button class="btn" data-action="edit-interview-prep" data-company-id="${c.id}">${p?'基本情報を編集':'対策を作成'}</button></div></div><div class="card"><div class="company-head"><div><div class="company-name">${esc(c.name)}</div><div class="small muted">${esc(p?.role||'応募職種未設定')} / ${esc(p?.stage||'段階未設定')}</div></div><span class="badge info">${PREP_STATUS_LABEL[p?.prep_status||'not_started']}</span></div>${p?.scheduled_at?`<div class="small" style="margin-top:8px">予定：${new Date(p.scheduled_at).toLocaleString('ja-JP')}</div>`:''}</div><div class="section-title">企業別差分</div><div class="card">${[['志望理由',p?.company_reason],['興味のある仕事',p?.job_interest],['自分の経験との接続',p?.experience_connection],['気になっている点',p?.concerns]].map(([l,v])=>`<div class="prep-block"><b>${l}</b><div class="note-body small">${esc(v||'未記入')}</div></div>`).join('')}</div><div class="section-title">マスター回答</div>${topQs.map(q=>{const a=answerForCompany(c.id,q),text=a.answer_60||a.answer_30||a.answer_180;return `<div class="master-question-row question-card" style="margin-bottom:9px"><div class="master-question-main"><div class="question-card-head"><b>${esc(q.question)}</b><span class="tiny muted">${a.isOverride?'企業専用回答':'マスター回答'}</span></div>${text?`<div class="answer-preview"><div class="answer-preview-text">${esc(text)}</div></div>`:'<div class="answer-preview empty-answer">回答はまだ作成されていません。</div>'}</div><button class="btn" data-action="edit-company-answer" data-company-id="${c.id}" data-question-id="${q.id}">${a.isOverride?'個別回答編集':'個別回答を作る'}</button></div>`;}).join('')}${candidates.length?`<div class="section-title">面接で確認候補</div><div class="card">${candidates.map(x=>`<div class="kv"><span>${statusBadge(x.status)} ${esc(x.cond.name)}</span><button class="btn" data-action="condition-to-reverse" data-company-id="${c.id}" data-condition-id="${x.cond.id}">逆質問に追加</button></div>`).join('')}</div>`:''}<div class="section-title">逆質問</div><div class="card"><div class="small bold">この企業で使う質問</div>${companyRQ.map(r=>`<div class="reverse-row"><label><input type="checkbox" data-action="toggle-reverse-selected" data-reverse-id="${r.id}" ${r.selected_for_next?'checked':''}> ${esc(r.text)}</label><button class="btn danger tiny" data-action="trash-reverse" data-reverse-id="${r.id}">削除</button></div>`).join('')||'<div class="small muted" style="margin-top:8px">まだありません。</div>'}<div class="row" style="margin-top:12px"><button class="btn primary" data-action="add-reverse-question" data-company-id="${c.id}">＋逆質問</button></div><hr><div class="small bold">共通テンプレート</div>${templates.map(r=>{const already=companyRQ.some(x=>x.text.trim()===r.text.trim());return `<div class="kv"><span>${esc(r.text)}</span>${already?'<span class="tiny muted">追加済み</span>':`<button class="btn" data-action="copy-reverse-template" data-template-id="${r.id}" data-company-id="${c.id}">追加</button>`}</div>`;}).join('')}</div>`;
}
function interviewPrepForm(c,p={}){const dt=p.scheduled_at?localDateTimeValue(p.scheduled_at):'';return `<form id="interviewPrepForm" data-company-id="${c.id}" data-id="${p.id||''}"><div class="form-grid"><div><label>応募職種</label><input class="input" name="role" value="${esc(p.role||'')}"></div><div><label>選考段階</label><input class="input" name="stage" value="${esc(p.stage||'')}" placeholder="一次面接、最終面接など"></div><div><label>次回面接日時</label><input class="input" type="datetime-local" name="scheduled_at" value="${dt}"></div><div><label>準備状態</label><select class="select" name="prep_status">${Object.entries(PREP_STATUS_LABEL).map(([k,l])=>`<option value="${k}" ${(p.prep_status||'not_started')===k?'selected':''}>${l}</option>`).join('')}</select></div><div><label>面接形式</label><input class="input" name="interview_format" value="${esc(p.interview_format||'')}" placeholder="オンライン / 対面"></div><div><label>面接担当</label><input class="input" name="interviewer_type" value="${esc(p.interviewer_type||'')}" placeholder="人事 / 現場 / 役員"></div>${[['company_reason','志望理由'],['job_interest','興味のある仕事'],['experience_connection','自分の経験との接続'],['concerns','気になっている点'],['memo','自由メモ']].map(([k,l])=>`<div class="full"><label>${l}</label><textarea class="textarea" name="${k}">${esc(p[k]||'')}</textarea></div>`).join('')}</div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
function companyAnswerForm(c,q,o={}){return `<form id="companyAnswerForm" data-company-id="${c.id}" data-question-id="${q.id}" data-id="${o.id||''}"><div class="setup-card">マスター回答は変更せず、${esc(c.name)}だけで使う差分回答を保存します。</div><div class="small bold" style="margin-bottom:8px">${esc(q.question)}</div><div class="form-grid"><div class="full"><label>30秒版</label><textarea class="textarea" name="answer_30">${esc(o.answer_30??q.answer_30??'')}</textarea></div><div class="full"><label>1分版</label><textarea class="textarea" name="answer_60">${esc(o.answer_60??q.answer_60??'')}</textarea></div><div class="full"><label>3分版</label><textarea class="textarea" name="answer_180">${esc(o.answer_180??q.answer_180??'')}</textarea></div><div class="full"><label>メモ</label><textarea class="textarea" name="memo">${esc(o.memo||'')}</textarea></div></div><div class="row" style="margin-top:14px"><button class="btn primary">保存</button>${o.id?'<button type="button" class="btn danger" data-action="delete-company-answer" data-answer-id="'+o.id+'">個別回答を削除</button>':''}</div></form>`;}
function reverseQuestionForm(companyId,r={}){return `<form id="reverseQuestionForm" data-company-id="${companyId||''}" data-id="${r.id||''}"><div class="form-field"><label>逆質問 *</label><textarea class="textarea" name="text" required>${esc(r.text||'')}</textarea></div><div class="form-field" style="margin-top:10px"><label>分類</label><input class="input" name="category" value="${esc(r.category||'その他')}"></div><div class="form-field" style="margin-top:10px"><label>メモ</label><textarea class="textarea" name="memo">${esc(r.memo||'')}</textarea></div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
function directReviewModal(c){
  const p=prepForCompany(c.id),ready=state.interviewQuestions.filter(x=>!x.is_hidden&&x.prep_status==='ready');const coreTerms=['自己紹介','研究内容','強み','博士課程ではなく就職','この職種','就活の軸'];const pickedQs=[];for(const term of coreTerms){const q=ready.find(x=>x.question.includes(term)&&!pickedQs.includes(x));if(q)pickedQs.push(q);}for(const q of ready){if(pickedQs.length>=6)break;if(!pickedQs.includes(q))pickedQs.push(q);}const qs=pickedQs.slice(0,6),rqs=state.reverseQuestions.filter(x=>x.company_id===c.id&&x.selected_for_next);
  return `<div class="direct-review"><div class="company-name">${esc(c.name)}</div><div class="small muted">${esc(p?.role||'')} ${p?.stage?' / '+esc(p.stage):''}</div>${p?.company_reason?`<div class="review-item"><div class="tiny muted">志望理由</div><div class="note-body">${esc(p.company_reason)}</div></div>`:''}${qs.map(q=>{const a=answerForCompany(c.id,q),text=a.answer_60||a.answer_30||a.answer_180||'未作成';return `<div class="review-item"><div class="tiny muted">${esc(q.question)}</div><div class="note-body">${esc(text)}</div></div>`;}).join('')}<div class="review-item"><div class="tiny muted">逆質問</div>${rqs.map((r,i)=>`<div>${i+1}. ${esc(r.text)}</div>`).join('')||'<div class="muted">選択されていません。</div>'}</div></div>`;
}
function interviewHistoryPage(){
  if(state.interviewEventId){const ev=state.interviewEvents.find(x=>x.id===state.interviewEventId);if(ev)return interviewEventDetail(ev);state.interviewEventId=null;}
  return `<div class="toolbar"><div class="muted">面接後5〜10分で、聞かれた質問と改善点だけ残します。</div><button class="btn primary" data-action="add-interview-event">＋面接を記録</button></div><div class="detail-list">${state.interviewEvents.map(ev=>{const c=state.companies.find(x=>x.id===ev.company_id),qs=state.interviewEventQuestions.filter(x=>x.event_id===ev.id),d=qs.filter(x=>x.performance==='difficult').length;return `<div class="card clickable" data-action="open-interview-event" data-event-id="${ev.id}"><div class="company-head"><div><b>${esc(c?.name||'企業不明')}</b><div class="small muted">${esc(ev.stage||'面接')} / ${new Date(ev.interviewed_at).toLocaleDateString('ja-JP')}</div></div>${d?`<span class="badge warn">要改善 ${d}</span>`:''}</div><div class="small muted" style="margin-top:8px">質問 ${qs.length}件</div></div>`;}).join('')||'<div class="card empty">まだ面接記録がありません。</div>'}</div>`;
}
function interviewEventForm(ev={}){const dt=localDateTimeValue(ev.interviewed_at||Date.now());return `<form id="interviewEventForm" data-id="${ev.id||''}"><div class="form-grid"><div><label>企業 *</label><select class="select" name="company_id" required><option value="">選択</option>${state.companies.map(c=>`<option value="${c.id}" ${ev.company_id===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div><label>選考段階</label><input class="input" name="stage" value="${esc(ev.stage||'')}"></div><div><label>日時</label><input class="input" type="datetime-local" name="interviewed_at" value="${dt}" required></div><div><label>形式</label><input class="input" name="interview_format" value="${esc(ev.interview_format||'')}"></div><div><label>面接担当</label><input class="input" name="interviewer_type" value="${esc(ev.interviewer_type||'')}"></div>${[['overall_good','良かったこと'],['overall_improve','改善したいこと'],['company_info','面接官から得た企業情報'],['next_check','次回確認すること'],['memo','全体メモ']].map(([k,l])=>`<div class="full"><label>${l}</label><textarea class="textarea" name="${k}">${esc(ev[k]||'')}</textarea></div>`).join('')}</div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
function interviewEventDetail(ev){const c=state.companies.find(x=>x.id===ev.company_id),qs=state.interviewEventQuestions.filter(x=>x.event_id===ev.id);return `<div class="toolbar"><button class="btn" data-action="back-interview-history">← 面接履歴</button><div class="row"><button class="btn" data-action="edit-interview-event" data-event-id="${ev.id}">全体メモを編集</button><button class="btn primary" data-action="add-event-question" data-event-id="${ev.id}">＋聞かれた質問</button></div></div><div class="card"><div class="company-name">${esc(c?.name||'')}</div><div class="small muted">${esc(ev.stage||'面接')} / ${new Date(ev.interviewed_at).toLocaleString('ja-JP')}</div>${ev.overall_good?`<div class="prep-block"><b>良かったこと</b><div class="note-body small">${esc(ev.overall_good)}</div></div>`:''}${ev.overall_improve?`<div class="prep-block"><b>改善したいこと</b><div class="note-body small">${esc(ev.overall_improve)}</div></div>`:''}</div><div class="section-title">聞かれた質問</div>${qs.map(q=>`<div class="card" style="margin-bottom:9px"><div class="company-head"><div><b>${esc(q.question_text)}</b><div class="tiny muted">${PERFORMANCE_LABEL[q.performance]||q.performance}</div></div><span class="badge ${q.performance==='good'?'ok':q.performance==='difficult'?'bad':'warn'}">${PERFORMANCE_LABEL[q.performance]||q.performance}</span></div>${q.problem?`<div class="condition-memo">${esc(q.problem)}</div>`:''}<div class="row" style="margin-top:10px"><button class="btn" data-action="edit-event-question" data-event-question-id="${q.id}">編集</button>${q.question_id?`<button class="btn" data-action="edit-master-question" data-question-id="${q.question_id}">マスター回答を修正</button>`:`<button class="btn" data-action="promote-event-question" data-event-question-id="${q.id}">マスターに追加</button>`}<button class="btn danger" data-action="trash-event-question" data-event-question-id="${q.id}">削除</button></div></div>`).join('')||'<div class="card empty">質問がまだありません。</div>'}`;}
function eventQuestionForm(eventId,q={}){return `<form id="eventQuestionForm" data-event-id="${eventId}" data-id="${q.id||''}"><div class="form-grid"><div class="full"><label>既存マスター質問（任意）</label><select class="select" name="question_id" data-action="event-master-select"><option value="">新しい質問</option>${state.interviewQuestions.map(x=>`<option value="${x.id}" ${q.question_id===x.id?'selected':''}>${esc(x.question)}</option>`).join('')}</select></div><div class="full"><label>実際に聞かれた質問（既存マスター質問を選んだ場合は空欄でも可）</label><input class="input" name="question_text" value="${esc(q.question_text||'')}" placeholder="未入力の場合は選択したマスター質問の文言を使用します"></div><div><label>回答感触</label><select class="select" name="performance">${Object.entries(PERFORMANCE_LABEL).map(([k,l])=>`<option value="${k}" ${(q.performance||'good')===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="full"><label>実際に答えた内容</label><textarea class="textarea" name="actual_answer">${esc(q.actual_answer||'')}</textarea></div><div class="full"><label>問題点</label><textarea class="textarea" name="problem">${esc(q.problem||'')}</textarea></div><div class="full"><label>次回回答</label><textarea class="textarea" name="next_answer">${esc(q.next_answer||'')}</textarea></div></div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
function careerPlanPage(){const done=state.careerMilestones.filter(x=>x.status==='done').length;return `<form id="careerPlanOverviewForm"><div class="form-field"><label>就活全体の方針・大きな予定</label><textarea class="textarea tall" name="overview" placeholder="例：9月に企業候補を整理、10〜12月に秋冬インターン、3〜4月に本選考…">${esc(state.settings.careerPlanOverview||'')}</textarea></div><button class="btn primary" style="margin-top:10px">全体メモを保存</button></form><div class="section-title">マイルストーン <span class="tiny muted">${done}/${state.careerMilestones.length} 完了</span></div><div class="toolbar"><div class="muted small">大まかな予定だけ管理します。細かなタスク管理にはしません。</div><button class="btn primary" data-action="add-milestone">＋予定</button></div><div class="sortable-list" id="milestoneSort">${state.careerMilestones.map(m=>`<div class="card milestone-row" data-milestone-id="${m.id}"><span class="drag-handle">☰</span><div style="flex:1"><b>${esc(m.title)}</b><div class="small muted">${m.target_date?esc(m.target_date)+' / ':''}${MILESTONE_STATUS_LABEL[m.status]||m.status}</div>${m.memo?`<div class="tiny muted" style="margin-top:5px">${esc(m.memo)}</div>`:''}</div><button class="btn" data-action="edit-milestone" data-milestone-id="${m.id}">編集</button><button class="btn danger" data-action="trash-milestone" data-milestone-id="${m.id}">削除</button></div>`).join('')||'<div class="card empty">まだ予定がありません。</div>'}</div>`;}
function setupMilestoneSortable(){const el=$('#milestoneSort');if(!el)return;new Sortable(el,{animation:150,handle:'.drag-handle',ghostClass:'drag-ghost',onEnd:async()=>{const ids=$$('[data-milestone-id]',el).map(x=>x.dataset.milestoneId);for(let i=0;i<ids.length;i++)await db(supabase.from('career_milestones').update({order_index:i}).eq('id',ids[i]));await loadAll();}});}
function milestoneForm(m={}){return `<form id="milestoneForm" data-id="${m.id||''}"><div class="form-grid"><div class="full"><label>予定・マイルストーン *</label><input class="input" name="title" value="${esc(m.title||'')}" required></div><div><label>目安日（任意）</label><input class="input" type="date" name="target_date" value="${esc(m.target_date||'')}"></div><div><label>状態</label><select class="select" name="status">${Object.entries(MILESTONE_STATUS_LABEL).map(([k,l])=>`<option value="${k}" ${(m.status||'todo')===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="full"><label>メモ</label><textarea class="textarea" name="memo">${esc(m.memo||'')}</textarea></div></div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}

const COMPARE_COLUMNS={
  tfree:{label:'T_free',value:(c,s)=>calcT(c,s).central,display:v=>hours(v)},mfree:{label:'M_free',value:(c,s)=>calcM(c,s).central,display:v=>yen(v)},
  higherUnmet:{label:'Higher未達',value:(c,s)=>higherSummary(c,s).unmet},higherUncertain:{label:'Higher不確実',value:(c,s)=>higherSummary(c,s).uncertain},assumptionCount:{label:'仮定値',value:(c,s)=>Math.max(calcT(c,s).assumptionCount,calcM(c,s).assumptionCount)},
  scheduledWorkHours:{label:'所定労働',value:(c,s)=>resolveCompanyVar(c,s,'scheduledWorkHours').central,display:v=>`${v.toFixed(1)}h`},monthlyOvertimeHours:{label:'残業/月',value:(c,s)=>resolveCompanyVar(c,s,'monthlyOvertimeHours').central,display:v=>`${v.toFixed(1)}h`},
  commuteOneWayHours:{label:'片道通勤',value:(c,s)=>resolveCompanyVar(c,s,'commuteOneWayHours').central,display:v=>`${Math.round(v*60)}分`},remoteRate:{label:'リモート',value:(c,s)=>resolveCompanyVar(c,s,'remoteRate').central,display:v=>`${Math.round(v*100)}%`},
  baseSalary:{label:'基本給',value:(c,s)=>resolveCompanyVar(c,s,'baseSalary').central,display:v=>yen(v)},fixedOvertimePay:{label:'固定残業代',value:(c,s)=>resolveCompanyVar(c,s,'fixedOvertimePay').central,display:v=>yen(v)},
  cashHousingAllowance:{label:'住宅手当',value:(c,s)=>resolveCompanyVar(c,s,'cashHousingAllowance').central,display:v=>yen(v)},actualRent:{label:'家賃',value:(c,s)=>resolveRent(c,s).central,display:v=>yen(v)}
};
function comparePage(){
  const sets=state.settings.displaySets||DEFAULT_SETTINGS.displaySets; const active=sets.find(x=>x.name===state.settings.activeDisplaySet)||sets[0]; const cols=active?.columns||[];
  let rows=visibleCompanies().map(c=>{const s=scenarioForCompany(c);return {c,s,vals:Object.fromEntries(cols.map(k=>[k,COMPARE_COLUMNS[k]?.value(c,s)]))};});
  const sk=state.compareSort.key;if(sk)rows.sort((a,b)=>((a.vals[sk]??0)-(b.vals[sk]??0))*state.compareSort.dir);
  const rejected=state.companies.filter(c=>(c.selection_status||'active')==='rejected').length;
  return `<div class="toolbar"><div class="row"><select class="select" data-action="display-set" style="width:auto">${sets.map(x=>`<option ${x.name===active?.name?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="btn" data-action="new-display-set">＋表示セット</button>${rejected?`<button class="btn" data-action="toggle-rejected">${state.showRejected?'落選を隠す':`落選を表示 (${rejected})`}</button>`:''}</div><div class="muted small">Scenarioは企業ごとに選択</div></div><div class="table-wrap"><table><thead><tr><th>企業</th><th>状況</th><th>Scenario</th>${cols.map(k=>`<th data-action="sort-compare" data-key="${k}">${esc(COMPARE_COLUMNS[k]?.label||k)}</th>`).join('')}</tr></thead><tbody>${rows.map(({c,s,vals})=>`<tr><td><button class="icon-btn bold" data-company="${c.id}">${esc(c.name)}</button></td><td>${companyStatusBadge(c)}</td><td><select class="select" data-action="compare-scenario" data-company-id="${c.id}" style="min-width:130px">${state.scenarios.map(x=>`<option value="${x.id}" ${x.id===s?.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></td>${cols.map(k=>`<td class="mono">${COMPARE_COLUMNS[k]?.display?COMPARE_COLUMNS[k].display(vals[k]):vals[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function notesPage(){
  const q=state.noteSearch.trim().toLowerCase();
  const hit=n=>!q||(n.title+' '+n.body+' '+(n.industry||'')).toLowerCase().includes(q);
  const scope=state.noteScope;
  const showCompany=scope==='all'||scope==='company', showIndustry=scope==='all'||scope==='industry', showOther=scope==='all'||scope==='other';
  const byCompany=showCompany?state.companies.map(c=>({c,list:state.notes.filter(n=>n.scope_type==='company'&&n.company_id===c.id&&hit(n))})).filter(x=>x.list.length):[];
  const industries=showIndustry?[...new Set(state.notes.filter(n=>n.scope_type==='industry').map(n=>n.industry||'業界未設定'))]:[];
  const byIndustry=showIndustry?industries.map(ind=>({ind,list:state.notes.filter(n=>n.scope_type==='industry'&&(n.industry||'業界未設定')===ind&&hit(n))})).filter(x=>x.list.length):[];
  const others=showOther?state.notes.filter(n=>n.scope_type==='other'&&hit(n)):[];
  const sections=[
    byCompany.map(({c,list})=>`<details class="accordion" open><summary>企業：${esc(c.name)} <span class="tiny muted">${list.length}件</span></summary><div class="accordion-body grid two">${list.map(noteCard).join('')}</div></details>`).join(''),
    byIndustry.map(({ind,list})=>`<details class="accordion" open><summary>業界：${esc(ind)} <span class="tiny muted">${list.length}件</span></summary><div class="accordion-body grid two">${list.map(noteCard).join('')}</div></details>`).join(''),
    others.length?`<details class="accordion" open><summary>その他 <span class="tiny muted">${others.length}件</span></summary><div class="accordion-body grid two">${others.map(noteCard).join('')}</div></details>`:''
  ].filter(Boolean).join('');
  return `<div class="toolbar"><div class="row" style="flex:1"><select class="select" data-action="note-scope" style="width:auto"><option value="all" ${scope==='all'?'selected':''}>すべて</option><option value="company" ${scope==='company'?'selected':''}>企業のみ</option><option value="industry" ${scope==='industry'?'selected':''}>業界のみ</option><option value="other" ${scope==='other'?'selected':''}>その他のみ</option></select><input class="input search" data-action="note-search" value="${esc(state.noteSearch)}" placeholder="全文検索"></div><button class="btn primary" data-action="add-global-note">＋メモ</button></div>${sections||'<div class="card empty">メモがありません。</div>'}`;
}

function settingsPage(){return `<div class="grid two"><div class="card"><h3>共通設定</h3><p class="muted small">睡眠、貯蓄、投資など全社共通。</p><button class="btn" data-action="edit-common">編集</button></div><div class="card"><h3>生活Scenario</h3><p class="muted small">実家暮らし、一人暮らし等。</p><button class="btn" data-action="manage-scenarios">管理</button></div><div class="card"><h3>デフォルト仮定値</h3><p class="muted small">情報がない企業だけに自動適用。</p><button class="btn" data-action="edit-defaults">編集</button></div><div class="card"><h3>条件管理</h3><p class="muted small">Higher / Preference / Information。</p><button class="btn" data-action="manage-conditions">管理</button></div><div class="card"><h3>データ</h3><p class="muted small">JSONバックアップ、復元、ゴミ箱。</p><div class="row"><button class="btn" data-action="export-json">JSON書き出し</button><button class="btn" data-action="import-json">JSON復元</button><button class="btn" data-action="trash">ゴミ箱</button></div></div><div class="card"><h3>アカウント</h3><div class="small muted">${esc(state.user?.email||'')}</div><button class="btn" style="margin-top:10px" data-action="signout">ログアウト</button></div></div>`;}

function openModal(title,body){
  closeModal(); const el=document.createElement('div');el.id='modalLayer';el.className='modal-backdrop';el.innerHTML=`<div class="modal"><div class="modal-head"><h3 style="margin:0">${esc(title)}</h3><button class="icon-btn" data-action="close-modal">✕</button></div>${body}</div>`;document.body.appendChild(el);
}
function closeModal(){ $('#modalLayer')?.remove(); }

function companyForm(c={}){return `<form id="companyForm" data-id="${c.id||''}"><div class="form-grid"><div class="form-field full"><label>企業名 *</label><input class="input" name="name" value="${esc(c.name||'')}" required></div><div><label>業界</label><input class="input" name="industry" value="${esc(c.industry||'')}"></div><div><label>選考状況</label><select class="select" name="selection_status">${Object.entries(COMPANY_STATUS_LABEL).map(([k,l])=>`<option value="${k}" ${(c.selection_status||'active')===k?'selected':''}>${l}</option>`).join('')}</select></div><div><label>住宅制度</label><select class="select" name="housingType"><option value="none">なし</option><option value="cash" ${c.settings?.housingType==='cash'?'selected':''}>現金住宅手当</option><option value="leased" ${c.settings?.housingType==='leased'?'selected':''}>借上社宅・寮</option><option value="other" ${c.settings?.housingType==='other'?'selected':''}>その他</option></select></div><div class="full"><label>採用URL</label><input class="input" name="recruit_url" value="${esc(c.recruit_url||'')}"></div><div class="full"><label>簡単なメモ</label><textarea class="textarea" name="memo">${esc(c.memo||'')}</textarea></div></div><div class="row" style="margin-top:14px"><button class="btn primary">保存</button></div></form>`;}

function variableModal(c,s,key){
  const d=VAR_DEFS[key],ev=state.companyValues.filter(x=>!x.deleted_at&&!x.disabled&&x.company_id===c.id&&x.variable_key===key&&(x.scenario_id===s.id||!x.scenario_id)); const r=key==='actualRent'?resolveRent(c,s):resolveCompanyVar(c,s,key);
  openModal(d.label,`<div class="card"><div class="kv"><span>現在の採用値</span><b>${formatVal(key,r.central)}</b></div><div class="kv"><span>想定範囲</span><b>${formatVal(key,r.low)}〜${formatVal(key,r.high)}</b></div><div class="kv"><span>状態</span><span>${r.isAssumption?certaintyBadge('assumption'):certaintyBadge(r.certainty||'medium')}</span></div></div><div class="section-title">保存されている情報</div>${ev.length?ev.map(x=>`<div class="card" style="margin-bottom:8px"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>${formatVal(key,num(x.central))}</b> ${certaintyBadge(x.certainty)}<div class="small muted">${esc(x.source_label||SOURCE_LABEL[x.source_type])}${x.scenario_id?' / このScenario':''}</div>${x.low!=null||x.high!=null?`<div class="tiny muted">範囲 ${formatVal(key,x.low??x.central)}〜${formatVal(key,x.high??x.central)}</div>`:''}${x.note?`<div class="tiny muted" style="margin-top:4px;white-space:pre-wrap">${esc(x.note)}</div>`:''}${x.source_url?`<div class="tiny"><a href="${esc(x.source_url)}" target="_blank" rel="noopener">出典を開く</a></div>`:''}</div><div class="evidence-actions"><label class="tiny"><input type="radio" name="primaryEvidence" data-action="make-primary" data-evidence-id="${x.id}" ${x.is_primary?'checked':''}> 中心</label><label class="tiny"><input type="checkbox" data-action="toggle-range" data-evidence-id="${x.id}" ${x.is_range?'checked':''}> レンジ</label><button class="btn tiny" data-action="edit-evidence" data-evidence-id="${x.id}">編集</button><button class="btn danger tiny" data-action="delete-evidence" data-evidence-id="${x.id}">削除</button></div></div></div>`).join(''):'<div class="card empty">実情報がないためデフォルト仮定値を使用中。</div>'}<div class="row"><button class="btn primary" data-action="add-evidence" data-key="${key}">＋情報を追加</button>${['baseSalary','fixedOvertimePay','fixedOvertimeHours'].includes(key)?'<button class="btn" data-action="salary-split">月給から分解</button>':''}</div>`);
}
function evidenceForm(key,s,x={}){const d=VAR_DEFS[key];return `<form id="evidenceForm" data-key="${key}" data-id="${x.id||''}"><div class="form-grid"><div><label>値 (${esc(d.unit)})</label><input class="input" type="number" step="any" name="central" value="${x.central??''}" required></div><div><label>確証度</label><select class="select" name="certainty"><option value="confirmed" ${x.certainty==='confirmed'?'selected':''}>確定</option><option value="high" ${x.certainty==='high'?'selected':''}>高</option><option value="medium" ${!x.certainty||x.certainty==='medium'?'selected':''}>中</option><option value="low" ${x.certainty==='low'?'selected':''}>低</option><option value="assumption" ${x.certainty==='assumption'?'selected':''}>仮定</option></select></div><div><label>下限（任意）</label><input class="input" type="number" step="any" name="low" value="${x.low??''}"></div><div><label>上限（任意）</label><input class="input" type="number" step="any" name="high" value="${x.high??''}"></div><div><label>情報源</label><select class="select" name="source_type"><option value="official" ${x.source_type==='official'?'selected':''}>公式</option><option value="employee" ${x.source_type==='employee'?'selected':''}>社員</option><option value="review" ${x.source_type==='review'?'selected':''}>口コミ</option><option value="self" ${x.source_type==='self'?'selected':''}>自分で設定</option><option value="other" ${!x.source_type||x.source_type==='other'?'selected':''}>その他</option></select></div><div><label>情報源名</label><input class="input" name="source_label" value="${esc(x.source_label||'')}" placeholder="2028卒採用サイト等"></div><div class="full"><label>URL</label><input class="input" name="source_url" value="${esc(x.source_url||'')}"></div><div class="full"><label>メモ</label><textarea class="textarea" name="note">${esc(x.note||'')}</textarea></div><div><label><input type="checkbox" name="is_primary" ${x.id?(x.is_primary?'checked':''):'checked'}> 中心値に使う</label></div><div><label><input type="checkbox" name="is_range" ${x.id?(x.is_range?'checked':''):'checked'}> レンジに使う</label></div><div class="full"><label><input type="checkbox" name="scenario_specific" ${(x.scenario_id||(!x.id&&d.scenarioSpecific))?'checked':''}> 現在のScenarioだけに適用</label></div></div><div class="row" style="margin-top:14px"><button class="btn primary">${x.id?'変更を保存':'保存'}</button></div></form>`;}

async function refreshVariableModal(key){
  await loadAll(); render(); const c=state.companies.find(x=>x.id===state.companyId); if(!c)return; const s=scenarioForCompany(c); variableModal(c,s,key);
}

function salarySplitForm(c,s){
  const fixedH=resolveCompanyVar(c,s,'fixedOvertimeHours').central;
  const scheduled=resolveCompanyVar(c,s,'scheduledWorkHours').central;
  const days=resolveCompanyVar(c,s,'monthlyWorkDays').central;
  const currentTotal=resolveCompanyVar(c,s,'baseSalary').central+resolveCompanyVar(c,s,'fixedOvertimePay').central;
  return `<form id="salarySplitForm"><div class="setup-card">月給を「基本給＋固定残業代」とみなし、現在の所定労働時間と月勤務日数から概算します。住宅手当など別建ての手当は月給に含めないでください。求人票に実額がある場合は実額を優先してください。</div><div class="form-grid"><div><label>分解する月給（円）</label><input class="input" type="number" name="monthly_total" value="${Math.round(currentTotal)}" required></div><div><label>固定残業時間（h/月）</label><input class="input" type="number" step="any" name="fixed_hours" value="${fixedH}" required></div><div><label>割増率</label><input class="input" type="number" step="0.01" name="premium_rate" value="1.2" required></div><div><label>計算用の月所定労働時間</label><input class="input" type="number" step="any" name="monthly_scheduled_hours" value="${(scheduled*days).toFixed(1)}" required></div><div><label>確証度</label><select class="select" name="certainty"><option value="confirmed">確定</option><option value="high">高</option><option value="medium" selected>中</option><option value="low">低</option></select></div><div><label>情報源</label><select class="select" name="source_type"><option value="official">公式</option><option value="employee">社員</option><option value="review">口コミ</option><option value="self">自分で設定</option><option value="other">その他</option></select></div><div class="full"><label>情報源名</label><input class="input" name="source_label" placeholder="募集要項など"></div><div class="full"><label>URL</label><input class="input" name="source_url"></div><div class="full"><label>メモ</label><textarea class="textarea" name="note"></textarea></div></div><div class="salary-preview" id="salarySplitPreview"></div><div class="row" style="margin-top:14px"><button class="btn primary">計算結果を保存</button></div></form>`;
}
function salarySplitValues(f){
  const fd=new FormData(f), total=Math.max(0,num(fd.get('monthly_total'))), h=Math.max(0,num(fd.get('fixed_hours'))), rate=Math.max(0.01,num(fd.get('premium_rate'))), scheduled=Math.max(1,num(fd.get('monthly_scheduled_hours')));
  const base=total/(1+(rate*h/scheduled)); const fixed=Math.max(0,total-base); return {total,h,rate,scheduled,base,fixed};
}
function updateSalarySplitPreview(f){ if(!f)return; const v=salarySplitValues(f),el=$('#salarySplitPreview'); if(el)el.innerHTML=`<div class="card" style="margin-top:12px"><div class="kv"><span>基本給（概算）</span><b>${yen(v.base)}</b></div><div class="kv"><span>固定残業代（概算）</span><b>${yen(v.fixed)}</b></div><div class="tiny muted" style="margin-top:8px">式：基本給 = 月給 ÷ (1 + 割増率 × 固定残業時間 ÷ 月所定労働時間)</div></div>`; }

function noteForm(n={},scope='other',companyId=null){return `<form id="noteForm" data-id="${n.id||''}"><div class="form-grid"><div><label>分類</label><select class="select" name="scope_type"><option value="company" ${(n.scope_type||scope)==='company'?'selected':''}>企業</option><option value="industry" ${(n.scope_type||scope)==='industry'?'selected':''}>業界</option><option value="other" ${(n.scope_type||scope)==='other'?'selected':''}>その他</option></select></div><div><label>企業（任意）</label><select class="select" name="company_id"><option value="">なし</option>${state.companies.map(c=>`<option value="${c.id}" ${(n.company_id||companyId)===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="full"><label>業界名（業界メモの場合）</label><input class="input" name="industry" value="${esc(n.industry||'')}"></div><div class="full"><label>タイトル *</label><input class="input" name="title" value="${esc(n.title||'')}" required></div><div class="full"><label>本文</label><textarea class="textarea" name="body">${esc(n.body||'')}</textarea></div><div class="full"><label>画像・PDF（追加）</label><input class="input" type="file" name="files" multiple accept="image/*,application/pdf"></div></div><div class="row" style="margin-top:14px"><button class="btn primary">保存</button></div></form>`;}

function settingsRichForm(title,obj,defs,formId){ return `<form id="${formId}"><div class="small muted" style="margin-bottom:10px">中央値・下限・上限を編集できます。</div>${Object.entries(defs).map(([k,d])=>{const r=richObj(obj[k]);return `<div class="card" style="margin-bottom:8px"><b>${esc(d.label)}</b><div class="form-grid" style="margin-top:8px"><div><label>中央</label><input class="input" type="number" step="any" name="${k}__central" value="${r.central}"></div><div><label>下限</label><input class="input" type="number" step="any" name="${k}__low" value="${r.low}"></div><div><label>上限</label><input class="input" type="number" step="any" name="${k}__high" value="${r.high}"></div></div></div>`;}).join('')}<button class="btn primary">保存</button></form>`; }

async function saveSettings(){ await db(supabase.from('app_settings').upsert({user_id:state.user.id,settings:state.settings})); }

function bindEvents(){
  document.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-nav]'); if(nav){state.page=nav.dataset.nav;state.companyId=null;render();setTimeout(()=>{if(state.page==='interview'&&state.interviewTab==='master'&&state.interviewMasterTab==='questions')setupQuestionSortables();if(state.page==='interview'&&state.interviewTab==='plan')setupMilestoneSortable();},0);return;}
    const pendingAction=e.target.closest('[data-action]');
    const comp=e.target.closest('[data-company]'); if(comp&&!pendingAction){state.companyId=comp.dataset.company;state.companyTab='overview';render();return;}
    const tab=e.target.closest('[data-company-tab]'); if(tab){state.companyTab=tab.dataset.companyTab;render();return;}
    const a=e.target.closest('[data-action]'); if(!a)return; const action=a.dataset.action;
    if(action==='close-modal'){closeModal();return;}
    if(action==='toggle-rejected'){state.showRejected=!state.showRejected;render();return;}
    if(action==='interview-subtab'){state.interviewTab=a.dataset.subtab;state.interviewCompanyId=null;state.interviewEventId=null;render();setTimeout(()=>{if(state.interviewTab==='master'&&state.interviewMasterTab==='questions')setupQuestionSortables();if(state.interviewTab==='plan')setupMilestoneSortable();},0);return;}
    if(action==='master-subtab'){state.interviewMasterTab=a.dataset.subtab;render();setTimeout(()=>{if(state.interviewMasterTab==='questions')setupQuestionSortables();},0);return;}
    if(action==='add-master-question'){openModal('マスター質問追加',masterQuestionForm());return;}
    if(action==='edit-master-question'){const q=state.interviewQuestions.find(x=>x.id===a.dataset.questionId);if(q)openModal('マスター質問',masterQuestionForm(q));return;}
    if(action==='trash-master-question'){if(confirm('この質問を削除しますか？')){await db(supabase.from('interview_questions').update({deleted_at:nowIso()}).eq('id',a.dataset.questionId));await loadAll();closeModal();render();}return;}
    if(action==='add-episode'){openModal('エピソード追加',episodeForm());return;}
    if(action==='edit-episode'){const ep=state.interviewEpisodes.find(x=>x.id===a.dataset.episodeId);if(ep)openModal('エピソード編集',episodeForm(ep));return;}
    if(action==='show-episode-links'){const ep=state.interviewEpisodes.find(x=>x.id===a.dataset.episodeId);if(ep)openModal('紐づく質問',episodeLinksModal(ep));return;}
    if(action==='trash-episode'){if(confirm('このエピソードを削除しますか？')){await db(supabase.from('interview_episodes').update({deleted_at:nowIso()}).eq('id',a.dataset.episodeId));await loadAll();render();}return;}
    if(action==='open-interview-company'){state.page='interview';state.interviewTab='companies';state.interviewCompanyId=a.dataset.companyId;render();if(a.dataset.direct==='1'){setTimeout(()=>{const c=state.companies.find(x=>x.id===state.interviewCompanyId);if(c)openModal('直前確認',directReviewModal(c));},0);}return;}
    if(action==='back-interview-companies'){state.interviewCompanyId=null;render();return;}
    if(action==='edit-interview-prep'){const c=state.companies.find(x=>x.id===a.dataset.companyId),p=prepForCompany(c.id)||{};openModal(`${c.name}：企業別対策`,interviewPrepForm(c,p));return;}
    if(action==='edit-company-answer'){const c=state.companies.find(x=>x.id===a.dataset.companyId),q=state.interviewQuestions.find(x=>x.id===a.dataset.questionId),o=answerOverride(c.id,q.id)||{};openModal(`${c.name}：企業専用回答`,companyAnswerForm(c,q,o));return;}
    if(action==='delete-company-answer'){if(confirm('企業専用回答を削除してマスター回答に戻しますか？')){await db(supabase.from('company_answer_overrides').delete().eq('id',a.dataset.answerId));await loadAll();closeModal();render();}return;}
    if(action==='add-reverse-question'){openModal('逆質問追加',reverseQuestionForm(a.dataset.companyId));return;}
    if(action==='copy-reverse-template'){const t=state.reverseQuestions.find(x=>x.id===a.dataset.templateId),cid=a.dataset.companyId;if(t){const existing=state.reverseQuestions.find(x=>x.company_id===cid&&x.text.trim()===t.text.trim());if(existing){if(!existing.selected_for_next)await db(supabase.from('reverse_questions').update({selected_for_next:true}).eq('id',existing.id));toast('すでに追加済みの逆質問です。');}else{const max=Math.max(-1,...state.reverseQuestions.filter(x=>x.company_id===cid).map(x=>x.order_index||0));await db(supabase.from('reverse_questions').insert({user_id:state.user.id,company_id:cid,text:t.text,category:t.category,memo:t.memo,selected_for_next:true,order_index:max+1}));}await loadAll();render();}return;}
    if(action==='condition-to-reverse'){const cond=state.conditions.find(x=>x.id===a.dataset.conditionId),cid=a.dataset.companyId;if(cond){const text=`「${cond.name}」について、実際の制度や運用を教えてください。`,existing=state.reverseQuestions.find(x=>x.company_id===cid&&x.text.trim()===text.trim());if(existing){if(!existing.selected_for_next)await db(supabase.from('reverse_questions').update({selected_for_next:true}).eq('id',existing.id));toast('すでに追加済みの逆質問です。');}else{const max=Math.max(-1,...state.reverseQuestions.filter(x=>x.company_id===cid).map(x=>x.order_index||0));await db(supabase.from('reverse_questions').insert({user_id:state.user.id,company_id:cid,text,category:'条件確認',selected_for_next:true,order_index:max+1}));}await loadAll();render();}return;}
    if(action==='trash-reverse'){await db(supabase.from('reverse_questions').delete().eq('id',a.dataset.reverseId));await loadAll();render();return;}
    if(action==='direct-review'){const c=state.companies.find(x=>x.id===a.dataset.companyId);if(c)openModal('直前確認',directReviewModal(c));return;}
    if(action==='add-interview-event'){openModal('面接を記録',interviewEventForm());return;}
    if(action==='open-interview-event'){state.interviewEventId=a.dataset.eventId;render();return;}
    if(action==='back-interview-history'){state.interviewEventId=null;render();return;}
    if(action==='edit-interview-event'){const ev=state.interviewEvents.find(x=>x.id===a.dataset.eventId);if(ev)openModal('面接全体メモ',interviewEventForm(ev));return;}
    if(action==='add-event-question'){openModal('聞かれた質問',eventQuestionForm(a.dataset.eventId));return;}
    if(action==='edit-event-question'){const q=state.interviewEventQuestions.find(x=>x.id===a.dataset.eventQuestionId);if(q)openModal('質問記録を編集',eventQuestionForm(q.event_id,q));return;}
    if(action==='trash-event-question'){await db(supabase.from('interview_event_questions').delete().eq('id',a.dataset.eventQuestionId));await loadAll();render();return;}
    if(action==='promote-event-question'){const eq=state.interviewEventQuestions.find(x=>x.id===a.dataset.eventQuestionId);if(eq){const matched=findSimilarMasterQuestion(eq.question_text);let qid;if(matched){qid=matched.id;toast(`既存のマスター質問「${matched.question}」にリンクしました。`);}else{const max=Math.max(-1,...state.interviewQuestions.map(x=>x.order_index||0));const row=await db(supabase.from('interview_questions').insert({user_id:state.user.id,question:eq.question_text,category:'その他',prep_status:eq.next_answer?'draft':'not_started',answer_60:eq.next_answer||null,order_index:max+1}).select().single());qid=row.id;toast('新しい質問として質問マスターに追加しました。');}await db(supabase.from('interview_event_questions').update({question_id:qid}).eq('id',eq.id));await loadAll();render();}return;}
    if(action==='add-milestone'){openModal('就活予定を追加',milestoneForm());return;}
    if(action==='edit-milestone'){const m=state.careerMilestones.find(x=>x.id===a.dataset.milestoneId);if(m)openModal('就活予定を編集',milestoneForm(m));return;}
    if(action==='trash-milestone'){if(confirm('この予定を削除しますか？')){await db(supabase.from('career_milestones').update({deleted_at:nowIso()}).eq('id',a.dataset.milestoneId));await loadAll();render();}return;}
    if(action==='back-companies'){state.companyId=null;state.page='companies';render();return;}
    if(action==='goto-tab'){state.companyTab=a.dataset.tab;render();return;}
    if(action==='open-higher'){state.companyId=a.dataset.companyId;state.companyTab='conditions';state.conditionSubTab='higher';render();return;}
    if(action==='open-preference'){state.companyId=a.dataset.companyId;state.companyTab='conditions';state.conditionSubTab='preference';render();return;}
    if(action==='add-company'){openModal('企業追加',companyForm());return;}
    if(action==='edit-company'){const c=state.companies.find(x=>x.id===a.dataset.companyId);openModal('企業情報を編集',companyForm(c));return;}
    if(action==='trash-company'){if(confirm('この企業をゴミ箱へ移しますか？')){await db(supabase.from('companies').update({deleted_at:nowIso()}).eq('id',a.dataset.companyId));await loadAll();state.companyId=null;render();}return;}
    if(action==='detailed-calc'){const c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c);openModal('詳細計算',detailedCalcModal(c,s));return;}
    if(action==='open-variable'){const c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c);variableModal(c,s,a.dataset.key);return;}
    if(action==='edit-evidence'){const x=state.companyValues.find(v=>v.id===a.dataset.evidenceId),c=state.companies.find(z=>z.id===state.companyId),sc=scenarioForCompany(c);if(x)openModal(`${VAR_DEFS[x.variable_key].label}：情報編集`,evidenceForm(x.variable_key,sc,x));return;}
    if(action==='delete-evidence'){const x=state.companyValues.find(v=>v.id===a.dataset.evidenceId);if(x&&confirm('この情報を削除しますか？ 画面上からは完全に消えます。')){const key=x.variable_key;await db(supabase.from('company_values').delete().eq('id',x.id));await refreshVariableModal(key);}return;}
    if(action==='add-evidence'){const c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c),key=a.dataset.key;openModal(`${VAR_DEFS[key].label}：情報追加`,evidenceForm(key,s));return;}
    if(action==='salary-split'){const c=state.companies.find(x=>x.id===state.companyId),sc=scenarioForCompany(c);openModal('月給から基本給・固定残業代を計算',salarySplitForm(c,sc));setTimeout(()=>updateSalarySplitPreview($('#salarySplitForm')),0);return;}
    if(action==='add-company-note'){openModal('情報カード追加',noteForm({},'company',state.companyId));return;}
    if(action==='add-global-note'){openModal('メモ追加',noteForm({},'other',null));return;}
    if(action==='edit-note'){const n=state.notes.find(x=>x.id===a.dataset.noteId);openModal('メモ編集',noteForm(n,n.scope_type,n.company_id));return;}
    if(action==='trash-note'){if(confirm('このメモをゴミ箱へ移しますか？')){await db(supabase.from('notes').update({deleted_at:nowIso()}).eq('id',a.dataset.noteId));await loadAll();render();}return;}
    if(action==='open-attachment'){const at=state.attachments.find(x=>x.id===a.dataset.attachmentId);if(at){const {data,error}=await supabase.storage.from('attachments').createSignedUrl(at.storage_path,60);if(error)alert(error.message);else window.open(data.signedUrl,'_blank');}return;}
    if(action==='condition-subtab'){state.conditionSubTab=a.dataset.subtab;render();return;}
    if(action==='edit-condition-value'){const c=state.companies.find(x=>x.id===state.companyId),sc=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===a.dataset.conditionId),ev=conditionEvalRecord(cond,c,sc)||{};openModal(`${cond.name}：数値`,conditionValueForm(cond,c,sc,ev));return;}
    if(action==='delete-condition-value'){const c=state.companies.find(x=>x.id===state.companyId),sc=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===a.dataset.conditionId),ev=conditionEvalRecord(cond,c,sc);if(ev&&confirm('この数値情報を削除しますか？')){await db(supabase.from('company_condition_evals').update({numeric_central:null,numeric_low:null,numeric_high:null,certainty:null,source_type:null,source_label:null,source_url:null}).eq('id',ev.id));await loadAll();render();}return;}
    if(action==='edit-condition-memo'){const c=state.companies.find(x=>x.id===state.companyId),sc=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===a.dataset.conditionId),ev=conditionEvalRecord(cond,c,sc)||{};openModal(`${cond.name}：メモ`,conditionMemoForm(cond,ev));return;}
    if(action==='edit-common'){openModal('共通設定',settingsRichForm('共通',state.settings.common,COMMON_DEFS,'commonSettingsForm'));return;}
    if(action==='edit-defaults'){openModal('デフォルト仮定値',settingsRichForm('仮定値',state.settings.companyDefaults,VAR_DEFS,'defaultSettingsForm'));return;}
    if(action==='manage-scenarios'){openModal('生活Scenario',scenarioManager());return;}
    if(action==='edit-scenario'){const s=state.scenarios.find(x=>x.id===a.dataset.scenarioId);openModal(`Scenario：${s.name}`,scenarioEditForm(s));return;}
    if(action==='add-scenario'){openModal('Scenario追加',scenarioAddForm());return;}
    if(action==='trash-scenario'){if(confirm('Scenarioをゴミ箱へ移しますか？')){await db(supabase.from('scenarios').update({deleted_at:nowIso()}).eq('id',a.dataset.scenarioId));await loadAll();closeModal();render();}return;}
    if(action==='manage-conditions'){openModal('条件管理',conditionManager());setTimeout(setupConditionSortables,0);return;}
    if(action==='add-condition'){openModal('条件追加',conditionForm({},a.dataset.category||'higher'));return;}
    if(action==='edit-condition'){const c=state.conditions.find(x=>x.id===a.dataset.conditionId);openModal('条件編集',conditionForm(c));return;}
    if(action==='move-condition'){await moveCondition(a.dataset.conditionId,num(a.dataset.delta));return;}
    if(action==='trash-condition'){await db(supabase.from('conditions').update({deleted_at:nowIso()}).eq('id',a.dataset.conditionId));await loadAll();openModal('条件管理',conditionManager());setTimeout(setupConditionSortables,0);return;}
    if(action==='new-display-set'){openModal('表示セット追加',displaySetForm());return;}
    if(action==='sort-compare'){const k=a.dataset.key;if(state.compareSort.key===k)state.compareSort.dir*=-1;else state.compareSort={key:k,dir:1};render();return;}
    if(action==='export-json'){await exportJson();return;}
    if(action==='import-json'){openImport();return;}
    if(action==='trash'){await showTrash();return;}
    if(action==='restore-trash'){await restoreTrash(a.dataset.table,a.dataset.id);return;}
    if(action==='signout'){await supabase.auth.signOut();return;}
  });

  document.addEventListener('change',async e=>{
    const el=e.target,action=el.dataset.action;
    if(action==='company-scenario'||action==='compare-scenario'){await db(supabase.from('companies').update({default_scenario_id:el.value}).eq('id',el.dataset.companyId));await loadAll();render();}
    if(action==='company-status-quick'){await db(supabase.from('companies').update({selection_status:el.value}).eq('id',el.dataset.companyId));await loadAll();if(el.value==='rejected'&&!state.showRejected){state.companyId=null;state.page='companies';}render();}
    if(action==='display-set'){state.settings.activeDisplaySet=el.value;await saveSettings();render();}
    if(action==='note-scope'){state.noteScope=el.value;render();}
    if(action==='manual-condition'){const c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===el.dataset.conditionId);await upsertConditionEval(cond,c,s,{status:el.value});await loadAll();render();}
    if(action==='toggle-reverse-selected'){await db(supabase.from('reverse_questions').update({selected_for_next:el.checked}).eq('id',el.dataset.reverseId));await loadAll();render();}
    if(action==='event-master-select'){const f=el.closest('#eventQuestionForm'),q=state.interviewQuestions.find(x=>x.id===el.value),inp=f?.querySelector('[name="question_text"]');if(inp&&q&&!inp.value.trim())inp.value=q.question;}
    if(action==='make-primary'){const id=el.dataset.evidenceId,x=state.companyValues.find(v=>v.id===id);await db(supabase.from('company_values').update({is_primary:false}).eq('company_id',x.company_id).eq('variable_key',x.variable_key));await db(supabase.from('company_values').update({is_primary:true}).eq('id',id));await refreshVariableModal(x.variable_key);}
    if(action==='toggle-range'){const x=state.companyValues.find(v=>v.id===el.dataset.evidenceId);await db(supabase.from('company_values').update({is_range:el.checked}).eq('id',el.dataset.evidenceId));if(x)await refreshVariableModal(x.variable_key);}
  });
  document.addEventListener('input',e=>{if(e.target.dataset.action==='note-search'){state.noteSearch=e.target.value;render();const x=$('[data-action="note-search"]');x?.focus();if(x)x.selectionStart=x.selectionEnd=x.value.length;}const sf=e.target.closest('#salarySplitForm');if(sf)updateSalarySplitPreview(sf);});
  document.addEventListener('submit',async e=>{
    const f=e.target;if(!['companyForm','evidenceForm','salarySplitForm','conditionValueForm','conditionMemoForm','noteForm','commonSettingsForm','defaultSettingsForm','scenarioEditForm','scenarioAddForm','conditionForm','displaySetForm','importForm','masterQuestionForm','episodeForm','interviewPrepForm','companyAnswerForm','reverseQuestionForm','interviewEventForm','eventQuestionForm','careerPlanOverviewForm','milestoneForm'].includes(f.id))return;e.preventDefault();
    try{if(f.id==='companyForm')await submitCompany(f);else if(f.id==='evidenceForm')await submitEvidence(f);else if(f.id==='salarySplitForm')await submitSalarySplit(f);else if(f.id==='conditionValueForm')await submitConditionValue(f);else if(f.id==='conditionMemoForm')await submitConditionMemo(f);else if(f.id==='noteForm')await submitNote(f);else if(f.id==='commonSettingsForm')await submitRichSettings(f,'common',COMMON_DEFS);else if(f.id==='defaultSettingsForm')await submitRichSettings(f,'companyDefaults',VAR_DEFS);else if(f.id==='scenarioEditForm')await submitScenarioEdit(f);else if(f.id==='scenarioAddForm')await submitScenarioAdd(f);else if(f.id==='conditionForm')await submitCondition(f);else if(f.id==='displaySetForm')await submitDisplaySet(f);else if(f.id==='importForm')await submitImport(f);else if(f.id==='masterQuestionForm')await submitMasterQuestion(f);else if(f.id==='episodeForm')await submitEpisode(f);else if(f.id==='interviewPrepForm')await submitInterviewPrep(f);else if(f.id==='companyAnswerForm')await submitCompanyAnswer(f);else if(f.id==='reverseQuestionForm')await submitReverseQuestion(f);else if(f.id==='interviewEventForm')await submitInterviewEvent(f);else if(f.id==='eventQuestionForm')await submitEventQuestion(f);else if(f.id==='careerPlanOverviewForm')await submitCareerPlanOverview(f);else if(f.id==='milestoneForm')await submitMilestone(f);}catch(err){alert(err.message||String(err));}
  });
}

async function submitCompany(f){const fd=new FormData(f),id=f.dataset.id;const payload={user_id:state.user.id,name:fd.get('name'),industry:fd.get('industry')||null,recruit_url:fd.get('recruit_url')||null,memo:fd.get('memo')||null,selection_status:fd.get('selection_status')||'active',settings:{housingType:fd.get('housingType')||'none'}};if(id)await db(supabase.from('companies').update(payload).eq('id',id));else{payload.default_scenario_id=state.scenarios[0]?.id||null;await db(supabase.from('companies').insert(payload));}await loadAll();closeModal();render();}
async function submitEvidence(f){
  const fd=new FormData(f),key=f.dataset.key,id=f.dataset.id,c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c),isPrimary=fd.get('is_primary')==='on';
  if(isPrimary) await db(supabase.from('company_values').update({is_primary:false}).eq('company_id',c.id).eq('variable_key',key));
  const payload={user_id:state.user.id,company_id:c.id,scenario_id:fd.get('scenario_specific')==='on'?s.id:null,variable_key:key,central:num(fd.get('central')),low:fd.get('low')===''?null:num(fd.get('low')),high:fd.get('high')===''?null:num(fd.get('high')),certainty:fd.get('certainty'),source_type:fd.get('source_type'),source_label:fd.get('source_label')||null,source_url:fd.get('source_url')||null,note:fd.get('note')||null,is_primary:isPrimary,is_range:fd.get('is_range')==='on',disabled:false};
  if(id) await db(supabase.from('company_values').update(payload).eq('id',id)); else await db(supabase.from('company_values').insert(payload));
  await refreshVariableModal(key);
}
async function submitSalarySplit(f){
  const fd=new FormData(f),v=salarySplitValues(f),c=state.companies.find(x=>x.id===state.companyId); if(v.total<=0||v.scheduled<=0)throw new Error('月給と月所定労働時間を確認してください。');
  const certainty=fd.get('certainty'),source_type=fd.get('source_type'),source_label=fd.get('source_label')||'月給から概算',source_url=fd.get('source_url')||null;
  const noteBase=[fd.get('note')||'',`月給 ${Math.round(v.total)}円、固定残業 ${v.h}h、割増率 ${v.rate}、月所定労働 ${v.scheduled}h から概算`].filter(Boolean).join('\n');
  const rows=[['baseSalary',v.base],['fixedOvertimePay',v.fixed],['fixedOvertimeHours',v.h]];
  for(const [key,value] of rows){
    await db(supabase.from('company_values').update({is_primary:false}).eq('company_id',c.id).eq('variable_key',key));
    await db(supabase.from('company_values').insert({user_id:state.user.id,company_id:c.id,scenario_id:null,variable_key:key,central:value,low:null,high:null,certainty,source_type,source_label,source_url,note:noteBase,is_primary:true,is_range:true,disabled:false}));
  }
  await loadAll(); closeModal(); render();
}
async function upsertConditionEval(cond,c,s,patch){
  const old=conditionEvalRecord(cond,c,s);
  if(old){await db(supabase.from('company_condition_evals').update(patch).eq('id',old.id));return old.id;}
  const data=await db(supabase.from('company_condition_evals').insert({user_id:state.user.id,company_id:c.id,condition_id:cond.id,scenario_id:s?.id||null,status:'unknown',...patch}).select().single()); return data.id;
}
async function submitConditionValue(f){
  const fd=new FormData(f),c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===f.dataset.conditionId);
  await upsertConditionEval(cond,c,s,{numeric_central:num(fd.get('central')),numeric_low:fd.get('low')===''?null:num(fd.get('low')),numeric_high:fd.get('high')===''?null:num(fd.get('high')),certainty:fd.get('certainty'),source_type:fd.get('source_type'),source_label:fd.get('source_label')||null,source_url:fd.get('source_url')||null,note:fd.get('note')||null});
  await loadAll();closeModal();render();
}
async function submitConditionMemo(f){
  const fd=new FormData(f),c=state.companies.find(x=>x.id===state.companyId),s=scenarioForCompany(c),cond=state.conditions.find(x=>x.id===f.dataset.conditionId);
  await upsertConditionEval(cond,c,s,{note:fd.get('note')||null}); await loadAll();closeModal();render();
}
async function submitNote(f){const fd=new FormData(f),id=f.dataset.id;const payload={user_id:state.user.id,scope_type:fd.get('scope_type'),company_id:fd.get('company_id')||null,industry:fd.get('industry')||null,title:fd.get('title'),body:fd.get('body')||''};let noteId=id;if(id)await db(supabase.from('notes').update(payload).eq('id',id));else{const data=await db(supabase.from('notes').insert(payload).select().single());noteId=data.id;}const files=fd.getAll('files').filter(x=>x&&x.size);for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._\-\u3000-\u9fff]/g,'_');const path=`${state.user.id}/${noteId}/${Date.now()}-${safe}`;await db(supabase.storage.from('attachments').upload(path,file,{upsert:false}));await db(supabase.from('attachments').insert({user_id:state.user.id,note_id:noteId,company_id:payload.company_id,storage_path:path,file_name:file.name,mime_type:file.type,size_bytes:file.size}));}await loadAll();closeModal();render();}
async function submitRichSettings(f,section,defs){const fd=new FormData(f),obj={};for(const k of Object.keys(defs))obj[k]={central:num(fd.get(`${k}__central`)),low:num(fd.get(`${k}__low`)),high:num(fd.get(`${k}__high`)),certainty:section==='companyDefaults'?'assumption':(state.settings[section]?.[k]?.certainty||'confirmed')};state.settings[section]=obj;await saveSettings();closeModal();render();}

function scenarioManager(){return `<div class="detail-list">${state.scenarios.map(s=>`<div class="detail-row"><div><b>${esc(s.name)}</b><div class="tiny muted">${esc(s.kind)}</div></div><button class="btn" data-action="edit-scenario" data-scenario-id="${s.id}">編集</button><button class="btn danger" data-action="trash-scenario" data-scenario-id="${s.id}">削除</button></div>`).join('')}</div><button class="btn primary" data-action="add-scenario" style="margin-top:12px">＋Scenario</button>`;}
function scenarioEditForm(s){return `<form id="scenarioEditForm" data-id="${s.id}"><div class="form-field"><label>名称</label><input class="input" name="name" value="${esc(s.name)}"></div><hr>${settingsRichFields(s.settings,SCENARIO_DEFS)}<button class="btn primary">保存</button></form>`;}
function settingsRichFields(obj,defs){return Object.entries(defs).map(([k,d])=>{const r=richObj(obj[k]);return `<div class="card" style="margin-bottom:8px"><b>${esc(d.label)}</b><div class="form-grid" style="margin-top:8px"><div><label>中央</label><input class="input" type="number" step="any" name="${k}__central" value="${r.central}"></div><div><label>下限</label><input class="input" type="number" step="any" name="${k}__low" value="${r.low}"></div><div><label>上限</label><input class="input" type="number" step="any" name="${k}__high" value="${r.high}"></div></div></div>`;}).join('');}
function scenarioAddForm(){return `<form id="scenarioAddForm"><div class="form-field"><label>名称</label><input class="input" name="name" required placeholder="例：一人暮らし・家賃高め"></div><div class="form-field" style="margin-top:10px"><label>複製元</label><select class="select" name="base_id">${state.scenarios.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><button class="btn primary" style="margin-top:14px">追加</button></form>`;}
async function submitScenarioEdit(f){const s=state.scenarios.find(x=>x.id===f.dataset.id),fd=new FormData(f),settings={};for(const k of Object.keys(SCENARIO_DEFS))settings[k]={central:num(fd.get(`${k}__central`)),low:num(fd.get(`${k}__low`)),high:num(fd.get(`${k}__high`)),certainty:s.settings?.[k]?.certainty||'confirmed'};await db(supabase.from('scenarios').update({name:fd.get('name'),settings}).eq('id',s.id));await loadAll();closeModal();render();}
async function submitScenarioAdd(f){const fd=new FormData(f),base=state.scenarios.find(x=>x.id===fd.get('base_id'))||state.scenarios[0];await db(supabase.from('scenarios').insert({user_id:state.user.id,name:fd.get('name'),kind:'custom',settings:structuredClone(base.settings)}));await loadAll();closeModal();render();}

function conditionManager(){
  const cats=[['higher','Higher condition','原則として満たしたい条件'],['preference','Preference','満たすほど嬉しい条件'],['information','Information','評価せず保存する情報']];
  return cats.map(([cat,label,desc])=>{const list=state.conditions.filter(c=>c.category===cat&&!c.deleted_at).sort((a,b)=>a.order_index-b.order_index);return `<section class="condition-manager-section"><div class="condition-manager-head"><div><h4>${label}</h4><div class="tiny muted">${desc}</div></div><button class="btn primary" data-action="add-condition" data-category="${cat}">＋追加</button></div><div class="sortable-list" data-condition-sort="${cat}">${list.map(c=>`<div class="condition-manage-row" data-condition-id="${c.id}"><span class="drag-handle" title="ドラッグして並べ替え">☰</span><div class="condition-manage-main"><b>${esc(c.name)}</b><div class="tiny muted">${esc(c.eval_type)}</div></div><div class="row"><button class="btn" data-action="edit-condition" data-condition-id="${c.id}">編集</button><button class="btn danger" data-action="trash-condition" data-condition-id="${c.id}">削除</button></div></div>`).join('')||'<div class="empty small">まだ項目がありません。</div>'}</div></section>`;}).join('');
}
function setupConditionSortables(){
  $$('[data-condition-sort]').forEach(el=>new Sortable(el,{animation:150,handle:'.drag-handle',ghostClass:'drag-ghost',onEnd:async()=>{const ids=$$('[data-condition-id]',el).map(x=>x.dataset.conditionId);for(let i=0;i<ids.length;i++)await db(supabase.from('conditions').update({order_index:i}).eq('id',ids[i]));await loadAll();}}));
}

function conditionForm(c={},defaultCategory='higher'){const cat=c.category||defaultCategory;return `<form id="conditionForm" data-id="${c.id||''}"><div class="form-grid"><div class="full"><label>条件名</label><input class="input" name="name" value="${esc(c.name||'')}" required></div><div><label>分類</label><select class="select" name="category"><option value="higher" ${cat==='higher'?'selected':''}>Higher condition</option><option value="preference" ${cat==='preference'?'selected':''}>Preference</option><option value="information" ${cat==='information'?'selected':''}>Information</option></select></div><div><label>判定</label><select class="select" name="eval_type"><option value="manual" ${c.eval_type==='manual'?'selected':''}>手動</option><option value="numeric" ${c.eval_type==='numeric'?'selected':''}>数値自動</option><option value="info" ${c.eval_type==='info'?'selected':''}>情報のみ</option></select></div><div><label>対象変数（数値時）</label><select class="select" name="variable_key"><option value="" ${!c.variable_key?'selected':''}>なし（数値と紐付けない）</option><option value="tfree" ${c.variable_key==='tfree'?'selected':''}>T_free</option><option value="mfree" ${c.variable_key==='mfree'?'selected':''}>M_free</option><option value="__custom__" ${c.variable_key==='__custom__'?'selected':''}>条件専用の数値（企業ごとに入力）</option>${Object.entries(VAR_DEFS).map(([k,d])=>`<option value="${k}" ${c.variable_key===k?'selected':''}>${esc(d.label)}</option>`).join('')}</select><div class="tiny muted" style="margin-top:5px">年間休日数など、計算式には使わないが数値を保存して判定したい場合は「条件専用の数値」を選びます。</div></div><div><label>比較</label><select class="select" name="operator">${['>=','>','<=','<','=','!='].map(op=>`<option value="${op}" ${c.operator===op?'selected':''}>${esc(op)}</option>`).join('')}</select></div><div><label>閾値</label><input class="input" type="number" step="any" name="threshold" value="${c.threshold??''}"></div><div><label>単位</label><input class="input" name="unit" value="${esc(c.unit||'')}" placeholder="例：日、回、%"></div></div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
async function submitCondition(f){const fd=new FormData(f),id=f.dataset.id,cat=fd.get('category');if(fd.get('eval_type')==='numeric'&&!fd.get('variable_key'))throw new Error('「数値自動」を選んだ場合は対象変数を選んでください（「なし」は選べません）。');const max=Math.max(-1,...state.conditions.filter(x=>x.category===cat&&x.id!==id).map(x=>x.order_index||0));const oldCond=id?state.conditions.find(x=>x.id===id):null;const payload={user_id:state.user.id,name:fd.get('name'),category:cat,eval_type:fd.get('eval_type'),variable_key:fd.get('eval_type')==='numeric'?(fd.get('variable_key')||null):null,operator:fd.get('eval_type')==='numeric'?fd.get('operator'):null,threshold:fd.get('threshold')===''?null:num(fd.get('threshold')),unit:fd.get('unit')||null};if(id){if(oldCond&&oldCond.category!==cat)payload.order_index=max+1;await db(supabase.from('conditions').update(payload).eq('id',id));}else await db(supabase.from('conditions').insert({...payload,order_index:max+1}));await loadAll();openModal('条件管理',conditionManager());setTimeout(setupConditionSortables,0);}
async function moveCondition(id,delta){const list=[...state.conditions].sort((a,b)=>a.order_index-b.order_index),i=list.findIndex(x=>x.id===id),j=clamp(i+delta,0,list.length-1);if(i===j)return;const a=list[i],b=list[j];await db(supabase.from('conditions').update({order_index:b.order_index}).eq('id',a.id));await db(supabase.from('conditions').update({order_index:a.order_index}).eq('id',b.id));await loadAll();openModal('条件管理',conditionManager());setTimeout(setupConditionSortables,0);}

function displaySetForm(){return `<form id="displaySetForm"><div class="form-field"><label>セット名</label><input class="input" name="name" required></div><div class="section-title">表示列</div><div class="grid two">${Object.entries(COMPARE_COLUMNS).map(([k,d])=>`<label class="card"><input type="checkbox" name="cols" value="${k}"> ${esc(d.label)}</label>`).join('')}</div><button class="btn primary" style="margin-top:14px">保存</button></form>`;}
async function submitDisplaySet(f){const fd=new FormData(f),name=fd.get('name'),cols=fd.getAll('cols');if(!cols.length)throw new Error('表示列を1つ以上選んでください');state.settings.displaySets=[...(state.settings.displaySets||[]).filter(x=>x.name!==name),{name,columns:cols}];state.settings.activeDisplaySet=name;await saveSettings();closeModal();render();}


async function submitMasterQuestion(f){
  const fd=new FormData(f),id=f.dataset.id,max=Math.max(-1,...state.interviewQuestions.map(x=>x.order_index||0));
  const payload={user_id:state.user.id,question:fd.get('question'),category:fd.get('category')||'その他',prep_status:fd.get('prep_status'),key_points:fd.get('key_points')||null,answer_30:fd.get('answer_30')||null,answer_60:fd.get('answer_60')||null,answer_180:fd.get('answer_180')||null,memo:fd.get('memo')||null};
  let qid=id;if(id)await db(supabase.from('interview_questions').update(payload).eq('id',id));else{const row=await db(supabase.from('interview_questions').insert({...payload,order_index:max+1}).select().single());qid=row.id;}
  await db(supabase.from('interview_question_episode_links').delete().eq('question_id',qid)); const eps=fd.getAll('episodes'); if(eps.length)await db(supabase.from('interview_question_episode_links').insert(eps.map(episode_id=>({user_id:state.user.id,question_id:qid,episode_id}))));
  await loadAll();closeModal();render();setTimeout(setupQuestionSortables,0);
}
async function submitEpisode(f){const fd=new FormData(f),id=f.dataset.id,max=Math.max(-1,...state.interviewEpisodes.map(x=>x.order_index||0)),payload={user_id:state.user.id,title:fd.get('title'),situation:fd.get('situation')||null,task:fd.get('task')||null,action:fd.get('action')||null,result:fd.get('result')||null,demonstrates:fd.get('demonstrates')||null,memo:fd.get('memo')||null};if(id)await db(supabase.from('interview_episodes').update(payload).eq('id',id));else await db(supabase.from('interview_episodes').insert({...payload,order_index:max+1}));await loadAll();closeModal();render();}
async function submitInterviewPrep(f){const fd=new FormData(f),id=f.dataset.id,cid=f.dataset.companyId,payload={user_id:state.user.id,company_id:cid,role:fd.get('role')||null,stage:fd.get('stage')||null,scheduled_at:fd.get('scheduled_at')?new Date(fd.get('scheduled_at')).toISOString():null,interview_format:fd.get('interview_format')||null,interviewer_type:fd.get('interviewer_type')||null,prep_status:fd.get('prep_status'),company_reason:fd.get('company_reason')||null,job_interest:fd.get('job_interest')||null,experience_connection:fd.get('experience_connection')||null,concerns:fd.get('concerns')||null,memo:fd.get('memo')||null};if(id)await db(supabase.from('company_interview_preps').update(payload).eq('id',id));else await db(supabase.from('company_interview_preps').insert(payload));await loadAll();closeModal();render();}
async function submitCompanyAnswer(f){const fd=new FormData(f),id=f.dataset.id,payload={user_id:state.user.id,company_id:f.dataset.companyId,question_id:f.dataset.questionId,answer_30:fd.get('answer_30')||null,answer_60:fd.get('answer_60')||null,answer_180:fd.get('answer_180')||null,memo:fd.get('memo')||null};if(id)await db(supabase.from('company_answer_overrides').update(payload).eq('id',id));else await db(supabase.from('company_answer_overrides').insert(payload));await loadAll();closeModal();render();}
async function submitReverseQuestion(f){const fd=new FormData(f),id=f.dataset.id,cid=f.dataset.companyId||null,max=Math.max(-1,...state.reverseQuestions.filter(x=>x.company_id===cid).map(x=>x.order_index||0)),payload={user_id:state.user.id,company_id:cid,text:fd.get('text'),category:fd.get('category')||'その他',memo:fd.get('memo')||null,selected_for_next:!!cid};if(id)await db(supabase.from('reverse_questions').update(payload).eq('id',id));else await db(supabase.from('reverse_questions').insert({...payload,order_index:max+1}));await loadAll();closeModal();render();}
async function submitInterviewEvent(f){const fd=new FormData(f),id=f.dataset.id,payload={user_id:state.user.id,company_id:fd.get('company_id'),stage:fd.get('stage')||null,interviewed_at:new Date(fd.get('interviewed_at')).toISOString(),interview_format:fd.get('interview_format')||null,interviewer_type:fd.get('interviewer_type')||null,overall_good:fd.get('overall_good')||null,overall_improve:fd.get('overall_improve')||null,company_info:fd.get('company_info')||null,next_check:fd.get('next_check')||null,memo:fd.get('memo')||null};let eid=id;if(id)await db(supabase.from('interview_events').update(payload).eq('id',id));else{const row=await db(supabase.from('interview_events').insert(payload).select().single());eid=row.id;}await loadAll();closeModal();state.page='interview';state.interviewTab='history';state.interviewEventId=eid;render();}
async function submitEventQuestion(f){
  const fd=new FormData(f),id=f.dataset.id;
  let qid=fd.get('question_id')||null;
  const rawText=(fd.get('question_text')||'').trim();
  let master=qid?state.interviewQuestions.find(x=>x.id===qid):null;
  let createdNew=false;
  if(!qid){
    if(!rawText) throw new Error('質問内容を入力するか、既存のマスター質問を選んでください。');
    master=findSimilarMasterQuestion(rawText);
    if(master){ qid=master.id; }
    else{
      const max=Math.max(-1,...state.interviewQuestions.map(x=>x.order_index||0));
      const row=await db(supabase.from('interview_questions').insert({user_id:state.user.id,question:rawText,category:'その他',prep_status:'not_started',order_index:max+1}).select().single());
      master=row; qid=row.id; createdNew=true;
    }
  }
  const payload={user_id:state.user.id,event_id:f.dataset.eventId,question_id:qid,question_text:rawText||master?.question||'',performance:fd.get('performance'),actual_answer:fd.get('actual_answer')||null,problem:fd.get('problem')||null,next_answer:fd.get('next_answer')||null};
  if(id)await db(supabase.from('interview_event_questions').update(payload).eq('id',id));else await db(supabase.from('interview_event_questions').insert(payload));
  await loadAll();
  const label=master?.question||rawText,count=state.interviewEventQuestions.filter(x=>x.question_id===qid).length;
  if(createdNew) toast(`新しい質問として質問マスターに追加しました：「${label}」`);
  else if(count>1) toast(`「${label}」は今回で${count}回目の質問です。`);
  closeModal();render();
}
async function submitCareerPlanOverview(f){state.settings.careerPlanOverview=new FormData(f).get('overview')||'';await saveSettings();render();setTimeout(setupMilestoneSortable,0);}
async function submitMilestone(f){const fd=new FormData(f),id=f.dataset.id,max=Math.max(-1,...state.careerMilestones.map(x=>x.order_index||0)),payload={user_id:state.user.id,title:fd.get('title'),target_date:fd.get('target_date')||null,status:fd.get('status'),memo:fd.get('memo')||null};if(id)await db(supabase.from('career_milestones').update(payload).eq('id',id));else await db(supabase.from('career_milestones').insert({...payload,order_index:max+1}));await loadAll();closeModal();render();setTimeout(setupMilestoneSortable,0);}

async function exportJson(){const payload={version:'1.3',exportedAt:nowIso(),appSettings:state.settings,scenarios:state.scenarios,companies:state.companies,companyValues:state.companyValues,conditions:state.conditions,conditionEvals:state.conditionEvals,notes:state.notes,attachments:state.attachments,interviewQuestions:state.interviewQuestions,interviewEpisodes:state.interviewEpisodes,questionEpisodeLinks:state.questionEpisodeLinks,interviewPreps:state.interviewPreps,companyAnswerOverrides:state.companyAnswerOverrides,reverseQuestions:state.reverseQuestions,interviewEvents:state.interviewEvents,interviewEventQuestions:state.interviewEventQuestions,careerMilestones:state.careerMilestones};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`job-conditions-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);alert('JSONを保存しました。添付ファイル本体はSupabase Storageに残り、このJSONには添付メタデータのみ含まれます。');}
function openImport(){openModal('JSONから復元',`<div class="setup-card"><b>注意：</b>第一版の復元は「バックアップ内容を上書き・追加」します。添付ファイル本体は再アップロードしません。</div><form id="importForm"><input class="input" type="file" name="file" accept="application/json" required><button class="btn primary" style="margin-top:14px">復元を実行</button></form>`);}
async function submitImport(f){if(!confirm('JSONバックアップを復元しますか？'))return;const file=new FormData(f).get('file'),obj=JSON.parse(await file.text()),uid=state.user.id;if(obj.appSettings){state.settings=mergeDeep(structuredClone(DEFAULT_SETTINGS),obj.appSettings);await saveSettings();}const upsert=async(table,rows,soft=true)=>{if(!rows?.length)return;const clean=rows.map(r=>soft?({...r,user_id:uid,deleted_at:null}):({...r,user_id:uid}));await db(supabase.from(table).upsert(clean));};await upsert('scenarios',obj.scenarios);await upsert('companies',obj.companies);await upsert('company_values',obj.companyValues);await upsert('conditions',obj.conditions);await upsert('company_condition_evals',obj.conditionEvals);await upsert('notes',obj.notes);await upsert('attachments',obj.attachments);await upsert('interview_questions',obj.interviewQuestions);await upsert('interview_episodes',obj.interviewEpisodes);await upsert('interview_question_episode_links',obj.questionEpisodeLinks,false);await upsert('company_interview_preps',obj.interviewPreps);await upsert('company_answer_overrides',obj.companyAnswerOverrides);await upsert('reverse_questions',obj.reverseQuestions);await upsert('interview_events',obj.interviewEvents);await upsert('interview_event_questions',obj.interviewEventQuestions);await upsert('career_milestones',obj.careerMilestones);await loadAll();closeModal();render();}
async function showTrash(){const tables=['companies','scenarios','notes','conditions','interview_questions','interview_episodes','company_interview_preps','company_answer_overrides','reverse_questions','interview_events','interview_event_questions','career_milestones'];const blocks=[];for(const t of tables){const data=await db(supabase.from(t).select('*').eq('user_id',state.user.id).not('deleted_at','is',null).order('deleted_at',{ascending:false}));if(data.length)blocks.push(`<div class="section-title">${t}</div>${data.map(x=>`<div class="card row" style="justify-content:space-between;margin-bottom:7px"><span>${esc(x.name||x.title||x.id)}</span><button class="btn" data-action="restore-trash" data-table="${t}" data-id="${x.id}">復元</button></div>`).join('')}`);}openModal('ゴミ箱',blocks.join('')||'<div class="empty">ゴミ箱は空です。</div>');}
async function restoreTrash(table,id){await db(supabase.from(table).update({deleted_at:null}).eq('id',id));await loadAll();await showTrash();render();}

// Delegated special handling for malformed operator option text is avoided here; browser normalizes it.
document.addEventListener('DOMContentLoaded',()=>{bindEvents();init();});
