import dynamic from 'next/dynamic';
const HaritaContainer = dynamic(() => import('@/components/Harita/HaritaContainer'), { ssr: false });
import { useState, useEffect } from 'react';

export default function Home() {
  const [konum, setKonum] = useState([39.9208, 32.8541]); // Örnek konum: Ankara
  const [eczaneVerisi, setEczaneVerisi] = useState({});
  const [ilcelerListesi, setIlcelerListesi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async (isRetry = false) => {
      try {
        const url = isRetry ? '/api/crawl?force=true' : '/api/crawl';
        const res = await fetch(url);

        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        // Validate data format
        if (!data || !data.ilceler || !data.eczaneler) {
          throw new Error('Invalid data format');
        }

        setIlcelerListesi(data.ilceler);
        setEczaneVerisi(data.eczaneler);
        setLoading(false);
      } catch (err) {
        // Retry once if first attempt fails
        if (!isRetry) {
          setTimeout(() => fetchData(true), 2000);
        } else {
          setError('Nöbetçi eczane verileri şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.');
          setLoading(false);
        }
      }
    };

    fetchData();
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
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <p>Veri yükleniyor...</p>
        </div>
      )}
      {error && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255,255,255,0.9)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <h2 style={{ color: 'red', marginBottom: '20px' }}>Hata</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Tekrar Dene
          </button>
        </div>
      )}
      {!loading && !error && (
        <HaritaContainer 
          konum={konum} 
          eczanelerData={eczaneVerisi}
          ilceler={ilcelerListesi}
        />
      )}
    </div>
  );
}
