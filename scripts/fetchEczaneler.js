const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchEczaneler() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const response = await axios.get(`https://mvc.aeo.org.tr/home/NobetciEczaneGetirTarih?nobetTarihi=${today}`);

    const data = response.data;
    if (data && data.isSuccess) {
      const eczaneler = data.NobetciEczaneBilgisiListesi;
      console.log(`✅ ${eczaneler.length} adet nöbetçi eczane bulundu.`);

      // İL - İLÇE - ECZANE yapısına dönüştür
      const ilIlceMap = {};

      eczaneler.forEach((eczane) => {
        const il = "Ankara"; // Sabit, çünkü sadece Ankara verisi geliyor
        const ilce = eczane.IlceAdi?.trim() || "Belirtilmemiş";

        if (!ilIlceMap[il]) {
          ilIlceMap[il] = {};
        }
        if (!ilIlceMap[il][ilce]) {
          ilIlceMap[il][ilce] = [];
        }

        ilIlceMap[il][ilce].push({
          isim: eczane.EczaneAdi,
          adres: eczane.EczaneAdresi,
          telefon: eczane.Telefon,
          eczaciAdi: eczane.EczaciAdi,
          eczaciSoyadi: eczane.EczaciSoyadi,
          adresAciklamasi: eczane.AdresAciklamasi,
          latitude: eczane.KoordinatLat,
          longitude: eczane.KoordinatLng
        });
      });

      // Dosya yolu
      const filePath = path.join(__dirname, '..', 'public', 'eczaneler.json');

      // JSON dosyasına kaydet
      fs.writeFileSync(filePath, JSON.stringify(ilIlceMap, null, 2), 'utf-8');
      console.log(`✅ Veriler ${filePath} dosyasına kaydedildi.`);
    } else {
      console.error('API başarısız cevap verdi:', data.Message);
    }
  } catch (error) {
    console.error('Veri çekme hatası:', error.message);
  }
}

fetchEczaneler();
