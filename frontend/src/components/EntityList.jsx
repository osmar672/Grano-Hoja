import EmptyState from './EmptyState.jsx';
export default function EntityList({ items = [], renderItem, getKey, emptyTitle, emptyText }) {
  if (!items.length) return <EmptyState title={emptyTitle} >{emptyText}</EmptyState>;
  return <div className="entity-list">{items.map((item, index) => <div key={getKey(item) ?? index}>{renderItem(item)}</div>)}</div>;
}
