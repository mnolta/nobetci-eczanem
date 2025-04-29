// pages/api/crawl.js

import axios from 'axios';

export default async function handler(req, res) {
  try {
    const response = await axios.get(
      `https://mvc.aeo.org.tr/home/NobetciEczaneGetirTarih?nobetTarihi=${new Date().toISOString().split('T')[0]}`
    );

    const data = response.data?.NobetciEczaneBilgisiListesi;

    if (!data) {
      return res.status(500).json({ message: 'Eczane verisi alınamadı' });
    }

    const transformed = {
      "Ankara": {}
    };

    data.forEach((eczane) => {
      const ilce = eczane.IlceAdi || 'Diğer';
      if (!transformed["Ankara"][ilce]) transformed["Ankara"][ilce] = [];

      transformed["Ankara"][ilce].push({
        isim: eczane.EczaneAdi,
        adres: eczane.EczaneAdresi,
        latitude: eczane.KoordinatLat,
        longitude: eczane.KoordinatLng
      });
    });

    return res.status(200).json(transformed);
  } catch (error) {
    return res.status(500).json({
      message: 'Veri çekilirken hata oluştu',
      error: error.message
    });
  }
}
