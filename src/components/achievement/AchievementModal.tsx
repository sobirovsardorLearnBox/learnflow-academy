import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type?: "section" | "level" | "unit" | "lesson";
}

const typeConfig = {
  section: {
    icon: Trophy,
    color: "text-yellow-500",
    bgGradient: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/50",
  },
  level: {
    icon: Star,
    color: "text-emerald-500",
    bgGradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/50",
  },
  unit: {
    icon: Sparkles,
    color: "text-blue-500",
    bgGradient: "from-blue-500/20 to-indigo-500/20",
    borderColor: "border-blue-500/50",
  },
  lesson: {
    icon: Sparkles,
    color: "text-purple-500",
    bgGradient: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/50",
  },
};

export function AchievementModal({
  open,
  onClose,
  title,
  description,
  type = "unit",
}: AchievementModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className={`relative overflow-hidden rounded-2xl border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} bg-card p-8 text-center shadow-2xl`}
            >
              {/* Background decorations */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      scale: [0, 1, 0],
                      x: Math.random() * 100 - 50,
                      y: Math.random() * 100 - 50,
                    }}
                    transition={{ 
                      duration: 2, 
                      delay: i * 0.1, 
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                    className={`absolute ${config.color}`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                ))}
              </div>

              {/* Icon container */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.2, damping: 10 }}
                className={`relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${config.bgGradient} border-4 ${config.borderColor}`}
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Icon className={`h-12 w-12 ${config.color}`} />
                </motion.div>
                
                {/* Glow effect */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.bgGradient} blur-xl`}
                />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-2 text-2xl font-bold text-foreground"
              >
                🎉 Tabriklaymiz!
              </motion.h2>

              {/* Achievement title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`mb-3 text-xl font-semibold ${config.color}`}
              >
                {title}
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6 text-muted-foreground"
              >
                {description}
              </motion.p>

              {/* Close button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  Davom etish
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
