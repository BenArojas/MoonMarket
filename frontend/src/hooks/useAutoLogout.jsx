import { useEffect } from 'react';
import useLogout from '@/hooks/useLogOut';

const useAutoLogout = (inactivityTimeout = 15 * 60 * 1000) => { 
  const handleLogout = useLogout();

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, inactivityTimeout);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearTimeout(timer);
    };
  }, [handleLogout, inactivityTimeout]);

  return null; 
};

export default useAutoLogout;