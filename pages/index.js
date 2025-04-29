import dynamic from 'next/dynamic';
const HaritaContainer = dynamic(() => import('@/components/Harita/HaritaContainer'), { ssr: false });
import { useState, useEffect } from 'react';

export default function Home() {
  const [konum, setKonum] = useState([39.9208, 32.8541]); // Örnek konum: Ankara
  const [eczaneVerisi, setEczaneVerisi] = useState({});

  useEffect(() => {
    fetch('/api/crawl')
      .then(res => res.json())
      .then(data => setEczaneVerisi(data))
      .catch(err => console.error('Veri çekme hatası:', err));
  }, []);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setKonum([
            position.coords.latitude,
            position.coords.longitude
          ]);
        },
        (error) => {
          console.error('Konum alınamadı:', error);
          // Konum alınamazsa Ankara merkez kalır
        }
      );
    }
  }, []);

  return (
    <div>
      <HaritaContainer konum={konum} eczanelerData={eczaneVerisi} />

    </div>
  );
}
