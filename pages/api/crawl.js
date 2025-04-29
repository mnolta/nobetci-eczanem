import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Sadece GET isteklerine izin verilir.' });
  }

  try {
    const tarih = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
    const response = await axios.get(`https://mvc.aeo.org.tr/home/NobetciEczaneGetirTarih?nobetTarihi=${tarih}`);

    const data = response.data.NobetciEczaneBilgisiListesi;
    if (!data) {
      return res.status(500).json({ message: 'Veri bulunamadı.' });
    }

    // Şehir/ilçe bazlı organize edelim (şu anda sadece Ankara için örnek)
    const organizedData = {
      Ankara: {}
    };

    data.forEach((eczane) => {
      const ilce = eczane.IlceAdi || 'Diğer';
      if (!organizedData.Ankara[ilce]) {
        organizedData.Ankara[ilce] = [];
      }
      organizedData.Ankara[ilce].push({
        isim: eczane.EczaneAdi,
        adres: eczane.EczaneAdresi,
        telefon: eczane.Telefon,
        latitude: eczane.KoordinatLat,
        longitude: eczane.KoordinatLng
      });
    });

    // JSON dosyasına kaydet
    const filePath = path.join(process.cwd(), 'public', 'eczaneler.json');
    fs.writeFileSync(filePath, JSON.stringify(organizedData, null, 2), 'utf8');

    return res.status(200).json({ message: 'Veri başarıyla çekildi ve kaydedildi.' });
  } catch (error) {
    console.error('Veri çekme hatası:', error);
    return res.status(500).json({ message: 'Veri çekilirken bir hata oluştu.', error: error.message });
  }
}
