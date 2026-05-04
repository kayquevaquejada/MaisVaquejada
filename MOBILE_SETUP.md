
# 📱 Configuração Mobile (iOS/Android) para Chamadas

Para que o sistema de chamadas de áudio e vídeo funcione corretamente em aplicativos mobile compilados (pelo Capacitor, Cordova ou similar), você deve configurar as permissões nativas.

## 🤖 Android (Google Play)

Adicione estas linhas no seu arquivo `AndroidManifest.xml`:

```xml
<!-- Permissões de Mídia -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 🍎 iOS (App Store)

Adicione as chaves de descrição de uso no seu arquivo `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Precisamos de acesso à câmera para chamadas de vídeo no Arena Vaquerama.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Precisamos de acesso ao microfone para chamadas de áudio e vídeo no Arena Vaquerama.</string>
```

---

## ⚙️ Configurações WebRTC

O sistema utiliza os servidores STUN públicos do Google. Em redes corporativas ou redes móveis muito restritas (NAT simétrico), o WebRTC pode falhar. Para uma solução 100% resiliente em produção, recomenda-se configurar um servidor **TURN** (ex: usando serviços como Twilio, Xirsys ou Coturn).

## 📊 Banco de Dados

Certifique-se de executar o arquivo `supabase_calls_setup.sql` no SQL Editor do seu Supabase para criar as tabelas e as políticas de segurança (RLS) corretas.
