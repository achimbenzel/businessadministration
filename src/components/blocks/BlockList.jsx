// A chapter's blocks in read mode. Empty blocks are skipped.
import { FileText } from 'lucide-react';
import Empty from '../Empty.jsx';
import { BLOCKS } from './registry.js';
import { isEmptyBlock } from '../../lib/blocks.js';

export default function BlockList({ blocks, chapterId, emptyHint }) {
  const visible = blocks.filter((b) => BLOCKS[b.type] && !isEmptyBlock(b));
  if (!visible.length) {
    return <Empty icon={FileText} title="Noch keine Inhalte" compact action={emptyHint}>Dieses Kapitel ist noch leer.</Empty>;
  }
  return (
    <div className="blocks">
      {visible.map((b) => {
        const { View } = BLOCKS[b.type];
        return <div key={b.id} id={`b-${b.id}`} className={`blk blk-${b.type}-wrap`}><View block={b} chapterId={chapterId} /></div>;
      })}
    </div>
  );
}
