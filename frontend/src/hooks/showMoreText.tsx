import { useState, useLayoutEffect, RefObject } from "react";

interface UseTruncatedElementProps {
  ref: RefObject<HTMLElement>;
  dependency?: any;
}

interface UseTruncatedElementReturn {
  isTruncated: boolean;
  isShowingMore: boolean;
  toggleIsShowingMore: () => void;
}

const useTruncatedElement = ({ ref, dependency }: UseTruncatedElementProps): UseTruncatedElementReturn => {
    const [isTruncated, setIsTruncated] = useState(false);
    const [isShowingMore, setIsShowingMore] = useState(false);
  
    useLayoutEffect(() => {
      if (ref.current) {
        const { offsetHeight, scrollHeight } = ref.current;
  
        if (offsetHeight < scrollHeight) {
          setIsTruncated(true);
        } else {
          setIsTruncated(false);
        }
      }
    }, [ref, dependency]);
  
    const toggleIsShowingMore = () => setIsShowingMore((prev) => !prev);
  
    return {
      isTruncated,
      isShowingMore,
      toggleIsShowingMore,
    };
  };

  export default useTruncatedElement