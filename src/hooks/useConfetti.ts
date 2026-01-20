import confetti from 'canvas-confetti';

export function useConfetti() {
  const triggerConfetti = () => {
    // First burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Side bursts
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 150);

    // Final burst
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7']
      });
    }, 300);
  };

  const triggerSuccessConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#10b981', '#34d399', '#fbbf24', '#f59e0b']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#10b981', '#34d399', '#fbbf24', '#f59e0b']
      });
    }, 250);
  };

  // Small celebration for individual lesson completion (80%+)
  const triggerLessonConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
      ticks: 100,
      gravity: 1.2,
      scalar: 0.9
    });
  };

  return { triggerConfetti, triggerSuccessConfetti, triggerLessonConfetti };
}
