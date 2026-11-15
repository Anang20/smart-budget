/**
 * InstallCard.tsx
 * Offers to install the app on the device (PWA). Shown in Settings.
 */
import { Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function InstallCard() {
  const { canInstall, isInstalled, install } = useInstallPrompt();

  return (
    <Card className="border-0 bg-gradient-to-br from-tint-lime to-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-base">Pasang sebagai Aplikasi</CardTitle>
        </div>
        <CardDescription className="text-foreground/70">
          {isInstalled
            ? 'Aplikasi sudah terpasang di perangkat ini dan bisa dipakai tanpa internet.'
            : 'Pasang di layar utama agar terbuka seperti aplikasi biasa dan tetap bisa dipakai tanpa internet.'}
        </CardDescription>
      </CardHeader>
      {!isInstalled && (
        <CardContent className="space-y-2">
          {canInstall ? (
            <Button onClick={() => void install()}>Pasang Aplikasi</Button>
          ) : (
            <p className="text-sm text-foreground/80">
              Chrome atau Edge: menu ⋮ → <strong>Pasang aplikasi</strong>. iPhone (Safari): tombol Bagikan →{' '}
              <strong>Tambah ke Layar Utama</strong>.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
