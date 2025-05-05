import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuthStatus } from '@/api/auth';

const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const useButtonCooldown = () => {
  const [isCooldown, setIsCooldown] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Check auth status to detect login
  const { data: userData, isSuccess } = useQuery({
    queryKey: ['authStatus'],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Start cooldown on successful login
  useEffect(() => {
    if (isSuccess && userData) {
      startCooldown();
    }
  }, [isSuccess, userData]);

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCooldown && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1000) {
            setIsCooldown(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCooldown, remainingTime]);

  const startCooldown = () => {
    setIsCooldown(true);
    setRemainingTime(COOLDOWN_DURATION);
  };

  // Format remaining time for tooltip
  const formatRemainingTime = () => {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return {
    isCooldown,
    startCooldown,
    remainingTime,
    formatRemainingTime,
  };
};

export default useButtonCooldown;