'use client';
import { motion, useReducedMotion } from 'motion/react';

// Headline ke words ek ek karke neeche se upar slide hote hain (mask ke andar). Reduced-motion par seedha dikhta hai.
export function TextReveal({ text, className, delay = 0, accent }: { text: string; className?: string; delay?: number; accent?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          {i > 0 && ' '}
          <span className="inline-block overflow-hidden align-bottom" style={{ paddingBottom: '0.14em', marginBottom: '-0.14em' }}>
            <motion.span
              className="inline-block"
              style={accent && w.replace(/[^\w]/g, '') === accent ? { color: '#ff6a4d' } : undefined}
              initial={reduce ? false : { y: '115%' }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}
            </motion.span>
          </span>
        </span>
      ))}
    </span>
  );
}
