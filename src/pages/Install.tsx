import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, CheckCircle2, Share, Plus, MoreVertical, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const navigate = useNavigate();

  // Redirect if already installed
  useEffect(() => {
    if (isInstalled) {
      navigate('/');
    }
  }, [isInstalled, navigate]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      navigate('/');
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">LearnBox</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
            <Smartphone className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">LearnBox'ni o'rnating</h1>
          <p className="text-muted-foreground">
            Telefoningizga o'rnating va offline rejimda ham foydalaning
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-3 mb-8"
        >
          {[
            { icon: CheckCircle2, text: "Tez va oson kirish" },
            { icon: CheckCircle2, text: "Offline rejimda ishlash" },
            { icon: CheckCircle2, text: "Push bildirishnomalari" },
            { icon: CheckCircle2, text: "Kam xotira ishlatadi" },
          ].map((item, index) => (
            <Card key={index} className="bg-card/50">
              <CardContent className="p-3 flex items-center gap-3">
                <item.icon className="w-5 h-5 text-success" />
                <span className="text-sm">{item.text}</span>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Install Button or Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full"
        >
          {isInstallable ? (
            <Button
              size="lg"
              onClick={handleInstall}
              className="w-full h-14 text-base gap-2"
            >
              <Download className="w-5 h-5" />
              Hozir o'rnatish
            </Button>
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-center">Qo'lda o'rnatish</h3>
                
                {isIOS ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Share className="w-4 h-4 text-primary" />
                      </div>
                      <span>Safari'da <strong>Share</strong> tugmasini bosing</span>
                    </div>
                    <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <span><strong>"Add to Home Screen"</strong> ni tanlang</span>
                    </div>
                  </div>
                ) : isAndroid ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <MoreVertical className="w-4 h-4 text-primary" />
                      </div>
                      <span>Brauzer menyusini oching (⋮)</span>
                    </div>
                    <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <span><strong>"Install app"</strong> yoki <strong>"Add to Home screen"</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    Brauzer menyusidan "Install" yoki "Add to Home Screen" opsiyasini tanlang
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Skip Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground"
          >
            Keyinroq o'rnataman
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
