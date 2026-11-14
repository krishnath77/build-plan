import { NAME } from '../data/subjects.js';
import { $, ico } from './common.js';
import { ui } from '../appstate.js';

const TABS = [['today','Today'],['plan','World map'],['syl','Syllabus'],['intel','Blueprint'],['sim','Training'],['hangar','Inventory'],['ops','Base camp']];
const TAB_ICON = {today:'today', plan:'plan', syl:'syl', intel:'intel', sim:'sim', hangar:'hangar', ops:'ops'};

function renderNav(){
  const btn = ([id,label]) => '<button data-a="tab" data-v="'+id+'" '+(ui.tab===id?'aria-current="page"':'')+'>'+ico(TAB_ICON[id],22)+'<span>'+label+'</span></button>';
  $('#side').innerHTML = '<div class="brand">Build Plan</div><div class="sub">Class 10 · Boards 2027 · '+NAME+'</div>' + TABS.map(btn).join('');
  $('#bottom').innerHTML = TABS.map(btn).join('');
}
export { TABS, TAB_ICON, renderNav };
