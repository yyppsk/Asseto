import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/cn.js';

const variants = {
  ghost: 'border border-transparent bg-transparent text-[#cfd6cc] hover:border-[#ffce56]/30 hover:bg-white/5',
  race: 'border border-[#ffce56]/40 bg-[#ffce56]/15 text-[#fffaf0] hover:bg-[#ffce56]/25',
};

export function Button({ asChild = false, className, variant = 'ghost', ...props }) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 text-left font-black uppercase tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffce56]/60',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
