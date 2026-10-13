export const CATALOG = [
  ['1','Canvas Tote','blue','m',28],['2','Field Jacket','green','l',96],['3','Studio Tee','white','s',24],['4','Utility Shirt','navy','m',52],
  ['5','Daily Cap','black','m',22],['6','Travel Pants','black','l',74],['7','Layer Tee','red','xl',26],['8','Workshop Apron','blue','l',44],
  ['9','Soft Sweater','green','s',68],['10','Weekender','navy','xl',110],['11','Plain Socks','white','m',14],['12','Pocket Tee','red','l',29]
].map(([id,name,color,size,price]) => ({ id,name,color,size,price }));

export function selectProducts(state) {
  let items = CATALOG.filter(item => Object.entries(state.facets).every(([key, values]) => !values.length || values.includes(item[key])));
  const sorts = { 'price-asc': (a,b) => a.price-b.price, 'price-desc': (a,b) => b.price-a.price, 'name-asc': (a,b) => a.name.localeCompare(b.name), featured: (a,b) => Number(a.id)-Number(b.id) };
  items = [...items].sort(sorts[state.sort]);
  const perPage = 6, pages = Math.max(1, Math.ceil(items.length/perPage)), page = Math.min(state.page, pages);
  return { items: items.slice((page-1)*perPage, page*perPage), total: items.length, page, pages };
}
