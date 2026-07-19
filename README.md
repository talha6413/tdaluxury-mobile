# TDA Luxury Mobil

Android, iOS ve web için tek kod tabanlı TDA Luxury uygulaması.

## Hazır modüller

- Tek giriş ekranı
- Müşteri, personel ve yönetici rolleri
- Yönetici genel bakış ekranı
- Randevu takvimi
- Müşteri kartları
- Paket ve kalan seans takibi
- Kasa, tahsilat ve borç özeti
- Profil ve işletme ayarları
- Supabase oturum altyapısı
- Ayrıntılı, RLS korumalı mobil veritabanı şeması

## Yerel çalıştırma

1. `.env.example` dosyasını `.env` adıyla kopyalayın.
2. Supabase publishable/anon anahtarını ekleyin. Service-role anahtarını mobil uygulamaya asla koymayın.
3. `npm install` çalıştırın.
4. `npx expo start` çalıştırın.
5. Telefona Expo Go kurup terminalde çıkan QR kodu okutun.

## Önemli

`supabase/mobile-schema.sql`, müşteri adı, telefon, randevu, ödeme, paket ve özel fotoğraf kayıtlarını saklayacak canlı tabloları içerir. Bu şema açık işletme onayı ve KVKK süreçleri tamamlanmadan üretim veritabanına uygulanmamalıdır.

Şu an arayüz örnek verilerle çalışır. Supabase ortam değişkenleri girildiğinde gerçek oturum açma etkinleşir.
