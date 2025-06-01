import { useState } from 'react';
import { Card } from '@/components/ui/card';

const StackedCards = () => {
  const [isFlipped, setIsFlipped] = useState(false);


  return (
    <div className="relative w-[400px] h-[250px]">
      <div className="relative w-full h-full" style={{ perspective: '2000px' }}>
        {/* Green card */}
        <div
          className={`absolute w-[85%] h-full transition-all duration-500 ease-in-out ${isFlipped
            ? 'left-0 z-20 translate-y-0 rotate-0'
            : 'left-[15%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]'
            }`}
          onClick={() => !isFlipped && setIsFlipped(true)}
        >
          <Card className="w-full h-full bg-green-500 shadow-2xl transform preserve-3d"
            style={{
              boxShadow: isFlipped
                ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                : '0 25px 30px -15px rgba(0, 0, 0, 0.4)'
            }}
          />
        </div>

        {/* Red card */}
        <div
          className={`absolute w-[85%] h-full transition-all duration-500 ease-in-out ${isFlipped
            ? 'left-[15%] z-10 translate-y-2 rotate-2 cursor-pointer hover:translate-y-[-2px]'
            : 'left-0 z-20 translate-y-0 rotate-0'
            }`}
          onClick={() => isFlipped && setIsFlipped(false)}
        >
          <Card className="w-full h-full bg-red-900 shadow-2xl transform preserve-3d"
            style={{
              boxShadow: !isFlipped
                ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                : '0 25px 30px -15px rgba(0, 0, 0, 0.4)'
            }}
          />
        </div>
      </div>

      {/* Optional: Add a subtle shadow on the container to enhance depth */}
      <div className="absolute inset-0 bg-black/5 -z-10 translate-y-4 blur-xl rounded-full" />
    </div>
  );
};

export default StackedCards;