import{  useState, useLayoutEffect } from "react";

const useTruncatedElement = ({ ref, dependency }) => {
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