import { CornerFrame } from './CornerFrame';

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <div className="absolute top-4 right-4 z-20">
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-[#07121d]/80 text-white/80 text-xs font-bold uppercase tracking-widest shadow-md backdrop-blur-md hover:bg-white/10 transition-all active:scale-95"
    >
      <CornerFrame >
      <span>Back</span>
      </CornerFrame>
    </button>
  </div>
);

export default BackButton;