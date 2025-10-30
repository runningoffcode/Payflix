import { motion } from 'framer-motion';

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-900/80 backdrop-blur-sm"
      onClick={onEnter}
    >
      <div className="relative">
        <motion.div
          className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 flex items-center justify-center cursor-pointer"
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          whileHover={{
            scale: 1.1,
            transition: { duration: 0.3 }
          }}
          style={{
            transformStyle: 'preserve-3d',
            perspective: 1000,
            filter: 'drop-shadow(0 0 20px rgba(197, 107, 206, 0.5))',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 533 530"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M520.858 245.866C536.403 253.587 536.403 275.762 520.858 283.482L30.4678 527.04C11.1866 536.616 -8.30137 514.434 3.678 496.547L151.138 276.36C155.874 269.289 155.874 260.06 151.138 252.989L3.67798 32.802C-8.30139 14.9145 11.1865 -7.26763 30.4677 2.30859L520.858 245.866Z"
              fill="#C56BCE"
            />
          </svg>
        </motion.div>
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mt-12 text-lg font-medium text-neutral-400 tracking-wide"
      >
        Click to enter The Flix
      </motion.p>
    </motion.div>
  );
}
