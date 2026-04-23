ASKIDA EKMEK – GELİŞTİRME PLANI
Proje Amacı

Askıda Ekmek, insanların yerel fırınlarda başkaları için ekmek bırakmasını sağlayan bir mobil uygulamadır.

Uygulama üç tarafı bir araya getirir:

vatandaşlar

fırınlar

ihtiyacı olan kişiler

Amaç, dayanışmayı teknoloji ile kolaylaştırmak.

Dil Kuralı (Çok Önemli)

Uygulamanın hiçbir yerinde “bağış” kelimesi kullanılmaz.

Yerine şu ifadeler kullanılır:

ekmek bırak

askıya bırak

askıdaki ekmek

Uygulamanın dili saygılı ve onurlu olmalıdır.

Kullanılan Teknolojiler

Mobil uygulama:

Expo

React Native

Expo Router

Backend:

Firebase Firestore

Harita:

React Native Maps

Mevcut Ekranlar

Şu anda uygulamada aşağıdaki ekranlar bulunmaktadır.

Ana Sayfa

İçerik:

marka şeridi

uygulama başlığı

slogan

güven kartı

“Bugün askıya bırakılan ekmek” kartı

askıya ekmek bırak butonu

Harita Ekranı

Özellikler:

anlaşmalı fırınlar harita üzerinde gösterilir

fırınlar marker olarak görünür

Gelecek geliştirmeler:

en yakın fırını otomatik gösterme

fırın bilgi kartı

Askıya Ekmek Bırak Ekranı

Kullanıcı akışı:

fırın seç

ekmek sayısı seç

onayla

Başarı Ekranı

Kullanıcı ekmek bıraktığında gösterilir.

Amaç:

olumlu duygu oluşturmak

katkıyı görünür yapmak

Örnek mesaj:

“Bir sofraya umut oldunuz.”

Fırıncı Paneli

Fırıncıların kullandığı ekran.

İçerik:

bugün gelen ekmek

toplam gelen ekmek

askıdaki ekmek

askıdan ekmek düş butonu

Firestore Veri Yapısı
bakeries

Fırın bilgileri.

Alanlar:

name

city

district

neighborhood

latitude

longitude

active

bread_transactions

Bırakılan ekmek kayıtları.

Alanlar:

bakeryId

breadCount

timestamp

daily_stats

Günlük toplam istatistik.

Örnek:

daily_stats
   2026-03-09
      totalBreadLeftToday: 1284

Ana sayfadaki sayaç buradan okunur.

Geliştirme Aşamaları
Aşama 1 – Canlı Veri

Amaç: ana sayfayı gerçek veri ile çalıştırmak.

Yapılacaklar:

Firestore’dan günlük toplam ekmek sayısını çekmek

ana sayfa sayaç kartına bağlamak

veri yoksa 0 göstermek

Aşama 2 – Sayaç Animasyonu

Ana sayfadaki sayı:

0 → gerçek sayı şeklinde animasyonla artmalıdır.

Bu:

daha profesyonel görünüm sağlar

etki hissini güçlendirir

Aşama 3 – Harita Geliştirme

Harita ekranında:

kullanıcı konumunu al

en yakın fırınları göster

fırın bilgi kartı ekle

Aşama 4 – Tasarım Sistemi

Tüm uygulama için ortak bir tasarım sistemi oluşturulmalıdır.

Dosya:

theme.ts

İçermesi gerekenler:

renkler

tipografi

spacing

border radius

gölgeler

Aşama 5 – Ortak UI Bileşenleri

Tekrar kullanılabilir bileşenler oluşturulmalıdır.

Örnek:

Card

PrimaryButton

Screen

SectionTitle

CounterCard

Aşama 6 – Premium UI

Uygulamanın App Store seviyesine gelmesi için:

buton animasyonları

kart gölgeleri

skeleton loading

geçiş animasyonları

eklenmelidir.

UX İlkeleri

Arayüz:

sade

hızlı

anlaşılır

sıcak

Tercih edilen öğeler:

kart tasarımları

büyük butonlar

net hiyerarşi

boşluk kullanımı

Kaçınılması gerekenler:

karmaşık akışlar

yoğun metin

gereksiz ekranlar

En Önemli Eylem

Uygulamadaki en kritik buton:

“Askıya ekmek bırak”

Bu buton:

her zaman görünür

kolay erişilebilir

güçlü tasarlanmış

olmalıdır.

Gelecek Özellikler

İleride eklenebilecek özellikler:

haftalık etki istatistikleri

toplam bırakılan ekmek sayısı

aktif fırın sayısı

öne çıkan fırınlar

dayanışma hikayeleri

Nihai Hedef

Askıda Ekmek uygulaması:

güvenilir

sade

sıcak

modern

bir sosyal etki uygulaması olmalıdır.

Amaç:

insanların küçük bir iyiliği kolayca yapabilmesini sağlamak.