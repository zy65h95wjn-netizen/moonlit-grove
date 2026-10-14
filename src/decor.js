// All illustrations are authored locally as inert, trusted SVG markup.
// User-imported backups can choose only one of these five fixed decoration types.
export const CATALOG = Object.freeze([
  { id:'mushroom', title:'Mushroom lantern', short:'Lantern' },
  { id:'moth', title:'Luna moth', short:'Moth' },
  { id:'butterflies', title:'Butterfly stickers', short:'Butterflies' },
  { id:'shelf', title:'Moon shelf', short:'Moon shelf' },
  { id:'vines', title:'Vine lights', short:'Vine lights' }
]);
const wrap=(content)=>`<svg class="decor-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" fill="none" aria-hidden="true">${content}</svg>`;
export function decorMarkup(type){
  switch(type){
    case 'mushroom':return wrap(`<circle cx="45" cy="50" r="34" fill="#F6C978" opacity=".13"/><path d="M39 47c2 11 0 21-3 31h19c-3-10-5-20-3-31" fill="#F8F1E4" stroke="#F6C978" stroke-width="2"/><path d="M9 44C18 20 30 12 45 12S73 23 82 44c-12 8-60 9-73 0Z" fill="#B77CBF" stroke="#F8D9DD" stroke-width="3"/><path d="M10 44c15 17 55 17 72 0" fill="#F6C978" opacity=".65"/><ellipse cx="31" cy="29" rx="6" ry="3" fill="#F9E0EC" transform="rotate(-23 31 29)"/><ellipse cx="53" cy="23" rx="7" ry="3" fill="#F9E0EC" transform="rotate(17 53 23)"/><ellipse cx="64" cy="34" rx="5" ry="3" fill="#F9E0EC"/><path d="M45 6v6M7 36l-5-3M84 36l5-3" stroke="#F6C978" stroke-width="2"/>`);
    case 'moth':return wrap(`<ellipse cx="44" cy="48" rx="5" ry="23" fill="#F6C978"/><path d="M42 39C17 3 0 19 12 45c10 18 20 12 30 2ZM49 39C73 3 90 19 78 45c-10 18-20 12-29 2Z" fill="#A7CBAF" stroke="#F5E0BD" stroke-width="2"/><path d="M41 52C10 45 17 72 34 78c9 3 12-11 12-22ZM50 52c31-7 24 20 7 26-9 3-12-11-12-22Z" fill="#A4BEB2" stroke="#F5E0BD" stroke-width="2"/><circle cx="26" cy="37" r="6" fill="#B7A7D9" stroke="#EBE0D0" stroke-width="1"/><circle cx="65" cy="37" r="6" fill="#B7A7D9" stroke="#EBE0D0" stroke-width="1"/><path d="M43 26 34 11M47 26l10-15" stroke="#E6CFB6" stroke-width="2"/>`);
    case 'butterflies':return wrap(`<g transform="translate(-4,-8)"><path d="M50 46C18 5 8 34 33 51 16 56 26 74 49 55" fill="#DAA2D0" stroke="#F8E4E2" stroke-width="2"/><path d="M52 46C81 11 92 37 69 51c18 6 7 23-17 4" fill="#9DB4E6" stroke="#F8E4E2" stroke-width="2"/><path d="M50 44v16M48 44l-5-9M52 44l5-9" stroke="#50395F" stroke-width="2"/></g><g transform="translate(12,19) scale(.55)"><path d="M50 46C18 5 8 34 33 51 16 56 26 74 49 55" fill="#B7A7D9" stroke="#F8E4E2" stroke-width="2"/><path d="M52 46C81 11 92 37 69 51c18 6 7 23-17 4" fill="#E3A7B7" stroke="#F8E4E2" stroke-width="2"/><path d="M50 44v16" stroke="#50395F" stroke-width="3"/></g>`);
    case 'shelf':return wrap(`<path d="M62 9a35 35 0 1 0 14 65A32 32 0 0 1 62 9Z" fill="#F6C978" stroke="#F8E8C4" stroke-width="2"/><path d="M35 49h45l-3 7H37Z" fill="#886F74" stroke="#F8D6A5" stroke-width="2"/><path d="M42 48V28h15v20" fill="#816CA3"/><path d="M43 27 51 19l8 8" stroke="#D5B1DE" stroke-width="2"/><path d="M66 49V35m-7 10q-12-8-7-18m15 18q10-8 6-18" stroke="#8EA98B" stroke-width="3"/><circle cx="63" cy="30" r="4" fill="#E3A7B7"/><circle cx="47" cy="29" r="3" fill="#E7CD9F"/>`);
    case 'vines':return wrap(`<path d="M7 19Q21 45 39 19T84 17" stroke="#8EA98B" stroke-width="4"/><path d="M8 22q-8 19 1 39M35 21q-4 22 6 43M58 23q13 15 1 42M82 17q-3 22 5 42" stroke="#577D58" stroke-width="3"/><path d="M13 33q16-9 11 4M34 36q-15-15-13 2M47 45q15-15 14 4M77 37q-16-13-19 4" stroke="#9FC08D" stroke-width="6" stroke-linecap="round"/><g fill="#FCE4AE" stroke="#F6C978" stroke-width="2"><circle cx="8" cy="62" r="7"/><circle cx="41" cy="64" r="7"/><circle cx="59" cy="68" r="7"/><circle cx="87" cy="59" r="7"/></g>`);
    default:throw new Error('Unknown decor type');
  }
}
