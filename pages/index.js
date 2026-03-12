import dynamic from 'next/dynamic';
const HaritaContainer = dynamic(() => import('@/components/Harita/HaritaContainer'), { ssr: false });
import { useState, useEffect } from 'react';

export default function Home() {
  const [konum, setKonum] = useState([39.9208, 32.8541]); // Örnek konum: Ankara
  const [eczaneVerisi, setEczaneVerisi] = useState({});
  const [ilcelerListesi, setIlcelerListesi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

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
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setKonum([
            position.coords.latitude,
            position.coords.longitude
          ]);
          setLocationError(null);
          setHasLocationPermission(true);
        },
        (error) => {
          console.error('Konum hatası:', error);
          let errorMessage = '';

          // Error codes:
          // 1 = PERMISSION_DENIED
          // 2 = POSITION_UNAVAILABLE
          // 3 = TIMEOUT
          if (error.code === 1) {
            errorMessage = 'Konum izni reddedildi. Eğer izin kalıcı olarak engellendiyse, tarayıcı ayarlarından sıfırlayın.';
          } else if (error.code === 2) {
            errorMessage = 'Konum alınamadı. Lütfen internet bağlantınızı kontrol edin.';
          } else if (error.code === 3) {
            errorMessage = 'Konum alma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.';
          } else {
            errorMessage = 'Konum izni reddedildi. Ayarlardan izin verebilirsiniz.';
          }

          setLocationError(errorMessage);
          setHasLocationPermission(false);
        }
      );
    }
  };

  useEffect(() => {
    handleGetLocation();
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
          <p style={{ fontSize: 'clamp(14px, 3vw, 18px)', textAlign: 'center', padding: '0 20px' }}>Veri yükleniyor...</p>
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <h2 style={{ color: 'red', marginBottom: '20px', fontSize: 'clamp(18px, 5vw, 28px)', textAlign: 'center' }}>Hata</h2>
          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', textAlign: 'center', marginBottom: '20px', maxWidth: '400px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: 'clamp(14px, 2vw, 16px)'
            }}
          >
            Tekrar Dene
          </button>
        </div>
      )}
      {locationError && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          right: '10px',
          background: '#f8d7da',
          border: '2px solid #f5c6cb',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          maxWidth: 'calc(100% - 20px)',
          maxHeight: 'auto',
          paddingRight: '44px'
        }}>
          <button
            onClick={() => setLocationError(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#721c24',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              minHeight: '32px',
              lineHeight: '1'
            }}
          >
            ✕
          </button>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <p style={{
              margin: '0',
              color: '#721c24',
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '1.3',
              wordBreak: 'break-word'
            }}>
              {locationError}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleGetLocation}
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  background: '#721c24',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  textDecoration: 'none',
                  width: 'fit-content'
                }}
              >
                Tekrar Dene
              </button>
              <a
                href="chrome://settings/content/location"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#721c24',
                  border: '1px solid #721c24',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  textDecoration: 'none',
                  width: 'fit-content'
                }}
              >
                Ayarlar
              </a>
            </div>
          </div>
        </div>
      )}
      {locationError === null && !hasLocationPermission && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          right: '10px',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          maxWidth: 'calc(100% - 20px)',
          maxHeight: 'auto',
          paddingRight: '44px'
        }}>
          <button
            onClick={() => setHasLocationPermission(true)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#856404',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              minHeight: '32px',
              lineHeight: '1'
            }}
          >
            ✕
          </button>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <p style={{
              margin: '0',
              color: '#856404',
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '1.3',
              wordBreak: 'break-word'
            }}>
              Size en yakın nöbetçi eczaneyi görmek için konum izni verin
            </p>
            <button
              onClick={handleGetLocation}
              style={{
                padding: '10px 14px',
                background: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                width: 'fit-content',
                transition: 'background 0.2s'
              }}
            >
              Konum İzni Ver
            </button>
          </div>
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
