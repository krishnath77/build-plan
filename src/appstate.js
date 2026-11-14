// Shared mutable app state. Importers read live bindings; assignments go through the setters.
export function defaultState(){ return {v:1, ch:{}, done:{}, energy:{}, marked:{}, pre:{}, B:4, rebuiltAfterCheck:false}; }

export let state = defaultState();
export let plan = null;
export let answers = [];
export let mistakes = [];
export let notes = {};
export let briefs = {};
export let briefsLoaded = false;   // true once the saved briefs have arrived from the server (not just the local cache)
export let canWrite = true;
export let mode = 'loading';
export let staleNote = false;
export let isAdmin = false;
export let userInfo = null;

export const imgLimits = {maxCount: 4};
export const ui = {tab:'today', sylSub:'math', sylCh:null, noteSub:'math', noteCh:null, noteTab:'map', simSub:'math', confirmRebuild:false, confirmRegen:null, buildAll:null, openWeek:null, openDay:null, loadNote:false};
export const refs = {};

export const setState = v => { state = v; };
export const setPlan = v => { plan = v; };
export const setAnswers = v => { answers = v; };
export const setMistakes = v => { mistakes = v; };
export const setNotes = v => { notes = v; };
export const setBriefs = v => { briefs = v; };
export const setCanWrite = v => { canWrite = v; };
export const setBriefsLoaded = v => { briefsLoaded = v; };
export const briefsReady = () => briefsLoaded;
export const setMode = v => { mode = v; };
export const setStaleNote = v => { staleNote = v; };
export const setIsAdmin = v => { isAdmin = v; };
export const setUser = v => { userInfo = v; };

// Questions and marking need a network connection.
export const aiReady = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

// Local edits are ignored by snapshot listeners for a short window so a stale echo cannot overwrite them.
let localDirty = 0;
export const touch = () => { localDirty = Date.now(); };
export const getLocalDirty = () => localDirty;

let renderer = () => {};
export const setRenderer = fn => { renderer = fn; };
export const render = () => renderer();
