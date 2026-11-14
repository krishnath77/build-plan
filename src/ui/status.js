import { staleNote } from '../appstate.js';

export function statusBanners(){
  let h = '';
  if (staleNote) h += '<div class="banner note small">Can’t reach saved progress yet. What you see may be out of date.</div>';
  return h;
}
